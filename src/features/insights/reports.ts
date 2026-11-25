// Iris writes her reports from the state: the morning brief every day at 07:00, the weekly report on Mondays.
import type { State } from '../../app/state'
import { actionOf, pushHandoff, pushLog } from '../../app/core'
import { groupOf } from '../../app/reducer'
import { DAY } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import type { Cited, Report } from '../../data/insights'
import { change, fmt, kpi, tiktokViews } from './metrics'
import { anomalyList, dayKey, patchInsights, reportList, shareWithClaire } from './slice'

export { reportList, dayKey }

const at7 = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 7, 0).getTime() }
const short = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const c = (n: string, source: string): Cited => ({ n, source })

/** The morning brief, from the journal, the Desk and Iris's own numbers. */
export function writeBrief(s: State, t: number): Report {
  const since = s.brief.since
  const alone = s.log.filter(l => l.at > since && l.at <= t && (l.status === 'done' || l.status === 'redone'))
  // Same counts as the Desk's brief (desk/widgets.tsx): handled overnight, and the cards that need Sam.
  const handled = (s.phase === 'day1' ? 0 : 214) + s.log.filter(l => l.at > since && l.status === 'done').length
  const need = s.handoffs.filter(h => !h.lane && groupOf(h) === 'need').length
  const open = anomalyList(s).filter(a => a.open)
  const v = tiktokViews(), reach = kpi('reach')
  const top = open.slice(0, 2)
  return {
    id: `brief-${new Date(t).toISOString().slice(0, 10)}`, kind: 'brief', title: 'Morning brief', period: `Since ${short(since)}, ${new Date(since).toTimeString().slice(0, 5)}`, writtenAt: at7(t),
    summary: `Your agents handled ${handled} things while you were away. ${need} need you, and ${open.length} anomal${open.length === 1 ? 'y is' : 'ies are'} open.`,
    sections: [
      { heading: 'Overnight', paras: [[
        'Your agents handled ', c(`${handled} things`, `Activity · since ${short(since)}`), ' on their own', alone[0] ? `, the latest: “${alone[0].text}”` : '', '. ', c(`${need} cards`, 'Desk · Needs you'), ' wait for you.',
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
