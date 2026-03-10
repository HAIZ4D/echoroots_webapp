import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Mic, Library, Sparkles, Plus, CheckCircle2, Feather,
    Globe, Languages, Paintbrush, Archive, RefreshCw, AlertCircle,
} from 'lucide-react'
import AudioRecorder from '../components/AudioRecorder'
import PipelineProgress from '../components/PipelineProgress'
import EBookViewer from '../components/EBookViewer'
import StoryCard from '../components/StoryCard'
import StoryReaderOverlay from '../components/StoryReaderOverlay'
import useStoryPipeline from '../hooks/useStoryPipeline'
import useAppStore from '../stores/appStore'
import { loadStoriesFromFirestore } from '../services/storyService'

// Framer Motion safe centering (avoids transform conflict)
const centered = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 'auto' }

const HOW_STEPS = [
    { icon: Mic,       title: 'Record',      desc: 'Speak freely in any indigenous language',                  bg: 'rgba(0,229,160,0.09)',    border: 'rgba(0,229,160,0.24)',    color: '#00e5a0' },
    { icon: Languages, title: 'Transcribe',  desc: 'AI transcribes & translates with cultural care',          bg: 'rgba(200,164,92,0.09)',   border: 'rgba(200,164,92,0.24)',   color: '#c8a45c' },
    { icon: Paintbrush,title: 'Illustrate',  desc: 'Each scene becomes a watercolor painting',                bg: 'rgba(155,126,230,0.09)',  border: 'rgba(155,126,230,0.24)',  color: '#9b7ee6' },
    { icon: Archive,   title: 'Preserve',    desc: 'Your storybook lives in the Cultural Archive forever',    bg: 'rgba(232,112,112,0.09)',  border: 'rgba(232,112,112,0.24)',  color: '#e87070' },
]

const FLOAT_WORDS = [
    'Semai', 'Temiar', 'Jakun', 'Cerita', 'Adat',
    'Rimba', 'Budaya', 'Warisan', 'Leluhur', 'Semangat', 'Hutan', 'Orang Asli',
]

