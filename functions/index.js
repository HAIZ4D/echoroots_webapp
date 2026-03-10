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
const EL_KEY = defineSecret('ELEVENLABS_API_KEY')

const REGION = 'us-central1'
const EL_VOICE_DEFAULT = 'pNInz6obpgDQGcFmaJgB'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getModel(apiKey) {
    return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-2.0-flash' })
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

exports.splitScenes = onCall(
    { secrets: [GEMINI_KEY], region: REGION, timeoutSeconds: 60 },
    async ({ data }) => {
        const { storyText, englishTranslation, malayTranslation } = data
        if (!storyText) throw new HttpsError('invalid-argument', 'storyText required')

        const model = getModel(GEMINI_KEY.value())
        const result = await model.generateContent(
            `You are an editor for an indigenous cultural storybook. Your job is to faithfully represent the speaker's actual words — do NOT add content, characters, events, or details that are not in the original.

RULES:
- Use ONLY the content present in the original story text. Do not invent or expand.
- Split the story into scenes proportional to its length: short story (1–2 sentences) → 1–2 scenes; medium (3–6 sentences) → 2–3 scenes; long (7+ sentences) → up to 5 scenes.
- Each scene's "text" must be a direct excerpt from the original, not a rewrite.
- Each scene's "translationEn" must be the corresponding excerpt from the English translation.
- Each scene's "translationMs" must be the corresponding excerpt from the Bahasa Melayu translation.
- The image prompt must describe only what is explicitly in that scene's text.

Original story: "${storyText}"
English translation: "${englishTranslation}"
Bahasa Melayu translation: "${malayTranslation}"

Respond in this exact JSON format:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "exact excerpt from original language for this scene",
      "translationEn": "corresponding excerpt from English translation",
      "translationMs": "corresponding excerpt from Bahasa Melayu translation",
      "imagePrompt": "Visual description of only what this scene describes. Style: warm watercolor digital art, Southeast Asian Borneo rainforest, culturally respectful depiction of indigenous Orang Asli life, rich greens and earth tones. No text in the image."
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

        // Provider 1: Gemini 2.0 Flash Image Generation (free tier)
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: safePrompt }] }],
                        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
                    }),
                }
            )
            if (res.ok) {
                const resData = await res.json()
                const imgPart = resData.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data)
                if (imgPart) {
                    console.log('[Illustration] Gemini 2.0 Flash Image Generation succeeded')
                    return { imageBase64: imgPart.inlineData.data, mimeType: imgPart.inlineData.mimeType || 'image/png' }
                }
            }
            const err = await res.text().catch(() => res.status)
            console.warn('[Illustration] Provider 1 failed:', typeof err === 'string' ? err.slice(0, 120) : err)
        } catch (e) {
            console.warn('[Illustration] Provider 1 error:', e.message)
        }

        // Provider 2: Imagen 4 Fast
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
            console.warn('[Illustration] Provider 2 failed:', typeof err === 'string' ? err.slice(0, 120) : err)
        } catch (e) {
            console.warn('[Illustration] Provider 2 error:', e.message)
        }

        // Provider 3: Imagen 4 Full
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
            console.warn('[Illustration] Provider 3 failed:', typeof err === 'string' ? err.slice(0, 120) : err)
        } catch (e) {
            console.warn('[Illustration] Provider 3 error:', e.message)
        }

        console.warn('[Illustration] All providers failed — returning placeholder')
        return { imageBase64: null, mimeType: 'image/png', error: 'All providers failed' }
    }
)

// ─── 5. evaluatePronunciation ────────────────────────────────────────────────

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

exports.textToSpeech = onCall(
    { secrets: [EL_KEY], region: REGION, timeoutSeconds: 30 },
    async ({ data }) => {
        const { text, voiceId = EL_VOICE_DEFAULT } = data
        if (!text) throw new HttpsError('invalid-argument', 'text required')

        const apiKey = EL_KEY.value()
        if (!apiKey) return { audioBase64: null, fallback: true }

        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                Accept: 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.6, similarity_boost: 0.75 },
            }),
        })

        if (res.status === 401) {
            console.warn('[ElevenLabs] API key invalid or expired')
            return { audioBase64: null, fallback: true, keyInvalid: true }
        }
        if (!res.ok) {
            console.warn('[ElevenLabs] textToSpeech error:', res.status)
            return { audioBase64: null, fallback: true }
        }

        const buffer = await res.arrayBuffer()
        const audioBase64 = Buffer.from(buffer).toString('base64')
        return { audioBase64, mimeType: 'audio/mpeg' }
    }
)

// ─── 9. speakWithTimestamps (avatar lip-sync) ────────────────────────────────

exports.speakWithTimestamps = onCall(
    { secrets: [EL_KEY], region: REGION, timeoutSeconds: 30 },
    async ({ data }) => {
        const { text, voiceId = EL_VOICE_DEFAULT } = data
        if (!text) throw new HttpsError('invalid-argument', 'text required')

        const apiKey = EL_KEY.value()
        if (!apiKey) return { audioBase64: null, fallback: true }

        const res = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
            {
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
                }),
            }
        )

        if (res.status === 401) {
            console.warn('[ElevenLabs] speakWithTimestamps key invalid')
            return { audioBase64: null, fallback: true, keyInvalid: true }
        }
        if (!res.ok) {
            console.warn('[ElevenLabs] speakWithTimestamps error:', res.status)
            return { audioBase64: null, fallback: true }
        }

        const result = await res.json()
        return {
            audioBase64: result.audio_base64,
            alignment: result.alignment,
        }
    }
)
