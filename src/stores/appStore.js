import { create } from 'zustand'

const useAppStore = create((set) => ({
    // ─── Session ───
    sessionId: crypto.randomUUID(),

    // ─── StoryWeaver Pipeline ───
    pipeline: {
        stage: 'idle', // idle | recording | transcribing | translating | splitting | illustrating | narrating | assembling | complete | error
        progress: 0,
        transcription: null,
        translations: [],
        scenes: [],
        error: null,
    },
    setPipelineStage: (stage, data = {}) =>
        set((s) => ({
            pipeline: { ...s.pipeline, stage, ...data },
        })),
    setPipelineProgress: (progress) =>
        set((s) => ({
            pipeline: { ...s.pipeline, progress },
        })),
    resetPipeline: () =>
        set({
            pipeline: {
                stage: 'idle',
                progress: 0,
                transcription: null,
                translations: [],
                scenes: [],
                error: null,
            },
        }),

    // ─── Digital Elder Chat ───
    chatMessages: [],
    addChatMessage: (msg) =>
        set((s) => ({
            chatMessages: [...s.chatMessages, { ...msg, timestamp: Date.now() }],
        })),
    clearChat: () => set({ chatMessages: [] }),

    // ─── Avatar ───
    avatarReady: false,
    avatarSpeaking: false,
    setAvatarReady: (ready) => set({ avatarReady: ready }),
    setAvatarSpeaking: (speaking) => set({ avatarSpeaking: speaking }),

    // ─── Story Archive ───
    savedStories: [],
    addSavedStory: (story) =>
        set((s) => ({
            savedStories: [story, ...s.savedStories],
        })),

    // ─── Pronunciation Lab ───
    pronunciationProgress: {
        wordsAttempted: 0,
        wordsCorrect: 0,
        streak: 0,
        history: [],
    },
    updatePronunciationProgress: (result) =>
        set((s) => {
            const passed = result.score >= 70
            return {
                pronunciationProgress: {
                    wordsAttempted: s.pronunciationProgress.wordsAttempted + 1,
                    wordsCorrect: s.pronunciationProgress.wordsCorrect + (passed ? 1 : 0),
                    streak: passed ? s.pronunciationProgress.streak + 1 : 0,
                    history: [...s.pronunciationProgress.history, result],
                },
            }
        }),

    // ─── UI State ───
    isLoading: false,
    setLoading: (loading) => set({ isLoading: loading }),
}))

export default useAppStore
