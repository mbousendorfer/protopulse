import type { ScriptEvent } from '../../data/script'
import { pushLog } from '../../app/core'
import { ideaScript } from '../publishing/slice'
import { known, raiseAudienceTip, tickAnomalies } from './engine'
import { patchInsights } from './slice'

/** A scripted spike: the signal changes, then Iris's own alert rules decide what happens (nothing if none covers it). */
function spike(key: string, label: string) {
  return (s: Parameters<NonNullable<ScriptEvent['run']>>[0]) => {
    if (known(s, key)) return s
    const next = patchInsights(s, { spikes: [...s.insights.spikes.filter(k => k !== key), key] })
    const after = tickAnomalies(next)
    return after.insights.raised.length > next.insights.raised.length ? after
      : pushLog(after, { agent: 'iris', text: `${label}: no alert rule covers it, so Iris only noted it`, status: 'done', reason: 'Your alert rules decide what reaches you', link: '/agents/iris?tab=alerts' })
  }
}

/** Iris's scripted events. `order` places each one in the shared feed (see the registry). */
export const SCRIPT: ScriptEvent[] = [
  { id: 'ev-idea-signal', order: 50, label: 'Iris · knots carousel saved again (idea)', agent: 'iris', ...ideaScript({ origin: 'continuous', agent: 'iris', seeds: ['knots-winter'] }) },
  { id: 'ev-audience', order: 75, label: 'Iris · TikTok audience doesn’t match the content', agent: 'iris', tag: 'audience', history: true, run: s => raiseAudienceTip(s, 'tiktok') },
  { id: 'ev-linkedin', order: 70, label: 'Iris · LinkedIn follower spike', agent: 'iris', tag: 'anomaly', run: spike('followers:linkedin', 'LinkedIn followers +420 in a day') },
]
