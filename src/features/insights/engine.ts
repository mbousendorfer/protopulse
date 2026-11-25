// Iris's anomaly engine: her alert rules, evaluated on every heartbeat against what she measures.
import type { State } from '../../app/state'
import type { Handoff, Network } from '../../app/types'
import { actionOf, now, pushHandoff, pushLog } from '../../app/core'
import { DAY } from '../../app/time'
import { actDecision, resolve } from '../../app/reducer'
import { ALERT_SUBJECTS, SIGNALS, SPIKES, type Anomaly, type Signal } from '../../data/insights'
import { ruleSentence, type Alert } from './alerts'
import { anomalyList, patchInsights } from './slice'
import { audienceTips } from './audience'
import { fmt } from './metrics'

/** What Iris measures now: the base signals, with the ones a scripted event switched on. */
export const signals = (s: State): Signal[] => SIGNALS.map(x => (s.insights.spikes.includes(x.key) ? { ...x, ...SPIKES[x.key] } : x))

/** Does this rule fire on this signal? Percent units compare the change, × units the ratio, minutes the value. */
export function fires(r: Alert, x: Signal): boolean {
  if (!r.on || r.subject !== x.subject) return false
  const pct = (x.value - x.base) / x.base * 100
  const ratio = x.value / x.base
  if (r.unit.trim().startsWith('min')) return r.condition === 'drops by more than' ? x.base - x.value > r.threshold : r.condition === 'rises above' ? x.value > r.threshold : x.value < r.threshold
  if (r.unit.startsWith('×')) return r.condition === 'drops by more than' ? 1 / ratio > r.threshold : r.condition === 'rises above' ? ratio > r.threshold : ratio < r.threshold
  return r.condition === 'drops by more than' ? -pct > r.threshold : r.condition === 'rises above' ? pct > r.threshold : x.value < r.threshold
}

/** Already raised: open, or detected in the last 7 days. */
export const known = (s: State, key: string) => anomalyList(s).some(a => a.key === key && (a.open || now(s) - a.detectedAt < 7 * DAY))

/** Rule and signal pairs that should become an anomaly now. Cheap: a handful of rules × a handful of signals. */
function pending(s: State): [Alert, Signal][] {
  const out: [Alert, Signal][] = []
  for (const x of signals(s)) {
    if (known(s, x.key) || out.some(([, y]) => y.key === x.key)) continue
    const r = s.insights.alerts.find(a => fires(a, x))
    if (r) out.push([r, x])
  }
  return out
}

export const anomaliesDue = (s: State) => s.phase !== 'day1' && pending(s).length > 0
export const tickAnomalies = (s: State) => pending(s).reduce((next, [r, x]) => raise(next, x, r), s)

const reads = (x: Signal) => (x.unit === 'k' ? fmt.k(x.value) : x.unit === 'pct' ? fmt.pct(x.value) : x.unit === 'min' ? `${x.value} min` : fmt.int(x.value))
const delta = (x: Signal, r?: Alert) => (r?.unit.startsWith('×') ? `${(x.value / x.base).toFixed(1)}× usual` : fmt.signed(Math.round((x.value - x.base) / x.base * 100)))

/**
 * Raise one anomaly, following the level of “Raise anomalies”: Suggest lists it in Insights; Draft adds a Desk card with
 * what Iris would do; Act also does it (the recommended action), with a journal line and a real Undo.
 */
export function raise(s: State, x: Signal, r?: Alert): State {
  const id = `an-${x.key.replace(':', '-')}-${s.insights.raised.length + 1}`
  const rule = r ? ruleSentence(r, ALERT_SUBJECTS) : undefined
  const an: Anomaly = {
    id, key: x.key, rule, title: x.title, network: x.network, metric: x.metric, value: reads(x), delta: delta(x, r), down: x.value < x.base,
    series: x.series, detectedAt: now(s), cause: x.cause, confidence: x.confidence, actions: x.actions, open: true,
  }
  const level = actionOf(s, 'iris', 'iris-anomaly')?.autonomy
  const why = rule ? `Your alert rule: “${rule}”.` : 'Outside the normal range for this account.'
  if (level === 'suggest' || !an.actions.length) {
    return pushLog(patchInsights(s, { raised: [an, ...s.insights.raised] }), { agent: 'iris', text: `Spotted: ${an.title}`, reason: why, status: 'done', link: '/insights/anomalies' })
  }
  const h: Omit<Handoff, 'at'> = {
    id: `h-${id}`, agent: 'iris', kind: 'alert', urgency: r?.to === 'claire' ? 'today' : 'week', topic: 'Anomaly', action: 'iris-anomaly', ref: id,
    title: an.title, context: an.cause, why, confidence: an.confidence, link: '/insights/anomalies',
    // Paid spend is never Iris's call: a boost is offered, never recommended.
    options: an.actions.map((label, i) => ({ label, recommended: i === 0 && !/€/.test(label) })),
    preview: { type: 'metric', label: `${an.metric}, ${x.network === 'x' ? 'X' : x.network[0].toUpperCase() + x.network.slice(1)}`, value: an.value, delta: an.delta, down: an.down, series: an.series },
  }
  let next = pushHandoff(patchInsights(s, { raised: [{ ...an, handoff: h.id }, ...s.insights.raised] }), h)
  if (r?.to === 'claire') next = { ...next, handoffs: next.handoffs.map(c => (c.id === h.id ? { ...c, lane: 'claire' as const, claire: { askedAt: now(s), dueAt: now(s) + 45_000 } } : c)) }
  if (level === 'act' && r?.to !== 'claire') {
    const card = next.handoffs.find(c => c.id === h.id)!
    const d = actDecision(card)
    if (d) next = resolve(next, h.id, d, { act: '“Raise anomalies” is set to Act' })
  }
  return next
}

/**
 * Iris spots an audience that doesn't match the content, following “Recommend content from the audience”:
 * Suggest lists it in Insights › Audience; Draft brings a Desk card with the brief; Act briefs Atlas (journal + Undo).
 */
export function raiseAudienceTip(s: State, network: Network = 'tiktok'): State {
  const tip = audienceTips().find(t => t.network === network)
  if (!tip || s.insights.tips[network]) return s
  let next = patchInsights(s, { tips: { ...s.insights.tips, [network]: 'open' } })
  const level = actionOf(s, 'iris', 'iris-audience')?.autonomy
  if (level === 'suggest') return pushLog(next, { agent: 'iris', text: `Spotted: ${tip.finding}`, status: 'done', reason: '“Recommend content from the audience” is set to Suggest', link: '/insights/audience' })
  const id = `h-aud-${network}`
  next = pushHandoff(next, {
    id, agent: 'iris', kind: 'decision', urgency: 'week', group: 'look', topic: 'Audience', action: 'iris-audience', ref: `aud:${network}`,
    title: `${tip.finding.split(',')[0]}: brief Atlas?`, context: `${tip.finding}.`, why: `Brief for Atlas: “${tip.brief}”.`, confidence: 76, link: '/insights/audience',
    options: [{ label: 'Brief Atlas', recommended: true }, { label: 'Not now' }],
    preview: { type: 'plan', title: `${network === 'x' ? 'X' : network[0].toUpperCase() + network.slice(1)} audience`, lines: [`${tip.under25}% under 25`, tip.posts[0].toUpperCase() + tip.posts.slice(1), `Brief: ${tip.brief}`] },
  })
  if (level !== 'act') return next
  const d = actDecision(next.handoffs.find(h => h.id === id)!)
  return d ? resolve(next, id, d, { act: '“Recommend content from the audience” is set to Act' }) : next
}
