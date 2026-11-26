import type { ScriptEvent } from '../../data/script'
import { captionsScript, moreMomentsScript, trialScript, videoScript } from './slice'

/** Juno's scripted events. `order` places each one in the shared feed (see the registry). */
export const SCRIPT: ScriptEvent[] = [
  { id: 'ev-video-gr20', order: 30, label: 'Juno · new YouTube upload: Storm Jacket on the GR20', agent: 'juno', ...videoScript('gr20') },
  // Juno re-reads the captions of the clips waiting for review against the Playbook: fixes (Act), a card (Draft) or flags (Suggest).
  // More moments from the strap video: with the 2 already out this week, sending them all runs into the 5-a-week quota.
  { id: 'ev-video-more', order: 85, label: 'Juno · 4 more moments in the strap video', agent: 'juno', ...moreMomentsScript },
  // Moderator only (a no-op in the feed): a hook trial ends now; the third win of a hook with a number brings the rule card.
  { id: 'ev-video-trial', order: 87, label: 'Juno · hook trial results are in', agent: 'juno', ...trialScript },
  { id: 'ev-video-captions', order: 80, label: 'Juno · product names misheard in captions', agent: 'juno', ...captionsScript },
]
