import type { State } from '../../app/state'
import type { Decision, Handoff } from '../../app/types'
import { now, pushHandoff, pushLog, pushToast, uid } from '../../app/core'
import type { Alert } from './alerts'

export type AnomalyState = { open: boolean; resolution?: string; at?: number }
export type Share = { at: number }
export type Boost = { post: string; budget: number; days: number; at: number }
export type FollowUp = { id: string; report: string; q: string; a: string; at: number }

export type InsightsState = {
  shared: Record<string, Share>
  anomalies: Record<string, AnomalyState>
  boosts: Boost[]
  followUps: FollowUp[]
  /** Iris's alert rules. */
  alerts: Alert[]
}

const ALERTS: Alert[] = [
  { id: 'ia1', subject: 'views', condition: 'drops by more than', threshold: 30, unit: '% over 3 posts', to: 'desk', on: true },
  { id: 'ia2', subject: 'er', condition: 'rises above', threshold: 3, unit: '× the account average', to: 'desk', on: true },
  { id: 'ia3', subject: 'followers', condition: 'rises above', threshold: 4, unit: '× usual daily growth', to: 'desk', on: true },
  { id: 'ia4', subject: 'reply', condition: 'rises above', threshold: 30, unit: ' min median', to: 'claire', on: false },
]

export const initialInsights = (): InsightsState => ({
  alerts: structuredClone(ALERTS),
  shared: { w46: { at: Date.UTC(2026, 10, 17, 9, 12) }, w45: { at: Date.UTC(2026, 10, 10, 9, 3) } },
  anomalies: {},
  boosts: [],
  followUps: [],
})

export type InsightsAction =
  | { type: 'insights/share'; id: string; title: string }
  | { type: 'insights/anomaly'; id: string; title: string; action: string }
  | { type: 'insights/reopen'; id: string }
  | { type: 'insights/ask'; report: string; q: string }
  | { type: 'insights/export'; title: string }
  | { type: 'insights/anomalies'; ids: string[]; op: 'handle' | 'snooze' | 'reopen' }
  | { type: 'insights/alertSave'; alert: Alert }
  | { type: 'insights/alertToggle'; id: string }
  | { type: 'insights/alertDelete'; id: string }

const patch = (s: State, p: Partial<InsightsState>): State => ({ ...s, insights: { ...s.insights, ...p } })

function setAnomaly(s: State, id: string, resolution: string): State {
  return patch(s, { anomalies: { ...s.insights.anomalies, [id]: { open: false, resolution, at: now(s) } } })
}

/** Scripted answers to follow-up questions on a report. */
export function answer(q: string): string {
  const t = q.toLowerCase()
  if (/tiktok/.test(t)) return 'TikTok views per video fell from a median of 9,000 to 1,840 since Thursday 20 Nov (4 videos). Watch time dropped from 9.1 s to 3.4 s: viewers leave before the product shows up. Atlas can test 3-second hooks on the next 3 videos.'
  if (/best time|when .*post|slot/.test(t)) return 'Over the last 30 days, Friday 18:00 is your best slot on Instagram (2.1× the median reach), weekday 08:30 on LinkedIn, and 18:30 on TikTok. See the heatmap in Explore.'
  if (/reel|carousel|format/.test(t)) return 'Carousels get 2× the saves of reels (3.4% vs 1.7%), reels get 1.6× the reach. For cold-weather products, carousels convert better: the Storm Jacket carousel drove 920 link clicks.'
  if (/linkedin/.test(t)) return 'LinkedIn engagement is 3.9% over 7 days, the highest of your networks. Repair content does 1.9× better than product posts there.'
  if (/compet|peakline|trailkind|norr/.test(t)) return 'Your share of voice is 31% vs Peakline 27%. Peakline’s price cut drove 3× their usual comments, mostly about price, not quality. Details in Listening › Competitors.'
  if (/reach|grow/.test(t)) return 'Reach was 412k over the last 7 days, +8% vs the week before (381k). Instagram brings 46% of it, TikTok 24%.'
  return 'I can answer questions about reach, engagement, networks, formats, best times and competitors, using the last 90 days of data. Try “Why did TikTok drop?” or “Reels or carousels?”.'
}

