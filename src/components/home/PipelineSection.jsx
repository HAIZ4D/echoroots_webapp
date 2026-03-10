import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Mic, Languages, BookMarked, ArrowRight } from 'lucide-react'

const STEPS = [
    {
        num: '01',
        title: 'Record Oral Story',
        desc: 'Capture authentic emotion and native tongue using the Web Audio API with real-time waveform visualization.',
        icon: Mic,
        tech: ['Web Audio API', 'Waveform'],
        accent: 'rgba(200,164,92,1)',
        accentDim: 'rgba(200,164,92,0.1)',
        accentBorder: 'rgba(200,164,92,0.3)',
    },
    {
        num: '02',
        title: 'AI Transcribe & Translate',
        desc: 'Gemini 2.0 Flash processes the multimodal audio, transcribes the indigenous language, and generates bilingual translations.',
        icon: Languages,
        tech: ['Gemini 2.0 Flash', 'Multi-language'],
        accent: 'rgba(52,211,153,1)',
        accentDim: 'rgba(52,211,153,0.1)',
        accentBorder: 'rgba(52,211,153,0.3)',
    },
    {
        num: '03',
        title: 'Illustrated Storybook',
        desc: 'AI generates culturally-contextual artwork for each scene, narrated with ElevenLabs TTS and assembled into a shareable e-book.',
        icon: BookMarked,
        tech: ['Gemini Image Gen', 'ElevenLabs TTS'],
        accent: 'rgba(251,146,60,1)',
        accentDim: 'rgba(251,146,60,0.1)',
        accentBorder: 'rgba(251,146,60,0.3)',
    },
]

export default function PipelineSection() {
    return (
        <section style={{ position: 'relative', width: '100%', padding: '100px 0' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(to right, transparent, rgba(200,164,92,0.15), transparent)' }} />

            <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '0 40px' }}>

                {/* Section header */}
                <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '16px', opacity: 0.8 }}
                    >
                        How It Works
                    </motion.p>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ delay: 0.08 }}
                        style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: 'clamp(30px, 4vw, 54px)',
                            fontWeight: 700, color: 'var(--text-primary)',
                            margin: '0 0 16px', lineHeight: 1.1,
                        }}
                    >
                        The{' '}
                        <em className="text-gold-gradient" style={{ fontStyle: 'italic', fontWeight: 800 }}>StoryWeaver</em>
                        {' '}Pipeline
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ delay: 0.14 }}
                        style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto', lineHeight: 1.7 }}
                    >
                        A multi-modal AI pipeline that captures fleeting oral traditions and immortalizes them digitally.
                    </motion.p>
                </div>

                {/* Steps */}
                <div style={{ position: 'relative' }}>

                    {/* Connecting dashed line — desktop only */}
                    <div className="hidden lg:block" style={{
                        position: 'absolute',
                        top: '52px',
                        left: 'calc(16.66% + 26px)',
                        right: 'calc(16.66% + 26px)',
                        height: '1px',
                        borderTop: '1px dashed rgba(200,164,92,0.2)',
                        zIndex: 0,
                    }} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {STEPS.map((step, i) => (
                            <motion.div
                                key={step.num}
                                initial={{ opacity: 0, y: 32 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{ delay: i * 0.14, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                                style={{ position: 'relative', zIndex: 1 }}
                            >
                                {/* Step number badge at top — desktop aligns with line */}
                                <div style={{
                                    display: 'flex', justifyContent: 'center', marginBottom: '24px',
                                }}>
                                    <div style={{
                                        position: 'relative',
                                        width: '52px', height: '52px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(145deg, rgba(22,52,32,0.96), rgba(10,26,15,0.99))',
                                        border: `1.5px solid ${step.accentBorder}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: `0 0 20px ${step.accentDim}`,
                                    }}>
                                        <step.icon size={22} color={step.accent} strokeWidth={1.6} />
                                        {/* Step number pill */}
                                        <div style={{
                                            position: 'absolute', top: '-8px', right: '-8px',
                                            fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 700,
                                            padding: '2px 7px', borderRadius: '99px',
                                            background: step.accent, color: 'rgba(10,26,15,0.95)',
                                            letterSpacing: '0.06em',
                                        }}>
                                            {step.num}
                                        </div>
                                    </div>
                                </div>

                                {/* Card */}
                                <div style={{
                                    borderRadius: '20px',
                                    background: 'linear-gradient(160deg, rgba(16,40,22,0.88) 0%, rgba(10,26,15,0.94) 100%)',
                                    border: `1px solid ${step.accentBorder}`,
                                    backdropFilter: 'blur(14px)',
                                    padding: '24px 24px 26px',
                                    position: 'relative', overflow: 'hidden',
                                }}>
                                    {/* Ghost number background */}
                                    <div style={{
                                        position: 'absolute', bottom: '-8px', right: '16px',
                                        fontSize: '72px', fontWeight: 900, lineHeight: 1,
                                        fontFamily: 'var(--font-heading)', letterSpacing: '-0.04em',
                                        color: step.accent, opacity: 0.04,
                                        pointerEvents: 'none', userSelect: 'none',
                                    }}>
                                        {step.num}
                                    </div>

                                    <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
                                        {step.title}
                                    </h4>

                                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 18px' }}>
                                        {step.desc}
                                    </p>

                                    {/* Tech badges */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {step.tech.map((t) => (
                                            <span key={t} style={{
                                                fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 600,
                                                padding: '3px 10px', borderRadius: '99px',
                                                background: step.accentDim,
                                                border: `1px solid ${step.accentBorder}`,
                                                color: step.accent, letterSpacing: '0.06em',
                                            }}>
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '52px', gap: '20px' }}
                >
                    <div style={{ height: '40px', width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(200,164,92,0.4))' }} />
                    <Link to="/storyweaver" className="no-underline">
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '10px',
                                padding: '13px 28px', borderRadius: '14px',
                                background: 'transparent',
                                border: '1.5px solid rgba(200,164,92,0.35)',
                                color: 'var(--accent)',
                                fontWeight: 600, fontSize: '14px',
                                cursor: 'pointer',
                                letterSpacing: '0.02em',
                            }}
                        >
                            Try StoryWeaver
                            <ArrowRight size={16} />
                        </motion.button>
                    </Link>
                </motion.div>
            </div>
        </section>
    )
}
