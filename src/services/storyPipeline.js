import { transcribeAudio, agenticTranslate, agenticSplitScenes, generateIllustration } from './gemini'
import { textToSpeech } from './elevenlabs'

/**
 * Orchestrates the full StoryWeaver pipeline.
 * Calls onProgress(stage, data) at each step so the UI can update.
 *
 * Stages: 'transcribing' → 'translating' → 'splitting' → 'illustrating' → 'narrating' → 'assembling' → 'complete'
 *
 * Translate + split stages now use server-side multi-agent orchestrators
 * (agenticTranslate, agenticSplitScenes) which surface validation results
 * via the `validation` and `splitWarnings` fields on the final result.
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

        // ── Stage 2: Translation (agentic: literal → cultural → back-translation validator) ──
        onProgress('translating', { progress: 25 })
        const translateResult = await agenticTranslate(
            transcription.transcription,
            transcription.language
        )
        const { translations, validation: translationValidation, annotatedWords } = translateResult
        onProgress('translating', {
            progress: 35,
            translations,
            validation: translationValidation,
            annotatedWords,
        })

        const englishTranslation = translations.find((t) => t.lang === 'en')?.text || translations[0]?.text || ''
        const malayTranslation = translations.find((t) => t.lang === 'ms')?.text || ''

        // ── Stage 3: Scene Splitting (agentic: structure → excerpt validator → composer → sanitizer) ──
        onProgress('splitting', { progress: 40 })
        const splitResult = await agenticSplitScenes(
            transcription.transcription,
            englishTranslation,
            malayTranslation,
            transcription.language
        )
        const rawScenes = splitResult.scenes
        const splitWarnings = splitResult.warnings || []
        onProgress('splitting', {
            progress: 50,
            sceneCount: rawScenes.length,
            warnings: splitWarnings,
        })

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

            // Match any per-scene split warning emitted by sceneExcerptValidator,
            // e.g. "Scene 2 text not found in source ...".
            const sceneIdx = i + 1
            const sceneRepairWarning = splitWarnings.find((w) => w.startsWith(`Scene ${sceneIdx} `)) || null

            narratedScenes.push({
                sceneNumber: scene.sceneNumber || sceneIdx,
                sceneTitle: scene.sceneTitle || `Scene ${sceneIdx}`,
                originalText: scene.text,
                translationEn: sceneTranslationEn,
                translationMs: sceneTranslationMs,
                imageBase64: scene.imageBase64,
                imageMimeType: scene.imageMimeType,
                audioBlob: audioData.audioBlob,
                audioUrl: audioData.audioUrl,
                culturalNote: translations.find((t) => t.lang === 'en')?.culturalNotes || '',
                sanitizerRemovedTerms: scene.sanitizerRemovedTerms || [],
                repairWarning: sceneRepairWarning,
            })
        }

        // ── Stage 6: Assembly ──
        onProgress('assembling', { progress: 92 })

        const result = {
            transcription: transcription.transcription,
            language: transcription.language,
            translations,
            scenes: narratedScenes,
            // Surface multi-agent validation results so the UI can flag
            // low-fidelity translations or scene-split warnings.
            validation: {
                translation: translationValidation || null,
                annotatedWords: annotatedWords || [],
                splitWarnings,
            },
            metadata: {
                language: transcription.language,
                duration: (Date.now() - startTime) / 1000,
                createdAt: new Date(),
                sceneCount: narratedScenes.length,
            },
        }

        // ── Complete ──
        // Spread the key fields so consumers reading `pipeline.scenes` /
        // `pipeline.validation` / etc. via Zustand pick them up directly
        // without having to dig into `pipeline.result`.
        onProgress('complete', {
            progress: 100,
            result,
            scenes: result.scenes,
            transcription: result.transcription,
            language: result.language,
            translations: result.translations,
            validation: result.validation,
        })
        return result
    } catch (error) {
        onProgress('error', { error: error.message })
        throw error
    }
}
