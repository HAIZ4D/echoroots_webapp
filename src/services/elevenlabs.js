import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

const VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'

// Latches true after first 401 — avoids repeated failed calls this session
let keyInvalid = false

/**
 * REST-based TTS for scene narration.
 * Calls Cloud Function which keeps the ElevenLabs key hidden server-side.
 * Returns { audioBlob, audioUrl } or fallback object.
 */
export async function textToSpeech(text, voiceId = VOICE_ID) {
    if (keyInvalid) return fallbackTTS(text)

    try {
        const fn = httpsCallable(functions, 'textToSpeech', { timeout: 30000 })
        const { data } = await fn({ text, voiceId })

        if (data.keyInvalid) {
            keyInvalid = true
            console.warn('[ElevenLabs] API key invalid — switching to browser TTS for this session')
            return fallbackTTS(text)
        }

        if (!data.audioBase64) return fallbackTTS(text)

        // Convert base64 → Blob → Object URL
        const bytes = Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' })
        const audioUrl = URL.createObjectURL(audioBlob)
        return { audioBlob, audioUrl }
    } catch (error) {
        console.warn('[ElevenLabs] TTS failed, using browser fallback:', error.message)
        return fallbackTTS(text)
    }
}

/**
 * Browser SpeechSynthesis fallback when ElevenLabs is unavailable.
 */
function fallbackTTS(text) {
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.pitch = 0.8

        speechSynthesis.speak(utterance)

        utterance.onend = () => resolve({ audioBlob: null, audioUrl: null, fallback: true })
        utterance.onerror = () => resolve({ audioBlob: null, audioUrl: null, fallback: true, error: 'Speech synthesis failed' })
    })
}
