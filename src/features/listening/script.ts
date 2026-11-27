import type { ScriptEvent } from '../../data/script'
import { ideaScript } from '../publishing/slice'
import { creatorEvent, raiseSpike } from './slice'

/** Echo's scripted events. `order` places each one in the shared feed (see the registry). */
export const SCRIPT: ScriptEvent[] = [
  // The mentions land in the feed, then Echo's spike guardrail decides what reaches you (see raiseSpike).
  { id: 'ev-spike', order: 20, label: 'Echo · negative spike (seams leak)', agent: 'echo', always: true, tag: 'spike', run: (s, manual) => raiseSpike(s, manual) },
  {
    id: 'ev-trailkind', order: 90, label: 'Echo · Trailkind viral reel',
    handoff: { agent: 'echo', kind: 'decision', urgency: 'today', topic: 'Competitor', action: 'echo-counter',
      title: 'Trailkind’s “bag vs. rain” reel hit 1.2M views', context: 'Posted yesterday 19:00. Uses a 2-second hook and a split screen.',
      why: 'Viral competitor post in your category. Counter-moves are set to Suggest.', confidence: 76, link: '/listening?kind=events',
      options: [{ label: 'Atlas tests the same format with the Ridge', recommended: true }, { label: 'Add to Echo’s lessons only' }, { label: 'Nothing to do' }] },
    auto: { text: 'Asked Atlas to test the split-screen format with the Ridge', reason: 'Counter-moves, set to Act', link: '/listening?kind=events' },
  },
  { id: 'ev-idea-urgent', order: 100, label: 'Echo · first snow, post tonight (urgent idea)', agent: 'echo', ...ideaScript({ origin: 'urgent', agent: 'echo', seeds: ['first-snow'] }) },
  { id: 'ev-creator-fit', order: 175, label: 'Echo · creator worth a collab (@jeanne.paris)', agent: 'echo', tag: 'creator', run: (s, manual) => creatorEvent(s, manual) },
  {
    id: 'ev-norro', order: 180, label: 'Echo · Norrø repair programme',
    handoff: { agent: 'echo', kind: 'decision', urgency: 'week', topic: 'Competitor', action: 'echo-counter',
      title: 'Norrø launches a lifetime repair programme', context: 'Announced on LinkedIn and Instagram. Free repairs on all bags, forever.',
      why: 'Competes with your repair programme. Counter-moves are set to Suggest.', confidence: 74, link: '/listening?kind=events',
      options: [{ label: 'Brief Sage: a “Repair Week” campaign in January', recommended: true }, { label: 'Atlas posts our repair numbers (1,200 bags fixed)' }, { label: 'Tell the sales team' }] },
    auto: { text: 'Briefed Sage on a Repair Week response', reason: 'Counter-moves, set to Act', link: '/strategy' },
  },
  {
    id: 'ev-trend-repair', order: 220, label: 'Echo · “repair over replace” trend',
    handoff: { agent: 'echo', kind: 'approval', urgency: 'week', topic: 'Trend', action: 'echo-trend', chain: ['echo'],
      title: 'Hand “repair over replace” to Atlas?', context: '+60% this month on LinkedIn and Instagram. Matches your repair pillar.',
      why: 'Handing trends to Atlas is set to Draft.', confidence: 82, link: '/listening?kind=trends' },
    auto: { text: 'Handed “repair over replace” to Atlas', reason: 'Trends, set to Act', link: '/listening?kind=trends' },
  },
  {
    id: 'ev-basecamp', order: 230, label: 'Echo · Basecamp Co. recall',
    handoff: { agent: 'echo', kind: 'decision', urgency: 'today', topic: 'Competitor', action: 'echo-counter',
      title: 'Basecamp Co. recalls 8,000 water bottles', context: 'BPA found in the lid. National news since 07:30.',
      why: 'Your Summit Bottle is the obvious alternative. Talking about a rival’s recall is sensitive.', confidence: 70, link: '/listening?kind=events',
      options: [{ label: 'Nova answers bottle safety questions with our lab results', recommended: true }, { label: 'Atlas posts our materials page, without naming them' }, { label: 'Nothing to do' }] },
  },
]
