import type { ScriptEvent } from '../../data/script'
import { agentOf } from '../../app/core'
import { actOn, ideaScript } from './slice'
import { PLAIN_LINK, failXPost, retriesAlone } from './failures'
import { betterSlots, movesAlone, slotCard } from './slots'
import { canFill, fillQueues } from './queues'
import { hhmm } from '../../app/time'

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
  {
    // A post sits far from its network's best hour: Atlas moves it within the day (Act), or asks (Draft), or points it out (Suggest).
    id: 'ev-slot', order: 130, label: 'Atlas · a better slot, same day', agent: 'atlas', tag: 'slot',
    run: (s, manual) => {
      if (!manual && agentOf(s, 'atlas').status !== 'on') return s
      const m = betterSlots(s)[0]
      if (!m) return s
      const next = slotCard(s, m)
      return movesAlone(next) ? actOn(next, next.handoffs[0], `Moved “${m.post.text.length > 44 ? `${m.post.text.slice(0, 40)}…` : m.post.text}” from ${hhmm(m.post.at)} to ${hhmm(m.at)}`, m.reason) : next
    },
  },
  {
    // Atlas keeps the queues filled two weeks ahead: scheduled on Act, on the Desk otherwise.
    id: 'ev-queue', order: 170, label: 'Atlas · fill the queues for the next 2 weeks', agent: 'atlas', tag: 'queue',
    run: (s, manual) => (canFill(s, manual) ? fillQueues(s, { why: 'Atlas keeps the queues filled two weeks ahead.' }) : s),
  },
  { id: 'ev-idea-gap', order: 160, label: 'Atlas · empty day in the calendar (gap idea)', agent: 'atlas', ...ideaScript({ origin: 'gap', agent: 'atlas' }) },
  {
    // X refuses a post: it turns Failed with the cause. On Act, Atlas retries with the plain link and says so; otherwise a card asks.
    id: 'ev-x-fail', order: 200, label: 'Atlas · X rejected a post', always: true, agent: 'atlas', tag: 'failed post',
    run: (s, manual) => {
      if (!manual && agentOf(s, 'atlas').status !== 'on') return s
      const r = failXPost(s)
      const h = r.card && retriesAlone(r.s) ? r.s.handoffs.find(x => x.id === r.card) : undefined
      return h ? actOn(r.s, h, `X refused the ${h.title.match(/\d\d:\d\d/)?.[0] ?? ''} post; retried with ${PLAIN_LINK} and it’s live`, 'Undo takes it down from X and puts it back as Failed.') : r.s
    },
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
