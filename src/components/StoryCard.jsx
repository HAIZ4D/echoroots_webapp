import { motion } from 'framer-motion'
import { BookOpen, ChevronRight, Globe, Calendar } from 'lucide-react'

export default function StoryCard({ story, onClick }) {
    const { title, language, scenes, createdAt, sceneCount } = story
    const firstScene = scenes?.[0]
    const count = sceneCount || scenes?.length || 0
    const date = createdAt
        ? new Date(createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
        : null

    return (
        <motion.div
            whileHover={{ y: -7, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } }}
            whileTap={{ scale: 0.97 }}
            onClick={onClick}
            style={{
                borderRadius: '22px',
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'linear-gradient(170deg, rgba(14,38,22,0.94) 0%, rgba(8,20,12,0.97) 100%)',
                border: '1px solid rgba(200,164,92,0.16)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 4px 28px rgba(0,0,0,0.32)',
                display: 'flex', flexDirection: 'column',
                height: '100%',
                transition: 'border-color 0.28s ease, box-shadow 0.28s ease',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(200,164,92,0.5)'
                e.currentTarget.style.boxShadow = '0 18px 56px rgba(0,0,0,0.48), 0 0 0 1px rgba(200,164,92,0.1)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(200,164,92,0.16)'
                e.currentTarget.style.boxShadow = '0 4px 28px rgba(0,0,0,0.32)'
            }}
        >
            {/* ── Cover Image ── */}
            <div style={{
                width: '100%', aspectRatio: '16/10',
                position: 'relative', overflow: 'hidden',
                background: 'rgba(8, 20, 12, 0.95)',
                flexShrink: 0,
            }}>
                {firstScene?.imageBase64 ? (
                    <>
                        <img
                            src={`data:${firstScene.imageMimeType || 'image/png'};base64,${firstScene.imageBase64}`}
                            alt={title || 'Story'}
                            style={{
                                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                                transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
                            }}
                            onMouseEnter={(e) => { e.target.style.transform = 'scale(1.08)' }}
                            onMouseLeave={(e) => { e.target.style.transform = 'scale(1)' }}
                        />
                        {/* Gradient overlay — stronger at bottom */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(to top, rgba(8,20,12,0.92) 0%, rgba(8,20,12,0.15) 55%, transparent 100%)',
                        }} />
                    </>
                ) : (
                    <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        background: 'linear-gradient(135deg, rgba(18,46,26,0.9), rgba(8,20,12,0.95))',
                    }}>
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '16px',
                            background: 'rgba(200,164,92,0.08)', border: '1px solid rgba(200,164,92,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <BookOpen size={22} style={{ color: 'var(--accent)', opacity: 0.55 }} />
                        </div>
                        <span style={{
                            fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase',
                            color: 'var(--text-secondary)', opacity: 0.35, fontFamily: 'var(--font-mono)',
                        }}>
                            Illustration Unavailable
                        </span>
                    </div>
                )}

                {/* Scene count badge — top right */}
                <div style={{
                    position: 'absolute', top: '10px', right: '10px',
                    padding: '3px 9px', borderRadius: '7px',
                    background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 700,
                    color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em',
                }}>
                    {count} {count === 1 ? 'scene' : 'scenes'}
                </div>

                {/* Language badge — bottom left overlaid on image */}
                <div style={{
                    position: 'absolute', bottom: '10px', left: '12px',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '4px 11px', borderRadius: '99px',
                    background: 'rgba(200,164,92,0.14)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(200,164,92,0.32)',
                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em',
                    textTransform: 'capitalize', color: '#edd8a4',
                }}>
                    <Globe size={8} />
                    {language || 'Indigenous'}
                </div>
            </div>

            {/* ── Info ── */}
            <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{
                    fontSize: '13px', fontWeight: 700, lineHeight: 1.48,
                    color: 'var(--text-primary)',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', margin: 0, flex: 1,
                }}>
                    {title || 'Untitled Story'}
                </h4>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {date && (
                        <span style={{
                            fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.4,
                            display: 'flex', alignItems: 'center', gap: '4px',
                            fontFamily: 'var(--font-mono)',
                        }}>
                            <Calendar size={9} />
                            {date}
                        </span>
                    )}
                    <div style={{
                        marginLeft: 'auto',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '5px 13px', borderRadius: '99px',
                        background: 'rgba(200,164,92,0.07)',
                        border: '1px solid rgba(200,164,92,0.18)',
                        fontSize: '11px', fontWeight: 600, color: '#c8a45c',
                    }}>
                        Read <ChevronRight size={11} />
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
