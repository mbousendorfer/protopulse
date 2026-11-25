import type { ScriptEvent } from '../../data/script'

/** Sage's scripted events. `order` places each one in the shared feed (see the registry). */
export const SCRIPT: ScriptEvent[] = [
  {
    id: 'ev-trail-goal', order: 140, history: true, label: 'Sage · Trail Week ahead of goal', always: true,
    handoff: { agent: 'sage', kind: 'decision', urgency: 'week', topic: 'Campaign', action: 'sage-plan',
      title: 'Trail Week is at 128% of its trajectory on day 2', context: '154 sign-ups vs 120 expected. TikTok drives 61% of them.',
      why: 'Goal changes are your call.', confidence: 79, link: '/strategy/campaigns/trail-week',
      options: [{ label: 'Raise the goal from 300 to 360 sign-ups', recommended: true }, { label: 'Keep 300 and save the budget' }] },
  },
  {
    id: 'ev-pillar', order: 260, label: 'Sage · Community pillar under target',
    handoff: { agent: 'sage', kind: 'approval', urgency: 'week', topic: 'Pillars', action: 'sage-cadence', chain: ['iris', 'sage'],
      title: 'Community pillar at 9% of posts, target 20%', context: 'Last 30 days. Community posts get the best saves rate (4.1%).',
      why: 'Cadence changes are set to Draft.', confidence: 77, link: '/strategy/pillars',
      preview: { type: 'plan', title: 'Proposed change', lines: ['Add 2 customer-photo posts per week on Instagram', 'Replace 1 product post per week on Facebook', 'Community reaches 19% within 3 weeks'] } },
    auto: { text: 'Added 2 Community posts per week to the cadence', reason: 'Cadence, set to Act', link: '/strategy/pillars' },
  },
]
