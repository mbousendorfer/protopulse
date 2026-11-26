// Report Studio, the agentic way: Sam asks for a report in a sentence, Iris writes it from the same numbers as
// Explore, then rewrites, moves or drops sections when asked. Pure functions; the slice stores the result.
import type { State } from '../../app/state'
import type { Network } from '../../app/types'
import { DAY } from '../../app/time'
import { now } from '../../app/core'
import { NETWORK_LABEL } from '../../data/agents'
import { NETWORKS_SOCIAL, POSTS, type Cited, type Recipe, type Report, type ReportSection, type SectionKind } from '../../data/insights'
import { bestTime, fmt, postPerf, rangeKpis } from './metrics'
import { roiByNetwork, roiTotals } from './roi'
import { audienceOf } from './audience'
import { benchmarkRead, benchmarkRows } from './benchmark'
import { anomalyList } from './slice'

export const SECTION_LABEL: Record<SectionKind, string> = {
  summary: 'Results', top: 'Top 3 posts', dips: 'What didn’t work', besttime: 'Best times to post', pillars: 'By pillar', community: 'Community',
  campaign: 'Campaign vs goal', label: 'Labelled posts', roi: 'Website results', audience: 'Audience', benchmark: 'Benchmark',
}

/**
 * The parts of a request only the state can resolve: a campaign of Sage's named in it (its window and networks
 * become the report's), or a label on Atlas's posts (“labelled Sale”).
 */
