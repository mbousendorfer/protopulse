import type { ScriptEvent } from '../../data/script'
import { actionOf, agentOf, pushHandoff } from '../../app/core'
import { escalate, escalationOf, handledAlone } from './slice'

/**
 * Same rules as the core's `fire`, plus two: the Playbook's escalations are checked first, and work done alone is a real
 * conversation in Handled by Nova (not only a journal line): on Act, or once the script has played, Nova answers.
 */
const arrive = (ev: ScriptEvent): ScriptEvent => {
  const { handoff, auto } = ev
  if (!handoff || ev.always || handoff.preview?.type !== 'reply') return ev
  return {
    ...ev, agent: 'nova',
    run: (s, manual) => {
      const hit = escalationOf(s, handoff)
      const seen = s.handoffs.some(h => h.ref === ev.id || h.title === handoff.title) || s.desk.done.some(x => x.title === handoff.title)
      if (seen && !manual) return auto && !hit ? handledAlone(s, handoff, auto) : s
      if (agentOf(s, 'nova').status !== 'on' && !manual) return s
      // The Playbook's escalations come first, whatever the action's level.
      if (hit) return escalate(s, handoff, hit, ev.id)
      if (auto && actionOf(s, 'nova', handoff.action)?.autonomy === 'act') return handledAlone(s, handoff, auto)
      return pushHandoff(s, { ...structuredClone(handoff), ref: handoff.ref ?? ev.id })
    },
  }
}

