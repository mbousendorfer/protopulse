import type { ScriptEvent } from '../../data/script'
import { captionsScript, videoScript } from './slice'

/** Juno's scripted events. `order` places each one in the shared feed (see the registry). */
export const SCRIPT: ScriptEvent[] = [
  { id: 'ev-video-gr20', order: 30, label: 'Juno · new YouTube upload: Storm Jacket on the GR20', agent: 'juno', ...videoScript('gr20') },
  // Juno re-reads the captions of the clips waiting for review against the Playbook: fixes (Act), a card (Draft) or flags (Suggest).
  { id: 'ev-video-captions', order: 80, label: 'Juno · product names misheard in captions', agent: 'juno', ...captionsScript },
]