// ═══════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════
export default function StoryWeaver() {
    const { pipeline, runPipeline, resetPipeline, isProcessing } = useStoryPipeline()
    const savedStories = useAppStore((s) => s.savedStories)

    const [tab, setTab] = useState('create')
    const [firestoreStories, setFirestoreStories] = useState([])
    const [loadingLibrary, setLoadingLibrary] = useState(true)
    const [selectedStory, setSelectedStory] = useState(null)
    const prevStageRef = useRef(pipeline.stage)

    // ── Load Firestore library ──
    const refreshLibrary = useCallback(async () => {
        setLoadingLibrary(true)
        const stories = await loadStoriesFromFirestore(48)
        setFirestoreStories(stories)
        setLoadingLibrary(false)
    }, [])

    useEffect(() => { refreshLibrary() }, [refreshLibrary])

    // ── Switch to Library tab + refresh (used by auto-switch and View Library button) ──
    const switchToLibrary = useCallback(() => {
        refreshLibrary()
        setTab('library')
    }, [refreshLibrary])

    // ── Auto-switch to Library 3.2 s after pipeline completes ──
    // Delay so Firestore write (non-blocking) has time to settle before we fetch
    useEffect(() => {
        if (prevStageRef.current !== 'complete' && pipeline.stage === 'complete') {
            const t = setTimeout(switchToLibrary, 3200)
            return () => clearTimeout(t)
        }
        prevStageRef.current = pipeline.stage
    }, [pipeline.stage, switchToLibrary])

    // ── Merge Firestore + local Zustand stories (deduplication by id) ──
    const allStories = useMemo(() => {
        const map = new Map()
        firestoreStories.forEach((s) => map.set(s.id, s))
        savedStories.forEach((s) => map.set(s.id, s)) // local has audio — takes priority
        return Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        )
    }, [firestoreStories, savedStories])

    const showEBook = pipeline.stage === 'complete' && pipeline.scenes?.length > 0

    const handleRecordingComplete = useCallback(async (audioBlob) => {
        try { await runPipeline(audioBlob) } catch (e) { console.error('Pipeline:', e) }
    }, [runPipeline])

    // ── Stats ──
    const totalScenes = allStories.reduce((a, s) => a + (s.sceneCount || s.scenes?.length || 0), 0)
    const uniqueLangs = [...new Set(allStories.map((s) => s.language).filter(Boolean))].length

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ minHeight: '100vh', background: 'var(--bg-deep)', paddingTop: '96px', paddingBottom: '80px', position: 'relative', overflow: 'hidden' }}
        >
            {/* ── Atmospheric background ── */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10%', left: '15%', width: '1000px', height: '800px', background: 'radial-gradient(ellipse, rgba(200,164,92,0.1) 0%, transparent 65%)', filter: 'blur(55px)' }} />
                <div style={{ position: 'absolute', bottom: '-8%', right: '-6%', width: '650px', height: '650px', background: 'radial-gradient(circle, rgba(0,229,160,0.05) 0%, transparent 62%)', filter: 'blur(65px)' }} />
                <div style={{ position: 'absolute', top: '45%', left: '-8%', width: '480px', height: '480px', background: 'radial-gradient(circle, rgba(200,164,92,0.05) 0%, transparent 65%)', filter: 'blur(55px)' }} />
                {/* Floating indigenous words */}
                {FLOAT_WORDS.map((word, i) => (
                    <motion.span
                        key={word}
                        style={{
                            position: 'absolute',
                            left: `${6 + (i * 8.1) % 88}%`,
                            top: '100%',
                            fontSize: '10px', fontFamily: 'var(--font-mono)',
                            color: 'rgba(200,164,92,0.06)', letterSpacing: '0.15em',
                            textTransform: 'uppercase', whiteSpace: 'nowrap', userSelect: 'none',
                        }}
                        animate={{ y: '-120vh' }}
                        transition={{ repeat: Infinity, duration: 16 + i * 1.9, delay: i * 1.6, ease: 'linear' }}
                    >
                        {word}
                    </motion.span>
                ))}
            </div>

            <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '0 32px', position: 'relative', zIndex: 1 }}>

                {/* ── Page header ── */}
                <motion.div
                    initial={{ opacity: 0, y: -28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
                    style={{ textAlign: 'center', marginBottom: '52px' }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.88 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.14, duration: 0.5 }}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '6px 18px', borderRadius: '99px', marginBottom: '26px',
                            background: 'rgba(200,164,92,0.07)', border: '1px solid rgba(200,164,92,0.22)',
                            fontSize: '10px', fontWeight: 700, letterSpacing: '0.22em',
                            textTransform: 'uppercase', color: '#c8a45c', fontFamily: 'var(--font-mono)',
                        }}
                    >
                        <Sparkles size={9} />
                        AI-Powered Cultural Preservation · Orang Asli Heritage
                    </motion.div>

                    <h1 style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'clamp(46px, 9vw, 100px)',
                        fontWeight: 900, lineHeight: 0.88, letterSpacing: '-0.03em',
                        color: 'var(--text-primary)', margin: '0 0 28px',
                    }}>
                        The Story
                        <br />
                        <span style={{
                            background: 'linear-gradient(135deg, #f2d882 0%, #c8a45c 45%, #9a7535 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                        }}>
                            Weaver
                        </span>
                    </h1>

                    <p style={{
                        fontSize: 'clamp(14px, 1.6vw, 18px)', color: 'var(--text-secondary)',
                        lineHeight: 1.78, maxWidth: '540px', margin: '0 auto 40px', opacity: 0.82,
                    }}>
                        Speak in your native tongue. AI listens, translates, and illustrates, weaving your words into a bilingual storybook preserved forever for generations.
                    </p>

                    {/* Stats chips */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {[
                            { value: allStories.length, label: 'Stories Archived' },
                            { value: uniqueLangs || 0, label: 'Languages' },
                            { value: totalScenes, label: 'Scenes Created' },
                        ].map(({ value, label }) => (
                            <div key={label} style={{
                                padding: '12px 26px', borderRadius: '16px', textAlign: 'center', minWidth: '116px',
                                background: 'rgba(200,164,92,0.05)', border: '1px solid rgba(200,164,92,0.14)',
                            }}>
                                <div style={{
                                    fontSize: '28px', fontWeight: 800, lineHeight: 1,
                                    color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em',
                                }}>
                                    {value}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.52, marginTop: '5px', letterSpacing: '0.04em' }}>
                                    {label}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* ── Tab Navigation ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22, duration: 0.5 }}
                    style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '48px' }}
                >
                    {[
                        { key: 'create',  label: 'Create Story', icon: Feather  },
                        { key: 'library', label: `Library${allStories.length > 0 ? ` (${allStories.length})` : ''}`, icon: Library },
                    ].map(({ key, label, icon: Icon }) => (
                        <motion.button
                            key={key}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setTab(key)}
                            aria-label={`Switch to ${key === 'create' ? 'Create Story' : 'Library'} tab`}
                            aria-pressed={tab === key}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '12px 0', width: '172px', borderRadius: '16px',
                                fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                                transition: 'all 0.28s ease',
                                border: tab === key ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                background: tab === key ? 'linear-gradient(135deg, #e8c470, #c8a45c)' : 'rgba(255,255,255,0.04)',
                                color: tab === key ? '#070f0b' : 'var(--text-secondary)',
                                boxShadow: tab === key ? '0 6px 26px rgba(200,164,92,0.4)' : 'none',
                            }}
                        >
                            <Icon size={14} />
                            {label}
                        </motion.button>
                    ))}
                </motion.div>

                {/* ── Tab Content ── */}
                <AnimatePresence mode="wait">
                    {tab === 'create' ? (
                        <motion.div
                            key="create"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <CreateSection
                                pipeline={pipeline}
                                isProcessing={isProcessing}
                                showEBook={showEBook}
                                onRecordingComplete={handleRecordingComplete}
                                onNewStory={() => { resetPipeline(); setTab('create') }}
                                onViewLibrary={switchToLibrary}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="library"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <LibrarySection
                                stories={allStories}
                                loading={loadingLibrary}
                                onStoryClick={setSelectedStory}
                                onRefresh={refreshLibrary}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Fullscreen Story Reader overlay ── */}
            <AnimatePresence>
                {selectedStory && (
                    <StoryReaderOverlay
                        key="reader"
                        story={selectedStory}
                        onClose={() => setSelectedStory(null)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ═══════════════════════════════════════════════════════════════════════
// Create Section
// ═══════════════════════════════════════════════════════════════════════
function CreateSection({ pipeline, isProcessing, showEBook, onRecordingComplete, onNewStory, onViewLibrary }) {
    return (
        <AnimatePresence mode="wait">

            {/* ── Idle / Error: Recording Studio ── */}
            {!isProcessing && !showEBook && (
                <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.38 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '64px' }}
                >
                    {/* Error banner */}
                    {pipeline.stage === 'error' && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                width: '100%', maxWidth: '580px',
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '14px 20px', borderRadius: '16px',
                                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)',
                            }}
                        >
                            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444' }}>Pipeline failed</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7 }}>
                                    {pipeline.error || 'An unexpected error occurred. Please try recording again.'}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Recorder card */}
                    <div style={{
                        width: '100%', maxWidth: '580px', margin: '0 auto',
                        borderRadius: '32px',
                        background: 'linear-gradient(160deg, rgba(16,44,24,0.93) 0%, rgba(8,20,12,0.97) 100%)',
                        border: '1px solid rgba(200,164,92,0.18)',
                        backdropFilter: 'blur(26px)',
                        boxShadow: '0 24px 80px rgba(0,0,0,0.48), inset 0 1px 0 rgba(200,164,92,0.12)',
                        overflow: 'hidden',
                    }}>
                        {/* Studio header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '20px 28px', borderBottom: '1px solid rgba(200,164,92,0.08)',
                            background: 'rgba(200,164,92,0.022)',
                        }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0,
                                background: 'linear-gradient(135deg, rgba(0,229,160,0.15), rgba(0,229,160,0.04))',
                                border: '1px solid rgba(0,229,160,0.28)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Mic size={15} style={{ color: 'var(--accent)' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
                                    Story Recorder
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.5, marginTop: '1px' }}>
                                    Speak freely in any indigenous language
                                </div>
                            </div>
                            <div style={{
                                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '4px 13px', borderRadius: '99px',
                                background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.15)',
                            }}>
                                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)' }} />
                                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.1em' }}>Ready</span>
                            </div>
                        </div>

                        {/* AudioRecorder component */}
                        <div style={{ padding: '32px 28px 24px' }}>
                            <AudioRecorder onRecordingComplete={onRecordingComplete} />
                        </div>

                        {/* Cultural wisdom */}
                        <div style={{
                            margin: '0 28px 28px', padding: '13px 18px', borderRadius: '14px',
                            background: 'rgba(200,164,92,0.04)', border: '1px solid rgba(200,164,92,0.11)',
                        }}>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, lineHeight: 1.65, opacity: 0.82 }}>
                                "Every story told is a language kept alive." · Orang Asli wisdom
                            </p>
                        </div>
                    </div>

                    {/* How it works steps */}
                    <div style={{ width: '100%', maxWidth: '940px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <div style={{
                                fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.24em',
                                textTransform: 'uppercase', color: 'var(--accent)', opacity: 0.6, marginBottom: '10px',
                            }}>
                                How It Works
                            </div>
                            <h3 style={{
                                fontFamily: 'var(--font-heading)', fontSize: 'clamp(18px, 2vw, 24px)',
                                fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em',
                            }}>
                                From Voice to Digital Heritage
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                            {HOW_STEPS.map((step, i) => {
                                const Icon = step.icon
                                return (
                                    <motion.div
                                        key={step.title}
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.08 + i * 0.07, duration: 0.45 }}
                                        style={{
                                            padding: '22px 20px', borderRadius: '22px',
                                            background: 'rgba(255,255,255,0.022)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            textAlign: 'center', position: 'relative', overflow: 'hidden',
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute', top: '14px', left: '16px',
                                            fontSize: '10px', fontFamily: 'var(--font-mono)',
                                            color: 'rgba(255,255,255,0.12)', fontWeight: 700,
                                        }}>0{i + 1}</div>
                                        <div style={{
                                            width: '46px', height: '46px', borderRadius: '14px', margin: '0 auto 14px',
                                            background: step.bg, border: `1px solid ${step.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Icon size={19} style={{ color: step.color }} />
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '7px' }}>
                                            {step.title}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.58, opacity: 0.68 }}>
                                            {step.desc}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Processing: Pipeline + Ambient visualization ── */}
            {isProcessing && (
                <motion.div
                    key="processing"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '24px', alignItems: 'start' }}
                >
                    {/* Pipeline progress card */}
                    <div style={{
                        borderRadius: '28px',
                        background: 'linear-gradient(160deg, rgba(16,44,24,0.93) 0%, rgba(8,20,12,0.97) 100%)',
                        border: '1px solid rgba(200,164,92,0.18)',
                        backdropFilter: 'blur(22px)',
                        padding: '32px',
                        boxShadow: '0 18px 65px rgba(0,0,0,0.42)',
                    }}>
                        <PipelineProgress currentStage={pipeline.stage} progress={pipeline.progress} />
                    </div>

                    {/* Atmospheric panel */}
                    <div style={{
                        borderRadius: '28px',
                        background: 'linear-gradient(160deg, rgba(10,28,16,0.72) 0%, rgba(6,16,10,0.82) 100%)',
                        border: '1px solid rgba(200,164,92,0.1)',
                        backdropFilter: 'blur(20px)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '60px 40px', textAlign: 'center',
                        position: 'relative', overflow: 'hidden', minHeight: '440px',
                    }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 60%, rgba(200,164,92,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />

                        {/* Pulsing orb rings */}
                        <div style={{ position: 'relative', width: '160px', height: '160px', marginBottom: '32px' }}>
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    style={{ ...centered, width: '160px', height: '160px', borderRadius: '50%', border: `1px solid rgba(200,164,92,${0.18 - i * 0.04})` }}
                                    animate={{ scale: [1, 1.55 + i * 0.28], opacity: [0.55, 0] }}
                                    transition={{ repeat: Infinity, duration: 2.6, delay: i * 0.72, ease: 'easeOut' }}
                                />
                            ))}
                            <div style={{
                                ...centered, width: '90px', height: '90px', borderRadius: '50%',
                                background: 'rgba(200,164,92,0.09)',
                                border: '1px solid rgba(200,164,92,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}>
                                    <Sparkles size={30} style={{ color: '#c8a45c', opacity: 0.85 }} />
                                </motion.div>
                            </div>
                        </div>

                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
                            Weaving Your Story
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.72, opacity: 0.72, maxWidth: '280px', margin: 0 }}>
                            Transcribing, translating, and illustrating your oral heritage into a permanent digital storybook.
                        </p>

                        {/* Progress percentage */}
                        <div style={{ marginTop: '28px', fontSize: '42px', fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                            <span style={{ background: 'linear-gradient(135deg, #e8c470, #c8a45c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                {Math.round(pipeline.progress)}
                            </span>
                            <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.25)', marginLeft: '2px' }}>%</span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Complete: Success banner + E-book ── */}
            {showEBook && !isProcessing && (
                <motion.div
                    key="complete"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                >
                    {/* Success banner */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            flexWrap: 'wrap', gap: '16px',
                            padding: '18px 28px', borderRadius: '22px',
                            background: 'linear-gradient(135deg, rgba(52,211,153,0.07), rgba(52,211,153,0.03))',
                            border: '1px solid rgba(52,211,153,0.24)',
                            boxShadow: '0 4px 24px rgba(52,211,153,0.06)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
                                background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    Story Preserved to the Archive!
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.62, marginTop: '3px' }}>
                                    Saved to Firestore, now visible in the Cultural Library for everyone
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <motion.button
                                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={onViewLibrary}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '7px',
                                    padding: '10px 22px', borderRadius: '13px',
                                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                <Library size={14} /> View Library
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={onNewStory}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '7px',
                                    padding: '10px 22px', borderRadius: '13px',
                                    background: 'linear-gradient(135deg, #e8c470, #c8a45c)', border: 'none',
                                    color: '#070f0b', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                                    boxShadow: '0 4px 18px rgba(200,164,92,0.38)',
                                }}
                            >
                                <Plus size={14} /> New Story
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* E-book viewer */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18 }}
                        style={{
                            borderRadius: '28px',
                            background: 'linear-gradient(160deg, rgba(14,38,22,0.9) 0%, rgba(8,20,12,0.96) 100%)',
                            border: '1px solid rgba(200,164,92,0.2)',
                            backdropFilter: 'blur(22px)',
                            boxShadow: '0 24px 90px rgba(0,0,0,0.48), inset 0 1px 0 rgba(200,164,92,0.1)',
                            overflow: 'hidden', minHeight: '620px',
                        }}
                    >
                        <EBookViewer
                            scenes={pipeline.scenes}
                            transcription={pipeline.transcription}
                            language={pipeline.language}
                            translations={pipeline.translations}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// ═══════════════════════════════════════════════════════════════════════
// Library Section
// ═══════════════════════════════════════════════════════════════════════
function LibrarySection({ stories, loading, onStoryClick, onRefresh }) {
    const [langFilter, setLangFilter] = useState('all')
    const languages = [...new Set(stories.map((s) => s.language).filter(Boolean))]
    const filtered = langFilter === 'all' ? stories : stories.filter((s) => s.language === langFilter)

    return (
        <div>
            {/* Library header */}
            <div style={{
                display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '16px', marginBottom: '32px',
            }}>
                <div>
                    <div style={{
                        fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.24em',
                        textTransform: 'uppercase', color: 'var(--accent)', opacity: 0.62, marginBottom: '10px',
                    }}>
                        Cultural Heritage
                    </div>
                    <h2 style={{
                        fontFamily: 'var(--font-heading)', fontSize: 'clamp(26px, 3vw, 42px)',
                        fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 7px',
                        letterSpacing: '-0.02em',
                    }}>
                        The Digital Library
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', opacity: 0.6, margin: 0 }}>
                        {stories.length} {stories.length === 1 ? 'story' : 'stories'} preserved
                        {languages.length > 0 && ` · ${languages.length} ${languages.length === 1 ? 'language' : 'languages'}`}
                        {' · visible to everyone'}
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Language filter pills */}
                    {languages.length > 1 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {['all', ...languages].map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => setLangFilter(lang)}
                                    style={{
                                        padding: '6px 16px', borderRadius: '99px',
                                        fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                        transition: 'all 0.22s ease', textTransform: 'capitalize',
                                        border: langFilter === lang ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                        background: langFilter === lang ? 'linear-gradient(135deg, #e8c470, #c8a45c)' : 'rgba(255,255,255,0.04)',
                                        color: langFilter === lang ? '#070f0b' : 'var(--text-secondary)',
                                    }}
                                >
                                    {lang === 'all' ? 'All Languages' : lang}
                                </button>
                            ))}
                        </div>
                    )}
                    {/* Refresh */}
                    <motion.button
                        whileHover={{ scale: 1.06, rotate: 90 }} whileTap={{ scale: 0.94 }}
                        onClick={onRefresh}
                        aria-label="Refresh library"
                        style={{
                            width: '40px', height: '40px', borderRadius: '13px',
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'var(--text-secondary)',
                        }}
                    >
                        <RefreshCw size={14} />
                    </motion.button>
                </div>
            </div>

            {/* Gold rule */}
            <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(200,164,92,0.2), transparent)', marginBottom: '36px' }} />

            {/* Loading skeleton */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {[...Array(8)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.1 }}
                            style={{
                                borderRadius: '22px', overflow: 'hidden',
                                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
                            }}
                        >
                            <div style={{ aspectRatio: '16/10', background: 'rgba(255,255,255,0.03)' }} />
                            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                                <div style={{ height: '14px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)' }} />
                                <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.03)', width: '65%' }} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        textAlign: 'center', padding: '90px 40px',
                        borderRadius: '28px',
                        background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    <div style={{ fontSize: '56px', marginBottom: '18px', opacity: 0.18 }}>📚</div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>
                        {langFilter === 'all' ? 'The Library Awaits Its First Story' : `No ${langFilter} stories yet`}
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', opacity: 0.58, maxWidth: '340px', margin: '0 auto' }}>
                        {langFilter === 'all'
                            ? 'Record your first story in the Create tab to begin building the Cultural Heritage Library.'
                            : `Switch language filter to browse other stories.`
                        }
                    </p>
                </motion.div>
            )}

            {/* Story grid */}
            {!loading && filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filtered.map((story, i) => (
                        <motion.div
                            key={story.id}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.42 }}
                        >
                            <StoryCard story={story} onClick={() => onStoryClick(story)} />
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}
