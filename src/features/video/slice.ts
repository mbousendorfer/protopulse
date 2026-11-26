// Juno's slice: sources being watched or added, the clips she cut, the brand kit, and the editor's history.
import type { State } from '../../app/state'
import type { Decision, Handoff, Network } from '../../app/types'
import { DAY, T } from '../../app/time'
import { actionOf, addRule, agentOf, notify, now, pushHandoff, pushLog, removeHandoff, track, uid, updateHandoff } from '../../app/core'
import { POSTS, type Pillar, type Post } from '../../data/publishing'
import {
  BROLL, BRAND_KIT, ON_SCREEN, PEOPLE, PHASES, PHASE_MS, RELEASES, SEEDS, SOURCE_DEFS, TRANSCRIPT, TRIALS, clipFromSeed, clipsCard, speakerName, type BrandKit, type ClipSeed, type Source,
} from '../../data/video'
import { LESSONS, TRENDS } from '../../data/listening'
import { clipPerf, netAverage } from '../insights/metrics'
import { LANG_LABEL, NETWORK_FIT, buildVersions, translatedCaption, type PostTags, captionSlips, coverFrames, coverText, shortsTitle, type Transcript, trackRecord, clipLengthOf, clipPosts, fitsLength, lengthSpec, findMoments, keywords, rescore, slipLabel, type Clip, type Evidence, type Lang, type Sentence,
  HOOK_RULE, RULE_AFTER, productAt, numberWins, trialHold, trialPair, winnerOf, type TrialRecord } from './model'

export type VideoState = {
  sources: Source[]
  clips: Clip[]
  kit: BrandKit
  /** Undo/redo inside the editor, for the clip being edited. */
  editor: { clip?: string; past: Clip[]; future: Clip[] }
  /** When each clip was first opened, for the tester log's time to decision. */
  opened: Record<string, number>
  /** Signed releases of the people on screen who aren't staff (see PEOPLE). */
  releases: Record<string, boolean>
  /** Every hook trial Juno finished, oldest first: what she learns from. */
  trials: TrialRecord[]
  /** Juno already proposed the hook rule: she doesn't ask twice. */
  ruleAsked?: boolean
}

/** On Act, Juno sends clips scoring at least this to Atlas herself. */
export const SEND_ALONE = 80
const ARRIVED = T(17, 52, -1)
export function initialVideo(): VideoState {
  const sources: Source[] = [{ ...SOURCE_DEFS.repair, status: 'ready' }, { ...SOURCE_DEFS.live, status: 'ready' }]
  const seeded = sources.flatMap(src => SEEDS[src.media].map(seed => clipFromSeed(seed, src, src.id === 'live' ? T(19, 10, -4) : ARRIVED)))
  const clips = withTrack(seeded, seeded, POSTS, false).map(c => ({ ...withCover(c, TRANSCRIPT[c.source], (ON_SCREEN[c.source] ?? []).filter(p => !RELEASES[p.who])), versions: buildVersions(c) }))
  return { sources, clips, kit: structuredClone(BRAND_KIT), editor: { past: [], future: [] }, opened: {}, releases: { ...RELEASES }, trials: [...TRIALS] }
}

export type VideoAction =
  | { type: 'video/open'; id: string }
  | { type: 'video/edit'; id: string; patch: Partial<Clip> }
  | { type: 'video/undo' }
  | { type: 'video/redo' }
  | { type: 'video/send'; ids: string[] }
  | { type: 'video/snooze'; ids: string[] }
  | { type: 'video/dismiss'; id: string; reason: string }
  | { type: 'video/addLink'; url: string }
  | { type: 'video/addUpload'; name: string; blob: string }
  | { type: 'video/start'; id: string }
  | { type: 'video/retry'; id: string }
  | { type: 'video/find'; source: string; query: string; len: number; count: number }
  | { type: 'video/kit'; patch: Partial<BrandKit> }
  | { type: 'video/dub'; id: string; lang: Lang }
  | { type: 'video/approveDub'; id: string; lang: Lang }
  | { type: 'video/release'; person: string; signed: boolean }
  | { type: 'video/trial'; id: string }
  | { type: 'video/trialStop'; id: string }
  | { type: 'video/recut'; id: string }

/* ---------- Small setters ---------- */

const setVideo = (s: State, v: Partial<VideoState>): State => ({ ...s, video: { ...s.video, ...v } })
const patchClips = (s: State, ids: string[], f: (c: Clip) => Clip): State => setVideo(s, { clips: s.video.clips.map(c => (ids.includes(c.id) ? f(c) : c)) })
const patchSource = (s: State, id: string, p: Partial<Source>): State => setVideo(s, { sources: s.video.sources.map(x => (x.id === id ? { ...x, ...p } : x)) })
const sourceOf = (s: State, id: string) => s.video.sources.find(x => x.id === id)
const PILLAR: Record<string, Pillar> = { repair: 'Repair & care', gr20: 'Gear that lasts', live: 'Community' }
export const isPrivate = (url?: string) => !!url && /private|login|signin/i.test(url)
export const validUrl = (raw: string) => { try { const u = new URL(raw.trim()); return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u : null } catch { return null } }
const TOMORROW_8 = (t: number) => { const d = new Date(t); d.setHours(8, 0, 0, 0); return d.getTime() + DAY }

/** The Desk card of a source follows its ready clips: fewer clips, new count; none left, the card leaves. */
function syncCard(s: State, sourceId: string): State {
  const src = sourceOf(s, sourceId)
  if (!src?.handoff) return s
  const left = s.video.clips.filter(c => c.source === sourceId && c.status === 'ready')
  if (!s.handoffs.some(h => h.id === src.handoff)) return patchSource(s, sourceId, { handoff: undefined })
  if (!left.length) return patchSource(removeHandoff(s, src.handoff), sourceId, { handoff: undefined })
  const { id: _, ...card } = clipsCard(src, left)
  return updateHandoff(s, src.handoff, card)
}

const decided = (s: State, c: Clip, outcome: string, extra: Record<string, unknown> = {}): State => {
  const opened = s.video.opened[c.id]
  return track(s, 'video/decision', { clip: c.id, outcome, ms: opened ? now(s) - opened : undefined, ...extra })
}

/* ---------- Guardrails ---------- */

/** Clips per video per week (agents.ts, g4). */
export const WEEKLY_QUOTA = 5
const WEEK = 7 * DAY
/** Clips of this video that went to Atlas in the last 7 days. */
export const sentThisWeek = (s: State, source: string) =>
  s.video.clips.filter(c => c.source === source && (c.status === 'sent' || c.status === 'published') && (c.sentAt ?? 0) > now(s) - WEEK).length

/** People without a signed release who are on screen in this clip. */
export function unreleased(s: State, c: Clip): string[] {
  const src = sourceOf(s, c.source)
  const spots = (src && ON_SCREEN[src.transcript]) ?? []
  return [...new Set(spots.filter(p => !s.video.releases[p.who] && p.s < c.end && p.e > c.start).map(p => p.who))]
}

