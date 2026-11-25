// Juno's sources and clips. Clips are anchored on phrases of the transcript, so timings follow the media build.
import type { Handoff, Network } from '../app/types'
import { T } from '../app/time'
import type { Pillar } from './publishing'
import type { Brand, Captions, Clip, Evidence, Score, Transcript } from '../features/video/model'
import TRANSCRIPTS from './video-transcripts.json'

export const TRANSCRIPT = TRANSCRIPTS as Record<string, Transcript>

/** Files under public/media, served next to the app. */
export const mediaUrl = (path: string) => `${import.meta.env.BASE_URL}media/${path}`

export type SourceKind = 'youtube' | 'live' | 'link' | 'upload'
export type SourceStatus = 'waiting' | 'processing' | 'ready' | 'failed'
export type Source = {
  id: string
  kind: SourceKind
  title: string
  channel: string
  at: number
  /** Folder under public/media with video.mp4, clean.m4a, dub-*.m4a, poster.jpg, strip.jpg. */
  media: string
  /** Key into TRANSCRIPT. */
  transcript: string
  /** Shown instead of the real file length (a 52-minute live whose file holds only the chapters Juno kept). */
  shownDuration?: string
  status: SourceStatus
  startedAt?: number
  error?: string
  url?: string
  /** An uploaded file, playable for this session only. */
  blob?: string
  /** The prototype can't transcribe your file: the transcript is a sample. */
  sampleTranscript?: boolean
  handoff?: string
}

export const PHASES = ['Transcribing', 'Finding moments', 'Reframing', 'Writing captions'] as const
/** App milliseconds per phase. */
export const PHASE_MS = 10_000

export const SOURCE_DEFS: Record<string, Omit<Source, 'status'>> = {
  repair: { id: 'repair', kind: 'youtube', title: 'How we fix a Ridge 28L strap', channel: 'Fernway on YouTube', at: T(17, 30, -1), media: 'repair', transcript: 'repair' },
  live: { id: 'live', kind: 'live', title: 'Repair Friday live · Q&A with the workshop', channel: 'Fernway on YouTube Live', at: T(18, 0, -4), media: 'live', transcript: 'live', shownDuration: '52:14', handoff: 'h-clips-live' },
  gr20: { id: 'gr20', kind: 'youtube', title: 'Storm Jacket: 3 days of GR20 rain', channel: 'Fernway on YouTube', at: T(8, 0), media: 'gr20', transcript: 'gr20' },
}

export const WATCHING = { channel: 'Fernway', handle: '@fernway', subscribers: '6k', checkedEvery: '15 minutes' }

/* ---------- Brand kit ---------- */

export const DEFAULT_CAPTIONS: Captions = { template: 'highlight', font: 'sans', size: 7, y: 72, perLine: 3, color: 'sun', emoji: false, upper: false }
export const DEFAULT_BRAND: Brand = { logo: true, progress: true, intro: false, outro: true, music: 'calm', musicVol: 18, duck: true }
export type BrandKit = { captions: Captions; brand: Brand; langs: ('fr' | 'de' | 'es' | 'it')[]; outro: string; watchUploads: boolean; watchLives: boolean }
export const BRAND_KIT: BrandKit = { captions: DEFAULT_CAPTIONS, brand: DEFAULT_BRAND, langs: ['fr', 'de'], outro: 'Free repairs for life · fernway.com', watchUploads: true, watchLives: true }

export const TEMPLATES: { id: Captions['template']; label: string; note: string }[] = [
  { id: 'highlight', label: 'Highlight', note: 'The word being said lights up' },
  { id: 'pop', label: 'Pop', note: 'Big, two words at a time' },
  { id: 'clean', label: 'Clean', note: 'Plain subtitles, no effects' },
  { id: 'keyword', label: 'Keyword', note: 'Numbers and product names in colour' },
  { id: 'boxed', label: 'Boxed', note: 'White text on a dark band' },
]

