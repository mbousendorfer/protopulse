// Juno's slice: sources being watched or added, the clips she cut, the brand kit, and the editor's history.
import type { State } from '../../app/state'
import type { Decision, Handoff } from '../../app/types'
import { DAY, T } from '../../app/time'
import { actionOf, agentOf, notify, now, pushHandoff, pushLog, removeHandoff, track, uid, updateHandoff } from '../../app/core'
import { POSTS, type Pillar, type Post } from '../../data/publishing'
import type { Network } from '../../app/types'
import {
  BRAND_KIT, ON_SCREEN, PEOPLE, PHASES, PHASE_MS, RELEASES, SEEDS, SOURCE_DEFS, TRANSCRIPT, clipFromSeed, clipsCard, speakerName, type BrandKit, type ClipSeed, type Source,
} from '../../data/video'
import { TRENDS } from '../../data/listening'
import { LANG_LABEL, NETWORK_FIT, captionSlips, median, trackRecord, typicalReach, clipLengthOf, clipPosts, fitsLength, lengthSpec, findMoments, keywords, rescore, slipLabel, type Clip, type Evidence, type Lang, type Sentence } from './model'

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
}

/** On Act, Juno sends clips scoring at least this to Atlas herself. */
export const SEND_ALONE = 80
const ARRIVED = T(17, 52, -1)
export function initialVideo(): VideoState {
  const sources: Source[] = [{ ...SOURCE_DEFS.repair, status: 'ready' }, { ...SOURCE_DEFS.live, status: 'ready' }]
  const seeded = sources.flatMap(src => SEEDS[src.media].map(seed => clipFromSeed(seed, src, src.id === 'live' ? T(19, 10, -4) : ARRIVED)))
  const clips = withTrack(seeded, seeded, POSTS)
  return { sources, clips, kit: structuredClone(BRAND_KIT), editor: { past: [], future: [] }, opened: {}, releases: { ...RELEASES } }
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

/* ---------- Sending to Atlas ---------- */

/** Ready clips become scheduled posts in Atlas's calendar. One journal line, one Undo. From the Desk, the Desk's own line undoes it. */
export function sendClips(s: State, ids: string[], by: 'you' | 'desk' | 'juno', fromCard?: string): State {
  const { go: picked, held } = vetClips(s, s.video.clips.filter(c => ids.includes(c.id) && (c.status === 'ready' || c.status === 'snoozed')))
  const heldText = held.length ? ` ${held.length === 1 ? `“${held[0].clip.title}” stays here: ${held[0].why}.` : `${held.length} stay here: ${[...new Set(held.map(h => h.why))].join('; ')}.`}` : ''
  if (!picked.length) return held.length && by === 'you' ? notify(s, 'video', `Nothing sent.${heldText}`) : s
  const t = now(s)
  let posts = s.publishing.posts
  const made: Record<string, string[]> = {}
  for (const c of picked) { const ps = clipPosts(c, posts, t, () => uid('p'), clipLengthOf(c, trOf(s, c))); posts = [...posts, ...ps]; made[c.id] = ps.map(p => p.id) }
  let next: State = { ...s, publishing: { ...s.publishing, posts } }
  next = patchClips(next, picked.map(c => c.id), c => ({ ...c, status: 'sent', posts: made[c.id], back: undefined, sentAt: t, sentFrom: by === 'desk' ? fromCard : undefined }))
  for (const c of picked) next = decided(next, c, c.edited ? 'modified' : 'as-is', { by })
  for (const id of new Set(picked.map(c => c.source))) next = syncCard(next, id)
  if (by === 'desk') return next
  const n = Object.values(made).flat().length
  const text = (picked.length === 1 ? `Sent “${picked[0].title}” to Atlas: ${n} post${n > 1 ? 's' : ''} scheduled.` : `Sent ${picked.length} clips to Atlas: ${n} posts scheduled.`) + heldText
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
    ...c,
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

/* ---------- Track record ---------- */

/** Clips waiting for review learn from what was published: their track record is refreshed. */
const withTrack = (clips: Clip[], all: Clip[], posts: Post[]) => clips.map(c => (c.status === 'ready' || c.status === 'snoozed' ? { ...c, track: trackRecord(c, all, posts) } : c))
const refreshTrack = (s: State): State => setVideo(s, { clips: withTrack(s.video.clips, s.video.clips, s.publishing.posts) })

/* ---------- After it goes out: published, with numbers ---------- */

/** Usual reach and engagement of the published posts on a network (medians: one viral post doesn't set the bar). */
export function networkAverage(s: State, n: string): { reach: number; er: number } | undefined {
  const ps = s.publishing.posts.filter(p => p.network === n && p.status === 'published' && p.stats)
  if (!ps.length) return undefined
  return { reach: typicalReach(ps, n as Network), er: median(ps.map(p => p.stats!.er)) }
}

const postsOf = (s: State, c: Clip) => (c.posts ?? []).map(id => s.publishing.posts.find(p => p.id === id)).filter(p => !!p && p.status !== 'failed' && p.status !== 'draft') as Post[]

/**
 * A published clip's numbers: its posts' own stats when Atlas and Iris have them, else Juno's read of the first day.
 * ponytail: the estimate (score × the network's average) stands in until Iris exposes `clipPerf`
 * (requests/iris-from-juno-clip-perf.md); then this reads hers.
 */
export function clipPerf(s: State, c: Clip): { views: number; er: number } {
  // Only the posts already out count.
  const ps = postsOf(s, c).filter(p => p.at <= now(s))
  const measured = ps.filter(p => p.stats)
  if (measured.length) return { views: measured.reduce((a, p) => a + p.stats!.reach, 0), er: Math.round(measured.reduce((a, p) => a + p.stats!.er, 0) / measured.length * 10) / 10 }
  const score = rescore(c, trOf(s, c)).total
  const views = ps.reduce((a, p) => a + (networkAverage(s, p.network)?.reach ?? 8000) * (0.5 + (score - 50) / 30), 0)
  const er = (networkAverage(s, ps[0]?.network ?? 'tiktok')?.er ?? 4) * (0.7 + (score - 50) / 60)
  return { views: Math.round(views / 100) * 100, er: Math.round(er * 10) / 10 }
}

/** The first of a sent clip's posts: once it's past, the clip is out. */
const outAt = (s: State, c: Clip) => { const ps = postsOf(s, c); return ps.length ? Math.min(...ps.map(p => p.at)) : Infinity }

/** Clips whose posts all went out become Published with their numbers; one that beats its network's average is good news. */
function publishDue(s: State, t: number): State {
  let next = s
  for (const c of s.video.clips.filter(x => x.status === 'sent' && outAt(s, x) <= t)) {
    const stats = clipPerf(next, c)
    const net = postsOf(next, c).filter(p => p.at <= t).sort((a, b) => a.at - b.at)[0]?.network ?? c.post.networks[0]
    next = patchClips(next, [c.id], x => ({ ...x, status: 'published', stats }))
    const avg = networkAverage(next, net)
    const lift = avg ? stats.views / avg.reach : 1
    const k = `${(stats.views / 1000).toFixed(1)}k`
    next = pushLog(next, { agent: 'juno', text: `“${c.title}” is out: ${k} views, ${stats.er}% engagement on its first day`, status: 'done', reason: 'Atlas posted it at the planned time', link: `/video/clips/${c.id}` })
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
  if (!def || sourceOf(s, sourceId)) return s
  if (!moderator && (agentOf(s, 'juno').status !== 'on' || (def.kind === 'live' ? !s.video.kit.watchLives : !s.video.kit.watchUploads))) return s
  return newSource(s, { ...def, at: now(s), status: 'processing' })
}

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
  const fresh = withTrack(prepare(s, SEEDS[src.media].map(seed => clipFromSeed({ ...seed, status: undefined, stats: undefined }, src, t, s.video.kit))), s.video.clips, s.publishing.posts)
    .sort((a, b) => rescore(b, tr).total - rescore(a, tr).total)
  let next = setVideo(patchSource(s, src.id, { status: 'ready', startedAt: undefined }), { clips: [...fresh, ...s.video.clips] })
  next = logDubs(checkCaptions(next, fresh.map(c => c.id)), fresh)
  if (actionOf(next, 'juno', 'juno-handoff')?.autonomy === 'act') {
    const best = fresh.filter(c => rescore(c, tr).total >= SEND_ALONE).map(c => c.id)
    if (best.length) next = sendClips(next, best, 'juno')
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
  const back = next.video.clips.filter(c => c.status === 'snoozed' && (c.back ?? Infinity) <= t).map(c => c.id)
  if (back.length) next = patchClips(next, back, c => ({ ...c, status: 'ready', back: undefined }))
  const published = publishDue(next, t)
  return published === next ? next : refreshTrack(published)
}

export const videoDue = (s: State, t: number) =>
  s.video.sources.some(src => src.status === 'processing' && !!src.startedAt && t - src.startedAt >= (isPrivate(src.url) ? PHASE_MS : PHASES.length * PHASE_MS)) ||
  s.video.clips.some(c => (c.status === 'snoozed' && (c.back ?? Infinity) <= t) || (c.status === 'sent' && outAt(s, c) <= t))

/* ---------- Desk ---------- */

export function onResolveVideo(s: State, h: Handoff, d: Decision): State {
  if (h.agent !== 'juno') return s
  const yes = d.kind === 'approve' || d.kind === 'option' || d.kind === 'trial'
  if (h.topic === 'Captions' && h.fixes) {
    // Only what's still wrong: you may have fixed some in the editor meanwhile.
    const open = Object.fromEntries(Object.entries(h.fixes).map(([id, idx]) => [id, idx.filter(i => s.video.clips.find(c => c.id === id)?.fixes[i] === undefined)]).filter(([, idx]) => idx.length))
    return yes ? setFixes(s, open, true) : s
  }
  if (!h.ref) return s
  const src = sourceOf(s, h.ref)
  if (!src) return s
  let next = patchSource(s, src.id, { handoff: undefined })
  if (h.topic === 'Clips' && yes) next = sendClips(next, next.video.clips.filter(c => c.source === src.id && c.status === 'ready').map(c => c.id), 'desk', h.id)
  if (h.topic === 'New video' && yes) next = startSource(next, src.id)
  return next
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
      clips = withTrack(prepare(s, clips).map(c => ({ ...c, audio: { ...c.audio, dubs: [], review: [] } })), s.video.clips, s.publishing.posts)
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

    case 'video/approveDub': {
      const c = s.video.clips.find(x => x.id === a.id)
      if (!c?.audio.review?.includes(a.lang)) return s
      const next = reduceVideo(s, { type: 'video/edit', id: a.id, patch: { audio: { ...c.audio, review: c.audio.review.filter(l => l !== a.lang) } } })
      return track(next, 'video/dub-approved', { clip: a.id, lang: a.lang })
    }
  }
}
