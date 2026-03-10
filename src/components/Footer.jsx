import { Link } from 'react-router-dom'
import { Leaf } from 'lucide-react'

export default function Footer() {
    return (
        <footer style={{ position: 'relative', overflow: 'hidden' }}>

            {/* Top divider */}
            <div style={{
                width: '100%', height: '1px',
                background: 'linear-gradient(to right, transparent, rgba(0,229,160,0.18), transparent)',
            }} />

            {/* Ambient glow */}
            <div style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                width: '60%', height: '180px',
                background: 'radial-gradient(ellipse at 50% 100%, rgba(200,164,92,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '52px 40px 36px', gap: '20px', position: 'relative', zIndex: 1,
            }}>

                {/* Inline logo + wordmark */}
                <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                        background: 'linear-gradient(135deg, rgba(200,164,92,0.18), rgba(200,164,92,0.06))',
                        border: '1px solid rgba(200,164,92,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(200,164,92,0.1)',
                    }}>
                        <Leaf size={18} strokeWidth={1.6} style={{ color: '#c8a45c' }} />
                    </div>
                    <span style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '22px', fontWeight: 800, letterSpacing: '0.06em', lineHeight: 1,
                    }}>
                        <span style={{ color: 'var(--text-primary)' }}>ECHO</span>
                        <span style={{
                            background: 'linear-gradient(135deg, #e8c470, #c8a45c)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>ROOTS</span>
                    </span>
                </Link>

                {/* Tagline */}
                <p style={{
                    fontSize: '14px', color: 'var(--text-secondary)', opacity: 0.55,
                    margin: 0, textAlign: 'center', lineHeight: 1.6,
                }}>
                    Echoing ancestral voices into the digital future.
                </p>

                {/* Divider */}
                <div style={{
                    width: '48px', height: '1px',
                    background: 'rgba(200,164,92,0.25)',
                    margin: '4px 0',
                }} />

                {/* Copyright */}
                <p style={{
                    fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.35,
                    margin: 0, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                    textTransform: 'uppercase', textAlign: 'center',
                }}>
                    &copy; 2026 EchoRoots · Orang Asli Cultural Preservation Platform
                </p>
            </div>
        </footer>
    )
}
