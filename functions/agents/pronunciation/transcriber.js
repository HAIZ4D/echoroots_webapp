/**
 * transcriberAgent — pure ASR for pronunciation evaluation.
 *
 * Critical separation from the old monolithic evaluatePronunciation:
 *   - Does NOT score. Does NOT generate feedback. Does NOT compare.
 *   - Just answers: "What did I literally hear in this audio?"
 *
 * Why: when the same prompt asks the model to transcribe AND score, the model
 * works backwards from the expected phrase to the transcription, inflating
 * accuracy. Splitting transcription out forces an honest read.
 *
 * Input:  { audioBase64, mimeType, referencePhrase, apiKey }
 *           referencePhrase is included as context (so the model knows the
 *           target language/accent) but is explicitly NOT to be reproduced.
 *
 * Output: { transcribed, isSilence, isOffLanguage, asrConfidence }
 */

const { GoogleGenerativeAI } = require('@google/generative-ai')
const { parseJSON } = require('../shared')

const PROMPT = (referencePhrase) => `You are a phonetic transcriber for indigenous Southeast Asian languages (Semai, Temiar, Jakun, Mah Meri).

EXPECTED PHRASE (for language/accent context only — do NOT reproduce this if you don't actually hear it): "${referencePhrase}"

TASK: Listen to the audio. Write down phonetically what you ACTUALLY hear, in plain Latin letters. Do NOT match it to the expected phrase. Do NOT correct what you hear.

STRICT RULES:
1. If the recording is silent, near-silent, or contains only background noise: set transcribed to "[SILENCE]" and isSilence to true.
2. If you hear speech in a clearly different language than the expected phrase (e.g. plain English): set isOffLanguage to true.
3. asrConfidence is 0.0-1.0 — how sure you are about your transcription (NOT how close it matches the expected phrase).
4. The transcription is what you HEARD, not what you THINK was meant.

Respond ONLY with JSON of the shape:
{
  "transcribed": "phonetic transcription of what you heard, or [SILENCE]",
  "isSilence": false,
  "isOffLanguage": false,
  "asrConfidence": 0.0
}`

async function handler({ audioBase64, mimeType, referencePhrase, apiKey }) {
    if (!audioBase64) {
        return { transcribed: '[NO AUDIO]', isSilence: true, isOffLanguage: false, asrConfidence: 0 }
    }

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
    })

    const result = await model.generateContent([
        { inlineData: { mimeType: mimeType || 'audio/webm', data: audioBase64 } },
        { text: PROMPT(referencePhrase || '') },
    ])

    const parsed = parseJSON(result.response.text(), null)
    if (!parsed) {
        return { transcribed: '[PARSE ERROR]', isSilence: false, isOffLanguage: false, asrConfidence: 0 }
    }

    const transcribed = typeof parsed.transcribed === 'string' && parsed.transcribed.trim()
        ? parsed.transcribed.trim()
        : '[SILENCE]'

    return {
        transcribed,
        isSilence: !!parsed.isSilence || transcribed === '[SILENCE]',
        isOffLanguage: !!parsed.isOffLanguage,
        asrConfidence: Number.isFinite(parsed.asrConfidence)
            ? Math.max(0, Math.min(1, parsed.asrConfidence))
            : 0.5,
    }
}

module.exports = { handler }
