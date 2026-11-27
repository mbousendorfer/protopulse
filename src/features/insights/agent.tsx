// Iris · Insights: everything Iris plugs into the core (see src/app/agents-registry.ts).
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { useStore } from '../../app/store'
import { net } from '../../data/command'
import { NETWORK_LABEL } from '../../data/agents'
import { Heatmap, HBars, LineChart } from '../../ui/charts'
import { AGE_BANDS, ALERT_CONDITIONS, ALERT_SUBJECTS, ALERT_UNITS, BEST_CELL, DAILY_REACH, HEAT_COLS, HEAT_ROWS, dayLabels } from '../../data/insights'
import { bestTime, change, fmt, formats, heat, kpi, tiktokViews, type SocialNet } from './metrics'
import { AlertsTable } from './alerts'
import { onResolveInsights, onUndoInsights, reduceInsights, writeReport } from './slice'
import { DEFAULT_SECTIONS, enrich, parseEdits, parseRecipe, writeStudio } from './studio'
import { actionOf, now, uid } from '../../app/core'
import type { State } from '../../app/state'
import type { Network } from '../../app/types'
import type { Recipe } from '../../data/insights'
import { anomaliesDue, tickAnomalies } from './engine'
import { reportsDue, schedulesDue, tickReports, tickSchedules } from './reports'
import { roiByNetwork, roiTotals } from './roi'
import { audienceOf, audienceTips } from './audience'

const int = (v: number) => Math.round(v).toLocaleString('en-GB')
import { SCRIPT } from './script'
import { insightsNeeds } from './needs'

declare module '../../data/command' {
  interface IntentTypes {
    tiktok: object
    besttime: { network: SocialNet }
    compare: object
    performance: object
    report: { days: number; networks: Network[]; audience: 'claire' | 'sam'; raw: string }
    reportEdit: { raw: string }
    schedule: { every: 'week' | 'month'; to: 'claire' | 'sam'; raw: string }
    roi: object
    audience: { network: Network | 'all' }
  }
}

const SHORT_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** A saved template named in the sentence wins; else the window, networks and reader Sam asked for. */
function recipeFor(s: State, i: { days: number; networks: Network[]; audience: 'claire' | 'sam'; raw: string }): { recipe: Recipe; template?: string } {
  const t = s.insights.templates.find(x => i.raw.includes(x.name.toLowerCase()))
  return t ? { recipe: t.recipe, template: t.name } : { recipe: enrich(s, i.raw, { days: i.days, networks: i.networks, audience: i.audience, sections: DEFAULT_SECTIONS }) }
}

const report = defineIntent({
  kind: 'report', owner: 'iris', order: 36,
  parse: t => { const r = parseRecipe(t); return r ? { kind: 'report', ...r, raw: t } : undefined },
  bar: (i, { s, d, go }) => {
    const { recipe, template } = recipeFor(s, i)
    const id = uid('r')
    const r = writeStudio(s, recipe, id, now(s))
    return {
      text: `Written: “${r.title}”, ${r.period}${template ? `, from your template “${template}”` : ''}. ${r.sections.length} sections, every number sourced. Open it to move, shorten or drop sections, or tell me what to change.`,
      sources: ['Insights › Explore', 'Insights › Anomalies'],
      after: () => d({ type: 'insights/studio', id, recipe, via: 'You asked in the command bar' }),
      ctas: [{ label: 'Open the report', primary: true, run: () => go(`/insights/reports/${id}`) }],
    }
  },
  chat: (i, { s }) => {
    const { recipe, template } = recipeFor(s, i)
    const id = uid('r')
    const r = writeStudio(s, recipe, id, now(s))
    return {
      replies: [{ from: 'iris', text: `Here it is${template ? `, from your template “${template}”` : ''}: ${r.sections.length} sections on ${r.period}. Tell me what to change, like “shorter” or “add the best times”.`, card: { type: 'list', items: [{ title: r.title, agent: 'iris', meta: r.period, link: `/insights/reports/${id}` }] } }],
      effects: [st => writeReport(st, recipe, id, 'You asked in a chat')],
    }
  },
})

