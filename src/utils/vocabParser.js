/**
 * Parse [indigenous_word|english_meaning] format from Gemini responses.
 * Returns an array of segments: plain text and vocab terms.
 */
export function parseVocabTerms(text) {
    if (!text) return [{ type: 'text', content: '' }]

    const regex = /\[([^\]|]+)\|([^\]]+)\]/g
    const segments = []
    let lastIndex = 0

    let match
    while ((match = regex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                content: text.slice(lastIndex, match.index),
            })
        }

        // Add vocab term
        segments.push({
            type: 'vocab',
            word: match[1].trim(),
            meaning: match[2].trim(),
        })

        lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
        segments.push({
            type: 'text',
            content: text.slice(lastIndex),
        })
    }

    return segments.length > 0 ? segments : [{ type: 'text', content: text }]
}

/**
 * Extract all vocabulary terms from text.
 */
export function extractVocabTerms(text) {
    if (!text) return []

    const regex = /\[([^\]|]+)\|([^\]]+)\]/g
    const terms = []

    let match
    while ((match = regex.exec(text)) !== null) {
        terms.push({
            word: match[1].trim(),
            meaning: match[2].trim(),
        })
    }

    return terms
}

/**
 * Strip vocab markup from text, keeping only the indigenous words.
 */
export function stripVocabMarkup(text) {
    if (!text) return ''
    return text.replace(/\[([^\]|]+)\|[^\]]+\]/g, '$1')
}
