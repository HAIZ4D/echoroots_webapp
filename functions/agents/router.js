/**
 * routerAgent — LLM-based intent classifier.
 * Replaces the brittle regex router in src/services/rag.js.
 *
 * Input:  { question }
 * Output: { intent, language, subject, confidence }
 *   intent: 'vocab' | 'cultural' | 'greeting' | 'off_topic'
 *   language: 'semai' | 'temiar' | 'jakun' | 'mah_meri' | null
 *   confidence: 0..1
 */

const { getJsonModel, parseJSON } = require('./shared')

const PROMPT = (question) => `You are a router for an Orang Asli cultural knowledge assistant (Semai, Temiar, Jakun, Mah Meri tribes of Peninsular Malaysia).

Classify the user's question into ONE intent:
- "vocab"     — asking how to say a word, a translation, or what a word means in an indigenous language
- "cultural"  — asking about practices, beliefs, medicine, plants, rituals, history, kinship, skills
- "greeting"  — hello, thank you, who are you, small talk
- "off_topic" — anything else (weather, math, code, world news, other cultures)

Also detect:
- language: which indigenous language is referenced (or null)
- subject: a 1-4 word noun phrase describing the topic (or null for greetings)
- confidence: how clearly the question matches the chosen intent (0..1)

Be conservative: when uncertain, prefer "off_topic" with low confidence.

Question: "${question}"

Respond ONLY with JSON of the shape:
{ "intent": "vocab|cultural|greeting|off_topic", "language": "semai|temiar|jakun|mah_meri|null", "subject": "short phrase or null", "confidence": 0.0 }`

async function handler({ question, apiKey }) {
    if (!question || typeof question !== 'string') {
        return { intent: 'off_topic', language: null, subject: null, confidence: 0 }
    }

    const model = getJsonModel(apiKey)
    const result = await model.generateContent(PROMPT(question))
    const text = result.response.text()

    const parsed = parseJSON(text, null)
    if (!parsed) {
        return { intent: 'off_topic', language: null, subject: null, confidence: 0 }
    }

    const intent = ['vocab', 'cultural', 'greeting', 'off_topic'].includes(parsed.intent)
        ? parsed.intent
        : 'off_topic'
    const language = ['semai', 'temiar', 'jakun', 'mah_meri'].includes(parsed.language)
        ? parsed.language
        : null
    const subject = typeof parsed.subject === 'string' && parsed.subject.toLowerCase() !== 'null'
        ? parsed.subject
        : null
    const confidence = Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : 0

    return { intent, language, subject, confidence }
}

module.exports = { handler }
