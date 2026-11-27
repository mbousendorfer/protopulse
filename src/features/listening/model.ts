// Echo's mention stream and the numbers read from it. Every count Echo cites (screen, ⌘K, Chat, Desk) comes from here.
import type { State } from '../../app/state'
import { now } from '../../app/core'
import { DAY, MIN } from '../../app/time'
import { COMP_NETWORKS, COMPETITORS, CREATOR_INFO, TOP_POSTS, TRENDS, type NetStat, EVENTS, FERNWAY_ROW, MENTIONS, type CompEvent, type Competitor, type Mention, type Search, type Sentiment } from '../../data/listening'
import type { Network } from '../../app/types'
import { NET_SHARE, POSTS } from '../../data/insights'
import { lastWeekOf } from '../strategy/slice'
import type { Watched } from './slice'
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
/** A share as people read it: counts for a handful (“2 of 3”), a percentage from 10 up. */
export const share = (n: number, of: number) => (of < 10 ? `${n} of ${of}` : pct(n, of))
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
export function searchVolume(x: Search, t: number, live = 0) {
  if (!x.startedAt) return { volume: x.volume + live, collecting: false, progress: 1 }
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

/* ---------- Competitors, seeded or added ---------- */

/** Echo reads an added competitor's last 30 days in 10 minutes; the first event comes within the hour. */
export const BACKFILL_MS = 10 * MIN
export const FIRST_EVENT_MS = 25 * MIN

const FORMATS: Partial<Record<Network, string>> = { instagram: 'Reels, carousels', tiktok: 'Short video', linkedin: 'Text posts, carousels', youtube: 'Films, Shorts', facebook: 'Catalogue posts', x: 'Threads' }
const pick = (n: number, lo: number, hi: number, step = 1) => lo + Math.round(((n % 1000) / 1000) * (hi - lo) / step) * step

/** Credible public numbers for a competitor Sam added, the same every time for the same name. */
export function generatedCompetitor(w: Watched): Competitor {
  const h = hash(w.name.toLowerCase())
  const main = w.accounts[0]?.network ?? 'instagram'
  return {
    id: w.id, name: w.name, handle: w.accounts[0]?.handle ?? w.name, positioning: `Added by you. Echo has read ${w.name}’s last 30 days on ${w.accounts.length} account${w.accounts.length > 1 ? 's' : ''}.`,
    price: '€€', followers: pick(h, 20, 300) * 1000, growth: pick(h >> 3, 5, 40) / 10, cadence: pick(h >> 5, 4, 22), er: pick(h >> 7, 8, 48) / 10,
    formats: FORMATS[main] ?? 'Posts', sov: pick(h >> 9, 3, 9), hero: 'Not known yet',
  }
}

const seeded = (id: string) => COMPETITORS.find(c => c.id === id)
/** Data is ready once Echo has backfilled it (always, for the seeded four). */
export const competitorReady = (s: State, w: Watched) => !w.custom || now(s) >= w.since + BACKFILL_MS
/** Every competitor with data: the seeded ones, plus the ones Sam added once backfilled. Paused ones included. */
export const competitorsOf = (s: State): Competitor[] => s.listening.watch.filter(w => competitorReady(s, w)).map(w => seeded(w.id) ?? generatedCompetitor(w))
export const competitorOf = (s: State, id: string) => competitorsOf(s).find(c => c.id === id)
export const competitorName = (s: State, id: string) => s.listening.watch.find(w => w.id === id)?.name ?? seeded(id)?.name ?? id
export const eventsOf = (s: State): CompEvent[] => [...s.listening.customEvents, ...EVENTS]

/** Share of voice among what Echo watches: each brand's share, Fernway included, summing to 100. */
export function shareOfVoice(s: State): Record<string, number> {
  const watched = competitorsOf(s).filter(c => s.listening.watch.find(w => w.id === c.id)?.tracking)
  const total = FERNWAY_ROW.sov + watched.reduce((n, c) => n + c.sov, 0)
  return Object.fromEntries([['fernway', FERNWAY_ROW.sov], ...watched.map(c => [c.id, c.sov])].map(([id, v]) => [id, Math.round(((v as number) / total) * 100)]))
}

/** The first event Echo raises for a competitor you added. */
export function firstEvent(w: Watched, at: number): CompEvent {
  const c = generatedCompetitor(w)
  const net = w.accounts[0]?.network ?? 'instagram'
  return {
    id: `e-${w.id}`, competitor: w.id, type: 'Viral post', at, title: `${w.name}’s best ${net === 'tiktok' || net === 'youtube' ? 'video' : 'post'} this month: ${(c.er * 2.4).toFixed(1)}% engagement`,
    proof: { network: net, text: `${c.formats.split(',')[0]} from ${c.handle}, twice their usual engagement.`, metric: `${(c.er * 2.4).toFixed(1)}% engagement vs ${c.er}% usual` },
    impact: 'Low', impactWhy: `${w.name} is smaller than you (${(c.followers / 1000).toFixed(0)}k followers). Worth knowing what works for them.`,
    read: 'One post doesn’t make a trend. Echo will tell you if they repeat it.',
    moves: [{ label: 'Add to Echo’s lessons only', agent: 'echo', kind: 'lesson' }, { label: 'Atlas tests the same format', agent: 'atlas', kind: 'counter' }, { label: 'Nothing to do', agent: 'echo', kind: 'none' }],
  }
}

/* ---------- What a search caught ---------- */

const terms = (list: string) => list.split(',').map(x => x.trim().toLowerCase()).filter(Boolean)
/** The Brand search is the feed itself; the others match any keyword (all its words present) minus the exclusions, or were tagged by Echo. */
export function inSearch(x: Search, m: Mention) {
  if (x.id === 's1') return true
  const t = `${m.author} ${m.text} ${m.product ?? ''}`.toLowerCase()
  const has = (k: string) => k.replace(/^[@#]/, '').split(/\s+/).every(w => t.includes(w))
  return m.search === x.id || (terms(x.keywords).some(has) && !terms(x.exclude).some(has))
}
export const searchMentions = (s: State, x: Search) => visibleMentions(s).filter(m => inSearch(x, m))
/** Mentions filed during the session add to the search's weekly volume, so the table and the search page agree. */
export const searchLive = (s: State, x: Search) => (x.startedAt ? 0 : s.listening.live.filter(m => inSearch(x, m)).length)

/** Echo's one-paragraph read of a search: what dominates, what's rising, who's loudest, what's waiting. */
export function searchRead(s: State, x: Search) {
  const ms = searchMentions(s, x)
  if (!ms.length) return x.startedAt ? `I’m still reading the last 7 days for “${x.name}”.` : `Nothing new on “${x.name}” in the mentions I filed.`
  const c = moodCount(s, ms)
  const day = ms.filter(m => m.at > now(s) - DAY && sentimentOf(s, m) === 'negative')
  const top = topComplaints(s, day)[0]
  const loud = [...ms].sort((a, b) => b.reach - a.reach)[0]
  const open = (ref: string) => s.handoffs.some(h => h.ref === ref && !h.lane)
  const waiting = ms.filter(m => open(`mention:${m.id}`) || (m.id.startsWith('spike-') && open('spike-replies') && !s.listening.mentions[m.id])).length
  const word = topWord(day, `${x.name} ${x.keywords} ${top?.[0] ?? ''}`)
  const head = day.length >= 3
    ? `${day.length} negative mentions in the last 24 hours${top && !x.name.toLowerCase().includes(top[0].toLowerCase()) ? `, ${top[1]} about the ${top[0]}` : ''}${word ? `; ${word[1]} say “${word[0]}”` : ''}.`
    : c.total < 10
      ? `${c.positive >= c.negative ? `${c.positive} of the last ${c.total} are positive` : `${c.negative} of the last ${c.total} are negative`}.`
      : `Mostly ${c.positive >= c.negative ? 'positive' : 'negative'}: ${pct(c.positive, c.total)} positive, ${pct(c.negative, c.total)} negative.`
  return `${head} Loudest: ${loud.author} on ${loud.network} (${loud.reach.toLocaleString('en-GB')} reach).${waiting ? ` Nova has ${waiting} repl${waiting === 1 ? 'y' : 'ies'} waiting on your Desk.` : ''}`
}

const STOP = new Set('about after again anyone because before being from have here into just like more only other same some than that their them then there they this what when with your yours mine read thread photos inside after washes season glad didn’t yet'.split(' '))
/** The word most negative mentions share, leaving out the search's own words: “seams”. */
function topWord(ms: Mention[], own: string) {
  const skip = new Set(own.toLowerCase().split(/[^a-zà-ÿ]+/))
  const by = new Map<string, number>()
  for (const m of ms) for (const w of new Set(m.text.toLowerCase().split(/[^a-zà-ÿ’]+/))) if (w.length > 3 && !STOP.has(w) && !skip.has(w)) by.set(w, (by.get(w) ?? 0) + 1)
  const best = [...by].sort((a, b) => b[1] - a[1])[0]
  return best && best[1] >= 3 ? best : undefined
}

/* ---------- Creators ---------- */

/** Creators: authors with an @handle reaching 5,000 people or more. */
export const CREATOR_MIN_REACH = 5000
/** Echo proposes a collab to a creator who is mostly positive, reaches 10k or more and isn't signed with a rival. */
export const COLLAB_MIN_REACH = 10_000
export type Creator = { handle: string; name: string; network: string; followers: number; mentions: Mention[]; mood: Sentiment; fit: boolean; fitWhy: string; also: { competitor: string; n: number }[]; history: string[]; signed?: string }

export function creatorsOf(s: State): Creator[] {
  const by = new Map<string, Mention[]>()
  for (const m of allMentions(s)) if (m.author.startsWith('@') && (m.reach >= CREATOR_MIN_REACH || CREATOR_INFO[m.author])) by.set(m.author, [...(by.get(m.author) ?? []), m])
  return [...by].map(([handle, ms]) => {
    const info = CREATOR_INFO[handle]
    const c = moodCount(s, ms)
    const mood: Sentiment = c.negative > c.positive ? 'negative' : c.positive >= c.neutral ? 'positive' : 'neutral'
    const followers = Math.max(...ms.map(m => m.reach))
    const signed = info?.signed ? competitorName(s, info.signed) : undefined
    const fit = mood === 'positive' && followers >= COLLAB_MIN_REACH && !signed
    const fitWhy = signed ? `Signed with ${signed}: not now.` : mood !== 'positive' ? 'Not positive about Fernway yet.' : followers < COLLAB_MIN_REACH ? `Under ${COLLAB_MIN_REACH / 1000}k people: thank them, no collab yet.` : `Positive, unpaid, ${Math.round(followers / 1000)}k people: worth a collab.`
    return { handle, name: info?.name ?? handle.slice(1), network: ms[0].network, followers, mentions: ms, mood, fit, fitWhy, also: (info?.also ?? []).map(a => ({ competitor: competitorName(s, a.competitor), n: a.n })), history: info?.history ?? [], signed }
  }).sort((a, b) => Number(b.fit) - Number(a.fit) || b.followers - a.followers)
}
export const creatorOf = (s: State, handle: string) => creatorsOf(s).find(c => c.handle === handle)

/* ---------- Benchmark per network ---------- */

export type NetRow = NetStat & { id: string; name: string; us: boolean; rank: number }

/** One competitor's numbers on a network: seeded for the four, split across their accounts for one you added. */
function netStat(s: State, w: Watched, n: Network): NetStat | undefined {
  const seededNet = COMP_NETWORKS[w.id as keyof typeof COMP_NETWORKS]
  if (seededNet) return seededNet[n]
  if (!w.accounts.some(a => a.network === n) || !competitorReady(s, w)) return
  const c = generatedCompetitor(w)
  return { followers: Math.round(c.followers / w.accounts.length), perWeek: Math.max(1, Math.round(c.cadence / w.accounts.length)), er: c.er }
}

/** Fernway's own numbers come from Iris (followers share, engagement) and Atlas's posts (posts last 7 days). */
const ours = (s: State, n: Network): NetStat => ({ followers: Math.round(FERNWAY_ROW.followers * NET_SHARE[n].share), perWeek: lastWeekOf(s)[n] ?? 0, er: NET_SHARE[n].er })

/** Networks where at least one watched competitor posts. */
export const benchNetworks = (s: State): Network[] =>
  (['instagram', 'tiktok', 'linkedin', 'facebook', 'youtube', 'x'] as Network[]).filter(n => s.listening.watch.some(w => w.tracking && netStat(s, w, n)))

/** Fernway and the watched competitors on one network, ranked by engagement rate. */
export function networkRows(s: State, n: Network): NetRow[] {
  const rows = [{ id: 'fernway', name: 'Fernway', us: true, ...ours(s, n) }, ...s.listening.watch.filter(w => w.tracking).flatMap(w => { const x = netStat(s, w, n); return x ? [{ id: w.id, name: w.name, us: false, ...x }] : [] })]
  return rows.sort((a, b) => b.er - a.er).map((r, i) => ({ ...r, rank: i + 1 }))
}

/** Our best post and theirs on a network. */
export const ourTop = (n: Network) => POSTS.filter(p => p.network === n).sort((a, b) => b.er - a.er)[0]
export const theirTop = (n: Network, id: string) => TOP_POSTS.filter(p => p.network === n && p.competitor === id).sort((a, b) => b.er - a.er)[0]

/** Echo's reading of a network: who leads, why, what to do. Only numbers from networkRows. */
export function networkRead(s: State, n: Network, rival?: string) {
  const rows = networkRows(s, n)
  const us = rows.find(r => r.us)!
  const lead = rows[0]
  const them = rows.find(r => r.id === rival) ?? (lead.us ? rows[1] : lead)
  if (!them) return { text: `No competitor I watch posts on ${netLabel(n)}.`, them: undefined }
  const top = theirTop(n, them.id)
  const often = them.perWeek >= us.perWeek * 2 && us.perWeek > 0 ? ` They post ${Math.round(them.perWeek / us.perWeek)}× more often (${them.perWeek} a week, you ${us.perWeek}).` : ` They post ${them.perWeek} a week, you ${us.perWeek}.`
  const head = them.er > us.er
    ? `${them.name} beats you on ${netLabel(n)}: ${them.er}% engagement against your ${us.er}%, rank ${them.rank} to your ${us.rank}.`
    : `You beat ${them.name} on ${netLabel(n)}: ${us.er}% engagement against ${them.er}%, rank ${us.rank} to their ${them.rank}.`
  return { text: `${head}${often}${top ? ` Their best: “${top.title}” (${top.views} views, ${top.format.toLowerCase()}). ${top.takeaway}` : ''}`, them }
}
const NET_LABEL: Partial<Record<Network, string>> = { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', facebook: 'Facebook', youtube: 'YouTube', x: 'X' }
export const netLabel = (n: Network) => NET_LABEL[n] ?? n

/* ---------- Seen / unseen ---------- */

/** What needs a human: negative, at risk or a question, and nobody answered it yet. Echo files the rest on her own. */
export const needsYou = (s: State, m: Mention) =>
  !s.listening.mentions[m.id] && (sentimentOf(s, m) === 'negative' || !!m.risk || m.text.includes('?'))
/** Seen: you opened it or marked it, it came before your last brief, or Echo handled it alone. */
export const seenOf = (s: State, m: Mention) => !!s.listening.seen[m.id] || m.at <= s.brief.since || !needsYou(s, m)
/** The Mentions badge: unseen mentions that need you. */
export const unseenNeeds = (s: State, ms = visibleMentions(s)) => ms.filter(m => !seenOf(s, m))

/* ---------- What waits for Sam (Listening › Needs you, the rail badge) ---------- */

/** An event's status: Sam's move, else seeded as already handled, else open (null). */
export function eventState(s: State, e: CompEvent): { status: 'handed' | 'done' | 'dismissed'; move: string; result: string } | null {
  return s.listening.events[e.id] ?? (e.done ? { status: 'done', ...e.done } : null)
}

/** Events on watched competitors that nobody answered yet, newest first. */
export const openEvents = (s: State) => {
  const watched = new Set(s.listening.watch.filter(w => w.tracking).map(w => w.id))
  return eventsOf(s).filter(e => watched.has(e.competitor) && !eventState(s, e)).sort((a, b) => b.at - a.at)
}

/**
 * Everything in Listening that waits for a decision, grouped by gesture. The rail badge counts exactly this.
 * Urgent: Echo's open urgent cards (the negative spike). Trends: only the high-fit ones Echo recommends.
 */
export function listeningNeeds(s: State) {
  return {
    urgent: s.handoffs.filter(h => h.agent === 'echo' && !h.lane && h.urgency === 'urgent'),
    events: openEvents(s),
    mentions: unseenNeeds(s).sort((a, b) => b.at - a.at),
    creators: creatorsOf(s).filter(c => c.fit && !s.listening.creators[c.handle]),
    trends: TRENDS.filter(t => t.fit === 'High' && !s.listening.trends[t.id]),
  }
}
export const listeningNeedsCount = (s: State) => Object.values(listeningNeeds(s)).reduce((n, xs) => n + xs.length, 0)

/** Mentions feed: rows that share their chips are grouped once they are this many in a row. */
const RUN = 3
/** Consecutive equal keys of RUN or more: the first row of a run gets its length, every row of it knows it's inside. */
export function runsOf(keys: string[]) {
  const out = keys.map(() => ({ start: false, inside: false, n: 0 }))
  for (let i = 0; i < keys.length;) {
    let j = i
    while (j + 1 < keys.length && keys[j + 1] === keys[i]) j++
    if (j - i + 1 >= RUN) for (let k = i; k <= j; k++) out[k] = { start: k === i, inside: true, n: j - i + 1 }
    i = j + 1
  }
  return out
}
