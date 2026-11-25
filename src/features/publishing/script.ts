import type { ScriptEvent } from '../../data/script'
import { ideaScript } from './slice'

/** Atlas's scripted events. `order` places each one in the shared feed (see the registry). */
export const SCRIPT: ScriptEvent[] = [
  {
    id: 'ev-recycle', order: 40, label: 'Atlas · recycle the drop-test reel',
    handoff: { agent: 'atlas', kind: 'approval', urgency: 'today', topic: 'Recycle', action: 'atlas-recycle',
      title: 'Recycle the “drop test” reel for Instagram', context: '210k views on TikTok in October. Instagram never saw it.',
      why: 'Recycling is set to Draft.', confidence: 79, link: '/publishing/calendar',
      preview: { type: 'post', network: 'instagram', slot: 'Thu 27, 18:00', media: 'bottle', text: ['We dropped it from 3 metres. Then from 5. The bottle is fine, the floor isn’t.'] } },
    auto: { text: 'Rewrote the “drop test” reel and scheduled it Thursday 18:00 on Instagram', reason: 'Recycling, set to Act', link: '/publishing/calendar' },
  },
  {
    id: 'ev-fill', order: 120, label: 'Atlas · empty Saturday slot',
    handoff: { agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Empty slot', action: 'atlas-fill',
      title: 'Saturday 10:00 on Instagram is empty', context: 'Atlas wrote a Community pillar post from a customer photo you liked.',
      why: 'Filling empty slots is set to Draft.', confidence: 81, link: '/publishing/calendar',
      preview: { type: 'post', network: 'instagram', slot: 'Sat 29, 10:00', media: 'lake', text: ['Sunrise at Lac Blanc by @julien_trail. Ridge 28L, 4:30 alarm, zero regrets.'] } },
    auto: { text: 'Filled Saturday 10:00 on Instagram with @julien_trail’s Lac Blanc photo', reason: 'Empty slots, set to Act', link: '/publishing/calendar' },
  },
  { id: 'ev-idea-gap', order: 160, label: 'Atlas · empty day in the calendar (gap idea)', agent: 'atlas', ...ideaScript({ origin: 'gap', agent: 'atlas' }) },
  {
    id: 'ev-x-fail', order: 200, label: 'Atlas · X rejected a post', always: true,
    handoff: { agent: 'atlas', kind: 'alert', urgency: 'today', topic: 'Publishing failed', action: 'atlas-slot',
      title: 'X rejected today’s 12:00 post', context: 'The link to fernway.co/trail-week was flagged as a possible redirect.',
      why: 'Publishing failures always reach you.', confidence: 97, link: '/publishing/calendar',
      options: [{ label: 'Retry with a plain link', recommended: true }, { label: 'Publish without the link' }, { label: 'Skip X today' }] },
  },
  { id: 'ev-idea-weekly', order: 240, label: 'Atlas · Thursday: ideas for next week', agent: 'atlas', ...ideaScript({ origin: 'weekly', agent: 'atlas', seeds: ['fleece-city', 'bottle-bifl', 'zip-flaw', 'staff-picks', 'hook-test', 'support-sunday'] }) },
  {
    id: 'ev-rule-tiktok', order: 270, history: true, label: 'Atlas · rule proposal (short TikTok captions)', always: true,
    rule: { text: 'Keep TikTok captions under 100 characters', agents: ['atlas'] },
    handoff: { agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Playbook rule',
      title: 'New rule? “Keep TikTok captions under 100 characters”', context: 'You shortened 8 of my last 10 TikTok captions.',
      why: 'Same edit repeated 8 times in 3 weeks.', confidence: 86, link: '/agents/atlas?tab=rules' },
  },
]
