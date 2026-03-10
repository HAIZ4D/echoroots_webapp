import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Volume2, Globe, Sparkles, BookOpen, BookMarked } from 'lucide-react'
import AudioPlayer from './AudioPlayer'

export default function EBookViewer({ scenes, transcription, language, translations }) {
    const [currentPage, setCurrentPage] = useState(0)
    if (!scenes || scenes.length === 0) return null

    const scene = scenes[currentPage]
    const totalPages = scenes.length
    // imageUrl: prefer Storage URL (persisted), fall back to in-memory base64 (just created)
    const imageUrl = scene.imageUrl
        || (scene.imageBase64
            ? `data:${scene.imageMimeType || 'image/jpeg'};base64,${scene.imageBase64}`
            : null)
    const lang = (language || 'Indigenous').charAt(0).toUpperCase() + (language || 'Indigenous').slice(1)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* ── Book Header ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 24px 16px',
                borderBottom: '1px solid rgba(200,164,92,0.1)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                        background: 'linear-gradient(135deg, rgba(200,164,92,0.18), rgba(200,164,92,0.05))',
                        border: '1px solid rgba(200,164,92,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <BookOpen size={15} color="#c8a45c" />
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}>
                            Your Cultural Storybook
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', opacity: 0.7 }}>
                            <Globe size={9} />
                            <span style={{ textTransform: 'capitalize' }}>{lang}</span>
                            <span style={{ opacity: 0.5 }}>·</span>
                            <span>{totalPages} Scene{totalPages > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>

                {/* Pill progress dots */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        {scenes.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i)}
                                style={{
                                    width: i === currentPage ? '22px' : '6px',
                                    height: '6px',
                                    borderRadius: '3px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
                                    background: i === currentPage
                                        ? 'linear-gradient(90deg, #e8c470, #c8a45c)'
                                        : 'rgba(255,255,255,0.18)',
                                }}
                                aria-label={`Scene ${i + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Scrollable Page Content ── */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPage}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {/* ── Illustration ── */}
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: 'rgba(10,26,15,0.9)' }}>
                            {imageUrl ? (
                                <>
                                    <motion.img
                                        initial={{ scale: 1.04 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 9, ease: 'linear' }}
                                        src={imageUrl}
                                        alt={`Scene ${currentPage + 1} illustration`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                    {/* Bottom fade */}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, rgba(10,26,15,0.85) 0%, transparent 100%)', pointerEvents: 'none' }} />
                                    {/* Top vignette */}
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 100%)', pointerEvents: 'none' }} />
                                </>
                            ) : (
                                /* Elegant no-image placeholder */
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'linear-gradient(135deg, rgba(18,44,26,0.95), rgba(10,26,15,0.98))' }}>
                                    <div style={{ fontSize: '44px', opacity: 0.15 }}>🌿</div>
                                    <span style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-secondary)', opacity: 0.3, fontFamily: 'var(--font-mono)' }}>
                                        Illustration Unavailable
                                    </span>
                                </div>
                            )}

                            {/* Scene badge — top left */}
                            <div style={{
                                position: 'absolute', top: '14px', left: '16px',
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '5px 12px', borderRadius: '99px',
                                background: 'rgba(0,0,0,0.48)',
                                backdropFilter: 'blur(14px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
                                color: '#e8d5a3',
                            }}>
                                <Sparkles size={10} style={{ color: '#c8a45c' }} />
                                Scene {currentPage + 1}
                            </div>

                            {/* Audio player — overlaid bottom-right */}
                            {(scene.audioUrl || scene.audioBlob) && (
                                <div style={{
                                    position: 'absolute', bottom: '14px', right: '16px',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '5px 14px', borderRadius: '99px',
                                    background: 'rgba(0,0,0,0.52)',
                                    backdropFilter: 'blur(14px)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                }}>
                                    <Volume2 size={12} style={{ color: '#c8a45c' }} />
                                    <AudioPlayer src={scene.audioUrl} blob={scene.audioBlob} minimal />
                                </div>
                            )}
                        </div>

                        {/* ── Story Text ── */}
                        <div style={{ padding: '28px 28px 8px' }}>
                            {/* Language tag */}
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                padding: '3px 11px', borderRadius: '99px', marginBottom: '14px',
                                background: 'rgba(200,164,92,0.08)',
                                border: '1px solid rgba(200,164,92,0.22)',
                                fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em',
                                textTransform: 'uppercase', color: '#c8a45c',
                            }}>
                                <Globe size={9} />
                                Original · {lang}
                            </div>

                            {/* Hero original text */}
                            <blockquote style={{
                                margin: '0 0 24px',
                                padding: '0 0 0 18px',
                                borderLeft: '3px solid rgba(200,164,92,0.45)',
                                fontFamily: 'var(--font-heading)',
                                fontSize: 'clamp(16px, 2.2vw, 22px)',
                                fontWeight: 600,
                                fontStyle: 'italic',
                                lineHeight: 1.65,
                                color: 'var(--text-primary)',
                            }}>
                                {scene.originalText || scene.text || transcription}
                            </blockquote>

                            {/* Decorative rule */}
                            <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(200,164,92,0.25), rgba(200,164,92,0.05) 60%, transparent)', marginBottom: '20px' }} />
                        </div>

                        {/* ── Translations ── */}
                        <div style={{ padding: '0 28px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {/* Bahasa Melayu */}
                            <div style={{
                                padding: '16px 18px', borderRadius: '16px',
                                background: 'rgba(255,255,255,0.022)',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '8px' }}>
                                    🇲🇾 Bahasa Melayu
                                </div>
                                <p style={{ fontSize: '13px', lineHeight: 1.72, color: 'var(--text-primary)', opacity: 0.85, margin: 0 }}>
                                    {scene.translationMs || '—'}
                                </p>
                            </div>

                            {/* English */}
                            <div style={{
                                padding: '16px 18px', borderRadius: '16px',
                                background: 'rgba(255,255,255,0.022)',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '8px' }}>
                                    🇬🇧 English
                                </div>
                                <p style={{ fontSize: '13px', lineHeight: 1.72, color: 'var(--text-primary)', opacity: 0.85, margin: 0 }}>
                                    {scene.translationEn || scene.translation || '—'}
                                </p>
                            </div>
                        </div>

                        {/* ── Cultural Note ── */}
                        {scene.culturalNote && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.18 }}
                                style={{ padding: '0 28px 28px' }}
                            >
                                <div style={{
                                    display: 'flex', gap: '14px', alignItems: 'flex-start',
                                    padding: '16px 18px', borderRadius: '16px',
                                    background: 'rgba(200,164,92,0.05)',
                                    border: '1px solid rgba(200,164,92,0.16)',
                                }}>
                                    <div style={{
                                        flexShrink: 0, width: '30px', height: '30px', borderRadius: '9px',
                                        background: 'rgba(200,164,92,0.1)',
                                        border: '1px solid rgba(200,164,92,0.22)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Sparkles size={13} style={{ color: '#c8a45c' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c8a45c', marginBottom: '6px' }}>
                                            Cultural Context
                                        </div>
                                        <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0 }}>
                                            {scene.culturalNote}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ── Navigation Footer ── */}
            {totalPages > 1 && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(0,0,0,0.18)',
                    backdropFilter: 'blur(8px)',
                    flexShrink: 0,
                }}>
                    <button
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        aria-label="Previous scene"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '7px 16px', borderRadius: '99px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'transparent',
                            color: currentPage === 0 ? 'rgba(255,255,255,0.18)' : 'var(--text-secondary)',
                            fontSize: '12px', fontWeight: 600,
                            cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <ChevronLeft size={14} /> Previous
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BookMarked size={12} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: '0.1em', opacity: 0.6 }}>
                            {currentPage + 1} / {totalPages}
                        </span>
                    </div>

                    <button
                        onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage === totalPages - 1}
                        aria-label={currentPage === totalPages - 1 ? 'End of story' : 'Next scene'}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '7px 16px', borderRadius: '99px',
                            border: currentPage < totalPages - 1 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                            background: currentPage < totalPages - 1 ? 'linear-gradient(135deg, #e8c470, #c8a45c)' : 'transparent',
                            color: currentPage < totalPages - 1 ? 'var(--bg-deep)' : 'rgba(255,255,255,0.18)',
                            fontSize: '12px', fontWeight: 700,
                            cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: currentPage < totalPages - 1 ? '0 2px 12px rgba(200,164,92,0.3)' : 'none',
                        }}
                    >
                        {currentPage === totalPages - 1 ? 'End of Story' : 'Next Scene'} <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    )
}
