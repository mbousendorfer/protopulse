// Echo's mention stream and the numbers read from it. Every count Echo cites (screen, ⌘K, Chat, Desk) comes from here.
import type { State } from '../../app/state'
import { now } from '../../app/core'
import { DAY, MIN } from '../../app/time'
import { MENTIONS, type Mention, type Search, type Sentiment } from '../../data/listening'
import type { Alert } from '../insights/alerts'

/** Every mention Echo has filed: the ones that arrived during the session first, then the seeded ones. */
export const allMentions = (s: State): Mention[] => [...s.listening.live, ...MENTIONS]
export const mentionOf = (s: State, id: string) => allMentions(s).find(m => m.id === id)

/** The sentiment you see: your correction if you made one, Echo's otherwise. */
export const sentimentOf = (s: State, m: Mention): Sentiment => s.listening.sentiment[m.id] ?? m.sentiment

/** Mentions you haven't hidden. */
export const visibleMentions = (s: State) => allMentions(s).filter(m => s.listening.mentions[m.id] !== 'hidden')

/** Visible mentions in the last `ms`, as of now. */
export const recent = (s: State, ms: number) => { const t = now(s); return visibleMentions(s).filter(m => m.at > t - ms && m.at <= t) }

export type MoodCount = Record<Sentiment, number> & { total: number }
export function moodCount(s: State, ms: Mention[]): MoodCount {
  const c: MoodCount = { positive: 0, neutral: 0, negative: 0, total: ms.length }
  for (const m of ms) c[sentimentOf(s, m)]++
  return c
}

/** The products negative mentions are about, most mentioned first. */
export function topComplaints(s: State, ms: Mention[]) {
  const by = new Map<string, number>()
  for (const m of ms) if (sentimentOf(s, m) === 'negative' && m.product) by.set(m.product, (by.get(m.product) ?? 0) + 1)
  return [...by].sort((a, b) => b[1] - a[1])
}

export const pct = (n: number, of: number) => (of ? `${((n / of) * 100).toFixed(1).replace(/\.0$/, '')}%` : '0%')
export const WEEK = 7 * DAY

/* ---------- The Storm Jacket seams spike ---------- */

/** Echo's 30-day baseline for negative brand mentions per hour. Her spike guardrail is 3× this. */
export const USUAL_NEGATIVE_PER_HOUR = 8
export const SPIKE_FACTOR = 3
/** The spike threshold Sam sees in Echo's guardrails is the one she applies: “3× usual…” → 3. */
export const spikeFactor = (s: State) => parseFloat(s.agents.find(a => a.id === 'echo')?.guardrails.find(g => g.id === 'g1')?.value ?? '') || SPIKE_FACTOR

const SPIKE_AUTHORS = ['r/ultralight', '@leo_alpes', '@anna.trails', '@marc_bivouac', 'r/CampingGear', '@juliette.hikes', '@tom_gr5', '@elise.rando', '@quentin.peaks', '@sara.outdoor', '@bastien_k', '@camille.r', '@florian.alps', '@mila.trek', '@nathan.ski', '@oceane.v', '@paulin.gr20', '@ruben.mtb', '@salome.trail', '@theo.camp', '@ugo.alpes', '@valentin.r', '@wendy.hike', '@yann.peaks', '@zelie.bv', '@adrien.m', '@berenice.k']
const SPIKE_TEXTS = [
  'Storm Jacket seams leak after 3 washes. Thread with photos inside.',
  'Same here, my Storm Jacket seams let water in at the shoulders.',
  'Seams on my Storm are peeling after one season. €220 jacket.',
  'Is anyone else seeing the Storm Jacket seam tape come off?',
  'Wet back after 2 hours of rain. Seams again. @fernway?',
  'Read the Reddit thread about the Storm Jacket seams. Glad I didn’t buy it yet.',
]
const SPIKE_NETS = ['Reddit', 'X', 'Instagram', 'X', 'Reddit', 'TikTok']

/** The 27 negative mentions behind the spike, spread over the last 40 minutes. Ids are stable: firing twice adds nothing. */
export function spikeMentions(at: number): Mention[] {
  return SPIKE_AUTHORS.map((author, i) => ({
    id: `spike-${i + 1}`, author, network: author.startsWith('r/') ? 'Reddit' : SPIKE_NETS[i % SPIKE_NETS.length], text: SPIKE_TEXTS[i % SPIKE_TEXTS.length],
    sentiment: 'negative' as const, reach: author.startsWith('r/') ? 12000 - i * 300 : 300 + ((i * 523) % 3800), at: at - Math.round((i * 40) / SPIKE_AUTHORS.length) * MIN,
    product: 'Storm Jacket', risk: true, search: 's3',
  }))
}