/** Why this clip can't go out on its own merits (release, length), or undefined. The weekly quota is per batch: see `sendClips`. */
export function holdReason(s: State, c: Clip): string | undefined {
  const who = unreleased(s, c)
  if (who.length) return `${who.map(p => PEOPLE[p].name).join(' and ')} ${who.length > 1 ? 'are' : 'is'} on screen without a signed release`
  const src = sourceOf(s, c.source)
  if (!src) return undefined
  const dur = clipLengthOf(c, TRANSCRIPT[src.transcript])
  if (!c.post.networks.some(n => fitsLength(n, dur))) return `${Math.round(dur)} s is outside every chosen network’s length (${lengthSpec('tiktok').min}–${lengthSpec('tiktok').max} s, ${lengthSpec('linkedin').max} s on LinkedIn)`
  return undefined
}

/** Which of these clips can go out now, best first, and why the others wait. */
export function vetClips(s: State, picked: Clip[]): { go: Clip[]; held: { clip: Clip; why: string }[] } {
  const held: { clip: Clip; why: string }[] = []
  const ok: Clip[] = []
  for (const c of picked) { const why = holdReason(s, c); if (why) held.push({ clip: c, why }); else ok.push(c) }
  const go: Clip[] = []
  for (const src of new Set(ok.map(c => c.source))) {
    const left = Math.max(0, WEEKLY_QUOTA - sentThisWeek(s, src))
    const mine = ok.filter(c => c.source === src).sort((a, b) => rescore(b, trOf(s, b)).total - rescore(a, trOf(s, a)).total)
    go.push(...mine.slice(0, left))
    for (const c of mine.slice(left)) held.push({ clip: c, why: `${WEEKLY_QUOTA} clips from this video already go out this week. Juno kept the best ones` })
  }
  return { go, held }
}

/* ---------- Labels and campaign ---------- */

/**
 * Sage's running campaign a clip belongs to: live now, and already carrying Atlas posts of the clip's pillar.
 * Read through Sage's state (`s.strategy.campaigns`), never written.
 */
export function campaignFor(s: State, c: Clip) {
  const t = now(s)
  return s.strategy.campaigns.find(k => k.status === 'live' && k.start <= t && k.end >= t && s.publishing.posts.some(p => p.campaign === k.name && p.pillar === c.pillar))
}
export const tagsFor = (s: State, c: Clip): PostTags => {
  const k = campaignFor(s, c)
  return { labels: [c.pillar], ...(k ? { campaign: k.name, campaignId: k.id } : {}) }
}

/** Which language versions go out with a clip: all on Act; otherwise the approved ones, the rest wait. */
export function langsOut(s: State, c: Clip): { out: Lang[]; wait: Lang[] } {
  const review = levelOf(s, 'juno-dub') === 'act' ? [] : c.audio.review ?? []
  return { out: c.audio.dubs.filter(l => !review.includes(l)), wait: c.audio.dubs.filter(l => review.includes(l)) }
}

/* ---------- Sending to Atlas ---------- */

/** Ready clips become scheduled posts in Atlas's calendar. One journal line, one Undo. From the Desk, the Desk's own line undoes it. */
export function sendClips(s: State, ids: string[], by: 'you' | 'desk' | 'juno', fromCard?: string): State {
  const { go: picked, held } = vetClips(s, s.video.clips.filter(c => ids.includes(c.id) && (c.status === 'ready' || c.status === 'snoozed')))
  const heldText = held.length ? ` ${held.length === 1 ? `“${held[0].clip.title}” stays here: ${held[0].why}.` : `${held.length} stay here: ${[...new Set(held.map(h => h.why))].join('; ')}.`}` : ''
  if (!picked.length) return held.length && by === 'you' ? notify(s, 'video', `Nothing sent.${heldText}`) : s
  const t = now(s)
  let posts = s.publishing.posts
  const made: Record<string, string[]> = {}
  const langsMade: Lang[] = []
  const langsWait = new Set<Lang>()
  for (const c of picked) {
    const dur = clipLengthOf(c, trOf(s, c))
    const tags = tagsFor(s, c)
    let ps = clipPosts(c, posts, t, () => uid('p'), dur, tags)
    // Language versions: on Act all of them; otherwise only the ones you approved (or made yourself).
    const { out, wait } = langsOut(s, c)
    for (const l of wait) langsWait.add(l)
    for (const l of out) {
      const text = translatedCaption(c, trOf(s, c), l)
      const lp = clipPosts({ ...c, post: { ...c.post, text: Object.fromEntries(c.post.networks.map(n => [n, text])) } }, [...posts, ...ps], t, () => uid('p'), dur, { ...tags, labels: [...tags.labels, LANG_LABEL[l]] })
      ps = [...ps, ...lp.map(p => ({ ...p, note: `${p.note} · ${LANG_LABEL[l]}` }))]
      langsMade.push(l)
    }
    posts = [...posts, ...ps]; made[c.id] = ps.map(p => p.id)
  }
  let next: State = { ...s, publishing: { ...s.publishing, posts } }
  next = patchClips(next, picked.map(c => c.id), c => ({ ...c, status: 'sent', posts: made[c.id], back: undefined, sentAt: t, sentFrom: by === 'desk' ? fromCard : undefined }))
  for (const c of picked) next = decided(next, c, c.edited ? 'modified' : 'as-is', { by })
  for (const id of new Set(picked.map(c => c.source))) next = syncCard(next, id)
  if (by === 'desk') return next
  const n = Object.values(made).flat().length
  const inLangs = [...new Set(langsMade)].map(l => LANG_LABEL[l])
  const langText = inLangs.length ? ` ${inLangs.join(' and ')} version${inLangs.length > 1 ? 's' : ''} included.` : ''
  const waitText = langsWait.size ? ` ${[...langsWait].map(l => LANG_LABEL[l]).join(' and ')} wait${langsWait.size > 1 ? '' : 's'} for your review.` : ''
  const text = (picked.length === 1 ? `Sent “${picked[0].title}” to Atlas: ${n} post${n > 1 ? 's' : ''} scheduled.` : `Sent ${picked.length} clips to Atlas: ${n} posts scheduled.`) + langText + waitText + heldText
  next = pushLog(next, { agent: 'juno', text, status: by === 'juno' ? 'done' : 'approved', reason: by === 'juno' ? 'Sending her best clips is set to Act' : 'You sent them from Video', undoMinutes: 10, clips: picked.map(c => c.id), link: '/publishing/calendar' })
  return by === 'you' ? notify(next, 'video', text, { undo: next.log[0].id, link: { to: '/publishing/calendar', label: 'Open the calendar' } }) : next
}

/** Undo: the clips' scheduled posts leave the calendar and the clips are back to review. */
export function unsendClips(s: State, ids: string[]): State {
  const media = new Set(ids.map(id => `clip:${id}`))
  let next: State = { ...s, publishing: { ...s.publishing, posts: s.publishing.posts.filter(p => !(p.media && media.has(p.media) && p.status === 'scheduled')) } }
  next = patchClips(next, ids, c => ({ ...c, status: 'ready', posts: undefined, sentFrom: undefined, sentAt: undefined }))
  return next
}

