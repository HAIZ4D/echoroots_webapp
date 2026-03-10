/**
 * TalkingHead.js wrapper service.
 * Handles avatar initialization, speech (with ElevenLabs lip-sync), and animation control.
 */
import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

let talkingHeadInstance = null
let idleEnabled = false

/**
 * Procedural idle body animation — breathing sway — via scene.onBeforeRender.
 *
 * Why this approach:
 *   TalkingHead's animate loop is: updatePoseBase → ... → renderer.render(scene, camera).
 *   Inside renderer.render(), Three.js fires scene.onBeforeRender BEFORE scene.updateMatrixWorld().
 *   So bone rotation changes made here are picked up by updateMatrixWorld() in the same frame
 *   with no race condition against TalkingHead's pose system.
 *
 * Arm animation strategy:
 *   IDLE    — gentle breathing sway drives upper arms and shoulders so the avatar feels alive.
 *   SPEAKING — we step back entirely and let TalkingHead's built-in speakWithHands() IK system
 *              drive arm and hand gestures. speakWithHands() uses ikSolve() which correctly
 *              writes into the SkinnedMesh skeleton bones (not just scene graph nodes), so
 *              gestures are actually visible. Our scene-graph bone writes are not.
 */
function startIdleAnimation(head) {
    stopIdleAnimation()
    if (!head?.scene || !head?.armature) return

    const la = head.armature.getObjectByName('LeftArm')
    const ra = head.armature.getObjectByName('RightArm')
    const ls = head.armature.getObjectByName('LeftShoulder')
    const rs = head.armature.getObjectByName('RightShoulder')

    const _prevOnBeforeRender = head.scene.onBeforeRender
    head.scene.onBeforeRender = function (renderer, scene, camera, renderTarget) {
        _prevOnBeforeRender.call(this, renderer, scene, camera, renderTarget)
        if (!idleEnabled) return

        const t = performance.now() * 0.001

        // ── Idle components ──────────────────────────────────────────────────
        const breathe = Math.sin(t * 0.85) * 0.09   // breathing (visible chest rise)
        const sway    = Math.sin(t * 0.42) * 0.07   // slow side sway
        const drift   = Math.sin(t * 0.19) * 0.045  // very slow weight shift
        const micro   = Math.sin(t * 2.9)  * 0.012  // hand micro-tremor

        // ── UPPER ARMS: idle breathing sway only — step back during speech ──
        // When speaking, TalkingHead's speakWithHands() IK drives arms/hands correctly.
        // We avoid overriding those bones so gestures are visible.
        if (!head.isSpeaking) {
            if (la) la.rotation.z =  1.30 + breathe + sway + micro + drift
            if (ra) ra.rotation.z = -1.30 - breathe - sway - micro - drift
        }

        // ── SHOULDERS: subtle breathing lift always ───────────────────────────
        if (ls) ls.rotation.z =  0.15 + breathe * 0.45
        if (rs) rs.rotation.z = -0.15 - breathe * 0.45
    }
    idleEnabled = true
}

function stopIdleAnimation() {
    idleEnabled = false
    // onBeforeRender check guards against stale hooks on old scenes
}

/**
 * Initialize TalkingHead avatar in the given container element.
 * Loads GLB model, Mixamo animations, and configures ElevenLabs integration.
 */
