import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import AvatarCanvas from '../components/AvatarCanvas'
import ChatBubble from '../components/ChatBubble'
import ChatInput from '../components/ChatInput'
import useAppStore from '../stores/appStore'
import { queryKnowledgeBase } from '../services/rag'
import { speak, stopSpeaking, warmupAudio } from '../services/avatar'
import { StopCircle, MessageCircle, Leaf, Sparkles, BookOpen } from 'lucide-react'

const pageTransition = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
}

const SUGGESTED = [
    { q: 'What plant treats headaches in Semai tradition?', icon: Leaf },
    { q: 'Tell me a Semai folktale', icon: BookOpen },
    { q: 'How do Temiar people greet each other?', icon: MessageCircle },
    { q: 'What is the significance of the blowpipe?', icon: Sparkles },
]

// Centered absolute element using inset-0 + margin:auto (avoids transform conflicts with Framer Motion)
const ringStyle = (pct, extra = {}) => ({
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    margin: 'auto',
    width: `${pct}%`,
    height: `${pct}%`,
    borderRadius: '50%',
    ...extra,
})

export default function DigitalElder() {
    const { chatMessages, addChatMessage, setAvatarReady, avatarSpeaking, setAvatarSpeaking } = useAppStore()
    const [isThinking, setIsThinking] = useState(false)
    const [speakingText, setSpeakingText] = useState(null)
    const chatEndRef = useRef(null)
    const avatarRef = useRef(null)

    const scrollToBottom = useCallback(() => {
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }, [])

    const handleAvatarReady = useCallback((instance) => {
        avatarRef.current = instance
        setAvatarReady(true)
    }, [setAvatarReady])

    const handleSend = useCallback(async (question) => {
        // Warm up AudioContext NOW — while this click gesture is still active.
        // speak() is called only after the async RAG query finishes (3–10s later),
        // by which point browsers consider the gesture "stale" and reject resume().
        await warmupAudio(avatarRef.current)
        addChatMessage({ role: 'user', text: question })
        scrollToBottom()
        setIsThinking(true)
        try {
            const result = await queryKnowledgeBase(question)
            addChatMessage({ role: 'elder', text: result.answer, vocabTerms: result.vocabTerms, sources: result.sources })
            scrollToBottom()
            if (avatarRef.current) {
                try {
                    const cleanText = result.answer.replace(/\[([^\]|]+)\|[^\]]+\]/g, '$1')
                    setAvatarSpeaking(true)
                    setSpeakingText(cleanText)
                    await speak(avatarRef.current, cleanText)
                } catch (err) {
                    console.warn('Avatar speech failed:', err)
                } finally {
                    setAvatarSpeaking(false)
                    setSpeakingText(null)
                }
            }
        } catch (error) {
            console.error('RAG query failed:', error)
            addChatMessage({ role: 'elder', text: 'I apologize, but I encountered difficulty accessing the cultural archives. Please try again.' })
            scrollToBottom()
        } finally {
            setIsThinking(false)
        }
    }, [addChatMessage, scrollToBottom, setAvatarSpeaking])

    const handleStopSpeaking = useCallback(() => {
        if (avatarRef.current) {
            stopSpeaking(avatarRef.current)
            setAvatarSpeaking(false)
            setSpeakingText(null)
        }
    }, [setAvatarSpeaking])

    const handleReplaySpeech = useCallback(async (cleanText) => {
        if (!avatarRef.current) return
        await warmupAudio(avatarRef.current)
        // If already speaking this message, stop it
        if (speakingText === cleanText) {
            handleStopSpeaking()
            return
        }
        // Stop any current speech before starting new one
        stopSpeaking(avatarRef.current)
        try {
            setAvatarSpeaking(true)
            setSpeakingText(cleanText)
            await speak(avatarRef.current, cleanText)
        } catch (err) {
            console.warn('Avatar replay failed:', err)
        } finally {
            setAvatarSpeaking(false)
            setSpeakingText(null)
        }
    }, [speakingText, handleStopSpeaking, setAvatarSpeaking])

    return (
        <motion.div
            {...pageTransition}
            style={{
                minHeight: '100vh',
                background: 'var(--bg-deep)',
                paddingTop: '96px',
                paddingBottom: '48px',
                position: 'relative',
            }}
            id="digital-elder-page"
        >
            {/* Ambient radial glow — left side tinted */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '55%', height: '70vh',
                background: 'radial-gradient(ellipse at 20% 20%, rgba(200,164,92,0.09) 0%, transparent 65%)',
                pointerEvents: 'none', zIndex: 0,
            }} />
            <div style={{
                position: 'absolute', top: 0, right: 0, width: '45%', height: '50vh',
                background: 'radial-gradient(ellipse at 80% 10%, rgba(0,229,160,0.04) 0%, transparent 60%)',
                pointerEvents: 'none', zIndex: 0,
            }} />

            {/* ── Page Header (compact) ── */}
            <motion.div
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{ textAlign: 'center', padding: '0 24px', marginBottom: '32px', position: 'relative', zIndex: 10 }}
            >
                <h1 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, margin: 0 }}>
                    Digital <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Elder</em>
                </h1>
                <p style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-secondary)', opacity: 0.8 }}>
                    Enter the sanctuary of ancestral wisdom
                </p>
            </motion.div>

            {/* ── Main two-column layout ── */}
            <div
                className="flex flex-col lg:flex-row items-center justify-center"
                style={{
                    maxWidth: '1500px',
                    margin: '0 auto',
                    padding: '0 40px',
                    gap: '60px',
                    position: 'relative',
                    zIndex: 10,
                }}
            >
                {/* ══ LEFT COLUMN: Avatar + Aura ══ */}
                <motion.div
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center justify-center w-full"
                    style={{ flex: 1, minWidth: 0 }}
                >
                    {/* Aura + avatar ring container */}
                    <div
                        style={{
                            position: 'relative',
                            width: 'min(640px, 100%)',
                            aspectRatio: '1/1',
                        }}
                    >
                        {/* Inner ambient glow */}
                        <div style={ringStyle(44, {
                            background: 'radial-gradient(circle, rgba(200,164,92,0.25) 0%, transparent 70%)',
                            filter: 'blur(35px)',
                        })} />

                        {/* Pulse waves — expand outward, speed up when speaking */}
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                style={ringStyle(50, { border: '1px solid rgba(200,164,92,0.25)' })}
                                animate={{ scale: [1, 2.8], opacity: [0.4, 0] }}
                                transition={{
                                    repeat: Infinity,
                                    duration: avatarSpeaking ? 1.6 : 3.2,
                                    delay: i * (avatarSpeaking ? 0.52 : 1.06),
                                    ease: 'easeOut',
                                }}
                            />
                        ))}

                        {/* Ring 1 — dashed, clockwise, 2 orbiting dots */}
                        <motion.div
                            style={ringStyle(63, { border: '1px dashed rgba(200,164,92,0.38)' })}
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
                        >
                            <div style={{
                                position: 'absolute', top: '-5px', left: 'calc(50% - 5px)',
                                width: '10px', height: '10px', borderRadius: '50%',
                                background: 'var(--accent)',
                                boxShadow: '0 0 10px rgba(200,164,92,0.9), 0 0 22px rgba(200,164,92,0.5)',
                            }} />
                            <div style={{
                                position: 'absolute', bottom: '-3px', left: 'calc(50% - 3px)',
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: 'rgba(200,164,92,0.38)',
                            }} />
                        </motion.div>

                        {/* Ring 2 — gradient arc, counter-clockwise, super-bright dot */}
                        <motion.div
                            style={ringStyle(77, {
                                border: '1.5px solid transparent',
                                borderTopColor: 'rgba(200,164,92,0.65)',
                                borderRightColor: 'rgba(200,164,92,0.22)',
                                borderBottomColor: 'rgba(200,164,92,0.04)',
                                borderLeftColor: 'rgba(200,164,92,0.22)',
                            })}
                            animate={{ rotate: -360 }}
                            transition={{ repeat: Infinity, duration: 22, ease: 'linear' }}
                        >
                            <div style={{
                                position: 'absolute', top: '-6px', left: 'calc(50% - 6px)',
                                width: '12px', height: '12px', borderRadius: '50%',
                                background: 'var(--accent-light)',
                                boxShadow: '0 0 14px rgba(200,164,92,1), 0 0 28px rgba(200,164,92,0.65), 0 0 50px rgba(200,164,92,0.3)',
                            }} />
                        </motion.div>

                        {/* Ring 3 — dotted, slow clockwise, 4 marker dots */}
                        <motion.div
                            style={ringStyle(90, { border: '1px dotted rgba(200,164,92,0.12)' })}
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 45, ease: 'linear' }}
                        >
                            {[
                                { top: '-4px', left: 'calc(50% - 4px)' },
                                { top: 'calc(50% - 4px)', right: '-4px' },
                                { bottom: '-4px', left: 'calc(50% - 4px)' },
                                { top: 'calc(50% - 4px)', left: '-4px' },
                            ].map((pos, j) => (
                                <div key={j} style={{
                                    position: 'absolute', width: '8px', height: '8px', borderRadius: '50%',
                                    background: `rgba(200,164,92,${0.2 + j * 0.06})`,
                                    ...pos,
                                }} />
                            ))}
                        </motion.div>

                        {/* Ring 4 — outermost faint arcs, counter-clockwise */}
                        <motion.div
                            style={ringStyle(98, {
                                border: '1px solid transparent',
                                borderTopColor: 'rgba(200,164,92,0.07)',
                                borderBottomColor: 'rgba(200,164,92,0.07)',
                            })}
                            animate={{ rotate: -360 }}
                            transition={{ repeat: Infinity, duration: 80, ease: 'linear' }}
                        />

                        {/* ── Avatar circle — centered, clips 3D canvas ── */}
                        {/*
                            We size the circle at 56% (wider than before) and use
                            an inner wrapper that is taller than the circle so we
                            can shift the rendered 3D head into the visual center.
                            Negative marginTop pulls the canvas upward so the face
                            (upper portion of the TalkingHead viewport) lands in the
                            center of the clipping circle.
                        */}
                        <div style={{
                            ...ringStyle(56),
                            overflow: 'hidden',
                            zIndex: 10,
                            boxShadow: '0 0 0 2px rgba(200,164,92,0.5), 0 0 60px rgba(200,164,92,0.15), 0 0 0 6px rgba(200,164,92,0.06)',
                        }}>
                            {/* Shift canvas up so the face aligns to circle center */}
                            <div style={{ width: '100%', height: '130%', marginTop: '-15%' }}>
                                <AvatarCanvas onReady={handleAvatarReady} onError={() => setAvatarReady(false)} />
                            </div>
                        </div>
                    </div>

                    {/* Status pill — overlaps bottom of aura */}
                    <div
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '6px 14px', borderRadius: '99px',
                            marginTop: '-18px',
                            background: 'rgba(10,26,15,0.94)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: '1px solid rgba(200,164,92,0.24)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                            position: 'relative', zIndex: 20,
                        }}
                    >
                        <div style={{ position: 'relative', width: '8px', height: '8px', flexShrink: 0 }}>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent)' }} />
                            <div className="animate-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent)', opacity: 0.6 }} />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--accent-light)', whiteSpace: 'nowrap' }}>
                            {avatarSpeaking ? 'Speaking' : 'Active'}
                        </span>
                        {avatarSpeaking && (
                            <button
                                onClick={handleStopSpeaking}
                                style={{ marginLeft: '2px', cursor: 'pointer', color: 'var(--text-secondary)', background: 'none', border: 'none', padding: 0, display: 'flex' }}
                                title="Stop speaking"
                                aria-label="Stop elder from speaking"
                            >
                                <StopCircle size={13} />
                            </button>
                        )}
                    </div>

                    {/* Elder name tag below pill */}
                    <p style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.55, letterSpacing: '0.06em', textAlign: 'center' }}>
                        Orang Asli Cultural Keeper
                    </p>
                </motion.div>

                {/* ══ RIGHT COLUMN: Chat Panel ══ */}
                <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                    {/* Panel container */}
                    <div style={{
                        borderRadius: '28px',
                        border: '1px solid rgba(200,164,92,0.16)',
                        background: 'linear-gradient(180deg, rgba(10,26,15,0.85) 0%, rgba(15,37,24,0.78) 100%)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        boxShadow: '0 8px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(200,164,92,0.08)',
                        overflow: 'hidden',
                        flex: 1,
                    }}>
                        {/* Panel header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '16px 22px',
                            borderBottom: '1px solid rgba(200,164,92,0.1)',
                            background: 'rgba(200,164,92,0.03)',
                        }}>
                            <div style={{
                                width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                                background: 'linear-gradient(135deg, rgba(200,164,92,0.22), rgba(200,164,92,0.06))',
                                border: '1px solid rgba(200,164,92,0.35)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Leaf size={15} color="var(--accent)" />
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                                    Ancestral Wisdom
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.6 }}>
                                    Powered by cultural knowledge base
                                </div>
                            </div>
                            <div style={{ flex: 1 }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px rgba(52,211,153,0.6)' }} />
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Online</span>
                            </div>
                        </div>

                        {/* Scrollable messages */}
                        <div
                            className="overflow-y-auto"
                            id="chat-messages"
                            style={{ minHeight: '320px', maxHeight: '52vh', padding: '22px' }}
                        >
                            {/* Empty / welcome state */}
                            {chatMessages.length === 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4px' }}>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px', textAlign: 'center', fontStyle: 'italic', opacity: 0.85 }}>
                                        What wisdom do you seek today?
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', width: '100%' }}>
                                        {SUGGESTED.map((item, i) => (
                                            <motion.button
                                                key={i}
                                                whileHover={{ scale: 1.025, y: -3 }}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => handleSend(item.q)}
                                                style={{
                                                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                                                    padding: '16px',
                                                    borderRadius: '18px',
                                                    background: 'linear-gradient(135deg, rgba(19,46,27,0.95) 0%, rgba(10,26,15,0.98) 100%)',
                                                    border: '1px solid rgba(200,164,92,0.18)',
                                                    cursor: 'pointer', textAlign: 'left',
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(200,164,92,0.07)',
                                                    transition: 'all 0.25s ease',
                                                }}
                                            >
                                                <div style={{
                                                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                                                    background: 'radial-gradient(circle, rgba(200,164,92,0.2) 0%, rgba(200,164,92,0.04) 100%)',
                                                    border: '1px solid rgba(200,164,92,0.38)',
                                                    boxShadow: '0 0 14px rgba(200,164,92,0.1)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <item.icon size={15} color="var(--accent)" />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '9px', color: 'var(--accent)', opacity: 0.7, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: '5px' }}>
                                                        Suggested
                                                    </div>
                                                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 500 }}>
                                                        {item.q}
                                                    </span>
                                                </div>
                                                <div style={{
                                                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, marginTop: '8px',
                                                    border: '1px solid rgba(200,164,92,0.22)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                                                        <path d="M5 12H19M13 6l6 6-6 6" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
                                                    </svg>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {chatMessages.map((msg, i) => (
                                <ChatBubble
                                    key={i}
                                    message={msg}
                                    onSpeak={msg.role === 'elder' ? handleReplaySpeech : undefined}
                                    isSpeaking={msg.role === 'elder' && speakingText === msg.text.replace(/\[([^\]|]+)\|[^\]]+\]/g, '$1')}
                                />
                            ))}

                            {/* Thinking indicator */}
                            {isThinking && (
                                <div className="flex justify-start mb-4">
                                    <div style={{
                                        padding: '12px 20px', borderRadius: '18px', borderBottomLeftRadius: '4px',
                                        background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.05)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {[0, 1, 2].map((j) => (
                                                    <motion.div
                                                        key={j}
                                                        style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)' }}
                                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                                        transition={{ repeat: Infinity, duration: 1.2, delay: j * 0.2 }}
                                                    />
                                                ))}
                                            </div>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                Consulting the ancestors...
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>
                    </div>

                    {/* Chat Input */}
                    <ChatInput onSend={handleSend} disabled={isThinking} />
                </motion.div>
            </div>
        </motion.div>
    )
}