/** Undoing a Desk decision on a clips card also takes back what it sent. */
export const undoDeskClips = (s: State, h: Handoff): State =>
  h.topic === 'Clips' ? unsendClips(s, s.video.clips.filter(c => c.sentFrom === h.id).map(c => c.id))
    : h.topic === 'Recut' ? unsendClips(s, s.video.clips.filter(c => c.sentFrom === h.id).map(c => c.id))
    : h.topic === 'Hook trial' && h.ref ? backToTrialHook(unsendClips(s, s.video.clips.filter(c => c.sentFrom === h.id).map(c => c.id)), [h.ref])
      : h.topic === 'Hook rule' ? refreshTrack({ ...s, playbook: { ...s.playbook, rules: s.playbook.rules.filter(r => r.text !== HOOK_RULE) } })
        : h.topic === 'Captions' && h.fixes ? undoVideoWork(s, h.fixes) : s

/* ---------- Captions, framing and dubs: each follows its own level ---------- */

const levelOf = (s: State, action: string) => actionOf(s, 'juno', action)?.autonomy ?? 'suggest'
const trOf = (s: State, c: Clip) => TRANSCRIPT[sourceOf(s, c.source)?.transcript ?? c.source]
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

/** Apply caption fixes (clip id → word indexes) with the transcript's real words. */
function setFixes(s: State, fixes: Record<string, number[]>, on: boolean): State {
  return patchClips(s, Object.keys(fixes), c => {
    const tr = trOf(s, c)
    const next = { ...c.fixes }
    for (const i of fixes[c.id]) { if (on) next[i] = tr.words[i].w; else delete next[i] }
    return { ...c, fixes: next }
  })
}

/**
 * Juno checks the captions of these clips against the Playbook's product names. Act: she fixes them, with Undo.
 * Draft: a Desk card, approving it fixes them. Suggest: the words stay flagged in Video and in the editor, you fix them.
 */
export function checkCaptions(s: State, ids: string[]): State {
  const fixes: Record<string, number[]> = {}
  const labels = new Set<string>()
  for (const c of s.video.clips.filter(x => ids.includes(x.id) && (x.status === 'ready' || x.status === 'snoozed'))) {
    const slips = captionSlips(c, trOf(s, c))
    const idx = Object.keys(slips).map(Number)
    if (!idx.length) continue
    fixes[c.id] = idx
    for (const i of idx) labels.add(slipLabel(c.heard![i], slips[i]))
  }
  const clips = Object.keys(fixes)
  if (!clips.length) return s
  const what = [...labels].join(', ')
  const level = levelOf(s, 'juno-captions')
  if (level === 'act') {
    const next = setFixes(s, fixes, true)
    return pushLog(next, { agent: 'juno', text: `Fixed ${plural(labels.size, 'product name')} in the captions of ${plural(clips.length, 'clip')}: ${what}`, status: 'done', reason: 'Caption fixes are set to Act', undoMinutes: 10, captionFixes: fixes, link: `/video/clips/${clips[0]}` })
  }
  if (level === 'suggest') return s
  // Draft: one card for every open fix, refreshed rather than duplicated.
  const open = s.handoffs.find(h => h.agent === 'juno' && h.topic === 'Captions')
  const merged = { ...(open?.fixes ?? {}), ...fixes }
  const n = Object.keys(merged).length
  const card = {
    agent: 'juno' as const, kind: 'approval' as const, urgency: 'week' as const, topic: 'Captions', action: 'juno-captions',
    title: `Fix ${what} in ${plural(n, 'caption')}`, context: `Speech-to-text heard ${what}. The Playbook spells it the other way.`,
    why: 'Caption fixes are set to Draft: Juno fixes them once you approve.', confidence: 93, link: `/video/clips/${Object.keys(merged)[0]}`,
    sources: [{ label: 'Product names', from: 'Playbook facts' }], fixes: merged,
  }
  return open ? updateHandoff(s, open.id, card) : pushHandoff(s, card)
}

/** The scripted morning check: Juno re-reads the captions of every clip waiting for review. */
export const captionsScript = { tag: 'video', run: (s: State) => checkCaptions(s, s.video.clips.filter(c => c.status === 'ready' || c.status === 'snoozed').map(c => c.id)) }

const BARE_BRAND = (b: Clip['brand']): Clip['brand'] => ({ ...b, logo: false, progress: false, intro: false, outro: false, music: undefined })

/** New clips, as each level leaves them: framed and branded (Act), framed and branded to check (Draft), raw with a suggestion (Suggest). Dubs alike. */
function prepare(s: State, clips: Clip[]): Clip[] {
  const frame = levelOf(s, 'juno-reframe')
  const dub = levelOf(s, 'juno-dub')
  const langs: Lang[] = s.video.kit.langs
  return clips.map(c => ({
    ...(frame === 'suggest' ? c : { ...withCover(c, trOf(s, c), noRelease(s, sourceOf(s, c.source)?.transcript ?? '')), versions: buildVersions(c) }),
    ...(frame === 'suggest' ? { frame: 'fit' as const, brand: BARE_BRAND(c.brand), framing: 'suggested' as const } : frame === 'draft' ? { framing: 'check' as const } : {}),
    audio: dub === 'suggest' ? c.audio : { ...c.audio, dubs: langs, review: dub === 'draft' ? langs : [] },
  }))
}

/** On Act, the dubs Juno made alone go to the journal, with an Undo that takes them back. */
function logDubs(s: State, clips: Clip[]): State {
  if (levelOf(s, 'juno-dub') !== 'act' || !clips.length || !s.video.kit.langs.length) return s
  const names = s.video.kit.langs.map(l => LANG_LABEL[l]).join(' and ')
  return pushLog(s, { agent: 'juno', text: `Made ${names} versions of ${plural(clips.length, 'clip')}`, status: 'done', reason: 'Translate and dub is set to Act', undoMinutes: 10, dubs: Object.fromEntries(clips.map(c => [c.id, s.video.kit.langs])), link: `/video/clips/${clips[0].id}` })
}

/** Undo: the fixes and dubs Juno made alone come off. */
export function undoVideoWork(s: State, captionFixes?: Record<string, number[]>, dubs?: Record<string, Lang[]>): State {
  let next = captionFixes ? setFixes(s, captionFixes, false) : s
  if (dubs) next = patchClips(next, Object.keys(dubs), c => {
    const left = c.audio.dubs.filter(l => !dubs[c.id].includes(l))
    return { ...c, audio: { ...c.audio, dubs: left, review: c.audio.review?.filter(l => left.includes(l)), lang: left.includes(c.audio.lang) ? c.audio.lang : 'en' } }
  })
  return next
}

/* ---------- Cover ---------- */