export async function initAvatar(containerElement, options = {}) {
    try {
        // Dynamically import TalkingHead from public directory
        // Cache-bust with timestamp so updated file is always fetched
        // @vite-ignore prevents Vite from analyzing this import at build time
        const talkingHeadUrl = new URL('/talkinghead/talkinghead.mjs?v=' + Date.now(), window.location.origin).href
        const { TalkingHead } = await import(/* @vite-ignore */ talkingHeadUrl)

        const head = new TalkingHead(containerElement, {
            // ttsEndpoint intentionally not set — we use speakAudio() with ElevenLabs REST
            // instead of speakText(), which expects Google Cloud TTS SSML format.
            lipsyncModules: ['en'],
            cameraView: 'upper',
            cameraRotateEnable: true,
            // avatarIgnoreCamera: prevents lookAtCamera() from tilting the head upward.
            // With this option TalkingHead calls lookAhead(t) (gentle forward look) instead
            // of lookAt(null, null, t) which aimed at the camera above the avatar's head.
            // This also means we no longer need isRaw:true in speakAudio() — so
            // TalkingHead's built-in speakWithHands() IK system fires during speech.
            avatarIgnoreCamera: true,
            ...options,
        })

        // ── VRoid compatibility: zero out all body-pose rotations ────────────
        // TalkingHead's pose templates use Mixamo-calibrated Euler rotations.
        // Mixamo's UpLeg bones have z≈π to make them hang DOWN, but VRoid
        // UpLeg bones already point down in bind pose — applying z≈π flips
        // them UP, causing the "legs at the top" broken view.
        // Fix: set every body bone rotation to zero (= stay in bind/rest pose).
        // Only Hips.position is kept so TalkingHead still places the avatar.
        const VROID_BODY_BONES = [
            'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
            'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
            'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
            'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
            'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
        ];
        ['Left', 'Right'].forEach(side =>
            ['HandThumb', 'HandIndex', 'HandMiddle', 'HandRing', 'HandPinky'].forEach(finger => {
                for (let i = 1; i <= 3; i++) VROID_BODY_BONES.push(side + finger + i)
            })
        )
        // VRoid arm bones in bind pose are horizontal (T-pose).
        // Rotating around the bone's local Z axis brings them down to a natural hanging position.
        // Left arm (local Y points outward in +X): z: -1.3 rotates arm toward -Y (down).
        // Right arm (local Y points outward in -X): z: +1.3 rotates arm toward -Y (down).
        // Signs were determined empirically: z: -N went UP, so flip to z: +N for left (→ down).
        // Right arm mirrors left. Forearms get slight inward bend for a natural hang.
        const VROID_NATURAL = {
            LeftShoulder:  { x: 0, y: 0, z:  0.15 },
            LeftArm:       { x: 0, y: 0, z:  1.3  },
            LeftForeArm:   { x: 0, y: 0, z: -0.1  },
            RightShoulder: { x: 0, y: 0, z: -0.15 },
            RightArm:      { x: 0, y: 0, z: -1.3  },
            RightForeArm:  { x: 0, y: 0, z:  0.1  },
        }
        const ZERO_ROT = { x: 0, y: 0, z: 0 }
        Object.keys(head.poseTemplates).forEach(poseName => {
            const orig = head.poseTemplates[poseName].props
            const neutral = {}
            if (orig['Hips.position']) neutral['Hips.position'] = { ...orig['Hips.position'] }
            VROID_BODY_BONES.forEach(bone => {
                neutral[bone + '.rotation'] = { ...(VROID_NATURAL[bone] || ZERO_ROT) }
            })
            head.poseTemplates[poseName].props = neutral
        })
        head.poseBase = head.poseFactory(head.poseTemplates[head.poseName])
        head.poseTarget = head.poseFactory(head.poseTemplates[head.poseName])
        head.poseStraight = head.propsToThreeObjects(head.poseTemplates['straight'].props)
        // ─────────────────────────────────────────────────────────────────────

        // VRoid Studio → Mixamo bone/node name map (for GLB converted from VRM)
        const VROID_TO_MIXAMO = {
            // Core body
            J_Bip_C_Hips: 'Hips', J_Bip_C_Spine: 'Spine', J_Bip_C_Chest: 'Spine1',
            J_Bip_C_UpperChest: 'Spine2', J_Bip_C_Neck: 'Neck', J_Bip_C_Head: 'Head',
            // Left arm
            J_Bip_L_Shoulder: 'LeftShoulder', J_Bip_L_UpperArm: 'LeftArm',
            J_Bip_L_LowerArm: 'LeftForeArm', J_Bip_L_Hand: 'LeftHand',
            J_Bip_L_Thumb1: 'LeftHandThumb1', J_Bip_L_Thumb2: 'LeftHandThumb2', J_Bip_L_Thumb3: 'LeftHandThumb3',
            J_Bip_L_Index1: 'LeftHandIndex1', J_Bip_L_Index2: 'LeftHandIndex2', J_Bip_L_Index3: 'LeftHandIndex3',
            J_Bip_L_Middle1: 'LeftHandMiddle1', J_Bip_L_Middle2: 'LeftHandMiddle2', J_Bip_L_Middle3: 'LeftHandMiddle3',
            J_Bip_L_Ring1: 'LeftHandRing1', J_Bip_L_Ring2: 'LeftHandRing2', J_Bip_L_Ring3: 'LeftHandRing3',
            J_Bip_L_Little1: 'LeftHandPinky1', J_Bip_L_Little2: 'LeftHandPinky2', J_Bip_L_Little3: 'LeftHandPinky3',
            // Right arm
            J_Bip_R_Shoulder: 'RightShoulder', J_Bip_R_UpperArm: 'RightArm',
            J_Bip_R_LowerArm: 'RightForeArm', J_Bip_R_Hand: 'RightHand',
            J_Bip_R_Thumb1: 'RightHandThumb1', J_Bip_R_Thumb2: 'RightHandThumb2', J_Bip_R_Thumb3: 'RightHandThumb3',
            J_Bip_R_Index1: 'RightHandIndex1', J_Bip_R_Index2: 'RightHandIndex2', J_Bip_R_Index3: 'RightHandIndex3',
            J_Bip_R_Middle1: 'RightHandMiddle1', J_Bip_R_Middle2: 'RightHandMiddle2', J_Bip_R_Middle3: 'RightHandMiddle3',
            J_Bip_R_Ring1: 'RightHandRing1', J_Bip_R_Ring2: 'RightHandRing2', J_Bip_R_Ring3: 'RightHandRing3',
            J_Bip_R_Little1: 'RightHandPinky1', J_Bip_R_Little2: 'RightHandPinky2', J_Bip_R_Little3: 'RightHandPinky3',
            // Legs
            J_Bip_L_UpperLeg: 'LeftUpLeg', J_Bip_L_LowerLeg: 'LeftLeg',
            J_Bip_L_Foot: 'LeftFoot', J_Bip_L_ToeBase: 'LeftToeBase',
            J_Bip_R_UpperLeg: 'RightUpLeg', J_Bip_R_LowerLeg: 'RightLeg',
            J_Bip_R_Foot: 'RightFoot', J_Bip_R_ToeBase: 'RightToeBase',
            // Eyes — VRoid uses J_Adj_*_FaceEye; some converters use Left_Eye/Right_Eye
            J_Adj_L_FaceEye: 'LeftEye', J_Adj_R_FaceEye: 'RightEye',
            Left_Eye: 'LeftEye', Right_Eye: 'RightEye',
            eye_L: 'LeftEye', eye_R: 'RightEye',
        }

        // Load the avatar model
        const avatarUrl = options.modelUrl || '/models/hazel.glb'
        await head.showAvatar(
            {
                url: avatarUrl,
                avatarMood: 'neutral',
                lipsyncLang: 'en',
            },
            (ev) => {
                if (options.onProgress) options.onProgress(ev)
            },
            (gltf) => {
                // 0. Rotate scene 180° around Y so the avatar faces the camera.
                //    VRM/VRoid models face +Z; TalkingHead's camera is also at +Z,
                //    so without this fix we see the back of the avatar.
                gltf.scene.rotation.y = Math.PI

                // 1. Rename VRoid bones/nodes to Mixamo names
                gltf.scene.traverse((node) => {
                    if (VROID_TO_MIXAMO[node.name]) {
                        node.name = VROID_TO_MIXAMO[node.name]
                    }
                })

                // 2. Alias VRoid morph targets to the names TalkingHead.js expects.
                //    Two alias sets are needed:
                //    (a) ARKit expression names — used by mood/emotion system
                //    (b) viseme_* names — used directly by the lipsync engine for mouth animation
                //        TalkingHead drives viseme_aa, viseme_E, viseme_I, viseme_O, viseme_U, etc.
                //        VRoid uses Japanese phoneme morphs (Fcl_MTH_a/i/u/e/o) for the same shapes.
                const VROID_MORPHS = {
                    // Eyes
                    Fcl_EYE_Close_L: 'eyeBlinkLeft',  Fcl_EYE_Close_R: 'eyeBlinkRight',
                    Fcl_EYE_Spread_L: 'eyeWideLeft',  Fcl_EYE_Spread_R: 'eyeWideRight',
                    // Mouth — ARKit expression names
                    Fcl_MTH_a: 'jawOpen',           Fcl_MTH_A: 'jawOpen',
                    Fcl_MTH_i: 'mouthClose',        Fcl_MTH_I: 'mouthClose',
                    Fcl_MTH_u: 'mouthFunnel',       Fcl_MTH_U: 'mouthFunnel',
                    Fcl_MTH_e: 'mouthUpperUpLeft',  Fcl_MTH_E: 'mouthUpperUpLeft',
                    Fcl_MTH_o: 'mouthOpen',         Fcl_MTH_O: 'mouthOpen',
                    // (viseme_* aliases are added separately via VROID_VISEME below)
                    // Expressions
                    Fcl_MTH_Joy: 'mouthSmileLeft',  Fcl_MTH_Angry: 'mouthFrownLeft',
                    Fcl_MTH_Sorrow: 'mouthShrugLower',
                    Fcl_BRW_Angry: 'browDownLeft',  Fcl_BRW_Fun: 'browOuterUpLeft',
                    Fcl_BRW_Joy: 'browInnerUp',     Fcl_BRW_Sorrow: 'browDownRight',
                    Fcl_ALL_Joy: 'mouthSmileLeft',  Fcl_ALL_Angry: 'mouthFrownLeft',
                    Fcl_ALL_Fun: 'cheekPuff',       Fcl_ALL_Sorrow: 'mouthShrugLower',
                }
                // VROID_MORPHS fake-keys like Fcl_MTH_a_viseme don't exist in the model.
                // Add a direct second alias map that uses the real VRoid morph names → viseme_* names.
                const VROID_VISEME = {
                    Fcl_MTH_a: 'viseme_aa', Fcl_MTH_A: 'viseme_aa',
                    Fcl_MTH_e: 'viseme_E',  Fcl_MTH_E: 'viseme_E',
                    Fcl_MTH_i: 'viseme_I',  Fcl_MTH_I: 'viseme_I',
                    Fcl_MTH_o: 'viseme_O',  Fcl_MTH_O: 'viseme_O',
                    Fcl_MTH_u: 'viseme_U',  Fcl_MTH_U: 'viseme_U',
                }
                gltf.scene.traverse((node) => {
                    if (node.morphTargetDictionary) {
                        const existing = { ...node.morphTargetDictionary }
                        Object.entries(existing).forEach(([vroidName, idx]) => {
                            // ARKit expression aliases
                            const arkitName = VROID_MORPHS[vroidName]
                            if (arkitName && !node.morphTargetDictionary[arkitName]) {
                                node.morphTargetDictionary[arkitName] = idx
                            }
                            // viseme_* aliases required by TalkingHead lipsync engine
                            const visemeName = VROID_VISEME[vroidName]
                            if (visemeName && !node.morphTargetDictionary[visemeName]) {
                                node.morphTargetDictionary[visemeName] = idx
                            }
                        })
                    }
                })
            }
        )

        // NOTE: Mixamo FBX animations (Idle.fbx etc.) are NOT loaded here.
        // They are calibrated for Mixamo bone orientations and would misrotate
        // VRoid bones, causing the same "legs pointing up" distortion.
        // The avatar uses its natural bind pose (T/A-pose) instead.

        startIdleAnimation(head)
        talkingHeadInstance = head
        return head
    } catch (error) {
        console.error('Failed to initialize TalkingHead avatar:', error)
        throw error
    }
}

