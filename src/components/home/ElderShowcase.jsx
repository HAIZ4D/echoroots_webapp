import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Send } from 'lucide-react'

const FEATURES = [
    { text: 'Verified by local Orang Asli elders' },
    { text: 'Speaks with culturally-grounded RAG knowledge' },
    { text: 'Teaches indigenous vocabulary in context' },
    { text: 'Powered by Gemini + ElevenLabs voice' },
]

export default function ElderShowcase() {
    return (
        <section style={{
            position: 'relative', width: '100%', overflow: 'hidden',
            padding: '100px 0',
            background: 'linear-gradient(180deg, transparent 0%, rgba(19,46,27,0.18) 50%, transparent 100%)',
        }}>
            {/* Dot grid */}
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.025, pointerEvents: 'none',
                backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(200,164,92,0.9) 1px, transparent 0)',
                backgroundSize: '38px 38px',
            }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(to right, transparent, rgba(200,164,92,0.15), transparent)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(to right, transparent, rgba(200,164,92,0.1), transparent)' }} />

            <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '0 40px', position: 'relative', zIndex: 10 }}>
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">

                    {/* ── Left: Chat Preview Card ── */}
                    <motion.div
                        initial={{ opacity: 0, x: -32 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full lg:w-1/2 flex items-center justify-center"
                        style={{ position: 'relative' }}
                    >
                        {/* Decorative glow behind card */}
                        <div style={{
                            position: 'absolute',
                            width: '340px', height: '340px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(200,164,92,0.15) 0%, transparent 70%)',
                            filter: 'blur(40px)',
                            pointerEvents: 'none',
                        }} />

                        {/* Rotating ring */}
                        <motion.div
                            style={{
                                position: 'absolute',
                                width: '420px', height: '420px',
                                borderRadius: '50%',
                                border: '1px dashed rgba(200,164,92,0.2)',
                            }}
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
                        />
                        <motion.div
                            style={{
                                position: 'absolute',
                                width: '360px', height: '360px',
                                borderRadius: '50%',
                                border: '1px solid rgba(200,164,92,0.08)',
                            }}
                            animate={{ rotate: -360 }}
                            transition={{ repeat: Infinity, duration: 60, ease: 'linear' }}
                        />

                        {/* Chat interface preview card */}
                        <motion.div
                            whileHover={{ y: -6, transition: { duration: 0.3 } }}
                            style={{
                                position: 'relative', zIndex: 10,
                                width: 'min(380px, 100%)',
                                borderRadius: '24px',
                                background: 'linear-gradient(180deg, rgba(12,30,18,0.96) 0%, rgba(10,26,15,0.98) 100%)',
                                border: '1px solid rgba(200,164,92,0.2)',
                                backdropFilter: 'blur(24px)',
                                boxShadow: '0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(200,164,92,0.1)',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Card header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(200,164,92,0.1)',
                                background: 'rgba(200,164,92,0.03)',
                            }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px rgba(52,211,153,0.7)', flexShrink: 0 }} />
                                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>Digital Elder</span>
                                <div style={{ flex: 1 }} />
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.5, fontFamily: 'var(--font-mono)' }}>Active</span>
                            </div>

                            <div style={{ padding: '20px' }}>
                                {/* User question */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                                    <div style={{
                                        background: 'rgba(200,164,92,0.12)',
                                        border: '1px solid rgba(200,164,92,0.22)',
                                        borderRadius: '16px 16px 4px 16px',
                                        padding: '10px 14px', maxWidth: '82%',
                                    }}>
                                        <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.55 }}>
                                            What does "Kayu Ara" mean in Semai culture?
                                        </p>
                                    </div>
                                </div>

                                {/* Elder response */}
                                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                                    <div style={{
                                        background: 'rgba(19,46,27,0.85)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '4px 16px 16px 16px',
                                        padding: '11px 14px', maxWidth: '88%',
                                    }}>
                                        <div style={{ fontSize: '9px', color: 'var(--accent)', marginBottom: '6px', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                            🌿 Elder
                                        </div>
                                        <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.62 }}>
                                            The "Kayu Ara", sacred fig tree, is revered among the Semai. Its roots anchor ancestral spirits and its shade shelters healing rituals passed down through generations...
                                        </p>
                                        {/* Vocab highlight chip */}
                                        <span style={{
                                            display: 'inline-block', fontSize: '11px', fontWeight: 600,
                                            padding: '2px 10px', borderRadius: '99px',
                                            background: 'rgba(200,164,92,0.12)',
                                            border: '1px solid rgba(200,164,92,0.3)',
                                            color: 'var(--accent)',
                                            fontFamily: 'var(--font-mono)',
                                        }}>
                                            Kayu Ara: sacred fig tree
                                        </span>
                                    </div>
                                </div>

                                {/* Input mock */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '9px 12px',
                                    borderRadius: '14px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(200,164,92,0.15)',
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.07)', width: '55%' }} />
                                    </div>
                                    <div style={{
                                        width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(135deg, #e0ba6e, #c8a45c)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 2px 10px rgba(200,164,92,0.35)',
                                    }}>
                                        <Send size={12} color="rgba(10,26,15,0.9)" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* ── Right: Content ── */}
                    <motion.div
                        initial={{ opacity: 0, x: 32 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full lg:w-1/2"
                    >
                        {/* Eyebrow */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            fontSize: '10px', fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.2em', textTransform: 'uppercase',
                            color: 'var(--accent)', marginBottom: '20px',
                            padding: '5px 14px', borderRadius: '99px',
                            background: 'rgba(200,164,92,0.08)',
                            border: '1px solid rgba(200,164,92,0.22)',
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                            AI Guardian
                        </div>

                        <h2 style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: 'clamp(28px, 3.8vw, 50px)',
                            fontWeight: 700, lineHeight: 1.1,
                            color: 'var(--text-primary)',
                            margin: '0 0 18px',
                        }}>
                            Meet the{' '}
                            <em className="text-gold-gradient" style={{ fontStyle: 'italic', fontWeight: 800 }}>Digital Elder</em>
                        </h2>

                        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.75, margin: '0 0 30px', maxWidth: '440px' }}>
                            An interactive sanctuary of wisdom. Converse with a digital guardian that bridges past and future through authentic indigenous knowledge.
                        </p>

                        {/* Feature checklist */}
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {FEATURES.map((f, i) => (
                                <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: 16 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, margin: '-60px' }}
                                    transition={{ delay: 0.25 + i * 0.08, duration: 0.5 }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', color: 'var(--text-primary)' }}
                                >
                                    <CheckCircle2 size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                    {f.text}
                                </motion.li>
                            ))}
                        </ul>

                        {/* CTA */}
                        <Link to="/digital-elder" className="no-underline">
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.97 }}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '10px',
                                    padding: '15px 32px', borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #e8c470, #c8a45c)',
                                    color: 'var(--bg-deep)', fontWeight: 700, fontSize: '15px',
                                    border: 'none', cursor: 'pointer',
                                    boxShadow: '0 6px 26px rgba(200,164,92,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                                }}
                            >
                                Ask the Elder
                                <ArrowRight size={18} />
                            </motion.button>
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
