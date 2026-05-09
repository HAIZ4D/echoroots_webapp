/**
 * sceneStructureAgent — decides natural scene boundaries.
 *
 * Replaces the old "ALWAYS produce EXACTLY 3 scenes" rule, which forced
 * arbitrary splits on short stories and merged distinct events on long ones.
 * Returns 1-5 scenes based on natural narrative breaks.
 *
 * Critically: each scene's text fields are EXCERPTS from the source/translations.
 * The downstream excerpt validator will regex-check that they actually appear
 * in the source.
 *
 * Input:  { storyText, englishText, malayText, apiKey }
 * Output: {
 *   scenes: [
 *     { sceneNumber, text, translationEn, translationMs, sceneTitle }
 *   ]
 * }
 */

const { getJsonModel, parseJSON } = require('../shared')

const PROMPT = (story, english, malay) => `You are a story editor splitting a recorded oral narrative into a small number of natural scenes for a children's storybook.

Original (source language): "${story}"
English translation: "${english}"
Bahasa Melayu translation: "${malay}"

RULES:
1. Choose between 1 and 5 scenes — whatever feels NATURAL based on narrative breaks. Short stories may be 1-2 scenes. Longer ones up to 5.
2. Each scene's "text" must be an EXACT EXCERPT from the source — do not paraphrase, summarise, or generate new sentences.
3. translationEn and translationMs must be the matching excerpts from the English and Malay translations.
4. sceneTitle is a SHORT 2-4 word label for that scene (used as a chapter heading), in English. Don't quote the source — write a fresh title.
5. The scenes must cover the full story in order, without gaps or overlaps.
6. Do NOT invent details, characters, settings, or events that aren't in the source.

Respond ONLY with JSON of the shape:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "exact excerpt from the source",
      "translationEn": "matching excerpt from English translation",
      "translationMs": "matching excerpt from Malay translation",
      "sceneTitle": "Short Title"
    }
  ]
}`

async function handler({ storyText, englishText, malayText, apiKey }) {
    if (!storyText) {
        return { scenes: [] }
    }

    const model = getJsonModel(apiKey)
    const result = await model.generateContent(PROMPT(storyText, englishText || '', malayText || ''))
    const parsed = parseJSON(result.response.text(), null)

    if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
        // Fallback: one whole-story scene if model fails.
        return {
            scenes: [
                {
                    sceneNumber: 1,
                    text: storyText,
                    translationEn: englishText || '',
                    translationMs: malayText || '',
                    sceneTitle: 'The Story',
                },
            ],
        }
    }

    const scenes = parsed.scenes
        .filter((s) => s && typeof s.text === 'string')
        .slice(0, 5)
        .map((s, i) => ({
            sceneNumber: i + 1,
            text: s.text,
            translationEn: typeof s.translationEn === 'string' ? s.translationEn : '',
            translationMs: typeof s.translationMs === 'string' ? s.translationMs : '',
            sceneTitle: typeof s.sceneTitle === 'string' && s.sceneTitle.trim()
                ? s.sceneTitle.trim().slice(0, 60)
                : `Scene ${i + 1}`,
        }))

    return { scenes }
}

module.exports = { handler }