/**
 * Group ElevenLabs character-level alignment into words + timing arrays.
 * Returns { words, wtimes (ms), wdurations (ms) } for speakAudio().
 */
function charAlignmentToWords(chars, starts, ends) {
    const words = [], wtimes = [], wdurations = []
    let wordChars = '', wordStart = null, wordEnd = null
    for (let i = 0; i < chars.length; i++) {
        if (chars[i] === ' ' || chars[i] === '\n') {
            if (wordChars) {
                words.push(wordChars)
                wtimes.push(wordStart * 1000)
                wdurations.push((wordEnd - wordStart) * 1000)
                wordChars = ''; wordStart = null; wordEnd = null
            }
        } else {
            if (wordStart === null) wordStart = starts[i]
            wordEnd = ends[i]
            wordChars += chars[i]
        }
    }
    if (wordChars) {
        words.push(wordChars)
        wtimes.push(wordStart * 1000)
        wdurations.push((wordEnd - wordStart) * 1000)
    }
    return { words, wtimes, wdurations }
}

/**
 * Drive TalkingHead to speak an AudioBuffer with lip-sync word timing.
 * Returns a Promise that resolves when speech is complete.
 *
 * Three-layer completion detection — needed because polling alone is racy:
 *
 *  1. MARKER (primary): pushed to speechQueue after the audio items.
 *     TalkingHead processes queue items in order via startSpeaking(true).
 *     When the audio item finishes, TalkingHead calls startSpeaking(true) again,
 *     which reaches our marker and calls finish() at the exact right moment.
 *
 *  2. DELAYED POLL (backup): starts 250ms after speakAudio() to avoid the
 *     brief window where isSpeaking is still false (after stopSpeaking() and
 *     before speakAudio() / startSpeaking() sets it back to true).
 *     Catches cases where external stopSpeaking() clears the queue (removing marker).
 *
 *  3. SAFETY TIMEOUT (absolute): audio.duration + 3s — fires if all else fails.
 *
 * A `resolved` flag ensures finish() is called at most once regardless of
 * which layer fires first.
 */
