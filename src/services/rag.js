import { generateEmbedding, generateRAGResponse, translateVocabulary } from './gemini'
import { db } from './firebase'
import {
    collection,
    query,
    getDocs,
    addDoc,
    deleteDoc,
    limit,
} from 'firebase/firestore'
import seedData from '../data/seedKnowledge.json'

const KNOWLEDGE_COLLECTION = 'knowledge_base'

/**
 * Full RAG pipeline: embed → search → augment → generate.
 * Returns answer with vocabulary terms and source documents.
 */
function isTranslationQuestion(question) {
    const q = question.toLowerCase()
    return (
        /\b(in semai|in temiar|in jakun|in orang asli)\b/.test(q) ||
        /\bhow (do you |to )say\b/.test(q) ||
        /\bwhat (is|does|are)\b.{1,40}\b(mean|translate|word for)\b/.test(q) ||
        /\btranslate\b/.test(q) ||
        /\bword for\b/.test(q) ||
        /\bsemai (word|language|translation)\b/.test(q) ||
        /\btemiar (word|language|translation)\b/.test(q) ||
        /\bjakun (word|language|translation)\b/.test(q)
    )
}

export async function queryKnowledgeBase(question) {
    try {
        // Route vocabulary/translation questions directly to Gemini
        if (isTranslationQuestion(question)) {
            const response = await translateVocabulary(question)
            return {
                answer: response.answer,
                sources: [],
                vocabTerms: response.vocabTerms || [],
            }
        }

        let relevantDocs = []

        // Try vector search; fall back to keyword search if embedding unavailable
        try {
            const { embedding } = await generateEmbedding(question)
            relevantDocs = await vectorSearch(embedding, 5)
        } catch {
            console.warn('Vector search unavailable, using keyword search')
            relevantDocs = await fallbackSearch(question)
        }

        if (relevantDocs.length === 0) {
            return {
                answer:
                    "I don't have knowledge about that in our cultural archive yet. Perhaps an elder could help us learn more about this.",
                sources: [],
                vocabTerms: [],
            }
        }

        // Step 3: Generate RAG response with Gemini
        const response = await generateRAGResponse(question, relevantDocs)

        return {
            answer: response.answer,
            sources: relevantDocs,
            vocabTerms: response.vocabTerms || [],
        }
    } catch (error) {
        console.error('RAG pipeline error:', error)

        // Fallback: try with seed data directly
        return fallbackRAG(question)
    }
}

/**
 * Perform vector similarity search in Firestore.
 * Uses client-side cosine similarity as fallback when vector index isn't available.
 */
async function vectorSearch(queryEmbedding, topK = 5) {
    const knowledgeRef = collection(db, KNOWLEDGE_COLLECTION)
    const snapshot = await getDocs(query(knowledgeRef, limit(100)))

    if (snapshot.empty) {
        // Try seed data
        return seedData
            .slice(0, topK)
            .map((entry) => ({ content: entry.content, category: entry.category, tribe: entry.tribe }))
    }

    // Client-side cosine similarity
    const docsWithScores = []
    let hasEmbeddings = false

    snapshot.forEach((doc) => {
        const data = doc.data()
        if (data.embedding) {
            hasEmbeddings = true
            const similarity = cosineSimilarity(queryEmbedding, data.embedding)
            docsWithScores.push({ ...data, id: doc.id, score: similarity })
        } else {
            docsWithScores.push({ ...data, id: doc.id, score: 0 })
        }
    })

    // If no docs have embeddings, signal caller to use keyword search instead
    if (!hasEmbeddings) {
        throw new Error('no-embeddings')
    }

    // Sort by similarity score and return top-K
    docsWithScores.sort((a, b) => b.score - a.score)
    return docsWithScores.slice(0, topK)
}

/**
 * Fallback keyword-based search.
 */