const LEVEL_SAYS: Record<string, string> = {
  act: 'Sharing is on Act, so I’ll send it to Claire myself and tell you in the journal.',
  draft: 'Sharing is on Draft, so each one waits for you on the Desk first.',
  suggest: 'Sharing is on Suggest, so I’ll write it and you send it.',
}

/** What to schedule: a template named in the sentence, else the last report Sam asked for, else the weekly report. */
function scheduleTarget(s: State, raw: string): { name: string; recipe: Recipe } {
  const t = s.insights.templates.find(x => raw.includes(x.name.toLowerCase()))
  if (t) return t
  const r = s.insights.reports.find(x => x.recipe)
  return r ? { name: r.title, recipe: r.recipe! } : { name: 'Weekly report', recipe: { days: 7, networks: [], audience: 'claire', sections: DEFAULT_SECTIONS } }
}

/** “Send it to Claire every Monday”. */
const schedule = defineIntent({
  kind: 'schedule', owner: 'iris', order: 34,
  parse: t => (/\b(send|share|email|schedule|deliver)\b/.test(t) && /every (monday|week|month)|\b(weekly|monthly)\b|each (monday|week|month)/.test(t) && !/\b(post|reply|clip)\b/.test(t)
    ? { kind: 'schedule', every: /month/.test(t) ? 'month' : 'week', to: /\b(me|myself)\b/.test(t) && !/claire/.test(t) ? 'sam' : 'claire', raw: t } : undefined),
  bar: (i, { s, d, go }) => {
    const target = scheduleTarget(s, i.raw)
    const lvl = actionOf(s, 'iris', 'iris-report')?.autonomy ?? 'draft'
    return {
      text: `Scheduled: “${target.name}” every ${i.every === 'week' ? 'Monday' : 'month, on the 1st,'} at 08:00, for ${i.to === 'claire' ? 'Claire' : 'you'}. ${i.to === 'claire' ? LEVEL_SAYS[lvl] : 'I’ll put it in Insights › Reports.'}`,
      after: () => d({ type: 'insights/schedule', name: target.name, recipe: target.recipe, every: i.every, to: i.to, via: 'You asked in the command bar' }),
      ctas: [{ label: 'See schedules', run: () => go('/insights') }],
    }
  },
  chat: (i, { s }) => {
    const target = scheduleTarget(s, i.raw)
    const lvl = actionOf(s, 'iris', 'iris-report')?.autonomy ?? 'draft'
    return {
      replies: [{ from: 'iris', text: `Done: “${target.name}” every ${i.every === 'week' ? 'Monday' : 'month'} at 08:00 for ${i.to === 'claire' ? 'Claire' : 'you'}. ${i.to === 'claire' ? LEVEL_SAYS[lvl] : ''}`.trim(), card: { type: 'done', text: `Scheduled every ${i.every === 'week' ? 'Monday' : 'month'}` } }],
      effects: [st => reduceInsights(st, { type: 'insights/schedule', name: target.name, recipe: target.recipe, every: i.every, to: i.to, via: 'You asked in a chat' })],
    }
  },
})

