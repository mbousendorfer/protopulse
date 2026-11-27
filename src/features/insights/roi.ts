// Social Media ROI: what link clicks become on the website (GA4, mocked), per network, campaign and post.
import type { State } from '../../app/state'
import type { Network } from '../../app/types'
import { DAY } from '../../app/time'
import { GA4, GA4_CAMPAIGNS, NETWORKS_SOCIAL, POSTS } from '../../data/insights'
import { rangeKpis } from './metrics'

export type RoiRow = { network: Network; clicks: number; sessions: number; conversions: number; revenue: number }
type Ga4Net = keyof typeof GA4

const funnel = (network: Network, clicks: number): RoiRow => {
  const g = GA4[network as Ga4Net]
  const sessions = Math.round(clicks * g.land)
  const conversions = Math.round(sessions * g.cr)
  return { network, clicks: Math.round(clicks), sessions, conversions, revenue: Math.round(conversions * g.aov / 10) * 10 }
}

/** Per network over the last `days` days (or the `days` before, with `prev`): link clicks (Explore's) → sessions → conversions → revenue. Highest revenue first. */
export function roiByNetwork(days: number, nets: Network[] = NETWORKS_SOCIAL, prev = false): RoiRow[] {
  return nets.filter(n => n in GA4).map(n => { const k = rangeKpis({ days, offset: 0 }, n).find(k => k.key === 'clicks')!; return funnel(n, prev ? k.prev : k.value) }).sort((a, b) => b.revenue - a.revenue)
}

export function roiTotals(rows: RoiRow[]) {
  const t = rows.reduce((a, r) => ({ clicks: a.clicks + r.clicks, sessions: a.sessions + r.sessions, conversions: a.conversions + r.conversions, revenue: a.revenue + r.revenue }), { clicks: 0, sessions: 0, conversions: 0, revenue: 0 })
  return { ...t, perClick: t.clicks ? t.revenue / t.clicks : 0 }
}

/** Sage's campaigns with their GA4 results. */
export function roiCampaigns(s: State) {
  return s.strategy.campaigns.filter(c => GA4_CAMPAIGNS[c.id]).map(c => ({ id: c.id, name: c.name, ...GA4_CAMPAIGNS[c.id] })).sort((a, b) => b.revenue - a.revenue)
}

/** Posts by the revenue their link clicks brought, over the last `days` days. */
export function postsByRevenue(days: number, nets: Network[] = NETWORKS_SOCIAL) {
  const since = Math.max(...POSTS.map(p => p.date)) - days * DAY
  return POSTS.filter(p => nets.includes(p.network) && p.date >= since && p.network in GA4).map(p => ({ p, ...funnel(p.network, p.clicks) })).sort((a, b) => b.revenue - a.revenue)
}