async function fallbackSearch(question) {
    const keywords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3)

    try {
        const knowledgeRef = collection(db, KNOWLEDGE_COLLECTION)
        const snapshot = await getDocs(query(knowledgeRef, limit(50)))

        const results = []
        snapshot.forEach((doc) => {
            const data = doc.data()
            const content = (data.content || '').toLowerCase()
            const matchCount = keywords.filter((kw) => content.includes(kw)).length
            if (matchCount > 0) {
                results.push({ ...data, id: doc.id, matchScore: matchCount })
            }
        })

        results.sort((a, b) => b.matchScore - a.matchScore)
        return results.slice(0, 5)
    } catch {
        // Final fallback: use seed data
        return seedData
            .filter((entry) => {
                const content = entry.content.toLowerCase()
                return keywords.some((kw) => content.includes(kw))
            })
            .slice(0, 5)
    }
}

/**
 * Fallback RAG using seed data directly (no Firestore).
 */
async function fallbackRAG(question) {
    const keywords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    const relevantEntries = seedData
        .filter((entry) => {
            const content = entry.content.toLowerCase()
            return keywords.some((kw) => content.includes(kw))
        })
        .slice(0, 5)

    if (relevantEntries.length === 0) {
        return {
            answer:
                "I don't have knowledge about that in our cultural archive yet. Perhaps an elder could help us learn more about this.",
            sources: [],
            vocabTerms: [],
        }
    }

    try {
        const response = await generateRAGResponse(question, relevantEntries)
        return {
            answer: response.answer,
            sources: relevantEntries,
            vocabTerms: response.vocabTerms || [],
        }
    } catch {
        return {
            answer: relevantEntries[0].content,
            sources: relevantEntries,
            vocabTerms: [],
        }
    }
}

/**
 * Seed Firestore with cultural knowledge from seedKnowledge.json.
 * Tries to compute embeddings; stores the entry regardless if embedding fails.
 */
const firestoreWrite = (ref, data) =>
    Promise.race([
        addDoc(ref, data),
        new Promise((_, reject) =>
            setTimeout(
                () => reject(new Error(
                    'Firestore write timed out after 8s.\n' +
                    'Check:\n' +
                    '  1. Firebase Console → Firestore Database is CREATED (not just the project)\n' +
                    '  2. Firestore rules allow writes (start in Test Mode)\n' +
                    '  3. .env.local VITE_FIREBASE_* values match your project'
                )),
                8000
            )
        ),
    ])

export async function seedKnowledgeBase() {
    const knowledgeRef = collection(db, KNOWLEDGE_COLLECTION)

    // Clear all existing entries first to avoid duplicates on re-seed
    console.log('Clearing existing knowledge base entries...')
    try {
        const existingDocs = await getDocs(query(knowledgeRef))
        const deletions = existingDocs.docs.map(doc => deleteDoc(doc.ref))
        await Promise.all(deletions)
        console.log(`Deleted ${existingDocs.size} existing entries.`)
    } catch (error) {
        console.error('Failed to clear existing entries:', error.message)
        return { seededCount: 0, error: error.message }
    }

    // Seed all entries fresh
    let seededCount = 0
    for (const entry of seedData) {
        try {
            await firestoreWrite(knowledgeRef, {
                content: entry.content,
                category: entry.category,
                language: entry.language || 'semai',
                tribe: entry.tribe || 'Semai',
                source: entry.source || 'Cultural archive',
                tags: entry.tags || [],
                createdAt: new Date(),
            })
            seededCount++
            console.log(`Seeded ${seededCount}/${seedData.length} entries...`)
        } catch (error) {
            console.error(`Seeding failed on entry ${seededCount + 1}:`, error.message)
            return { seededCount, error: error.message }
        }
    }

    return { seededCount }
}

// ─── Helpers ───

function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i]
        normA += vecA[i] * vecA[i]
        normB += vecB[i] * vecB[i]
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    return denominator === 0 ? 0 : dotProduct / denominator
}
