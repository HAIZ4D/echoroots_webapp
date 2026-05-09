/**
 * visionIdentifierAgent — uses Gemini multimodal to identify the main object
 * in a captured image. Returns the most specific common English noun, or null
 * if the image is too ambiguous to confidently name a single object.
 *
 * Critically: refuses to invent. If multiple objects are present or the main
 * subject is unclear (a face, a landscape, abstract scene), it returns null.
 *
 * Input:  { imageBase64, mimeType, apiKey }
 * Output: {
 *   englishName: string | null,   // e.g. "bottle", "leaf", "knife"
 *   confidence: 0..1,              // model self-rated
 *   reason: string                 // why null, or short description if found
 * }
 */

const { GoogleGenerativeAI } = require('@google/generative-ai')
const { parseJSON } = require('../shared')

const PROMPT = `You identify everyday physical objects in photos for a language-learning app.

TASK: Look at the image. Name the SINGLE most prominent everyday object using a common English noun (singular, lowercase, no adjectives).

STRICT RULES:
1. One word only when possible (e.g. "bottle", "leaf", "knife", "phone"). Two words only if necessary (e.g. "water bottle", "rice bowl").
2. If the image shows: a person's face, a landscape, multiple equally-prominent objects, abstract patterns, text, or anything not a clear single object → return englishName: null with a short reason.
3. Confidence is 0.0-1.0 — how sure you are about the identification. Below 0.6 means uncertain.
4. Do NOT invent or guess. If you genuinely can't tell, set null and explain.

Respond ONLY with JSON of the shape:
{
  "englishName": "lowercase noun, or null",
  "confidence": 0.0,
  "reason": "short description of what you saw, or why you can't identify a single object"
}`

async function handler({ imageBase64, mimeType, apiKey }) {
    if (!imageBase64) {
        return { englishName: null, confidence: 0, reason: 'no image provided' }
    }

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
    })

    const result = await model.generateContent([
        { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
        { text: PROMPT },
    ])

    const parsed = parseJSON(result.response.text(), null)
    if (!parsed) {
        return { englishName: null, confidence: 0, reason: 'parse error' }
    }

    const englishName =
        typeof parsed.englishName === 'string'
            && parsed.englishName.trim()
            && parsed.englishName.trim().toLowerCase() !== 'null'
            ? parsed.englishName.trim().toLowerCase()
            : null
    const confidence = Number.isFinite(parsed.confidence)
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0
    const reason = typeof parsed.reason === 'string' ? parsed.reason : ''

    // Hard cutoff — confidence below 0.5 is treated as no identification.
    if (englishName && confidence < 0.5) {
        return { englishName: null, confidence, reason: reason || 'low confidence identification' }
    }

    return { englishName, confidence, reason }
}

module.exports = { handler }
