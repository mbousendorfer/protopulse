// Iris's anomaly engine: her alert rules, evaluated on every heartbeat against what she measures.
import type { State } from '../../app/state'
import type { Handoff } from '../../app/types'
import { actionOf, now, pushHandoff, pushLog } from '../../app/core'
import { DAY } from '../../app/time'
import { actDecision, resolve } from '../../app/reducer'
import { ALERT_SUBJECTS, SIGNALS, SPIKES, type Anomaly, type Signal } from '../../data/insights'
import { ruleSentence, type Alert } from './alerts'
import { anomalyList, patchInsights } from './slice'
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
