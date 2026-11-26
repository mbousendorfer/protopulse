import type { State } from '../../app/state'
import { groupOf } from '../../app/reducer'
import { anomalyList } from './slice'

/**
 * What Iris waits on Sam for: open anomalies to decide, and her other Desk cards that need him (a report or brief to
 * approve, an audience idea). A card about an open anomaly is that anomaly, counted once.
 * The Insights summary line and the rail badge both count this.
 */
export function insightsNeeds(s: State) {
  const all = anomalyList(s)
  const anomalies = all.filter(a => a.open)
  const aboutAnomaly = (ref?: string, id?: string) => all.some(a => a.handoff === id || a.id === ref || `anomaly:${a.id}` === ref)
  const cards = s.handoffs.filter(h => h.agent === 'iris' && !h.lane && groupOf(h) === 'need' && !aboutAnomaly(h.ref, h.id))
  return { anomalies, cards, count: anomalies.length + cards.length }
}
