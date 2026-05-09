/**
 * Shared helpers for the Digital Elder multi-agent pipeline.
 *
 * Exports:
 *   - getModel(apiKey)       Gemini 2.0 Flash client
 *   - getJsonModel(apiKey)   Gemini 2.0 Flash with response_mime_type=application/json
 *   - parseJSON(text, fb)    tolerant JSON parser (strips ```json fences)
 *   - getDb()                lazy firebase-admin Firestore instance
 *   - tribeFromLanguage(lang)  display name for refusal copy
 */

const { GoogleGenerativeAI } = require('@google/generative-ai')
const admin = require('firebase-admin')

let _db = null
function getDb() {
    if (!_db) {
        if (admin.apps.length === 0) admin.initializeApp()
        _db = admin.firestore()
    }
    return _db
}

// gemini-2.5-flash is the current-generation Flash model. The older
// gemini-2.0-flash returns 404 "no longer available to new users" on
// API projects created after Google's deprecation.
const FLASH_MODEL = 'gemini-2.5-flash'

function getModel(apiKey) {
    return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: FLASH_MODEL })
}

function getJsonModel(apiKey) {
    return new GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: FLASH_MODEL,
        generationConfig: { responseMimeType: 'application/json' },
    })
}

function parseJSON(text, fallback) {
    try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        return JSON.parse(cleaned)
    } catch {
        return fallback
    }
}

const TRIBE_NAMES = {
    semai: 'Semai',
    temiar: 'Temiar',
    jakun: 'Jakun',
    mah_meri: 'Mah Meri',
}

function tribeFromLanguage(lang) {
    return TRIBE_NAMES[lang] || null
}

module.exports = { getModel, getJsonModel, parseJSON, getDb, tribeFromLanguage }
