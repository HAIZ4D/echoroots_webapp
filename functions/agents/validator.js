/**
 * validatorAgent — verifies the grounder's draft against the cited documents.
 *
 * Input:  { draftAnswer, vocabTerms, docs, apiKey }
 * Output: { verdict, ungroundedClaims, ungroundedVocab }
 *           verdict: 'pass' | 'fail'
 *
 * Two checks:
 *   1. Vocab presence — each vocabTerm.word must literally appear in
 *      docs[term.sourceIndex].content (cheap regex; no LLM call).
 *   2. Prose grounding — Gemini binary check that every factual claim in
 *      draftAnswer is supported by the docs collectively.
 *
 * Conservative: any failure on either check → verdict: 'fail'.
 */

const { getJsonModel, parseJSON } = require('./shared')

function normalize(s) {
    return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function vocabPresent(term, docs) {
    const doc = docs[term.sourceIndex]
    if (!doc) return false
    const haystack = normalize(doc.content)
    const needle = normalize(term.word)
    if (!needle) return false
    return haystack.includes(needle)
}

const VALIDATE_PROMPT = (draft, docs) => `You are a strict fact-checker. Decide whether the candidate answer is fully supported by the source documents.

CANDIDATE ANSWER: "${draft}"

SOURCE DOCUMENTS:
${docs.map((d, i) => `[Doc ${i}]: ${d.content}`).join('\n\n')}

Rules:
- "supported" means every factual claim in the answer can be traced to text in the documents (paraphrase is OK; new facts are NOT).
- Warm/elder-style framing language is fine; only check FACTUAL claims.
- If the answer mentions specific words, names, plants, rituals, or numbers not present in the docs, mark them as ungrounded.

Respond ONLY with JSON of the shape:
{
  "verdict": "pass" | "fail",
  "ungroundedClaims": ["claim 1", "claim 2"]
}`

async function handler({ draftAnswer, vocabTerms = [], docs = [], apiKey }) {
    if (!draftAnswer || docs.length === 0) {
        return { verdict: 'fail', ungroundedClaims: [], ungroundedVocab: [] }
    }

    // Cheap check first — any invented vocab is an immediate fail.
    const ungroundedVocab = vocabTerms.filter((t) => !vocabPresent(t, docs)).map((t) => t.word)
    if (ungroundedVocab.length > 0) {
        return { verdict: 'fail', ungroundedClaims: [], ungroundedVocab }
    }

    // LLM grounding check.
    const model = getJsonModel(apiKey)
    const result = await model.generateContent(VALIDATE_PROMPT(draftAnswer, docs))
    const parsed = parseJSON(result.response.text(), null)

    if (!parsed) {
        // If we can't parse, be conservative and fail.
        return { verdict: 'fail', ungroundedClaims: ['(validator parse error)'], ungroundedVocab: [] }
    }

    const verdict = parsed.verdict === 'pass' ? 'pass' : 'fail'
    const ungroundedClaims = Array.isArray(parsed.ungroundedClaims)
        ? parsed.ungroundedClaims.filter((c) => typeof c === 'string')
        : []

    return { verdict, ungroundedClaims, ungroundedVocab: [] }
}

module.exports = { handler }
