import { useState } from 'react'
import { Send, Leaf } from 'lucide-react'

export default function ChatInput({ onSend, disabled = false, placeholder = 'Ask the Digital Elder...' }) {
    const [text, setText] = useState('')
    const [focused, setFocused] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        const trimmed = text.trim()
        if (trimmed && !disabled) {
            onSend(trimmed)
            setText('')
        }
    }

    const isActive = text.trim() && !disabled

    return (
        <form
            onSubmit={handleSubmit}
            id="chat-input-form"
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 6px 6px 10px',
                borderRadius: '36px',
                background: 'rgba(8, 22, 12, 0.92)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: focused
                    ? '1px solid rgba(200,164,92,0.6)'
                    : '1px solid rgba(200,164,92,0.22)',
                boxShadow: focused
                    ? '0 0 0 3px rgba(200,164,92,0.08), 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)'
                    : '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.03)',
                transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                width: '100%',
            }}
        >
            {/* Leaf icon accent */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: focused
                    ? 'rgba(200,164,92,0.15)'
                    : 'rgba(200,164,92,0.07)',
                border: '1px solid rgba(200,164,92,0.2)',
                flexShrink: 0,
                transition: 'background 0.25s ease',
            }}>
                <Leaf size={15} style={{ color: 'var(--accent)', opacity: focused ? 1 : 0.6, transition: 'opacity 0.25s ease' }} />
            </div>

            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                disabled={disabled}
                id="chat-input"
                style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: '14px 12px',
                    fontSize: '15px',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    caretColor: 'var(--accent)',
                }}
            />

            {/* Character count hint */}
            {text.length > 60 && (
                <span style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    opacity: 0.45,
                    flexShrink: 0,
                    paddingRight: '4px',
                    fontFamily: 'var(--font-mono)',
                }}>
                    {text.length}
                </span>
            )}

            {/* Send button */}
            <button
                type="submit"
                disabled={!isActive}
                id="chat-send-btn"
                onMouseEnter={(e) => { if (isActive) e.currentTarget.style.transform = 'scale(1.07)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    border: 'none',
                    cursor: isActive ? 'pointer' : 'default',
                    transition: 'all 0.25s ease',
                    background: isActive
                        ? 'linear-gradient(135deg, #e0ba6e 0%, #c8a45c 100%)'
                        : 'rgba(255,255,255,0.05)',
                    color: isActive ? 'var(--bg-deep)' : 'var(--text-secondary)',
                    opacity: isActive ? 1 : 0.4,
                    boxShadow: isActive
                        ? '0 4px 20px rgba(200,164,92,0.45), inset 0 1px 0 rgba(255,255,255,0.25)'
                        : 'none',
                    transform: 'scale(1)',
                }}
            >
                <Send size={19} style={{ transform: isActive ? 'translate(-1px, 1px)' : 'none', transition: 'transform 0.2s ease' }} />
            </button>
        </form>
    )
}
