// Juno's clips: pure functions, no state. A clip is a composition, Remotion-style: everything on screen at time t
// is computed from the clip and its source transcript. The reducer (slice.ts) and the player call these; model.test.ts covers them.
import type { Network } from '../../app/types'
import { DAY, T } from '../../app/time'
import type { Post, Pillar } from '../../data/publishing'
import { pickSlot } from '../publishing/ideasModel'

/* ---------- Transcript (contract with scripts/media → src/data/video-transcripts.json) ---------- */

export type Lang = 'en' | 'fr' | 'de' | 'es' | 'it'
export const LANGS: Lang[] = ['en', 'fr', 'de', 'es', 'it']
export const LANG_LABEL: Record<Lang, string> = { en: 'English', fr: 'French', de: 'German', es: 'Spanish', it: 'Italian' }
export type Word = { i: number; w: string; s: number; e: number; sent: number; filler?: boolean }
export type Sentence = { i: number; s: number; e: number; speaker?: string; text: string; tr: Partial<Record<Lang, string>> }
export type Shot = { s: number; e: number; label: string; focus: number }
export type Chapter = { title: string; s: number; e: number; display: string }
export type Transcript = { duration: number; sentences: Sentence[]; words: Word[]; shots: Shot[]; chapters?: Chapter[] }

/* ---------- Clip ---------- */

export type Aspect = '9:16' | '1:1' | '16:9' | '4:5'
export type Frame = 'track' | 'fill' | 'fit' | 'split'
export type CapTemplate = 'highlight' | 'pop' | 'clean' | 'keyword' | 'boxed'
export type CapFont = 'sans' | 'condensed' | 'serif'
/** Fernway colours, used inside the video only (content, not UI). */
export const SWATCH = { moss: '#5E7D4A', ember: '#E2632B', glacier: '#7FC4E0', slate: '#46505C', sun: '#F5C53A' } as const
export type Swatch = keyof typeof SWATCH
export type Captions = { template: CapTemplate; font: CapFont; size: number; y: number; perLine: number; color: Swatch; emoji: boolean; upper: boolean }
export type Broll = { id: string; asset: string; at: number; dur: number }
export type Brand = { logo: boolean; progress: boolean; intro: boolean; outro: boolean; music?: string; musicVol: number; duck: boolean }
export type Score = { hook: number; flow: number; value: number; trend: number }
export type ScoreKey = keyof Score
export type Evidence = { value: string; label: string; from: string; to?: string }
export type ClipStatus = 'ready' | 'sent' | 'published' | 'snoozed' | 'dismissed' | 'trial'
/** A hook trial on Instagram Reels: each hook shown to non-followers first. `hooks[0]` is the hook the clip had before. `held`: share still watching at 3 s, per hook. */
export type Trial = { hooks: [string, string]; from: number; until: number; by: 'you' | 'juno'; held?: [number, number] }

export type Clip = {
  id: string
  source: string
  title: string
  /** On-screen hook card for the first seconds, and the caption's opening line. */
  hook: string
  hooks: string[]
  /** Source time, seconds. */
  start: number
  end: number
  /** Word indexes removed from the clip. */
  cut: number[]
  /** Shorten pauses between kept words to 0.3 s. */
  trimGaps: boolean
  /** Caption-only spelling fixes, by word index. */
  fixes: Record<number, string>
  /** What speech-to-text heard where it got a product or Playbook word wrong, by word index. Captions show it until fixed. */
  heard?: Record<number, string>
  /** Words re-voiced in the speaker's voice, by word index. */
  overdub: Record<number, string>
  /** Juno's read of the moment before any edit; `rescore` adjusts it. */
  base: Score
  why: string
  evidence: Evidence[]
  aspect: Aspect
  frame: Frame
  /** Manual focus override (0–1); auto-track follows the shot's focus. */
  focus?: number
  captions: Captions
  broll: Broll[]
  brand: Brand
  /** `review`: dubs Juno made on Draft that you haven't approved yet. */
  audio: { studio: boolean; lang: Lang; dubs: Lang[]; review?: Lang[] }
  /** Reframe and brand kit on Draft: applied, to check. On Suggest: not applied, Juno suggests it. */
  framing?: 'check' | 'suggested'
  post: { networks: Network[]; text: Partial<Record<Network, string>> }
  pillar: Pillar
  status: ClipStatus
  edited?: boolean
  /** Iris's numbers once it's out (retention and shares when Iris has them). */
  stats?: { views: number; er: number; retention?: number; shares?: number }
  posts?: string[]
  /** Snoozed until this app time. */
  back?: number
  /** Desk card it was sent from, so undoing that decision takes it back. */
  sentFrom?: string
  /** When it went to Atlas: counts toward the weekly quota per video. */
  sentAt?: number
  /** One version per network (ratio, caption height). Without one, the network gets the clip as framed above. */
  versions?: Partial<Record<Network, Version>>
  /** What your published clips of the same pillar did: moves the total, and names the clip to compare with. */
  track?: Track
  /** The cover: a frame of the source (seconds), the text on it, who picked it. Without one, the source's poster. */
  cover?: { at: number; text: string; by: 'juno' | 'you' }
  /** YouTube Shorts title, when YouTube is one of the networks. */
  ytTitle?: string
  /** The hook trial running or done on this clip. */
  trial?: Trial
  arrivedAt: number
}

