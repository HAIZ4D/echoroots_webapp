import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, VenetianMask, MessageSquareHeart, ArrowRight } from 'lucide-react'

const PILLARS = [
    {
        num: '01',
        label: 'Storytelling',
        title: 'StoryWeaver',
        desc: 'Transform spoken folktales into illustrated, bilingual digital storybooks with AI transcription and generative artwork.',
        features: ['AI transcription & translation', 'AI-generated scene illustrations', 'Bilingual e-book with narration'],
        icon: BookOpen,
        accent: 'rgba(200,164,92,1)',
        accentMid: 'rgba(200,164,92,0.55)',
        accentDim: 'rgba(200,164,92,0.1)',
        accentBorder: 'rgba(200,164,92,0.28)',
        to: '/storyweaver',
    },
    {
        num: '02',
        label: 'AI Wisdom',
        title: 'Digital Elder',
        desc: 'A culturally-grounded 3D AI guardian. Ask questions and receive guidance built entirely on verified indigenous knowledge.',
        features: ['RAG cultural knowledge base', '3D avatar with ElevenLabs voice', 'Indigenous vocabulary teaching'],
        icon: VenetianMask,
        accent: 'rgba(52,211,153,1)',
        accentMid: 'rgba(52,211,153,0.55)',
        accentDim: 'rgba(52,211,153,0.1)',
        accentBorder: 'rgba(52,211,153,0.28)',
        to: '/digital-elder',
    },
    {
        num: '03',
        label: 'Language',
        title: 'Pronunciation Lab',
        desc: 'Practice endangered indigenous phrases with AI phonetic coaching and real-time accuracy scoring to build fluency.',
        features: ['Speech recognition scoring', 'Phonetic breakdown & tips', 'Streak-based progress tracking'],
        icon: MessageSquareHeart,
        accent: 'rgba(251,146,60,1)',
        accentMid: 'rgba(251,146,60,0.55)',
        accentDim: 'rgba(251,146,60,0.1)',
        accentBorder: 'rgba(251,146,60,0.28)',
        to: '/pronunciation-lab',
    },
]

export default function ThreePillars() {
    return (
        <section style={{ position: 'relative', width: '100%', padding: '100px 0' }}>
            {/* Top/bottom accent lines */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(to right, transparent, rgba(200,164,92,0.2), transparent)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(to right, transparent, rgba(200,164,92,0.1), transparent)' }} />

            <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '0 40px' }}>

                {/* Section header */}
                <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '16px', opacity: 0.8 }}
                    >
                        What We Offer
                    </motion.p>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ delay: 0.08 }}
                        style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: 'clamp(30px, 4vw, 54px)',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            margin: '0 0 16px',
                            lineHeight: 1.1,
                        }}
                    >
                        Three Pillars of{' '}
                        <em className="text-gold-gradient" style={{ fontStyle: 'italic', fontWeight: 800 }}>Preservation</em>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ delay: 0.14 }}
                        style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.7 }}
                    >
                        Modular AI tools engineered to bridge generations and connect ancient wisdom with modern technology.
                    </motion.p>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {PILLARS.map((pillar, i) => (
                        <motion.div
                            key={pillar.num}
                            initial={{ opacity: 0, y: 36 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ delay: i * 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                            whileHover={{ y: -6, transition: { duration: 0.25 } }}
                            style={{ height: '100%' }}
                        >
                            <Link to={pillar.to} className="no-underline block h-full">
                                <div style={{
                                    position: 'relative',
                                    height: '100%',
                                    borderRadius: '24px',
                                    background: 'linear-gradient(160deg, rgba(16,40,22,0.92) 0%, rgba(10,26,15,0.96) 100%)',
                                    border: `1px solid ${pillar.accentBorder}`,
                                    backdropFilter: 'blur(16px)',
                                    overflow: 'hidden',
                                    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                                    cursor: 'pointer',
                                }}>
                                    {/* Colored top accent bar */}
                                    <div style={{ height: '2px', background: `linear-gradient(90deg, ${pillar.accent}, transparent 70%)` }} />

                                    {/* Ghost number */}
                                    <div style={{
                                        position: 'absolute', top: '16px', right: '20px',
                                        fontSize: '88px', fontWeight: 900, lineHeight: 1,
                                        fontFamily: 'var(--font-heading)', letterSpacing: '-0.04em',
                                        color: pillar.accent, opacity: 0.05,
                                        pointerEvents: 'none', userSelect: 'none',
                                    }}>
                                        {pillar.num}
                                    </div>

                                    <div style={{ padding: '28px 28px 32px' }}>
                                        {/* Icon */}
                                        <div style={{
                                            width: '52px', height: '52px', borderRadius: '16px',
                                            background: pillar.accentDim,
                                            border: `1px solid ${pillar.accentBorder}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            marginBottom: '20px',
                                        }}>
                                            <pillar.icon size={24} color={pillar.accent} strokeWidth={1.5} />
                                        </div>

                                        {/* Label */}
                                        <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase', color: pillar.accent, marginBottom: '8px', opacity: 0.85 }}>
                                            {pillar.label}
                                        </div>

                                        {/* Title */}
                                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
                                            {pillar.title}
                                        </h3>

                                        {/* Description */}
                                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 22px' }}>
                                            {pillar.desc}
                                        </p>

                                        {/* Feature list */}
                                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                                            {pillar.features.map((feat) => (
                                                <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: pillar.accentMid, flexShrink: 0 }} />
                                                    {feat}
                                                </li>
                                            ))}
                                        </ul>

                                        {/* CTA */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: pillar.accent, letterSpacing: '0.04em' }}>
                                            Open Tool
                                            <ArrowRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
