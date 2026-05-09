/**
 * backTranslationValidatorAgent — translates the English translation BACK
 * into the source language and asks Gemini to compare against the original.
 *
 * If the back-translation diverges materially from the original, the
 * literal translation is suspect (likely fabricated meaning). The verdict
 * is surfaced to the client as a soft warning — we do not block the story,
 * but the UI can dim or flag the translation.
 *
 * Input:  { originalText, englishText, sourceLang, apiKey }
 * Output: {
 *   verdict: 'pass' | 'warn' | 'fail',
 *   similarity: 0..1,
 *   divergences: [string]
 * }
 */

const { getJsonModel, parseJSON } = require('../shared')

const PROMPT = (original, english, sourceLang) => `You verify translation fidelity by comparing an original utterance against the English translation that was produced from it.

Original (${sourceLang}): "${original}"
English translation: "${english}"

TASK:
Compare semantic faithfulness. Imagine back-translating the English into ${sourceLang} — would it match the original in meaning, key entities, and event order?

SCORING:
- pass     — translation is faithful; same meaning and key facts
- warn     — minor drift (paraphrasing, tone shift, slight detail mismatch)
- fail     — significant drift (added details not in source, removed key facts, changed entities, fabricated content)

For divergences, list specific items that DIFFER. Be concrete — "added 'in the rainforest' not in source" beats "extra detail".

Respond ONLY with JSON of the shape:
{
  "verdict": "pass" | "warn" | "fail",
  "similarity": 0.0,
  "divergences": ["specific divergence 1", "specific divergence 2"]
}`

async function handler({ originalText, englishText, sourceLang = 'indigenous', apiKey }) {
    if (!originalText || !englishText) {
        return { verdict: 'warn', similarity: 0, divergences: ['missing input'] }
    }

    const model = getJsonModel(apiKey)
    const result = await model.generateContent(PROMPT(originalText, englishText, sourceLang))
    const parsed = parseJSON(result.response.text(), null)

    if (!parsed) {
        return { verdict: 'warn', similarity: 0.5, divergences: ['(validator parse error)'] }
    }

    const verdict = ['pass', 'warn', 'fail'].includes(parsed.verdict) ? parsed.verdict : 'warn'
    const similarity = Number.isFinite(parsed.similarity)
        ? Math.max(0, Math.min(1, parsed.similarity))
        : 0.5
    const divergences = Array.isArray(parsed.divergences)
        ? parsed.divergences.filter((d) => typeof d === 'string').slice(0, 5)
        : []

    return { verdict, similarity, divergences }
}

module.exports = { handler }
