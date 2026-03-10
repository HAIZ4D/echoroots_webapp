import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function VocabHighlight({ word, meaning }) {
    const [showTooltip, setShowTooltip] = useState(false)

    return (
        <span
            className="vocab-highlight relative inline-block"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
        >
            {word}

            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg shadow-xl pointer-events-none whitespace-nowrap"
                        style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--vocab-border)',
                        }}
                    >
                        <div className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
                            {word}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-primary)' }}>
                            {meaning}
                        </div>
                        {/* Arrow */}
                        <div
                            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                            style={{
                                borderLeft: '5px solid transparent',
                                borderRight: '5px solid transparent',
                                borderTop: '5px solid var(--bg-elevated)',
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </span>
    )
}
