/**
 * EchoRoots Cloud Functions
 *
 * Proxy layer that keeps API keys server-side.
 * All Gemini and ElevenLabs calls go through here — the browser never sees the keys.
 *
 * Secrets stored via Firebase Secret Manager:
 *   firebase functions:secrets:set GEMINI_API_KEY
 *   firebase functions:secrets:set ELEVENLABS_API_KEY
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const GEMINI_KEY = defineSecret('GEMINI_API_KEY')
// Dedicated Google Cloud Text-to-Speech key — separate from the AI Studio
// Gemini key (which is locked to Generative Language API only and can't be
// extended to other GCP services). This key was created in Cloud Console.
const GCP_TTS_KEY = defineSecret('GCP_TTS_API_KEY')
// (ELEVENLABS_API_KEY secret was destroyed — TTS now goes through Google Cloud TTS.)

const REGION = 'us-central1'

// ─── Helpers ────────────────────────────────────────────────────────────────

// gemini-2.5-flash is the current-generation Flash model. The older
// gemini-2.0-flash returns 404 "no longer available to new users" on
// API projects created after Google's deprecation.
function getModel(apiKey) {
    return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-2.5-flash' })
}

function parseJSON(text, fallback) {
    try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        return JSON.parse(cleaned)
    } catch {
        return fallback
    }
}

// ─── 1. transcribeAudio ──────────────────────────────────────────────────────

exports.transcribeAudio = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 60 },
    async ({ data }) => {
        const { audioBase64, mimeType } = data
        if (!audioBase64) throw new HttpsError('invalid-argument', 'audioBase64 required')

        const model = getModel(GEMINI_KEY.value())
        const result = await model.generateContent([
            { inlineData: { mimeType: mimeType || 'audio/webm', data: audioBase64 } },
            {
                text: `You are an expert linguist and speech transcriptionist specializing in Southeast Asian indigenous languages (Semai, Temiar, Jakun, Malay, and related languages).

TASK: Transcribe EXACTLY what is spoken in this audio recording. Do not paraphrase, summarize, or invent content.

RULES:
- If the recording is silent, contains only background noise, or has no intelligible human speech, set transcription to "[SILENCE]" and confidence to 0.
- Transcribe word-for-word what was actually said, preserving the exact phrasing and any code-switching.
- If the language is not a recognized indigenous language (e.g., it's English or Malay), still transcribe it accurately and set language accordingly.
- Do NOT add, expand, or embellish — only transcribe what you hear.

Respond in this exact JSON format:
{
  "transcription": "exact verbatim transcription, or [SILENCE]",
  "language": "detected language (e.g., semai, temiar, jakun, malay, english, mixed)",
  "confidence": 0.85
}

Return ONLY the JSON, no other text.`,
            },
        ])

        const text = result.response.text()
        return parseJSON(text, { transcription: text, language: 'unknown', confidence: 0.5 })
    }
)

// ─── 2. translateText ────────────────────────────────────────────────────────
// @deprecated — replaced by agenticTranslate (multi-agent pipeline). Kept
// deployed for one rollout cycle in case any client path still calls it.

exports.translateText = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 30 },
    async ({ data }) => {
        const { text, sourceLang = 'indigenous' } = data
        if (!text) throw new HttpsError('invalid-argument', 'text required')

        const model = getModel(GEMINI_KEY.value())
        const result = await model.generateContent(
            `You are an expert translator specializing in Southeast Asian indigenous languages.

Translate the following text from ${sourceLang} to English and Malay (Bahasa Melayu).
Include cultural annotations where specific terms have deeper meaning.

Original text: "${text}"

Respond in this exact JSON format:
{
  "translations": [
    { "lang": "en", "text": "English translation here", "culturalNotes": "any cultural context" },
    { "lang": "ms", "text": "Terjemahan Bahasa Melayu di sini", "culturalNotes": "konteks budaya jika ada" }
  ]
}

Return ONLY the JSON, no other text.`
        )

        const responseText = result.response.text()
        return parseJSON(responseText, {
            translations: [
                { lang: 'en', text: responseText, culturalNotes: '' },
                { lang: 'ms', text: responseText, culturalNotes: '' },
            ],
        })
    }
)

// ─── 3. splitScenes ─────────────────────────────────────────────────────────
// @deprecated — replaced by agenticSplitScenes (multi-agent pipeline). Kept
// deployed for one rollout cycle.

exports.splitScenes = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 60 },
    async ({ data }) => {
        const { storyText, englishTranslation, malayTranslation } = data
        if (!storyText) throw new HttpsError('invalid-argument', 'storyText required')

        const model = getModel(GEMINI_KEY.value())
        const result = await model.generateContent(
            `You are a creative editor for an indigenous cultural storybook. Transform the speaker's words into a rich 3-scene visual narrative.

RULES:
- ALWAYS produce EXACTLY 3 scenes — no more, no less.
- If the original is short (1–3 sentences), give each sentence its own scene, enriching the image prompt with vivid cultural atmosphere (lush forest setting, golden light, sounds of nature, emotional mood) while keeping the text faithful to the original.
- If the original is longer (4+ sentences), group sentences naturally into 3 scenes.
- Each scene "text" should be the original language portion for that scene.
- Each scene "translationEn" and "translationMs" must match the corresponding translation excerpt.
- Image prompts must be vivid, detailed, and painterly — describe lighting, mood, and setting richly.

Original story: "${storyText}"
English translation: "${englishTranslation}"
Bahasa Melayu translation: "${malayTranslation}"

Respond in this exact JSON format:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "original language excerpt for scene 1",
      "translationEn": "English excerpt for scene 1",
      "translationMs": "Bahasa Melayu excerpt for scene 1",
      "imagePrompt": "Vivid scene 1 description. Style: warm watercolor digital art, Southeast Asian rainforest, culturally respectful depiction of indigenous Orang Asli life, rich greens and earth tones, golden hour light. No text in the image."
    },
    {
      "sceneNumber": 2,
      "text": "original language excerpt for scene 2",
      "translationEn": "English excerpt for scene 2",
      "translationMs": "Bahasa Melayu excerpt for scene 2",
      "imagePrompt": "Vivid scene 2 description. Style: warm watercolor digital art, Southeast Asian rainforest, culturally respectful depiction of indigenous Orang Asli life, rich greens and earth tones, golden hour light. No text in the image."
    },
    {
      "sceneNumber": 3,
      "text": "original language excerpt for scene 3",
      "translationEn": "English excerpt for scene 3",
      "translationMs": "Bahasa Melayu excerpt for scene 3",
      "imagePrompt": "Vivid scene 3 description. Style: warm watercolor digital art, Southeast Asian rainforest, culturally respectful depiction of indigenous Orang Asli life, rich greens and earth tones, golden hour light. No text in the image."
    }
  ]
}

Return ONLY the JSON, no other text.`
        )

        const responseText = result.response.text()
        return parseJSON(responseText, {
            scenes: [
                {
                    sceneNumber: 1,
                    text: storyText,
                    translationEn: englishTranslation,
                    translationMs: malayTranslation,
                    imagePrompt: 'A serene Southeast Asian rainforest scene with traditional indigenous village elements',
                },
            ],
        })
    }
)

// ─── 4. generateIllustration ─────────────────────────────────────────────────

exports.generateIllustration = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 120 },
    async ({ data }) => {
        const { prompt } = data
        if (!prompt) throw new HttpsError('invalid-argument', 'prompt required')

        const apiKey = GEMINI_KEY.value()
        const artPrompt =
            `Beautiful watercolor illustration for a Southeast Asian indigenous storybook. ` +
            `Scene: ${prompt}. ` +
            `Style: warm, culturally respectful, detailed painting of Orang Asli people in lush Borneo ` +
            `tropical rainforest, rich greens, golden light, earth tones. No text or letters in the image.`
        const safePrompt = artPrompt.length > 800 ? artPrompt.slice(0, 800) : artPrompt

        // Provider 1: Imagen 4 Fast (paid tier — fastest, primary)
        // Note: gemini-2.0-flash-exp-image-generation was removed — that model
        // was deprecated alongside gemini-2.0-flash for newly-billed projects.
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        instances: [{ prompt: safePrompt }],
                        parameters: { sampleCount: 1, aspectRatio: '16:9' },
                    }),
                }
            )
            if (res.ok) {
                const resData = await res.json()
                const pred = resData.predictions?.[0]
                if (pred?.bytesBase64Encoded) {
                    console.log('[Illustration] Imagen 4 Fast succeeded')
                    return { imageBase64: pred.bytesBase64Encoded, mimeType: pred.mimeType || 'image/png' }
                }
            }
            const err = await res.text().catch(() => res.status)
            console.warn('[Illustration] Imagen 4 Fast failed:', typeof err === 'string' ? err.slice(0, 120) : err)
        } catch (e) {
            console.warn('[Illustration] Imagen 4 Fast error:', e.message)
        }

        // Provider 2: Imagen 4 Full (higher fidelity fallback)
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        instances: [{ prompt: safePrompt }],
                        parameters: { sampleCount: 1, aspectRatio: '16:9' },
                    }),
                }
            )
            if (res.ok) {
                const resData = await res.json()
                const pred = resData.predictions?.[0]
                if (pred?.bytesBase64Encoded) {
                    console.log('[Illustration] Imagen 4 Full succeeded')
                    return { imageBase64: pred.bytesBase64Encoded, mimeType: pred.mimeType || 'image/png' }
                }
            }
            const err = await res.text().catch(() => res.status)
            console.warn('[Illustration] Imagen 4 Full failed:', typeof err === 'string' ? err.slice(0, 120) : err)
        } catch (e) {
            console.warn('[Illustration] Imagen 4 Full error:', e.message)
        }

        console.warn('[Illustration] All providers failed — returning placeholder')
        return { imageBase64: null, mimeType: 'image/png', error: 'All providers failed' }
    }
)

// ─── 5. evaluatePronunciation ────────────────────────────────────────────────
// @deprecated — replaced by orchestrateEvaluation (multi-agent pipeline).
// Kept deployed for one rollout cycle.

exports.evaluatePronunciation = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 60 },
    async ({ data }) => {
        const { audioBase64, mimeType, referencePhrase } = data
        if (!audioBase64 || !referencePhrase)
            throw new HttpsError('invalid-argument', 'audioBase64 and referencePhrase required')

        const model = getModel(GEMINI_KEY.value())
        const result = await model.generateContent([
            { inlineData: { mimeType: mimeType || 'audio/webm', data: audioBase64 } },
            {
                text: `You are a strict, objective pronunciation evaluator for indigenous Southeast Asian languages.

EXPECTED PHRASE: "${referencePhrase}"

STEP 1 — TRANSCRIBE: Listen carefully to the audio recording. Write down EXACTLY what you hear phonetically. If the recording is silent, near-silent, contains only background noise, or has no intelligible speech, set transcribed to "[SILENCE]".

STEP 2 — SCORE using this rubric (no exceptions, no rounding up):
- [SILENCE] or no speech detected → score: 0–8
- Speech detected but completely unrecognizable / wrong language → score: 10–20
- Very few sounds match (< 30% phoneme accuracy) → score: 21–38
- Some sounds match but major errors in stress, tone, and vowels (30–55% accuracy) → score: 39–54
- Most sounds recognizable but clear errors in 2+ phonemes → score: 55–69
- Minor errors only, rhythm and stress mostly correct → score: 70–84
- Near-native accuracy, only tiny deviation → score: 85–94
- Perfect or indistinguishable from native → score: 95–100

STEP 3 — FEEDBACK: Be direct and specific. Do NOT inflate praise. If the user said nothing, say so clearly. Compare what was heard vs what was expected phoneme by phoneme.

STEP 4 — TIPS: Give 2–3 concrete, actionable tips based on the actual errors heard. If silent, give tips on how to attempt the phrase.

Respond in this EXACT JSON format only — no markdown, no extra text:
{
  "score": 0,
  "transcribed": "exactly what you heard, or [SILENCE]",
  "feedback": "Direct factual assessment comparing what was heard vs expected",
  "tips": ["Specific tip 1", "Specific tip 2"]
}`,
            },
        ])

        const responseText = result.response.text()
        return parseJSON(responseText, {
            score: 0,
            transcribed: '[PARSE ERROR]',
            feedback: responseText,
            tips: ['Please try again.'],
        })
    }
)

// ─── 6. generateRAGResponse ──────────────────────────────────────────────────
// @deprecated — kept deployed for one rollout cycle. Prefer orchestrateElderResponse.

exports.generateRAGResponse = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 30 },
    async ({ data }) => {
        const { question, contextDocs = [] } = data
        if (!question) throw new HttpsError('invalid-argument', 'question required')

        const contextText = contextDocs
            .map((doc, i) => `[Source ${i + 1} - ${doc.category || 'General'}]: ${doc.content}`)
            .join('\n\n')

        const model = getModel(GEMINI_KEY.value())
        const result = await model.generateContent(
            `You are a wise Digital Elder — a guardian of indigenous cultural knowledge from the Orang Asli communities of Borneo and Peninsular Malaysia.

You MUST answer using ONLY the cultural knowledge provided below.
If the knowledge base doesn't contain relevant information, say "I don't have knowledge about that in our cultural archive yet. Perhaps an elder could help us learn more about this."

For every answer, identify 2-3 key indigenous vocabulary terms and format them as [indigenous_word|english_meaning].

Respond warmly and wisely, as an elder teaching a young person. Keep your response concise but rich with cultural insight.

Cultural Knowledge:
${contextText}

User Question: ${question}

Respond in this exact JSON format:
{
  "answer": "Your warm, culturally grounded response with [word|meaning] terms inline",
  "vocabTerms": [
    { "word": "indigenous_word", "meaning": "english meaning" }
  ]
}

Return ONLY the JSON, no other text.`
        )

        const responseText = result.response.text()
        return parseJSON(responseText, { answer: responseText, vocabTerms: [] })
    }
)

// ─── 7. translateVocabulary ──────────────────────────────────────────────────
// @deprecated — kept deployed for one rollout cycle. Prefer orchestrateElderResponse.

exports.translateVocabulary = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 30 },
    async ({ data }) => {
        const { question } = data
        if (!question) throw new HttpsError('invalid-argument', 'question required')

        const model = getModel(GEMINI_KEY.value())
        const result = await model.generateContent(
            `You are a wise Digital Elder and expert linguist in Orang Asli languages (Semai, Temiar, Jakun) from Peninsular Malaysia.

The user is asking a vocabulary or translation question. Answer it with warmth and cultural richness.

RULES:
- Provide the word/phrase in the requested indigenous language
- Include pronunciation guide (e.g., "KAH-yoo")
- Include Bahasa Melayu equivalent if known
- Give a short usage example or cultural note if relevant
- Embed the indigenous word using [word|meaning] format so it gets highlighted
- If you are not confident in the translation, say so honestly and suggest consulting a native speaker

User question: "${question}"

Respond in this exact JSON format:
{
  "answer": "Your warm elder response with [indigenous_word|english_meaning] terms inline",
  "vocabTerms": [
    { "word": "indigenous_word", "meaning": "english meaning" }
  ]
}

Return ONLY the JSON, no other text.`
        )

        const responseText = result.response.text()
        return parseJSON(responseText, { answer: responseText, vocabTerms: [] })
    }
)

// ─── 8. textToSpeech ─────────────────────────────────────────────────────────
// Google Cloud Text-to-Speech via REST. Uses dedicated GCP_TTS_API_KEY (not the
// AI Studio Gemini key, which can't be extended to non-Gemini APIs).
// Voice: en-US-Neural2-F (warm female), elder-style pacing.
//
// Response shape unchanged: { audioBase64, mimeType } on success or
// { audioBase64: null, fallback: true } on failure → client falls back to
// browser SpeechSynthesis.

const GCP_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'
const ELDER_VOICE = {
    languageCode: 'en-US',
    name: 'en-US-Neural2-F',
    ssmlGender: 'FEMALE',
}
const ELDER_AUDIO_CONFIG = {
    audioEncoding: 'MP3',
    speakingRate: 0.95,
    pitch: -2.0,
}

async function synthesizeSpeechGcp(text, apiKey) {
    const res = await fetch(`${GCP_TTS_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { text },
            voice: ELDER_VOICE,
            audioConfig: ELDER_AUDIO_CONFIG,
        }),
    })

    if (!res.ok) {
        const errBody = await res.text().catch(() => String(res.status))
        return { ok: false, status: res.status, error: errBody.slice(0, 400) }
    }

    const json = await res.json()
    if (!json.audioContent) {
        return { ok: false, status: res.status, error: 'No audioContent in response' }
    }
    return { ok: true, audioBase64: json.audioContent }
}

// ─── Lip-sync helper: GCP TTS with SSML marks for per-word timing ──────────
//
// Cloud TTS doesn't return character-level timestamps (the way ElevenLabs
// Creator plan does), but it DOES return SSML mark timepoints. We wrap every
// word in <mark> tags and request enableTimePointing=SSML_MARK, then build
// word-level (text, start_ms, duration_ms) arrays for TalkingHead's lip-sync.

function escapeSsml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

// Strip punctuation but keep apostrophes/hyphens that belong inside words.
function cleanWord(w) {
    return String(w).replace(/[^\p{L}\p{N}'\-]+/gu, '').trim()
}

function buildMarkedSsml(text) {
    const tokens = String(text).trim().split(/\s+/).filter(Boolean)
    const parts = tokens.map((tok, i) => `<mark name="w${i}"/>${escapeSsml(tok)}`)
    parts.push(`<mark name="end"/>`)
    return { ssml: `<speak>${parts.join(' ')}</speak>`, tokens }
}

// SSML mark timepoints are only exposed on the v1beta1 endpoint (the stable
// v1 endpoint silently rejects `enableTimePointing` as an unknown field).
const GCP_TTS_URL_BETA = 'https://texttospeech.googleapis.com/v1beta1/text:synthesize'

async function synthesizeSpeechGcpWithTiming(text, apiKey) {
    const { ssml, tokens } = buildMarkedSsml(text)

    const res = await fetch(`${GCP_TTS_URL_BETA}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { ssml },
            voice: ELDER_VOICE,
            audioConfig: ELDER_AUDIO_CONFIG,
            enableTimePointing: ['SSML_MARK'],
        }),
    })

    if (!res.ok) {
        const errBody = await res.text().catch(() => String(res.status))
        return { ok: false, status: res.status, error: errBody.slice(0, 400) }
    }

    const json = await res.json()
    if (!json.audioContent) {
        return { ok: false, status: res.status, error: 'No audioContent in response' }
    }

    // timepoints: [{ markName: "w0", timeSeconds: 0.345 }, ..., { markName: "end", timeSeconds: 4.21 }]
    const timepoints = Array.isArray(json.timepoints) ? json.timepoints : []
    const wordMarks = timepoints
        .filter((tp) => /^w\d+$/.test(tp.markName))
        .sort((a, b) => parseInt(a.markName.slice(1), 10) - parseInt(b.markName.slice(1), 10))
    const endMark = timepoints.find((tp) => tp.markName === 'end')

    const words = []
    const wtimes = []
    const wdurations = []

    if (wordMarks.length === 0 && tokens.length > 0) {
        // No timepoints came back — fall back to even distribution based on
        // a rough 70 ms-per-character estimate. Less accurate but keeps mouth
        // moving instead of frozen.
        const estDurMs = Math.max(600, text.length * 70)
        const perWord = estDurMs / tokens.length
        tokens.forEach((tok, i) => {
            const w = cleanWord(tok)
            if (!w) return
            words.push(w)
            wtimes.push(Math.round(i * perWord))
            wdurations.push(Math.round(perWord))
        })
    } else {
        tokens.forEach((tok, i) => {
            const startSec = wordMarks[i]?.timeSeconds ?? 0
            const nextSec =
                wordMarks[i + 1]?.timeSeconds ??
                endMark?.timeSeconds ??
                startSec + 0.3
            const w = cleanWord(tok)
            if (!w) return
            words.push(w)
            wtimes.push(Math.round(startSec * 1000))
            wdurations.push(Math.max(60, Math.round((nextSec - startSec) * 1000)))
        })
    }

    return { ok: true, audioBase64: json.audioContent, words, wtimes, wdurations }
}

exports.textToSpeech = onCall(
    { secrets: [GCP_TTS_KEY], region: REGION, timeoutSeconds: 30 },
    async ({ data }) => {
        const { text } = data
        if (!text) throw new HttpsError('invalid-argument', 'text required')

        const apiKey = GCP_TTS_KEY.value()?.trim()
        if (!apiKey) {
            console.error('[TTS] GCP_TTS_API_KEY secret is empty.')
            return { audioBase64: null, fallback: true }
        }

        try {
            const result = await synthesizeSpeechGcp(text, apiKey)
            if (!result.ok) {
                console.warn(`[TTS] Google Cloud TTS failed: ${result.status} ${result.error}`)
                return { audioBase64: null, fallback: true }
            }
            console.log(`[TTS] Google Cloud TTS succeeded (${text.length}ch)`)
            return { audioBase64: result.audioBase64, mimeType: 'audio/mpeg' }
        } catch (e) {
            console.warn(`[TTS] error: ${e.message}`)
            return { audioBase64: null, fallback: true }
        }
    }
)

// ─── 9. speakWithTimestamps (avatar lip-sync) ────────────────────────────────
// Google Cloud TTS via SSML marks for per-word timing. The client (avatar.js)
// feeds the returned words/wtimes/wdurations directly to TalkingHead's
// speakAudio(), giving real lip sync that follows the audio.

exports.speakWithTimestamps = onCall(
    { secrets: [GCP_TTS_KEY], region: REGION, timeoutSeconds: 30 },
    async ({ data }) => {
        const { text } = data
        if (!text) throw new HttpsError('invalid-argument', 'text required')

        const apiKey = GCP_TTS_KEY.value()?.trim()
        if (!apiKey) {
            console.error('[TTS-lipsync] GCP_TTS_API_KEY secret is empty.')
            return { audioBase64: null, fallback: true }
        }

        try {
            const result = await synthesizeSpeechGcpWithTiming(text, apiKey)
            if (!result.ok) {
                console.warn(`[TTS-lipsync] Google Cloud TTS failed: ${result.status} ${result.error}`)
                return { audioBase64: null, fallback: true }
            }
            console.log(
                `[TTS-lipsync] Google Cloud TTS succeeded (${text.length}ch, ${result.words.length} words)`
            )
            return {
                audioBase64: result.audioBase64,
                mimeType: 'audio/mpeg',
                // Word-level timing for TalkingHead lip sync.
                words: result.words,
                wtimes: result.wtimes,
                wdurations: result.wdurations,
            }
        } catch (e) {
            console.warn(`[TTS-lipsync] error: ${e.message}`)
            return { audioBase64: null, fallback: true }
        }
    }
)

// ─── Digital Elder multi-agent pipeline ─────────────────────────────────────
// Each agent is exposed both as a standalone callable (for direct testing and
// per-agent log visibility) AND consumed in-process by orchestrateElderResponse.

const routerAgent = require('./agents/router')
const retrieverAgent = require('./agents/retriever')
const grounderAgent = require('./agents/grounder')
const validatorAgent = require('./agents/validator')
const composerAgent = require('./agents/composer')

exports.routerAgent = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 20 },
    async ({ data }) => {
        const { question } = data
        if (!question) throw new HttpsError('invalid-argument', 'question required')
        return routerAgent.handler({ question, apiKey: GEMINI_KEY.value() })
    }
)

exports.retrieverAgent = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 30 },
    async ({ data }) => {
        const { question, intent = 'cultural', language = null, subject = null } = data
        if (!question) throw new HttpsError('invalid-argument', 'question required')
        return retrieverAgent.handler({ question, intent, language, subject, apiKey: GEMINI_KEY.value() })
    }
)

exports.grounderAgent = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 30 },
    async ({ data }) => {
        const { question, intent = 'cultural', docs = [] } = data
        if (!question) throw new HttpsError('invalid-argument', 'question required')
        return grounderAgent.handler({ question, intent, docs, apiKey: GEMINI_KEY.value() })
    }
)

exports.validatorAgent = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 20 },
    async ({ data }) => {
        const { draftAnswer, vocabTerms = [], docs = [] } = data
        return validatorAgent.handler({ draftAnswer, vocabTerms, docs, apiKey: GEMINI_KEY.value() })
    }
)

exports.composerAgent = onCall(
    { region: REGION, timeoutSeconds: 10 },
    async ({ data }) => composerAgent.handler(data || {})
)

// ─── orchestrateElderResponse ───────────────────────────────────────────────
// Single client-facing callable that chains router → retriever → grounder →
// validator → composer in-process. Each agent's output is logged so a single
// request produces 5 traceable log lines in Firebase Functions logs.

// Cheap greeting fast-path — saves the router's Gemini call when the user
// clearly just said hi/thanks. Anything more substantive falls through to
// the LLM router for proper classification.
const GREETING_PATTERN = /^\s*(hi|hello|hey|hai|halo|salam|selamat|thanks?|thank you|terima kasih|who are you|what are you|introduce yourself)[\s!?.]*$/i

function isQuotaError(err) {
    if (!err) return false
    if (err.status === 429) return true
    const msg = (err.message || '').toLowerCase()
    return msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('too many requests')
}

const RESTING_REFUSAL =
    'The elder is resting briefly — the spirits ask us to be patient. Please try your question again in a moment.'

exports.orchestrateElderResponse = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 90 },
    async ({ data }) => {
        const { question } = data
        if (!question || typeof question !== 'string') {
            throw new HttpsError('invalid-argument', 'question required (string)')
        }

        const apiKey = GEMINI_KEY.value()
        const reqId = Math.random().toString(36).slice(2, 8)
        const t0 = Date.now()

        // ── 1. Router (with greeting fast-path) ──
        let route
        if (GREETING_PATTERN.test(question)) {
            route = { intent: 'greeting', language: null, subject: null, confidence: 1 }
            console.log(`[elder ${reqId}] router (fast-path greeting)`)
        } else {
            try {
                route = await routerAgent.handler({ question, apiKey })
                console.log(`[elder ${reqId}] router`, JSON.stringify(route))
            } catch (e) {
                console.warn(`[elder ${reqId}] router error: ${e.message}`)
                if (isQuotaError(e)) {
                    return { answer: RESTING_REFUSAL, vocabTerms: [], sources: [], refused: true }
                }
                // Any other router failure → treat as off_topic refusal.
                route = { intent: 'off_topic', language: null, subject: null, confidence: 0 }
            }
        }

        // Greeting / off-topic short-circuit straight to composer (no further Gemini calls).
        if (route.intent === 'greeting' || route.intent === 'off_topic' || route.confidence < 0.4) {
            const final = composerAgent.handler({
                verdict: 'fail',
                draftAnswer: null,
                vocabTerms: [],
                docs: [],
                citedSourceIndexes: [],
                intent: route.intent === 'greeting' ? 'greeting' : 'off_topic',
                language: route.language,
            })
            console.log(`[elder ${reqId}] short-circuit (${route.intent}) ${Date.now() - t0}ms`)
            return final
        }

        // ── 2. Retriever ──
        let retrieval
        try {
            retrieval = await retrieverAgent.handler({
                question,
                intent: route.intent,
                language: route.language,
                subject: route.subject,
                apiKey,
            })
            console.log(`[elder ${reqId}] retriever docs=${retrieval.docs.length} conf=${retrieval.retrievalConfidence}`)
        } catch (e) {
            console.warn(`[elder ${reqId}] retriever error: ${e.message}`)
            if (isQuotaError(e)) {
                return { answer: RESTING_REFUSAL, vocabTerms: [], sources: [], refused: true }
            }
            retrieval = { docs: [], retrievalConfidence: 0 }
        }

        if (retrieval.docs.length === 0) {
            const final = composerAgent.handler({
                verdict: 'fail',
                draftAnswer: null,
                vocabTerms: [],
                docs: [],
                citedSourceIndexes: [],
                intent: route.intent,
                language: route.language,
            })
            console.log(`[elder ${reqId}] no-docs refusal ${Date.now() - t0}ms`)
            return final
        }

        // ── 3. Grounder ──
        let draft
        try {
            draft = await grounderAgent.handler({
                question,
                intent: route.intent,
                docs: retrieval.docs,
                apiKey,
            })
            console.log(
                `[elder ${reqId}] grounder draft=${draft.draftAnswer ? 'yes' : 'null'} cited=${draft.citedSourceIndexes.length} vocab=${draft.vocabTerms.length}`
            )
        } catch (e) {
            console.warn(`[elder ${reqId}] grounder error: ${e.message}`)
            if (isQuotaError(e)) {
                return { answer: RESTING_REFUSAL, vocabTerms: [], sources: [], refused: true }
            }
            draft = { draftAnswer: null, citedSourceIndexes: [], vocabTerms: [] }
        }

        if (!draft.draftAnswer) {
            const final = composerAgent.handler({
                verdict: 'fail',
                draftAnswer: null,
                vocabTerms: [],
                docs: retrieval.docs,
                citedSourceIndexes: [],
                intent: route.intent,
                language: route.language,
            })
            console.log(`[elder ${reqId}] grounder-null refusal ${Date.now() - t0}ms`)
            return final
        }

        // ── 4. Validator ──
        // If validator fails (quota or other), conservatively skip it and trust
        // the grounder draft — better than refusing every answer when quota is tight.
        let validation
        try {
            validation = await validatorAgent.handler({
                draftAnswer: draft.draftAnswer,
                vocabTerms: draft.vocabTerms,
                docs: retrieval.docs,
                apiKey,
            })
            console.log(
                `[elder ${reqId}] validator verdict=${validation.verdict} ungroundedClaims=${validation.ungroundedClaims.length} ungroundedVocab=${validation.ungroundedVocab.length}`
            )
        } catch (e) {
            console.warn(`[elder ${reqId}] validator error (skipping): ${e.message}`)
            validation = { verdict: 'pass', ungroundedClaims: [], ungroundedVocab: [] }
        }

        // ── 5. Composer ──
        const final = composerAgent.handler({
            verdict: validation.verdict,
            draftAnswer: draft.draftAnswer,
            vocabTerms: draft.vocabTerms,
            docs: retrieval.docs,
            citedSourceIndexes: draft.citedSourceIndexes,
            intent: route.intent,
            language: route.language,
        })
        console.log(`[elder ${reqId}] composer refused=${final.refused} ${Date.now() - t0}ms`)

        return final
    }
)

// ─── StoryWeaver multi-agent pipeline ───────────────────────────────────────
// Two server-side orchestrators (agenticTranslate + agenticSplitScenes)
// replace the old single-call translateText + splitScenes. The transcribe,
// illustrate, and narrate stages remain as-is; the client orchestrator in
// src/services/storyPipeline.js still chains all stages so it can show
// per-stage progress to the user.

const literalTranslator = require('./agents/story/literalTranslator')
const culturalAnnotator = require('./agents/story/culturalAnnotator')
const backTranslationValidator = require('./agents/story/backTranslationValidator')
const sceneStructure = require('./agents/story/sceneStructure')
const sceneExcerptValidator = require('./agents/story/sceneExcerptValidator')
const imagePromptComposer = require('./agents/story/imagePromptComposer')
const promptSanitizer = require('./agents/story/promptSanitizer')

// agenticTranslate — chains: literal → cultural annotator → back-translation validator
exports.agenticTranslate = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 90 },
    async ({ data }) => {
        const { text, sourceLang = 'indigenous' } = data
        if (!text || typeof text !== 'string') {
            throw new HttpsError('invalid-argument', 'text required (string)')
        }

        const apiKey = GEMINI_KEY.value()
        const reqId = Math.random().toString(36).slice(2, 8)
        const t0 = Date.now()

        // 1. Literal translation (EN + MS, marks low-confidence words)
        let literal
        try {
            literal = await literalTranslator.handler({ text, sourceLang, apiKey })
            const en = literal.translations.find((t) => t.lang === 'en')
            const ms = literal.translations.find((t) => t.lang === 'ms')
            console.log(
                `[story-translate ${reqId}] literal en=${en?.text?.length || 0}ch ms=${ms?.text?.length || 0}ch lowConf=${(en?.lowConfidenceWords?.length || 0) + (ms?.lowConfidenceWords?.length || 0)}`
            )
        } catch (e) {
            console.warn(`[story-translate ${reqId}] literal error: ${e.message}`)
            throw new HttpsError('internal', `Literal translator failed: ${e.message}`)
        }

        const enT = literal.translations.find((t) => t.lang === 'en')
        const msT = literal.translations.find((t) => t.lang === 'ms')
        const englishText = enT?.text || ''
        const malayText = msT?.text || ''

        // 2. Cultural annotator — only runs if there are flagged words
        const candidateWords = [
            ...(enT?.lowConfidenceWords || []),
            ...(msT?.lowConfidenceWords || []),
        ].filter((w, i, a) => a.indexOf(w) === i) // dedupe

        let cultural = { culturalNotes: '', annotatedWords: [] }
        if (candidateWords.length > 0) {
            try {
                cultural = await culturalAnnotator.handler({
                    originalText: text,
                    englishText,
                    candidateWords,
                    apiKey,
                })
                console.log(`[story-translate ${reqId}] cultural notes=${cultural.culturalNotes.length}ch annotated=${cultural.annotatedWords.length}`)
            } catch (e) {
                console.warn(`[story-translate ${reqId}] cultural error (skipping): ${e.message}`)
            }
        } else {
            console.log(`[story-translate ${reqId}] cultural skipped (no candidates)`)
        }

        // 3. Back-translation validator
        let validation = { verdict: 'warn', similarity: 0.5, divergences: [] }
        try {
            validation = await backTranslationValidator.handler({
                originalText: text,
                englishText,
                sourceLang,
                apiKey,
            })
            console.log(`[story-translate ${reqId}] validator verdict=${validation.verdict} similarity=${validation.similarity}`)
        } catch (e) {
            console.warn(`[story-translate ${reqId}] validator error (skipping): ${e.message}`)
        }

        console.log(`[story-translate ${reqId}] complete ${Date.now() - t0}ms`)

        // Return the same shape the old translateText returned, plus warnings.
        return {
            translations: [
                { lang: 'en', text: englishText, culturalNotes: cultural.culturalNotes },
                { lang: 'ms', text: malayText, culturalNotes: cultural.culturalNotes },
            ],
            validation: {
                verdict: validation.verdict,
                similarity: validation.similarity,
                divergences: validation.divergences,
            },
            annotatedWords: cultural.annotatedWords,
        }
    }
)

// agenticSplitScenes — chains: structure → excerpt validator → per-scene (composer + sanitizer)
exports.agenticSplitScenes = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 180 },
    async ({ data }) => {
        const { storyText, englishTranslation = '', malayTranslation = '', language = 'indigenous' } = data
        if (!storyText) {
            throw new HttpsError('invalid-argument', 'storyText required')
        }

        const apiKey = GEMINI_KEY.value()
        const reqId = Math.random().toString(36).slice(2, 8)
        const t0 = Date.now()

        // 1. Scene structure
        let structured
        try {
            structured = await sceneStructure.handler({
                storyText,
                englishText: englishTranslation,
                malayText: malayTranslation,
                apiKey,
            })
            console.log(`[story-split ${reqId}] structure scenes=${structured.scenes.length}`)
        } catch (e) {
            console.warn(`[story-split ${reqId}] structure error: ${e.message}`)
            throw new HttpsError('internal', `Scene structure failed: ${e.message}`)
        }

        // 2. Excerpt validator (deterministic — no LLM)
        const validated = sceneExcerptValidator.handler({
            scenes: structured.scenes,
            originalText: storyText,
            englishText: englishTranslation,
            malayText: malayTranslation,
        })
        console.log(`[story-split ${reqId}] excerpt-validator warnings=${validated.warnings.length}`)

        // 3. Per-scene image prompt composition + sanitisation (parallel)
        const enrichedScenes = await Promise.all(
            validated.scenes.map(async (scene, i) => {
                let composed = { imagePrompt: '' }
                try {
                    composed = await imagePromptComposer.handler({
                        sceneText: scene.text,
                        sceneTranslationEn: scene.translationEn,
                        sceneTitle: scene.sceneTitle,
                        language,
                        apiKey,
                    })
                } catch (e) {
                    console.warn(`[story-split ${reqId}] composer scene${i + 1} error: ${e.message}`)
                }

                const sanitized = promptSanitizer.handler({
                    imagePrompt: composed.imagePrompt,
                    sceneText: scene.text,
                    sceneTranslationEn: scene.translationEn,
                })

                if (sanitized.removedTerms.length > 0) {
                    console.log(`[story-split ${reqId}] scene${i + 1} sanitized: removed=${sanitized.removedTerms.join(',')}`)
                }

                return {
                    sceneNumber: scene.sceneNumber,
                    text: scene.text,
                    translationEn: scene.translationEn,
                    translationMs: scene.translationMs,
                    sceneTitle: scene.sceneTitle,
                    imagePrompt: sanitized.cleanedPrompt || composed.imagePrompt,
                    sanitizerRemovedTerms: sanitized.removedTerms,
                }
            })
        )

        console.log(`[story-split ${reqId}] complete scenes=${enrichedScenes.length} ${Date.now() - t0}ms`)

        return {
            scenes: enrichedScenes,
            warnings: validated.warnings,
        }
    }
)



// ─── Pronunciation Lab multi-agent pipeline ─────────────────────────────────
// Three agents: transcriber (LLM ASR) → phonemeAligner (deterministic
// Levenshtein scoring) → feedbackComposer (LLM, grounded in alignment).
// The score is now reproducible and not invented by an LLM.

const pronTranscriber = require('./agents/pronunciation/transcriber')
const pronAligner = require('./agents/pronunciation/phonemeAligner')
const pronFeedback = require('./agents/pronunciation/feedbackComposer')

exports.orchestrateEvaluation = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 60 },
    async ({ data }) => {
        const { audioBase64, mimeType, referencePhrase, language = 'indigenous' } = data
        if (!audioBase64) throw new HttpsError('invalid-argument', 'audioBase64 required')
        if (!referencePhrase) throw new HttpsError('invalid-argument', 'referencePhrase required')

        const apiKey = GEMINI_KEY.value()
        const reqId = Math.random().toString(36).slice(2, 8)
        const t0 = Date.now()

        // 1. Transcribe (audio → text only, no scoring)
        let asr
        try {
            asr = await pronTranscriber.handler({ audioBase64, mimeType, referencePhrase, apiKey })
            console.log(`[pron ${reqId}] transcriber heard="${asr.transcribed}" silence=${asr.isSilence} offLang=${asr.isOffLanguage} conf=${asr.asrConfidence}`)
        } catch (e) {
            console.warn(`[pron ${reqId}] transcriber error: ${e.message}`)
            throw new HttpsError('internal', `Transcriber failed: ${e.message}`)
        }

        // 2. Align (deterministic — no LLM)
        const align = pronAligner.handler({ transcribed: asr.transcribed, reference: referencePhrase })
        console.log(`[pron ${reqId}] aligner score=${align.score} editDist=${align.editDistance} subs=${align.summary.substitutions} miss="${align.summary.missing}" extra="${align.summary.extra}"`)

        // 3. Compose feedback (LLM, but grounded in score+summary)
        let feedback
        try {
            feedback = await pronFeedback.handler({
                transcribed: asr.transcribed,
                reference: referencePhrase,
                score: align.score,
                summary: align.summary,
                alignment: align.alignment,
                language,
                apiKey,
            })
            console.log(`[pron ${reqId}] composer feedback=${feedback.feedback.length}ch tips=${feedback.tips.length}`)
        } catch (e) {
            console.warn(`[pron ${reqId}] composer error (using fallback): ${e.message}`)
            feedback = {
                feedback: `Heard "${asr.transcribed}" vs target "${referencePhrase}".`,
                tips: ['Listen to the reference again and try to match the rhythm.'],
            }
        }

        console.log(`[pron ${reqId}] complete score=${align.score} ${Date.now() - t0}ms`)

        // Return the SAME shape the old evaluatePronunciation returned, plus
        // alignment data the UI can use to highlight char-level mismatches.
        return {
            score: align.score,
            transcribed: asr.transcribed,
            feedback: feedback.feedback,
            tips: feedback.tips,
            alignment: {
                normalizedReference: align.normalizedReference,
                normalizedTranscribed: align.normalizedTranscribed,
                ops: align.alignment,
                summary: align.summary,
                editDistance: align.editDistance,
            },
            asrConfidence: asr.asrConfidence,
            isSilence: asr.isSilence,
            isOffLanguage: asr.isOffLanguage,
        }
    }
)

// ─── Snap & Learn vision pipeline ───────────────────────────────────────────
// User snaps a photo of a real-world object → vision agent identifies it →
// vocab agent translates to the target Orang Asli language. Both agents fail
// closed: low-confidence results become refusals rather than fabrications.

const visionIdentifier = require('./agents/vision/visionIdentifier')
const vocabTranslator = require('./agents/vision/vocabTranslator')

exports.orchestrateVisionLookup = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 45 },
    async ({ data }) => {
        const { imageBase64, mimeType, language = 'semai' } = data
        if (!imageBase64) throw new HttpsError('invalid-argument', 'imageBase64 required')

        const apiKey = GEMINI_KEY.value()
        const reqId = Math.random().toString(36).slice(2, 8)
        const t0 = Date.now()

        // 1. Vision identification
        let vision
        try {
            vision = await visionIdentifier.handler({ imageBase64, mimeType, apiKey })
            console.log(
                `[vision ${reqId}] identifier name="${vision.englishName}" conf=${vision.confidence} reason="${(vision.reason || '').slice(0, 80)}"`
            )
        } catch (e) {
            console.warn(`[vision ${reqId}] identifier error: ${e.message}`)
            return {
                refused: true,
                reason: 'vision_failed',
                message: 'I had trouble looking at that image. Please try again with better lighting.',
                englishName: null,
                indigenousWord: null,
            }
        }

        if (!vision.englishName) {
            console.log(`[vision ${reqId}] no-object refusal ${Date.now() - t0}ms`)
            return {
                refused: true,
                reason: 'no_object',
                message:
                    "I couldn't identify a single clear object in that photo. Try framing one item up close, with good lighting and a plain background.",
                englishName: null,
                indigenousWord: null,
                hint: vision.reason,
            }
        }

        // 2. Vocabulary translation
        let vocab
        try {
            vocab = await vocabTranslator.handler({ englishName: vision.englishName, language, apiKey })
            console.log(
                `[vision ${reqId}] vocab word="${vocab.indigenousWord}" pron="${vocab.pronunciation}" conf=${vocab.confidence}`
            )
        } catch (e) {
            console.warn(`[vision ${reqId}] vocab error: ${e.message}`)
            vocab = { indigenousWord: null, pronunciation: null, culturalNote: '', confidence: 0 }
        }

        // 3. Compose final response
        if (!vocab.indigenousWord) {
            console.log(`[vision ${reqId}] no-translation refusal ${Date.now() - t0}ms`)
            return {
                refused: true,
                reason: 'no_translation',
                message: `I see a ${vision.englishName}, but I don't have a confident ${language} translation in my knowledge. An elder from the community could help us learn this word.`,
                englishName: vision.englishName,
                indigenousWord: null,
                language,
            }
        }

        console.log(`[vision ${reqId}] complete word="${vocab.indigenousWord}" ${Date.now() - t0}ms`)

        const verified = vocab.source === 'verified'
        return {
            refused: false,
            englishName: vision.englishName,
            indigenousWord: vocab.indigenousWord,
            pronunciation: vocab.pronunciation,
            culturalNote: vocab.culturalNote,
            confidence: vocab.confidence,
            language,
            source: vocab.source,                 // 'verified' | 'ai_suggested'
            matchedEnglish: vocab.matchedEnglish, // dictionary key matched (may differ from englishName for compound nouns)
            // Stronger disclaimer when the answer came from the LLM rather than
            // the curated dictionary.
            disclaimer: verified
                ? 'Verified word from the EchoRoots cultural archive.'
                : 'AI-suggested translation — please verify with a native speaker.',
        }
    }
)

