import type { ScriptEvent } from '../../data/script'
import { videoScript } from './slice'

/** Juno's scripted events. `order` places each one in the shared feed (see the registry). */
export const SCRIPT: ScriptEvent[] = [
  { id: 'ev-video-gr20', order: 30, label: 'Juno · new YouTube upload: Storm Jacket on the GR20', agent: 'juno', ...videoScript('gr20') },
  {
    id: 'ev-video-captions', order: 80, label: 'Juno · product names fixed in captions', agent: 'juno',
    handoff: { agent: 'juno', kind: 'approval', urgency: 'week', topic: 'Captions', action: 'juno-captions',
      title: 'Fix “Ridge 28” to “Ridge 28L” in 3 captions', context: 'The narrator says “Ridge 28L”, the speech-to-text heard “Ridge 28”.',
      why: 'Caption fixes are set to Draft.', confidence: 93, link: '/video', sources: [{ label: 'Ridge 28L · €140', from: 'Playbook facts' }] },
    auto: { text: 'Fixed “Ridge 28” → “Ridge 28L” in 3 captions', reason: 'Caption fixes, set to Act', link: '/video' },
  },
]