/* ---------- Timeline: what plays ---------- */

const PAD = 0.08
const MAX_GAP = 0.3
export const SILENCE = 0.6
export type Seg = { s: number; e: number }

export const inClip = (c: Clip, w: Word) => w.s >= c.start - 0.01 && w.e <= c.end + 0.01
export const clipWords = (c: Clip, t: Transcript) => t.words.filter(w => inClip(c, w))
export const keptWords = (c: Clip, t: Transcript) => { const cut = new Set(c.cut); return clipWords(c, t).filter(w => !cut.has(w.i)) }

/** Source ranges that play, in order. A cut word splits a segment; trimmed gaps split long pauses. */
export function keptSegments(c: Clip, t: Transcript): Seg[] {
  const segs: Seg[] = []
  let prev: Word | undefined
  for (const w of keptWords(c, t)) {
    const joined = prev && w.i === prev.i + 1 && (!c.trimGaps || w.s - prev.e <= MAX_GAP)
    if (joined) segs[segs.length - 1].e = w.e + PAD
    else segs.push({ s: Math.max(0, w.s - PAD), e: w.e + PAD })
    prev = w
  }
  // Pads never overlap.
  for (let k = 1; k < segs.length; k++) if (segs[k].s < segs[k - 1].e) segs[k].s = segs[k - 1].e
  return segs
}

export const duration = (segs: Seg[]) => segs.reduce((n, g) => n + g.e - g.s, 0)

/** Source time → clip time. A source time inside a removed range maps to where the next segment starts. */
export function toClipTime(segs: Seg[], src: number): number {
  let acc = 0
  for (const g of segs) {
    if (src < g.s) return acc
    if (src <= g.e) return acc + src - g.s
    acc += g.e - g.s
  }
  return acc
}

/** Clip time → source time. */
export function toSourceTime(segs: Seg[], t: number): number {
  let acc = 0
  for (const g of segs) {
    if (t <= acc + g.e - g.s) return g.s + Math.max(0, t - acc)
    acc += g.e - g.s
  }
  return segs.at(-1)?.e ?? 0
}

/** For the player: where to be at source time `src`. Same time when it plays, the next segment's start when it's removed, null at the end. */
export function playableAt(segs: Seg[], src: number): number | null {
  for (const g of segs) {
    if (src < g.s - 0.02) return g.s
    if (src < g.e) return src
  }
  return null
}

/* ---------- Cleanup ---------- */

export const fillers = (c: Clip, t: Transcript) => keptWords(c, t).filter(w => w.filler)
export const removeFillers = (c: Clip, t: Transcript): Clip => ({ ...c, cut: [...new Set([...c.cut, ...fillers(c, t).map(w => w.i)])].sort((a, b) => a - b) })

/** Pauses over 0.6 s between two kept words that still play back to back. */
export function silences(c: Clip, t: Transcript): { at: number; dur: number }[] {
  if (c.trimGaps) return []
  const kept = keptWords(c, t)
  const out: { at: number; dur: number }[] = []
  for (let k = 1; k < kept.length; k++) {
    const a = kept[k - 1], b = kept[k]
    if (b.i === a.i + 1 && b.s - a.e > SILENCE) out.push({ at: a.e, dur: b.s - a.e })
  }
  return out
}
/** Seconds saved by trimming the silences. */
export const silenceSaved = (c: Clip, t: Transcript) => silences(c, t).reduce((n, g) => n + g.dur - MAX_GAP, 0)

