import { db } from './firebase'
import { collection, doc, setDoc, getDocs, orderBy, query, limit } from 'firebase/firestore'

/**
 * Save a story to Firestore using the supplied docId so the same UUID is used
 * in both Zustand (local) and Firestore — enabling clean deduplication in the
 * merged library view.
 *
 * Images are stored inline. If the doc exceeds 850 KB, images are removed from
 * the last scene backwards until it fits inside Firestore's 1 MB limit.
 */
export async function saveStoryToFirestore(story, docId) {
    const scenes = (story.scenes || []).map((scene, i) => ({
        sceneNumber: scene.sceneNumber || i + 1,
        originalText: scene.originalText || scene.text || '',
        translationEn: scene.translationEn || scene.translation || '',
        translationMs: scene.translationMs || '',
        culturalNote: scene.culturalNote || '',
        imageBase64: scene.imageBase64 || null,
        imageMimeType: scene.imageMimeType || 'image/png',
    }))

    const firestoreDoc = {
        title: story.title || (story.transcription?.substring(0, 60) || 'Untitled') + '...',
        transcription: story.transcription || '',
        language: story.language || 'unknown',
        translations: story.translations || [],
        sceneCount: scenes.length,
        scenes,
        createdAt: story.createdAt || new Date().toISOString(),
    }

    // Progressive image removal to stay under 850 KB
    let size = JSON.stringify(firestoreDoc).length
    for (let i = scenes.length - 1; i >= 0 && size > 850_000; i--) {
        firestoreDoc.scenes[i].imageBase64 = null
        size = JSON.stringify(firestoreDoc).length
    }

    const ref = docId
        ? doc(db, 'stories', docId)
        : doc(collection(db, 'stories'))

    await setDoc(ref, firestoreDoc)
    return { id: ref.id, ...firestoreDoc }
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