/** “Make the report shorter and add the top 3 posts”: edits the last report Sam asked for. */
const reportEdit = defineIntent({
  kind: 'reportEdit', owner: 'iris', order: 35,
  parse: t => (/\breport\b/.test(t) && /\b(shorter|longer|add|remove|drop|move|cut|include)\b/.test(t) && !/\b(rule|post|reply|clip)\b/.test(t.replace(/top \d+ posts|top posts|best posts/, '')) ? { kind: 'reportEdit', raw: t } : undefined),
  bar: (i, { s, d, go }) => {
    const r = s.insights.reports.find(x => x.recipe)
    if (!r) return { text: 'There’s no report you asked for yet. Ask me for one first, for example “a monthly report for Claire on Instagram”.' }
    const { ops, said } = parseEdits(i.raw, r)
    if (!ops.length) return { text: `I didn’t see what to change in “${r.title}”. I can make it shorter or longer, add, drop or move a section (results, top 3 posts, what didn’t work, best times, pillars, community).` }
    return {
      text: `Done in “${r.title}”: ${said.join(', ')}.`,
      after: () => d({ type: 'insights/studioEdit', id: r.id, ops, said: said.join(', ') }),
      ctas: [{ label: 'Open the report', primary: true, run: () => go(`/insights/reports/${r.id}`) }],
    }
  },
  chat: (i, { s }) => {
    const r = s.insights.reports.find(x => x.recipe)
    if (!r) return { replies: [{ from: 'iris', text: 'There’s no report you asked for yet. Ask me for one first, for example “a monthly report for Claire on Instagram”.' }], effects: [] }
    const { ops, said } = parseEdits(i.raw, r)
    if (!ops.length) return { replies: [{ from: 'iris', text: 'I can make it shorter or longer, add, drop or move a section (results, top 3 posts, what didn’t work, best times, pillars, community).' }], effects: [] }
    return {
      replies: [{ from: 'iris', text: `Done: ${said.join(', ')}.`, card: { type: 'list', items: [{ title: r.title, agent: 'iris', meta: said.join(', '), link: `/insights/reports/${r.id}` }] } }],
      effects: [st => reduceInsights(st, { type: 'insights/studioEdit', id: r.id, ops, said: said.join(', ') })],
    }
  },
})


const besttime = defineIntent({
  kind: 'besttime', owner: 'iris', order: 110,
  parse: t => {
    if (!/best (time|slot|hour|day)|when should (i|we) post/.test(t)) return
    const n = net(t)
    return { kind: 'besttime', network: n && n in BEST_CELL ? n as SocialNet : 'instagram' }
  },
  bar: (i, { go }) => {
    const b = bestTime(i.network)
    return {
      text: `Best slot on ${NETWORK_LABEL[i.network]}: ${b.dayName} ${b.window}. Posts in that window got ${b.lift}× the median reach over the last 30 days. Atlas posts at ${b.time}, inside it.`,
      visual: <Heatmap label="Reach by day and hour" rows={HEAT_ROWS} cols={HEAT_COLS} values={heat(i.network)} best={[b.day, b.col]} />,
      sources: [`${NETWORK_LABEL[i.network]} analytics, last 30 days`],
      ctas: [{ label: 'Open Explore', run: () => go('/insights/explore') }],
    }
  },
  chat: i => {
    const b = bestTime(i.network)
    const byDay = heat(i.network).map(row => Math.round(Math.max(...row) * 100))
    return { replies: [{ from: 'iris', text: `Your best ${NETWORK_LABEL[i.network]} slot over the last 30 days is ${b.dayName} ${b.window}: ${b.lift}× the median reach. Atlas posts at ${b.time}, inside it.`, card: { type: 'chart', label: `${NETWORK_LABEL[i.network]} best slot per weekday (index)`, value: `${b.dayName.slice(0, 3)} ${b.time}`, delta: `${b.lift}× median`, series: byDay, labels: SHORT_DAYS, sources: [`${NETWORK_LABEL[i.network]} analytics · 30 days`] } }], effects: [] }
  },
})