/** Nova's scripted events. `order` places each one in the shared feed (see the registry). */
export const SCRIPT: ScriptEvent[] = ([
  {
    id: 'ev-colour', order: 10, label: 'Nova · wrong colour delivered',
    handoff: { agent: 'nova', kind: 'approval', urgency: 'today', topic: 'Complaint', action: 'nova-complaint',
      title: 'Wrong colour delivered: Moss instead of Ember', context: 'Instagram DM from @anais.trek, order #48390.',
      conv: { type: 'dm', sentiment: 'negative', reply: 'Anaïs, sorry for the mix-up. Ember ships today by express, usually 2 days to Lyon. Keep the Moss one or send it back with the label we just emailed.' },
      why: 'Complaint. Complaints are set to Draft.', confidence: 88, rules: ['Apologise once, then fix'], link: '/inbox',
      sources: [{ label: 'Order #48390 · Ridge 28L Ember', from: 'Shopify' }, { label: 'Express to Lyon: 2 days', from: 'Playbook facts' }],
      preview: { type: 'reply', network: 'instagram', author: '@anais.trek', text: 'I ordered Ember and got Moss 😕 I wanted it for Saturday.',
        draft: ['Anaïs, sorry for the mix-up. Ember ships today by express, so you’ll have it ', { text: 'by Friday', note: 'Express to Lyon is usually 2 days. Friday is likely but not guaranteed.' }, '. Keep the Moss one or send it back with the label we just emailed.'],
        attachments: ['Exchange: Ridge 28L Moss → Ember, express · €0 · within your €150 limit'] } },
    auto: { text: 'Answered @anais.trek and sent an Ember exchange by express', reason: 'Complaint, set to Act', link: '/inbox' },
  },
  {
    id: 'ev-injury', order: 35, label: 'Nova · injury in a comment (escalation)',
    handoff: { agent: 'nova', kind: 'approval', urgency: 'today', topic: 'Complaint', action: 'nova-complaint',
      title: 'Hip belt buckle gave way on a descent', context: 'Instagram comment from @lucie.alpine under “Ridge 28L on the Écrins loop”.',
      why: 'Complaint. Complaints are set to Draft.', confidence: 84, link: '/inbox',
      conv: { type: 'comment', sentiment: 'negative', post: 'Reel · “Ridge 28L on the Écrins loop”' },
      preview: { type: 'reply', network: 'instagram', author: '@lucie.alpine', text: 'Fell on the descent when the hip belt buckle gave way, my knee is still swollen. Is this a known problem?',
        draft: ['Lucie, sorry about the buckle. A new hip belt ships today, free of charge.'], attachments: ['Replacement: Ridge hip belt · €25 · within your €150 limit'] } },
    auto: { text: 'Answered @lucie.alpine and sent a new hip belt', reason: 'Complaint, set to Act', link: '/inbox' },
  },
  {
    id: 'ev-stove', order: 60, label: 'Nova · safety question (stove clip)', always: true,
    handoff: { agent: 'nova', kind: 'decision', urgency: 'urgent', topic: 'Safety', action: 'nova-sensitive',
      title: 'A customer says the stove clip broke during a climb', context: 'Facebook comment from Pierre Vasseur. Mentions a fall, no injury stated.',
      why: 'Safety topics are locked: always a person.', confidence: 94, link: '/inbox/c-pierre', ref: 'c-pierre',
      options: [{ label: 'Nova sends the safety holding reply and I call him', recommended: true }, { label: 'Forward to Claire and the product team' }, { label: 'I’ll reply myself' }] },
  },
  {
    id: 'ev-german', order: 110, label: 'Nova · German warranty question',
    handoff: { agent: 'nova', kind: 'approval', urgency: 'today', topic: 'Product question', action: 'nova-faq',
      title: 'Warranty question in German', context: 'YouTube comment under “Ridge 28L: 1,000 km later”. The Playbook has no German phrasing yet.',
      why: 'Low confidence on tone in German.', confidence: 58, link: '/inbox',
      sources: [{ label: 'Lifetime warranty: bottles only', from: 'Playbook facts' }],
      conv: { type: 'comment', sentiment: 'neutral', post: 'YouTube · “Ridge 28L: 1,000 km later”', reply: 'Danke, Lena! Die lebenslange Garantie gilt für die Summit Bottle. Für den Ridge gibt es 5 Jahre Garantie und unser Reparaturprogramm, auch in Österreich.' },
      preview: { type: 'reply', network: 'youtube', author: 'Lena W.', text: 'Gilt die lebenslange Garantie auch für den Rucksack? Ich wohne in Österreich.', draft: ['Ja, Lena! Die ', { text: 'lebenslange Garantie', note: 'Lifetime warranty covers bottles only. The Ridge has 5 years.' }, ' gilt auch für den Ridge, überall in Europa.'] } },
    auto: { text: 'Answered Lena W. about the warranty, in German', reason: 'Product question, set to Act', link: '/inbox' },
  },
  {
    id: 'ev-promo-exchange', order: 130, history: true, label: 'Nova · promotion request (exchanges)', always: true,
    handoff: { agent: 'nova', kind: 'promotion', urgency: 'today', topic: 'Autonomy',
      title: 'Nova wants to send exchanges on her own', context: 'You approved 19 of her last 22 exchanges without changes.',
      why: 'Above 85% for 4 weeks, no exchange undone.', confidence: 88, promote: { action: 'nova-exchange', from: 'draft', to: 'act' },
      preview: { type: 'evidence', lines: ['19 approved unchanged · 2 edited (shipping speed) · 1 rejected (out of stock)', 'Average exchange value: €96, limit stays at €150', 'No exchange undone in 30 days'] } },
  },
  {
    id: 'ev-google', order: 150, label: 'Nova · 1-star Google review',
    handoff: { agent: 'nova', kind: 'approval', urgency: 'today', topic: 'Review', action: 'nova-reviews',
      title: '1-star Google review: “rude staff at the Annecy shop”', context: 'From Martine L. The Annecy pop-up closed in October.',
      conv: { type: 'review', sentiment: 'negative', stars: 1, reply: 'Martine, we’re sorry your visit went badly. Could you tell us where this happened? We’d like to make it right: support@fernway.co.' },
      why: 'Review replies are set to Draft. The facts may be wrong.', confidence: 61, link: '/inbox',
      preview: { type: 'reply', network: 'google', author: 'Martine L. · ★', text: 'Staff were rude when I asked about returns. Never again.',
        draft: ['Martine, we’re sorry your visit went badly. ', { text: 'Our Annecy pop-up closed in October', note: 'Is she talking about a reseller? Check before stating this publicly.' }, ', so could you tell us where this happened? We’d like to make it right: support@fernway.co.'] } },
    auto: { text: 'Replied to Martine L.’s Google review and asked where it happened', reason: 'Reviews, set to Act', link: '/inbox' },
  },
  {
    id: 'ev-demote', order: 170, history: true, label: 'Nova · steps back on refunds', always: true,
    handoff: { agent: 'nova', kind: 'promotion', urgency: 'today', topic: 'Autonomy',
      title: 'Nova will go back to drafting shipping refunds', context: 'You undid 2 of her shipping refunds in the last 24 hours.',
      why: 'Two undos on the same action in a day.', confidence: 90, promote: { action: 'nova-refund', from: 'act', to: 'draft' },
      preview: { type: 'evidence', lines: ['Undone: €12.50 to Hugo Lambert (order already refunded by support)', 'Undone: €9.90 to Inès Moreau (paid shipping was waived)', 'Nova will check support’s refund log before proposing'] } },
  },
  {
    id: 'ev-rule-emoji', order: 190, history: true, label: 'Nova · rule proposal (emojis on LinkedIn)', always: true,
    rule: { text: 'No emojis in LinkedIn replies', agents: ['nova', 'atlas'] },
    handoff: { agent: 'nova', kind: 'approval', urgency: 'week', topic: 'Playbook rule',
      title: 'New rule? “No emojis in LinkedIn replies”', context: 'You removed emojis from 9 of my last 10 LinkedIn drafts.',
      why: 'Same edit repeated 9 times in 2 weeks.', confidence: 90, link: '/agents/nova?tab=rules' },
  },
  {
    id: 'ev-intent', order: 210, label: 'Nova · buying intent DM',
    handoff: { agent: 'nova', kind: 'approval', urgency: 'today', topic: 'Buying intent', action: 'nova-faq',
      title: '@maelle.rando asks which bag for a 4-day trek', context: 'Instagram DM. Buying intent score 0.86.',
      conv: { type: 'dm', sentiment: 'neutral', intent: 0.86, reply: 'For 4 days with a tent, the Ridge 28L works if you pack light: use the side straps for the tent. It’s our largest bag today: fernway.co/ridge-28l' },
      why: 'Product questions with product links are checked first this week.', confidence: 83, link: '/inbox',
      sources: [{ label: 'Largest bag in the catalog: Ridge 28L', from: 'Product catalog' }],
      preview: { type: 'reply', network: 'instagram', author: '@maelle.rando', text: 'Hi! Ridge 28L or something bigger for 4 days with a tent?',
        draft: ['For 4 days with a tent you’ll want more room than the Ridge 28L. The ', { text: 'Ridge 40L', note: 'Not in the catalog. The largest bag is the Ridge 28L.' }, ' launches in March. Until then, the 28L plus the side straps works if you pack light.'] } },
    auto: { text: 'Answered @maelle.rando with packing advice and the Ridge link', reason: 'Product question, set to Act', link: '/inbox' },
  },
  {
    id: 'ev-collab', order: 250, label: 'Nova · creator collab request', always: true,
    handoff: { agent: 'nova', kind: 'decision', urgency: 'today', topic: 'Creator', action: 'nova-sensitive',
      title: 'A 120k-follower creator asks for a paid collab', context: '@theo.wild, outdoor and van life. Asks for €1,800 for 3 reels.',
      why: 'Creators above 50k always go to you.', confidence: 91, link: '/inbox/c-theo', ref: 'c-theo',
      options: [{ label: 'Ask Claire about the budget', recommended: true }, { label: 'Offer gear instead of a fee' }, { label: 'Decline politely' }] },
  },
] as ScriptEvent[]).map(arrive)
