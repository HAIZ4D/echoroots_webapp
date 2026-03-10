import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import EBookViewer from './EBookViewer'

export default function StoryReaderOverlay({ story, onClose }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handler)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handler)
            document.body.style.overflow = ''
        }
    }, [onClose])

    if (!story) return null

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
                background: 'rgba(3, 8, 5, 0.93)',
                backdropFilter: 'blur(28px)',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            {/* Ambient background glow */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse at 50% 35%, rgba(200,164,92,0.07) 0%, transparent 60%)',
            }} />

            {/* Close button */}
            <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.18, duration: 0.3 }}
                whileHover={{ scale: 1.08, background: 'rgba(255,255,255,0.14)' }}
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                style={{
                    position: 'absolute', top: '20px', right: '20px', zIndex: 10,
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--text-primary)',
                    transition: 'background 0.2s',
                }}
            >
                <X size={18} />
            </motion.button>

            {/* Book container */}
            <motion.div
                initial={{ opacity: 0, y: 28, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 28, scale: 0.95 }}
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    width: '100%', maxWidth: '880px',
                    height: '88vh',
                    borderRadius: '28px',
                    background: 'linear-gradient(160deg, rgba(12,32,18,0.97) 0%, rgba(6,16,10,0.99) 100%)',
                    border: '1px solid rgba(200,164,92,0.24)',
                    boxShadow: '0 50px 130px rgba(0,0,0,0.7), inset 0 1px 0 rgba(200,164,92,0.1)',
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative',
                }}
            >
                {/* Corner glow */}
                <div style={{
                    position: 'absolute', top: 0, right: 0, width: '250px', height: '250px',
                    background: 'radial-gradient(circle at top right, rgba(200,164,92,0.06) 0%, transparent 65%)',
                    pointerEvents: 'none',
                }} />
                <EBookViewer
                    scenes={story.scenes}
                    transcription={story.transcription}
                    language={story.language}
                    translations={story.translations}
                />
            </motion.div>
        </motion.div>
    )
}
