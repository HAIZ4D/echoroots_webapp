import { motion } from 'framer-motion'
import { RotateCcw, ChevronRight, Lightbulb } from 'lucide-react'

const SEGMENTS = 24

function getSegmentColor(idx) {
    const pct = (idx / SEGMENTS) * 100
    if (pct < 28) return '#ef4444'
    if (pct < 52) return '#f97316'
    if (pct < 73) return '#f59e0b'
    return '#00e5a0'
}

function getRating(score) {
    if (score >= 85) return { label: 'Excellent', color: '#00e5a0' }
    if (score >= 70) return { label: 'Good', color: '#f59e0b' }
    if (score >= 50) return { label: 'Fair', color: '#f97316' }
    return { label: 'Keep Trying', color: '#ef4444' }
}

export default function PronunciationMeter({ score = 0, transcribed, feedback, tips = [], onRetry, onNext }) {
    const normalizedScore = Math.min(Math.max(score, 0), 100)
    const filledCount = Math.round((normalizedScore / 100) * SEGMENTS)
    const { label, color } = getRating(normalizedScore)

    return (
        <motion.div
            id="pronunciation-meter"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
                borderRadius: '24px',
                background: 'linear-gradient(160deg, rgba(16,40,22,0.92) 0%, rgba(10,26,15,0.96) 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                padding: '36px',
                backdropFilter: 'blur(16px)',
            }}
        >
            {/* Score + Rating Row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '18px', marginBottom: '24px' }}>
                <motion.span
                    style={{
                        fontSize: '80px',
                        fontWeight: 800,
                        lineHeight: 1,
                        color,
                        fontFamily: 'var(--font-heading)',
                        letterSpacing: '-0.04em',
                    }}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 180, damping: 14 }}
                >
                    {Math.round(normalizedScore)}
                </motion.span>
                <div style={{ paddingBottom: '12px' }}>
                    <div style={{
                        fontSize: '12px', color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginBottom: '4px',
                    }}>
                        / 100 pts
                    </div>
                    <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        style={{
                            fontSize: '18px', fontWeight: 700, color,
                            fontFamily: 'var(--font-heading)',
                        }}
                    >
                        {label}
                    </motion.div>
                </div>
            </div>

            {/* VU Meter Bar — segmented */}
            <div style={{ marginBottom: '28px' }}>
                <div style={{
                    display: 'flex', gap: '3px',
                    height: '32px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                }}>
                    {Array.from({ length: SEGMENTS }).map((_, i) => {
                        const isFilled = i < filledCount
                        const segColor = getSegmentColor(i)
                        return (
                            <motion.div
                                key={i}
                                style={{
                                    flex: 1,
                                    borderRadius: '3px',
                                    backgroundColor: isFilled ? segColor : 'rgba(255,255,255,0.05)',
                                    boxShadow: isFilled ? `0 0 8px ${segColor}55` : 'none',
                                }}
                                initial={{ scaleY: 0, opacity: 0 }}
                                animate={{ scaleY: 1, opacity: 1 }}
                                transition={{
                                    delay: isFilled ? 0.2 + i * 0.022 : 0.2,
                                    duration: 0.28,
                                    ease: 'easeOut',
                                }}
                            />
                        )
                    })}
                </div>
                {/* Scale labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '7px', padding: '0 2px' }}>
                    {['0', '25', '50', '75', '100'].map((v) => (
                        <span key={v} style={{
                            fontSize: '9px', color: 'var(--text-secondary)', opacity: 0.45,
                            fontFamily: 'var(--font-mono)',
                        }}>
                            {v}
                        </span>
                    ))}
                </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '24px' }} />

            {/* Transcribed — what AI actually heard */}
            {transcribed && (
                <div style={{
                    marginBottom: '18px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                }}>
                    <span style={{
                        fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em',
                        textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
                        display: 'block', marginBottom: '5px',
                    }}>
                        AI heard
                    </span>
                    <span style={{
                        fontSize: '13px', fontFamily: 'var(--font-mono)',
                        color: transcribed === '[SILENCE]' ? '#ef4444' : 'var(--text-secondary)',
                        fontStyle: transcribed === '[SILENCE]' ? 'normal' : 'italic',
                    }}>
                        {transcribed}
                    </span>
                </div>
            )}

            {/* Feedback */}
            {feedback && (
                <p style={{
                    fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.72,
                    marginBottom: tips && tips.length > 0 ? '20px' : '24px',
                    opacity: 0.85,
                }}>
                    {feedback}
                </p>
            )}

            {/* Tips */}
            {tips && tips.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        marginBottom: '12px',
                        fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.16em',
                        textTransform: 'uppercase', color: 'rgba(200,164,92,0.75)',
                    }}>
                        <Lightbulb size={11} />
                        Tips for improvement
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {tips.map((tip, i) => (
                            <motion.li
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 + i * 0.1 }}
                                style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                                    fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
                                }}
                            >
                                <span style={{ color: 'rgba(200,164,92,0.6)', marginTop: '3px', flexShrink: 0, fontSize: '16px', lineHeight: 1 }}>›</span>
                                {tip}
                            </motion.li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Actions */}
            {(onRetry || onNext) && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {onRetry && (
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={onRetry}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                padding: '11px 22px', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            <RotateCcw size={14} />
                            Try Again
                        </motion.button>
                    )}
                    {onNext && (
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={onNext}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                padding: '11px 22px', borderRadius: '12px',
                                background: 'linear-gradient(135deg, #e8c470, #c8a45c)',
                                border: 'none',
                                color: 'rgba(10,26,15,0.95)', fontSize: '13px', fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(200,164,92,0.32)',
                            }}
                        >
                            Next Phrase
                            <ChevronRight size={14} />
                        </motion.button>
                    )}
                </div>
            )}
        </motion.div>
    )
}
