import type { State } from '../../app/state'
import type { Decision, Handoff, LogEntry, Network } from '../../app/types'
import { addRule, now, pushHandoff, pushLog, uid } from '../../app/core'
import { DAY, T } from '../../app/time'
import type { Campaign } from '../../data/strategy'
import { ANOMALIES, REPORTS, type Anomaly, type Recipe, type Report } from '../../data/insights'
import { applyOp, writeStudio, type StudioOp } from './studio'
import { audienceTips } from './audience'
import { benchmarkRead, benchmarkRows } from './benchmark'
import type { Alert } from './alerts'
import { bestTime, change, fmt, formats, kpi, tiktokViews } from './metrics'

export type AnomalyState = { open: boolean; resolution?: string; at?: number }
/** A report shared with Claire; `reply` is what she said once she read it. */
export type Share = { at: number; reply?: string }

declare module '../../app/types' {
  interface LogEntry {
    /** A report Iris wrote or edited on request: undoing the line puts back `before` (or removes the report). */
    report?: { id: string; before?: Report }
    /** A report Iris sent on her own: undoing the line takes it back from Claire. */
    unshare?: string
    /** A schedule set up from this line: undoing it removes the schedule. */
    schedule?: string
    /** The network of an audience brief Iris gave Atlas from this line: undoing it takes the brief back. */
    audience?: string
  }
}
export type FollowUp = { id: string; report: string; q: string; a: string; at: number }

export type InsightsState = {
  shared: Record<string, Share>
  anomalies: Record<string, AnomalyState>
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
  /** Reports Iris writes and sends on a schedule. */
  schedules: Schedule[]
  /** Audience recommendations, by network: spotted, briefed to Atlas, or set aside. */
  tips: Record<string, 'open' | 'briefed' | 'dismissed'>
}

/** A report Iris writes every week (Monday) or month (the 1st) at 08:00, for Sam or for Claire. */
export type Schedule = { id: string; name: string; recipe: Recipe; every: 'week' | 'month'; to: 'claire' | 'sam'; paused?: boolean; lastRun?: string }

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
  followUps: [],
  raised: [],
  spikes: [],
  reports: [],
  briefDay: dayKey(T(7, 0)),
  templates: [],
  schedules: [],
  tips: {},
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
  | { type: 'insights/schedule'; name: string; recipe: Recipe; every: 'week' | 'month'; to: 'claire' | 'sam'; via: string }
  | { type: 'insights/schedulePause'; id: string }
  | { type: 'insights/scheduleDelete'; id: string }
  | { type: 'insights/audienceBrief'; network: Network; via: string }

const patch = (s: State, p: Partial<InsightsState>): State => ({ ...s, insights: { ...s.insights, ...p } })

export const patchInsights = patch

/**
 * The recap report of one of Sage's campaigns (id `campaign-<id>`), on its window and networks: goal vs actual,
 * results, top posts, website results. No journal line: Sage logs the end of the campaign (requests/iris-from-sage-campaign-report).
 */
export function writeCampaignReport(s: State, c: Campaign): State {
  const id = `campaign-${c.id}`
  const days = Math.min(90, Math.max(1, Math.round((c.end - c.start) / DAY) + 1))
  const recipe: Recipe = { days, networks: [...new Set(c.posts.map(p => p.network))], audience: 'claire', sections: ['campaign', 'summary', 'top', 'roi'], campaign: c.id }
  const r: Report = { ...writeStudio(s, recipe, id, Math.min(c.end, now(s))), kind: 'campaign', title: c.name }
  return patch(s, { reports: [r, ...s.insights.reports.filter(x => x.id !== id)] })
}

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
  next = setAnomaly(next, id, resolution)
  next = { ...next, handoffs: next.handoffs.filter(h => !(h.id === a.handoff || (h.agent === 'iris' && h.ref === id))) }
  return { s: next, resolution }
}