async function speakWithTalkingHead(head, audioBuffer, words, wtimes, wdurations) {
    // Stop any current speech. Brief wait lets TalkingHead's internal async
    // state machine (audioPlaylist drain, isSpeaking → false) fully settle
    // before we push new items to the queue.
    head.stopSpeaking()
    await new Promise(r => setTimeout(r, 40))

    return new Promise(resolve => {
        let resolved = false
        let poll = null

        const finish = () => {
            if (resolved) return
            resolved = true
            if (poll) clearInterval(poll)
            resolve()
        }

        // Push audio + word timings to TalkingHead speech queue.
        // isRaw is NOT set — TalkingHead's speakWithHands() IK system fires during speech,
        // driving arm/hand gestures correctly via internal skeleton access.
        // Head tilt is prevented by avatarIgnoreCamera:true in the constructor instead.
        head.speakAudio(
            { audio: audioBuffer, words, wtimes, wdurations },
            { lipsyncLang: 'en' }
        )

        // 1. Primary: marker fires exactly when TalkingHead exhausts audio items
        head.speechQueue.push({ marker: finish })

        // 2. Backup poll — delayed 250ms so isSpeaking is reliably true before we check
        setTimeout(() => {
            if (resolved) return
            poll = setInterval(() => {
                if (!head.isSpeaking) finish()
            }, 100)
        }, 250)

        // 3. Safety timeout — absolute ceiling based on known audio duration
        setTimeout(finish, (audioBuffer.duration * 1000) + 3000)
    })
}

