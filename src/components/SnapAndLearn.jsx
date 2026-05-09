import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, RefreshCw, X, Volume2, Mic, Square, Loader2, Languages, Leaf, ShieldCheck, AlertTriangle } from 'lucide-react'
import { lookupVisionWord, agenticEvaluation } from '../services/gemini'
import { textToSpeech } from '../services/elevenlabs'
import useAudioRecorder from '../hooks/useAudioRecorder'

// Languages grouped by region. Order within each group reflects typical
// learner curiosity. Keys must match vocabulary.json top-level keys.
const LANGUAGE_GROUPS = [
    {
        label: 'Orang Asli (Peninsular Malaysia)',
        items: [
            { key: 'semai', label: 'Semai' },
            { key: 'temiar', label: 'Temiar' },
            { key: 'jakun', label: 'Jakun' },
            { key: 'mah_meri', label: 'Mah Meri' },
        ],
    },
    {
        label: 'Borneo & Indonesia',
        items: [
            { key: 'iban', label: 'Iban' },
            { key: 'balinese', label: 'Balinese' },
        ],
    },
    {
        label: 'Maritime SE Asia',
        items: [
            { key: 'malay', label: 'Malay' },
            { key: 'tagalog', label: 'Tagalog (Filipino)' },
            { key: 'tetum', label: 'Tetum (Timor-Leste)' },
        ],
    },
    {
        label: 'Mainland SE Asia',
        items: [
            { key: 'khmer', label: 'Khmer (Cambodia)' },
            { key: 'lao', label: 'Lao' },
            { key: 'thai', label: 'Thai' },
            { key: 'burmese', label: 'Burmese' },
            { key: 'hmong', label: 'Hmong' },
        ],
    },
]
const LANGUAGES = LANGUAGE_GROUPS.flatMap((g) => g.items)

const STAGES = {
    LIVE: 'live',
    LOADING: 'loading',
    RESULT: 'result',
    REFUSED: 'refused',
}

