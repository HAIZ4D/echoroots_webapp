import { useEffect, useRef } from 'react'

export default function ParticleBackground({ count = 15, speed = 0.3, maxOpacity = 0.2 }) {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        let animationId
        const particles = []

        function resize() {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)

        // Create subtle glowing dust motes
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2 + 1,
                vx: (Math.random() - 0.5) * speed,
                vy: -(Math.random() * speed + 0.1), // Gentle drift upward
                baseOpacity: Math.random() * maxOpacity + 0.05,
                blinkRate: Math.random() * 0.01 + 0.005,
                blinkPhase: Math.random() * Math.PI * 2
            })
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            particles.forEach((p) => {
                p.x += p.vx
                p.y += p.vy
                p.blinkPhase += p.blinkRate

                // Wrap around gracefully
                if (p.x < 0) p.x = canvas.width
                if (p.x > canvas.width) p.x = 0
                if (p.y < -10) p.y = canvas.height + 10

                // Subtle firefly pulsing
                const currentOpacity = p.baseOpacity + Math.sin(p.blinkPhase) * 0.1
                const finalOpacity = Math.max(0.01, Math.min(maxOpacity, currentOpacity))

                ctx.beginPath()
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(200, 164, 92, ${finalOpacity})` // Warm Gold (#c8a45c)
                ctx.shadowBlur = 10
                ctx.shadowColor = `rgba(200, 164, 92, ${finalOpacity * 2})`
                ctx.fill()
            })

            animationId = requestAnimationFrame(animate)
        }
        animate()

        return () => {
            cancelAnimationFrame(animationId)
            window.removeEventListener('resize', resize)
        }
    }, [count, speed, maxOpacity])

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-[120vh] pointer-events-none"
            style={{ zIndex: 0 }}
            aria-hidden="true"
        />
    )
}