/**
 * Make the avatar speak text with lip-sync.
 *
 * Strategy:
 *   1. Fetch audio from ElevenLabs REST /with-timestamps (gives audio + character timing).
 *   2. Decode the MP3 via TalkingHead's AudioContext.
 *   3. Group characters → words with ms-level timing.
 *   4. Feed { audio, words, wtimes, wdurations } to head.speakAudio() so TalkingHead
 *      converts words → visemes and drives the lip-sync morphs in sync with the audio.
 *
 * Why NOT head.speakText():
 *   speakText() POSTs Google Cloud TTS SSML format. Setting ttsEndpoint to an ElevenLabs
 *   URL causes a 4xx → TalkingHead silently skips the audio → nothing plays.
 */
export async function speak(talkingHead, text) {
    const head = talkingHead || talkingHeadInstance
    if (!head) {
        console.warn('Avatar not initialized')
        return
    }

    // Truncate at last sentence boundary before the ElevenLabs per-request limit
    const ELEVENLABS_CHAR_LIMIT = 900
    let speakText = text
    if (speakText.length > ELEVENLABS_CHAR_LIMIT) {
        const slice = speakText.slice(0, ELEVENLABS_CHAR_LIMIT)
        const lastBreak = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '), slice.lastIndexOf('.\n'))
        speakText = lastBreak > 100 ? slice.slice(0, lastBreak + 1) : slice
    }

    try {
        // Call Cloud Function — ElevenLabs key stays hidden server-side
        const fn = httpsCallable(functions, 'speakWithTimestamps', { timeout: 30000 })
        const { data } = await fn({ text: speakText })

        if (!data.audioBase64) throw new Error('No audio returned from function')

        // Decode base64 MP3 → AudioBuffer via TalkingHead's AudioContext
        const bytes = Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))
        const audioBuffer = await head.audioCtx.decodeAudioData(bytes.buffer.slice(0))

        // Build word timing from character alignment for lip-sync
        let words = [], wtimes = [], wdurations = []
        if (data.alignment?.characters) {
            ;({ words, wtimes, wdurations } = charAlignmentToWords(
                data.alignment.characters,
                data.alignment.character_start_times_seconds,
                data.alignment.character_end_times_seconds
            ))
        }

        if (head.audioCtx?.state !== 'running') {
            try { await head.audioCtx.resume() } catch { /* gesture may be stale */ }
        }

        await speakWithTalkingHead(head, audioBuffer, words, wtimes, wdurations)
        return
    } catch (err) {
        console.warn('ElevenLabs speak failed, using browser TTS:', err.message)
    }

    // Fallback: browser SpeechSynthesis (no avatar lip-sync, but at least audible)
    await new Promise(resolve => {
        const utt = new SpeechSynthesisUtterance(speakText)
        utt.rate = 0.85
        utt.pitch = 0.95
        utt.onend = resolve
        utt.onerror = resolve
        speechSynthesis.cancel()
        speechSynthesis.speak(utt)
    })
}

