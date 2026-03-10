import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Custom hook for audio recording with waveform visualization data.
 * Uses MediaRecorder API + Web Audio API AnalyserNode.
 */
export default function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false)
    const [audioBlob, setAudioBlob] = useState(null)
    const [audioUrl, setAudioUrl] = useState(null)
    const [duration, setDuration] = useState(0)
    const [waveformData, setWaveformData] = useState(new Uint8Array(0))
    const [error, setError] = useState(null)

    const mediaRecorderRef = useRef(null)
    const audioChunksRef = useRef([])
    const analyserRef = useRef(null)
    const audioContextRef = useRef(null)
    const animationFrameRef = useRef(null)
    const startTimeRef = useRef(null)
    const timerRef = useRef(null)
    const speechDetectedRef = useRef(false)
    const [hasSpeech, setHasSpeech] = useState(false)

    // Update waveform data from analyser + detect speech via RMS amplitude
    const updateWaveform = useCallback(() => {
        if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
            analyserRef.current.getByteTimeDomainData(dataArray)
            setWaveformData(new Uint8Array(dataArray))

            // RMS check — values are 0–255, silent = flat at 128
            if (!speechDetectedRef.current) {
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) {
                    const v = (dataArray[i] - 128) / 128
                    sum += v * v
                }
                if (Math.sqrt(sum / dataArray.length) > 0.018) {
                    speechDetectedRef.current = true
                    setHasSpeech(true)
                }
            }

            animationFrameRef.current = requestAnimationFrame(updateWaveform)
        }
    }, [])

    const startRecording = useCallback(async () => {
        try {
            setError(null)
            setAudioBlob(null)
            setAudioUrl(null)
            setHasSpeech(false)
            speechDetectedRef.current = false
            audioChunksRef.current = []

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            // Set up Web Audio API for waveform visualization
            audioContextRef.current = new AudioContext()
            const source = audioContextRef.current.createMediaStreamSource(stream)
            analyserRef.current = audioContextRef.current.createAnalyser()
            analyserRef.current.fftSize = 256
            source.connect(analyserRef.current)

            // Set up MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm',
            })

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                const url = URL.createObjectURL(blob)
                setAudioBlob(blob)
                setAudioUrl(url)

                // Clean up analyser
                cancelAnimationFrame(animationFrameRef.current)
                stream.getTracks().forEach((track) => track.stop())
            }

            mediaRecorderRef.current = mediaRecorder
            mediaRecorder.start(100) // Collect data every 100ms
            setIsRecording(true)

            // Start timer
            startTimeRef.current = Date.now()
            timerRef.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
            }, 1000)

            // Start waveform updates
            updateWaveform()
        } catch (err) {
            setError(err.message || 'Failed to access microphone')
            console.error('Recording error:', err)
        }
    }, [updateWaveform])

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }
        setIsRecording(false)
        clearInterval(timerRef.current)
        cancelAnimationFrame(animationFrameRef.current)

        if (audioContextRef.current) {
            audioContextRef.current.close()
        }
    }, [])

    const resetRecording = useCallback(() => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl)
        }
        setAudioBlob(null)
        setAudioUrl(null)
        setDuration(0)
        setWaveformData(new Uint8Array(0))
        setError(null)
    }, [audioUrl])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearInterval(timerRef.current)
            cancelAnimationFrame(animationFrameRef.current)
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => { })
            }
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl)
            }
        }
    }, [audioUrl])

    return {
        isRecording,
        audioBlob,
        audioUrl,
        duration,
        waveformData,
        hasSpeech,
        error,
        startRecording,
        stopRecording,
        resetRecording,
    }
}
