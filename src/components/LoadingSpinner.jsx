import { motion } from 'framer-motion'

export default function LoadingSpinner({ size = 40, text = 'Loading...' }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3" id="loading-spinner">
            <motion.div
                className="rounded-full"
                style={{
                    width: size,
                    height: size,
                    border: '3px solid var(--bg-elevated)',
                    borderTopColor: 'var(--accent)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            {text && (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {text}
                </p>
            )}
        </div>
    )
}