const tiktok = defineIntent({
  kind: 'tiktok', owner: 'iris', order: 120,
  parse: t => (/tiktok/.test(t) && /how|did|perform|doing|last week|views|reach/.test(t) ? { kind: 'tiktok' } : undefined),
  bar: (_i, { d, go }) => {
    const v = tiktokViews()
    return {
      text: `TikTok had a weak week: ${fmt.int(v.now)} views per video on the last 4 videos, ${fmt.signed(v.delta)} from ${fmt.int(v.before)} before. All 4 videos since Thursday open on the product for 4 to 6 seconds before anything happens. Trailkind’s best videos hook in 2. I’d test 3-second hooks this week.`,
      visual: <LineChart label="TikTok views per video, last 11 videos" labels={v.series.map((_, i) => `#${i + 1}`)} series={[{ name: 'Views per video (k)', data: v.series }]} h={150} format={x => `${x.toFixed(1)}k`} />,
      sources: ['TikTok analytics, last 11 videos', '4 videos since Thu 20 Nov'],
      ctas: [{ label: 'Ask Atlas to test hooks', primary: true, run: () => d({ type: 'playbook/briefAtlas', title: 'TikTok: test 3-second hooks', network: 'tiktok', slot: 'Thu 27, 18:30', text: 'Bag vs. downpour, 3 seconds in. Spoiler: the laptop stays dry.', brief: 'Test 3-second hooks on TikTok' }) }, { label: 'Open Insights', run: () => go('/insights') }],
    }
  },
  chat: () => {
    const v = tiktokViews()
    return {
      replies: [
        { from: 'iris', text: `TikTok views per video are ${fmt.signed(v.delta)} since Thursday: four videos in a row at ${fmt.int(v.now)}, against ${fmt.int(v.before)} before. The hooks got longer, 4 to 6 seconds.`, card: { type: 'chart', label: 'TikTok views per video (k)', value: fmt.int(v.now), delta: fmt.signed(v.delta), down: v.delta < 0, series: v.series, sources: ['TikTok analytics · last 11 videos'] } },
        { from: 'atlas', text: 'Want me to test 3-second hooks? Here’s the first one.', card: { type: 'post', network: 'tiktok', slot: 'Thu 27, 18:30', text: 'POV: you packed for 3 days and it all fits. Ridge 28L.', status: 'draft' } },
      ], effects: [],
    }
  },
})

const compare = defineIntent({
  kind: 'compare', owner: 'iris', order: 130,
  parse: t => (/reels? (vs|versus|or|against) carousels?|carousels? (vs|versus|or|against) reels?|compare/.test(t) ? { kind: 'compare' } : undefined),
  bar: (_i, { go }) => {
    const f = formats()
    return {
      text: `Carousels win on saves, reels win on reach. Over 30 days, carousels averaged a ${fmt.pct(f.carousel.er)} engagement rate against ${fmt.pct(f.reel.er)} for reels, but reels reached ${f.reachX}× more people. Carousels get ${f.savesX}× the saves, and convert better: ${fmt.pct(f.carousel.clicks)} link clicks against ${fmt.pct(f.reel.clicks)}.`,
      visual: <HBars items={[{ label: 'Carousels · engagement', value: f.carousel.er }, { label: 'Reels · engagement', value: f.reel.er }, { label: 'Carousels · saves', value: f.carousel.saves }, { label: 'Reels · saves', value: f.reel.saves }, { label: 'Carousels · clicks', value: f.carousel.clicks }, { label: 'Reels · clicks', value: f.reel.clicks }]} format={v => `${v}%`} />,
      sources: ['Instagram analytics, last 30 days', `${f.carousel.posts} carousels, ${f.reel.posts} reels`],
      ctas: [{ label: 'Open Insights', run: () => go('/insights') }],
    }
  },
  chat: () => {
    const f = formats()
    return { replies: [{ from: 'iris', text: `Over 30 days, reels reach ${f.reachX}× more people, carousels get ${f.savesX}× the saves (${fmt.pct(f.carousel.saves)} against ${fmt.pct(f.reel.saves)}). Reels to be found, carousels to be kept.`, card: { type: 'chart', label: 'Saves rate (%)', value: `${f.savesX}×`, delta: 'carousels vs reels', series: [f.reel.saves, f.carousel.saves], labels: ['Reels', 'Carousels'], sources: [`Instagram analytics · 30 days, ${f.carousel.posts + f.reel.posts} posts`] } }], effects: [] }
  },
})

