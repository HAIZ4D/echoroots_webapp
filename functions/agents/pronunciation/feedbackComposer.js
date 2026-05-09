/**
 * feedbackComposerAgent — generates user-friendly feedback + tips, GROUNDED in
 * the deterministic alignment from phonemeAligner.
 *
 * The prompt explicitly tells the model the score is fixed (computed from edit
 * distance, not its opinion), and that its job is to describe WHY that score
 * was given — what specific sounds were wrong, missing, or extra.
 *
 * This kills the old behaviour where the model praised silent recordings or
 * fabricated phoneme analysis.
 *
 * Input:  { transcribed, reference, score, summary, alignment, language, apiKey }
 * Output: { feedback, tips: [string] }
 */

const { getJsonModel, parseJSON } = require('../shared')

function bandLabel(score) {
    if (score >= 90) return 'near-native'
    if (score >= 70) return 'good with minor errors'
    if (score >= 50) return 'recognisable but with clear errors'
    if (score >= 25) return 'partially correct'
    return 'mostly incorrect'
}

const PROMPT = ({ transcribed, reference, score, summary, language }) => `You write pronunciation feedback for a learner of ${language || 'an indigenous language'}.

THE SCORE IS FIXED. Do NOT invent a different score. Do NOT inflate praise to soften it.

INPUTS (these are the TRUTH — work from them):
- Reference (target): "${reference}"
- What learner said:  "${transcribed}"
- Score: ${score}/100  (band: ${bandLabel(score)})
- Substitutions: ${summary.substitutions}  (sounds said wrong)
- Missing letters:  "${summary.missing || '(none)'}"
- Extra letters:    "${summary.extra || '(none)'}"

TASK:
Write 1-2 sentences of FEEDBACK that:
- Honestly reflect the score band. Score under 50 means real errors — say so directly.
- Mention SPECIFIC differences from the inputs above. Refer to actual letters/sounds.
- Do NOT use generic platitudes like "great effort!" on scores under 70.
- Do NOT mention things not visible in the inputs.

Then write 2-3 short TIPS that are concrete and actionable, based on the actual mismatches.

Special cases:
- If transcribed is empty or "[SILENCE]": feedback says no speech detected; tips are about projecting voice.
- If score is 90+: brief acknowledgement, one polish tip.

Respond ONLY with JSON of the shape:
{
  "feedback": "Direct factual assessment in 1-2 sentences",
  "tips": ["concrete tip 1", "concrete tip 2"]
}`

async function handler({ transcribed, reference, score, summary, alignment, language, apiKey }) {
    void alignment // reserved for future per-character feedback

    // Silence/no-input fast path — no LLM call needed.
    if (!transcribed || transcribed === '[SILENCE]' || transcribed === '[NO AUDIO]') {
        return {
            feedback: 'No speech was detected in the recording. Please project your voice clearly toward the microphone and try again.',
            tips: [
                'Hold the device 15-20 cm from your mouth.',
                `Read the phrase aloud at conversational volume: "${reference}".`,
                'Make sure your microphone is not muted.',
            ],
        }
    }

    const model = getJsonModel(apiKey)
    const result = await model.generateContent(
        PROMPT({ transcribed, reference, score, summary, language })
    )
    const parsed = parseJSON(result.response.text(), null)

    if (!parsed) {
        return {
            feedback: `Heard "${transcribed}" vs target "${reference}" (score ${score}/100). Some sounds did not match the target.`,
            tips: ['Listen to the reference again and repeat slowly.', 'Focus on the parts that did not match.'],
        }
    }

    return {
        feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
        tips: Array.isArray(parsed.tips)
            ? parsed.tips.filter((t) => typeof t === 'string' && t.trim()).slice(0, 4)
            : [],
    }
}

module.exports = { handler }
