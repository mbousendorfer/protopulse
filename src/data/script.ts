import type { AgentId, Handoff } from '../app/types'
import type { IdeaOrigin } from './ideas'

/**
 * Scripted events the agents produce while the demo runs.
 * - If `always` is false and the agent's action is set to Act, the event becomes a journal entry (`auto`) instead of a Desk card.
 * - `rule` events carry a Playbook rule proposal, added when approved.
 * - `idea` events bring Atlas ideas: a signal (continuous), Thursday's batch (weekly), a short window (urgent, also on the Desk), an empty day (gap).
 */
export type ScriptEvent = {
  id: string
  label: string
  always?: boolean
  /** Who raises it (shown in the moderator panel). */
  agent?: AgentId
  /** An idea arrives in Publishing › Ideas instead of a Desk card (urgent ones also reach the Desk). */
  idea?: { seeds?: string[]; origin: IdeaOrigin; agent: AgentId }
  handoff?: Omit<Handoff, 'id' | 'at'>
  auto?: { text: string; reason: string; link?: string }
  rule?: { text: string; agents: Handoff['agent'][] }
}

export const SCRIPT: ScriptEvent[] = [
  {
    id: 'ev-colour', label: 'Nova · wrong colour delivered',
    handoff: { agent: 'nova', kind: 'approval', urgency: 'today', topic: 'Complaint', action: 'nova-complaint',
      title: 'Wrong colour delivered: Moss instead of Ember', context: 'Instagram DM from @anais.trek, order #48390.',
      why: 'Complaint. Complaints are set to Draft.', confidence: 88, rules: ['Apologise once, then fix'], link: '/inbox',
      sources: [{ label: 'Order #48390 · Ridge 28L Ember', from: 'Shopify' }, { label: 'Express to Lyon: 2 days', from: 'Playbook facts' }],
      preview: { type: 'reply', network: 'instagram', author: '@anais.trek', text: 'I ordered Ember and got Moss 😕 I wanted it for Saturday.',
        draft: ['Anaïs, sorry for the mix-up. Ember ships today by express, so you’ll have it ', { text: 'by Friday', note: 'Express to Lyon is usually 2 days. Friday is likely but not guaranteed.' }, '. Keep the Moss one or send it back with the label we just emailed.'],
        attachments: ['Exchange: Ridge 28L Moss → Ember, express · €0 · within your €150 limit'] } },
    auto: { text: 'Answered @anais.trek and sent an Ember exchange by express', reason: 'Complaint, set to Act', link: '/inbox' },
  },
  {
    id: 'ev-spike', label: 'Echo · negative spike (seams leak)', always: true,
    handoff: { agent: 'echo', kind: 'alert', urgency: 'urgent', topic: 'Negative spike', action: 'echo-spike',
      title: '27 negative mentions in 40 minutes about Storm Jacket seams', context: 'A Reddit thread says the seams leak after 3 washes. Shared twice on X.',
      why: '3× the usual negative volume in under an hour.', confidence: 73, link: '/listening/mentions',
      options: [{ label: 'Pause Atlas and ask Claire for a statement', recommended: true }, { label: 'Nova sends the care-instructions reply to each mention' }, { label: 'Monitor for 2 hours' }],
      preview: { type: 'metric', label: 'Negative mentions per hour', value: '41', delta: '3.4× usual', down: true, series: [3, 4, 2, 5, 3, 4, 6, 12, 27, 41] } },
  },
  {
    id: 'ev-recycle', label: 'Atlas · recycle the drop-test reel',
    handoff: { agent: 'atlas', kind: 'approval', urgency: 'today', topic: 'Recycle', action: 'atlas-recycle',
      title: 'Recycle the “drop test” reel for Instagram', context: '210k views on TikTok in October. Instagram never saw it.',
      why: 'Recycling is set to Draft.', confidence: 79, link: '/publishing/calendar',
      preview: { type: 'post', network: 'instagram', slot: 'Thu 27, 18:00', media: 'bottle', text: ['We dropped it from 3 metres. Then from 5. The bottle is fine, the floor isn’t.'] } },
    auto: { text: 'Rewrote the “drop test” reel and scheduled it Thursday 18:00 on Instagram', reason: 'Recycling, set to Act', link: '/publishing/calendar' },
  },
  { id: 'ev-idea-signal', label: 'Iris · knots carousel saved again (idea)', agent: 'iris', idea: { origin: 'continuous', agent: 'iris', seeds: ['knots-winter'] } },
  {
    id: 'ev-stove', label: 'Nova · safety question (stove clip)', always: true,
    handoff: { agent: 'nova', kind: 'decision', urgency: 'urgent', topic: 'Safety', action: 'nova-sensitive',
      title: 'A customer says the stove clip broke during a climb', context: 'Facebook comment from Pierre Vasseur. Mentions a fall, no injury stated.',
      why: 'Safety topics are locked: always a person.', confidence: 94, link: '/inbox',
      options: [{ label: 'Nova sends the safety holding reply and I call him', recommended: true }, { label: 'Forward to Claire and the product team' }, { label: 'I’ll reply myself' }] },
  },
  {
    id: 'ev-linkedin', label: 'Iris · LinkedIn follower spike', always: true,
    handoff: { agent: 'iris', kind: 'alert', urgency: 'week', topic: 'Anomaly', action: 'iris-anomaly',
      title: 'LinkedIn followers +420 in a day', context: 'The repair programme post was shared by the Green Gear newsletter (38k readers).',
      why: '5× the usual daily growth.', confidence: 84, link: '/insights/anomalies',
      options: [{ label: 'Ask Atlas for a follow-up post', recommended: true }, { label: 'Nice, no action' }],
      preview: { type: 'metric', label: 'New LinkedIn followers per day', value: '+420', delta: '5.2× usual', series: [72, 80, 65, 90, 77, 84, 420] } },
  },
  {
    id: 'ev-trailkind', label: 'Echo · Trailkind viral reel',
    handoff: { agent: 'echo', kind: 'decision', urgency: 'today', topic: 'Competitor', action: 'echo-counter',
      title: 'Trailkind’s “bag vs. rain” reel hit 1.2M views', context: 'Posted yesterday 19:00. Uses a 2-second hook and a split screen.',
      why: 'Viral competitor post in your category. Counter-moves are set to Suggest.', confidence: 76, link: '/listening/competitors',
      options: [{ label: 'Atlas tests the same format with the Ridge', recommended: true }, { label: 'Add to Echo’s lessons only' }, { label: 'Nothing to do' }] },
    auto: { text: 'Asked Atlas to test the split-screen format with the Ridge', reason: 'Counter-moves, set to Act', link: '/listening/competitors' },
  },
  { id: 'ev-idea-urgent', label: 'Echo · first snow, post tonight (urgent idea)', agent: 'echo', idea: { origin: 'urgent', agent: 'echo', seeds: ['first-snow'] } },
  {
    id: 'ev-german', label: 'Nova · German warranty question',
    handoff: { agent: 'nova', kind: 'approval', urgency: 'today', topic: 'Product question', action: 'nova-faq',
      title: 'Warranty question in German', context: 'YouTube comment. The Playbook has no German phrasing yet.',
      why: 'Low confidence on tone in German.', confidence: 58, link: '/inbox',
      sources: [{ label: 'Lifetime warranty: bottles only', from: 'Playbook facts' }],
      preview: { type: 'reply', network: 'youtube', author: 'Jonas K.', text: 'Gilt die Garantie auch in Deutschland?', draft: ['Ja, Jonas! Die ', { text: 'lebenslange Garantie', note: 'Lifetime warranty covers bottles only, not bags.' }, ' gilt überall, auch in Deutschland.'] } },
    auto: { text: 'Answered Jonas K. about the warranty, in German', reason: 'Product question, set to Act', link: '/inbox' },
  },
  {
    id: 'ev-fill', label: 'Atlas · empty Saturday slot',
    handoff: { agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Empty slot', action: 'atlas-fill',
      title: 'Saturday 10:00 on Instagram is empty', context: 'Atlas wrote a Community pillar post from a customer photo you liked.',
      why: 'Filling empty slots is set to Draft.', confidence: 81, link: '/publishing/calendar',
      preview: { type: 'post', network: 'instagram', slot: 'Sat 29, 10:00', media: 'lake', text: ['Sunrise at Lac Blanc by @julien_trail. Ridge 28L, 4:30 alarm, zero regrets.'] } },
    auto: { text: 'Filled Saturday 10:00 on Instagram with @julien_trail’s Lac Blanc photo', reason: 'Empty slots, set to Act', link: '/publishing/calendar' },
  },
  {
    id: 'ev-promo-exchange', label: 'Nova · promotion request (exchanges)', always: true,
    handoff: { agent: 'nova', kind: 'promotion', urgency: 'today', topic: 'Autonomy',
      title: 'Nova wants to send exchanges on her own', context: 'You approved 19 of her last 22 exchanges without changes.',
      why: 'Above 85% for 4 weeks, no exchange undone.', confidence: 88, promote: { action: 'nova-exchange', from: 'draft', to: 'act' },
      preview: { type: 'evidence', lines: ['19 approved unchanged · 2 edited (shipping speed) · 1 rejected (out of stock)', 'Average exchange value: €96, limit stays at €150', 'No exchange undone in 30 days'] } },
  },
  {
    id: 'ev-trail-goal', label: 'Sage · Trail Week ahead of goal', always: true,
    handoff: { agent: 'sage', kind: 'decision', urgency: 'week', topic: 'Campaign', action: 'sage-plan',
      title: 'Trail Week is at 128% of its trajectory on day 2', context: '154 sign-ups vs 120 expected. TikTok drives 61% of them.',
      why: 'Goal changes are your call.', confidence: 79, link: '/strategy/campaigns/trail-week',
      options: [{ label: 'Raise the goal from 300 to 360 sign-ups', recommended: true }, { label: 'Keep 300 and save the budget' }] },
  },
  {
    id: 'ev-google', label: 'Nova · 1-star Google review',
    handoff: { agent: 'nova', kind: 'approval', urgency: 'today', topic: 'Review', action: 'nova-reviews',
      title: '1-star Google review: “rude staff at the Annecy shop”', context: 'From Martine L. The Annecy pop-up closed in October.',
      why: 'Review replies are set to Draft. The facts may be wrong.', confidence: 61, link: '/inbox',
      preview: { type: 'reply', network: 'google', author: 'Martine L. · ★', text: 'Staff were rude when I asked about returns. Never again.',
        draft: ['Martine, we’re sorry your visit went badly. ', { text: 'Our Annecy pop-up closed in October', note: 'Is she talking about a reseller? Check before stating this publicly.' }, ', so could you tell us where this happened? We’d like to make it right: support@fernway.co.'] } },
    auto: { text: 'Replied to Martine L.’s Google review and asked where it happened', reason: 'Reviews, set to Act', link: '/inbox' },
  },
  { id: 'ev-idea-gap', label: 'Atlas · empty day in the calendar (gap idea)', agent: 'atlas', idea: { origin: 'gap', agent: 'atlas' } },
  {
    id: 'ev-demote', label: 'Nova · steps back on refunds', always: true,
    handoff: { agent: 'nova', kind: 'promotion', urgency: 'today', topic: 'Autonomy',
      title: 'Nova will go back to drafting shipping refunds', context: 'You undid 2 of her shipping refunds in the last 24 hours.',
      why: 'Two undos on the same action in a day.', confidence: 90, promote: { action: 'nova-refund', from: 'act', to: 'draft' },
      preview: { type: 'evidence', lines: ['Undone: €12.50 to Hugo Lambert (order already refunded by support)', 'Undone: €9.90 to Inès Moreau (paid shipping was waived)', 'Nova will check support’s refund log before proposing'] } },
  },
  {
    id: 'ev-norro', label: 'Echo · Norrø repair programme',
    handoff: { agent: 'echo', kind: 'decision', urgency: 'week', topic: 'Competitor', action: 'echo-counter',
      title: 'Norrø launches a lifetime repair programme', context: 'Announced on LinkedIn and Instagram. Free repairs on all bags, forever.',
      why: 'Competes with your repair programme. Counter-moves are set to Suggest.', confidence: 74, link: '/listening/competitors',
      options: [{ label: 'Brief Sage: a “Repair Week” campaign in January', recommended: true }, { label: 'Atlas posts our repair numbers (1,200 bags fixed)' }, { label: 'Tell the sales team' }] },
    auto: { text: 'Briefed Sage on a Repair Week response', reason: 'Counter-moves, set to Act', link: '/strategy' },
  },
  {
    id: 'ev-rule-emoji', label: 'Nova · rule proposal (emojis on LinkedIn)', always: true,
    rule: { text: 'No emojis in LinkedIn replies', agents: ['nova', 'atlas'] },
    handoff: { agent: 'nova', kind: 'approval', urgency: 'week', topic: 'Playbook rule',
      title: 'New rule? “No emojis in LinkedIn replies”', context: 'You removed emojis from 9 of my last 10 LinkedIn drafts.',
      why: 'Same edit repeated 9 times in 2 weeks.', confidence: 90, link: '/playbook' },
  },
  {
    id: 'ev-x-fail', label: 'Atlas · X rejected a post', always: true,
    handoff: { agent: 'atlas', kind: 'alert', urgency: 'today', topic: 'Publishing failed', action: 'atlas-slot',
      title: 'X rejected today’s 12:00 post', context: 'The link to fernway.co/trail-week was flagged as a possible redirect.',
      why: 'Publishing failures always reach you.', confidence: 97, link: '/publishing/calendar',
      options: [{ label: 'Retry with a plain link', recommended: true }, { label: 'Publish without the link' }, { label: 'Skip X today' }] },
  },
  {
    id: 'ev-intent', label: 'Nova · buying intent DM',
    handoff: { agent: 'nova', kind: 'approval', urgency: 'today', topic: 'Buying intent', action: 'nova-faq',
      title: '@maelle.rando asks which bag for a 4-day trek', context: 'Instagram DM. Buying intent score 0.86.',
      why: 'Product questions with product links are checked first this week.', confidence: 83, link: '/inbox',
      sources: [{ label: 'Largest bag in the catalog: Ridge 28L', from: 'Product catalog' }],
      preview: { type: 'reply', network: 'instagram', author: '@maelle.rando', text: 'Hi! Ridge 28L or something bigger for 4 days with a tent?',
        draft: ['For 4 days with a tent you’ll want more room than the Ridge 28L. The ', { text: 'Ridge 40L', note: 'Not in the catalog. The largest bag is the Ridge 28L.' }, ' launches in March. Until then, the 28L plus the side straps works if you pack light.'] } },
    auto: { text: 'Answered @maelle.rando with packing advice and the Ridge link', reason: 'Product question, set to Act', link: '/inbox' },
  },
  {
    id: 'ev-trend-repair', label: 'Echo · “repair over replace” trend',
    handoff: { agent: 'echo', kind: 'approval', urgency: 'week', topic: 'Trend', action: 'echo-trend', chain: ['echo'],
      title: 'Hand “repair over replace” to Atlas?', context: '+60% this month on LinkedIn and Instagram. Matches your repair pillar.',
      why: 'Handing trends to Atlas is set to Draft.', confidence: 82, link: '/listening/trends' },
    auto: { text: 'Handed “repair over replace” to Atlas', reason: 'Trends, set to Act', link: '/listening/trends' },
  },
  {
    id: 'ev-basecamp', label: 'Echo · Basecamp Co. recall',
    handoff: { agent: 'echo', kind: 'decision', urgency: 'today', topic: 'Competitor', action: 'echo-counter',
      title: 'Basecamp Co. recalls 8,000 water bottles', context: 'BPA found in the lid. National news since 07:30.',
      why: 'Your Summit Bottle is the obvious alternative. Talking about a rival’s recall is sensitive.', confidence: 70, link: '/listening/competitors',
      options: [{ label: 'Nova answers bottle safety questions with our lab results', recommended: true }, { label: 'Atlas posts our materials page, without naming them' }, { label: 'Nothing to do' }] },
  },
  { id: 'ev-idea-weekly', label: 'Atlas · Thursday: ideas for next week', agent: 'atlas', idea: { origin: 'weekly', agent: 'atlas', seeds: ['fleece-city', 'bottle-bifl', 'zip-flaw', 'staff-picks', 'hook-test', 'support-sunday'] } },
  {
    id: 'ev-collab', label: 'Nova · creator collab request', always: true,
    handoff: { agent: 'nova', kind: 'decision', urgency: 'today', topic: 'Creator', action: 'nova-sensitive',
      title: 'A 120k-follower creator asks for a paid collab', context: '@theo.wild, outdoor and van life. Asks for €1,800 for 3 reels.',
      why: 'Creators above 50k always go to you.', confidence: 91, link: '/inbox',
      options: [{ label: 'Ask Claire about the budget', recommended: true }, { label: 'Offer gear instead of a fee' }, { label: 'Decline politely' }] },
  },
  {
    id: 'ev-pillar', label: 'Sage · Community pillar under target',
    handoff: { agent: 'sage', kind: 'approval', urgency: 'week', topic: 'Pillars', action: 'sage-cadence', chain: ['iris', 'sage'],
      title: 'Community pillar at 9% of posts, target 20%', context: 'Last 30 days. Community posts get the best saves rate (4.1%).',
      why: 'Cadence changes are set to Draft.', confidence: 77, link: '/strategy/pillars',
      preview: { type: 'plan', title: 'Proposed change', lines: ['Add 2 customer-photo posts per week on Instagram', 'Replace 1 product post per week on Facebook', 'Community reaches 19% within 3 weeks'] } },
    auto: { text: 'Added 2 Community posts per week to the cadence', reason: 'Cadence, set to Act', link: '/strategy/pillars' },
  },
  {
    id: 'ev-rule-tiktok', label: 'Atlas · rule proposal (short TikTok captions)', always: true,
    rule: { text: 'Keep TikTok captions under 100 characters', agents: ['atlas'] },
    handoff: { agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Playbook rule',
      title: 'New rule? “Keep TikTok captions under 100 characters”', context: 'You shortened 8 of my last 10 TikTok captions.',
      why: 'Same edit repeated 8 times in 3 weeks.', confidence: 86, link: '/playbook' },
  },
]

