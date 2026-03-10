import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Mic, Square, Volume2, ChevronLeft, ChevronRight,
    CheckCircle2, Target, BookOpen, Loader2,
} from 'lucide-react'
import PronunciationMeter from '../components/PronunciationMeter'
import AvatarCanvas from '../components/AvatarCanvas'
import useAudioRecorder from '../hooks/useAudioRecorder'
import useAppStore from '../stores/appStore'
import { evaluatePronunciation } from '../services/gemini'
import { textToSpeech } from '../services/elevenlabs'
import { speak, warmupAudio } from '../services/avatar'

// ── Data ────────────────────────────────────────────────────────────────────

const PHRASES = [
    { phrase: 'Sema nyen?', meaning: 'What is your name?', language: 'Semai', pronunciation: 'SEH-mah NYEN' },
    { phrase: 'Hay deh!', meaning: 'Hello!', language: 'Temiar', pronunciation: 'HAY DEH' },
    { phrase: 'Naah', meaning: 'One', language: 'Semai', pronunciation: 'NAH' },
    { phrase: 'Baar', meaning: 'Two', language: 'Semai', pronunciation: 'BAR' },
    { phrase: 'Mai', meaning: 'Mother', language: 'Semai', pronunciation: 'MAY' },
    { phrase: 'Bah', meaning: 'Father', language: 'Semai', pronunciation: 'BAH' },
    { phrase: 'Sey noh deh?', meaning: 'How are you?', language: 'Temiar', pronunciation: 'SAY NOH DEH' },
    { phrase: 'Yok nah', meaning: "I'm going now", language: 'Temiar', pronunciation: 'YOHK NAH' },
    { phrase: 'Senroi', meaning: 'Respect for nature', language: 'Semai', pronunciation: 'SEN-ROY' },
    { phrase: 'Tolak bala', meaning: 'Ward off evil', language: 'Semai', pronunciation: 'TOH-lahk BAH-lah' },
]

const LANG_COLORS = {
    Semai:  { accent: 'rgba(200,164,92,1)',  dim: 'rgba(200,164,92,0.1)',  border: 'rgba(200,164,92,0.3)'  },
    Temiar: { accent: 'rgba(52,211,153,1)',  dim: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.28)' },
    Jakun:  { accent: 'rgba(251,146,60,1)',  dim: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.3)'  },
}

// Predefined heights (%) for 24 EQ bars — fixed to avoid re-render flicker
const EQ_H = [42, 72, 56, 88, 46, 96, 62, 82, 36, 76, 52, 68, 80, 44, 90, 64, 50, 74, 60, 94, 40, 70, 84, 54]
const BAR_MAX = 46 // px, fits inside 56px container height

// Pre-compute keyframe sets for each bar (avoids inline Math.round during render)
const EQ_FRAMES = EQ_H.map((h) => {
    const px = (f) => `${Math.round(f * BAR_MAX / 100)}px`
    return [px(h * 0.35), px(h), px(h * 0.55), px(h * 0.82), px(h * 0.4), px(h)]
})
const EQ_IDLE   = EQ_H.map((h) => `${Math.round(h * 0.38 * BAR_MAX / 100)}px`)

// ── Helpers ──────────────────────────────────────────────────────────────────

// "SEH-mah NYEN" → [{text:'SEH', stressed:true}, {text:'mah', stressed:false}, ...]
function parsePhonetics(pron) {
    if (!pron) return []
    return pron.split(/[\s-]+/).filter(Boolean).map((p) => ({
        text: p,
        stressed: p === p.toUpperCase() && /[A-Z]/.test(p),
    }))
}

function formatTime(s) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ── Animation variants ────────────────────────────────────────────────────────

