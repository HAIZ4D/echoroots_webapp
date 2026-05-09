# Research Prompt — for Claude Web (claude.ai)

Use this in a fresh **Claude Web** conversation to have Claude research a specific ASEAN indigenous community and produce a citable document you can save as PDF and feed back into EchoRoots for extraction.

**Workflow:**
1. Open https://claude.ai
2. Pick the community you want (Iban, Kadazan, Dayak, Igorot, Hmong, Karen, Cham, Akha, etc.)
3. Paste the prompt below, replacing `{COMMUNITY_NAME}` and `{COUNTRY}` with your target
4. Wait for the long-form response
5. Use Claude's **artifact** feature OR copy the markdown into a tool like Pandoc / Google Docs / Microsoft Word and **export as PDF**
6. Bring the PDF back here — I'll extract entries using the EchoRoots extraction prompt

---

## The prompt — copy everything below this line

I'm building a cultural-preservation web platform that documents indigenous Southeast Asian languages and traditions. I need you to do **rigorous web research** on the **{COMMUNITY_NAME}** people of **{COUNTRY}** and produce a structured, citable reference document.

## Research scope

Cover the {COMMUNITY_NAME} community across these areas. For each, find authoritative sources (academic papers, ethnographies, government cultural reports, university repositories, SIL International, JSTOR open-access, museum publications) and synthesise specific factual content — not generalities.

1. **Language basics** — language family classification, number of speakers, dialect variations, writing system (if any).
2. **Vocabulary** — at least **40 everyday words** with their indigenous form + English meaning + phonetic pronunciation guide. Prioritise concrete, photographable nouns: animals, household items, body parts, food, tools, kinship terms, numbers 1–10, common verbs (eat, drink, walk, sleep), greetings, and natural features (water, fire, tree, river, mountain).
3. **Kinship & social structure** — terms for relatives, leadership roles, community organisation, marriage customs.
4. **Traditional medicine** — at least 5 named plants/remedies with their indigenous name, scientific name where known, condition treated, and preparation method.
5. **Beliefs & spiritual practices** — cosmology, spirit world, deities, taboos, ceremonies. Include indigenous terminology for each concept.
6. **Crafts & material culture** — traditional tools, weapons, clothing, instruments, dwellings — with indigenous names.
7. **Food & agriculture** — staple foods, cultivation methods, hunting/fishing techniques, named dishes.
8. **Folktales & oral tradition** — at least 2 representative stories, summarised in 1 paragraph each, with indigenous names of key characters or concepts.
9. **Music & dance** — instrument names, dance ceremonies, when performed.
10. **Contemporary issues** — challenges to language preservation, communities, locations.

## Critical rules — read carefully

- **Cite every claim.** After each factual statement, include an inline citation like `[Source: Author Year, Title]` or `[Source: SIL Ethnologue]` or `[Source: JAKOA report 2020]`. If you cannot find a credible source, OMIT the claim — do not guess.
- **Prefer primary sources** — academic papers, university theses, government reports, peer-reviewed journals, ethnologue.com, SIL International, museum publications.
- **Avoid Wikipedia as a primary source.** Wikipedia is acceptable for cross-checking only.
- **Indigenous words must be in their original form** — do not anglicise. Include diacritics, glottal stops, and special characters as the source uses them.
- **Pronunciation guides** — give them in simple capital-letter syllables (like `KAH-yoo`, `TAHM-pang`). Only include pronunciation when a source provides phonetic transcription, IPA, or an explicit guide. If the source only writes the word in orthography, skip pronunciation rather than guess.
- **Mark uncertainty** — if dialects use different forms, list both and note the dialect (e.g. "Iban [Saribas dialect]: ..., Iban [Skrang dialect]: ...").
- **Distinguish between confident and weak findings** — at the end of each section, add a "Confidence note" describing what you're sure about vs what needs verification.

## Output structure — this is what I'll convert to PDF

Format the response as a clean markdown document with these sections, in this order:

