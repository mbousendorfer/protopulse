import type { ScriptEvent } from '../../data/script'
import type { Handoff } from '../../app/types'
import { actionOf, pushHandoff } from '../../app/core'
import { onResolveStrategy, trackCampaigns } from './slice'
import { now } from '../../app/core'

/** Community under target: Sage proposes 2 more Instagram posts a week and 1 fewer on Facebook. At Act, it changes the cadence itself. */
const PILLAR_CARD: Omit<Handoff, 'id' | 'at'> = {
  agent: 'sage', kind: 'approval', urgency: 'week', topic: 'Pillars', action: 'sage-cadence', chain: ['iris', 'sage'], ref: 'ev-pillar',
  title: 'Community pillar at 9% of posts, target 20%', context: 'Last 30 days. Community posts get the best saves rate (4.1%).',
  why: 'Cadence changes are set to Draft.', confidence: 77, link: '/strategy/pillars',
  preview: { type: 'plan', title: 'Proposed change', lines: ['Add 2 customer-photo posts per week on Instagram', 'Replace 1 product post per week on Facebook', 'Community reaches 19% within 3 weeks'] },
  sage: { change: { add: { instagram: 2, facebook: -1 } } },
}

/** Sage's scripted events. `order` places each one in the shared feed (see the registry). */
export const SCRIPT: ScriptEvent[] = [
  {
    id: 'ev-trail-goal', order: 140, history: true, label: 'Sage · Trail Week ahead of goal', always: true,
    handoff: { agent: 'sage', kind: 'decision', urgency: 'week', topic: 'Campaign', action: 'sage-plan',
      title: 'Trail Week is at 128% of its trajectory on day 2', context: '154 sign-ups vs 120 expected. TikTok drives 61% of them.',
      why: 'Goal changes are your call.', confidence: 79, link: '/strategy/campaigns/trail-week',
      options: [{ label: 'Raise the goal from 300 to 360 sign-ups', recommended: true }, { label: 'Keep 300 and save the budget' }],
      sage: { campaign: 'trail-week', goal: 360 } },
  },
  {
    // Results come in under the plan: Sage proposes moving posts (Desk card on Draft, applied on Act).
    id: 'ev-trajectory', order: 205, label: 'Sage · Campaign below its trajectory', history: true,
    run: s => {
      const c = s.strategy.campaigns.find(x => x.status === 'live' && x.actual.length < 9)
      return c ? trackCampaigns(s, now(s), { id: c.id, ratio: 0.78 }) : s
    },
  },
  {
    id: 'ev-pillar', order: 260, label: 'Sage · Community pillar under target', handoff: PILLAR_CARD,
    run: (s, manual) => {
      const seen = s.handoffs.some(h => h.ref === 'ev-pillar') || s.desk.done.some(x => x.title === PILLAR_CARD.title)
      if (seen && !manual) return s
      if (actionOf(s, 'sage', 'sage-cadence')?.autonomy !== 'act') return pushHandoff(s, structuredClone(PILLAR_CARD))
      // On Act, Sage does it: the same path as an approval, with its own Undo.
      const next = onResolveStrategy(s, { ...PILLAR_CARD, id: 'ev-pillar-act', at: 0 }, { kind: 'approve' })
      return { ...next, log: next.log.map((l, i) => (i === 0 ? { ...l, text: 'Added 2 Instagram posts a week for Community, 1 fewer on Facebook', status: 'done', reason: 'Cadence, set to Act', undoUntil: l.at + 30 * 60_000, sage: { ...l.sage, card: undefined } } : l)) }
    },
  },
]
