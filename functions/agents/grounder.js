/**
 * grounderAgent — generates a draft answer using ONLY the retrieved docs.
 *
 * Input:  { question, intent, docs, apiKey }
 * Output: { draftAnswer, citedSourceIndexes, vocabTerms }
 *           draftAnswer:        string | null  (null = docs don't cover the question)
 *           citedSourceIndexes: int[]          (indexes into the docs array)
 *           vocabTerms:         [{word, meaning, sourceIndex}]
 *
 * The composer treats draftAnswer === null as a refusal trigger.
 */

const { getJsonModel, parseJSON } = require('./shared')

const PROMPT = (question, intent, docs) => `You are a Digital Elder — a guardian of Orang Asli cultural knowledge. You speak warmly but ONLY from the documents provided.

User question: "${question}"
Intent: ${intent}

DOCUMENTS (these are your ONLY allowed sources):
${docs.map((d, i) => `[Doc ${i}] (${d.tribe || 'Orang Asli'}, ${d.category || 'general'}): ${d.content}`).join('\n\n')}

STRICT RULES:
1. If the documents do NOT contain the answer to the question, return draftAnswer: null. Do not guess. Do not paraphrase from general knowledge.
2. Every factual claim in your answer MUST come from one of the documents. List the doc index for each cited claim in citedSourceIndexes.
3. Vocabulary terms — only include indigenous words that appear LITERALLY in one of the documents. Use the word exactly as written in the doc. Set sourceIndex to the doc index where the word appears.
4. If you cannot find any indigenous words in the docs, return vocabTerms: [].
5. Speak in 2-4 sentences, warm and elder-like, but factual. Embed cited indigenous words inline as [word|meaning].
6. Never use phrases like "I think", "perhaps", "might be" — either you have the answer in the docs or you don't.

Respond ONLY with JSON of the shape:
{
  "draftAnswer": "your warm response with [word|meaning] inline, OR null",
  "citedSourceIndexes": [0, 1],
  "vocabTerms": [ { "word": "exact_word_from_doc", "meaning": "english", "sourceIndex": 0 } ]
}`

async function handler({ question, intent, docs, apiKey }) {
    if (!docs || docs.length === 0) {
        return { draftAnswer: null, citedSourceIndexes: [], vocabTerms: [] }
    }

    const model = getJsonModel(apiKey)
    const result = await model.generateContent(PROMPT(question, intent, docs))
    const parsed = parseJSON(result.response.text(), null)

    if (!parsed) {
        return { draftAnswer: null, citedSourceIndexes: [], vocabTerms: [] }
    }

    const draftAnswer =
        typeof parsed.draftAnswer === 'string' && parsed.draftAnswer.trim().toLowerCase() !== 'null'
            ? parsed.draftAnswer
            : null
    const citedSourceIndexes = Array.isArray(parsed.citedSourceIndexes)
        ? parsed.citedSourceIndexes.filter((i) => Number.isInteger(i) && i >= 0 && i < docs.length)
        : []
    const vocabTerms = Array.isArray(parsed.vocabTerms)
        ? parsed.vocabTerms
              .filter(
                  (t) =>
                      t &&
                      typeof t.word === 'string' &&
                      typeof t.meaning === 'string' &&
                      Number.isInteger(t.sourceIndex) &&
                      t.sourceIndex >= 0 &&
                      t.sourceIndex < docs.length
              )
              .map((t) => ({ word: t.word, meaning: t.meaning, sourceIndex: t.sourceIndex }))
        : []

    return { draftAnswer, citedSourceIndexes, vocabTerms }
}

module.exports = { handler }