```markdown
# {COMMUNITY_NAME} Cultural Reference Document
**Country:** {COUNTRY}
**Compiled:** {date}
**Sources reviewed:** {count} (full bibliography at end)

## 1. Overview
2-3 paragraphs introducing the community.

## 2. Language Basics
| Field | Value | Source |
|-------|-------|--------|
| Language family | ... | ... |
| Speaker estimate | ... | ... |
| Dialect groups | ... | ... |
| Writing system | ... | ... |

## 3. Core Vocabulary (40+ words)
Group by category. Use this table format consistently:

### 3.1 Numbers
| English | Indigenous word | Pronunciation | Source |
|---------|----------------|---------------|--------|
| one | ... | ... | ... |
| two | ... | ... | ... |

### 3.2 Family & Kinship
(same table)

### 3.3 Animals
(same table)

### 3.4 Body parts
(same table)

### 3.5 Nature
(same table)

### 3.6 Household objects
(same table)

### 3.7 Food
(same table)

### 3.8 Verbs (common actions)
(same table)

### 3.9 Greetings & social phrases
(same table)

## 4. Traditional Medicine
For each remedy, write 2-3 sentences in narrative form:

> The {COMMUNITY_NAME} use the plant '{indigenous_name}' ({scientific_name}) for treating {condition}. {Preparation and use details.} [Source: ...]

## 5. Beliefs & Spiritual Practices
Same narrative format as Section 4. Each belief/practice gets 2-3 sentences with citation.

## 6. Crafts & Material Culture
Same narrative format. Include indigenous names of tools/objects.

## 7. Food & Agriculture
Same narrative format.

## 8. Folktales (at least 2)
1-paragraph synopsis each, with indigenous names of key characters.

## 9. Music & Dance
Narrative format with indigenous instrument/dance names.

## 10. Contemporary Issues
Brief paragraph on language/cultural preservation status.

## 11. Bibliography
Full citation list of every source referenced. Format:
- Author Last, F. (Year). *Title*. Publisher. URL if available.
- Institution. (Year). *Report title*. URL.
```

## Final rules

- **Length target: 8–15 pages of dense markdown.** Better to have 40 verified vocabulary entries than 100 with 30% guesses.
- **If you can't find enough sources for a section, say so explicitly** rather than padding with speculation. Write: "Section X: Insufficient open-access sources found. Recommend consulting [specific archive/library/expert]."
- **Do not invent indigenous words.** This is a real cultural-preservation tool — wrong words taught to learners cause real harm.
- **The bibliography is mandatory.** A reference document without sources is useless to me.

When you're done, I'll save the markdown as a PDF and use it to seed a structured cultural-knowledge database. Thank you.

---

## End of prompt — instructions for the human reviewer

After Claude Web produces its output:

1. **Quick quality check before saving:** scan the bibliography. If it cites < 5 distinct sources, push back: "I need more sources — please re-do with a focus on academic/SIL sources."

2. **Save as PDF:**
   - **Easiest:** Click the "Copy" button on Claude's response → paste into a Google Doc → File → Download → PDF.
   - **Markdown-fluent:** Save the response as `iban.md` (or whatever community), then `pandoc iban.md -o iban.pdf` if you have Pandoc installed.
   - **Browser:** Some Claude Web responses can be exported as artifacts; use that if available.

3. **Name the PDF clearly** — `iban_cultural_reference.pdf`, `kadazan_cultural_reference.pdf`, etc.

4. **Hand the PDF to me (Claude Code) here** — I'll run the extraction prompt against it and propose entries for `seedKnowledge.json` and `vocabulary.json`.

## Suggested communities to research, in priority order

These are well-documented in academic literature and would expand EchoRoots usefully:

| # | Community | Country | Why this one |
|---|-----------|---------|--------------|
| 1 | **Iban** | Malaysia (Sarawak) | Largest indigenous group in Sarawak, extensively documented |
| 2 | **Kadazan-Dusun** | Malaysia (Sabah) | Largest in Sabah, official language status |
| 3 | **Bidayuh** | Malaysia (Sarawak) | Distinctive culture, well-studied |
| 4 | **Dayak** | Indonesia (Kalimantan) | Cross-border community with Iban |
| 5 | **Igorot / Cordillera peoples** | Philippines (Luzon) | Rich oral tradition, weaving cultures |
| 6 | **Aeta** | Philippines (Luzon) | One of the oldest indigenous groups in the Philippines |
| 7 | **Hmong** | Vietnam, Laos, Thailand | Cross-border, large diaspora |
| 8 | **Karen** | Myanmar, Thailand | Long-documented language family |
| 9 | **Akha** | Laos, Thailand, Yunnan | Distinctive oral genealogy tradition |
| 10 | **Cham** | Vietnam, Cambodia | Austronesian outlier on the mainland |

Do them one at a time — each generates a separate PDF, each gets extracted separately. Easier to review and harder to muddle entries between communities.