/** Negative brand mentions in the last hour, and per hour over the last 10 hours (oldest first). */
export function negativeLastHour(s: State) {
  const t = now(s)
  const neg = visibleMentions(s).filter(m => sentimentOf(s, m) === 'negative')
  const series = Array.from({ length: 10 }, (_, i) => {
    const end = t - (9 - i) * 60 * MIN
    return neg.filter(m => m.at > end - 60 * MIN && m.at <= end).length
  })
  return { count: series[9], series, ratio: series[9] / USUAL_NEGATIVE_PER_HOUR }
}

/* ---------- Guardrails: counts and caps ---------- */

/** “11 of 15” → 15. The cap is whatever Sam typed in the guardrail. */
const capOf = (s: State, id: string, fallback: number) => Number(s.agents.find(a => a.id === 'echo')?.guardrails.find(g => g.id === id)?.value.match(/of (\d+)/)?.[1]) || fallback
export const searchCap = (s: State) => capOf(s, 'g3', 15)
export const competitorCap = (s: State) => capOf(s, 'g2', 6)
export const activeSearches = (s: State) => s.listening.searches.filter(x => !x.paused).length
export const watchedCount = (s: State) => s.listening.watch.filter(w => w.tracking).length

/* ---------- Searches ---------- */

/** A new search takes 10 minutes to collect its first week. */
export const FILL_MS = 10 * MIN
const hash = (t: string) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
/** How many mentions a new search finds in a week, from its keywords: the same answer every time. */
export const searchTarget = (x: Search) => 120 + (hash(x.keywords.toLowerCase()) % 780)
/** The search's 7-day volume as of `t`, and whether Echo is still collecting it. */
export function searchVolume(x: Search, t: number) {
  if (!x.startedAt) return { volume: x.volume, collecting: false, progress: 1 }
  const progress = Math.min(1, Math.max(0, (t - x.startedAt) / FILL_MS))
  return { volume: Math.round(searchTarget(x) * progress), collecting: progress < 1, progress }
}

/* ---------- Alert rules ---------- */

/** How long a rule stays quiet after it fired. */
export const alertWindow = (a: Alert) => (/1 h/.test(a.unit) ? 60 * MIN : DAY)

/** What a rule measures right now, and the mentions behind it. */
export function alertValue(s: State, a: Alert): { value: number; ms: Mention[] } {
  const t = now(s)
  const scope = (m: Mention) => a.subject === 'brand' || m.search === a.subject
  const inLast = (ms: number) => visibleMentions(s).filter(m => scope(m) && m.at > t - ms && m.at <= t)
  if (a.subject === 'competitors') {
    // Competitor searches only report weekly volumes: Echo reads them per hour.
    const week = s.listening.searches.filter(x => ['s5', 's6', 's7', 's8'].includes(x.id) && !x.paused).reduce((n, x) => n + x.volume, 0)
    return { value: /1 h/.test(a.unit) && !/negative/.test(a.unit) ? Math.round(week / 168) : 0, ms: [] }
  }
  if (/negative/.test(a.unit)) { const ms = inLast(60 * MIN).filter(m => sentimentOf(s, m) === 'negative'); return { value: ms.length, ms } }
  if (/press/.test(a.unit)) { const ms = inLast(DAY).filter(m => m.network === 'Web'); return { value: ms.length, ms } }
  if (/% in a day/.test(a.unit)) {
    const day = inLast(DAY), before = visibleMentions(s).filter(m => scope(m) && m.at > t - 2 * DAY && m.at <= t - DAY).length
    return { value: before ? Math.round(((day.length - before) / before) * 100) : day.length ? 100 : 0, ms: day }
  }
  const ms = inLast(60 * MIN)
  return { value: ms.length, ms }
}

/** What an Echo alert rule can watch, as the rule editor lists it. */
export const alertSubjects = (s: State) => [{ value: 'brand', label: 'Fernway mentions' }, { value: 'competitors', label: 'Competitor mentions' }, ...s.listening.searches.map(x => ({ value: x.id, label: `“${x.name}”` }))]
export const alertSentence = (s: State, a: Alert) => `${alertSubjects(s).find(x => x.value === a.subject)?.label ?? a.subject} ${a.condition} ${a.threshold.toLocaleString('en-GB')}${a.unit}`
