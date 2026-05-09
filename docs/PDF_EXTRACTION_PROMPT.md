# PDF Extraction Prompt for EchoRoots

Use this prompt in a fresh Claude conversation when you want to extract cultural knowledge and vocabulary from a PDF document into the EchoRoots format.

**How to use:**
1. Open a fresh Claude conversation (web claude.ai or Claude Code).
2. Attach the PDF (web) or paste its absolute path (Claude Code with Read tool).
3. Copy the prompt below verbatim, paste it after the file.
4. Review Claude's output, then add the entries to the appropriate file.

---

## The Prompt — copy everything below this line

You are helping expand EchoRoots, a web platform that preserves indigenous Southeast Asian language and cultural knowledge. I have a PDF document and I want you to extract two types of structured data from it: **cultural knowledge entries** and **vocabulary entries**.

## The two output formats

### Format A — Cultural knowledge entries
For paragraphs that describe a practice, belief, ritual, kinship system, plant use, ceremony, taboo, navigation method, food preparation, etc. — anything that's a coherent piece of cultural information.

```json
{
  "content": "A 1-3 sentence factual description, written in third-person present tense. Quote indigenous words inline using single quotes, e.g. 'kemunting'. Do not editorialise.",
  "category": "medicine | traditions | skills | beliefs | language | kinship | folklore | governance | food | navigation",
  "language": "semai | temiar | jakun | mah_meri | iban | kadazan | bidayuh | dayak | igorot | aeta | hmong | karen | <new-language-code>",
  "tribe": "Display name e.g. 'Semai', 'Temiar', 'Iban', 'Kadazan', 'Orang Asli (General)' for cross-tribal items",
  "source": "A short description of where the practice comes from, e.g. 'Traditional Semai healing practices', 'Iban longhouse customary law'",
  "tags": ["3-6 lowercase tag words such as 'healing', 'plant medicine', 'shamanism', 'kinship', 'agriculture'"]
}
```

### Format B — Vocabulary entries
For specific word/translation pairs — words you can confidently extract from the PDF along with their English meaning. Vocabulary is grouped by language code as the top-level key.

```json
{
  "<language_code>": {
    "<english_word_lowercase>": {
      "word": "indigenous form (lowercase unless proper noun)",
      "pronunciation": "PHONETIC-GUIDE-IN-CAPS, syllables separated by hyphens",
      "context": "optional 1-sentence note about meaning, dialect variation, or cultural significance"
    }
  }
}
```

The `english_word_lowercase` is the key the system uses to look up translations when a user identifies an object via camera. Use the simplest, most common English noun (e.g. `dog`, `father`, `bottle`) — the system also falls back to matching the LAST word of multi-word inputs (so `water bottle` matches the entry for `bottle`).

## STRICT RULES — these are the most important

1. **Never invent or guess.** If the PDF doesn't explicitly state something, do not include it. It is far better to extract 10 verified entries than 100 with 30% fabricated.
2. **Low-resource languages** (Semai, Temiar, Jakun, Iban, etc.) have very small training data in language models. Trust the PDF as the primary source. Do not pull from your general knowledge unless the PDF directly supports it.
3. **Pronunciation guides** — only include them if the PDF gives a phonetic transcription, IPA, or explicit guide. If the PDF only writes the word in the indigenous orthography, leave `pronunciation` as `null` or omit the field.
4. **Cultural notes** — only the cultural context the PDF actually describes. Do not add generic "this is from Southeast Asia" filler.
5. **Schema discipline** — match the exact field names. Don't rename. Don't add fields not in the schema.
6. **Categories** — pick from the listed enum, or propose a new one if the PDF clearly needs it (and tell me why).
7. **Source attribution** — set the `source` field to identify which book/paper/section the entry came from. This makes it possible to audit later.
8. **Duplicates** — if the PDF describes the same thing twice in different sections, merge into one entry. Don't double-list.
9. **Generalised vs specific tribe** — use a specific `tribe` value when the PDF identifies one community. Use `'Orang Asli (General)'` or similar only when the PDF explicitly says the practice spans multiple groups.

## Output format I want from you

Give me ONE markdown response with three sections:

### 1. Summary
- Document title and author
- Total pages read
- Languages/communities covered
- High-level themes

### 2. Cultural knowledge entries (Format A)
Output as a single JSON array I can append directly to `src/data/seedKnowledge.json`:

```json
[
  { "content": "...", "category": "...", "language": "...", "tribe": "...", "source": "...", "tags": [...] },
  ...
]
```

### 3. Vocabulary entries (Format B)
Output as a JSON object I can merge into `functions/agents/vision/vocabulary.json`. Group by language:

```json
{
  "semai": {
    "english_word": { "word": "...", "pronunciation": "...", "context": "..." }
  },
  "iban": {
    "...": { ... }
  }
}
```

### 4. What you skipped and why
A short bulleted list of things in the PDF you did NOT extract, and the reason (e.g. "Pages 45-60 are charts of land claim disputes — not cultural knowledge", "Word 'X' on page 22 had no clear English gloss", "Section on dialect variation was inconclusive — refused to pick one form").

This list is just as important as the extractions — it tells me what the PDF contained that the system isn't capturing yet.

## A few practical hints

- If the PDF is a dictionary, focus on extracting Format B (vocabulary).
- If it's an ethnography or ethnographic study, focus on Format A (cultural knowledge).
- If it has both, do both.
- If it's a long PDF (>100 pages), summarise per chapter so I can see your coverage. Don't try to compress everything into one entry.
- If the PDF is in Bahasa Melayu or Indonesian, translate the English fields into English but keep the indigenous words as written.
- If you genuinely don't recognise an indigenous language code, propose a new one and explain (e.g. "Adding `iban` for Iban people of Sarawak").

## Reference: existing schema examples

Sample existing knowledge entry (already in `src/data/seedKnowledge.json`):

```json
{
  "content": "The Semai people use the plant 'kemunting' (Rhodomyrtus tomentosa) for treating headaches. The leaves are boiled and the resulting liquid is applied to the forehead or consumed as tea.",
  "category": "medicine",
  "language": "semai",
  "tribe": "Semai",
  "source": "Traditional Semai healing practices",
  "tags": ["healing", "plant medicine", "headache remedy", "kemunting"]
}
```

Sample existing vocabulary entry (already in `functions/agents/vision/vocabulary.json`):

```json
"semai": {
  "dog": { "word": "asuuk", "pronunciation": "AH-sook", "context": "animals have a spirit (kehap) that must be respected" }
}
```

Now, please read the attached PDF and produce the four-section output above. If the PDF is too long for a single pass, work through it chapter by chapter and tell me explicitly which range you covered and what's left.

---

## End of prompt — instructions for the human reviewer

After Claude produces its output:

1. **Sanity-check the entries.** Spot-check 3-5 random entries against the source PDF. If any are wrong or fabricated, push back: "Entry X says Y, but I can't find that in the PDF — please re-extract or remove."

2. **Add to `src/data/seedKnowledge.json`** — paste the array entries inside the existing top-level array.

3. **Merge into `functions/agents/vision/vocabulary.json`** — for each language, deep-merge the new entries (don't overwrite existing words).

4. **Re-seed Firestore knowledge_base** — open the deployed site → browser console → `await window.seedDB()`. This wipes and re-seeds with the new entries.

5. **Redeploy the vision agent** so it picks up the new vocabulary:
   ```powershell
   firebase deploy --only functions:orchestrateVisionLookup
   ```

6. **Test:** ask Digital Elder a question that should hit a new entry, or snap an object whose word you just added.