export const BROLL = [
  { id: 'sewing', label: 'Sewing machine close-up', file: 'broll/sewing.mp4', match: /stitch|sew|repair|webbing|unpick/i },
  { id: 'trail', label: 'Backpack on a trail', file: 'broll/trail.mp4', match: /trail|bag|ridge|hike|gr20/i },
  { id: 'rain', label: 'Rain on a jacket', file: 'broll/rain.mp4', match: /rain|dry|soaked|waterproof|storm|hood/i },
  { id: 'lake', label: 'Bottle by a lake', file: 'broll/lake.mp4', match: /bottle|water|lake|warranty/i },
]
export const MUSIC = [
  { id: 'calm', label: 'Morning trail · calm acoustic', file: 'music/calm.m4a' },
  { id: 'upbeat', label: 'Summit push · upbeat', file: 'music/upbeat.m4a' },
]

/* ---------- Clip seeds ---------- */

export type ClipSeed = {
  key: string
  /** Phrase in the first and last sentence of the moment. */
  from: string
  to: string
  title: string
  hooks: string[]
  base: Score
  why: string
  evidence: Evidence[]
  networks: Network[]
  pillar: Pillar
  text: string
  status?: Clip['status']
  stats?: Clip['stats']
}

const ev = (value: string, label: string, from: string, to?: string): Evidence => ({ value, label, from, to })