export function reduceInsights(s: State, a: InsightsAction): State {
  switch (a.type) {
    case 'insights/share': {
      const next = patch(s, { shared: { ...s.insights.shared, [a.id]: { at: now(s) } } })
      return pushToast(pushLog(next, { agent: 'iris', text: `Shared “${a.title}” with Claire`, status: 'approved', reason: 'You shared it from Insights' }), { agent: 'iris', text: `Shared with Claire: ${a.title}` })
    }
    case 'insights/anomaly': {
      let next = setAnomaly(s, a.id, a.action)
      next = { ...next, handoffs: next.handoffs.filter(h => !(h.id === 'h-tiktok' && a.id === 'an-tiktok') && !(h.id === 'h-boost' && a.id === 'an-storm')) }
      if (/atlas/i.test(a.action)) next = followUpPost(next, a.title)
      // A boost decided here is recorded like one decided on the Desk.
      const boost = /€(\d+) for (\d+) days/.exec(a.action)
      if (boost) next = patch(next, { boosts: [...next.insights.boosts, { post: a.title, budget: +boost[1], days: +boost[2], at: now(s) }] })
      return pushLog(next, { agent: 'iris', text: `${a.title}: ${a.action}`, status: 'approved', reason: 'Your call from Insights' })
    }
    case 'insights/reopen':
      return patch(s, { anomalies: { ...s.insights.anomalies, [a.id]: { open: true } } })
    case 'insights/ask':
      return patch(s, { followUps: [...s.insights.followUps, { id: `${a.report}-${s.insights.followUps.length}`, report: a.report, q: a.q, a: answer(a.q), at: now(s) }] })
    case 'insights/export':
      return pushLog(s, { agent: 'iris', text: `Exported “${a.title}”`, status: 'done', reason: 'Downloaded from Insights' })
    case 'insights/anomalies': {
      const t = now(s)
      const anomalies = { ...s.insights.anomalies }
      for (const id of a.ids) anomalies[id] = a.op === 'reopen' ? { open: true } : { open: false, resolution: a.op === 'handle' ? 'Marked handled by you' : 'Snoozed for a week. Iris checks again on Tue 2 Dec.', at: t }
      const n = a.ids.length
      const verb = a.op === 'handle' ? 'marked handled' : a.op === 'snooze' ? 'snoozed for a week' : 'reopened'
      return pushLog(patch(s, { anomalies }), { agent: 'iris', text: `${n} anomal${n > 1 ? 'ies' : 'y'} ${verb}`, status: 'approved', reason: 'Your call from Insights' })
    }
    case 'insights/alertSave': {
      const exists = s.insights.alerts.some(x => x.id === a.alert.id)
      const alerts = exists ? s.insights.alerts.map(x => (x.id === a.alert.id ? a.alert : x)) : [...s.insights.alerts, { ...a.alert, id: uid('ia') }]
      return pushToast(patch(s, { alerts }), { agent: 'iris', text: exists ? 'Alert updated' : 'Iris will raise this alert on your Desk' })
    }
    case 'insights/alertToggle':
      return patch(s, { alerts: s.insights.alerts.map(x => (x.id === a.id ? { ...x, on: !x.on } : x)) })
    case 'insights/alertDelete':
      return patch(s, { alerts: s.insights.alerts.filter(x => x.id !== a.id) })
  }
}

/** Iris asks Atlas for a follow-up post: a Desk card with a draft. */
function followUpPost(s: State, about: string): State {
  const tiktok = /tiktok/i.test(about)
  return pushHandoff(s, {
    agent: 'atlas', kind: 'approval', urgency: 'today', topic: tiktok ? 'Hook test' : 'Follow-up post', action: 'atlas-fill', chain: ['iris', 'atlas'],
    title: tiktok ? 'Hook test 1 of 3: product in the first 2 seconds' : `Follow-up post: ${about}`,
    context: tiktok ? 'Same Ridge 28L footage, recut so the bag appears at 0:01. Two more variants follow if this one beats 4,000 views.' : 'Atlas wrote a follow-up for the people who found you this week.',
    why: 'Iris asked for it from an anomaly you acted on.', confidence: 74, link: '/publishing',
    preview: tiktok
      ? { type: 'post', network: 'tiktok', slot: 'Today, 18:30', media: 'pack', text: ['3 days. 28 litres. Watch it all go in. #packingmybag'] }
      : { type: 'post', network: 'linkedin', slot: 'Thu 27, 08:30', text: ['1,200 bags repaired this year. Here’s what our workshop learned about what breaks first, and how we design around it.'] },
  }, '')
}

export function onResolveInsights(s: State, h: Handoff, d: Decision): State {
  if (h.id === 'h-tiktok') {
    if (d.kind === 'option' && d.index === 0) return followUpPost(setAnomaly(s, 'an-tiktok', 'Atlas testing 3-second hooks this week'), 'TikTok views')
    if (d.kind === 'option') return setAnomaly(s, 'an-tiktok', 'Snoozed for a week. Iris checks again on Tue 2 Dec.')
    if (d.kind === 'reject') return setAnomaly(s, 'an-tiktok', 'Dismissed from the Desk')
  }
  if (h.id === 'h-boost' && d.kind === 'option') {
    if (d.index === 2) return setAnomaly(s, 'an-storm', 'No boost. Organic only.')
    const budget = d.index === 0 ? 150 : 300, days = d.index === 0 ? 5 : 7
    return setAnomaly(patch(s, { boosts: [...s.insights.boosts, { post: 'Storm Jacket carousel', budget, days, at: now(s) }] }), 'an-storm', `Boosted €${budget} for ${days} days`)
  }
  if ((h.id === 'h-report' || h.topic === 'Weekly report') && (d.kind === 'approve' || d.kind === 'option')) {
    return patch(s, { shared: { ...s.insights.shared, w47: { at: now(s) } } })
  }
  if (h.topic === 'Anomaly' && /LinkedIn followers/.test(h.title) && d.kind === 'option' && d.index === 0) {
    return followUpPost(s, 'LinkedIn followers')
  }
  return s
}