/** Source ranges showing someone without a signed release: never a cover. */
export const noRelease = (s: { video: { releases: Record<string, boolean> } }, transcript: string) => (ON_SCREEN[transcript] ?? []).filter(p => !s.video.releases[p.who])
/** Juno's pick: the best frame, the hook on it, the Shorts title. */
export function withCover(c: Clip, tr: Transcript, avoid: { s: number; e: number }[]): Clip {
  const best = coverFrames(c, tr, avoid)[0]
  return { ...c, cover: best ? { at: best.at, text: coverText(c.hook), by: 'juno' } : undefined, ytTitle: c.post.networks.includes('youtube') ? shortsTitle(c) : undefined }
}

/* ---------- Track record ---------- */

/** Clips waiting for review learn from what was published: their track record is refreshed. */
const withTrack = (clips: Clip[], all: Clip[], posts: Post[], rule: boolean) => clips.map(c => (c.status === 'ready' || c.status === 'snoozed' ? { ...c, track: trackRecord(c, all, posts, rule) } : c))
/** The hook rule counts in the score while it's in the Playbook and not paused. */
export const hookRuleOn = (s: State) => s.playbook.rules.some(r => r.text === HOOK_RULE && !r.paused)
// ponytail: refreshed when Juno's clips or the rule change through her; a rule paused in the Playbook shows on the next refresh.
const refreshTrack = (s: State): State => setVideo(s, { clips: withTrack(s.video.clips, s.video.clips, s.publishing.posts, hookRuleOn(s)) })

/* ---------- After it goes out: published, with numbers ---------- */

const postsOf = (s: State, c: Clip) => (c.posts ?? []).map(id => s.publishing.posts.find(p => p.id === id)).filter(p => !!p && p.status !== 'failed' && p.status !== 'draft') as Post[]

/** A published clip's numbers are Iris's (`clipPerf`), fed with Juno's score. */
export const clipNumbers = (s: State, c: Clip) => clipPerf(s, c.id, rescore(c, trOf(s, c)).total)

/** The first of a sent clip's posts: once it's past, the clip is out. */
const outAt = (s: State, c: Clip) => { const ps = postsOf(s, c); return ps.length ? Math.min(...ps.map(p => p.at)) : Infinity }

/** Clips whose posts all went out become Published with their numbers; one that beats its network's average is good news. */
function publishDue(s: State, t: number): State {
  let next = s
  for (const c of s.video.clips.filter(x => x.status === 'sent' && outAt(s, x) <= t)) {
    const stats = clipNumbers(next, c) ?? { views: 0, er: 0 }
    const net = postsOf(next, c).filter(p => p.at <= t).sort((a, b) => a.at - b.at)[0]?.network ?? c.post.networks[0]
    next = patchClips(next, [c.id], x => ({ ...x, status: 'published', stats }))
    const avg = netAverage(next, net)
    const lift = avg ? stats.views / avg.reach : 1
    const k = `${(stats.views / 1000).toFixed(1)}k`
    next = pushLog(next, { agent: 'juno', text: `“${c.title}” is out: ${k} views, ${stats.er}% engagement on its first day`, status: 'done', reason: 'Atlas posted it at the planned time; the numbers are Iris’s', link: `/video/clips/${c.id}` })
    if (lift >= 1.5 && !next.handoffs.some(h => h.ref === c.id)) {
      next = pushHandoff(next, {
        agent: 'juno', kind: 'news', urgency: 'week', topic: 'Clip', group: 'good', ref: c.id,
        title: `“${c.title}” passed ${k} views`, context: `${stats.er}% engagement, ${lift.toFixed(1)}× your ${NETWORK_FIT[net] ?? net} average.`,
        why: `Juno cut it from “${sourceOf(next, c.source)?.title ?? 'your video'}”. ${c.why.split('. ')[0]}.`, confidence: 90, link: `/video/clips/${c.id}`,
        cta: { label: 'Find more moments in that video', to: `/video/sources/${c.source}` },
      })
    }
  }
  return next
}

/* ---------- Sources ---------- */

function newSource(s: State, src: Source): State {
  const level = actionOf(s, 'juno', 'juno-clip')?.autonomy
  if (level !== 'suggest') return setVideo(s, { sources: [{ ...src, status: 'processing', startedAt: now(s) }, ...s.video.sources] })
  // Suggest: Juno asks before cutting.
  const hid = uid('h')
  let next = setVideo(s, { sources: [{ ...src, status: 'waiting', handoff: hid }, ...s.video.sources] })
  next = pushHandoff(next, {
    id: hid, agent: 'juno', kind: 'approval', urgency: 'today', topic: 'New video', action: 'juno-clip', ref: src.id,
    title: `New video on YouTube: “${src.title}”`, context: `Published at ${new Date(src.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} on ${src.channel}.`,
    why: 'Drafting clips is set to Suggest: Juno asks before cutting a new video.', confidence: 80, link: '/video/sources',
  })
  return next
}

/** A new upload or live on the watched channel (script event or moderator). */
export function videoEvent(s: State, sourceId: string, moderator: boolean): State {
  const def = SOURCE_DEFS[sourceId]
  if (!def) return s
  if (sourceOf(s, sourceId)) {
    // The feed may have played it already. From the moderator, replay it while none of its clips went out.
    const mine = s.video.clips.filter(c => c.source === sourceId)
    if (!moderator || mine.some(c => c.status === 'sent' || c.status === 'published')) return s
    const ids = new Set(mine.map(c => c.id))
    const cards = new Set([sourceOf(s, sourceId)!.handoff, ...s.handoffs.filter(h => h.ref === sourceId).map(h => h.id)])
    s = { ...s, handoffs: s.handoffs.filter(h => !cards.has(h.id)) }
    s = setVideo(s, { sources: s.video.sources.filter(x => x.id !== sourceId), clips: s.video.clips.filter(c => !ids.has(c.id)) })
  }
  if (!moderator && (agentOf(s, 'juno').status !== 'on' || (def.kind === 'live' ? !s.video.kit.watchLives : !s.video.kit.watchUploads))) return s
  return newSource(s, { ...def, at: now(s), status: 'processing' })
}

/** Juno goes back to a video for more moments on a topic (moderator): enough clips to run into the weekly quota. */
export const moreMomentsScript = { tag: 'video', run: (s: State) => reduceVideo(s, { type: 'video/find', source: 'repair', query: 'stitches webbing bin carbon', len: 20, count: 4 }) }

/** A script event: a new video on a watched channel. Juno clips it in Video (and raises a Desk card on Draft). */
export const videoScript = (source: string) => ({ tag: 'video', run: (s: State, manual: boolean) => videoEvent(s, source, manual) })

function startSource(s: State, id: string): State {
  const src = sourceOf(s, id)
  if (!src) return s
  const next = src.handoff ? removeHandoff(s, src.handoff) : s
  return patchSource(next, id, { status: 'processing', startedAt: now(s), error: undefined, handoff: undefined })
}

