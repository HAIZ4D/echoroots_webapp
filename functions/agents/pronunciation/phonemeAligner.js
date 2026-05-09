/**
 * phonemeAlignerAgent — DETERMINISTIC scoring via Levenshtein edit distance.
 *
 * No LLM call. This is the most important fix in the new pipeline:
 * the score is now reproducible and grounded in actual character-level
 * comparison, not the model's "vibe" about how the speaker did.
 *
 * Algorithm:
 *   1. Normalise both strings (lowercase, strip punctuation, collapse spaces)
 *   2. Compute Levenshtein distance + backtrack the operations
 *   3. score = max(0, (1 - distance / maxLen) * 100), rounded
 *   4. Categorise the diff into substitutions / insertions / deletions
 *
 * Input:  { transcribed, reference }
 * Output: {
 *   score: 0-100,
 *   editDistance: int,
 *   normalizedReference, normalizedTranscribed,
 *   alignment: [{type, ref, got}],  // for UI char-level diff display
 *   summary: { substitutions, insertions, deletions, missing, extra }
 * }
 */

function normalize(s) {
    return (s || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
}

// Standard Levenshtein with backtracking. For short pronunciation phrases
// (typical < 50 chars) the O(n*m) cost is negligible.
function alignLevenshtein(a, b) {
    const n = a.length
    const m = b.length
    if (n === 0) return { distance: m, ops: Array.from(b, (c) => ({ type: 'insert', got: c })) }
    if (m === 0) return { distance: n, ops: Array.from(a, (c) => ({ type: 'delete', ref: c })) }

    const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
    for (let i = 0; i <= n; i++) d[i][0] = i
    for (let j = 0; j <= m; j++) d[0][j] = j
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            d[i][j] = Math.min(
                d[i - 1][j] + 1,           // deletion (ref char missing in got)
                d[i][j - 1] + 1,           // insertion (extra char in got)
                d[i - 1][j - 1] + cost     // substitution / match
            )
        }
    }

    // Backtrack to recover the alignment.
    const ops = []
    let i = n
    let j = m
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
            ops.push({ type: 'match', ref: a[i - 1], got: b[j - 1] })
            i--; j--
        } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
            ops.push({ type: 'sub', ref: a[i - 1], got: b[j - 1] })
            i--; j--
        } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
            ops.push({ type: 'delete', ref: a[i - 1] })
            i--
        } else {
            ops.push({ type: 'insert', got: b[j - 1] })
            j--
        }
    }
    return { distance: d[n][m], ops: ops.reverse() }
}

function handler({ transcribed, reference }) {
    const normRef = normalize(reference)
    const normGot = normalize(transcribed)

    // Empty / silence guards.
    if (!normRef) {
        return {
            score: 0,
            editDistance: 0,
            normalizedReference: '',
            normalizedTranscribed: normGot,
            alignment: [],
            summary: { substitutions: 0, insertions: 0, deletions: 0, missing: '', extra: '' },
        }
    }
    if (!normGot || transcribed === '[SILENCE]') {
        return {
            score: 0,
            editDistance: normRef.length,
            normalizedReference: normRef,
            normalizedTranscribed: '',
            alignment: Array.from(normRef, (c) => ({ type: 'delete', ref: c })),
            summary: { substitutions: 0, insertions: 0, deletions: normRef.length, missing: normRef, extra: '' },
        }
    }

    const { distance, ops } = alignLevenshtein(normRef, normGot)
    const maxLen = Math.max(normRef.length, normGot.length)
    const score = Math.max(0, Math.round((1 - distance / maxLen) * 100))

    const summary = ops.reduce(
        (acc, op) => {
            if (op.type === 'sub') acc.substitutions += 1
            else if (op.type === 'insert') { acc.insertions += 1; acc.extra += op.got }
            else if (op.type === 'delete') { acc.deletions += 1; acc.missing += op.ref }
            return acc
        },
        { substitutions: 0, insertions: 0, deletions: 0, missing: '', extra: '' }
    )

    return {
        score,
        editDistance: distance,
        normalizedReference: normRef,
        normalizedTranscribed: normGot,
        alignment: ops,
        summary,
    }
}

module.exports = { handler }
