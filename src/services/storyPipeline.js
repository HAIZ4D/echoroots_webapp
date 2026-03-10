import { transcribeAudio, translateText, splitIntoScenes, generateIllustration } from './gemini'
import { textToSpeech } from './elevenlabs'

/**
 * Orchestrates the full StoryWeaver pipeline.
 * Calls onProgress(stage, data) at each step so the UI can update.
 *
 * Stages: 'transcribing' → 'translating' → 'splitting' → 'illustrating' → 'narrating' → 'assembling' → 'complete'
 */
export async function processStory(audioBlob, onProgress = () => { }) {
    const startTime = Date.now()

    try {
        // ── Stage 1: Transcription ──
        onProgress('transcribing', { progress: 10 })
        const transcription = await transcribeAudio(audioBlob)

        // Guard: reject silence or near-empty transcriptions
        const rawText = (transcription.transcription || '').trim()
        if (!rawText || rawText === '[SILENCE]' || rawText.length < 8) {
            throw new Error('No speech detected in the recording. Please speak clearly and record at least one sentence.')
        }

        onProgress('transcribing', {
            progress: 20,
            transcription: transcription.transcription,
            language: transcription.language,
        })

        // ── Stage 2: Translation ──
        onProgress('translating', { progress: 25 })
        const { translations } = await translateText(
            transcription.transcription,
            transcription.language,
            ['en', 'ms']
        )
        onProgress('translating', { progress: 35, translations })

        const englishTranslation = translations.find((t) => t.lang === 'en')?.text || translations[0]?.text || ''
        const malayTranslation = translations.find((t) => t.lang === 'ms')?.text || ''

        // ── Stage 3: Scene Splitting ──
        onProgress('splitting', { progress: 40 })
        const { scenes: rawScenes } = await splitIntoScenes(transcription.transcription, englishTranslation, malayTranslation)
        onProgress('splitting', { progress: 50, sceneCount: rawScenes.length })

        // ── Stage 4: Illustration Generation ──
        onProgress('illustrating', { progress: 55 })
        const illustratedScenes = []

        for (let i = 0; i < rawScenes.length; i++) {
            const scene = rawScenes[i]
            onProgress('illustrating', {
                progress: 55 + Math.round((i / rawScenes.length) * 20),
                currentScene: i + 1,
                totalScenes: rawScenes.length,
            })

            let imageData = { imageBase64: null, mimeType: 'image/png' }
            try {
                imageData = await generateIllustration(scene.imagePrompt)
            } catch (error) {
                console.warn(`Illustration failed for scene ${i + 1}:`, error.message)
            }

            illustratedScenes.push({
                ...scene,
                imageBase64: imageData.imageBase64,
                imageMimeType: imageData.mimeType,
            })
        }

        // ── Stage 5: Narration (TTS) ──
        onProgress('narrating', { progress: 78 })
        const narratedScenes = []

        for (let i = 0; i < illustratedScenes.length; i++) {
            const scene = illustratedScenes[i]
            onProgress('narrating', {
                progress: 78 + Math.round((i / illustratedScenes.length) * 12),
                currentScene: i + 1,
            })

            // Use per-scene English translation for narration
            const sceneTranslationEn = scene.translationEn || englishTranslation
            const sceneTranslationMs = scene.translationMs || malayTranslation

            let audioData = { audioBlob: null, audioUrl: null }
            try {
                audioData = await textToSpeech(sceneTranslationEn)
            } catch (error) {
                console.warn(`Narration failed for scene ${i + 1}:`, error.message)
            }

            narratedScenes.push({
                sceneNumber: scene.sceneNumber || i + 1,
                originalText: scene.text,
                translationEn: sceneTranslationEn,
                translationMs: sceneTranslationMs,
                imageBase64: scene.imageBase64,
                imageMimeType: scene.imageMimeType,
                audioBlob: audioData.audioBlob,
                audioUrl: audioData.audioUrl,
                culturalNote: translations.find((t) => t.lang === 'en')?.culturalNotes || '',
            })
        }

        // ── Stage 6: Assembly ──
        onProgress('assembling', { progress: 92 })

        const result = {
            transcription: transcription.transcription,
            language: transcription.language,
            translations,
            scenes: narratedScenes,
            metadata: {
                language: transcription.language,
                duration: (Date.now() - startTime) / 1000,
                createdAt: new Date(),
                sceneCount: narratedScenes.length,
            },
        }

        // ── Complete ──
        onProgress('complete', { progress: 100, result })
        return result
    } catch (error) {
        onProgress('error', { error: error.message })
        throw error
    }
}