/** Processing done: the clips arrive, best first. Then the card, the journal, or Juno sends her best clips herself. */
function finishSource(s: State, src: Source): State {
  const t = now(s)
  const tr = TRANSCRIPT[src.transcript]
  const fresh = withTrack(prepare(s, SEEDS[src.media].map(seed => clipFromSeed({ ...seed, status: undefined, stats: undefined }, src, t, s.video.kit))), s.video.clips, s.publishing.posts, hookRuleOn(s))
    .sort((a, b) => rescore(b, tr).total - rescore(a, tr).total)
  let next = setVideo(patchSource(s, src.id, { status: 'ready', startedAt: undefined }), { clips: [...fresh, ...s.video.clips] })
  next = logDubs(checkCaptions(next, fresh.map(c => c.id)), fresh)
  // Hook trials on Act: Juno tests her best clips' hooks first; the winner goes out when the trial ends.
  const best = fresh.filter(c => rescore(c, tr).total >= SEND_ALONE).map(c => c.id)
  const trialled = levelOf(next, 'juno-trial') === 'act' ? best.filter(id => canTrial(next, next.video.clips.find(c => c.id === id)!) === true) : []
  if (trialled.length) next = startTrials(next, trialled, 'juno')
  if (actionOf(next, 'juno', 'juno-handoff')?.autonomy === 'act') {
    const rest = best.filter(id => !trialled.includes(id))
    if (rest.length) next = sendClips(next, rest, 'juno')
  }
  const left = next.video.clips.filter(c => c.source === src.id && c.status === 'ready')
  if (actionOf(next, 'juno', 'juno-clip')?.autonomy === 'act' || !left.length) {
    return pushLog(next, { agent: 'juno', text: `Cut ${fresh.length} clips from “${src.title}”`, reason: 'Drafting clips is set to Act', status: 'done', link: `/video?source=${src.id}` })
  }
  const hid = uid('h')
  next = pushHandoff(next, { ...clipsCard(src, left), id: hid })
  return patchSource(next, src.id, { handoff: hid })
}

/** Heartbeat: processing moves on, private links fail, snoozed clips come back. */
export function tickVideo(s: State, t: number): State {
  let next = s
  for (const src of s.video.sources) {
    if (src.status !== 'processing' || !src.startedAt) continue
    const elapsed = t - src.startedAt
    if (isPrivate(src.url) && elapsed >= PHASE_MS) next = patchSource(next, src.id, { status: 'failed', startedAt: undefined, error: 'This video is private, so Juno can’t open it. Make it unlisted, or upload the file.' })
    else if (elapsed >= PHASES.length * PHASE_MS) next = finishSource(next, sourceOf(next, src.id)!)
  }
  for (const c of next.video.clips.filter(x => x.status === 'trial' && (x.trial?.until ?? Infinity) <= t)) next = finishTrial(next, c.id)
  const back = next.video.clips.filter(c => c.status === 'snoozed' && (c.back ?? Infinity) <= t).map(c => c.id)
  if (back.length) next = patchClips(next, back, c => ({ ...c, status: 'ready', back: undefined }))
  const published = publishDue(next, t)
  return published === next ? next : refreshTrack(published)
}

export const videoDue = (s: State, t: number) =>
  s.video.sources.some(src => src.status === 'processing' && !!src.startedAt && t - src.startedAt >= (isPrivate(src.url) ? PHASE_MS : PHASES.length * PHASE_MS)) ||
  s.video.clips.some(c => (c.status === 'snoozed' && (c.back ?? Infinity) <= t) || (c.status === 'sent' && outAt(s, c) <= t) || (c.status === 'trial' && (c.trial?.until ?? Infinity) <= t))

/* ---------- Desk ---------- */

export function onResolveVideo(s: State, h: Handoff, d: Decision): State {
  if (h.agent !== 'juno') return s
  const yes = d.kind === 'approve' || d.kind === 'option' || d.kind === 'trial'
  if (h.topic === 'Captions' && h.fixes) {
    // Only what's still wrong: you may have fixed some in the editor meanwhile.
    const open = Object.fromEntries(Object.entries(h.fixes).map(([id, idx]) => [id, idx.filter(i => s.video.clips.find(c => c.id === id)?.fixes[i] === undefined)]).filter(([, idx]) => idx.length))
    return yes ? setFixes(s, open, true) : s
  }
  if (h.topic === 'Hook rule') {
    if (!yes || hookRuleOn(s)) return s
    const n = numberWins(s.video.trials).length
    return refreshTrack(addRule(s, { kind: 'do', text: HOOK_RULE, agents: ['juno'], origin: `Learned from ${n} hook trials · Juno` }))
  }
  if (h.topic === 'Hook trial' && h.ref) return yes ? useWinner(s, h.ref, 'desk', h.id) : s
  if (h.topic === 'Recut' && h.ref) return yes ? sendClips(s, [h.ref], 'desk', h.id) : removeRecuts(s, [h.ref])
  if (!h.ref) return s
  const src = sourceOf(s, h.ref)
  if (!src) return s
  let next = patchSource(s, src.id, { handoff: undefined })
  if (h.topic === 'Clips' && yes) next = sendClips(next, next.video.clips.filter(c => c.source === src.id && c.status === 'ready').map(c => c.id), 'desk', h.id)
  if (h.topic === 'New video' && yes) next = startSource(next, src.id)
  return next
}

/* ---------- Recut: a published clip that did worse than usual ---------- */

/** Under this share of its network's average views (Iris's `netAverage`), a published clip did worse than usual. */
export const FLOP = 0.5
const k1 = (n: number) => `${(n / 1000).toFixed(1)}k`
const LESSON = LESSONS.find(l => l.id === 'ls1')!

/** How a published clip did against its network's average, when it did worse than usual. */
export function flopOf(s: State, c: Clip): { net: Network; avg: number; share: number } | undefined {
  if (c.status !== 'published' || !c.stats || c.recutOf) return
  const net = c.post.networks[0]
  const avg = netAverage(s, net)?.reach
  if (!avg || c.stats.views >= avg * FLOP) return
  return { net, avg, share: c.stats.views / avg }
}
export const recutOf = (s: State, c: Clip) => s.video.clips.find(x => x.recutOf === c.id && x.status !== 'dismissed')

/** The new cut: same moment, the product on screen from the first second (B-roll), the hook that names it. Waits for review. */
export function makeRecut(s: State, c: Clip): Clip | undefined {
  const src = sourceOf(s, c.source)
  const f = flopOf(s, c)
  if (!src || !f || recutOf(s, c)) return
  const tr = TRANSCRIPT[src.transcript]
  const said = tr.sentences.filter(x => x.s < c.end && x.e > c.start).map(x => x.text).join(' ')
  const shot = BROLL.find(b => b.match.test(said)) ?? BROLL[1]
  const at = productAt(c, tr)
  const hook = c.hooks.find(h => /bag|ridge|bottle|jacket/i.test(h)) ?? c.hook
  const when = at === undefined ? 'The product is never on screen' : `The product shows up at ${mmss(at)}`
  const t = now(s)
  return {
    ...c, id: `${c.id}-recut`, title: `${c.title} (recut)`, hook, status: 'ready', stats: undefined, posts: undefined, sentAt: undefined, sentFrom: undefined, edited: false,
    trial: undefined, recutOf: c.id, arrivedAt: t, base: { ...c.base, hook: Math.min(95, c.base.hook + 10) },
    broll: [{ id: uid('br'), asset: shot.id, at: c.start, dur: 2 }],
    cover: c.cover ? { ...c.cover, text: coverText(hook) } : c.cover,
    why: `“${c.title}” got ${k1(c.stats!.views)} views, ${Math.round(f.share * 100)}% of your ${NETWORK_FIT[f.net] ?? f.net} average. ${when}: this cut opens on “${shot.label.toLowerCase()}” for 2 seconds, then Léo’s answer.`,
    evidence: [
      { value: k1(c.stats!.views), label: `views on the first cut, against ${k1(f.avg)} on average`, from: 'Insights', to: '/insights/explore' },
      { value: '2 s', label: `“${LESSON.text}”: Echo’s lesson from competitors`, from: 'Listening', to: '/listening/competitors' },
    ],
  }
}

