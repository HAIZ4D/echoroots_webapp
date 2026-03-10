import { parseVocabTerms } from '../utils/vocabParser'
import VocabHighlight from './VocabHighlight'
import { motion } from 'framer-motion'
import { Volume2, Square, BookOpen } from 'lucide-react'

export default function ChatBubble({ message, onSpeak, isSpeaking }) {
    const { role, text, vocabTerms, sources, timestamp } = message
    const isElder = role === 'elder'

    const segments = parseVocabTerms(text)
    const cleanText = text.replace(/\[([^\]|]+)\|[^\]]+\]/g, '$1')

    return (
        <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={`flex ${isElder ? 'justify-start' : 'justify-end'} mb-5`}
            id={`chat-bubble-${timestamp}`}
            style={{ gap: '10px', alignItems: 'flex-end' }}
        >
            {/* Elder icon — left side */}
            {isElder && (
                <div style={{
                    width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0,
                    background: 'linear-gradient(135deg, rgba(200,164,92,0.2) 0%, rgba(200,164,92,0.05) 100%)',
                    border: '1px solid rgba(200,164,92,0.32)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 10px rgba(200,164,92,0.1)',
                    marginBottom: '2px',
                }}>
                    <BookOpen size={12} color="rgba(200,164,92,0.8)" />
                </div>
            )}

            <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {/* Role label + speak button */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: isElder ? 'flex-start' : 'flex-end',
                    paddingLeft: isElder ? '2px' : '0',
                    paddingRight: isElder ? '0' : '2px',
                }}>
                    <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: isElder ? 'rgba(200,164,92,0.7)' : 'var(--accent)',
                        fontFamily: 'var(--font-mono)',
                    }}>
                        {isElder ? 'Digital Elder' : 'You'}
                    </span>

                    {isElder && onSpeak && (
                        <motion.button
                            whileHover={{ scale: 1.12 }}
                            whileTap={{ scale: 0.88 }}
                            onClick={() => onSpeak(cleanText)}
                            title={isSpeaking ? 'Stop speaking' : 'Hear this message'}
                            style={{
                                background: isSpeaking
                                    ? 'linear-gradient(135deg, rgba(0,229,160,0.16), rgba(0,179,125,0.08))'
                                    : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isSpeaking ? 'rgba(0,229,160,0.38)' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: '6px',
                                padding: '3px 7px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: isSpeaking ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
                                transition: 'all 0.2s ease',
                                flexShrink: 0,
                                boxShadow: isSpeaking ? '0 0 8px rgba(0,229,160,0.12)' : 'none',
                            }}
                        >
                            {isSpeaking
                                ? <><Square size={9} /><span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>Stop</span></>
                                : <Volume2 size={10} />
                            }
                        </motion.button>
                    )}
                </div>

                {/* Bubble body */}
                <div style={{
                    padding: '12px 16px',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: isElder ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
                    ...(isElder ? {
                        background: 'linear-gradient(145deg, rgba(19,46,27,0.88) 0%, rgba(11,30,18,0.94) 100%)',
                        border: '1px solid rgba(200,164,92,0.16)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(200,164,92,0.06)',
                    } : {
                        background: 'linear-gradient(145deg, rgba(0,229,160,0.1) 0%, rgba(0,179,125,0.05) 100%)',
                        border: '1px solid rgba(0,229,160,0.18)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(0,229,160,0.07)',
                    }),
                }}>
                    {/* Speaking shimmer bar */}
                    {isElder && isSpeaking && (
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                            borderRadius: '4px 18px 0 0',
                            background: 'linear-gradient(90deg, transparent 0%, rgba(0,229,160,0.65) 50%, transparent 100%)',
                            animation: 'pulse-glow 1.6s ease-in-out infinite',
                        }} />
                    )}

                    {/* Left accent stripe for elder */}
                    {isElder && (
                        <div style={{
                            position: 'absolute', left: 0, top: '14px', bottom: '14px',
                            width: '2px', borderRadius: '2px',
                            background: isSpeaking
                                ? 'linear-gradient(180deg, rgba(0,229,160,0.5), rgba(0,229,160,0.15))'
                                : 'linear-gradient(180deg, rgba(200,164,92,0.35), rgba(200,164,92,0.05))',
                            transition: 'background 0.4s ease',
                        }} />
                    )}

                    {/* Message text */}
                    <div style={{
                        fontSize: '13.5px',
                        lineHeight: 1.68,
                        color: isElder ? 'rgba(232,228,218,0.88)' : 'var(--text-primary)',
                        paddingLeft: isElder ? '8px' : '0',
                    }}>
                        {segments.map((seg, i) =>
                            seg.type === 'vocab' ? (
                                <VocabHighlight key={i} word={seg.word} meaning={seg.meaning} />
                            ) : (
                                <span key={i}>{seg.content}</span>
                            )
                        )}
                    </div>

                    {/* Vocab chips */}
                    {vocabTerms && vocabTerms.length > 0 && (
                        <div style={{
                            marginTop: '12px',
                            paddingTop: '10px',
                            paddingLeft: isElder ? '8px' : '0',
                            borderTop: '1px solid rgba(200,164,92,0.09)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            alignItems: 'center',
                        }}>
                            <span style={{
                                fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em',
                                textTransform: 'uppercase', color: 'rgba(200,164,92,0.4)',
                                fontFamily: 'var(--font-mono)',
                            }}>
                                vocab
                            </span>
                            {vocabTerms.map((term, i) => (
                                <span key={i} style={{
                                    fontSize: '11px',
                                    padding: '3px 9px',
                                    borderRadius: '20px',
                                    background: 'rgba(200,164,92,0.07)',
                                    border: '1px solid rgba(200,164,92,0.2)',
                                    color: 'rgba(200,164,92,0.82)',
                                    fontFamily: 'var(--font-mono)',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {term.word}
                                    <span style={{ color: 'rgba(200,164,92,0.35)', margin: '0 5px' }}>·</span>
                                    <span style={{ color: 'rgba(232,228,218,0.45)', fontFamily: 'var(--font-body)', fontSize: '10.5px' }}>{term.meaning}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Sources badge */}
                    {sources && sources.length > 0 && (
                        <div style={{
                            marginTop: '9px',
                            paddingLeft: isElder ? '8px' : '0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                        }}>
                            <div style={{
                                width: '4px', height: '4px', borderRadius: '50%',
                                background: 'rgba(200,164,92,0.45)',
                                flexShrink: 0,
                            }} />
                            <span style={{
                                fontSize: '10px',
                                color: 'rgba(200,164,92,0.4)',
                                fontFamily: 'var(--font-mono)',
                                letterSpacing: '0.03em',
                            }}>
                                {sources.length} cultural source{sources.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* User icon — right side */}
            {!isElder && (
                <div style={{
                    width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0,
                    background: 'linear-gradient(135deg, rgba(0,229,160,0.15) 0%, rgba(0,179,125,0.05) 100%)',
                    border: '1px solid rgba(0,229,160,0.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '2px',
                }}>
                    <span style={{ fontSize: '13px', lineHeight: 1 }}>🙏</span>
                </div>
            )}
        </motion.div>
    )
}
