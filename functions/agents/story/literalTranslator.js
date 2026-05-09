/**
 * literalTranslatorAgent — strict word-for-word translation to English + Malay.
 *
 * Critically: marks words the model is NOT confident about, so the cultural
 * annotator only adds notes for legitimately culturally-significant words
 * (instead of fabricating notes for every word like the old translateText).
 *
 * Input:  { text, sourceLang, apiKey }
 * Output: {
 *   translations: [
 *     { lang: 'en', text, lowConfidenceWords: [string] },
 *     { lang: 'ms', text, lowConfidenceWords: [string] },
 *   ]
 * }
 */

const { getJsonModel, parseJSON } = require('../shared')

const PROMPT = (text, sourceLang) => `You are a literal translator for low-resource Southeast Asian languages (Semai, Temiar, Jakun, Mah Meri, Malay).

TASK: Translate the following text from ${sourceLang} into BOTH English and Bahasa Melayu.

STRICT RULES:
1. Translate WORD-FOR-WORD. Do NOT summarise, embellish, or add cultural framing.
2. Preserve the original sentence count and order.
3. If you do not actually know what a source word means, leave it untranslated in [brackets] inside the translation AND list it under "lowConfidenceWords".
4. Do NOT invent meanings. Do NOT add adjectives that aren't in the source.
5. If the entire text is silence, gibberish, or untranslatable, set both translations to "[untranslatable]" and list every word as lowConfidence.

Source text (${sourceLang}): "${text}"

Respond ONLY with JSON of the shape:
{
  "translations": [
    { "lang": "en", "text": "literal English translation here", "lowConfidenceWords": ["word1", "word2"] },
    { "lang": "ms", "text": "terjemahan literal Bahasa Melayu", "lowConfidenceWords": ["word1"] }
  ]
}`

async function handler({ text, sourceLang = 'indigenous', apiKey }) {
    if (!text || typeof text !== 'string') {
        return {
            translations: [
                { lang: 'en', text: '', lowConfidenceWords: [] },
                { lang: 'ms', text: '', lowConfidenceWords: [] },
            ],
        }
    }

    const model = getJsonModel(apiKey)
    const result = await model.generateContent(PROMPT(text, sourceLang))
    const parsed = parseJSON(result.response.text(), null)

    if (!parsed || !Array.isArray(parsed.translations)) {
        return {
            translations: [
                { lang: 'en', text: '', lowConfidenceWords: [] },
                { lang: 'ms', text: '', lowConfidenceWords: [] },
            ],
        }
    }

    const safe = (lang) => {
        const t = parsed.translations.find((x) => x && x.lang === lang)
        return {
            lang,
            text: typeof t?.text === 'string' ? t.text : '',
            lowConfidenceWords: Array.isArray(t?.lowConfidenceWords)
                ? t.lowConfidenceWords.filter((w) => typeof w === 'string')
                : [],
        }
    }

    return { translations: [safe('en'), safe('ms')] }
}

module.exports = { handler }