/** “Who follows us on TikTok?”: the Audience tab's numbers. */
const audience = defineIntent({
  kind: 'audience', owner: 'iris', order: 112,
  parse: t => (/who (follows|are our followers)|\baudience\b|demograph|followers? (by )?(age|country|countries|city|cities)|how old are/.test(t) ? { kind: 'audience', network: net(t) ?? 'all' } : undefined),
  bar: (i, { s, d, go }) => {
    const a = audienceOf(i.network), name = i.network === 'all' ? 'all networks' : NETWORK_LABEL[i.network]
    const tip = audienceTips().find(t => i.network === 'all' || t.network === i.network)
    return {
      text: `${int(a.followers)} followers on ${name}: ${a.under25}% under 25, mostly ${a.peak}. Women ${a.gender.women}%, men ${a.gender.men}%. ${a.countries.slice(0, 3).map(([c, p]) => `${c} ${p}%`).join(', ')}; top cities ${a.cities.slice(0, 3).join(', ')}.${tip ? ` ${tip.finding}.` : ''}`,
      visual: <HBars items={AGE_BANDS.map((b, k) => ({ label: b, value: a.age[k] }))} format={v => `${v}%`} />,
      sources: [`${name} · native analytics · followers today`],
      ctas: [{ label: 'Open Audience', run: () => go('/insights/audience') }, ...(tip && !s.insights.tips[tip.network] ? [{ label: 'Brief Atlas', run: () => d({ type: 'insights/audienceBrief', network: tip.network, via: 'You asked in the command bar' }) }] : [])],
    }
  },
  chat: i => {
    const a = audienceOf(i.network), name = i.network === 'all' ? 'all networks' : NETWORK_LABEL[i.network]
    return { replies: [{ from: 'iris', text: `${int(a.followers)} followers on ${name}, ${a.under25}% under 25, mostly ${a.peak}. ${a.countries[0][0]} first (${a.countries[0][1]}%).`, card: { type: 'chart', label: `Followers by age, ${name} (%)`, value: `${a.under25}%`, delta: 'under 25', series: a.age, labels: AGE_BANDS, sources: [`${name} · native analytics`] } }], effects: [] }
  },
})

/** “Which network brings sales?”: the ROI tab's numbers. */
const roi = defineIntent({
  kind: 'roi', owner: 'iris', order: 115,
  parse: t => (/\broi\b|revenue|\bsales\b|conversions?\b|ga4|google analytics|brings? (in )?(money|sales|orders)|website (traffic|visits|sessions)/.test(t) ? { kind: 'roi' } : undefined),
  bar: (_i, { go }) => {
    const rows = roiByNetwork(30), t = roiTotals(rows)
    return {
      text: `Over 30 days, social brought ${fmt.int(t.sessions)} sessions, ${fmt.int(t.conversions)} orders and €${fmt.int(t.revenue)} to fernway.co. ${NETWORK_LABEL[rows[0].network]} brings the most (€${fmt.int(rows[0].revenue)}), ${NETWORK_LABEL[rows[1].network]} next (€${fmt.int(rows[1].revenue)}).`,
      visual: <HBars items={rows.map(r => ({ label: NETWORK_LABEL[r.network], value: r.revenue }))} format={v => `€${Math.round(v).toLocaleString('en-GB')}`} />,
      sources: ['Google Analytics 4 · UTM source = social · 30 days'],
      ctas: [{ label: 'Open ROI', run: () => go('/insights/roi') }],
    }
  },
  chat: () => {
    const rows = roiByNetwork(30), t = roiTotals(rows)
    return { replies: [{ from: 'iris', text: `${NETWORK_LABEL[rows[0].network]} brings the most sales: €${fmt.int(rows[0].revenue)} over 30 days, out of €${fmt.int(t.revenue)} from social.`, card: { type: 'chart', label: 'Revenue from social by network (€)', value: `€${fmt.int(t.revenue)}`, delta: '30 days', series: rows.map(r => r.revenue), labels: rows.map(r => NETWORK_LABEL[r.network].slice(0, 2)), sources: ['GA4 · UTM source = social'] } }], effects: [] }
  },
})

