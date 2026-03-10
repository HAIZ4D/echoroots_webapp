import { useEffect, useRef } from 'react'
import { motion, useInView, useSpring, useTransform } from 'framer-motion'

export default function AnimatedCounter({ 
    target, 
    label, 
    suffix = '', 
    duration = 2 
}) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-50px" })
    
    const springValue = useSpring(0, {
        stiffness: 40,
        damping: 20,
        restDelta: 0.001
    })

    const displayValue = useTransform(springValue, (latest) => 
        Math.floor(latest).toLocaleString()
    )

    useEffect(() => {
        if (isInView && typeof target === 'number') {
            springValue.set(target)
        }
    }, [isInView, target, springValue])

    return (
        <div ref={ref} className="flex flex-col items-center justify-center p-6 text-center">
            <div className="text-5xl md:text-6xl font-bold mb-2 flex items-baseline justify-center">
                {typeof target === 'number' ? (
                    <motion.span>{displayValue}</motion.span>
                ) : (
                    <span>{target}</span>
                )}
                {suffix && <span className="text-[var(--accent)] ml-1">{suffix}</span>}
            </div>
            {label && (
                <p className="text-sm md:text-base text-[var(--text-secondary)] font-medium max-w-[150px] mx-auto leading-tight">
                    {label}
                </p>
            )}
        </div>
    )
}
