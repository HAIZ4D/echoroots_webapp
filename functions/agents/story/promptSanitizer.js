/**
 * promptSanitizerAgent — strips invented cultural specifics from an image
 * prompt before it's sent to the image generator.
 *
 * Why: even with a strict composer prompt, models sometimes inject named
 * deities, specific rituals, named tribal sub-groups, or invented
 * ceremonies. Those become visible cultural inaccuracies in the rendered
 * image. This agent removes them.
 *
 * No LLM call — uses a curated denylist of cultural-specific terms that
 * should not appear in image prompts unless they're in the scene text.
 *
 * Input:  { imagePrompt, sceneText, sceneTranslationEn }
 * Output: { cleanedPrompt, removedTerms: [string] }
 */

// Cultural-specific terms commonly hallucinated by Gemini for "Orang Asli" prompts.
// If one of these appears in the prompt but NOT in the scene text/translation,
// it is removed. Keep this list short and conservative — over-stripping makes
// prompts generic and bland.
const SUSPECT_TERMS = [
    // Specific ritual / spiritual names
    'gunik', 'halaq', 'tok batin', 'shaman', 'spirit medium', 'spirit dance',
    'ancestor spirits', 'sewang', 'genggulang', 'jinjang', 'puyang',
    // Named ceremonies / events
    'harvest festival', 'wedding ceremony', 'birth ritual', 'death ritual',
    'rain dance', 'spirit ceremony', 'blessing ceremony',
    // Specific weapons / objects (only suspect when not in source)
    'sumpit', 'blowpipe', 'parang', 'tumbuk lada',
    // Generic stereotype phrases
    'tribal dance', 'mystical ritual', 'ancient prophecy', 'sacred totem',
    'tribal chant', 'mystical chanting', 'tribal mask',
]

function termInScene(term, haystacks) {
    const t = term.toLowerCase()
    return haystacks.some((h) => (h || '').toLowerCase().includes(t))
}

function stripTerm(prompt, term) {
    // Remove the term and a small surrounding fragment up to the next punctuation,
    // but keep the structure of the sentence intact.
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b[^.,;]*`, 'gi')
    return prompt.replace(re, '').replace(/\s+/g, ' ').replace(/\s+([,.;])/g, '$1').trim()
}

function handler({ imagePrompt, sceneText = '', sceneTranslationEn = '' }) {
    if (!imagePrompt || typeof imagePrompt !== 'string') {
        return { cleanedPrompt: '', removedTerms: [] }
    }

    const haystacks = [sceneText, sceneTranslationEn]
    const lower = imagePrompt.toLowerCase()
    const removed = []
    let cleaned = imagePrompt

    for (const term of SUSPECT_TERMS) {
        if (lower.includes(term) && !termInScene(term, haystacks)) {
            cleaned = stripTerm(cleaned, term)
            removed.push(term)
        }
    }

    // If sanitisation left the prompt very short, append the standard suffix.
    if (cleaned.length < 40) {
        cleaned +=
            ' Warm watercolor digital illustration, Southeast Asian tropical rainforest, soft golden light, earth tones, culturally respectful, no text in image.'
    }

    return { cleanedPrompt: cleaned.trim().slice(0, 800), removedTerms: removed }
}

module.exports = { handler }