export const SEEDS: Record<string, ClipSeed[]> = {
  repair: [
    { key: 'strap', from: 'strap tears', to: 'Annecy workshop', title: 'The strap that came back', hooks: ['It tore after 3 years. We fixed it for free.', 'What do you do when a strap tears?', 'Most brands would sell you a new bag.'],
      base: { hook: 88, flow: 74, value: 84, trend: 72 }, why: 'Opens on a question every hiker has asked, then shows the bag coming back. Repair posts are your best format this month.',
      evidence: [ev('6.4%', 'engagement rate on repair posts, 30 days', 'Insights', '/insights/explore'), ev('2.3×', 'completion on videos that open with a question', 'Insights', '/insights/explore'), ev('+48%', '“repair over replace” mentions this week', 'Listening', '/listening/trends')],
      networks: ['tiktok', 'instagram', 'youtube'], pillar: 'Repair & care', text: 'It tore after three years. We fixed it in twenty minutes, for free. #repair #buyitforlife' },
    { key: 'twenty', from: 'Forty-two', to: 'free repairs for life', title: 'Twenty minutes, zero euros', hooks: ['42 stitches. 20 minutes. €0.', 'This repair cost the owner nothing.', 'Free repairs, for life. Here’s what that looks like.'],
      base: { hook: 81, flow: 80, value: 90, trend: 64 }, why: 'Three numbers in ten seconds and the promise at the end. Numbers in the hook lift your saves.',
      evidence: [ev('4.1%', 'save rate on posts with a number in the first line', 'Insights', '/insights/explore'), ev('1,200', 'bags repaired this year', 'Playbook facts', '/playbook')],
      networks: ['tiktok', 'instagram', 'linkedin'], pillar: 'Repair & care', text: '42 bar-tack stitches, 20 minutes, €0 for the owner. Every Ridge is repaired free, for life.' },
    { key: 'greenest', from: 'People always ask me', to: 'into a bin', title: 'Back on a trail, not in a bin', hooks: ['Why repair a bag instead of sending a new one?', '1,200 bags back on a trail, not in a bin.', 'A new Ridge costs €140, and a lot of carbon.'],
      base: { hook: 80, flow: 74, value: 82, trend: 74 }, why: 'Léa answers the question everyone asks, with a price and a number. Good closer for the week.',
      evidence: [ev('+48%', '“repair over replace” mentions this week', 'Listening', '/listening/trends')],
      networks: ['instagram', 'linkedin'], pillar: 'Repair & care', text: '1,200 bags repaired this year. Every one went back on a trail instead of into a bin.' },
    { key: 'unpick', from: 'unpick', to: 'Forty-two', title: 'One stitch at a time', hooks: ['How we replace a strap, step by step.'], status: 'sent',
      base: { hook: 70, flow: 82, value: 80, trend: 58 }, why: 'Satisfying process footage: watch-time is high on workshop videos.',
      evidence: [ev('71%', 'average watch-time on workshop videos', 'Insights', '/insights/explore')],
      networks: ['tiktok'], pillar: 'Repair & care', text: 'How we replace a strap, one stitch at a time.' },
    { key: 'brands', from: 'most brands', to: 'came back', title: 'Most brands would sell you a new bag', hooks: ['Most brands would sell you a new bag.'], status: 'published', stats: { views: 48200, er: 7.1 },
      base: { hook: 84, flow: 70, value: 80, trend: 74 }, why: 'Contrarian line, then proof.',
      evidence: [ev('48.2k', 'views on TikTok since yesterday evening', 'Insights', '/insights/explore')],
      networks: ['tiktok'], pillar: 'Repair & care', text: 'Most brands would sell you a new bag. We fix yours.' },
  ],
  live: [
    { key: 'zips', from: 'what breaks most', to: 'step on them', title: 'Zips break, not fabric', hooks: ['What breaks first on a backpack? Not what you think.', 'Zips, not fabric.', '1,200 repairs taught us this.'],
      base: { hook: 86, flow: 78, value: 86, trend: 66 }, why: 'A question, a surprising answer from the workshop lead, and a number. Works as a standalone tip.',
      evidence: [ev('4 to 1', 'broken zips for every torn strap in the workshop', 'Playbook facts', '/playbook'), ev('34%', 'of repair requests are zips', 'Inbox', '/inbox')],
      networks: ['tiktok', 'instagram', 'youtube', 'linkedin'], pillar: 'Gear that lasts', text: 'What breaks first on a backpack? Our workshop lead has the answer: zips, not fabric.' },
    { key: 'second', from: 'from Tom', to: 'whoever owns it', title: 'The repair follows the bag', hooks: ['Bought it second-hand? We still repair it.', 'The repair follows the bag, not the receipt.'],
      base: { hook: 83, flow: 84, value: 88, trend: 71 }, why: 'Answers the question you get most in DMs, in Léo’s own words. Strong for comments and shares.',
      evidence: [ev('27', 'DMs asking about second-hand repairs this month', 'Inbox', '/inbox'), ev('+31%', 'second-hand outdoor gear searches', 'Listening', '/listening/trends')],
      networks: ['instagram', 'tiktok', 'facebook'], pillar: 'Community', text: 'Bought your Fernway second-hand? The repair follows the bag, not the receipt.' },
    { key: 'bottle', from: 'asked about the Summit Bottle', to: 'keeps your water cold', title: 'Dented? Still covered', hooks: ['Dent your Summit Bottle? Still covered.', 'A lifetime warranty, even for dents.'],
      base: { hook: 74, flow: 76, value: 82, trend: 55 }, why: 'Clear product promise. Shorter and less surprising than the other two.',
      evidence: [ev('7.8%', 'engagement on the bottle drop test', 'Insights', '/insights/explore')],
      networks: ['tiktok', 'instagram'], pillar: 'Gear that lasts', text: 'Dented your Summit Bottle? Lifetime warranty, dents included.' },
  ],
  gr20: [
    { key: 'refuge', from: 'Three days of rain', to: 'really stop', title: 'Three days of rain, still dry', hooks: ['3 days of rain on the GR20.', 'The forecast said sun.', 'It didn’t stop for three days.'],
      base: { hook: 90, flow: 76, value: 80, trend: 82 }, why: 'Opens on the place and the problem in two seconds. First snow and rain gear are trending this week.',
      evidence: [ev('+64%', '“waterproof jacket” searches since Sunday', 'Listening', '/listening/trends'), ev('4.6%', 'engagement on the Storm Jacket hose test', 'Insights', '/insights/explore')],
      networks: ['tiktok', 'instagram', 'youtube'], pillar: 'Trail stories', text: 'Three days of rain on the GR20. The forecast said sun.' },
    { key: 'dry', from: 'At the refuge', to: 'forever chemicals', title: '20,000 mm, PFAS-free', hooks: ['Everything was soaked. Except this.', '20,000 mm of waterproofing. Zero PFAS.', 'Dry for 3 days. No PFAS.'],
      base: { hook: 80, flow: 82, value: 88, trend: 78 }, why: 'The two facts people ask about, back to back. PFAS is a hot topic in rainwear right now.',
      evidence: [ev('+52%', '“PFAS rainwear” mentions this month', 'Listening', '/listening/searches')],
      networks: ['instagram', 'linkedin', 'tiktok'], pillar: 'Gear that lasts', text: 'The Storm Jacket stayed dry for three days: 20,000 mm of waterproofing, PFAS-free membrane.' },
    { key: 'hood', from: 'hood stays', to: 'sweat is water too', title: 'Sweat is water too', hooks: ['The hood stays on in 40 km/h wind.', 'Sweat is water too.'],
      base: { hook: 74, flow: 78, value: 80, trend: 60 }, why: 'Two details people notice on the trail: the hood and the pit zips. Less of a hook than the rain.',
      evidence: [ev('340 g', 'Storm Jacket weight', 'Playbook facts', '/playbook')],
      networks: ['instagram', 'facebook'], pillar: 'Gear that lasts', text: 'The hood stays on in 40 km/h wind, and the pit zips keep you dry from the inside.' },
  ],
}

