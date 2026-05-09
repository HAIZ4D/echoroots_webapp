/**
 * vocabTranslatorAgent — translates an English noun into an Orang Asli
 * indigenous language word with pronunciation guide.
 *
 * Two-tier lookup:
 *   1. Curated dictionary (vocabulary.json) — verified words extracted from
 *      EchoRoots seedKnowledge entries and the verified PHRASES list.
 *      Result returned with source: "verified", confidence: 1.0.
 *   2. LLM fallback (Gemini) — only for words not in the dictionary.
 *      Returns source: "ai_suggested" with confidence threshold; refuses if
 *      Gemini admits low confidence.
 *
 * Multi-word inputs (e.g. "water bottle") are searched as a whole first,
 * then the LAST word ("bottle") is tried — this catches compound nouns
 * where only the head word is in the dictionary.
 *
 * Input:  { englishName, language, apiKey }
 *           language: 'semai' | 'temiar' | 'jakun' | 'mah_meri'
 * Output: {
 *   indigenousWord: string | null,
 *   pronunciation: string | null,
 *   culturalNote: string,
 *   confidence: 0..1,
 *   source: 'verified' | 'ai_suggested' | null,
 * }
 */

const { getJsonModel, parseJSON } = require('../shared')
const VOCAB = require('./vocabulary.json')

const TRIBE_NAMES = {
    // Orang Asli (Peninsular Malaysia)
    semai: 'Semai',
    temiar: 'Temiar',
    jakun: 'Jakun',
    mah_meri: 'Mah Meri',
    // Borneo & Indonesia
    iban: 'Iban',
    balinese: 'Balinese',
    // Mainland Southeast Asia
    khmer: 'Khmer (Cambodian)',
    lao: 'Lao',
    thai: 'Thai',
    burmese: 'Burmese',
    hmong: 'Hmong (Hmong Daw / White Hmong)',
    // Maritime Southeast Asia
    tagalog: 'Tagalog (Filipino)',
    malay: 'Malay (Bahasa Melayu)',
    tetum: 'Tetum',
}

function dictLookup(englishName, language) {
    const langDict = VOCAB[language]
    if (!langDict) return null

    const key = englishName.toLowerCase().trim()

    // Exact match.
    if (langDict[key]) return { ...langDict[key], matchedKey: key }

    // Multi-word input — try the last word (usually the noun head).
    const tokens = key.split(/\s+/).filter(Boolean)
    if (tokens.length > 1) {
        const lastWord = tokens[tokens.length - 1]
        if (langDict[lastWord]) return { ...langDict[lastWord], matchedKey: lastWord }
    }

    return null
}

const PROMPT = (englishName, languageDisplay) => `You are an expert in Orang Asli languages of Peninsular Malaysia (Semai, Temiar, Jakun, Mah Meri).

TASK: Provide the ${languageDisplay} word for the English noun "${englishName}", with a phonetic pronunciation guide.

STRICT RULES:
1. Only provide a translation you are GENUINELY confident about. ${languageDisplay} is a low-resource language — it is BETTER to refuse than to guess.
2. If you don't have a confident translation, set indigenousWord to null and confidence below 0.5.
3. If you DO have a confident translation:
   - indigenousWord: the actual ${languageDisplay} word (lowercase unless it has a proper-noun convention)
   - pronunciation: simple capital-letter syllable guide (e.g. "TAHM-pang", "KAH-yoo"). Keep it short and easy to read.
   - culturalNote: a short sentence ONLY if the word has cultural significance beyond the literal meaning. Empty string otherwise.
   - confidence: 0.6-1.0 reflecting how certain you are.
4. Never invent a pronunciation for a word you don't know.

English word: "${englishName}"
Target language: ${languageDisplay}

Respond ONLY with JSON of the shape:
{
  "indigenousWord": "word or null",
  "pronunciation": "PRONUN-see-AY-shun or null",
  "culturalNote": "short sentence or empty string",
  "confidence": 0.0
}`

async function handler({ englishName, language = 'semai', apiKey }) {
    if (!englishName || typeof englishName !== 'string') {
        return { indigenousWord: null, pronunciation: null, culturalNote: '', confidence: 0, source: null }
    }

    const langKey = String(language).toLowerCase()
    const languageDisplay = TRIBE_NAMES[langKey] || 'Semai'

    // ── Tier 1: Dictionary lookup (verified) ──
    const dictHit = dictLookup(englishName, langKey)
    if (dictHit) {
        return {
            indigenousWord: dictHit.word,
            pronunciation: dictHit.pronunciation || null,
            culturalNote: dictHit.context || '',
            confidence: 1.0,
            source: 'verified',
            matchedEnglish: dictHit.matchedKey,
        }
    }

    // ── Tier 2: LLM fallback (ai_suggested) ──
    const model = getJsonModel(apiKey)
    const result = await model.generateContent(PROMPT(englishName, languageDisplay))
    const parsed = parseJSON(result.response.text(), null)

    if (!parsed) {
        return { indigenousWord: null, pronunciation: null, culturalNote: '', confidence: 0, source: null }
    }

    const indigenousWord =
        typeof parsed.indigenousWord === 'string'
            && parsed.indigenousWord.trim()
            && parsed.indigenousWord.trim().toLowerCase() !== 'null'
            ? parsed.indigenousWord.trim()
            : null
    const pronunciation =
        typeof parsed.pronunciation === 'string'
            && parsed.pronunciation.trim()
            && parsed.pronunciation.trim().toLowerCase() !== 'null'
            ? parsed.pronunciation.trim()
            : null
    const culturalNote = typeof parsed.culturalNote === 'string' ? parsed.culturalNote : ''
    const confidence = Number.isFinite(parsed.confidence)
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0

    if (indigenousWord && confidence < 0.5) {
        return { indigenousWord: null, pronunciation: null, culturalNote: '', confidence, source: null }
    }

    return {
        indigenousWord,
        pronunciation,
        culturalNote,
        confidence,
        source: indigenousWord ? 'ai_suggested' : null,
    }
}

module.exports = { handler }
