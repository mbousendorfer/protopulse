// Iris owns the performance numbers. Every screen, report, Chat answer and ⌘K answer reads them here, never typed again.
import type { Network } from '../../app/types'
import type { State } from '../../app/state'
import { appNow } from '../../app/time'
import { AUDIENCE, BEST_CELL, DAILY_REACH, FORMATS, HEAT_COLS, HEAT_ROWS, KPIS, NET_SHARE, TIKTOK_VIEWS, type NetFilter, type Period } from '../../data/insights'

export type SocialNet = keyof typeof BEST_CELL
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const isSocial = (n: NetFilter): n is SocialNet => n in BEST_CELL

/** Reach by day (rows) and 2-hour slot (columns), 0–1, for one network or all of them weighted by their share of reach. */
export function heat(n: NetFilter): number[][] {
  if (!isSocial(n)) {
    const nets = Object.keys(BEST_CELL) as SocialNet[]
    const maps = nets.map(x => heat(x))
    const sum = HEAT_ROWS.map((_, r) => HEAT_COLS.map((_, c) => nets.reduce((t, x, i) => t + maps[i][r][c] * NET_SHARE[x].share, 0)))
    const max = Math.max(...sum.flat())
    return sum.map(row => row.map(v => v / max))
  }
  const b = BEST_CELL[n]
  const seed = n.length
  return HEAT_ROWS.map((_, r) => HEAT_COLS.map((_, c) => {
    if (r === b.day && c === b.col) return 1
    const v = 0.78 - Math.abs(r - b.day) * 0.09 - Math.abs(c - b.col) * 0.11 + (((r * 7 + c * 3 + seed) % 5) * 0.03)
    return Math.max(0.08, Math.min(0.9, v))
  }))
}

export type BestTime = { network: NetFilter; day: number; col: number; dayName: string; window: string; time: string; lift: number }

/** The best slot: the heatmap's top cell, with the time Atlas posts inside it. All networks: the biggest network's slot. */
export function bestTime(n: NetFilter): BestTime {
  const m = heat(n)
  let day = 0, col = 0
  m.forEach((row, r) => row.forEach((v, c) => { if (v > m[day][col]) { day = r; col = c } }))
  const own = isSocial(n) ? BEST_CELL[n] : Object.values(BEST_CELL).find(b => b.day === day && b.col === col) ?? BEST_CELL.instagram
  const h = +HEAT_COLS[col]
  return { network: n, day, col, dayName: DAY_NAMES[day], window: `${String(h).padStart(2, '0')}:00 – ${String(h + 2).padStart(2, '0')}:00`, time: own.time, lift: own.lift }
}

/** Reels vs carousels on Instagram, 30 days. */
export function formats() {
  const { carousel, reel } = FORMATS
  return { carousel, reel, reachX: +(reel.reach / carousel.reach).toFixed(1), savesX: +(carousel.saves / reel.saves).toFixed(1) }
}

const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2 }

/** TikTok views per video: the last 4 videos against the 7 before. */
export function tiktokViews() {
  const now = Math.round(median(TIKTOK_VIEWS.slice(-4)) * 1000)
  const before = Math.round(median(TIKTOK_VIEWS.slice(0, -4)) * 1000)
  return { series: TIKTOK_VIEWS, now, before, delta: Math.round((now / before - 1) * 100) }
}

/** The Explore KPIs for a period and a network. */
export function kpis(period: Period, n: NetFilter) {
  return KPIS[period].map(k => {
    if (n === 'all') return k
    const f = NET_SHARE[n as Network]
    if (k.key === 'er') return { ...k, value: f.er, prev: f.er * 0.93 }
    if (['reach', 'followers', 'clicks', 'replies'].includes(k.key)) return { ...k, value: k.value * f.share, prev: k.prev * f.share }
    return k
  })
}
/** A window of `days` days ending `offset` days ago (0 = today), within the 90 days Iris keeps. */
export type Range = { days: number; offset: number }
const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0)
const windowOf = (r: Range) => DAILY_REACH.slice(DAILY_REACH.length - r.offset - r.days, DAILY_REACH.length - r.offset)

/**
 * KPIs for any window: counts follow daily reach in that window, against the same base period's totals; rates and
 * times stay those of the base period (the shortest of 7, 30 or 90 days that covers it).
 */
export function rangeKpis(r: Range, n: NetFilter) {
  const base = ([7, 30, 90] as Period[]).find(p => p >= r.days) ?? 90
  if (r.offset === 0 && r.days === base) return kpis(base, n)
  const total = sum(DAILY_REACH.slice(-base))
  const f = sum(windowOf(r)) / total
  const before = { days: r.days, offset: r.offset + r.days }
  const g = before.offset + before.days <= DAILY_REACH.length ? sum(windowOf(before)) / total : undefined
  return kpis(base, n).map(k => (['reach', 'followers', 'clicks', 'replies'].includes(k.key) ? { ...k, value: k.value * f, prev: g ? k.value * g : k.prev * f } : k))
}
export const reachSeries = (r: Range) => windowOf(r)