/** Moves a clip edge to the previous or next sentence boundary. */
export function extend(c: Clip, t: Transcript, edge: 'start' | 'end', dir: -1 | 1): Clip {
  const S = t.sentences
  if (edge === 'start') {
    const k = S.findIndex(x => x.e > c.start + 0.01)
    const target = S[Math.min(Math.max(0, k + dir), S.length - 1)]
    return target && target.s < c.end ? { ...c, start: target.s } : c
  }
  const k = S.findLastIndex(x => x.s < c.end - 0.01)
  const target = S[Math.min(Math.max(0, k + dir), S.length - 1)]
  return target && target.e > c.start ? { ...c, end: target.e } : c
}

/* ---------- Captions ---------- */

export type CapWord = { text: string; s: number; e: number; i?: number; key: boolean }
export type CapLine = { s: number; e: number; words: CapWord[] }

const KEY = /\d|ridge|storm|summit|ember|repair|free|lifetime|gr20|strap|rain|warranty/i
const EMOJI_FOR: [RegExp, string][] = [[/repair|stitch|sew/i, '🧵'], [/rain|storm|wet/i, '🌧️'], [/mountain|gr20|summit|peak/i, '⛰️'], [/strap|bag|backpack|ridge/i, '🎒'], [/free/i, '🎁'], [/lifetime|forever/i, '♾️'], [/water|bottle|lake/i, '💧'], [/jacket/i, '🧥']]
export const emojiFor = (w: string) => EMOJI_FOR.find(([re]) => re.test(w))?.[1]
export const wordText = (c: Clip, w: Word) => c.overdub[w.i] ?? c.fixes[w.i] ?? c.heard?.[w.i] ?? w.w

/** Words speech-to-text got wrong that still play and aren't fixed: word index → the right word. */
export const captionSlips = (c: Clip, t: Transcript): Record<number, string> =>
  Object.fromEntries(keptWords(c, t).filter(w => c.heard?.[w.i] !== undefined && c.fixes[w.i] === undefined && c.overdub[w.i] === undefined).map(w => [w.i, w.w]))
/** “28” → “28L”, without the punctuation around the words. */
export const slipLabel = (heard: string, right: string) => `“${heard.replace(/[.,!?]$/, '')}” → “${right.replace(/[.,!?]$/, '')}”`

/** Caption lines in clip time. English follows the words; a dub shows each sentence's translation, timed across the sentence. */
export function captionLines(c: Clip, t: Transcript, lang: Lang = c.audio.lang): CapLine[] {
  const segs = keptSegments(c, t)
  const kept = keptWords(c, t)
  const tokens: (CapWord & { sent: number })[] = []
  if (lang === 'en') {
    for (const w of kept) { const text = wordText(c, w); if (!text) continue; tokens.push({ text, s: toClipTime(segs, w.s), e: toClipTime(segs, w.e), i: w.i, key: KEY.test(text), sent: w.sent }) }
  } else {
    for (const sent of t.sentences) {
      const ws = kept.filter(w => w.sent === sent.i)
      const tr = sent.tr[lang]
      if (!ws.length || !tr) continue
      const s = toClipTime(segs, ws[0].s), e = toClipTime(segs, ws.at(-1)!.e)
      const parts = tr.split(/\s+/).filter(Boolean)
      const total = parts.reduce((n, p) => n + p.length + 1, 0)
      let at = s
      for (const p of parts) { const d = ((p.length + 1) / total) * (e - s); tokens.push({ text: p, s: at, e: at + d, key: KEY.test(p), sent: sent.i }); at += d }
    }
  }
  const lines: CapLine[] = []
  tokens.forEach((tk, k) => {
    const cur = lines.at(-1)
    if (cur && cur.words.length < c.captions.perLine && tokens[k - 1].sent === tk.sent) { cur.words.push(tk); cur.e = tk.e }
    else lines.push({ s: tk.s, e: tk.e, words: [tk] })
  })
  return lines.map(l => ({ ...l, words: l.words.map(({ text, s, e, i, key }) => ({ text, s, e, i, key })) }))
}

/** The line on screen at clip time t, and the word being said. Holds the last line through short pauses. */
export function captionAt(lines: CapLine[], t: number): { line?: CapLine; active: number } {
  const line = lines.find((l, k) => t >= l.s && t < Math.max(l.e, Math.min((lines[k + 1]?.s ?? l.e + 0.6), l.e + 0.6)))
  if (!line) return { active: -1 }
  return { line, active: line.words.findLastIndex(w => t >= w.s) }
}