/** Recuts out: their posts leave the calendar, the clips go. */
export function removeRecuts(s: State, ids: string[]): State {
  const next = unsendClips(s, ids)
  return setVideo(next, { clips: next.video.clips.filter(c => !ids.includes(c.id)) })
}

/**
 * Juno reads how her published clips did. One that did worse than usual, by her level: Suggest, she says so on the clip
 * and in the journal, you recut it; Draft, she makes the recut and asks on the Desk to post it; Act, she makes it and sends it.
 */
export function checkFlops(s: State): State {
  let next = s
  for (const c of s.video.clips.filter(x => flopOf(s, x) && !recutOf(s, x))) {
    const f = flopOf(next, c)!
    const level = levelOf(next, 'juno-recut')
    const head = `“${c.title}” got ${k1(c.stats!.views)} views on ${NETWORK_FIT[f.net] ?? f.net}, ${Math.round(f.share * 100)}% of your average`
    if (level === 'suggest') { next = pushLog(next, { agent: 'juno', text: `${head}. Recut it from Published to show the product first`, status: 'done', reason: 'Recuts are set to Suggest: you decide', link: `/video/clips/${c.id}` }); continue }
    const r = makeRecut(next, c)!
    next = setVideo(next, { clips: [r, ...next.video.clips] })
    if (level === 'act') {
      next = pushLog(next, { agent: 'juno', text: `${head}. Juno recut it with the product first`, status: 'done', reason: 'Recuts are set to Act', undoMinutes: 10, recuts: [r.id], link: `/video/clips/${r.id}` })
      next = sendClips(next, [r.id], 'juno')
    } else {
      next = pushHandoff(next, {
        agent: 'juno', kind: 'approval', urgency: 'today', topic: 'Recut', action: 'juno-recut', chain: ['juno', 'atlas'], ref: r.id,
        title: `Post a new cut of “${c.title}”?`, context: `${head}. The new cut shows the product from the first second.`,
        why: 'Recuts are set to Draft: Juno made the new cut, and it goes to Atlas once you approve.', confidence: 74, link: `/video/clips/${r.id}`,
        preview: { type: 'clip', clip: r.id }, sources: r.evidence.map(e => ({ label: `${e.value} ${e.label}`, from: e.from })),
      })
    }
  }
  return next
}
export const recutScript = { tag: 'video', run: (s: State) => checkFlops(s) }

/* ---------- Hook trials ---------- */

/** A trial lasts a day on Instagram Reels, shown to non-followers first. */
export const TRIAL_MS = DAY
const pct = (n: number) => `${n}%`
const shortHook = (h: string) => (h.length > 34 ? `${h.slice(0, 32).replace(/\s\S*$/, '')}…` : h)
const hhmmOf = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

/** True when Juno can trial this clip's hooks, else why not. */
export function canTrial(s: State, c: Clip): true | string {
  if (c.status !== 'ready' && c.status !== 'snoozed') return 'It’s not waiting for review'
  if (!trialPair(c)) return 'It has only one hook. Write a second one to test'
  if (!c.post.networks.includes('instagram')) return 'Trials run on Instagram Reels, and this clip doesn’t go to Instagram'
  if (c.trial?.held) return 'Its hooks were already trialled'
  return holdReason(s, c) ?? true
}

/** Trials start: each clip leaves review for a day. By Juno (Act): one journal line, and Undo stops them. */
export function startTrials(s: State, ids: string[], by: 'you' | 'juno'): State {
  const t = now(s)
  const picked = s.video.clips.filter(c => ids.includes(c.id) && canTrial(s, c) === true)
  if (!picked.length) return s
  let next = patchClips(s, picked.map(c => c.id), c => ({ ...c, status: 'trial', back: undefined, trial: { hooks: trialPair(c)!, from: t, until: t + TRIAL_MS, by } }))
  for (const id of new Set(picked.map(c => c.source))) next = syncCard(next, id)
  next = track(next, 'video/trial', { clips: picked.map(c => c.id), by })
  const what = picked.length === 1 ? `“${picked[0].title}”: “${shortHook(trialPair(picked[0])![0])}” against “${shortHook(trialPair(picked[0])![1])}”` : `${picked.length} clips`
  const text = `Trialling 2 hooks of ${what} on Reels, with non-followers first. Results tomorrow at ${hhmmOf(t + TRIAL_MS)}`
  if (by === 'you') return notify(next, 'video', text)
  return pushLog(next, { agent: 'juno', text, status: 'done', reason: 'Hook trials are set to Act', undoMinutes: 10, trials: picked.map(c => c.id), link: `/video/clips/${picked[0].id}` })
}

/** Stop a trial: the clip is back to review with the hook it had. */
export function stopTrials(s: State, ids: string[]): State {
  const ours = s.video.clips.filter(c => ids.includes(c.id) && c.status === 'trial').map(c => c.id)
  if (!ours.length) return s
  return refreshTrack(patchClips(s, ours, c => ({ ...c, status: 'ready', hook: c.trial!.hooks[0], trial: undefined })))
}

/** Back to the hook the clip had before its trial (Undo of using the winner). */
export function backToTrialHook(s: State, ids: string[]): State {
  return patchClips(s, ids, c => (c.trial ? { ...c, hook: c.trial.hooks[0], cover: c.cover?.by === 'juno' ? { ...c.cover, text: coverText(c.trial.hooks[0]) } : c.cover } : c))
}

/** The winning hook goes on the clip (and Juno's cover), then the clip goes to Atlas. */
function useWinner(s: State, id: string, by: 'desk' | 'juno', fromCard?: string): State {
  const c = s.video.clips.find(x => x.id === id)
  if (!c?.trial?.held) return s
  const win = c.trial.hooks[winnerOf({ hooks: c.trial.hooks, held: c.trial.held })]
  const next = patchClips(s, [id], x => ({ ...x, hook: win, cover: x.cover?.by === 'juno' ? { ...x.cover, text: coverText(win) } : x.cover }))
  return sendClips(next, [id], by, fromCard)
}

