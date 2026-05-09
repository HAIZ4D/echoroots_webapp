/**
 * composerAgent — terminal step. Either passes the validated draft through
 * with formatting, or renders an elder-style refusal.
 *
 * No LLM call — pure template logic.
 *
 * Input:  { verdict, draftAnswer, vocabTerms, docs, intent, language }
 * Output: { answer, vocabTerms, sources, refused }
 *           sources: [{tribe, category, content (truncated)}]
 *           refused: bool
 */

const { tribeFromLanguage } = require('./shared')

const REFUSAL_GENERIC =
    "I don't have that knowledge in our cultural archive yet. Perhaps an elder could help us learn more — would you like to ask about something our archive holds, like traditional medicines, ceremonies, or skills?"

const REFUSAL_TRIBE = (tribe) =>
    `I don't have that knowledge from the ${tribe} community in our archive yet. Perhaps a ${tribe} elder could help us learn more — would you like to ask about something our archive holds?`

const REFUSAL_OFF_TOPIC =
    'My role is to share Orang Asli cultural wisdom — Semai, Temiar, Jakun, and Mah Meri traditions. Would you like to ask about a plant remedy, a ritual, or a folktale from these communities?'

const GREETING_REPLY =
    'Welcome, friend. I am the Digital Elder, a keeper of Orang Asli cultural wisdom from the Semai, Temiar, Jakun, and Mah Meri communities. What would you like to learn?'

function buildSources(docs, citedSourceIndexes = []) {
    if (!Array.isArray(docs) || docs.length === 0) return []
    const set = citedSourceIndexes.length > 0 ? new Set(citedSourceIndexes) : null
    return docs
        .map((d, i) => ({
            index: i,
            tribe: d.tribe || 'Orang Asli',
            category: d.category || 'general',
            source: d.source || null,
            // Truncate to keep payload small over the wire.
            content: d.content ? d.content.slice(0, 220) : '',
            cited: set ? set.has(i) : true,
        }))
        .filter((s) => (set ? s.cited : true))
}

function handler({ verdict, draftAnswer, vocabTerms = [], docs = [], intent, language, citedSourceIndexes = [] }) {
    // Greetings: short template reply, no sources.
    if (intent === 'greeting') {
        return { answer: GREETING_REPLY, vocabTerms: [], sources: [], refused: false }
    }

    // Off-topic: redirect.
    if (intent === 'off_topic') {
        return { answer: REFUSAL_OFF_TOPIC, vocabTerms: [], sources: [], refused: true }
    }

    // Validator failed OR grounder returned null → tribe-aware refusal.
    if (verdict !== 'pass' || !draftAnswer) {
        const tribe = tribeFromLanguage(language)
        return {
            answer: tribe ? REFUSAL_TRIBE(tribe) : REFUSAL_GENERIC,
            vocabTerms: [],
            sources: [],
            refused: true,
        }
    }

    // Pass-through.
    return {
        answer: draftAnswer,
        vocabTerms: vocabTerms.map((t) => ({ word: t.word, meaning: t.meaning })),
        sources: buildSources(docs, citedSourceIndexes),
        refused: false,
    }
}

module.exports = { handler }
