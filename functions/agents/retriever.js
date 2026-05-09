/**
 * retrieverAgent — fetches candidate docs from Firestore knowledge_base,
 * then asks Gemini to score each for actual relevance to the question.
 *
 * Input:  { question, intent, language?, subject?, apiKey }
 * Output: { docs: [{content, category, source, language, tribe, score}], retrievalConfidence }
 *
 * If retrievalConfidence < 0.4 OR top doc score < 0.4, returns docs: []
 * to signal the composer to refuse.
 *
 * Skips Firestore + LLM rerank entirely for greetings (returns empty docs,
 * composer will template a greeting).
 */

const { getJsonModel, parseJSON, getDb } = require('./shared')

const CANDIDATE_LIMIT = 25
const TOP_K = 5
const MIN_DOC_SCORE = 0.4

function keywordCandidates(question, allDocs, capped = CANDIDATE_LIMIT) {
    const tokens = question
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2)
    if (tokens.length === 0) return allDocs.slice(0, capped)

    const scored = allDocs.map((d) => {
        const content = (d.content || '').toLowerCase()
        const tags = Array.isArray(d.tags) ? d.tags.join(' ').toLowerCase() : ''
        let matches = 0
        for (const t of tokens) {
            if (content.includes(t)) matches += 1
            if (tags.includes(t)) matches += 1
        }
        return { ...d, _matches: matches }
    })
    scored.sort((a, b) => b._matches - a._matches)
    // Keep only docs with at least one keyword hit, but always return at least 8
    // so the LLM rerank has fresh candidates even on stem mismatches.
    const withHits = scored.filter((d) => d._matches > 0)
    if (withHits.length >= 8) return withHits.slice(0, capped)
    return scored.slice(0, Math.max(8, withHits.length))
}

const RERANK_PROMPT = (question, subject, candidates) => `You are scoring how relevant each cultural knowledge snippet is to the user's question.

User question: "${question}"
Topic hint: ${subject ? `"${subject}"` : '(none)'}

Score each snippet from 0.0 (irrelevant) to 1.0 (directly answers the question).
Be strict — only score >= 0.6 if the snippet contains specific facts that answer the question.
Tangentially related snippets should score 0.3 or lower.

Snippets:
${candidates.map((c, i) => `[${i}] (${c.tribe || 'Orang Asli'}, ${c.category || 'general'}): ${c.content}`).join('\n\n')}

Respond ONLY with JSON of the shape:
{ "scores": [0.0, 0.0, ...] }
The scores array must have exactly ${candidates.length} numbers in the same order as the snippets.`

async function handler({ question, intent, language, subject, apiKey }) {
    if (intent === 'greeting' || intent === 'off_topic') {
        return { docs: [], retrievalConfidence: 0 }
    }

    const db = getDb()
    let snapshot
    try {
        // Filter by language when known to shrink candidate set.
        const ref = db.collection('knowledge_base')
        const q = language
            ? ref.where('language', '==', language).limit(80)
            : ref.limit(120)
        snapshot = await q.get()
    } catch (e) {
        console.warn('[retrieverAgent] Firestore read failed:', e.message)
        return { docs: [], retrievalConfidence: 0 }
    }

    if (snapshot.empty) {
        return { docs: [], retrievalConfidence: 0 }
    }

    const allDocs = []
    snapshot.forEach((doc) => {
        const d = doc.data()
        allDocs.push({
            id: doc.id,
            content: d.content || '',
            category: d.category || 'general',
            language: d.language || null,
            tribe: d.tribe || null,
            source: d.source || null,
            tags: d.tags || [],
        })
    })

    const candidates = keywordCandidates(question, allDocs)
    if (candidates.length === 0) {
        return { docs: [], retrievalConfidence: 0 }
    }

    // LLM rerank the candidates.
    const model = getJsonModel(apiKey)
    const result = await model.generateContent(RERANK_PROMPT(question, subject, candidates))
    const parsed = parseJSON(result.response.text(), null)
    if (!parsed || !Array.isArray(parsed.scores)) {
        console.warn('[retrieverAgent] rerank parse failed; returning empty')
        return { docs: [], retrievalConfidence: 0 }
    }

    const scored = candidates
        .map((c, i) => {
            const score = Number.isFinite(parsed.scores[i]) ? parsed.scores[i] : 0
            const { _matches, ...rest } = c
            void _matches
            return { ...rest, score }
        })
        .filter((d) => d.score >= MIN_DOC_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_K)

    const retrievalConfidence = scored.length > 0 ? scored[0].score : 0

    return { docs: scored, retrievalConfidence }
}

module.exports = { handler }