export const kpi = (key: string, period: Period = 7, n: NetFilter = 'all') => kpis(period, n).find(k => k.key === key)!
/** Change against the previous period: percent for counts, points for rates, minutes for times. */
export const change = (k: { value: number; prev: number; fmt: string }) => (k.fmt === 'pct' || k.fmt === 'min' ? k.value - k.prev : ((k.value - k.prev) / k.prev) * 100)

/** Numbers as the reports write them. */
export const fmt = {
  k: (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : `${Math.round(v / 1000)}k`),
  int: (v: number) => Math.round(v).toLocaleString('en-GB'),
  pct: (v: number) => `${v.toFixed(1)}%`,
  signed: (v: number, unit = '%') => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v * 10) / 10)}${unit}`,
}

/* ---------- Published posts and clips (Atlas's posts, Juno's clips; the numbers are Iris's) ---------- */

/** Average reach and engagement of a network's measured published posts. */
export function netAverage(s: State, n: string): { reach: number; er: number } | undefined {
  const ps = s.publishing.posts.filter(p => p.network === n && p.status === 'published' && p.stats)
  if (!ps.length) return undefined
  return { reach: ps.reduce((a, p) => a + p.stats!.reach, 0) / ps.length, er: ps.reduce((a, p) => a + p.stats!.er, 0) / ps.length }
}

/**
 * A post's numbers once it is out: its measured stats, else Iris's first-day read, the network's average tilted by
 * `score` (0–100, 50 = average; Juno's clip score when it's a clip).
 * ponytail: a first-day estimate stands in for measurement until posts carry a daily series (“Data that lives”).
 */
export function postPerf(s: State, id: string, score = 50): { reach: number; er: number } | undefined {
  const p = s.publishing.posts.find(x => x.id === id)
  if (!p || p.at > appNow(s.clock) || p.status === 'failed' || p.status === 'draft') return undefined
  if (p.stats) return p.stats
  const avg = netAverage(s, p.network) ?? { reach: 8000, er: 4 }
  return { reach: Math.round(avg.reach * (0.5 + (score - 50) / 30) / 100) * 100, er: Math.round(avg.er * (0.7 + (score - 50) / 60) * 10) / 10 }
}

/** A clip's numbers across its posts that are out. `score`: Juno's rescored total (0–100); 50 when not given. */
export function clipPerf(s: State, clipId: string, score?: number): { views: number; er: number; retention: number; shares: number } | undefined {
  const c = s.video.clips.find(x => x.id === clipId)
  const sc = score ?? 50
  const perf = (c?.posts ?? []).map(id => postPerf(s, id, sc)).filter((x): x is { reach: number; er: number } => !!x)
  if (!perf.length) return undefined
  const views = perf.reduce((a, x) => a + x.reach, 0)
  const er = Math.round(perf.reduce((a, x) => a + x.er, 0) / perf.length * 10) / 10
  return { views, er, retention: Math.round(Math.min(70, 30 + sc / 3)), shares: Math.round(views * er / 400) }
}

/**
 * The best time to post on a network on one weekday (0 = Monday), from the same heatmap as Explore.
 * `reason` quotes the reach against the network's median slot. For Atlas's slot moves (requests/iris-from-atlas-best-slots).
 */
export function bestSlotOf(_s: State, network: Network, weekday: number): { time: string; reason: string } | undefined {
  if (!isSocial(network) || weekday < 0 || weekday > 6) return
  const row = heat(network)[weekday]
  const col = row.indexOf(Math.max(...row))
  const b = BEST_CELL[network]
  const time = col === b.col ? b.time : `${HEAT_COLS[col]}:00`
  const lift = Math.round(b.lift * row[col] * 10) / 10
  return { time, reason: `${time} gets ${lift}× the median reach on ${DAY_NAMES[weekday]}s` }
}

/** Link clicks per reach, by network: Explore's 7-day clicks over reach (they are shares of the same totals). */
const clickRate = () => KPIS[7].find(k => k.key === 'clicks')!.value / KPIS[7].find(k => k.key === 'reach')!.value

/** Clicks on a published post's tracked link (undefined without a link or before it's out). For Atlas (requests/iris-from-atlas-link-clicks). */
export function clicksOf(s: State, postId: string): number | undefined {
  const p = s.publishing.posts.find(x => x.id === postId)
  const perf = p?.link ? postPerf(s, postId) : undefined
  return perf && p ? Math.round(perf.reach * clickRate() * (perf.er / (NET_SHARE[p.network]?.er || perf.er))) : undefined
}

/** Clicks on every tracked link of a UTM campaign (utm_campaign). */
export const campaignClicks = (s: State, utmCampaign: string) =>
  s.publishing.posts.filter(p => p.link?.utm?.utm_campaign === utmCampaign).reduce((t, p) => t + (clicksOf(s, p.id) ?? 0), 0)

/** Fernway's own line next to competitors, from Iris's numbers: followers (Audience), weekly growth and engagement (Explore). */
export function fernwayRow() {
  const followers = Object.values(AUDIENCE).reduce((t, a) => t + a.followers, 0)
  const added = kpi('followers').value
  return { name: 'Fernway', followers, growth: Math.round(added / (followers - added) * 1000) / 10, er: kpi('er').value }
}