/**
 * Resume the TalkingHead AudioContext so audio can play.
 *
 * MUST be called synchronously at the start of a user-gesture handler (click, keydown, etc.)
 * before any `await` — browsers only allow AudioContext.resume() during an active gesture.
 * By the time speak() eventually runs (after an async RAG query, etc.), the context is warm.
 *
 * Returns a Promise (await it in the gesture handler to be safe).
 */
export async function warmupAudio(talkingHead) {
    const head = talkingHead || talkingHeadInstance
    if (!head?.audioCtx) return
    if (head.audioCtx.state !== 'running') {
        try {
            await head.audioCtx.resume()
        } catch {
            // Some browsers disallow resume outside of a gesture — that's OK,
            // speak() will try again and fall back to browser TTS if needed.
        }
    }
}

/**
 * Stop any current speech / animation.
 */
export function stopSpeaking(talkingHead) {
    const head = talkingHead || talkingHeadInstance
    if (!head) return

    try {
        head.stopSpeaking()
    } catch (error) {
        console.warn('Error stopping speech:', error.message)
    }
}

/**
 * Play a named Mixamo animation.
 */
export async function playAnimation(talkingHead, animationName) {
    const head = talkingHead || talkingHeadInstance
    if (!head) return

    // VRoid models use different bone orientations than Mixamo FBX animations.
    // Mixamo animations would misrotate VRoid bones, so animations are disabled.
    const animationMap = {}

    const url = animationMap[animationName]
    if (url) {
        try {
            await head.playAnimation(url)
        } catch (error) {
            console.warn(`Could not play animation ${animationName}:`, error.message)
        }
    }
}

/**
 * Get current avatar state.
 */
export function getAvatarState(talkingHead) {
    const head = talkingHead || talkingHeadInstance
    if (!head) {
        return { isSpeaking: false, currentAnimation: 'none', isReady: false }
    }

    return {
        isSpeaking: head.isSpeaking || false,
        currentAnimation: head.currentAnimation || 'Idle',
        isReady: true,
    }
}

/**
 * Dispose of the avatar and clean up resources.
 */
export function disposeAvatar(talkingHead) {
    stopIdleAnimation()
    const head = talkingHead || talkingHeadInstance
    talkingHeadInstance = null  // set null before dispose so idle tick exits cleanly
    if (head) {
        try {
            head.stopSpeaking?.()
        } catch { /* ignore */ }
        try {
            head.dispose?.()
        } catch (e) {
            console.warn('Error disposing avatar:', e.message)
        }
    }
}
