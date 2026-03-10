import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function GlassCard({
    children,
    accentColor = 'var(--accent)',
    hoverLift = true,
    to = null,
    className = ''
}) {
    const Comp = to ? Link : motion.div
    const motionProps = to ? {} : (hoverLift ? {
        whileHover: { y: -6, transition: { duration: 0.25 } }
    } : {})

    const innerContent = (
        <div className={`relative h-full p-8 rounded-3xl premium-glass group overflow-hidden ${className}`}>
            {/* Top edge colored glow */}
            <div
                className="absolute top-0 left-0 w-full h-[1px] opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
            />

            {/* Ambient Background Gradient (Bottom Up on Hover) */}
            <div
                className="absolute inset-x-0 bottom-0 h-1/2 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-b-3xl pointer-events-none"
                style={{ background: `linear-gradient(to top, ${accentColor}, transparent)` }}
            />

            <div className="relative z-10 w-full h-full flex flex-col">
                {children}
            </div>
        </div>
    )

    if (to) {
        return (
            <motion.div
                whileHover={hoverLift ? { y: -6, transition: { duration: 0.25 } } : {}}
                className="block h-full no-underline"
            >
                <Link to={to} className="block h-full no-underline">
                    {innerContent}
                </Link>
            </motion.div>
        )
    }

    return (
        <Comp {...motionProps} className="block h-full">
            {innerContent}
        </Comp>
    )
}
