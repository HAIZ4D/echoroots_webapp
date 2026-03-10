import { db, storage } from './firebase'
import { collection, doc, setDoc, getDocs, orderBy, query, limit } from 'firebase/firestore'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'

/**
 * Upload a single scene image to Firebase Storage.
 * Returns the public download URL.
 */
async function uploadSceneImage(storyId, sceneNumber, base64, mimeType) {
    const ext = (mimeType || '').includes('png') ? 'png' : 'jpg'
    const storageRef = ref(storage, `stories/${storyId}/scene-${sceneNumber}.${ext}`)
    await uploadString(storageRef, base64, 'base64', { contentType: mimeType || 'image/jpeg' })
    return getDownloadURL(storageRef)
}

/**
 * Save a story to Firestore using the supplied docId so the same UUID is used
 * in both Zustand (local) and Firestore — enabling clean deduplication in the
 * merged library view.
 *
 * Scene images are uploaded to Firebase Storage and stored as download URLs
 * in Firestore — no base64 blobs, no 1 MB document size limit.
 */
export async function saveStoryToFirestore(story, docId) {
    const id = docId || doc(collection(db, 'stories')).id

    // Upload all scene images to Storage in parallel
    const scenes = await Promise.all(
        (story.scenes || []).map(async (scene, i) => {
            let imageUrl = scene.imageUrl || null

            if (scene.imageBase64 && !imageUrl) {
                try {
                    imageUrl = await uploadSceneImage(
                        id,
                        scene.sceneNumber || i + 1,
                        scene.imageBase64,
                        scene.imageMimeType || 'image/jpeg'
                    )
                } catch (err) {
                    console.warn(`[StoryService] Image upload failed for scene ${i + 1}:`, err.message)
                }
            }

            return {
                sceneNumber: scene.sceneNumber || i + 1,
                originalText: scene.originalText || scene.text || '',
                translationEn: scene.translationEn || scene.translation || '',
                translationMs: scene.translationMs || '',
                culturalNote: scene.culturalNote || '',
                imageUrl,          // Storage URL — persists across sessions
                imageMimeType: scene.imageMimeType || 'image/jpeg',
            }
        })
    )

    const firestoreDoc = {
        title: story.title || (story.transcription?.substring(0, 60) || 'Untitled') + '...',
        transcription: story.transcription || '',
        language: story.language || 'unknown',
        translations: story.translations || [],
        sceneCount: scenes.length,
        scenes,
        createdAt: story.createdAt || new Date().toISOString(),
    }

    const ref2 = doc(db, 'stories', id)
    await setDoc(ref2, firestoreDoc)
    return { id, ...firestoreDoc }
}

/**
 * Load the most recent stories from Firestore (newest first).
 */
export async function loadStoriesFromFirestore(limitCount = 48) {
    try {
        const q = query(
            collection(db, 'stories'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        )
        const snap = await getDocs(q)
        return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (e) {
        console.warn('[StoryService] Firestore load failed:', e.message)
        return []
    }
}
