import type { ScriptEvent } from '../../data/script'
import { ideaScript } from '../publishing/slice'

/** Iris's scripted events. `order` places each one in the shared feed (see the registry). */
export const SCRIPT: ScriptEvent[] = [
  { id: 'ev-idea-signal', order: 50, label: 'Iris · knots carousel saved again (idea)', agent: 'iris', ...ideaScript({ origin: 'continuous', agent: 'iris', seeds: ['knots-winter'] }) },
  {
    id: 'ev-linkedin', order: 70, label: 'Iris · LinkedIn follower spike', always: true,
    handoff: { agent: 'iris', kind: 'alert', urgency: 'week', topic: 'Anomaly', action: 'iris-anomaly',
      title: 'LinkedIn followers +420 in a day', context: 'The repair programme post was shared by the Green Gear newsletter (38k readers).',
      why: '5× the usual daily growth.', confidence: 84, link: '/insights/anomalies',
      options: [{ label: 'Ask Atlas for a follow-up post', recommended: true }, { label: 'Nice, no action' }],
      preview: { type: 'metric', label: 'New LinkedIn followers per day', value: '+420', delta: '5.2× usual', series: [72, 80, 65, 90, 77, 84, 420] } },
  },
]
