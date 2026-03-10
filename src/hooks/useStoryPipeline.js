import { useCallback } from 'react'
import useAppStore from '../stores/appStore'
import { processStory } from '../services/storyPipeline'
import { saveStoryToFirestore } from '../services/storyService'

export default function useStoryPipeline() {
    const { pipeline, setPipelineStage, setPipelineProgress, resetPipeline, addSavedStory } =
        useAppStore()

    const runPipeline = useCallback(
        async (audioBlob) => {
            try {
                const result = await processStory(audioBlob, (stage, data) => {
                    setPipelineStage(stage, data)
                    if (data?.progress) setPipelineProgress(data.progress)
                })

                const storyId = crypto.randomUUID()
                const story = {
                    id: storyId,
                    title: result.transcription?.substring(0, 50) + '...',
                    transcription: result.transcription,
                    language: result.language,
                    translations: result.translations,
                    scenes: result.scenes,
                    sceneCount: result.scenes?.length || 0,
                    metadata: result.metadata,
                    createdAt: new Date().toISOString(),
                }

                // Save locally (immediate)
                addSavedStory(story)

                // Save to Firestore (non-blocking — won't block or fail the UI)
                saveStoryToFirestore(story, storyId).catch(e =>
                    console.warn('[Pipeline] Firestore save failed:', e.message)
                )

                return result
            } catch (error) {
                setPipelineStage('error', { error: error.message })
                throw error
            }
        },
        [setPipelineStage, setPipelineProgress, addSavedStory]
    )

    return {
        pipeline,
        runPipeline,
        resetPipeline,
        isProcessing: !['idle', 'complete', 'error'].includes(pipeline.stage),
    }
}
