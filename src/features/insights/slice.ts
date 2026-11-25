import type { State } from '../../app/state'
import type { Decision, Handoff, LogEntry, Network } from '../../app/types'
import { addRule, now, pushHandoff, pushLog, uid } from '../../app/core'
import { ANOMALIES, type Anomaly } from '../../data/insights'
import type { Alert } from './alerts'
import { bestTime, change, fmt, formats, kpi, tiktokViews } from './metrics'

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
  /** Anomalies Iris raised during the session, newest first (the seeded ones are in data/insights). */
  raised: Anomaly[]
  /** Signals a scripted event switched on (see SPIKES). */
  spikes: string[]
}

const ALERTS: Alert[] = [
  { id: 'ia1', subject: 'views', condition: 'drops by more than', threshold: 30, unit: '% over 3 posts', to: 'desk', on: true },
  { id: 'ia2', subject: 'er', condition: 'rises above', threshold: 3, unit: '× the account average', to: 'desk', on: true },
  { id: 'ia3', subject: 'followers', condition: 'rises above', threshold: 4, unit: '× usual daily growth', to: 'desk', on: true },
  { id: 'ia4', subject: 'reply', condition: 'rises above', threshold: 30, unit: ' min median', to: 'claire', on: false },
]

export const initialInsights = (): InsightsState => ({
  alerts: structuredClone(ALERTS),
  shared: { w46: { at: Date.UTC(2025, 10, 17, 9, 12) }, w45: { at: Date.UTC(2025, 10, 10, 9, 3) } },
  anomalies: {},
  boosts: [],
  followUps: [],
  raised: [],
  spikes: [],
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

export const patchInsights = patch

function setAnomaly(s: State, id: string, resolution: string): State {
  return patch(s, { anomalies: { ...s.insights.anomalies, [id]: { open: false, resolution, at: now(s) } } })
}

/** Every anomaly, raised this session or seeded, with what Sam or Iris did about it. */
export const anomalyList = (s: State): Anomaly[] =>
  [...s.insights.raised, ...ANOMALIES].map(a => ({ ...a, ...(s.insights.anomalies[a.id] ?? {}) }))

const SNOOZED = 'Snoozed for a week. Iris checks again in 7 days.'

/**
 * Do one of an anomaly's actions, from the Anomalies tab, its Desk card or Act. Closes it, and its Desk card if any.
 * Returns the resolution line too, for the journal.
 */
export function actOnAnomaly(s: State, id: string, action: string): { s: State; resolution: string } {
  const a = anomalyList(s).find(x => x.id === id)
  if (!a) return { s, resolution: action }
  let next = s
  let resolution = action
  if (/atlas/i.test(action)) {
    next = followUpPost(next, a)
    resolution = a.network === 'tiktok' && /hook/i.test(action) ? 'Atlas testing 3-second hooks this week' : 'Atlas drafted a follow-up post. It’s on your Desk.'
  } else if (/sage/i.test(action)) {
    const fact = action.replace(/^Tell Sage:\s*/i, '')
    next = addRule(next, { kind: 'fact', text: `${fact[0].toUpperCase()}${fact.slice(1)} (${a.title})`, agents: ['sage'], origin: 'From an anomaly Iris raised' })
    resolution = 'Sage knows. It’s a Playbook fact for her plans.'
  } else if (/snooze/i.test(action)) resolution = SNOOZED
  const boost = /€(\d+) for (\d+) days/.exec(action)
  if (boost) {
    next = patch(next, { boosts: [...next.insights.boosts, { post: a.title, budget: +boost[1], days: +boost[2], at: now(s) }] })
    resolution = `Boosted €${boost[1]} for ${boost[2]} days`
  }
  next = setAnomaly(next, id, resolution)
  next = { ...next, handoffs: next.handoffs.filter(h => !(h.id === a.handoff || (h.agent === 'iris' && h.ref === id))) }
  return { s: next, resolution }
}

/** Answers to follow-up questions on a report, read from the same numbers as Explore, Chat and ⌘K. */
export function answer(q: string): string {
  const t = q.toLowerCase()
  if (/tiktok/.test(t)) {
    const v = tiktokViews()
    return `TikTok views per video fell from a median of ${fmt.int(v.before)} to ${fmt.int(v.now)} since Thursday 20 Nov (4 videos), ${fmt.signed(v.delta)}. Watch time dropped from 9.1 s to 3.4 s: viewers leave before the product shows up. Atlas can test 3-second hooks on the next 3 videos.`
  }
  if (/best time|when .*post|slot/.test(t)) {
    const [ig, li, tt] = (['instagram', 'linkedin', 'tiktok'] as const).map(bestTime)
    return `Over the last 30 days, ${ig.dayName} ${ig.window} is your best window on Instagram (${ig.lift}× the median reach), and Atlas posts at ${ig.time} inside it. ${li.dayName} ${li.time} on LinkedIn, ${tt.dayName} ${tt.time} on TikTok. See the heatmap in Explore.`
  }
  if (/reel|carousel|format/.test(t)) {
    const f = formats()
    return `Carousels get ${f.savesX}× the saves of reels (${fmt.pct(f.carousel.saves)} vs ${fmt.pct(f.reel.saves)}), reels get ${f.reachX}× the reach. For cold-weather products, carousels convert better: the Storm Jacket carousel drove 920 link clicks.`
  }
  if (/linkedin/.test(t)) return `LinkedIn engagement is ${fmt.pct(kpi('er', 7, 'linkedin').value)} over 7 days, the highest of your networks. Repair content does 1.9× better than product posts there.`
  if (/compet|peakline|trailkind|norr/.test(t)) return 'Your share of voice is 31% vs Peakline 27%. Peakline’s price cut drove 3× their usual comments, mostly about price, not quality. Details in Listening › Competitors.'
  if (/reach|grow/.test(t)) {
    const r = kpi('reach'), ig = kpi('reach', 7, 'instagram'), tt = kpi('reach', 7, 'tiktok')
    return `Reach was ${fmt.k(r.value)} over the last 7 days, ${fmt.signed(change(r))} vs the week before (${fmt.k(r.prev)}). Instagram brings ${Math.round((ig.value / r.value) * 100)}% of it, TikTok ${Math.round((tt.value / r.value) * 100)}%.`
  }
  return 'I can answer questions about reach, engagement, networks, formats, best times and competitors, using the last 90 days of data. Try “Why did TikTok drop?” or “Reels or carousels?”.'
}

export function reduceInsights(s: State, a: InsightsAction): State {
  switch (a.type) {
    case 'insights/share': {
      const next = patch(s, { shared: { ...s.insights.shared, [a.id]: { at: now(s) } } })
      return pushLog(next, { agent: 'iris', text: `Shared “${a.title}” with Claire`, status: 'approved', reason: 'You shared it from Insights' })
    }
    case 'insights/anomaly': {
      const r = actOnAnomaly(s, a.id, a.action)
      return pushLog(r.s, { agent: 'iris', text: `${a.title}: ${a.action}`, status: 'approved', reason: 'Your call from Insights' })
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
      for (const id of a.ids) anomalies[id] = a.op === 'reopen' ? { open: true } : { open: false, resolution: a.op === 'handle' ? 'Marked handled by you' : SNOOZED, at: t }
      const n = a.ids.length
      const verb = a.op === 'handle' ? 'marked handled' : a.op === 'snooze' ? 'snoozed for a week' : 'reopened'
      return pushLog(patch(s, { anomalies }), { agent: 'iris', text: `${n} anomal${n > 1 ? 'ies' : 'y'} ${verb}`, status: 'approved', reason: 'Your call from Insights' })
    }
    case 'insights/alertSave': {
      const exists = s.insights.alerts.some(x => x.id === a.alert.id)
      const alerts = exists ? s.insights.alerts.map(x => (x.id === a.alert.id ? a.alert : x)) : [...s.insights.alerts, { ...a.alert, id: uid('ia') }]
      return patch(s, { alerts })
    }
    case 'insights/alertToggle':
      return patch(s, { alerts: s.insights.alerts.map(x => (x.id === a.id ? { ...x, on: !x.on } : x)) })
    case 'insights/alertDelete':
      return patch(s, { alerts: s.insights.alerts.filter(x => x.id !== a.id) })
  }
}

/** What Atlas writes when Iris asks for a follow-up, by network. */
const FOLLOW_UP: Partial<Record<Network, { text: string; media?: string }>> = {
  instagram: { text: 'Carousel: 6 more things the Storm Jacket survived this autumn. Save it for your next wet weekend.', media: 'rain' },
  linkedin: { text: '1,200 bags repaired this year. Here’s what our workshop learned about what breaks first, and how we design around it.' },
  x: { text: 'Trail Week, day 2: 38 km, 2,100 m up, one Ridge 28L. Who’s in tomorrow?' },
  facebook: { text: 'Your Trail Week photos so far. Tag us to be in the next round.', media: 'trail' },
  youtube: { text: 'Short: the Storm Jacket under a waterfall, 60 seconds, no edits.', media: 'rain' },
}

/** Iris asks Atlas for a follow-up post: a Desk card with a draft, in the network's best slot. */
function followUpPost(s: State, a: Anomaly): State {
  const hook = a.network === 'tiktok'
  const b = bestTime(a.network)
  const f = FOLLOW_UP[a.network] ?? FOLLOW_UP.instagram!
  return pushHandoff(s, {
    agent: 'atlas', kind: 'approval', urgency: 'today', topic: hook ? 'Hook test' : 'Follow-up post', action: 'atlas-fill', chain: ['iris', 'atlas'], ref: `anomaly:${a.id}`,
    title: hook ? 'Hook test 1 of 3: product in the first 2 seconds' : `Follow-up post: ${a.title}`,
    context: hook ? 'Same Ridge 28L footage, recut so the bag appears at 0:01. Two more variants follow if this one beats 4,000 views.' : 'Atlas wrote a follow-up for the people who found you this week.',
    why: 'Iris asked for it from an anomaly.', confidence: 74, link: '/publishing/calendar',
    preview: hook
      ? { type: 'post', network: 'tiktok', slot: `${b.dayName.slice(0, 3)}, ${b.time}`, media: 'pack', text: ['3 days. 28 litres. Watch it all go in. #packingmybag'] }
      : { type: 'post', network: a.network, slot: `${b.dayName.slice(0, 3)}, ${b.time}`, media: f.media, text: [f.text] },
  })
}

/** The anomaly a Desk card is about: its `ref`, or the seeded card it points to. */
const anomalyOf = (s: State, h: Handoff) => (h.agent === 'iris' ? anomalyList(s).find(a => a.id === h.ref || a.handoff === h.id) : undefined)

export function onResolveInsights(s: State, h: Handoff, d: Decision): State {
  if (h.id === 'h-boost' && d.kind === 'option') {
    if (d.index === 2) return setAnomaly(s, 'an-storm', 'No boost. Organic only.')
    const budget = d.index === 0 ? 150 : 300, days = d.index === 0 ? 5 : 7
    return setAnomaly(patch(s, { boosts: [...s.insights.boosts, { post: 'Storm Jacket carousel', budget, days, at: now(s) }] }), 'an-storm', `Boosted €${budget} for ${days} days`)
  }
  if ((h.id === 'h-report' || h.topic === 'Weekly report') && (d.kind === 'approve' || d.kind === 'option')) {
    return patch(s, { shared: { ...s.insights.shared, w47: { at: now(s) } } })
  }
  const an = h.topic === 'Anomaly' ? anomalyOf(s, h) : undefined
  if (an?.open) {
    if (d.kind === 'option') return actOnAnomaly(s, an.id, d.option).s
    if (d.kind === 'reject') return setAnomaly(s, an.id, 'Dismissed from the Desk')
  }
  return s
}

/** Undo of a Desk decision or of what Iris did on Act: the anomaly reopens and Atlas's follow-up card goes away. */
export function onUndoInsights(s: State, entry: LogEntry): State {
  let next = s
  for (const h of entry.restore ?? []) {
    const an = h.topic === 'Anomaly' ? anomalyOf(next, h) : undefined
    if (!an) continue
    const { [an.id]: _gone, ...anomalies } = next.insights.anomalies
    next = patch({ ...next, handoffs: next.handoffs.filter(x => x.ref !== `anomaly:${an.id}`) }, { anomalies })
  }
  return next
}