/** The trial ends: Juno reads it, remembers it, and acts by her level. Then, after enough wins of one kind, she proposes a rule. */
export function finishTrial(s: State, id: string): State {
  const c = s.video.clips.find(x => x.id === id)
  if (!c?.trial || c.status !== 'trial') return s
  const t = now(s)
  const { hooks } = c.trial
  const held: [number, number] = [trialHold(hooks[0]), trialHold(hooks[1])]
  const w = winnerOf({ hooks, held })
  const result = `“${shortHook(hooks[w])}” held ${pct(held[w])} of viewers at 3 s, “${shortHook(hooks[1 - w])}” ${pct(held[1 - w])}`
  let next = patchClips(s, [id], x => ({ ...x, status: 'ready', trial: { ...c.trial!, held, until: Math.min(c.trial!.until, t) } }))
  next = setVideo(next, { trials: [...next.video.trials, { clip: id, title: c.title, hooks, held, at: t }] })
  next = refreshTrack(next)
  const level = levelOf(next, 'juno-trial')
  if (level === 'act') {
    next = patchClips(next, [id], x => ({ ...x, hook: hooks[w], cover: x.cover?.by === 'juno' ? { ...x.cover, text: coverText(hooks[w]) } : x.cover }))
    next = pushLog(next, { agent: 'juno', text: `Hook trial on “${c.title}”: ${result}. Juno uses the winner`, status: 'done', reason: 'Hook trials are set to Act', undoMinutes: 10, trialHooks: [id], link: `/video/clips/${id}` })
    if (actionOf(next, 'juno', 'juno-handoff')?.autonomy === 'act') next = sendClips(next, [id], 'juno')
  } else if (level === 'draft') {
    next = pushHandoff(next, {
      agent: 'juno', kind: 'approval', urgency: 'today', topic: 'Hook trial', action: 'juno-trial', chain: ['juno', 'atlas'], ref: id,
      title: `“${shortHook(hooks[w])}” won the hook trial`, context: `On “${c.title}”: ${result}. Reels, shown to non-followers first.`,
      why: 'Hook trials are set to Draft: approving puts the winning hook on the clip and sends it to Atlas.', confidence: Math.min(95, 70 + Math.abs(held[0] - held[1])), link: `/video/clips/${id}`,
      preview: { type: 'clip', clip: id }, sources: [{ label: `${pct(held[0])} vs ${pct(held[1])} still watching at 3 s`, from: 'Instagram Reels trial' }],
    })
  } else {
    next = pushLog(next, { agent: 'juno', text: `Hook trial on “${c.title}”: ${result}. Pick the hook in the editor`, status: 'done', reason: 'Hook trials are set to Suggest: you choose', link: `/video/clips/${id}` })
  }
  return proposeRule(next)
}

/** After enough trials won by a hook with a number, Juno proposes the rule, once. Her score reads it only after you add it. */
function proposeRule(s: State): State {
  const wins = numberWins(s.video.trials)
  if (s.video.ruleAsked || hookRuleOn(s) || wins.length < RULE_AFTER) return s
  const next = setVideo(s, { ruleAsked: true })
  return pushHandoff(next, {
    agent: 'juno', kind: 'approval', urgency: 'week', group: 'look', topic: 'Hook rule', action: 'juno-trial',
    title: `Add “${HOOK_RULE}” to the Playbook?`,
    context: `A hook with a number won ${wins.length} of ${wins.length} trials that put one against a hook without.`,
    why: 'Juno learns from her trials, but a rule only changes her score once you add it. It counts in each clip’s track record.', confidence: Math.min(92, 60 + wins.length * 8), link: '/playbook',
    sources: wins.slice(-4).map(r => { const w = winnerOf(r); return { label: `“${shortHook(r.hooks[w])}” ${pct(r.held[w])} vs ${pct(r.held[1 - w])} · ${r.title}`, from: 'Reels trial' } }),
  })
}

/** Moderator: the results of a hook trial are in. Juno trials “Twenty minutes, zero euros” if nothing is running, and ends it now. */
export const trialScript = {
  tag: 'video',
  run: (s: State, manual: boolean): State => {
    if (!manual) return s
    let next = s
    let running = next.video.clips.filter(c => c.status === 'trial')
    if (!running.length) {
      const c = next.video.clips.find(x => x.id === 'clip-repair-twenty' && canTrial(next, x) === true) ?? next.video.clips.find(x => canTrial(next, x) === true)
      if (!c) return s
      next = startTrials(next, [c.id], 'you')
      running = next.video.clips.filter(x => x.id === c.id)
    }
    for (const c of running) next = finishTrial(next, c.id)
    return next
  },
}

/* ---------- Finding moments ---------- */

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

/** Why a moment found on request is worth it: where it's said, the trend it rides (Echo), how the pillar did before. */
export function foundEvidence(s: State, src: Source, said: Sentence, query: string, pillar: Pillar): Evidence[] {
  const short = said.text.length > 60 ? `${said.text.slice(0, 58).replace(/\s\S*$/, '')}…` : said.text
  const out: Evidence[] = [{ value: mmss(said.s), label: `${speakerName(said.speaker)} says “${short}”`, from: 'This video', to: `/video/sources/${src.id}` }]
  const keys = keywords(`${query} ${said.text}`)
  const trend = TRENDS.find(x => s.listening.trends[x.id] !== 'dismissed' && keys.some(k => x.name.toLowerCase().includes(k)))
  if (trend) out.push({ value: trend.growth, label: `“${trend.name}” on ${trend.networks}`, from: 'Listening', to: '/listening/trends' })
  const past = s.video.clips.filter(c => c.status === 'published' && c.stats && c.pillar === pillar).sort((a, b) => b.stats!.views - a.stats!.views)[0]
  if (past) out.push({ value: `${(past.stats!.views / 1000).toFixed(1)}k`, label: `views on “${past.title}”, same pillar`, from: 'Video', to: `/video/clips/${past.id}` })
  return out
}

/* ---------- Reducer ---------- */