export function enrich(s: State, raw: string, r: Recipe): Recipe {
  const t = raw.toLowerCase()
  const c = s.strategy.campaigns.find(x => t.includes(x.name.toLowerCase()))
  const l = t.match(/(?:labell?ed|label|tagged)\s+[“"']?([a-z0-9][a-z0-9 &-]*?)[”"']?(?=\s+(?:for|on|over|in|this|last)\b|[.,!?]|$)/)
  let next = r
  if (c) {
    const days = Math.min(90, Math.max(1, Math.round((Math.min(c.end, now(s)) - c.start) / DAY) + 1))
    const nets = [...new Set(c.posts.map(p => p.network))]
    next = { ...next, campaign: c.id, days, networks: r.networks.length ? r.networks : nets, sections: ['campaign', ...r.sections.filter(k => k !== 'campaign')] }
  }
  if (l) next = { ...next, label: l[1].trim(), sections: ['label', ...next.sections.filter(k => k !== 'label')] }
  return next
}
export const DEFAULT_SECTIONS: SectionKind[] = ['summary', 'top', 'dips', 'besttime', 'community']

const NET_WORDS: [RegExp, Network][] = [
  [/instagram|\binsta\b|\big\b/, 'instagram'], [/tiktok|tik tok/, 'tiktok'], [/linkedin/, 'linkedin'], [/facebook|\bfb\b/, 'facebook'],
  [/youtube|\byt\b|shorts/, 'youtube'], [/\bx\b|twitter/, 'x'],
]

/** “a monthly report for Claire on Instagram and TikTok” → its window, networks and reader. Undefined when it isn't a request for a report. */
export function parseRecipe(t: string): Omit<Recipe, 'sections'> | undefined {
  if (!/\b(report|recap)\b/.test(t) || /^(why|how|share|send)\b/.test(t) || /every (day|week|month|monday|tuesday|wednesday|thursday|friday)/.test(t)) return
  if (!/\b(a|an|new|write|make|get|give|need|want|prepare|build|create|draft|monthly|weekly|quarterly|\d+[- ]days?)\b/.test(t)) return
  const n = t.match(/(\d+)[- ]days?/)
  const days = n ? Math.min(90, Math.max(1, +n[1])) : /quarter|90/.test(t) ? 90 : /month|30/.test(t) ? 30 : 7
  const networks = NET_WORDS.filter(([re]) => re.test(t)).map(([, x]) => x)
  return { days, networks, audience: /claire|client|boss|manager/.test(t) ? 'claire' : 'sam' }
}

const netsOf = (r: Recipe): Network[] => (r.networks.length ? r.networks : NETWORKS_SOCIAL)
const netNames = (r: Recipe) => (r.networks.length ? r.networks.map(n => NETWORK_LABEL[n]).join(r.networks.length === 2 ? ' and ' : ', ') : 'all networks')
const c = (n: string, source: string): Cited => ({ n, source })
/** The first sentence of a section: what “shorter” keeps. */
function firstSentence(paras: Cited[][]): Cited[][] {
  const out: Cited[] = []
  for (const p of paras[0] ?? []) {
    if (typeof p === 'string' && /\.(\s|$)/.test(p)) { out.push(p.slice(0, p.search(/\.(\s|$)/) + 1)); return [out] }
    out.push(p)
  }
  return [out]
}

/** One section, written now from the state. */
export function writeSection(s: State, r: Recipe, kind: SectionKind, short = false): ReportSection {
  const nets = netsOf(r)
  const range = { days: r.days, offset: 0 }
  const window = `${r.days} days`
  let paras: Cited[][] = []
  let chart: ReportSection['chart']
  if (kind === 'summary') {
    const ks = nets.map(n => rangeKpis(range, n))
    const get = (key: string) => ks.map(k => k.find(x => x.key === key)!)
    const reach = get('reach').reduce((t, k) => t + k.value, 0), prev = get('reach').reduce((t, k) => t + k.prev, 0)
    const er = get('er').reduce((t, k, i) => t + k.value * get('reach')[i].value, 0) / reach
    const followers = get('followers').reduce((t, k) => t + k.value, 0), clicks = get('clicks').reduce((t, k) => t + k.value, 0)
    paras = [[`Reach on ${netNames(r)} was `, c(fmt.k(reach), `${netNames(r)} · unique reach · ${window}`), ', ', c(fmt.signed((reach - prev) / prev * 100), `vs. ${fmt.k(prev)} the ${window} before`), `. Engagement rate `, c(fmt.pct(er), `${netNames(r)} · reach-weighted · ${window}`), ', with ', c(`${fmt.int(followers)} new followers`, `${netNames(r)} · ${window}`), ' and ', c(`${fmt.int(clicks)} link clicks`, `${netNames(r)} · ${window}`), '.']]
    chart = 'reach'
  }
  if (kind === 'top') {
    const since = Math.max(...POSTS.map(p => p.date)) - r.days * DAY
    const top = POSTS.filter(p => nets.includes(p.network) && p.date >= since).sort((a, b) => b.reach - a.reach).slice(0, 3)
    paras = top.length ? top.map((p, i): Cited[] => [`${i + 1}. ${p.title} on ${NETWORK_LABEL[p.network]}: `, c(`${fmt.int(p.reach)} reach`, `${NETWORK_LABEL[p.network]} · post of ${new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`), ', ', c(`${p.er.toFixed(1)}% engagement`, `${NETWORK_LABEL[p.network]} · same post`), '.']) : [[`No posts on ${netNames(r)} in the last ${window}.`]]
  }
  if (kind === 'dips') {
    const down = anomalyList(s).filter(a => a.down && nets.includes(a.network) && (a.open || a.detectedAt > now(s) - r.days * DAY))
    paras = down.length ? down.map((a): Cited[] => [`${a.title}: `, c(a.value, `${NETWORK_LABEL[a.network]} · ${a.metric}`), ` (${a.delta}). ${a.cause.split('. ')[0].replace(/\.$/, '')}.`]) : [[`Nothing dropped outside its normal range on ${netNames(r)}.`]]
  }
  if (kind === 'besttime') {
    paras = [nets.flatMap((n, i): Cited[] => { const b = bestTime(n); return [i ? ' ' : '', `${NETWORK_LABEL[n]}: `, c(`${b.dayName} ${b.window}`, `${NETWORK_LABEL[n]} · reach by day and hour · 30 days`), ` (${b.lift}× the median), Atlas posts at ${b.time}.`] })]
  }
  if (kind === 'pillars') {
    paras = [['Engagement rate by content pillar over 30 days. Community posts engage most; Gear that lasts brings most of the reach.']]
    chart = 'pillars'
  }
  if (kind === 'community') {
    const k = rangeKpis(range, 'all')
    const replies = k.find(x => x.key === 'replies')!, reply = k.find(x => x.key === 'reply')!, sentiment = k.find(x => x.key === 'sentiment')!
    paras = [[c(`${fmt.int(replies.value)} replies`, `Inbox · all networks · ${window}`), ' handled, with a median reply time of ', c(`${reply.value} minutes`, `Inbox · median first reply · ${window}`), '. Positive sentiment held at ', c(`${sentiment.value}%`, `Listening · brand mentions · ${window}`), '.']]
  }
  if (kind === 'campaign') {
    const cp = s.strategy.campaigns.find(x => x.id === r.campaign)
    if (!cp) paras = [['This report isn’t about a campaign. Ask for one by name, like “a report on Trail Week”.']]
    else {
      const day = Math.max(1, Math.min(Math.round((cp.end - cp.start) / DAY) + 1, Math.round((now(s) - cp.start) / DAY) + 1)), total = Math.round((cp.end - cp.start) / DAY) + 1
      const pct = Math.round(cp.goal.current / cp.goal.target * 100)
      const out = cp.posts.filter(p => p.published).length
      const moved = cp.adjustments.filter(a => a.status === 'accepted')
      paras = [
        [`${cp.name}: `, c(`${fmt.int(cp.goal.current)} of ${fmt.int(cp.goal.target)} ${cp.goal.label}`, `Sage · ${cp.name} · goal`), ` (${pct}%), day ${day} of ${total}. `, c(`${out} of ${cp.posts.length} posts`, `Sage · ${cp.name} · plan`), ' are out.'],
        moved.length ? [`Sage adjusted the plan: ${moved.map(a => a.text.replace(/\.$/, '')).join('; ')}.`] : ['No change to the plan so far.'],
      ]
      chart = cp.planned.length ? 'campaign' : undefined
    }
  }
  if (kind === 'label') {
    const lab = (r.label ?? '').toLowerCase()
    const ps = s.publishing.posts.filter(p => p.status === 'published' && (p.labels?.some(x => x.toLowerCase() === lab) || p.campaign?.toLowerCase() === lab))
    const perf = ps.map(p => ({ p, x: postPerf(s, p.id) })).filter(y => y.x)
    if (!perf.length) paras = [[`No published post carries the label “${r.label}” yet. Atlas labels posts when he schedules them; this section fills in as they go out.`]]
    else {
      const reach = perf.reduce((t, y) => t + y.x!.reach, 0), er = perf.reduce((t, y) => t + y.x!.er, 0) / perf.length
      const best = [...perf].sort((a, b) => b.x!.reach - a.x!.reach)[0]
      paras = [[c(`${perf.length} posts`, `Atlas · label “${r.label}”`), ' reached ', c(fmt.k(reach), `Label “${r.label}” · reach`), ' at ', c(fmt.pct(er), `Label “${r.label}” · average engagement`), `. Best: “${best.p.text.slice(0, 60)}” on ${NETWORK_LABEL[best.p.network]}.`]]
    }
  }
  if (kind === 'benchmark') {
    const rows = benchmarkRows(s), us = rows[0]
    paras = [[c(`${fmt.int(us.followers)} followers`, 'Iris · all networks · today'), `, +${us.growth}% a week, `, c(`${fmt.pct(us.er)} engagement`, 'Iris · Explore · 7 days'), ', ', c(`${us.sov}% share of voice`, 'Echo · Listening › Competitors'), `. ${benchmarkRead(rows)}`]]
    chart = 'benchmark'
  }
  if (kind === 'audience') {
    const a = audienceOf(r.networks.length === 1 ? r.networks[0] : 'all')
    paras = [[c(`${fmt.int(a.followers)} followers`, `${netNames(r)} · native analytics · today`), `, ${a.under25}% under 25, mostly ${a.peak}. `, c(`${a.countries[0][0]} ${a.countries[0][1]}%`, `${netNames(r)} · followers by country`), `, then ${a.countries.slice(1, 3).map(([x, p]) => `${x} ${p}%`).join(', ')}. Top cities: ${a.cities.slice(0, 3).join(', ')}.`]]
  }
  if (kind === 'roi') {
    const rows = roiByNetwork(r.days, nets), t = roiTotals(rows)
    const top = rows[0]
    paras = [
      ['Link clicks brought ', c(`${fmt.int(t.sessions)} sessions`, `GA4 · UTM source = social · ${window}`), ' to fernway.co, ', c(`${fmt.int(t.conversions)} orders`, `GA4 · purchases · ${window}`), ' and ', c(`€${fmt.int(t.revenue)}`, `GA4 · revenue · ${window}`), '.'],
      ...(top ? [[`${NETWORK_LABEL[top.network]} brings the most: `, c(`€${fmt.int(top.revenue)}`, `GA4 · ${NETWORK_LABEL[top.network]} · ${window}`), ` from ${fmt.int(top.sessions)} sessions.`] as Cited[]] : []),
    ]
  }
  if (short) { paras = kind === 'top' || kind === 'dips' ? paras.slice(0, 1) : firstSentence(paras); if (kind === 'pillars' || kind === 'benchmark') chart = undefined }
  return { heading: SECTION_LABEL[kind], paras, chart, kind, short }
}

const TITLE: Record<number, string> = { 7: 'Weekly', 30: 'Monthly', 90: 'Quarterly' }

/** A whole report from a recipe. */
export function writeStudio(s: State, recipe: Recipe, id: string, at: number): Report {
  const sections = recipe.sections.map(k => writeSection(s, recipe, k))
  const end = new Date(at), start = new Date(at - (recipe.days - 1) * DAY)
  const d = (x: Date) => x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const about = recipe.campaign ? s.strategy.campaigns.find(x => x.id === recipe.campaign)?.name : recipe.label ? `Label “${recipe.label}”` : undefined
  return {
    id, kind: 'custom', recipe, writtenAt: at, title: about ? `${about} report` : `${TITLE[recipe.days] ?? `${recipe.days}-day`} report · ${netNames(recipe)}`,
    period: `${d(start)} – ${d(end)}`,
    summary: `${recipe.audience === 'claire' ? 'For Claire. ' : ''}${sections.length} sections on ${netNames(recipe)}, last ${recipe.days} days. Every number points to its source.`,
    sections,
  }
}

export type StudioOp = { op: 'remove' | 'up' | 'down' | 'shorter' | 'longer'; i?: number } | { op: 'add'; kind: SectionKind }

/** Apply one edit; sections Iris rewrites are written again from the state. */
export function applyOp(s: State, r: Report, o: StudioOp): Report {
  if (!r.recipe) return r
  let sections = [...r.sections]
  const all = (f: (x: ReportSection, i: number) => ReportSection) => sections.map((x, i) => (o.op !== 'add' && o.i !== undefined && o.i !== i ? x : f(x, i)))
  if (o.op === 'remove' && o.i !== undefined) sections.splice(o.i, 1)
  if ((o.op === 'up' || o.op === 'down') && o.i !== undefined) {
    const j = o.op === 'up' ? o.i - 1 : o.i + 1
    if (j >= 0 && j < sections.length) [sections[o.i], sections[j]] = [sections[j], sections[o.i]]
  }
  if (o.op === 'shorter' || o.op === 'longer') sections = all(x => (x.kind ? writeSection(s, r.recipe!, x.kind, o.op === 'shorter') : x))
  if (o.op === 'add' && !sections.some(x => x.kind === o.kind)) sections.push(writeSection(s, r.recipe, o.kind))
  return { ...r, sections, recipe: { ...r.recipe, sections: sections.map(x => x.kind).filter((k): k is SectionKind => !!k) } }
}

const KIND_WORDS: [RegExp, SectionKind][] = [
  [/best time|timing|when to post|slot/, 'besttime'], [/\broi\b|revenue|sales|website|ga4/, 'roi'], [/benchmark|compet|peakline|norr|trailkind|share of voice/, 'benchmark'], [/audience|demograph|who follows|followers/, 'audience'], [/result|summary|reach|overview/, 'summary'], [/top \d|top three|top posts|best posts|\bposts\b/, 'top'],
  [/didn|dip|anomal|problem|\bbad\b/, 'dips'], [/pillar|theme/, 'pillars'], [/community|inbox|repl/, 'community'], [/campaign|goal/, 'campaign'], [/label/, 'label'],
]
const kindIn = (t: string) => KIND_WORDS.find(([re]) => re.test(t))?.[1]

/**
 * “make it shorter and add the top 3 posts” → the edits, and what Iris says she did.
 * Each clause is read on its own; one that names no section applies to all of them.
 */
export function parseEdits(text: string, r: Report): { ops: StudioOp[]; said: string[] } {
  const ops: StudioOp[] = [], said: string[] = []
  const at = (k?: SectionKind) => (k ? r.sections.findIndex(x => x.kind === k) : -1)
  for (const clause of text.toLowerCase().split(/\band\b|,|;|\bthen\b/).map(x => x.trim()).filter(Boolean)) {
    const k = kindIn(clause.replace(/\b(it|the report)\b/g, ''))
    if (/^(add|include|put in|with)\b/.test(clause)) {
      if (k && at(k) < 0) { ops.push({ op: 'add', kind: k }); said.push(`added “${SECTION_LABEL[k]}”`) }
    } else if (/(remove|drop|delete|cut|without|no more)\b/.test(clause)) {
      if (at(k) >= 0) { ops.push({ op: 'remove', i: at(k) }); said.push(`removed “${SECTION_LABEL[k!]}”`) }
    } else if (/\bmove\b|\bfirst\b|\blast\b|\bup\b|\bdown\b|\btop of\b/.test(clause) && at(k) >= 0) {
      const steps = /first|top of|to the top/.test(clause) ? at(k) : /last|bottom|end/.test(clause) ? -(r.sections.length - 1 - at(k)) : /down/.test(clause) ? -1 : 1
      let i = at(k)
      for (let n = 0; n < Math.abs(steps); n++) { ops.push({ op: steps > 0 ? 'up' : 'down', i }); i += steps > 0 ? -1 : 1 }
      said.push(`moved “${SECTION_LABEL[k!]}” ${steps > 0 ? 'up' : 'down'}`)
    } else if (/short|concise|trim|tight|brief|less/.test(clause)) {
      ops.push({ op: 'shorter', i: at(k) >= 0 ? at(k) : undefined }); said.push(at(k) >= 0 ? `shortened “${SECTION_LABEL[k!]}”` : 'shortened every section')
    } else if (/long|detail|expand|more/.test(clause)) {
      ops.push({ op: 'longer', i: at(k) >= 0 ? at(k) : undefined }); said.push(at(k) >= 0 ? `expanded “${SECTION_LABEL[k!]}”` : 'expanded every section')
    }
  }
  return { ops, said }
}
