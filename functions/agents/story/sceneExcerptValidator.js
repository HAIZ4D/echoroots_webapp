/**
 * sceneExcerptValidatorAgent — verifies that each scene's text actually
 * appears (verbatim or near-verbatim) in the source narrative.
 *
 * No LLM call — pure regex + token-overlap heuristic. Cheap and fast.
 *
 * If a scene's text doesn't appear in the source, the scene is REPAIRED
 * by replacing its text with a sliced segment of the source proportional
 * to the scene's index (rather than dropping the whole pipeline).
 *
 * Input:  { scenes, originalText, englishText, malayText }
 * Output: { scenes, warnings: [string] }
 */

function normalize(s) {
    return (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function tokenSet(s) {
    return new Set(normalize(s).split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1))
}

function overlapRatio(a, b) {
    const A = tokenSet(a)
    const B = tokenSet(b)
    if (A.size === 0 || B.size === 0) return 0
    let hits = 0
    for (const t of A) if (B.has(t)) hits += 1
    return hits / A.size
}

function sliceSegment(source, sceneIndex, totalScenes) {
    if (!source) return ''
    if (totalScenes <= 1) return source
    const len = source.length
    const start = Math.floor((sceneIndex / totalScenes) * len)
    const end = Math.floor(((sceneIndex + 1) / totalScenes) * len)
    return source.slice(start, end).trim()
}

function handler({ scenes = [], originalText = '', englishText = '', malayText = '' }) {
    const warnings = []
    const total = scenes.length || 1

    const repaired = scenes.map((scene, i) => {
        const source = normalize(originalText)
        const sceneText = normalize(scene.text)

        let text = scene.text
        let translationEn = scene.translationEn
        let translationMs = scene.translationMs

        // Direct substring check first (cheapest, most reliable).
        const exact = source.includes(sceneText) && sceneText.length > 0
        const overlap = exact ? 1 : overlapRatio(scene.text, originalText)

        if (!exact && overlap < 0.5) {
            warnings.push(`Scene ${i + 1} text not found in source (overlap=${overlap.toFixed(2)}); repaired with source slice.`)
            text = sliceSegment(originalText, i, total) || scene.text
            translationEn = sliceSegment(englishText, i, total) || translationEn
            translationMs = sliceSegment(malayText, i, total) || translationMs
        } else {
            // For translation excerpts, only repair if they're empty.
            if (!translationEn || translationEn.trim().length < 4) {
                translationEn = sliceSegment(englishText, i, total) || translationEn || ''
            }
            if (!translationMs || translationMs.trim().length < 4) {
                translationMs = sliceSegment(malayText, i, total) || translationMs || ''
            }
        }

        return {
            ...scene,
            text,
            translationEn,
            translationMs,
        }
    })

    return { scenes: repaired, warnings }
}

module.exports = { handler }
