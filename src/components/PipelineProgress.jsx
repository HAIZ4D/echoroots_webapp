import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Languages, SplitSquareHorizontal, Paintbrush, Mic, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react'

const STAGES = [
    { key: 'transcribing', label: 'Transcribing Audio', icon: FileText, desc: 'Listening to the elder\'s voice' },
    { key: 'translating', label: 'Cultural Translation', icon: Languages, desc: 'Preserving meaning across languages' },
    { key: 'splitting', label: 'Scene Splitting', icon: SplitSquareHorizontal, desc: 'Structuring the narrative flow' },
    { key: 'illustrating', label: 'AI Illustration', icon: Paintbrush, desc: 'Envisioning the world' },
    { key: 'narrating', label: 'Voice Synthesis', icon: Mic, desc: 'Breathing life into words' },
    { key: 'assembling', label: 'Assembling E-Book', icon: BookOpen, desc: 'Binding the digital pages' },
    { key: 'complete', label: 'Archive Complete', icon: CheckCircle2, desc: 'Story successfully preserved' },
]

export default function PipelineProgress({ currentStage, progress = 0 }) {
    const activeIndex = STAGES.findIndex((s) => s.key === currentStage)

    if (currentStage === 'idle' || currentStage === 'recording') return null

    return (
        <div className="w-full max-w-md mx-auto relative" id="pipeline-progress">

            {/* Header */}
            <div className="flex justify-between items-end mb-8 relative z-10">
                <div>
                    <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                        Weaving Progress
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Transforming oral history into digital heritage
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-light tracking-tighter" style={{ color: 'var(--accent)' }}>
                        {Math.round(progress)}<span className="text-sm text-white/40 ml-1">%</span>
                    </span>
                </div>
            </div>

            {/* Overall progress bar minimal */}
            <div className="h-1 w-full rounded-full mb-8 relative overflow-hidden bg-white/5">
                <motion.div
                    className="absolute top-0 left-0 bottom-0 rounded-full"
                    style={{ background: 'linear-gradient(90deg, var(--accent), var(--success))' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
            </div>

            {/* Vertical Stepper */}
            <div className="space-y-4 relative z-10">
                {/* Vertical connecting line */}
                <div className="absolute left-6 top-8 bottom-8 w-px bg-white/5 -z-10" />

                {STAGES.map((stage, index) => {
                    const isActive = stage.key === currentStage
                    const isComplete = index < activeIndex
                    const isPending = index > activeIndex

                    const Icon = stage.icon

                    return (
                        <motion.div
                            key={stage.key}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{
                                opacity: isPending ? 0.3 : 1,
                                x: 0,
                                scale: isActive ? 1.02 : 1
                            }}
                            transition={{ delay: index * 0.05, duration: 0.4 }}
                            className="flex items-center gap-4 p-3 rounded-2xl transition-colors relative overflow-hidden"
                            style={{
                                backgroundColor: isActive ? 'rgba(217, 119, 6, 0.05)' : 'transparent',
                                border: isActive ? '1px solid rgba(217, 119, 6, 0.2)' : '1px solid transparent',
                            }}
                        >
                            {/* Active background glow */}
                            {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/10 to-transparent opacity-50 pointer-events-none" />
                            )}

                            {/* Status Icon */}
                            <div className="relative flex-shrink-0 z-10 w-12 h-12 flex items-center justify-center">
                                {/* Base circle */}
                                <div
                                    className="absolute inset-0 rounded-full transition-colors duration-500"
                                    style={{
                                        border: isComplete ? 'none' : isActive ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                                        backgroundColor: isComplete ? 'var(--success)' : isActive ? 'var(--bg-deep)' : 'var(--bg-surface)'
                                    }}
                                />

                                {/* Active pulsing ring */}
                                {isActive && (
                                    <motion.div
                                        className="absolute inset-[-4px] rounded-full border border-[var(--accent)]/30"
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                )}

                                {/* Icon itself */}
                                <div className="relative z-10" style={{ color: isComplete ? 'var(--bg-deep)' : isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                                    {isComplete ? <CheckCircle2 size={20} className="stroke-[3px]" /> : <Icon size={20} />}
                                </div>
                            </div>

                            {/* Text Content */}
                            <div className="flex-1 min-w-0 relative z-10">
                                <h4
                                    className="text-sm font-bold tracking-wide transition-colors duration-300"
                                    style={{ color: isActive ? 'var(--accent)' : isComplete ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                                >
                                    {stage.label}
                                </h4>

                                <AnimatePresence mode="wait">
                                    {(isActive || isComplete) && (
                                        <motion.p
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="text-xs mt-1 leading-relaxed opacity-80"
                                            style={{ color: isComplete ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                                        >
                                            {stage.desc}
                                            {isActive && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Error state */}
            <AnimatePresence>
                {currentStage === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="mt-8 px-6 py-4 rounded-2xl flex items-start gap-3 premium-glass-strong"
                        style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}
                    >
                        <AlertCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <h4 className="text-sm font-bold" style={{ color: 'var(--danger)' }}>Pipeline Interrupted</h4>
                            <p className="text-xs mt-1 opacity-80" style={{ color: 'var(--text-primary)' }}>
                                The weaver encountered an anomaly. Please attempt to re-record or consult the spirits (check logs).
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