/** Seed anchors → source times, at sentence boundaries. */
export function anchor(t: Transcript, from: string, to: string): { start: number; end: number } {
  const find = (p: string, after = 0) => t.sentences.find(s => s.i >= after && s.text.toLowerCase().includes(p.toLowerCase()))
  const a = find(from) ?? t.sentences[0]
  const b = find(to, a.i) ?? t.sentences[Math.min(a.i + 2, t.sentences.length - 1)]
  return { start: a.s, end: b.e }
}

export function clipFromSeed(seed: ClipSeed, source: Source, arrivedAt: number, kit: BrandKit = BRAND_KIT): Clip {
  const t = TRANSCRIPT[source.transcript]
  const { start, end } = anchor(t, seed.from, seed.to)
  return {
    id: `clip-${source.id}-${seed.key}`, source: source.id, title: seed.title, hook: seed.hooks[0], hooks: seed.hooks, start, end, cut: [], trimGaps: false, fixes: {}, overdub: {},
    base: seed.base, why: seed.why, evidence: seed.evidence, aspect: '9:16', frame: 'track', captions: { ...kit.captions }, broll: [], brand: { ...kit.brand },
    audio: { studio: false, lang: 'en', dubs: [] }, post: { networks: seed.networks, text: Object.fromEntries(seed.networks.map(n => [n, seed.text])) },
    pillar: seed.pillar, status: seed.status ?? 'ready', stats: seed.stats, arrivedAt,
    posts: seed.status === 'sent' || seed.status === 'published' ? [`p-clip-${source.id}-${seed.key}`] : undefined,
  }
}

/** The Desk card when a source's clips are ready (clip drafting on Draft). */
export function clipsCard(source: Source, clips: Clip[], id?: string): Omit<Handoff, 'id' | 'at'> & { id?: string } {
  const top = clips[0]
  return {
    id, agent: 'juno', kind: 'approval', urgency: 'today', topic: 'Clips', action: 'juno-handoff', chain: ['juno', 'atlas'], ref: source.id,
    title: `${clips.length} clips from “${source.title}” are ready`,
    context: top ? `Strongest: “${top.title}”. ${top.why.split('. ')[0]}.` : '',
    why: 'Sending clips to Atlas is set to Draft: nothing reaches the calendar until you say so.',
    confidence: 84, link: `/video?source=${source.id}`,
    preview: top ? { type: 'clip', clip: top.id } : undefined,
    sources: top?.evidence.slice(0, 2).map(e => ({ label: `${e.value} ${e.label}`, from: e.from })),
  }
}