/** Answers to follow-up questions on a report, read from the same numbers as Explore, Chat and ⌘K. */
export function answer(q: string, s?: State): string {
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
  if (/compet|peakline|trailkind|norr|basecamp/.test(t) && s) {
    const rows = benchmarkRows(s), us = rows[0], named = rows.find(r => !r.us && t.includes(r.name.toLowerCase().slice(0, 5)))
    const vs = named ?? rows.filter(r => !r.us).sort((a, b) => b.sov - a.sov)[0]
    if (!vs) return 'Echo isn’t tracking any competitor right now. Add one in Listening › Competitors.'
    return `Share of voice: Fernway ${us.sov}%, ${vs.name} ${vs.sov}%. Engagement ${us.er}% against ${vs.er}%, ${us.cadence} posts a week against ${vs.cadence}. ${benchmarkRead(rows)} Details in Listening › Competitors.`
  }
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
      return pushLog(actOnAnomaly(s, a.id, a.action).s, { agent: 'iris', text: `${a.title}: ${a.action}`, status: 'approved', reason: 'Your call from Insights' })
    }
    case 'insights/reopen':
      return patch(s, { anomalies: { ...s.insights.anomalies, [a.id]: { open: true } } })
    case 'insights/ask':
      return patch(s, { followUps: [...s.insights.followUps, { id: `${a.report}-${s.insights.followUps.length}`, report: a.report, q: a.q, a: answer(a.q, s), at: now(s) }] })
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
    case 'insights/schedule': {
      const sc: Schedule = { id: uid('sc'), name: a.name, recipe: a.recipe, every: a.every, to: a.to }
      // Already written today: the first run is the next one.
      const next = patch(s, { schedules: [...s.insights.schedules.filter(x => !(x.name === a.name && x.to === a.to)), sc] })
      return pushLog(next, { agent: 'iris', text: `Scheduled “${a.name}” every ${a.every === 'week' ? 'Monday' : 'month'} for ${a.to === 'claire' ? 'Claire' : 'you'}`, status: 'done', reason: a.via, undoMinutes: 30, link: '/insights', schedule: sc.id })
    }
    case 'insights/schedulePause':
      return patch(s, { schedules: s.insights.schedules.map(x => (x.id === a.id ? { ...x, paused: !x.paused } : x)) })
    case 'insights/audienceBrief': {
      if (s.insights.tips[a.network] === 'briefed') return s
      const next = briefAudience({ ...s, handoffs: s.handoffs.filter(h => h.ref !== `aud:${a.network}`) }, a.network)
      return pushLog(next, { agent: 'iris', text: `Briefed Atlas for the ${a.network === 'x' ? 'X' : a.network[0].toUpperCase() + a.network.slice(1)} audience`, status: 'done', reason: a.via, undoMinutes: 30, link: '/insights/audience', audience: a.network })
    }
    case 'insights/scheduleDelete':
      return patch(s, { schedules: s.insights.schedules.filter(x => x.id !== a.id) })
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

/** Iris turns an audience finding into a brief: a draft post on Atlas's Desk, in the network's best slot. */
export function briefAudience(s: State, network: Network): State {
  const tip = audienceTips().find(t => t.network === network)
  if (!tip) return s
  const b = bestTime(network)
  const next = pushHandoff(s, {
    agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Draft from Iris’s brief', action: 'atlas-fill', chain: ['iris', 'atlas'], ref: `audience:${network}`,
    title: `${tip.brief.split(':')[0]}: first post`, context: `Iris’s brief: “${tip.brief}”`, why: tip.finding + '.', confidence: 72, link: '/publishing/calendar',
    preview: { type: 'post', network, slot: `${b.dayName.slice(0, 3)}, ${b.time}`, media: tip.media, text: [tip.text] },
  })
  return patch(next, { tips: { ...next.insights.tips, [network]: 'briefed' } })
}

/** The anomaly a Desk card is about: its `ref`, or the seeded card it points to. */
const anomalyOf = (s: State, h: Handoff) => (h.agent === 'iris' ? anomalyList(s).find(a => a.id === h.ref || a.handoff === h.id) : undefined)

export function onResolveInsights(s: State, h: Handoff, d: Decision): State {
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
  if (h.agent === 'iris' && h.topic === 'Audience' && h.ref?.startsWith('aud:')) {
    const net = h.ref.slice(4) as Network
    return d.kind === 'option' && d.index === 0 ? briefAudience(s, net) : patch(s, { tips: { ...s.insights.tips, [net]: 'dismissed' } })
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
  const aud = entry.audience ?? entry.restore?.find(h => h.topic === 'Audience' && h.ref?.startsWith('aud:'))?.ref?.slice(4)
  if (aud) return patch({ ...s, handoffs: s.handoffs.filter(h => h.ref !== `audience:${aud}`) }, { tips: { ...s.insights.tips, [aud]: 'open' } })
  if (entry.schedule) return patch(s, { schedules: s.insights.schedules.filter(x => x.id !== entry.schedule) })
  if (entry.unshare) {
    const { [entry.unshare]: _gone, ...shared } = s.insights.shared
    return patch({ ...s, handoffs: s.handoffs.filter(h => h.id !== `h-share-${entry.unshare}`) }, { shared })
  }
  if (entry.report) {
    const { id, before } = entry.report
    return patch(s, { reports: before ? s.insights.reports.map(x => (x.id === id ? before : x)) : s.insights.reports.filter(x => x.id !== id) })
  }
  let next = s
  for (const h of entry.restore ?? []) {
    const an = h.topic === 'Anomaly' ? anomalyOf(next, h) : undefined
    if (!an) continue
    const { [an.id]: _gone, ...anomalies } = next.insights.anomalies
    next = patch({ ...next, handoffs: next.handoffs.filter(x => x.ref !== `anomaly:${an.id}`) }, { anomalies })
  }
  return next
}
