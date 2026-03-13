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
 * Tries to pick a female voice; raises pitch if none found.
 */
function fallbackTTS(text) {
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.88
        utterance.lang = 'en-US'

        const applyVoice = () => {
            const voices = speechSynthesis.getVoices()
            // Prefer voices with 'female' in name, or common female voice names
            const femaleKeywords = ['female', 'woman', 'girl', 'zira', 'hazel', 'susan', 'samantha', 'victoria', 'karen', 'moira', 'fiona', 'sara', 'heera']
            const femaleVoice = voices.find(v =>
                femaleKeywords.some(k => v.name.toLowerCase().includes(k)) && v.lang.startsWith('en')
            ) || voices.find(v => v.lang.startsWith('en') && v.name.includes('Female'))
              || voices.find(v => v.lang.startsWith('en'))

            if (femaleVoice) {
                utterance.voice = femaleVoice
                utterance.pitch = 1.1
            } else {
                // No female voice found — raise pitch to sound more feminine
                utterance.pitch = 1.3
            }

            speechSynthesis.speak(utterance)
        }

        const voices = speechSynthesis.getVoices()
        if (voices.length > 0) {
            applyVoice()
        } else {
            // Voices not yet loaded — wait for them
            speechSynthesis.onvoiceschanged = () => applyVoice()
        }

        utterance.onend = () => resolve({ audioBlob: null, audioUrl: null, fallback: true })
        utterance.onerror = () => resolve({ audioBlob: null, audioUrl: null, fallback: true, error: 'Speech synthesis failed' })
    })
}

