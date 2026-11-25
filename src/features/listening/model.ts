// Echo's mention stream and the numbers read from it. Every count Echo cites (screen, ⌘K, Chat, Desk) comes from here.
import type { State } from '../../app/state'
import { now } from '../../app/core'
import { DAY, MIN } from '../../app/time'
import { MENTIONS, type Mention, type Sentiment } from '../../data/listening'

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
