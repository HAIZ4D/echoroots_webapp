import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

/**
 * Transcribe audio blob using Gemini multimodal — via Cloud Function.
 */
export async function transcribeAudio(audioBlob) {
    const audioBase64 = await blobToBase64(audioBlob)
    const mimeType = audioBlob.type || 'audio/webm'
    const fn = httpsCallable(functions, 'transcribeAudio', { timeout: 60000 })
    const { data } = await fn({ audioBase64, mimeType })
    return data
}

/**
 * Translate text from source language to English and Malay — via Cloud Function.
 */
export async function translateText(text, sourceLang = 'indigenous') {
    const fn = httpsCallable(functions, 'translateText', { timeout: 30000 })
    const { data } = await fn({ text, sourceLang })
    return data
}

/**
 * Split a story into illustrated scenes — via Cloud Function.
 */
export async function splitIntoScenes(storyText, englishTranslation, malayTranslation) {
    const fn = httpsCallable(functions, 'splitScenes', { timeout: 60000 })
    const { data } = await fn({ storyText, englishTranslation, malayTranslation })
    return data
}

/**
 * Generate an illustration for a story scene — via Cloud Function.
 */
export async function generateIllustration(prompt) {
    const fn = httpsCallable(functions, 'generateIllustration', { timeout: 120000 })
    const { data } = await fn({ prompt })
    return data
}

/**
 * Generate a vector embedding for RAG retrieval.
 * Embedding API has no quota on the free key — always throws,
 * triggering the keyword-search fallback in rag.js.
 */
export async function generateEmbedding() {
    throw new Error('Embedding not available on this key — using keyword search fallback')
}

/**
 * Translate a vocabulary/translation question — via Cloud Function.
 */
export async function translateVocabulary(question) {
    const fn = httpsCallable(functions, 'translateVocabulary', { timeout: 30000 })
    const { data } = await fn({ question })
    return data
}

/**
 * Generate a RAG-grounded response — via Cloud Function.
 */
export async function generateRAGResponse(question, contextDocs) {
    const fn = httpsCallable(functions, 'generateRAGResponse', { timeout: 30000 })
    const { data } = await fn({ question, contextDocs })
    return data
}

/**
 * Evaluate user pronunciation against a reference phrase — via Cloud Function.
 */
export async function evaluatePronunciation(userAudioBlob, referencePhrase) {
    const audioBase64 = await blobToBase64(userAudioBlob)
    const mimeType = userAudioBlob.type || 'audio/webm'
    const fn = httpsCallable(functions, 'evaluatePronunciation', { timeout: 60000 })
    const { data } = await fn({ audioBase64, mimeType, referencePhrase })
    return data
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