/** Claire's scripted replies, chosen by topic. */
export const CLAIRE: Record<string, { verdict: 'approve' | 'changes' | 'decline'; text: string }[]> = {
  Press: [{ verdict: 'approve', text: 'Thanks, I’ll call Marc myself. Send the holding reply now.' }],
  Boost: [{ verdict: 'changes', text: 'OK for €150, not more. Exclude existing customers from the audience.' }],
  Creator: [{ verdict: 'decline', text: 'Not this quarter. Offer gear and a shoutout instead.' }],
  'Weekly report': [{ verdict: 'approve', text: 'Clear, thanks. Can we talk about the TikTok dip on Thursday?' }],
  'Negative spike': [{ verdict: 'changes', text: 'Statement is fine, but remove the warranty mention until product confirms.' }],
  Safety: [{ verdict: 'approve', text: 'Call him today please, and log it for the product team.' }],
  Competitor: [{ verdict: 'decline', text: 'We don’t react to their prices. Let’s talk about durability on Thursday instead.' }],
  Campaign: [{ verdict: 'approve', text: 'Go for 360. Nice work.' }],
  default: [
    { verdict: 'approve', text: 'Go. Keep it short.' },
    { verdict: 'changes', text: 'Remove the price, legal hasn’t confirmed it yet.' },
    { verdict: 'decline', text: 'Not now, we’ll cover it in Thursday’s newsletter.' },
  ],
}