/** Last 7 days, as Explore shows them. */
function weekLine() {
  const reach = kpi('reach'), er = kpi('er'), replies = kpi('replies'), reply = kpi('reply'), v = tiktokViews()
  return { reach, er, replies, reply, v, text: `reach ${fmt.k(reach.value)} (${fmt.signed(change(reach))}), engagement rate ${fmt.pct(er.value)} (${fmt.signed(change(er), ' pt')}), ${fmt.int(replies.value)} replies handled with a median reply time of ${reply.value} minutes` }
}

const performance = defineIntent({
  kind: 'performance', owner: 'iris', order: 150,
  parse: t => (/reach|engagement|how are we doing|how('?s| is) it going|performance|numbers|followers/.test(t) ? { kind: 'performance' } : undefined),
  bar: (_i, { go }) => {
    const w = weekLine()
    return {
      text: `Last 7 days: ${w.text}. The one dip is TikTok views per video, ${fmt.signed(w.v.delta)}.`,
      visual: <LineChart label="Daily reach, last 7 days against the 7 before" labels={dayLabels(7)} h={140} format={v => `${Math.round(v)}k`}
        series={[{ name: 'Last 7 days', data: DAILY_REACH.slice(-7) }, { name: 'Previous 7 days', dashed: true, tone: 'faint', data: DAILY_REACH.slice(-14, -7) }]} />,
      sources: ['Native analytics, last 7 days vs the 7 before'],
      ctas: [{ label: 'Open Explore', run: () => go('/insights/explore') }],
    }
  },
  chat: () => {
    const w = weekLine()
    return { replies: [{ from: 'iris', text: `Last 7 days: ${w.text}. TikTok is the one weak spot.`, card: { type: 'chart', label: 'Daily reach, last 7 days (k)', value: fmt.k(w.reach.value), delta: fmt.signed(change(w.reach)), series: DAILY_REACH.slice(-7), labels: dayLabels(7), sources: ['All networks · Insights › Explore'] } }], effects: [] }
  },
})

/** Iris's alert rules: when she raises something on the Desk, and to whom. */
function Alerts() {
  const { s, d } = useStore()
  return (
    <AlertsTable agent="Iris" alerts={s.insights.alerts} intro="Iris checks these every few minutes against what she measures. When one fires she opens an anomaly in Insights and, unless “Raise anomalies” is on Suggest, brings it to your Desk."
      subjects={ALERT_SUBJECTS} conditions={ALERT_CONDITIONS} units={ALERT_UNITS}
      onSave={alert => d({ type: 'insights/alertSave', alert })} onToggle={id => d({ type: 'insights/alertToggle', id })} onDelete={id => d({ type: 'insights/alertDelete', id })} />
  )
}

const iris: AgentModule = {
  id: 'iris',
  script: SCRIPT,
  // The rail badge and Agents › Team count the landing's decisions block.
  needs: s => insightsNeeds(s).count,
  onResolve: onResolveInsights,
  onUndo: onUndoInsights,
  due: (s, t) => anomaliesDue(s) || reportsDue(s, t) || schedulesDue(s, t),
  tick: (s, t) => { const r = reportsDue(s, t) ? tickReports(s, t) : s; return tickAnomalies(schedulesDue(r, t) ? tickSchedules(r, t) : r) },
  intents: [schedule, reportEdit, report, besttime, audience, roi, tiktok, compare, performance],
  profileTabs: [{ id: 'alerts', label: 'Alerts', count: s => s.insights.alerts.filter(x => x.on).length, render: () => <Alerts /> }],
  presets: { calm: { keep: ['h-tiktok', 'h-report'] }, competitor: { keep: ['h-report'] }, trust: { keep: ['h-report'] } },
  // Moderator › Hard to see: what a tester rarely stumbles on (⇧D).
  triggers: [{ event: 'ev-linkedin', to: '/insights' }, { event: 'ev-audience', to: '/insights/audience' }],
}
export default iris