export function reduceVideo(s: State, a: VideoAction): State {
  const t = now(s)
  switch (a.type) {
    case 'video/open': {
      if (!s.video.clips.some(c => c.id === a.id)) return s
      const editor = s.video.editor.clip === a.id ? s.video.editor : { clip: a.id, past: [], future: [] }
      return setVideo(s, { editor, opened: s.video.opened[a.id] ? s.video.opened : { ...s.video.opened, [a.id]: t } })
    }

    case 'video/edit': {
      const c = s.video.clips.find(x => x.id === a.id)
      if (!c) return s
      const ed = s.video.editor.clip === a.id ? s.video.editor : { clip: a.id, past: [], future: [] }
      return setVideo(patchClips(s, [a.id], x => ({ ...x, ...a.patch, edited: true })), { editor: { clip: a.id, past: [...ed.past, c].slice(-50), future: [] } })
    }

    case 'video/undo':
    case 'video/redo': {
      const ed = s.video.editor
      const from = a.type === 'video/undo' ? ed.past : ed.future
      const cur = s.video.clips.find(x => x.id === ed.clip)
      if (!cur || !from.length) return s
      const prev = from[from.length - 1]
      const rest = from.slice(0, -1)
      const editor = a.type === 'video/undo' ? { ...ed, past: rest, future: [...ed.future, cur] } : { ...ed, future: rest, past: [...ed.past, cur] }
      return setVideo(patchClips(s, [cur.id], () => ({ ...prev, status: cur.status, posts: cur.posts })), { editor })
    }

    case 'video/send':
      return sendClips(s, a.ids, 'you')

    case 'video/snooze': {
      const picked = s.video.clips.filter(c => a.ids.includes(c.id) && c.status === 'ready')
      if (!picked.length) return s
      let next = patchClips(s, picked.map(c => c.id), c => ({ ...c, status: 'snoozed', back: TOMORROW_8(t) }))
      for (const id of new Set(picked.map(c => c.source))) next = syncCard(next, id)
      return notify(next, 'video', picked.length === 1 ? `“${picked[0].title}” comes back tomorrow at 08:00` : `${picked.length} clips come back tomorrow at 08:00`)
    }

    case 'video/dismiss': {
      const c = s.video.clips.find(x => x.id === a.id)
      if (!c || (c.status !== 'ready' && c.status !== 'snoozed')) return s
      let next = decided(patchClips(s, [a.id], x => ({ ...x, status: 'dismissed', back: undefined })), c, 'dismissed', { reason: a.reason })
      next = syncCard(next, c.source)
      next = pushLog(next, { agent: 'juno', text: `Dismissed “${c.title}” (${a.reason.toLowerCase()})`, status: 'dismissed', reason: 'Your call in Video', undoMinutes: 10, clips: [c.id], link: `/video/clips/${c.id}` })
      return notify(next, 'video', `Dismissed “${c.title}”`, { undo: next.log[0].id })
    }

    case 'video/addLink': {
      const u = validUrl(a.url)
      if (!u) return s
      const host = u.hostname.replace(/^www\./, '')
      const sample = s.video.sources.some(x => x.media === 'gr20') ? 'repair' : 'gr20'
      const src: Source = {
        id: uid('src'), kind: 'link', title: sample === 'gr20' ? SOURCE_DEFS.gr20.title : `Video from ${host}`, channel: host, at: t,
        media: sample, transcript: sample, url: a.url.trim(), sampleTranscript: true, status: 'processing', startedAt: t,
      }
      return notify(setVideo(s, { sources: [src, ...s.video.sources] }), 'video', `Juno is working on the video from ${host}. This prototype can’t open links, so she uses a sample video.`)
    }

    case 'video/addUpload': {
      const src: Source = {
        id: uid('src'), kind: 'upload', title: a.name.replace(/\.[^.]+$/, ''), channel: 'Uploaded by you', at: t,
        media: 'repair', transcript: 'repair', blob: a.blob, sampleTranscript: true, status: 'processing', startedAt: t,
      }
      return setVideo(s, { sources: [src, ...s.video.sources] })
    }

    case 'video/start':
    case 'video/retry':
      return startSource(s, a.id)

    case 'video/find': {
      const src = sourceOf(s, a.source)
      if (!src || src.status !== 'ready') return s
      const tr = TRANSCRIPT[src.transcript]
      const moments = findMoments(tr, a.query, a.len, a.count)
      if (!moments.length) return notify(s, 'video', `Nothing in this video talks about “${a.query}”. Try other words.`)
      let clips = moments.map(m => {
        const said = tr.sentences[m.sentence]
        const short = said.text.length > 44 ? `${said.text.slice(0, 42).replace(/\s\S*$/, '')}…` : said.text
        const evidence = foundEvidence(s, src, said, a.query, PILLAR[src.media] ?? 'Repair & care')
        const seed: ClipSeed = {
          key: uid('find'), from: tr.sentences.find(x => x.s === m.start)!.text, to: tr.sentences.find(x => x.e === m.end)!.text,
          title: short.replace(/[.?!]$/, ''), hooks: [said.text], base: { hook: Math.min(88, 70 + m.hits * 6), flow: 76, value: 74, trend: evidence.some(e => e.from === 'Listening') ? 74 : 60 },
          why: `You asked for moments about “${a.query}”. ${speakerName(said.speaker)} says it here: “${said.text}”`,
          evidence, networks: ['tiktok', 'instagram'], pillar: PILLAR[src.media] ?? 'Repair & care', text: said.text,
        }
        return clipFromSeed(seed, src, t, s.video.kit)
      })
      // Found on your request: framed and checked like any new clip, but no dubs nobody asked for.
      clips = withTrack(prepare(s, clips).map(c => ({ ...c, audio: { ...c.audio, dubs: [], review: [] } })), s.video.clips, s.publishing.posts, hookRuleOn(s))
      const next = checkCaptions(setVideo(s, { clips: [...clips, ...s.video.clips] }), clips.map(c => c.id))
      return notify(next, 'video', `Juno found ${clips.length} moment${clips.length > 1 ? 's' : ''} about “${a.query}”`)
    }

    case 'video/kit':
      return setVideo(s, { kit: { ...s.video.kit, ...a.patch } })

    case 'video/dub': {
      // You asked for it. On Draft it still arrives to review; otherwise it's ready.
      const c = s.video.clips.find(x => x.id === a.id)
      if (!c || a.lang === 'en') return s
      const review = levelOf(s, 'juno-dub') === 'draft' ? [...new Set([...(c.audio.review ?? []), a.lang])] : c.audio.review
      return reduceVideo(s, { type: 'video/edit', id: a.id, patch: { audio: { ...c.audio, lang: a.lang, dubs: [...new Set([...c.audio.dubs, a.lang])], review } } })
    }

    case 'video/release': {
      if (!PEOPLE[a.person]) return s
      const next = setVideo(s, { releases: { ...s.video.releases, [a.person]: a.signed } })
      return notify(track(next, 'video/release', { person: a.person, signed: a.signed }), 'video', a.signed ? `${PEOPLE[a.person].name}’s release is on file: clips showing ${PEOPLE[a.person].name} can go out` : `${PEOPLE[a.person].name}’s release is off file: clips showing ${PEOPLE[a.person].name} stay here`)
    }

    case 'video/trial':
      return startTrials(s, [a.id], 'you')

    case 'video/trialStop': {
      const c = s.video.clips.find(x => x.id === a.id && x.status === 'trial')
      return c ? notify(stopTrials(s, [a.id]), 'video', `Stopped the hook trial on “${c.title}”. It’s back to review with its first hook.`) : s
    }

    case 'video/recut': {
      const c = s.video.clips.find(x => x.id === a.id)
      const r = c && makeRecut(s, c)
      if (!r) return s
      return notify(track(setVideo(s, { clips: [r, ...s.video.clips] }), 'video/recut', { clip: a.id }), 'video', `Juno recut “${c!.title}”: the product is on screen from the first second. It’s in Ready to review.`)
    }

    case 'video/approveDub': {
      const c = s.video.clips.find(x => x.id === a.id)
      if (!c?.audio.review?.includes(a.lang)) return s
      const next = reduceVideo(s, { type: 'video/edit', id: a.id, patch: { audio: { ...c.audio, review: c.audio.review.filter(l => l !== a.lang) } } })
      return track(next, 'video/dub-approved', { clip: a.id, lang: a.lang })
    }
  }
}
