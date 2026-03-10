/**
 * Convert an audio Blob to a base64-encoded string.
 */
export async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1]
            resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

/**
 * Convert a base64 string to a Blob.
 */
export function base64ToBlob(base64, mimeType = 'audio/webm') {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
}

/**
 * Create an object URL from a base64 string and mime type.
 */
export function base64ToObjectUrl(base64, mimeType = 'image/png') {
    const blob = base64ToBlob(base64, mimeType)
    return URL.createObjectURL(blob)
}

/**
 * Format seconds as mm:ss.
 */
export function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Get audio duration from a Blob.
 */
export function getAudioDuration(blob) {
    return new Promise((resolve) => {
        const audio = new Audio()
        audio.src = URL.createObjectURL(blob)
        audio.onloadedmetadata = () => {
            resolve(audio.duration)
            URL.revokeObjectURL(audio.src)
        }
        audio.onerror = () => {
            resolve(0)
            URL.revokeObjectURL(audio.src)
        }
    })
}