/** How a caption word reads on screen. */
export const display = (c: Captions, w: CapWord) => {
  const text = c.upper ? w.text.toUpperCase() : w.text
  const e = c.emoji && emojiFor(w.text)
  return e ? `${text} ${e}` : text
}

const srtTime = (x: number) => {
  const ms = Math.round(x * 1000), h = Math.floor(ms / 3_600_000), m = Math.floor(ms / 60_000) % 60, s = Math.floor(ms / 1000) % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`
}
export const toSRT = (lines: CapLine[]) => lines.map((l, k) => `${k + 1}\n${srtTime(l.s)} --> ${srtTime(l.e)}\n${l.words.map(w => w.text).join(' ')}\n`).join('\n')

/** The clip's words as text: what the diff compares. */
export const clipText = (c: Clip, t: Transcript) => keptWords(c, t).map(w => wordText(c, w)).filter(Boolean).join(' ')

/* ---------- Finding moments (ClipAnything) ---------- */

const STOP = new Set(['the', 'and', 'about', 'with', 'that', 'this', 'from', 'for', 'clip', 'clips', 'moment', 'moments', 'where', 'when', 'what', 'our', 'you', 'your', 'make', 'find', 'some'])
export const keywords = (q: string) => q.toLowerCase().split(/[^\p{L}\d]+/u).filter(w => w.length > 2 && !STOP.has(w))

/** Sentences that mention the query, each widened with its neighbours until close to `len` seconds. Non-overlapping, best first. */
export function findMoments(t: Transcript, query: string, len: number, count: number): { start: number; end: number; hits: number; sentence: number }[] {
  const keys = keywords(query)
  if (!keys.length) return []
  const hits = t.sentences.map(s => ({ s, n: keys.filter(k => s.text.toLowerCase().includes(k)).length })).filter(x => x.n > 0).sort((a, b) => b.n - a.n || a.s.i - b.s.i)
  const out: { start: number; end: number; hits: number; sentence: number }[] = []
  for (const { s, n } of hits) {
    if (out.length >= count) break
    if (out.some(o => s.s < o.end && s.e > o.start)) continue
    let lo = s.i, hi = s.i
    const span = () => t.sentences[hi].e - t.sentences[lo].s
    for (let k = 0; span() < len * 0.8 && k < 40; k++) {
      const next = t.sentences[hi + 1], prev = t.sentences[lo - 1]
      const grow = k % 2 === 0 ? (next ? 'hi' : prev ? 'lo' : null) : (prev ? 'lo' : next ? 'hi' : null)
      if (!grow) break
      const cand = grow === 'hi' ? t.sentences[hi + 1].e - t.sentences[lo].s : t.sentences[hi].e - t.sentences[lo - 1].s
      if (cand > len * 1.2) break
      if (grow === 'hi') hi++; else lo--
    }
    const start = t.sentences[lo].s, end = t.sentences[hi].e
    if (out.some(o => start < o.end && end > o.start)) continue
    out.push({ start, end, hits: n, sentence: s.i })
  }
  return out
}

/* ---------- Length per network ---------- */

/** How long a clip may run on each network, in seconds (the guardrail “15–60 s · 90 s on LinkedIn”). */
export const lengthSpec = (n: Network) => ({ min: 15, max: n === 'linkedin' ? 90 : 60 })
export const fitsLength = (n: Network, dur: number) => dur >= lengthSpec(n).min - 0.5 && dur <= lengthSpec(n).max + 0.5
export const clipLengthOf = (c: Clip, t: Transcript) => duration(keptSegments(c, t))

/* ---------- Versions per network ---------- */

export type Version = { aspect: Aspect; y: number }
/** Each app's ratio, and the bands its buttons and text cover (percent of the frame, from the bottom and the right). */
export const NET_SPEC: Partial<Record<Network, { aspect: Aspect; bottom: number; right: number }>> = {
  tiktok: { aspect: '9:16', bottom: 24, right: 16 },
  instagram: { aspect: '9:16', bottom: 22, right: 14 },
  youtube: { aspect: '9:16', bottom: 20, right: 14 },
  linkedin: { aspect: '1:1', bottom: 10, right: 0 },
  facebook: { aspect: '4:5', bottom: 14, right: 12 },
}
const specOf = (n: Network) => NET_SPEC[n] ?? { aspect: '16:9' as Aspect, bottom: 10, right: 0 }
/** Highest caption position (percent from the top) that stays clear of the app's buttons. */
export const safeY = (n: Network) => 100 - specOf(n).bottom - 10
export const versionOf = (c: Clip, n: Network): Version => c.versions?.[n] ?? { aspect: c.aspect, y: c.captions.y }
/** Juno's version for a network: its ratio, captions moved above its buttons. */
export const versionFor = (c: Clip, n: Network): Version => ({ aspect: specOf(n).aspect, y: Math.min(c.captions.y, safeY(n)) })
export const buildVersions = (c: Clip): Partial<Record<Network, Version>> => Object.fromEntries(c.post.networks.map(n => [n, versionFor(c, n)]))
/** What doesn't fit a network's spec: ratio, captions under its buttons. Length is checked apart (fitsLength). */
export function versionIssues(c: Clip, n: Network): string[] {
  const v = versionOf(c, n)
  const out: string[] = []
  if (v.aspect !== specOf(n).aspect) out.push(`${v.aspect} where the app shows ${specOf(n).aspect}`)
  if (v.y > safeY(n)) out.push('captions sit under the app’s buttons')
  return out
}

/* ---------- Cover ---------- */

const COVER_WORDS = /strap|ridge|jacket|bottle|bag|zip|slider|hands|léa|camille|léo|machine|stitch|bar tack|patch|hood|shell/i
export type CoverFrame = { at: number; why: string }

/** Juno's 3 cover frames, best first: shots inside the clip that show the product or a person, never one in `avoid` (no release). */
export function coverFrames(c: Clip, t: Transcript, avoid: { s: number; e: number }[] = []): CoverFrame[] {
  const shots = t.shots.filter(x => x.e > c.start + 0.5 && x.s < c.end - 0.5 && !avoid.some(a => a.s < x.e && a.e > x.s))
  return shots
    .map((x, k) => ({ x, rank: (COVER_WORDS.test(x.label) ? 2 : 0) + (k === 0 ? 1 : 0) + Math.min(1, (Math.min(x.e, c.end) - Math.max(x.s, c.start)) / 6) }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 3)
    .map(({ x }) => ({ at: Math.round(((Math.max(x.s, c.start) + Math.min(x.e, c.end)) / 2) * 10) / 10, why: x.label }))
}
/** Text on the cover: the hook, short enough to read on a phone. */
export const coverText = (hook: string) => (hook.length > 42 ? `${hook.slice(0, 40).replace(/\s\S*$/, '')}…` : hook)
export const shortsTitle = (c: Pick<Clip, 'title' | 'hook'>) => `${c.title}: ${c.hook}`.slice(0, 95).replace(/\s\S*$/, s => (`${c.title}: ${c.hook}`.length > 95 ? '…' : s)) + ' #Shorts'

/* ---------- Track record ---------- */

export type Track = { delta: number; lift: number; why: string; like?: { id: string; title: string; views: number }; /** The Playbook rule learned from hook trials is on. */ rule?: boolean }
export const median = (xs: number[]) => { if (!xs.length) return 0; const o = [...xs].sort((a, b) => a - b); const m = o.length >> 1; return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2 }
/** The usual reach of a published post on this network: the median, so one viral post doesn't set the bar. */
export const typicalReach = (posts: Post[], n: Network) => median(posts.filter(p => p.network === n && p.status === 'published' && p.stats).map(p => p.stats!.reach))

/** How the published clips of this clip's pillar did against the usual reach of its first network. Up to ±6 on the total. */
export function trackRecord(c: Clip, clips: Clip[], posts: Post[], rule = false): Track | undefined {
  const net = c.post.networks[0]
  const base = typicalReach(posts, net)
  const past = clips.filter(x => x.id !== c.id && x.status === 'published' && x.stats && x.pillar === c.pillar).sort((a, b) => b.stats!.views - a.stats!.views)
  if (!base || !past.length) return rule ? { delta: 0, lift: 1, why: '', rule } : undefined
  const lift = past.reduce((a, x) => a + x.stats!.views / base, 0) / past.length
  const delta = Math.max(-6, Math.min(6, Math.round((lift - 1) * 4)))
  const word = past.length === 1 ? `Your ${c.pillar} clip did` : `Your ${past.length} ${c.pillar} clips did`
  return { delta, lift, why: `${word} ${lift.toFixed(1)}× your usual ${NETWORK_FIT[net] ?? net} reach`, like: { id: past[0].id, title: past[0].title, views: past[0].stats!.views }, ...(rule ? { rule } : {}) }
}

/* ---------- Hook trials ---------- */

/** The Playbook rule Juno proposes once hooks with a number keep winning her trials. */
export const HOOK_RULE = 'Open clip hooks on a number'
/** Trials it takes before Juno proposes the rule. */
export const RULE_AFTER = 3
const RULE_BONUS = 3
export const hasNumber = (hook: string) => /\d/.test(hook)

/** The two hooks Juno puts against each other: the clip's hook first, then the one that differs most (a number against none), else the next one. */
export function trialPair(c: Clip): [string, string] | undefined {
  const others = [...new Set(c.hooks)].filter(h => h !== c.hook)
  const other = others.find(h => hasNumber(h) !== hasNumber(c.hook)) ?? others[0]
  return other ? [c.hook, other] : undefined
}

/**
 * Share of non-followers still watching at 3 s, for one hook.
 * ponytail: Juno's own estimate until Iris exposes trial figures (requests/iris-from-juno-hook-trial.md):
 * a number up front holds best, then short hooks, then questions. Deterministic per hook.
 */
export function trialHold(hook: string): number {
  const jitter = [...hook].reduce((a, ch) => (a + ch.charCodeAt(0)) % 5, 0)
  return 40 + (hasNumber(hook) ? 16 : 0) + (hook.length <= 32 ? 3 : 0) + (/\?/.test(hook) ? 2 : 0) + jitter
}

/** A finished trial in Juno's memory: the seed's older ones and every one run since. `held` follows `hooks`. */
export type TrialRecord = { clip?: string; title: string; hooks: [string, string]; held: [number, number]; at: number }
export const winnerOf = (r: { hooks: [string, string]; held: [number, number] }) => (r.held[1] > r.held[0] ? 1 : 0)
/** Trials where a hook with a number beat one without. */
export const numberWins = (trials: TrialRecord[]) => trials.filter(r => { const w = winnerOf(r); return hasNumber(r.hooks[w]) && !hasNumber(r.hooks[1 - w]) })

/* ---------- Score ---------- */

export const SCORE_LABEL: Record<ScoreKey, string> = { hook: 'Hook', flow: 'Flow', value: 'Value', trend: 'Trend' }
const clamp = (n: number) => Math.max(0, Math.min(99, Math.round(n)))
export const total = (s: Score) => clamp(s.hook * 0.35 + s.flow * 0.25 + s.value * 0.25 + s.trend * 0.15)

/** Juno's score after your edits, with one reason per part. Deterministic: same clip, same score. */
export function rescore(c: Clip, t: Transcript): { score: Score; total: number; reasons: Record<ScoreKey, string>; track?: Track } {
  const kept = keptWords(c, t)
  const dur = duration(keptSegments(c, t))
  const first = kept[0]
  const firstSentence = first ? t.sentences[first.sent] : undefined
  const fill = kept.filter(w => w.filler).length
  const sil = silences(c, t).length
  let hook = c.base.hook, flow = c.base.flow
  const value = c.base.value, trend = c.base.trend
  let hookWhy = 'Opens straight on the moment'
  if (first?.filler) { hook -= 10; hookWhy = 'Opens on a filler word: viewers swipe in the first second' }
  else if (firstSentence && /\?|\d/.test(firstSentence.text)) { hook += 6; hookWhy = 'Opens on a question or a number in the first 3 seconds' }
  flow -= Math.min(12, fill * 2) + Math.min(12, sil * 3)
  let flowWhy = fill || sil ? `${fill} filler${fill === 1 ? '' : 's'} and ${sil} long pause${sil === 1 ? '' : 's'} left` : 'No fillers or long pauses'
  const tooLong = c.post.networks.filter(n => dur > lengthSpec(n).max + 0.5)
  if (tooLong.length) { flow -= 10; flowWhy = `${Math.round(dur)} s: longer than ${lengthSpec(tooLong[0]).max} s, ${[...new Set(tooLong.map(n => NETWORK_FIT[n] ?? n))].join(' and ')} cut it off` }
  else if (dur < 12) { flow -= 6; flowWhy = `${Math.round(dur)} s: too short to land the point` }
  const score = { hook: clamp(hook), flow: clamp(flow), value: clamp(value), trend: clamp(trend) }
  const reasons = {
    hook: hookWhy, flow: flowWhy,
    value: c.evidence[0] ? `${c.evidence[0].value} ${c.evidence[0].label}` : 'Shows the product doing its job',
    trend: c.base.trend >= 70 ? 'The topic is rising on TikTok this week' : 'Steady topic, not trending',
  }
  // The rule learned from hook trials, once in the Playbook, counts in the track record, with the hook as it is now.
  const tr = c.track?.rule ? {
    ...c.track, delta: c.track.delta + (hasNumber(c.hook) ? RULE_BONUS : 0),
    why: [c.track.why, hasNumber(c.hook) ? 'The hook opens on a number, as your Playbook says' : 'Your Playbook says to open on a number: this hook doesn’t'].filter(Boolean).join('. '),
  } : c.track
  return { score, total: clamp(total(score) + (tr?.delta ?? 0)), reasons, track: tr }
}

/* ---------- Ask Juno ---------- */

const LANG_WORDS: [RegExp, Lang][] = [[/french|fran[cç]ais/, 'fr'], [/german|deutsch/, 'de'], [/spanish|espa[nñ]ol/, 'es'], [/italian|italiano/, 'it'], [/english|original/, 'en']]

/** Juno's scripted understanding of a request on one clip. Never invents: an edit it can't make says so. */
export function applyAsk(c: Clip, t: Transcript, raw: string, avoid: { s: number; e: number }[] = []): { clip: Clip; reply: string; changed: boolean } {
  const q = raw.toLowerCase().trim()
  const same = (reply: string) => ({ clip: c, reply, changed: false })
  if (/\bcover|thumbnail\b/.test(q)) {
    const frames = coverFrames(c, t, avoid)
    if (!frames.length) return same('No other frame in this clip works as a cover.')
    const k = frames.findIndex(f => f.at === c.cover?.at)
    const next = frames[(k + 1) % frames.length]
    if (next.at === c.cover?.at) return same('That’s the only frame that works as a cover here.')
    return { clip: { ...c, cover: { at: next.at, text: c.cover?.text ?? coverText(c.hook), by: 'you' } }, reply: `New cover at ${Math.floor((next.at - c.start) / 60)}:${String(Math.round((next.at - c.start) % 60)).padStart(2, '0')}: ${next.why.toLowerCase()}. The hook reads over it.`, changed: true }
  }
  if (/\b(say|replace|change what|instead of)\b/.test(q) && !/caption/.test(q))
    return same('I won’t change what someone says on my own. Select the words in the transcript and use “Change the words”: you confirm, then I re-voice them.')
  const lang = LANG_WORDS.find(([re]) => re.test(q))?.[1]
  if (lang) {
    if (lang === 'en') return { clip: { ...c, audio: { ...c.audio, lang } }, reply: 'Back to the original English voice and captions.', changed: c.audio.lang !== 'en' }
    return { clip: { ...c, audio: { ...c.audio, lang, dubs: [...new Set([...c.audio.dubs, lang])] } }, reply: `Here’s the ${LANG_LABEL[lang]} version, in the same voice. The captions are translated too.`, changed: true }
  }
  if (/\b(um+|uh+|filler)/.test(q)) {
    const n = fillers(c, t).length
    return n ? { clip: removeFillers(c, t), reply: `Removed ${n} filler${n > 1 ? 's' : ''}.`, changed: true } : same('There are no fillers left in this clip.')
  }
  if (/silence|pause|dead air/.test(q)) {
    const n = silences(c, t).length
    return n ? { clip: { ...c, trimGaps: true }, reply: `Tightened ${n} pause${n > 1 ? 's' : ''}, ${silenceSaved(c, t).toFixed(1)} s shorter.`, changed: true } : same('No long pauses left.')
  }
  const startOn = q.match(/(?:start|open|begin)\s+(?:with|on|at)\s+(?:the\s+)?(.+)/)
  if (startOn) {
    const keys = keywords(startOn[1])
    const hit = t.sentences.find(s => s.e > c.start - 90 && s.s < c.end && keys.some(k => s.text.toLowerCase().includes(k)))
    if (!hit) return same(`I couldn’t find “${startOn[1]}” near this clip.`)
    if (hit.s >= c.end - 5) return same('That moment is at the very end of the clip. Extend the end first.')
    return { clip: { ...c, start: hit.s, end: Math.max(c.end, hit.e) }, reply: `Now it opens on “${hit.text.slice(0, 48)}${hit.text.length > 48 ? '…' : ''}”.`, changed: hit.s !== c.start }
  }
  const secs = q.match(/(\d{1,2})\s*(?:s|sec|seconds)\b/)
  if (secs || /shorter|tighter|trim/.test(q)) {
    const segs = keptSegments(c, t)
    const target = secs ? Number(secs[1]) : Math.max(15, duration(segs) * 0.7)
    let next = c
    for (let k = 0; k < 40 && duration(keptSegments(next, t)) > target + 0.5; k++) {
      const shorter = extend(next, t, 'end', -1)
      if (shorter.end === next.end || shorter.end - shorter.start < 8) break
      next = shorter
    }
    const d = Math.round(duration(keptSegments(next, t)))
    if (next === c) return same(`It’s already ${Math.round(duration(segs))} s, and shorter would cut the point.`)
    return { clip: next, reply: `Down to ${d} s: I kept the opening and cut the end at a sentence break.`, changed: true }
  }
  if (/punch|energ|bold|bigger|loud/.test(q)) return { clip: { ...c, captions: { ...c.captions, template: 'pop', perLine: 2, upper: true, size: Math.max(c.captions.size, 8) } }, reply: 'Captions now pop: two words at a time, bigger, in capitals.', changed: true }
  if (/calm|subtle|clean|quiet/.test(q)) return { clip: { ...c, captions: { ...c.captions, template: 'clean', perLine: 4, upper: false, size: 6 } }, reply: 'Quieter captions: four words a line, no capitals.', changed: true }
  if (/square|1:1/.test(q)) return { clip: { ...c, aspect: '1:1' }, reply: 'Square, for the Instagram and LinkedIn feeds.', changed: c.aspect !== '1:1' }
  if (/landscape|16:9|horizontal|wide/.test(q)) return { clip: { ...c, aspect: '16:9' }, reply: 'Landscape, for YouTube and LinkedIn.', changed: c.aspect !== '16:9' }
  if (/vertical|9:16|portrait/.test(q)) return { clip: { ...c, aspect: '9:16' }, reply: 'Vertical, for TikTok, Reels and Shorts.', changed: c.aspect !== '9:16' }
  return same('I can make it shorter, open on a moment, remove the ums or the pauses, change the captions, the format, the language or the cover.')
}

/* ---------- Language versions that go out ---------- */

/** A post caption in another language: what's said in the clip, translated, cut at a sentence near 160 characters. */
export function translatedCaption(c: Clip, t: Transcript, lang: Lang): string {
  const sents = [...new Set(keptWords(c, t).map(w => w.sent))].map(i => t.sentences[i].tr[lang]).filter((x): x is string => !!x)
  let out = ''
  for (const x of sents) { if (out && (out + ' ' + x).length > 160) break; out = out ? `${out} ${x}` : x }
  return out || c.hook
}

/* ---------- Hand-off to Atlas ---------- */

export const NETWORK_FIT: Partial<Record<Network, string>> = { tiktok: 'TikTok', instagram: 'Reels', youtube: 'Shorts', linkedin: 'LinkedIn feed', facebook: 'Reels' }
const DAY0 = T(0, 0, 0)

/** The posts a clip becomes: one per network, at Atlas's best free slot. */
/** The label and campaign a clip's posts carry (see `campaignFor` in the slice). */
export type PostTags = { labels: string[]; campaign?: string; campaignId?: string }

export function clipPosts(c: Clip, posts: Post[], now: number, makeId: () => string, dur?: number, tags?: PostTags): Post[] {
  const day = Math.floor((now - DAY0) / DAY)
  const out: Post[] = []
  for (const n of c.post.networks.filter(x => dur === undefined || fitsLength(x, dur))) {
    const at = pickSlot(n, day, [...posts, ...out], now)
    const format = n === 'instagram' || n === 'facebook' ? 'reel' : n === 'linkedin' ? 'video' : 'short'
    out.push({ id: makeId(), network: n, at, text: c.post.text[n] ?? c.hook, media: `clip:${c.id}`, format, status: 'scheduled', author: 'atlas', pillar: c.pillar, ...tags, note: `Clip by Juno: ${c.title} · ${versionOf(c, n).aspect}` })
  }
  return out
}