const phraseVariants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 48 : -48, scale: 0.97 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit:  (dir) => ({ opacity: 0, x: dir > 0 ? -48 : 48, scale: 0.97 }),
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PronunciationLab() {
    const [currentIndex, setCurrentIndex]         = useState(0)
    const [direction, setDirection]               = useState(1)
    const [evaluationResult, setEvaluationResult] = useState(null)
    const [isEvaluating, setIsEvaluating]         = useState(false)
    const [recordingSecs, setRecordingSecs]       = useState(0)
    const [isTutorSpeaking, setIsTutorSpeaking]   = useState(false)
    const timerRef   = useRef(null)
    const avatarRef  = useRef(null)

    const handleTutorAvatarReady = useCallback((instance) => {
        avatarRef.current = instance
    }, [])

    const { isRecording, audioBlob, startRecording, stopRecording, resetRecording } = useAudioRecorder()
    const { pronunciationProgress, updatePronunciationProgress } = useAppStore()

    useEffect(() => () => clearInterval(timerRef.current), [])

    const currentPhrase = PHRASES[currentIndex]
    const lc            = LANG_COLORS[currentPhrase.language] || LANG_COLORS.Semai
    const phonetics     = parsePhonetics(currentPhrase.pronunciation)

    // ── Handlers ──────────────────────────────────────────────────────────────

    const navigate = useCallback((delta) => {
        setDirection(delta)
        setCurrentIndex((i) => (i + delta + PHRASES.length) % PHRASES.length)
        setEvaluationResult(null)
        resetRecording()
    }, [resetRecording])

    const goTo = useCallback((idx) => {
        setDirection(idx > currentIndex ? 1 : -1)
        setCurrentIndex(idx)
        setEvaluationResult(null)
        resetRecording()
    }, [currentIndex, resetRecording])

    const handleStartRecording = useCallback(() => {
        setRecordingSecs(0)
        startRecording()
        timerRef.current = setInterval(() => setRecordingSecs((s) => s + 1), 1000)
    }, [startRecording])

    const handleStopRecording = useCallback(() => {
        stopRecording()
        clearInterval(timerRef.current)
    }, [stopRecording])


    const handleListen = useCallback(async () => {
        // Warm up AudioContext while this click gesture is still active
        await warmupAudio(avatarRef.current)
        // 1. Avatar lip-sync via TalkingHead + ElevenLabs WebSocket (most immersive)
        if (avatarRef.current) {
            try {
                setIsTutorSpeaking(true)
                await speak(avatarRef.current, currentPhrase.phrase)
                return
            } catch (err) {
                console.warn('Avatar speech failed, falling back to audio:', err.message)
            } finally {
                setIsTutorSpeaking(false)
            }
        }
        // 2. ElevenLabs REST audio fallback
        try {
            const { audioUrl } = await textToSpeech(currentPhrase.phrase)
            if (audioUrl) { new Audio(audioUrl).play(); return }
        } catch (err) {
            console.warn('ElevenLabs REST failed, using browser TTS:', err.message)
        }
        // 3. Browser TTS final fallback
        speechSynthesis.cancel()
        const utt = new SpeechSynthesisUtterance(currentPhrase.phrase)
        utt.rate = 0.65; utt.pitch = 0.95; utt.lang = 'ms'
        speechSynthesis.speak(utt)
    }, [currentPhrase])

    const handleEvaluate = useCallback(async () => {
        if (!audioBlob) return
        setIsEvaluating(true)
        try {
            const result = await evaluatePronunciation(audioBlob, currentPhrase.phrase)
            setEvaluationResult(result)
            updatePronunciationProgress({ phrase: currentPhrase.phrase, score: result.score, timestamp: Date.now() })
        } catch (err) {
            console.error('Evaluation failed:', err)
            setEvaluationResult({
                score: 0,
                transcribed: '[EVALUATION ERROR]',
                feedback: 'Could not evaluate at this time. Please try again.',
                tips: ['Ensure microphone permissions are granted', 'Try speaking more clearly'],
            })
        } finally {
            setIsEvaluating(false)
        }
    }, [audioBlob, currentPhrase, updatePronunciationProgress])

    const handleRetry = useCallback(() => {
        setEvaluationResult(null)
        resetRecording()
    }, [resetRecording])

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '72px', position: 'relative', overflow: 'hidden' }}
            id="pronunciation-lab-page"
        >
            {/* Wave-pattern background texture */}
            <svg
                style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0.022, pointerEvents: 'none', zIndex: 0 }}
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    <pattern id="wave-pat" x="0" y="0" width="120" height="44" patternUnits="userSpaceOnUse">
                        <path d="M0 22 Q30 6 60 22 Q90 38 120 22" stroke="rgba(200,164,92,1)" strokeWidth="1" fill="none" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#wave-pat)" />
            </svg>

            <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '0 40px', position: 'relative', zIndex: 1 }}>

                {/* ── Page Header ────────────────────────────────────────── */}
                <div style={{ marginBottom: '52px' }}>
                    {/* Eyebrow pill */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.22em',
                        textTransform: 'uppercase', color: 'rgba(200,164,92,0.85)',
                        padding: '5px 14px', borderRadius: '99px',
                        background: 'rgba(200,164,92,0.08)', border: '1px solid rgba(200,164,92,0.2)',
                        marginBottom: '18px',
                    }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(200,164,92,1)', display: 'inline-block' }} />
                        Pronunciation Lab
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
                        <div>
                            <h1 style={{
                                fontFamily: 'var(--font-heading)',
                                fontSize: 'clamp(30px, 4vw, 54px)',
                                fontWeight: 800, color: 'var(--text-primary)',
                                margin: '0 0 10px', lineHeight: 1.08, letterSpacing: '-0.02em',
                            }}>
                                Speak the{' '}
                                <span style={{
                                    background: 'linear-gradient(135deg, #e8c470, #c8a45c)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>
                                    Living Words
                                </span>
                            </h1>
                            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65, maxWidth: '480px' }}>
                                Master indigenous pronunciation with AI-powered coaching and real-time feedback.
                            </p>
                        </div>

                        {/* Session stats strip */}
                        <div style={{
                            display: 'flex', gap: '1px',
                            borderRadius: '16px', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(12,30,18,0.6)',
                            backdropFilter: 'blur(12px)',
                        }}>
                            {[
                                { value: pronunciationProgress.wordsAttempted, label: 'Attempted', gold: false },
                                { value: pronunciationProgress.wordsCorrect,   label: 'Mastered',  gold: true  },
                                { value: pronunciationProgress.streak,         label: 'Streak',    gold: true  },
                            ].map(({ value, label, gold }, i) => (
                                <div key={i} style={{
                                    padding: '14px 26px', textAlign: 'center',
                                    borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                }}>
                                    <div style={{
                                        fontSize: '24px', fontWeight: 800, lineHeight: 1,
                                        color: gold ? 'rgba(200,164,92,1)' : 'var(--text-primary)',
                                        fontFamily: 'var(--font-heading)',
                                    }}>
                                        {value}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                                        {label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Two-column body ─────────────────────────────────────── */}
                <div className="flex flex-col lg:flex-row" style={{ gap: '24px', alignItems: 'flex-start' }}>

                    {/* ─ Left: Main Panel ─ */}
                    <div style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Phrase Card — direction-aware transition */}
                        <div style={{ position: 'relative' }}>
                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div
                                    key={currentIndex}
                                    custom={direction}
                                    variants={phraseVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                                    id="phrase-card"
                                    style={{
                                        borderRadius: '24px',
                                        background: 'linear-gradient(160deg, rgba(16,40,22,0.92) 0%, rgba(10,26,15,0.96) 100%)',
                                        border: `1px solid ${lc.border}`,
                                        padding: '40px',
                                        backdropFilter: 'blur(16px)',
                                        boxShadow: `0 20px 60px rgba(0,0,0,0.45)`,
                                        position: 'relative', overflow: 'hidden',
                                    }}
                                >
                                    {/* Ghost language watermark */}
                                    <div style={{
                                        position: 'absolute', bottom: '-14px', right: '28px',
                                        fontSize: '100px', fontWeight: 900, lineHeight: 1,
                                        fontFamily: 'var(--font-heading)', letterSpacing: '-0.04em',
                                        color: lc.accent, opacity: 0.04,
                                        pointerEvents: 'none', userSelect: 'none',
                                    }}>
                                        {currentPhrase.language}
                                    </div>

                                    {/* Language badge */}
                                    <span style={{
                                        display: 'inline-block',
                                        fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700,
                                        padding: '4px 14px', borderRadius: '99px',
                                        background: lc.dim, border: `1px solid ${lc.border}`,
                                        color: lc.accent, letterSpacing: '0.14em', textTransform: 'uppercase',
                                        marginBottom: '20px',
                                    }}>
                                        {currentPhrase.language}
                                    </span>

                                    {/* Phrase */}
                                    <h2 style={{
                                        fontFamily: 'var(--font-heading)',
                                        fontSize: 'clamp(38px, 5.5vw, 64px)',
                                        fontWeight: 800, color: 'var(--text-primary)',
                                        margin: '0 0 8px', lineHeight: 1.08, letterSpacing: '-0.025em',
                                    }}>
                                        {currentPhrase.phrase}
                                    </h2>

                                    {/* Meaning */}
                                    <p style={{
                                        fontSize: '16px', color: 'var(--text-secondary)',
                                        fontStyle: 'italic', margin: '0 0 28px', lineHeight: 1.5,
                                    }}>
                                        "{currentPhrase.meaning}"
                                    </p>

                                    {/* Phonetic chips */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '36px' }}>
                                        <span style={{
                                            fontSize: '9px', color: 'var(--text-secondary)', opacity: 0.5,
                                            fontFamily: 'var(--font-mono)', letterSpacing: '0.16em',
                                            textTransform: 'uppercase', marginRight: '4px',
                                        }}>
                                            Pronunciation:
                                        </span>
                                        {phonetics.map((chip, i) => (
                                            <span
                                                key={i}
                                                style={{
                                                    display: 'inline-block',
                                                    padding: chip.stressed ? '6px 13px' : '4px 10px',
                                                    borderRadius: '8px',
                                                    fontSize: chip.stressed ? '15px' : '12px',
                                                    fontWeight: chip.stressed ? 700 : 500,
                                                    fontFamily: 'var(--font-mono)',
                                                    letterSpacing: '0.08em',
                                                    background: chip.stressed ? lc.dim : 'rgba(255,255,255,0.03)',
                                                    border: chip.stressed ? `1px solid ${lc.border}` : '1px solid rgba(255,255,255,0.06)',
                                                    color: chip.stressed ? lc.accent : 'var(--text-secondary)',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                {chip.text}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Bottom action row */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                        <motion.button
                                            whileHover={{ scale: 1.04 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleListen}
                                            id="listen-btn"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                padding: '11px 22px', borderRadius: '12px',
                                                background: 'rgba(255,255,255,0.04)',
                                                border: `1.5px solid ${lc.border}`,
                                                color: lc.accent, fontSize: '14px', fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <Volume2 size={16} />
                                            Hear it
                                        </motion.button>

                                        {/* Phrase navigator */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => navigate(-1)}
                                                style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    background: 'rgba(255,255,255,0.04)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    color: 'var(--text-secondary)', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}
                                            >
                                                <ChevronLeft size={16} />
                                            </motion.button>
                                            <span style={{
                                                fontSize: '12px', color: 'var(--text-secondary)',
                                                fontFamily: 'var(--font-mono)',
                                            }}>
                                                {String(currentIndex + 1).padStart(2, '0')} / {String(PHRASES.length).padStart(2, '0')}
                                            </span>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => navigate(1)}
                                                style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    background: 'rgba(255,255,255,0.04)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    color: 'var(--text-secondary)', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}
                                            >
                                                <ChevronRight size={16} />
                                            </motion.button>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Recording Station */}
                        <AnimatePresence>
                            {!evaluationResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 12 }}
                                    transition={{ duration: 0.3 }}
                                    id="recording-station"
                                    style={{
                                        borderRadius: '24px',
                                        background: 'linear-gradient(160deg, rgba(12,30,18,0.88) 0%, rgba(10,26,15,0.94) 100%)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        padding: '28px 32px',
                                        backdropFilter: 'blur(12px)',
                                    }}
                                >
                                    {/* Station header */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <div>
                                            <h3 style={{
                                                fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 700,
                                                color: 'var(--text-primary)', margin: '0 0 2px',
                                            }}>
                                                Recording Station
                                            </h3>
                                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, opacity: 0.7 }}>
                                                {isRecording
                                                    ? 'Listening to your pronunciation...'
                                                    : audioBlob
                                                    ? 'Recording captured, ready to evaluate.'
                                                    : 'Press the mic button to start speaking.'}
                                            </p>
                                        </div>

                                        {/* Status badge */}
                                        {isRecording && (
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '5px 12px', borderRadius: '99px',
                                                background: 'rgba(239,68,68,0.1)',
                                                border: '1px solid rgba(239,68,68,0.3)',
                                            }}>
                                                <motion.span
                                                    animate={{ opacity: [1, 0] }}
                                                    transition={{ repeat: Infinity, duration: 0.7 }}
                                                    style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}
                                                />
                                                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#ef4444' }}>
                                                    {formatTime(recordingSecs)}
                                                </span>
                                            </div>
                                        )}
                                        {audioBlob && !isRecording && (
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '5px 12px', borderRadius: '99px',
                                                background: 'rgba(52,211,153,0.08)',
                                                border: '1px solid rgba(52,211,153,0.25)',
                                            }}>
                                                <CheckCircle2 size={12} style={{ color: 'var(--success)' }} />
                                                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                                                    Captured
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Equalizer visualizer */}
                                    <div style={{
                                        height: '60px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        gap: '4px', marginBottom: '24px',
                                        borderRadius: '14px',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.04)',
                                        padding: '0 20px',
                                        overflow: 'hidden',
                                    }}>
                                        {EQ_H.map((_, i) => (
                                            <motion.div
                                                key={i}
                                                style={{
                                                    width: '7px',
                                                    borderRadius: '4px',
                                                    background: isRecording
                                                        ? `linear-gradient(to top, ${lc.accent}, ${lc.accent}70)`
                                                        : audioBlob
                                                        ? 'rgba(52,211,153,0.28)'
                                                        : 'rgba(255,255,255,0.05)',
                                                }}
                                                animate={isRecording ? {
                                                    height: EQ_FRAMES[i],
                                                } : {
                                                    height: audioBlob ? EQ_IDLE[i] : '4px',
                                                }}
                                                transition={isRecording ? {
                                                    duration: 0.7 + (i % 5) * 0.14,
                                                    repeat: Infinity,
                                                    ease: 'easeInOut',
                                                    delay: i * 0.035,
                                                } : { duration: 0.45, ease: 'easeOut' }}
                                            />
                                        ))}
                                    </div>

                                    {/* Controls */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        {!isRecording && !audioBlob && (
                                            <motion.button
                                                whileHover={{ scale: 1.04 }}
                                                whileTap={{ scale: 0.96 }}
                                                onClick={handleStartRecording}
                                                id="start-recording-btn"
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '10px',
                                                    padding: '13px 28px', borderRadius: '14px',
                                                    background: 'linear-gradient(135deg, #e8c470, #c8a45c)',
                                                    border: 'none',
                                                    color: 'rgba(10,26,15,0.95)', fontSize: '14px', fontWeight: 700,
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 20px rgba(200,164,92,0.35)',
                                                }}
                                            >
                                                <Mic size={16} />
                                                Start Speaking
                                            </motion.button>
                                        )}

                                        {isRecording && (
                                            <motion.button
                                                whileHover={{ scale: 1.04 }}
                                                whileTap={{ scale: 0.96 }}
                                                onClick={handleStopRecording}
                                                id="stop-recording-btn"
                                                animate={{ boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 22px rgba(239,68,68,0.32)', '0 0 0px rgba(239,68,68,0)'] }}
                                                transition={{ duration: 1.4, repeat: Infinity }}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '10px',
                                                    padding: '13px 28px', borderRadius: '14px',
                                                    background: 'rgba(239,68,68,0.1)',
                                                    border: '1.5px solid rgba(239,68,68,0.4)',
                                                    color: '#ef4444', fontSize: '14px', fontWeight: 700,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Square size={14} />
                                                Stop
                                            </motion.button>
                                        )}

                                        {audioBlob && !isRecording && (
                                            <>
                                                <motion.button
                                                    whileHover={{ scale: 1.04 }}
                                                    whileTap={{ scale: 0.96 }}
                                                    onClick={handleEvaluate}
                                                    disabled={isEvaluating}
                                                    id="evaluate-btn"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '10px',
                                                        padding: '13px 28px', borderRadius: '14px',
                                                        background: 'linear-gradient(135deg, #e8c470, #c8a45c)',
                                                        border: 'none',
                                                        color: 'rgba(10,26,15,0.95)', fontSize: '14px', fontWeight: 700,
                                                        cursor: isEvaluating ? 'wait' : 'pointer',
                                                        opacity: isEvaluating ? 0.75 : 1,
                                                        boxShadow: isEvaluating ? 'none' : '0 4px 20px rgba(200,164,92,0.35)',
                                                    }}
                                                >
                                                    {isEvaluating ? (
                                                        <>
                                                            <motion.span
                                                                animate={{ rotate: 360 }}
                                                                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                                                                style={{ display: 'flex', alignItems: 'center' }}
                                                            >
                                                                <Loader2 size={16} />
                                                            </motion.span>
                                                            Evaluating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Target size={16} />
                                                            Evaluate
                                                        </>
                                                    )}
                                                </motion.button>

                                                <motion.button
                                                    whileHover={{ scale: 1.04 }}
                                                    whileTap={{ scale: 0.96 }}
                                                    onClick={handleRetry}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                        padding: '13px 20px', borderRadius: '14px',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <Mic size={14} />
                                                    Re-record
                                                </motion.button>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Evaluation Result */}
                        <AnimatePresence>
                            {evaluationResult && (
                                <PronunciationMeter
                                    score={evaluationResult.score}
                                    transcribed={evaluationResult.transcribed}
                                    feedback={evaluationResult.feedback}
                                    tips={evaluationResult.tips}
                                    onRetry={handleRetry}
                                    onNext={() => navigate(1)}
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ─ Right: Tutor Panel (avatar + phrase navigator) ─ */}
                    <div className="hidden lg:block" style={{ flex: '0 0 300px', minWidth: '280px' }}>
                        <div style={{ position: 'sticky', top: '108px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Avatar Card */}
                            <div style={{
                                borderRadius: '24px',
                                background: 'linear-gradient(160deg, rgba(12,30,18,0.92) 0%, rgba(10,26,15,0.96) 100%)',
                                border: '1px solid rgba(200,164,92,0.18)',
                                backdropFilter: 'blur(16px)',
                                padding: '20px',
                                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                            }}>
                                {/* Tutor label */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
                                }}>
                                    <div style={{
                                        width: '7px', height: '7px', borderRadius: '50%',
                                        background: 'var(--success)',
                                        boxShadow: '0 0 8px rgba(52,211,153,0.7)',
                                    }} />
                                    <span style={{
                                        fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.18em',
                                        textTransform: 'uppercase', color: 'var(--text-secondary)',
                                    }}>
                                        Language Tutor
                                    </span>
                                </div>

                                {/* Avatar aura circle */}
                                <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', marginBottom: '14px' }}>
                                    {/* Ambient glow */}
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 'auto',
                                        width: '75%', height: '75%', borderRadius: '50%',
                                        background: 'radial-gradient(circle, rgba(200,164,92,0.14) 0%, transparent 70%)',
                                        filter: 'blur(18px)',
                                    }} />

                                    {/* Outer rotating dashed ring */}
                                    <motion.div
                                        style={{
                                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 'auto',
                                            width: '92%', height: '92%', borderRadius: '50%',
                                            border: '1px dashed rgba(200,164,92,0.22)',
                                        }}
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 32, ease: 'linear' }}
                                    />

                                    {/* Inner counter-rotating ring */}
                                    <motion.div
                                        style={{
                                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 'auto',
                                            width: '80%', height: '80%', borderRadius: '50%',
                                            border: '1px solid rgba(200,164,92,0.08)',
                                        }}
                                        animate={{ rotate: -360 }}
                                        transition={{ repeat: Infinity, duration: 52, ease: 'linear' }}
                                    />

                                    {/* Avatar circle viewport */}
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 'auto',
                                        width: '68%', height: '68%', borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '1.5px solid rgba(200,164,92,0.28)',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 0 0 4px rgba(200,164,92,0.07)',
                                        background: 'rgba(10,26,15,0.8)',
                                    }}>
                                        {/* Inner wrapper shifts canvas up so the face centres in the circle */}
                                        <div style={{ width: '100%', height: '160%', marginTop: '-49%' }}>
                                            <AvatarCanvas onReady={handleTutorAvatarReady} />
                                        </div>
                                    </div>
                                </div>

                                {/* Speaking indicator / hint */}
                                {isTutorSpeaking ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        {[0, 1, 2].map((i) => (
                                            <motion.div
                                                key={i}
                                                style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }}
                                                animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
                                                transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.18 }}
                                            />
                                        ))}
                                        <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>Speaking...</span>
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.55, opacity: 0.6, margin: 0 }}>
                                        Press <strong style={{ color: 'rgba(200,164,92,0.8)', fontWeight: 600 }}>Hear it</strong> to watch the tutor pronounce the phrase with lip sync.
                                    </p>
                                )}
                            </div>

                            {/* Phrase Navigator */}
                            <div style={{
                                borderRadius: '24px',
                                background: 'linear-gradient(160deg, rgba(12,30,18,0.88) 0%, rgba(10,26,15,0.94) 100%)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                backdropFilter: 'blur(12px)',
                                overflow: 'hidden',
                            }}>
                                {/* Header */}
                                <div style={{
                                    padding: '16px 20px 12px',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                }}>
                                    <BookOpen size={13} style={{ color: 'rgba(200,164,92,0.75)' }} />
                                    <span style={{
                                        fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.18em',
                                        textTransform: 'uppercase', color: 'rgba(200,164,92,0.75)',
                                    }}>
                                        Phrase Library
                                    </span>
                                </div>

                                {/* List */}
                                <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '6px 0' }}>
                                    {PHRASES.map((phrase, i) => {
                                        const isActive = i === currentIndex
                                        const plc = LANG_COLORS[phrase.language] || LANG_COLORS.Semai
                                        return (
                                            <motion.button
                                                key={i}
                                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                                                onClick={() => goTo(i)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '12px',
                                                    width: '100%', padding: '10px 20px',
                                                    background: 'transparent', border: 'none',
                                                    borderLeft: isActive ? `3px solid ${plc.accent}` : '3px solid transparent',
                                                    cursor: 'pointer', textAlign: 'left',
                                                    transition: 'border-color 0.2s, background-color 0.15s',
                                                }}
                                            >
                                                <span style={{
                                                    fontSize: '9px', fontFamily: 'var(--font-mono)',
                                                    color: isActive ? plc.accent : 'var(--text-secondary)',
                                                    opacity: isActive ? 1 : 0.45,
                                                    flexShrink: 0, width: '16px',
                                                }}>
                                                    {String(i + 1).padStart(2, '0')}
                                                </span>

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: '13px',
                                                        fontWeight: isActive ? 700 : 500,
                                                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                        fontFamily: 'var(--font-heading)',
                                                    }}>
                                                        {phrase.phrase}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.5, marginTop: '1px' }}>
                                                        {phrase.meaning}
                                                    </div>
                                                </div>

                                                <span style={{
                                                    fontSize: '8px', fontFamily: 'var(--font-mono)', fontWeight: 700,
                                                    padding: '2px 7px', borderRadius: '99px', flexShrink: 0,
                                                    background: plc.dim, border: `1px solid ${plc.border}`,
                                                    color: plc.accent, letterSpacing: '0.08em', textTransform: 'uppercase',
                                                }}>
                                                    {phrase.language.slice(0, 3)}
                                                </span>
                                            </motion.button>
                                        )
                                    })}
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </motion.div>
    )
}
