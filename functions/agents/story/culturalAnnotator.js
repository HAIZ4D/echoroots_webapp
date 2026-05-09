/**
 * culturalAnnotatorAgent — adds cultural notes ONLY for words flagged as
 * culturally significant. Does NOT generate generic "this is from Southeast
 * Asia" filler.
 *
 * Skipped entirely (returns empty notes) when there are no candidate words —
 * saves a Gemini call for plain narrative text.
 *
 * Input:  { originalText, englishText, candidateWords, apiKey }
 *           candidateWords are the lowConfidenceWords from literalTranslator
 *           (i.e. words the model flagged as unfamiliar — those most likely
 *           to carry cultural meaning).
 *
 * Output: { culturalNotes: string, annotatedWords: [string] }
 *           culturalNotes: 0–2 short sentences, or '' if nothing genuinely notable
 */

const { getJsonModel, parseJSON } = require('../shared')

const PROMPT = (originalText, englishText, words) => `You annotate Orang Asli (Semai, Temiar, Jakun, Mah Meri) cultural terms.

CONTEXT:
Original text: "${originalText}"
English translation: "${englishText}"
Candidate words to consider: ${words.map((w) => `"${w}"`).join(', ')}

TASK:
For ONLY the candidate words above, decide whether each carries genuine cultural significance you can specifically describe. If you do not actually know the cultural meaning of a word, SKIP IT — do not invent.

STRICT RULES:
1. Only annotate words you can describe with specific knowledge (e.g. "halaq is the Temiar shaman role in spirit-mediation rituals"). Generic notes like "this is an indigenous concept" are FORBIDDEN.
2. Combined notes must be at most 2 short sentences total.
3. If no candidate words are genuinely culturally notable, return culturalNotes: "" and annotatedWords: [].
4. Never add framing like "this culture believes" — write as factual observation.

Respond ONLY with JSON of the shape:
{
  "culturalNotes": "Short factual notes joining the annotated terms, or empty string",
  "annotatedWords": ["word1", "word2"]
}`

async function handler({ originalText, englishText, candidateWords = [], apiKey }) {
    if (!Array.isArray(candidateWords) || candidateWords.length === 0) {
        return { culturalNotes: '', annotatedWords: [] }
    }

    const model = getJsonModel(apiKey)
    const result = await model.generateContent(PROMPT(originalText, englishText, candidateWords))
    const parsed = parseJSON(result.response.text(), null)

    if (!parsed) return { culturalNotes: '', annotatedWords: [] }

    return {
        culturalNotes: typeof parsed.culturalNotes === 'string' ? parsed.culturalNotes : '',
        annotatedWords: Array.isArray(parsed.annotatedWords)
            ? parsed.annotatedWords.filter((w) => typeof w === 'string')
            : [],
    }
}

module.exports = { handler }
