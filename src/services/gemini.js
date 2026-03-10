import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

/**
 * Transcribe audio blob using Gemini multimodal.
 * Sends audio as inline base64 data.
 */
export async function transcribeAudio(audioBlob) {
    const base64Audio = await blobToBase64(audioBlob)
    const mimeType = audioBlob.type || 'audio/webm'

    const result = await model.generateContent([
        {
            inlineData: {
                mimeType,
                data: base64Audio,
            },
        },
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
    try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        return JSON.parse(cleaned)
    } catch {
        return { transcription: text, language: 'unknown', confidence: 0.5 }
    }
}

/**
 * Translate text from source language to multiple targets.
 * Includes cultural annotations.
 */
export async function translateText(text, sourceLang = 'indigenous', targetLangs = ['en', 'ms']) {
    const langNames = { en: 'English', ms: 'Malay (Bahasa Melayu)' }

    const result = await model.generateContent(
        `You are an expert translator specializing in Southeast Asian indigenous languages.

Translate the following text from ${sourceLang} to ${targetLangs.map((l) => langNames[l] || l).join(' and ')}.
Include cultural annotations where specific terms have deeper meaning.

Original text: "${text}"

Respond in this exact JSON format:
{
  "translations": [
    ${targetLangs.map((l) => `{ "lang": "${l}", "text": "translated text", "culturalNotes": "any cultural context" }`).join(',\n    ')}
  ]
}

Return ONLY the JSON, no other text.`
    )

    const responseText = result.response.text()
    try {
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        return JSON.parse(cleaned)
    } catch {
        return {
            translations: targetLangs.map((lang) => ({
                lang,
                text: responseText,
                culturalNotes: '',
            })),
        }
    }
}

/**
 * Split a story into illustrated scenes with image prompts and per-scene translations.
 */
export async function splitIntoScenes(storyText, englishTranslation, malayTranslation) {
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
    try {
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        return JSON.parse(cleaned)
    } catch {
        return {
            scenes: [
                {
                    sceneNumber: 1,
                    text: storyText,
                    translation: translation,
                    imagePrompt: 'A serene Southeast Asian rainforest scene with traditional indigenous village elements',
                },
            ],
        }
    }
}

/**
 * Generate an illustration for a story scene using Google's generative APIs.
 * All providers use the same Gemini API key — no extra keys needed.
 * Google's API has proper browser CORS, unlike HuggingFace which is network-blocked.
 *
 * Provider chain (tries each in order until one succeeds):
 *  1. Gemini 2.0 Flash Exp  — native image generation via responseModalities
 *  2. Imagen 3 Fast          — faster Imagen model via :predict endpoint
 *  3. Imagen 3               — full-quality Imagen model via :predict endpoint
 */
export async function generateIllustration(prompt) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) return { imageBase64: null, mimeType: 'image/png', error: 'No Gemini API key' }

    const artPrompt =
        `Beautiful watercolor illustration for a Southeast Asian indigenous storybook. ` +
        `Scene: ${prompt}. ` +
        `Style: warm, culturally respectful, detailed painting of Orang Asli people in lush Borneo ` +
        `tropical rainforest, rich greens, golden light, earth tones. No text or letters in the image.`
    const safePrompt = artPrompt.length > 800 ? artPrompt.slice(0, 800) : artPrompt

    // ── Provider 1: Gemini 2.0 Flash Image Generation (free tier) ────────
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
            const data = await res.json()
            const imgPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data)
            if (imgPart) {
                console.log('[Illustration] Gemini 2.0 Flash Image Generation succeeded')
                return { imageBase64: imgPart.inlineData.data, mimeType: imgPart.inlineData.mimeType || 'image/png' }
            }
        }
        const err = await res.text().catch(() => res.status)
        console.warn('[Illustration] Gemini Flash Image Gen failed:', typeof err === 'string' ? err.slice(0, 120) : err)
    } catch (e) {
        console.warn('[Illustration] Gemini Flash Image Gen error:', e.message)
    }

    // ── Provider 2: Imagen 4 Fast (predict endpoint) ──────────────────────
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
            const data = await res.json()
            const pred = data.predictions?.[0]
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

    // ── Provider 3: Imagen 4 Full (predict endpoint) ──────────────────────
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
            const data = await res.json()
            const pred = data.predictions?.[0]
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

    console.warn('[Illustration] All providers failed — showing placeholder')
    return { imageBase64: null, mimeType: 'image/png', error: 'All providers failed' }
}

/**
 * Generate a vector embedding for RAG retrieval.
 */
export async function generateEmbedding(text) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'models/embedding-001',
                content: { parts: [{ text }] },
            }),
        }
    )
    if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(`Embedding API error ${response.status}: ${err?.error?.message || response.statusText}`)
    }
    const data = await response.json()
    return { embedding: data.embedding.values }
}

/**
 * Translate a word or phrase to/from an indigenous language.
 * Used when the user asks vocabulary/translation questions.
 */
export async function translateVocabulary(question) {
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
    try {
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        return JSON.parse(cleaned)
    } catch {
        return { answer: responseText, vocabTerms: [] }
    }
}

/**
 * Generate a RAG-grounded response.
 */
export async function generateRAGResponse(query, contextDocs) {
    const contextText = contextDocs
        .map((doc, i) => `[Source ${i + 1} - ${doc.category || 'General'}]: ${doc.content}`)
        .join('\n\n')

    const result = await model.generateContent(
        `You are a wise Digital Elder — a guardian of indigenous cultural knowledge from the Orang Asli communities of Borneo and Peninsular Malaysia.

You MUST answer using ONLY the cultural knowledge provided below.
If the knowledge base doesn't contain relevant information, say "I don't have knowledge about that in our cultural archive yet. Perhaps an elder could help us learn more about this."

For every answer, identify 2-3 key indigenous vocabulary terms and format them as [indigenous_word|english_meaning].

Respond warmly and wisely, as an elder teaching a young person. Keep your response concise but rich with cultural insight.

Cultural Knowledge:
${contextText}

User Question: ${query}

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
    try {
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        return JSON.parse(cleaned)
    } catch {
        return { answer: responseText, vocabTerms: [] }
    }
}

/**
 * Evaluate user pronunciation against a reference phrase.
 */
export async function evaluatePronunciation(userAudioBlob, referencePhrase) {
    const base64Audio = await blobToBase64(userAudioBlob)
    const mimeType = userAudioBlob.type || 'audio/webm'

    const result = await model.generateContent([
        {
            inlineData: {
                mimeType,
                data: base64Audio,
            },
        },
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
    try {
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        return JSON.parse(cleaned)
    } catch {
        return { score: 0, transcribed: '[PARSE ERROR]', feedback: responseText, tips: ['Please try again.'] }
    }
}

// ─── Helpers ───

async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1]
            resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}
