import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import LoadingSpinner from './LoadingSpinner'
import { disposeAvatar } from '../services/avatar.js'

export default function AvatarCanvas({ onReady, onError }) {
    const containerRef = useRef(null)
    // headRef tracks the live instance for cleanup — NOT React state.
    // React state closures capture the value at effect-creation time (null),
    // so a cleanup using state would never see the loaded instance.
    const headRef = useRef(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let disposed = false

        async function loadAvatar() {
            if (!containerRef.current) return

            try {
                const { initAvatar } = await import('../services/avatar.js')

                const head = await initAvatar(containerRef.current, {
                    onProgress: (ev) => {
                        console.log('Avatar loading progress:', ev)
                    },
                })

                if (!disposed) {
                    headRef.current = head
                    setLoading(false)
                    onReady?.(head)
                } else {
                    // Component unmounted while avatar was still loading — dispose immediately
                    disposeAvatar(head)
                }
            } catch (err) {
                console.error('Avatar failed to load:', err)
                if (!disposed) {
                    setError(err.message)
                    setLoading(false)
                    onError?.(err)
                }
            }
        }

        loadAvatar()

        return () => {
            disposed = true
            // disposeAvatar stops the animation loop, releases WebGL context,
            // closes AudioContext, and resets module-level state (talkingHeadInstance,
            // idleEnabled). Without this, the old TalkingHead keeps running and
            // interferes with the next page's avatar (WebGL/audio resource conflicts).
            if (headRef.current) {
                disposeAvatar(headRef.current)
                headRef.current = null
            }
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div
            className="relative w-full h-full rounded-2xl overflow-hidden"
            style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid rgba(255,255,255,0.05)',
                minHeight: '400px',
            }}
            id="avatar-canvas"
        >
            {/* 3D Avatar Container */}
            <div
                ref={containerRef}
                className="w-full h-full"
                style={{ display: error ? 'none' : 'block' }}
            />

            {/* Loading State */}
            {loading && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <LoadingSpinner text="Loading Digital Elder avatar..." />
                    <p className="text-xs mt-4" style={{ color: 'var(--text-secondary)' }}>
                        This may take a moment...
                    </p>
                </div>
            )}

            {/* Error / Fallback State */}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                    >
                        {/* Fallback avatar illustration */}
                        <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center" style={{
                            background: 'linear-gradient(135deg, rgba(0,229,160,0.15), rgba(0,179,125,0.1))',
                            border: '2px solid var(--vocab-border)',
                        }}>
                            <span className="text-5xl">👴</span>
                        </div>
                        <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                            Digital Elder
                        </h4>
                        <p className="text-xs max-w-xs" style={{ color: 'var(--text-secondary)' }}>
                            3D avatar requires TalkingHead.js and a GLB model.
                            The elder is still here to share wisdom through text.
                        </p>
                    </motion.div>
                </div>
            )}

            {/* Avatar active indicator */}
            {!loading && !error && (
                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full glass">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        Digital Elder Active
                    </span>
                </div>
            )}
        </div>
    )
}
