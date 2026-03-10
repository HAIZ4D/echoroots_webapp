import { useState, useRef, useEffect } from 'react'
import { formatDuration } from '../utils/audioUtils'

export default function AudioPlayer({ src, blob, label = 'Audio' }) {
    const audioRef = useRef(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const blobUrlRef = useRef(null)

    // Create blob URL once per blob instance, revoke on blob change or unmount
    useEffect(() => {
        if (blob) {
            blobUrlRef.current = URL.createObjectURL(blob)
        }
        return () => {
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current)
                blobUrlRef.current = null
            }
        }
    }, [blob])

    const audioSrc = src || blobUrlRef.current

    const togglePlay = () => {
        if (!audioRef.current) return
        if (isPlaying) {
            audioRef.current.pause()
        } else {
            audioRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
        }
    }

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration)
        }
    }

    const handleEnded = () => setIsPlaying(false)

    const handleSeek = (e) => {
        if (audioRef.current && duration) {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const pct = x / rect.width
            audioRef.current.currentTime = pct * duration
        }
    }

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    if (!audioSrc) return null

    return (
        <div
            className="flex items-center gap-3 px-4 py-2 rounded-xl"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
            id="audio-player"
        >
            <audio
                ref={audioRef}
                src={audioSrc}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
            />

            {/* Play/Pause */}
            <button
                onClick={togglePlay}
                className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
                style={{
                    background: 'var(--accent)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--bg-deep)',
                }}
            >
                {isPlaying ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                    </svg>
                )}
            </button>

            {/* Progress bar */}
            <div
                className="flex-1 h-1.5 rounded-full cursor-pointer relative"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                onClick={handleSeek}
            >
                <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }}
                />
            </div>

            {/* Time */}
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {formatDuration(currentTime) || '0:00'} / {formatDuration(duration) || '0:00'}
            </span>
        </div>
    )
}