export default function SnapAndLearn() {
    const [language, setLanguage] = useState('semai')
    const [stage, setStage] = useState(STAGES.LIVE)
    const [snapshot, setSnapshot] = useState(null) // dataURL for preview
    const [snapshotBlob, setSnapshotBlob] = useState(null)
    const [result, setResult] = useState(null) // {englishName, indigenousWord, pronunciation, ...}
    const [error, setError] = useState(null)

    // Practice substate (after a successful identification)
    const [evalResult, setEvalResult] = useState(null)
    const [isEvaluating, setIsEvaluating] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)

    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const audioElRef = useRef(null)

    const { isRecording, audioBlob, startRecording, stopRecording, resetRecording } =
        useAudioRecorder()

    // ── Camera lifecycle ──
    const startCamera = useCallback(async () => {
        try {
            setError(null)
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }
        } catch (e) {
            console.error('Camera access failed:', e)
            setError(
                e.name === 'NotAllowedError'
                    ? 'Camera permission denied. Please allow camera access in your browser.'
                    : 'Could not access camera. Make sure your device has one and try again.'
            )
        }
    }, [])

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop())
            streamRef.current = null
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
    }, [])

    useEffect(() => {
        startCamera()
        return () => stopCamera()
    }, [startCamera, stopCamera])

    // ── Capture frame ──
    const handleCapture = useCallback(async () => {
        const video = videoRef.current
        if (!video || video.readyState < 2) return

        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setSnapshot(dataUrl)

        const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', 0.8)
        )
        setSnapshotBlob(blob)

        stopCamera()
        setStage(STAGES.LOADING)

        try {
            const data = await lookupVisionWord(blob, language)
            setResult(data)
            setStage(data.refused ? STAGES.REFUSED : STAGES.RESULT)
        } catch (e) {
            console.error('Vision lookup failed:', e)
            setResult({
                refused: true,
                message: 'Something went wrong reaching the cultural archive. Please try again.',
            })
            setStage(STAGES.REFUSED)
        }
    }, [language, stopCamera])

    // ── Reset to live camera ──
    const handleRetry = useCallback(() => {
        setSnapshot(null)
        setSnapshotBlob(null)
        setResult(null)
        setEvalResult(null)
        resetRecording()
        setStage(STAGES.LIVE)
        startCamera()
    }, [resetRecording, startCamera])

    // ── Hear pronunciation ──
    // textToSpeech() returns { audioBlob, audioUrl } on success (Cloud TTS
    // Neural2-F female voice) or { fallback: true } when it has internally
    // already started a browser-SpeechSynthesis utterance (also female-biased).
    const handleHear = useCallback(async () => {
        if (!result?.indigenousWord || isSpeaking) return
        setIsSpeaking(true)
        try {
            const tts = await textToSpeech(result.indigenousWord)
            if (tts?.audioUrl && audioElRef.current) {
                audioElRef.current.src = tts.audioUrl
                audioElRef.current.onended = () => {
                    URL.revokeObjectURL(tts.audioUrl)
                    setIsSpeaking(false)
                }
                audioElRef.current.onerror = () => {
                    URL.revokeObjectURL(tts.audioUrl)
                    setIsSpeaking(false)
                }
                await audioElRef.current.play()
            } else {
                // textToSpeech() already triggered browser fallback internally.
                setIsSpeaking(false)
            }
        } catch (e) {
            console.warn('TTS failed:', e)
            setIsSpeaking(false)
        }
    }, [result, isSpeaking])

    // ── Practice flow ──
    const handleStartPractice = useCallback(() => {
        setEvalResult(null)
        startRecording()
    }, [startRecording])

    const handleStopPractice = useCallback(() => {
        stopRecording()
    }, [stopRecording])

    const handleEvaluate = useCallback(async () => {
        if (!audioBlob || !result?.indigenousWord) return
        setIsEvaluating(true)
        try {
            const evaluation = await agenticEvaluation(audioBlob, result.indigenousWord, language)
            setEvalResult(evaluation)
        } catch (e) {
            console.error('Evaluation failed:', e)
            setEvalResult({
                score: 0,
                transcribed: '[ERROR]',
                feedback: 'Could not evaluate. Please try again.',
                tips: [],
            })
        } finally {
            setIsEvaluating(false)
        }
    }, [audioBlob, result, language])

    // ── Render ──
    return (
        <div style={{ position: 'relative', width: '100%' }}>
            {/* Hidden audio element for word playback */}
            <audio ref={audioElRef} style={{ display: 'none' }} />

            {/* Language picker — grouped dropdown (handles 14+ languages cleanly) */}
            <div
                style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '16px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                <Languages size={14} style={{ color: 'rgba(200,164,92,0.7)' }} />
                <span
                    style={{
                        fontSize: '10px',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'rgba(200,164,92,0.7)',
                        fontFamily: 'var(--font-mono)',
                    }}
                >
                    Translate to
                </span>
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(200,164,92,0.4)',
                        background: 'linear-gradient(135deg, rgba(200,164,92,0.15), rgba(200,164,92,0.05))',
                        color: '#e8d5a3',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23e8d5a3' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                        paddingRight: '32px',
                    }}
                >
                    {LANGUAGE_GROUPS.map((group) => (
                        <optgroup
                            key={group.label}
                            label={group.label}
                            style={{ background: '#0a1a0f', color: '#c8a45c', fontStyle: 'italic' }}
                        >
                            {group.items.map((l) => (
                                <option
                                    key={l.key}
                                    value={l.key}
                                    style={{ background: '#0a1a0f', color: '#f0ede4', fontStyle: 'normal' }}
                                >
                                    {l.label}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            {/* Main camera/result area */}
            <div
                style={{
                    position: 'relative',
                    aspectRatio: '4/3',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    background: 'rgba(10,26,15,0.95)',
                    border: '1px solid rgba(200,164,92,0.2)',
                    boxShadow: '0 8px 36px rgba(0,0,0,0.4)',
                }}
            >
                {/* LIVE camera */}
                {stage === STAGES.LIVE && (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: error ? 'none' : 'block',
                            }}
                        />
                        {error && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '32px',
                                    textAlign: 'center',
                                    color: 'var(--text-secondary)',
                                    gap: '12px',
                                }}
                            >
                                <Camera size={36} style={{ opacity: 0.4 }} />
                                <p style={{ fontSize: '14px', maxWidth: '320px' }}>{error}</p>
                                <button
                                    onClick={startCamera}
                                    style={{
                                        marginTop: '8px',
                                        padding: '10px 22px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #e8c470, #c8a45c)',
                                        border: 'none',
                                        color: 'rgba(10,26,15,0.95)',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {/* Capture button */}
                        {!error && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleCapture}
                                style={{
                                    position: 'absolute',
                                    bottom: '20px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.95)',
                                    border: '4px solid rgba(200,164,92,0.7)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                                }}
                                aria-label="Capture photo"
                            >
                                <Camera size={26} color="rgba(10,26,15,0.95)" />
                            </motion.button>
                        )}

                        {/* Hint */}
                        {!error && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '14px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    padding: '6px 14px',
                                    borderRadius: '99px',
                                    background: 'rgba(0,0,0,0.55)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    fontSize: '11px',
                                    color: 'rgba(255,255,255,0.85)',
                                    fontFamily: 'var(--font-mono)',
                                    letterSpacing: '0.06em',
                                }}
                            >
                                Frame one object · plain background works best
                            </div>
                        )}
                    </>
                )}

                {/* LOADING */}
                {stage === STAGES.LOADING && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: snapshot
                                ? `url(${snapshot}) center/cover`
                                : 'rgba(10,26,15,0.9)',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(10,26,15,0.6)',
                                backdropFilter: 'blur(2px)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '14px',
                            }}
                        >
                            <Loader2
                                size={36}
                                style={{ color: '#c8a45c', animation: 'spin 1s linear infinite' }}
                            />
                            <span
                                style={{
                                    fontSize: '13px',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'var(--font-mono)',
                                    letterSpacing: '0.08em',
                                }}
                            >
                                Identifying object...
                            </span>
                        </div>
                    </div>
                )}

                {/* RESULT or REFUSED — show snapshot in background */}
                {(stage === STAGES.RESULT || stage === STAGES.REFUSED) && snapshot && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: `url(${snapshot}) center/cover`,
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background:
                                    'linear-gradient(180deg, rgba(10,26,15,0.3) 0%, rgba(10,26,15,0.92) 65%, rgba(10,26,15,0.98) 100%)',
                            }}
                        />
                    </div>
                )}

                {/* RESULT card */}
                <AnimatePresence>
                    {stage === STAGES.RESULT && result && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: '24px',
                                color: 'var(--text-primary)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                                    fontSize: '10px',
                                    letterSpacing: '0.2em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(200,164,92,0.75)',
                                    fontFamily: 'var(--font-mono)',
                                    marginBottom: '6px',
                                }}
                            >
                                <span>
                                    {result.englishName} → {LANGUAGES.find((l) => l.key === result.language)?.label}
                                </span>
                                {result.source === 'verified' && (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                        padding: '2px 8px', borderRadius: '99px',
                                        background: 'rgba(52,211,153,0.14)',
                                        border: '1px solid rgba(52,211,153,0.4)',
                                        color: '#34d399',
                                        letterSpacing: '0.08em',
                                    }}>
                                        <ShieldCheck size={10} />
                                        Verified
                                    </span>
                                )}
                                {result.source === 'ai_suggested' && (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                        padding: '2px 8px', borderRadius: '99px',
                                        background: 'rgba(245,158,11,0.14)',
                                        border: '1px solid rgba(245,158,11,0.4)',
                                        color: '#f59e0b',
                                        letterSpacing: '0.08em',
                                    }}>
                                        <AlertTriangle size={10} />
                                        AI suggestion
                                    </span>
                                )}
                            </div>
                            {result.matchedEnglish && result.matchedEnglish !== result.englishName.toLowerCase() && (
                                <div style={{
                                    fontSize: '10px', color: 'rgba(255,255,255,0.45)',
                                    fontFamily: 'var(--font-mono)', marginBottom: '6px',
                                }}>
                                    matched on: <em>{result.matchedEnglish}</em>
                                </div>
                            )}
                            <div
                                style={{
                                    fontFamily: 'var(--font-heading)',
                                    fontSize: 'clamp(32px, 6vw, 48px)',
                                    fontWeight: 700,
                                    lineHeight: 1.05,
                                    letterSpacing: '-0.02em',
                                    color: '#f0ede4',
                                    marginBottom: '4px',
                                }}
                            >
                                {result.indigenousWord}
                            </div>
                            {result.pronunciation && (
                                <div
                                    style={{
                                        fontSize: '13px',
                                        color: 'rgba(232,228,218,0.65)',
                                        fontFamily: 'var(--font-mono)',
                                        marginBottom: '14px',
                                    }}
                                >
                                    {result.pronunciation}
                                </div>
                            )}
                            {result.culturalNote && (
                                <p
                                    style={{
                                        fontSize: '12px',
                                        color: 'rgba(232,228,218,0.7)',
                                        fontStyle: 'italic',
                                        marginBottom: '12px',
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {result.culturalNote}
                                </p>
                            )}

                            {/* Action row */}
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                                <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={handleHear}
                                    disabled={isSpeaking}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 18px',
                                        borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.18)',
                                        color: '#f0ede4',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: isSpeaking ? 'wait' : 'pointer',
                                    }}
                                >
                                    <Volume2 size={14} />
                                    {isSpeaking ? 'Playing…' : 'Hear it'}
                                </motion.button>

                                {!isRecording ? (
                                    <motion.button
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={handleStartPractice}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 18px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #e8c470, #c8a45c)',
                                            border: 'none',
                                            color: 'rgba(10,26,15,0.95)',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <Mic size={14} />
                                        Practice
                                    </motion.button>
                                ) : (
                                    <motion.button
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={handleStopPractice}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 18px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #fb7185, #ef4444)',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <Square size={12} />
                                        Stop
                                    </motion.button>
                                )}

                                {audioBlob && !isRecording && !evalResult && (
                                    <motion.button
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={handleEvaluate}
                                        disabled={isEvaluating}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 18px',
                                            borderRadius: '12px',
                                            background: 'rgba(0,229,160,0.15)',
                                            border: '1px solid rgba(0,229,160,0.4)',
                                            color: 'var(--accent)',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: isEvaluating ? 'wait' : 'pointer',
                                        }}
                                    >
                                        {isEvaluating ? <Loader2 size={14} className="animate-spin" /> : <Leaf size={14} />}
                                        {isEvaluating ? 'Evaluating…' : 'Check my pronunciation'}
                                    </motion.button>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={handleRetry}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '10px 14px',
                                        borderRadius: '12px',
                                        background: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        color: 'var(--text-secondary)',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <RefreshCw size={12} />
                                    Snap another
                                </motion.button>
                            </div>

                            {/* Eval result inline */}
                            {evalResult && (
                                <div
                                    style={{
                                        marginTop: '14px',
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        background: 'rgba(0,0,0,0.35)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: '28px',
                                            fontWeight: 800,
                                            fontFamily: 'var(--font-heading)',
                                            color:
                                                evalResult.score >= 70
                                                    ? '#34d399'
                                                    : evalResult.score >= 40
                                                        ? '#f59e0b'
                                                        : '#fb7185',
                                            lineHeight: 1,
                                        }}
                                    >
                                        {Math.round(evalResult.score)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: 'rgba(232,228,218,0.55)',
                                                fontFamily: 'var(--font-mono)',
                                                marginBottom: '2px',
                                            }}
                                        >
                                            heard: {evalResult.transcribed}
                                        </div>
                                        <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
                                            {evalResult.feedback}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {result.disclaimer && (
                                <p
                                    style={{
                                        fontSize: '10px',
                                        color: 'rgba(255,255,255,0.42)',
                                        marginTop: '12px',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    {result.disclaimer}
                                </p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* REFUSED card */}
                <AnimatePresence>
                    {stage === STAGES.REFUSED && result && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            transition={{ duration: 0.4 }}
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: '24px',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '10px',
                                    letterSpacing: '0.2em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(200,164,92,0.6)',
                                    fontFamily: 'var(--font-mono)',
                                    marginBottom: '8px',
                                }}
                            >
                                🍃 Awaiting elder wisdom
                            </div>
                            <p
                                style={{
                                    fontSize: '14px',
                                    color: 'rgba(232,228,218,0.85)',
                                    lineHeight: 1.6,
                                    fontStyle: 'italic',
                                    marginBottom: '14px',
                                }}
                            >
                                {result.message}
                            </p>
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={handleRetry}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '10px 18px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #e8c470, #c8a45c)',
                                    border: 'none',
                                    color: 'rgba(10,26,15,0.95)',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={14} />
                                Try again
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
