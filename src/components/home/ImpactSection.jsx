import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import AnimatedCounter from '../ui/AnimatedCounter'

const STATS = [
    { target: 500, suffix: '+', label: 'Languages at risk\nacross Southeast Asia' },
    { target: 3,   suffix: '',  label: 'Orang Asli tribes\nbeing documented' },
    { target: '∞', suffix: '',  label: 'Stories worth\npreserving forever' },
]

export default function ImpactSection() {
    return (
        <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-surface)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(to right, transparent, rgba(200,164,92,0.25), transparent)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(to bottom, rgba(10,26,15,0.4), transparent)', pointerEvents: 'none' }} />

            {/* Ambient dot grid */}
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.018, pointerEvents: 'none',
                backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(200,164,92,1) 1px, transparent 0)',
                backgroundSize: '44px 44px',
            }} />

            <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '80px 40px' }}>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {STATS.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ delay: i * 0.12, duration: 0.6 }}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                padding: '32px 24px', textAlign: 'center',
                                borderRight: i < 2 ? '1px solid rgba(200,164,92,0.12)' : 'none',
                            }}
                        >
                            <AnimatedCounter target={stat.target} suffix={stat.suffix} duration={2.2} />
                            <p style={{
                                fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55,
                                marginTop: '6px', maxWidth: '140px', whiteSpace: 'pre-line',
                            }}>
                                {stat.label}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(200,164,92,0.15), transparent)', margin: '16px 0 64px' }} />

                {/* Mission statement */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.8 }}
                    style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto' }}
                >
                    {/* Quote marks */}
                    <div style={{ fontSize: '56px', lineHeight: 0.8, color: 'rgba(200,164,92,0.25)', fontFamily: 'Georgia, serif', marginBottom: '8px' }}>
                        "
                    </div>
                    <p style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'clamp(18px, 2.4vw, 28px)',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        lineHeight: 1.55,
                        letterSpacing: '-0.01em',
                        margin: '0 0 12px',
                        fontStyle: 'italic',
                    }}>
                        Every word, every whispered story, every cultural tradition deserves a chance to
                        {' '}<em className="text-gold-gradient" style={{ fontStyle: 'normal', fontWeight: 700 }}>echo through time</em>.
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.55, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '40px' }}>
                        EchoRoots Mission
                    </p>

                    {/* Final CTA */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                        <Link to="/storyweaver" className="no-underline">
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.97 }}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '10px',
                                    padding: '15px 32px', borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #e8c470, #c8a45c)',
                                    color: 'var(--bg-deep)', fontWeight: 700, fontSize: '15px',
                                    border: 'none', cursor: 'pointer',
                                    boxShadow: '0 6px 28px rgba(200,164,92,0.36), inset 0 1px 0 rgba(255,255,255,0.2)',
                                }}
                            >
                                Begin Preserving Today
                                <ArrowRight size={18} />
                            </motion.button>
                        </Link>
                        <Link to="/digital-elder" className="no-underline">
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.97 }}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    padding: '15px 26px', borderRadius: '14px',
                                    background: 'transparent',
                                    border: '1.5px solid rgba(200,164,92,0.3)',
                                    color: 'var(--text-secondary)', fontWeight: 600, fontSize: '15px',
                                    cursor: 'pointer',
                                }}
                            >
                                Explore Features
                            </motion.button>
                        </Link>
                    </div>
                </motion.div>
            </div>

            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(to top, rgba(10,26,15,0.3), transparent)', pointerEvents: 'none' }} />
        </section>
    )
}
