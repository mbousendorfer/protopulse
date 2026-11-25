// Iris writes her reports from the state: the morning brief every day at 07:00, the weekly report on Mondays.
import type { State } from '../../app/state'
import type { Handoff } from '../../app/types'
import { actionOf, now, pushHandoff, pushLog } from '../../app/core'
import { DAY } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { REPORTS, type Cited, type Report } from '../../data/insights'
import { change, fmt, kpi, tiktokViews } from './metrics'
import { anomalyList, patchInsights } from './slice'

/** Seeded reports and the ones Iris wrote this session, newest first. */
export const reportList = (s: State): Report[] => [...s.insights.reports, ...REPORTS].sort((a, b) => b.writtenAt - a.writtenAt)

export const dayKey = (t: number) => new Date(t).toDateString()
const at7 = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 7, 0).getTime() }
const short = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const c = (n: string, source: string): Cited => ({ n, source })

/** The morning brief, from the journal, the Desk and Iris's own numbers. */
export function writeBrief(s: State, t: number): Report {
  const since = s.brief.since
  const alone = s.log.filter(l => l.at > since && l.at <= t && (l.status === 'done' || l.status === 'redone'))
  const need = s.handoffs.filter(h => !h.lane).length
  const open = anomalyList(s).filter(a => a.open)
  const v = tiktokViews(), reach = kpi('reach')
  const top = open.slice(0, 2)
  return {
    id: `brief-${new Date(t).toISOString().slice(0, 10)}`, kind: 'brief', title: 'Morning brief', period: `Since ${short(since)}, ${new Date(since).toTimeString().slice(0, 5)}`, writtenAt: at7(t),
    summary: `${alone.length ? `Your agents did ${alone.length} things on their own overnight.` : 'A quiet night.'} ${need} card${need === 1 ? '' : 's'} on your Desk, ${open.length} open anomal${open.length === 1 ? 'y' : 'ies'}.`,
    sections: [
      { heading: 'Overnight', paras: [[
        'Your agents did ', c(`${alone.length} things`, `Activity · since ${short(since)}`), ' on their own', alone[0] ? `, the latest: “${alone[0].text}”` : '', '. ', c(`${need} cards`, 'Desk · now'), ' wait for you.',
      ]] },
      { heading: 'What moved', paras: [top.length ? [
        ...top.flatMap((a, i): Cited[] => [i ? ' ' : '', `${a.title}: `, c(a.value, `${NETWORK_LABEL[a.network]} · ${a.metric}`), ` (${a.delta}).`]),
      ] : ['Nothing outside the normal range. Reach over the last 7 days is ', c(fmt.k(reach.value), 'All networks · 7 days'), '.']], chart: open.some(a => a.network === 'tiktok') && v.delta < 0 ? 'tiktok' : undefined },
    ],
  }
}

/** The weekly report, on Mondays: the last 7 days. */
export function writeWeekly(s: State, t: number): Report {
  const end = at7(t) - DAY, start = end - 6 * DAY
  const reach = kpi('reach'), er = kpi('er'), followers = kpi('followers'), replies = kpi('replies'), reply = kpi('reply')
  const down = anomalyList(s).filter(a => a.down && a.detectedAt > t - 7 * DAY)
  const period = `${new Date(start).getDate()} – ${new Date(end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
  return {
    id: `w-${new Date(end).toISOString().slice(0, 10)}`, kind: 'weekly', title: period, period: `${period} ${new Date(end).getFullYear()}`, writtenAt: at7(t) + 60 * 60 * 1000,
    summary: `Reach ${fmt.signed(change(reach))} to ${fmt.k(reach.value)}, engagement ${fmt.pct(er.value)}.${down.length ? ` ${down.length} dip${down.length > 1 ? 's' : ''} to watch.` : ''}`,
    sections: [
      { heading: 'What worked', paras: [['Reach reached ', c(fmt.k(reach.value), 'All networks · unique reach · 7 days'), ', ', c(fmt.signed(change(reach)), `vs. ${fmt.k(reach.prev)} the week before`), '. ', c(`${fmt.int(followers.value)} new followers`, 'All networks · 7 days'), '.']], chart: 'reach' },
      { heading: 'What didn’t', paras: [down.length ? down.flatMap((a, i): Cited[] => [i ? ' ' : '', `${a.title}: `, c(a.value, `${NETWORK_LABEL[a.network]} · ${a.metric}`), '.']) : ['Nothing dropped outside its normal range.']] },
      { heading: 'By pillar', paras: [['Engagement rate by content pillar over 30 days.']], chart: 'pillars' },
      { heading: 'Community', paras: [[c(`${fmt.int(replies.value)} replies`, 'Inbox · 7 days'), ' handled, median reply time ', c(`${reply.value} minutes`, 'Inbox · median first reply · 7 days'), '.']] },
    ],
  }
}

/** Due once a day, after 07:00, when the day's brief isn't written yet. */
export const reportsDue = (s: State, t: number) => s.phase !== 'day1' && dayKey(t) !== s.insights.briefDay && new Date(t).getHours() >= 7

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

/**
 * Write the day's brief (and Monday's weekly report), following each action's level.
 * Brief: Suggest = numbers only, Draft = waits on the Desk, Act = written. Weekly: Draft = waits on the Desk, Act = shared with Claire.
 */
export function tickReports(s: State, t: number): State {
  let next = patchInsights(s, { briefDay: dayKey(t) })
  const lvl = (a: string) => actionOf(s, 'iris', a)?.autonomy
  const brief = writeBrief(s, t)
  if (lvl('iris-brief') === 'suggest') {
    next = pushLog(next, { agent: 'iris', text: 'This morning’s numbers are ready', reason: 'Writing the brief is set to Suggest', status: 'done', link: '/insights/explore' })
  } else if (lvl('iris-brief') === 'draft') {
    next = patchInsights(next, { reports: [{ ...brief, draft: true }, ...next.insights.reports] })
    next = pushHandoff(next, { id: `h-${brief.id}`, agent: 'iris', kind: 'approval', urgency: 'today', topic: 'Brief', action: 'iris-brief', ref: brief.id, title: 'This morning’s brief is ready', context: brief.summary, why: 'Writing the brief is set to Draft.', confidence: 92, link: `/insights/reports/${brief.id}` })
  } else {
    next = patchInsights(next, { reports: [brief, ...next.insights.reports] })
  }
  if (new Date(t).getDay() !== 1) return next
  const weekly = writeWeekly(s, t)
  next = patchInsights(next, { reports: [weekly, ...next.insights.reports] })
  if (lvl('iris-report') === 'act') {
    next = shareWithClaire(next, weekly, 'Sharing the weekly report is set to Act.')
    return pushLog(next, { agent: 'iris', text: `Shared the weekly report (${weekly.title}) with Claire`, reason: 'Sharing the weekly report is set to Act', status: 'done', link: `/insights/reports/${weekly.id}` })
  }
  if (lvl('iris-report') === 'draft') {
    return pushHandoff(next, { id: `h-${weekly.id}`, agent: 'iris', kind: 'approval', urgency: 'today', topic: 'Weekly report', action: 'iris-report', ref: weekly.id, title: 'Weekly report ready to share with Claire', context: weekly.summary, why: 'Sharing reports with Claire is set to Draft.', confidence: 88, link: `/insights/reports/${weekly.id}` })
  }
  return next
}
