// Juno's slice: sources being watched or added, the clips she cut, the brand kit, and the editor's history.
import type { State } from '../../app/state'
import type { Decision, Handoff } from '../../app/types'
import { DAY, T } from '../../app/time'
import { actionOf, agentOf, notify, now, pushHandoff, pushLog, removeHandoff, track, uid, updateHandoff } from '../../app/core'
import type { Pillar } from '../../data/publishing'
import {
  BRAND_KIT, PHASES, PHASE_MS, SEEDS, SOURCE_DEFS, TRANSCRIPT, clipFromSeed, clipsCard, speakerName, type BrandKit, type ClipSeed, type Source,
} from '../../data/video'
import { TRENDS } from '../../data/listening'
import { clipPosts, findMoments, keywords, rescore, type Clip, type Evidence, type Sentence } from './model'

export type VideoState = {
  sources: Source[]
  clips: Clip[]
  kit: BrandKit
  /** Undo/redo inside the editor, for the clip being edited. */
  editor: { clip?: string; past: Clip[]; future: Clip[] }
  /** When each clip was first opened, for the tester log's time to decision. */
  opened: Record<string, number>
}

/** On Act, Juno sends clips scoring at least this to Atlas herself. */
export const SEND_ALONE = 80
const ARRIVED = T(17, 52, -1)
export function initialVideo(): VideoState {
  const sources: Source[] = [{ ...SOURCE_DEFS.repair, status: 'ready' }, { ...SOURCE_DEFS.live, status: 'ready' }]
  const clips = sources.flatMap(src => SEEDS[src.media].map(seed => clipFromSeed(seed, src, src.id === 'live' ? T(19, 10, -4) : ARRIVED)))
  return { sources, clips, kit: structuredClone(BRAND_KIT), editor: { past: [], future: [] }, opened: {} }
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

/* ---------- Sending to Atlas ---------- */

/** Ready clips become scheduled posts in Atlas's calendar. One journal line, one Undo. From the Desk, the Desk's own line undoes it. */
export function sendClips(s: State, ids: string[], by: 'you' | 'desk' | 'juno', fromCard?: string): State {
  const picked = s.video.clips.filter(c => ids.includes(c.id) && (c.status === 'ready' || c.status === 'snoozed'))
  if (!picked.length) return s
  const t = now(s)
  let posts = s.publishing.posts
  const made: Record<string, string[]> = {}
  for (const c of picked) { const ps = clipPosts(c, posts, t, () => uid('p')); posts = [...posts, ...ps]; made[c.id] = ps.map(p => p.id) }
  let next: State = { ...s, publishing: { ...s.publishing, posts } }
  next = patchClips(next, picked.map(c => c.id), c => ({ ...c, status: 'sent', posts: made[c.id], back: undefined, sentFrom: by === 'desk' ? fromCard : undefined }))
  for (const c of picked) next = decided(next, c, c.edited ? 'modified' : 'as-is', { by })
  for (const id of new Set(picked.map(c => c.source))) next = syncCard(next, id)
  if (by === 'desk') return next
  const n = Object.values(made).flat().length
  const text = picked.length === 1 ? `Sent “${picked[0].title}” to Atlas: ${n} post${n > 1 ? 's' : ''} scheduled` : `Sent ${picked.length} clips to Atlas: ${n} posts scheduled`
  next = pushLog(next, { agent: 'juno', text, status: by === 'juno' ? 'done' : 'approved', reason: by === 'juno' ? 'Sending her best clips is set to Act' : 'You sent them from Video', undoMinutes: 10, clips: picked.map(c => c.id), link: '/publishing/calendar' })
  return by === 'you' ? notify(next, 'video', text, { undo: next.log[0].id, link: { to: '/publishing/calendar', label: 'Open the calendar' } }) : next
}

/** Undo: the clips' scheduled posts leave the calendar and the clips are back to review. */
export function unsendClips(s: State, ids: string[]): State {
  const media = new Set(ids.map(id => `clip:${id}`))
  let next: State = { ...s, publishing: { ...s.publishing, posts: s.publishing.posts.filter(p => !(p.media && media.has(p.media) && p.status === 'scheduled')) } }
  next = patchClips(next, ids, c => ({ ...c, status: 'ready', posts: undefined, sentFrom: undefined }))
  return next
}

/** Undoing a Desk decision on a clips card also takes back what it sent. */
export const undoDeskClips = (s: State, h: Handoff): State =>
  h.topic === 'Clips' ? unsendClips(s, s.video.clips.filter(c => c.sentFrom === h.id).map(c => c.id)) : s

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
  const fresh = SEEDS[src.media].map(seed => clipFromSeed({ ...seed, status: undefined, stats: undefined }, src, t, s.video.kit))
    .sort((a, b) => rescore(b, tr).total - rescore(a, tr).total)
  let next = setVideo(patchSource(s, src.id, { status: 'ready', startedAt: undefined }), { clips: [...fresh, ...s.video.clips] })
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
  return next
}

export const videoDue = (s: State, t: number) =>
  s.video.sources.some(src => src.status === 'processing' && !!src.startedAt && t - src.startedAt >= (isPrivate(src.url) ? PHASE_MS : PHASES.length * PHASE_MS)) ||
  s.video.clips.some(c => c.status === 'snoozed' && (c.back ?? Infinity) <= t)

/* ---------- Desk ---------- */

export function onResolveVideo(s: State, h: Handoff, d: Decision): State {
  if (h.agent !== 'juno' || !h.ref) return s
  const src = sourceOf(s, h.ref)
  if (!src) return s
  const yes = d.kind === 'approve' || d.kind === 'option' || d.kind === 'trial'
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
      const clips = moments.map(m => {
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
      return notify(setVideo(s, { clips: [...clips, ...s.video.clips] }), 'video', `Juno found ${clips.length} moment${clips.length > 1 ? 's' : ''} about “${a.query}”`)
    }

    case 'video/kit':
      return setVideo(s, { kit: { ...s.video.kit, ...a.patch } })
  }
}
