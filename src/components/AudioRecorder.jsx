import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react'
import useAudioRecorder from '../hooks/useAudioRecorder'
import { formatDuration } from '../utils/audioUtils'

const PROMPTS = [
    'Speak freely, in your own tongue...',
    'Share a story your elders told you...',
    'What wisdom was passed down to you?',
    'Preserve a word for future generations...',
    'Tell us of your land, your people...',
]

export default function AudioRecorder({ onRecordingComplete }) {
    const { isRecording, audioBlob, audioUrl, duration, waveformData, hasSpeech, error, startRecording, stopRecording, resetRecording } =
        useAudioRecorder()
    const canvasRef = useRef(null)
    const [promptIdx, setPromptIdx] = useState(0)
    const [validationError, setValidationError] = useState(null)

    // Rotate prompts when idle
    useEffect(() => {
        if (isRecording || audioBlob) return
        const timer = setInterval(() => setPromptIdx((i) => (i + 1) % PROMPTS.length), 3800)
        return () => clearInterval(timer)
    }, [isRecording, audioBlob])

    // Draw waveform
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !waveformData.length) return
        const ctx = canvas.getContext('2d')
        const dpr = window.devicePixelRatio || 1
        canvas.width = canvas.offsetWidth * dpr
        canvas.height = canvas.offsetHeight * dpr
        ctx.scale(dpr, dpr)
        const w = canvas.offsetWidth
        const h = canvas.offsetHeight
        ctx.clearRect(0, 0, w, h)

        const sliceWidth = w / waveformData.length
        ctx.lineWidth = 1.8
        ctx.strokeStyle = isRecording ? '#c8a45c' : 'rgba(200,164,92,0.35)'
        ctx.beginPath()

        for (let i = 0; i < waveformData.length; i++) {
            const v = waveformData[i] / 128.0
            const y = (v * h) / 2
            i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * sliceWidth, y)
        }
        ctx.stroke()

        if (isRecording) {
            ctx.shadowBlur = 18
            ctx.shadowColor = '#c8a45c'
            ctx.stroke()
            ctx.shadowBlur = 0
            ctx.lineTo(w, h)
            ctx.lineTo(0, h)
            ctx.closePath()
            const grad = ctx.createLinearGradient(0, h / 2, 0, h)
            grad.addColorStop(0, 'rgba(200,164,92,0.25)')
            grad.addColorStop(1, 'rgba(200,164,92,0)')
            ctx.fillStyle = grad
            ctx.fill()
        }
    }, [waveformData, isRecording])

    // Validate then notify parent
    useEffect(() => {
        if (!audioBlob) return
        if (duration < 3) {
            setValidationError('Recording too short: please speak at least one full sentence (3+ seconds).')
            resetRecording()
            return
        }
        if (!hasSpeech) {
            setValidationError('No speech detected: check your microphone and speak clearly into it.')
            resetRecording()
            return
        }
        setValidationError(null)
        if (onRecordingComplete) onRecordingComplete(audioBlob, audioUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioBlob])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%' }}>

            {/* Rotating cultural prompt */}
            <AnimatePresence mode="wait">
                {!audioBlob && (
                    <motion.div
                        key={promptIdx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.45 }}
                        style={{ textAlign: 'center' }}
                    >
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', opacity: 0.8, letterSpacing: '0.02em' }}>
                            {isRecording ? '🔴  Recording: speak clearly and naturally...' : PROMPTS[promptIdx]}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Waveform display */}
            <div
                style={{
                    width: '100%',
                    height: '100px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    background: 'rgba(5, 14, 10, 0.85)',
                    border: isRecording
                        ? '1px solid rgba(200,164,92,0.45)'
                        : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: isRecording
                        ? 'inset 0 2px 12px rgba(0,0,0,0.4), 0 0 20px rgba(200,164,92,0.1)'
                        : 'inset 0 2px 12px rgba(0,0,0,0.4)',
                    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                }}
            >
                <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', position: 'relative', zIndex: 2 }} />

                {/* Recording timer overlay */}
                <AnimatePresence>
                    {isRecording && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'absolute', top: '10px', right: '12px',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '4px 10px', borderRadius: '99px',
                                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(200,164,92,0.25)', zIndex: 5,
                            }}
                        >
                            <div className="animate-pulse" style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 6px var(--danger)' }} />
                            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                                {formatDuration(duration)}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Idle placeholder */}
                <AnimatePresence>
                    {!isRecording && !audioBlob && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'absolute', inset: 0, zIndex: 3,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                pointerEvents: 'none',
                            }}
                        >
                            {/* Idle flat line */}
                            <div style={{ width: '70%', height: '1px', background: 'linear-gradient(to right, transparent, rgba(200,164,92,0.25), transparent)' }} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Big Ceremonial Mic Button ── */}
            <AnimatePresence mode="wait">
                {!audioBlob ? (
                    <motion.div
                        key="mic-controls"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    >
                        {/* Pulse rings when recording */}
                        {isRecording && [0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: '120px', height: '120px',
                                    borderRadius: '50%',
                                    border: '1px solid rgba(239,68,68,0.45)',
                                    pointerEvents: 'none',
                                }}
                                animate={{ scale: [1, 2.4], opacity: [0.45, 0] }}
                                transition={{ repeat: Infinity, duration: 2.2, delay: i * 0.73, ease: 'easeOut' }}
                            />
                        ))}
                        {/* Idle ambient ring */}
                        {!isRecording && (
                            <motion.div
                                style={{
                                    position: 'absolute',
                                    width: '130px', height: '130px',
                                    borderRadius: '50%',
                                    border: '1px dashed rgba(200,164,92,0.28)',
                                    pointerEvents: 'none',
                                }}
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                            />
                        )}

                        {/* The button itself */}
                        <motion.button
                            whileHover={{ scale: 1.07 }}
                            whileTap={{ scale: 0.93 }}
                            onClick={isRecording ? stopRecording : startRecording}
                            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                            style={{
                                width: '112px', height: '112px',
                                borderRadius: '50%',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                cursor: 'pointer',
                                border: isRecording ? '2px solid rgba(239,68,68,0.55)' : 'none',
                                background: isRecording
                                    ? 'radial-gradient(circle, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.06) 100%)'
                                    : 'linear-gradient(135deg, #e8c470 0%, #c8a45c 100%)',
                                boxShadow: isRecording
                                    ? '0 0 40px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
                                    : '0 8px 36px rgba(200,164,92,0.52), inset 0 2px 0 rgba(255,255,255,0.28)',
                                transition: 'background 0.3s ease, box-shadow 0.3s ease, border 0.3s ease',
                            }}
                        >
                            {isRecording ? (
                                <>
                                    <Square size={28} fill="rgba(239,68,68,0.85)" color="rgba(239,68,68,0.85)" />
                                    <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'rgba(239,68,68,0.9)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                        Stop
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Mic size={30} strokeWidth={2} color="rgba(10,26,15,0.9)" />
                                    <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'rgba(10,26,15,0.9)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                        Record
                                    </span>
                                </>
                            )}
                        </motion.button>
                    </motion.div>
                ) : (
                    /* Done state */
                    <motion.div
                        key="done-state"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}
                    >
                        {/* Captured badge */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 18px', borderRadius: '99px',
                            background: 'rgba(52,211,153,0.1)',
                            border: '1px solid rgba(52,211,153,0.3)',
                        }}>
                            <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>
                                Captured · {formatDuration(duration)}
                            </span>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={resetRecording}
                            aria-label="Re-record audio"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '7px',
                                padding: '9px 20px', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text-secondary)',
                                fontSize: '13px', fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            <RotateCcw size={14} />
                            Re-record
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Helper text under button */}
            {!audioBlob && !isRecording && (
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.5, textAlign: 'center', marginTop: '-8px', letterSpacing: '0.04em' }}>
                    Recording will start immediately on click
                </p>
            )}

            {/* Error / Validation error */}
            <AnimatePresence>
                {(error || validationError) && (
                    <motion.div
                        key={error || validationError}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 16px', borderRadius: '12px', width: '100%',
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: 'var(--danger)', fontSize: '13px',
                        }}
                    >
                        <AlertCircle size={15} style={{ flexShrink: 0 }} />
                        {error || validationError}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
