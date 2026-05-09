import { orchestrateElderResponse } from './gemini'
import { db } from './firebase'
import {
    collection,
    query,
    getDocs,
    addDoc,
    deleteDoc,
} from 'firebase/firestore'
import seedData from '../data/seedKnowledge.json'

const KNOWLEDGE_COLLECTION = 'knowledge_base'

/**
 * Digital Elder query entry point.
 * Delegates to the server-side multi-agent orchestrator
 * (router → retriever → grounder → validator → composer).
 *
 * Returns { answer, vocabTerms, sources, refused } where:
 *   - sources: [{tribe, category, content, ...}]  (cited docs only)
 *   - refused: true when the orchestrator could not ground a response
 */
export async function queryKnowledgeBase(question) {
    try {
        const result = await orchestrateElderResponse(question)
        return {
            answer: result.answer,
            sources: result.sources || [],
            vocabTerms: result.vocabTerms || [],
            refused: !!result.refused,
        }
    } catch (error) {
        console.error('Elder orchestrator failed:', error)
        return {
            answer:
                'I apologize, but I encountered difficulty reaching the cultural archives. Please try again in a moment.',
            sources: [],
            vocabTerms: [],
            refused: true,
        }
    }
}

/**
 * Seed Firestore with cultural knowledge from seedKnowledge.json.
 * Stores entries without embeddings — the retriever agent uses Firestore
 * keyword filtering + LLM rerank rather than vector search.
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
