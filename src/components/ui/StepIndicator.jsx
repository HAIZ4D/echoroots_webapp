import { motion } from 'framer-motion'

export default function StepIndicator({ steps, currentStage }) {
    const activeIndex = steps.findIndex(s => s.key === currentStage)
    
    return (
        <div className="flex items-center justify-between w-full max-w-3xl mx-auto mb-12 relative">
            {/* Connecting Line */}
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[rgba(200,164,92,0.1)] -translate-y-1/2 -z-10" />
            
            {steps.map((step, i) => {
                const isActive = step.key === currentStage
                const isComplete = i < activeIndex || currentStage === 'complete'
                const isPending = !isActive && !isComplete

                return (
                    <div key={step.key} className="flex flex-col items-center relative">
                        <motion.div 
                            initial={false}
                            animate={{ 
                                scale: isActive ? 1.2 : 1,
                                borderColor: isActive || isComplete ? 'var(--accent)' : 'rgba(200,164,92,0.2)',
                                backgroundColor: isComplete ? 'var(--accent)' : 'var(--bg-deep)'
                            }}
                            className="w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 backdrop-blur-md transition-colors duration-500"
                        >
                            {isComplete ? (
                                <span className="text-[var(--bg-deep)] font-bold">✓</span>
                            ) : (
                                <span className={`text-xs font-bold ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                                    {i + 1}
                                </span>
                            )}
                            
                            {isActive && (
                                <motion.div 
                                    layoutId="active-glow"
                                    className="absolute inset-[-4px] rounded-full border border-[var(--accent)] opacity-50"
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                />
                            )}
                        </motion.div>
                        <span className={`absolute -bottom-7 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                            {step.label}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
