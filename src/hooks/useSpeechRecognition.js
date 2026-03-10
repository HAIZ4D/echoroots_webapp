import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Custom hook for Web Speech API (speech-to-text).
 * Used as an alternative input for chat — voice typing.
 */
export default function useSpeechRecognition({ lang = 'en-US', continuous = false } = {}) {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [error, setError] = useState(null)
    const [isSupported, setIsSupported] = useState(false)

    const recognitionRef = useRef(null)

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        setIsSupported(!!SpeechRecognition)

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition()
            recognition.continuous = continuous
            recognition.interimResults = true
            recognition.lang = lang

            recognition.onresult = (event) => {
                let finalTranscript = ''
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    finalTranscript += event.results[i][0].transcript
                }
                setTranscript(finalTranscript)
            }

            recognition.onerror = (event) => {
                setError(event.error)
                setIsListening(false)
            }

            recognition.onend = () => {
                setIsListening(false)
            }

            recognitionRef.current = recognition
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort()
            }
        }
    }, [lang, continuous])

    const startListening = useCallback(() => {
        if (recognitionRef.current) {
            setError(null)
            setTranscript('')
            recognitionRef.current.start()
            setIsListening(true)
        }
    }, [])

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
            setIsListening(false)
        }
    }, [])

    return {
        isListening,
        transcript,
        error,
        isSupported,
        startListening,
        stopListening,
    }
}
