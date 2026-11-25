import type { State } from '../../app/state'
import type { Decision, Handoff, LogEntry, Network } from '../../app/types'
import { addRule, now, pushHandoff, pushLog, uid } from '../../app/core'
import { T } from '../../app/time'
import { ANOMALIES, REPORTS, type Anomaly, type Recipe, type Report } from '../../data/insights'
import { applyOp, writeStudio, type StudioOp } from './studio'
import type { Alert } from './alerts'
import { bestTime, change, fmt, formats, kpi, tiktokViews } from './metrics'

export type AnomalyState = { open: boolean; resolution?: string; at?: number }
/** A report shared with Claire; `reply` is what she said once she read it. */
export type Share = { at: number; reply?: string }
/** A paid boost Sam decided. `card`: the Desk card it was decided on, so undoing that decision gives the money back. */
export type Boost = { id: string; post: string; budget: number; days: number; at: number; card?: string }

declare module '../../app/types' {
  interface LogEntry {
    /** The boost this journal line set up: undoing the line cancels it. */
    boost?: string
    /** A report Iris wrote or edited on request: undoing the line puts back `before` (or removes the report). */
    report?: { id: string; before?: Report }
  }
}
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
  /** Reports Iris wrote this session (the seeded ones are in data/insights). */
  reports: Report[]
  /** The day the last morning brief was written for. */
  briefDay: string
  /** Report recipes Sam saved, to ask for again by name. */
  templates: Template[]
}

export type Template = { id: string; name: string; recipe: Recipe }

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
  boosts: [
    { id: 'b-teaser', post: 'Trail Week teaser', budget: 280, days: 4, at: T(10, 0, -7) },
    { id: 'b-bottle', post: 'Summit Bottle: one year later', budget: 300, days: 5, at: T(9, 30, -19) },
  ],
  followUps: [],
  raised: [],
  spikes: [],
  reports: [],
  briefDay: dayKey(T(7, 0)),
  templates: [],
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
  | { type: 'insights/studio'; id: string; recipe: Recipe; via: string }
  | { type: 'insights/studioEdit'; id: string; ops: StudioOp[]; said: string }
  | { type: 'insights/template'; id: string; name: string }
  | { type: 'insights/templateDelete'; id: string }

const patch = (s: State, p: Partial<InsightsState>): State => ({ ...s, insights: { ...s.insights, ...p } })

export const patchInsights = patch

/** Iris writes a report Sam asked for (⌘K, Chat or Insights); Undo removes it. */
export function writeReport(s: State, recipe: Recipe, id: string, via: string): State {
  const r = writeStudio(s, recipe, id, now(s))
  return pushLog(patch(s, { reports: [r, ...s.insights.reports.filter(x => x.id !== id)] }), { agent: 'iris', text: `Wrote “${r.title}”`, status: 'done', reason: via, undoMinutes: 30, link: `/insights/reports/${id}`, report: { id } })
}

/** Seeded reports and the ones Iris wrote this session, newest first. */
export const reportList = (s: State): Report[] => [...s.insights.reports, ...REPORTS].sort((a, b) => b.writtenAt - a.writtenAt)

export const dayKey = (t: number) => new Date(t).toDateString()
/** Share a report with Claire: it waits in her lane on the Desk until she has read it (Claire's engine answers). */
export function shareWithClaire(s: State, r: Report, why: string): State {
  const t = now(s)
  const card: Omit<Handoff, 'at'> = {
    id: `h-share-${r.id}`, agent: 'iris', kind: 'approval', urgency: 'week', topic: 'Weekly report', action: 'iris-report', ref: r.id,
    title: `Claire is reading “${r.kind === 'brief' ? r.title : r.title}”`, context: r.summary, why, confidence: 90, link: `/insights/reports/${r.id}`,
    lane: 'claire', claire: { askedAt: t, dueAt: t + 40_000 },
  }
  return pushHandoff(patchInsights(s, { shared: { ...s.insights.shared, [r.id]: { at: t } } }), card)
}


