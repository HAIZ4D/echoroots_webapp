/**
 * imagePromptComposerAgent — generates a culturally-respectful image prompt
 * for ONE scene, grounded in the scene's text only.
 *
 * The composer is told to describe ONLY visual content present in the scene
 * text. The downstream PromptSanitizer strips any cultural specifics that
 * slip through.
 *
 * Input:  { sceneText, sceneTranslationEn, sceneTitle, language, apiKey }
 * Output: { imagePrompt }
 */

const { getJsonModel, parseJSON } = require('../shared')

const PROMPT = (sceneText, englishText, sceneTitle, language) => `You write image-generation prompts for a children's storybook scene.

SCENE CONTENT:
- Title: "${sceneTitle}"
- Original text: "${sceneText}"
- English meaning: "${englishText}"
- Source language: ${language || 'an Orang Asli language'}

TASK: Write ONE vivid visual prompt for an illustrator. The image will accompany this scene in the storybook.

STRICT RULES:
1. Describe ONLY what is visually present in the scene text. Do NOT add named rituals, deities, characters, dances, or events that are not in the text.
2. Use only generic visual descriptors: people, gestures, expressions, the natural setting (forest, river, hut, fire), time of day, weather, mood.
3. Style direction is fixed: "warm watercolor digital illustration, Southeast Asian tropical rainforest, soft golden light, earth tones, culturally respectful, no text in image".
4. Maximum 60 words for the scene description (excluding the fixed style suffix).
5. If the scene text is too abstract to visualise, default to "an Orang Asli elder telling a story by a forest hut at golden hour".

Respond ONLY with JSON of the shape:
{
  "imagePrompt": "Vivid visual description of the scene, then the fixed style suffix."
}`

async function handler({ sceneText, sceneTranslationEn, sceneTitle, language, apiKey }) {
    if (!sceneText && !sceneTranslationEn) {
        return {
            imagePrompt:
                'An Orang Asli elder telling a story by a forest hut at golden hour. Warm watercolor digital illustration, Southeast Asian tropical rainforest, soft golden light, earth tones, culturally respectful, no text in image.',
        }
    }

    const model = getJsonModel(apiKey)
    const result = await model.generateContent(
        PROMPT(sceneText || '', sceneTranslationEn || '', sceneTitle || '', language)
    )
    const parsed = parseJSON(result.response.text(), null)

    const fallback =
        'An Orang Asli person in a tropical rainforest setting. Warm watercolor digital illustration, Southeast Asian tropical rainforest, soft golden light, earth tones, culturally respectful, no text in image.'

    if (!parsed || typeof parsed.imagePrompt !== 'string' || parsed.imagePrompt.trim().length < 10) {
        return { imagePrompt: fallback }
    }

    return { imagePrompt: parsed.imagePrompt.trim().slice(0, 800) }
}

module.exports = { handler }
