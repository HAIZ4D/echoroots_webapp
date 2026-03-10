import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Mic, Sparkles, Leaf } from 'lucide-react'
import SectionBadge from '../ui/SectionBadge'

const ringStyle = (pct, extra = {}) => ({
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    margin: 'auto',
    width: `${pct}%`,
    height: `${pct}%`,
    borderRadius: '50%',
    ...extra,
})

const CHIPS = [
    { label: 'Semai', top: '9%', left: '62%', dur: 3.0 },
    { label: 'Temiar', top: '46%', left: '90%', dur: 3.8 },
    { label: 'Jakun', top: '79%', left: '60%', dur: 4.4 },
]

const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.11 } },
}
const itemVariants = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
}

export default function HeroSection() {
    return (
        <section style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            padding: '112px 0 72px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background ambient glows */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 72% 28%, rgba(200,164,92,0.13) 0%, transparent 55%)' }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 18% 75%, rgba(0,229,160,0.04) 0%, transparent 40%)' }} />

            <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '0 40px' }}>
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                    {/* ── Left: Content ── */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        style={{ flex: '0 0 auto', width: 'min(580px, 100%)' }}
                    >
                        {/* Headline */}
                        <motion.h1
                            variants={itemVariants}
                            style={{
                                fontFamily: 'var(--font-heading)',
                                fontSize: 'clamp(36px, 5vw, 74px)',
                                fontWeight: 900,
                                lineHeight: 1.06,
                                letterSpacing: '-0.02em',
                                color: 'var(--text-primary)',
                                margin: '0 0 22px',
                            }}
                        >
                            Echoing{' '}
                            <em className="text-gold-gradient" style={{ fontStyle: 'italic' }}>Ancestral</em>
                            <br />
                            <em className="text-gold-gradient" style={{ fontStyle: 'italic' }}>Voices</em>
                            {' '}into the
                            <br />
                            Digital Future
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.p
                            variants={itemVariants}
                            style={{
                                fontSize: 'clamp(14px, 1.4vw, 17px)',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.8,
                                margin: '0 0 38px',
                                maxWidth: '460px',
                            }}
                        >
                            An AI-powered platform preserving indigenous languages and cultural knowledge through storytelling, interactive wisdom, and pronunciation coaching.
                        </motion.p>

                        {/* CTA buttons */}
                        <motion.div
                            variants={itemVariants}
                            style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '36px' }}
                        >
                            <Link to="/storyweaver" className="no-underline">
                                <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.97 }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '15px 30px',
                                        borderRadius: '14px',
                                        background: 'linear-gradient(135deg, #e8c470 0%, #c8a45c 100%)',
                                        color: 'var(--bg-deep)',
                                        fontWeight: 700, fontSize: '15px',
                                        letterSpacing: '0.01em',
                                        border: 'none', cursor: 'pointer',
                                        boxShadow: '0 6px 28px rgba(200,164,92,0.38), inset 0 1px 0 rgba(255,255,255,0.2)',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <Mic size={18} strokeWidth={2.5} />
                                    Start StoryWeaver
                                    <ArrowRight size={17} />
                                </motion.button>
                            </Link>

                            <Link to="/digital-elder" className="no-underline">
                                <motion.button
                                    whileHover={{ scale: 1.04, borderColor: 'rgba(200,164,92,0.58)' }}
                                    whileTap={{ scale: 0.97 }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '15px 26px',
                                        borderRadius: '14px',
                                        background: 'rgba(255,255,255,0.03)',
                                        backdropFilter: 'blur(12px)',
                                        color: 'var(--text-primary)',
                                        fontWeight: 600, fontSize: '15px',
                                        border: '1.5px solid rgba(200,164,92,0.32)',
                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                    }}
                                >
                                    <Sparkles size={17} style={{ color: 'var(--accent)' }} />
                                    Meet the Elder
                                </motion.button>
                            </Link>
                        </motion.div>

                        {/* Language trust row */}
                        <motion.div
                            variants={itemVariants}
                            style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}
                        >
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.55, letterSpacing: '0.12em', textTransform: 'uppercase', marginRight: '2px' }}>
                                Preserving
                            </span>
                            {['Semai', 'Temiar', 'Jakun'].map((lang) => (
                                <span key={lang} style={{
                                    fontSize: '11px', fontWeight: 600,
                                    padding: '4px 12px', borderRadius: '99px',
                                    background: 'rgba(200,164,92,0.08)',
                                    border: '1px solid rgba(200,164,92,0.22)',
                                    color: 'var(--accent)',
                                    fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                                }}>
                                    {lang}
                                </span>
                            ))}
                        </motion.div>
                    </motion.div>

                    {/* ── Right: Animated Orb ── */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.86 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.1, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="hidden lg:flex items-center justify-center"
                        style={{ flex: 1 }}
                    >
                        <div style={{ position: 'relative', width: '460px', height: '460px' }}>

                            {/* Ambient core glow */}
                            <div style={{ ...ringStyle(42), background: 'radial-gradient(circle, rgba(200,164,92,0.28) 0%, transparent 70%)', filter: 'blur(28px)' }} />

                            {/* Pulse waves */}
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    style={{ ...ringStyle(37), border: '1px solid rgba(200,164,92,0.2)' }}
                                    animate={{ scale: [1, 2.8], opacity: [0.36, 0] }}
                                    transition={{ repeat: Infinity, duration: 4, delay: i * 1.33, ease: 'easeOut' }}
                                />
                            ))}

                            {/* Ring 1 — dashed clockwise, 1 bright dot */}
                            <motion.div
                                style={{ ...ringStyle(58), border: '1px dashed rgba(200,164,92,0.34)' }}
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
                            >
                                <div style={{ position: 'absolute', top: '-5px', left: 'calc(50% - 5px)', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px rgba(200,164,92,0.9), 0 0 22px rgba(200,164,92,0.5)' }} />
                            </motion.div>

                            {/* Ring 2 — gradient arc, counter-clockwise, bright leading dot */}
                            <motion.div
                                style={{
                                    ...ringStyle(76),
                                    border: '1.5px solid transparent',
                                    borderTopColor: 'rgba(200,164,92,0.62)',
                                    borderRightColor: 'rgba(200,164,92,0.2)',
                                    borderBottomColor: 'rgba(200,164,92,0.04)',
                                    borderLeftColor: 'rgba(200,164,92,0.2)',
                                }}
                                animate={{ rotate: -360 }}
                                transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}
                            >
                                <div style={{ position: 'absolute', top: '-7px', left: 'calc(50% - 7px)', width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(200,164,92,0.95)', boxShadow: '0 0 16px rgba(200,164,92,1), 0 0 32px rgba(200,164,92,0.55)' }} />
                            </motion.div>

                            {/* Ring 3 — outermost faint */}
                            <motion.div
                                style={{ ...ringStyle(96), border: '1px dotted rgba(200,164,92,0.1)' }}
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 70, ease: 'linear' }}
                            />

                            {/* Central medallion */}
                            <div style={{
                                ...ringStyle(36),
                                background: 'linear-gradient(145deg, rgba(22,52,32,0.97), rgba(10,26,15,0.99))',
                                border: '1.5px solid rgba(200,164,92,0.42)',
                                boxShadow: '0 0 0 8px rgba(200,164,92,0.05), 0 0 50px rgba(200,164,92,0.14)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column', gap: '10px', zIndex: 10,
                            }}>
                                <Leaf size={38} style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 14px rgba(200,164,92,0.8))' }} />
                                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.8 }}>
                                    EchoRoots
                                </span>
                            </div>

                            {/* Floating language chips */}
                            {CHIPS.map(({ label, top, left, dur }) => (
                                <motion.div
                                    key={label}
                                    style={{
                                        position: 'absolute', top, left,
                                        padding: '5px 13px', borderRadius: '99px',
                                        background: 'rgba(10,26,15,0.92)',
                                        border: '1px solid rgba(200,164,92,0.3)',
                                        fontSize: '11px', fontWeight: 600,
                                        color: 'var(--accent)',
                                        fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                                        backdropFilter: 'blur(12px)', zIndex: 20, whiteSpace: 'nowrap',
                                    }}
                                    animate={{ y: [0, -7, 0] }}
                                    transition={{ repeat: Infinity, duration: dur, ease: 'easeInOut' }}
                                >
                                    {label}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 2.2, duration: 1 }}
                style={{
                    position: 'absolute', bottom: '36px',
                    left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                }}
            >
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Scroll</span>
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    style={{ width: '1px', height: '38px', background: 'linear-gradient(to bottom, rgba(200,164,92,0.65), transparent)' }}
                />
            </motion.div>
        </section>
    )
}