/** The monthly boost cap is Iris's guardrail, as Sam wrote it: its last euro amount (“€580 of €1,500 used” → 1,500). */
export function boostBudget(s: State) {
  const g = s.agents.find(a => a.id === 'iris')?.guardrails.find(x => x.id === 'g2')
  const amounts = g?.value.match(/€\s?[\d,]+/g)
  const cap = amounts ? +amounts[amounts.length - 1].replace(/[€,\s]/g, '') : undefined
  const month = new Date(now(s)).getMonth()
  const used = s.insights.boosts.filter(b => new Date(b.at).getMonth() === month).reduce((t, b) => t + b.budget, 0)
  return { cap, used, left: cap === undefined ? Infinity : cap - used }
}

/** The guardrail line shows what is really spent. */
function syncBudget(s: State): State {
  const { cap, used } = boostBudget(s)
  if (cap === undefined) return s
  const value = `€${used.toLocaleString('en-GB')} of €${cap.toLocaleString('en-GB')} used`
  return { ...s, agents: s.agents.map(a => (a.id !== 'iris' ? a : { ...a, guardrails: a.guardrails.map(g => (g.id === 'g2' ? { ...g, value } : g)) })) }
}

/**
 * Set up a boost if the monthly cap allows it. Every boost goes through here: Desk, Insights and Chat.
 * Refused: the state is unchanged and `refused` says why, in Sam's words.
 */
export function recordBoost(s: State, b: Omit<Boost, 'id' | 'at'>): { s: State; id?: string; refused?: string } {
  const { cap, used, left } = boostBudget(s)
  if (b.budget > left) return { s, refused: `€${b.budget} would take this month to €${(used + b.budget).toLocaleString('en-GB')}, over the €${cap!.toLocaleString('en-GB')} cap in Iris’s guardrails.` }
  const id = uid('b')
  return { s: syncBudget(patch(s, { boosts: [...s.insights.boosts, { ...b, id, at: now(s) }] })), id }
}

