const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY
const VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'

const BASE_URL = 'https://api.elevenlabs.io/v1'

// Latches to true after the first 401 — avoids hammering an invalid/expired key
// on every scene in the StoryWeaver pipeline (3-5 scenes × 2 retries = many wasted calls).
let keyInvalid = false

/**
 * REST-based TTS for scene narration / general speech.
 * Returns audio as a Blob and an object URL.
 */
export async function textToSpeech(text, voiceId = VOICE_ID) {
    // Skip immediately if key already confirmed invalid this session
    if (keyInvalid || !API_KEY) return fallbackTTS(text)

    try {
        const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                Accept: 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': API_KEY,
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.6, similarity_boost: 0.75 },
            }),
        })

        if (response.status === 401) {
            keyInvalid = true
            console.warn('[ElevenLabs] API key invalid or expired — switching to browser TTS for this session')
            return fallbackTTS(text)
        }
        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`)
        }

        const audioBlob = new Blob([await response.arrayBuffer()], { type: 'audio/mpeg' })
        const audioUrl = URL.createObjectURL(audioBlob)
        return { audioBlob, audioUrl }
    } catch (error) {
        console.warn('ElevenLabs TTS failed, using browser fallback:', error.message)
        return fallbackTTS(text)
    }
}

/**
 * Initialize a WebSocket connection for streaming TTS to TalkingHead.
 * Returns a WebSocket that sends audio chunks + word timestamps in real-time.
 */
export function initWebSocket(voiceId = VOICE_ID) {
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_multilingual_v2`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
        // Send initial configuration
        ws.send(
            JSON.stringify({
                text: ' ',
                voice_settings: {
                    stability: 0.6,
                    similarity_boost: 0.75,
                },
                xi_api_key: API_KEY,
            })
        )
    }

    return ws
}

/**
 * Send text through a WebSocket for streaming TTS.
 */
export function streamText(ws, text) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(
            JSON.stringify({
                text: text,
                try_trigger_generation: true,
            })
        )
    }
}

/**
 * Close WebSocket stream.
 */
export function closeStream(ws) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ text: '' }))
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

        // Create an audio recording of the speech synthesis isn't trivial
        // Instead, we'll return a silent blob and let the browser speak
        speechSynthesis.speak(utterance)

        utterance.onend = () => {
            resolve({
                audioBlob: null,
                audioUrl: null,
                fallback: true,
            })
        }

        utterance.onerror = () => {
            resolve({
                audioBlob: null,
                audioUrl: null,
                fallback: true,
                error: 'Speech synthesis failed',
            })
        }
    })
}