const dropBoosts = (s: State, keep: (b: Boost) => boolean) => syncBudget(patch(s, { boosts: s.insights.boosts.filter(keep) }))

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
export function actOnAnomaly(s: State, id: string, action: string, card?: string): { s: State; resolution: string; refused?: boolean; boost?: string } {
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
  let boostId: string | undefined
  if (boost) {
    const r = recordBoost(next, { post: a.title, budget: +boost[1], days: +boost[2], card })
    if (r.refused) return { s, resolution: `Boost refused: ${r.refused}`, refused: true }
    next = r.s
    boostId = r.id
    resolution = `Boosted €${boost[1]} for ${boost[2]} days`
  }
  next = setAnomaly(next, id, resolution)
  next = { ...next, handoffs: next.handoffs.filter(h => !(h.id === a.handoff || (h.agent === 'iris' && h.ref === id))) }
  return { s: next, resolution, boost: boostId }
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
      const r = reportList(s).find(x => x.id === a.id)
      if (!r) return s
      const next = shareWithClaire({ ...s, handoffs: s.handoffs.filter(h => !(h.agent === 'iris' && h.ref === a.id)) }, r, 'You shared it from Insights.')
      return pushLog(next, { agent: 'iris', text: `Shared “${a.title}” with Claire`, status: 'approved', reason: 'You shared it from Insights' })
    }
    case 'insights/anomaly': {
      const r = actOnAnomaly(s, a.id, a.action)
      if (r.refused) return pushLog(s, { agent: 'iris', text: `${a.title}: ${r.resolution}`, status: 'rejected', reason: 'Iris’s boost cap', link: '/agents/iris?tab=guardrails' })
      return pushLog(r.s, { agent: 'iris', text: `${a.title}: ${a.action}`, status: 'approved', reason: 'Your call from Insights', undoMinutes: r.boost ? 30 : undefined, boost: r.boost })
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
    case 'insights/studio':
      return writeReport(s, a.recipe, a.id, a.via)
    case 'insights/studioEdit': {
      const r = s.insights.reports.find(x => x.id === a.id)
      if (!r || !a.ops.length) return s
      const after = a.ops.reduce((x, o) => applyOp(s, x, o), r)
      const next = patch(s, { reports: s.insights.reports.map(x => (x.id === a.id ? after : x)) })
      return pushLog(next, { agent: 'iris', text: `${r.title}: ${a.said}`, status: 'done', reason: 'You asked from the report', undoMinutes: 30, link: `/insights/reports/${a.id}`, report: { id: a.id, before: r } })
    }
    case 'insights/template': {
      const r = s.insights.reports.find(x => x.id === a.id)
      const name = a.name.trim()
      if (!r?.recipe || !name) return s
      const templates = [...s.insights.templates.filter(t => t.name.toLowerCase() !== name.toLowerCase()), { id: uid('tpl'), name, recipe: r.recipe }]
      return pushLog(patch(s, { templates }), { agent: 'iris', text: `Saved “${name}” as a report template`, status: 'done', reason: 'Ask for it again by name in ⌘K or Chat', link: '/insights' })
    }
    case 'insights/templateDelete':
      return patch(s, { templates: s.insights.templates.filter(t => t.id !== a.id) })
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
    const r = recordBoost(s, { post: 'Storm Jacket carousel', budget, days, card: h.id })
    // Over the cap: the card comes back with the reason, and nothing is spent.
    if (r.refused) return pushHandoff(s, { ...h, why: `Not boosted: ${r.refused} Raise the cap or pick a smaller boost.`, urgency: 'today' })
    return setAnomaly(r.s, 'an-storm', `Boosted €${budget} for ${days} days`)
  }
  if (h.agent === 'iris' && h.topic === 'Brief' && h.ref) {
    const reports = d.kind === 'reject' ? s.insights.reports.filter(r => r.id !== h.ref) : s.insights.reports.map(r => (r.id === h.ref ? { ...r, draft: false } : r))
    return patch(s, { reports })
  }
  const report = h.agent === 'iris' && h.topic === 'Weekly report' ? reportList(s).find(r => r.id === (h.ref ?? (h.id === 'h-report' ? 'w47' : ''))) : undefined
  if (report && (d.kind === 'approve' || d.kind === 'option')) {
    // Claire read it (her engine approved the card): keep what she said. Sam approved a draft: Iris shares it now.
    const reply = [...(h.thread ?? [])].reverse().find(m => m.from === 'claire')?.text
    if (reply || h.lane === 'claire' || h.id.startsWith('h-share-')) return patch(s, { shared: { ...s.insights.shared, [report.id]: { at: s.insights.shared[report.id]?.at ?? now(s), reply } } })
    return shareWithClaire(s, report, d.act ? 'Sharing the weekly report is set to Act.' : 'You approved it on the Desk.')
  }
  const an = h.topic === 'Anomaly' ? anomalyOf(s, h) : undefined
  if (an?.open) {
    if (d.kind === 'option') return actOnAnomaly(s, an.id, d.option, h.id).s
    if (d.kind === 'reject') return setAnomaly(s, an.id, 'Dismissed from the Desk')
  }
  return s
}

/** Undo of a Desk decision or of what Iris did on Act: the anomaly reopens and Atlas's follow-up card goes away. */
export function onUndoInsights(s: State, entry: LogEntry): State {
  if (entry.report) {
    const { id, before } = entry.report
    return patch(s, { reports: before ? s.insights.reports.map(x => (x.id === id ? before : x)) : s.insights.reports.filter(x => x.id !== id) })
  }
  const cards = new Set((entry.restore ?? []).map(h => h.id))
  let next = entry.boost || cards.size ? dropBoosts(s, b => b.id !== entry.boost && !(b.card && cards.has(b.card))) : s
  if (entry.boost) {
    const an = anomalyList(next).find(a => a.resolution?.startsWith('Boosted') && next.insights.anomalies[a.id] && entry.text.startsWith(a.title))
    if (an) { const { [an.id]: _gone, ...anomalies } = next.insights.anomalies; next = patch(next, { anomalies }) }
  }
  for (const h of entry.restore ?? []) {
    const an = h.topic === 'Anomaly' ? anomalyOf(next, h) : undefined
    if (!an) continue
    const { [an.id]: _gone, ...anomalies } = next.insights.anomalies
    next = patch({ ...next, handoffs: next.handoffs.filter(x => x.ref !== `anomaly:${an.id}`) }, { anomalies })
  }
  return next
}
