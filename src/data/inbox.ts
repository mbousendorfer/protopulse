import type { Flagged, Network } from '../app/types'
import { T, MIN } from '../app/time'

export type ConvStatus = 'auto' | 'draft' | 'escalated' | 'hidden' | 'you' | 'claire' | 'takeover'
export type ConvType = 'comment' | 'dm' | 'mention' | 'review' | 'ad'
export type Sentiment = 'positive' | 'neutral' | 'negative'

export type Attachment = { id: string; kind: 'exchange' | 'refund' | 'code'; label: string; limit: string; removed?: boolean }
export type Msg = { id: string; from: 'them' | 'nova' | 'you'; text: string; at: number; auto?: boolean; approved?: boolean; undoUntil?: number; undone?: boolean
  /** The Desk card this reply settled, and the journal entry Nova wrote when she sent it alone: their Undo deletes it. */
  card?: string; log?: string }

export type Conversation = {
  id: string
  contact?: string
  author: string
  handle?: string
  network: Network
  type: ConvType
  status: ConvStatus
  sentiment: Sentiment
  intent?: number
  stars?: number
  at: number
  post?: string
  messages: Msg[]
  draft?: Flagged[]
  attachments?: Attachment[]
  rules?: string[]
  note?: string
  handoff?: string
  unread?: boolean
  /** Team work on top of Nova: absent on old saved states, so always read with a default. */
  labels?: string[]
  assignee?: Assignee
  reviewed?: boolean
  /** Who reviewed it: Nova reviews what she settled alone, a person what they looked at. */
  reviewedBy?: 'nova' | Assignee
  notes?: Note[]
  /** Set when a Desk card settled this conversation: what it looked like before, so the card's Undo puts it back. */
  settled?: { card: string; created?: boolean; status: ConvStatus; draft?: Flagged[]; note?: string; unread?: boolean; reviewed?: boolean; reviewedBy?: Conversation['reviewedBy'] }
}

export type Assignee = 'sam' | 'claire'
export type Note = { id: string; at: number; text: string; by: Assignee }
export const LABELS = ['Refund', 'Product issue', 'Press', 'Creator', 'Lead']

export type Order = { id: string; date: string; items: string; total: number; status: 'Delivered' | 'In transit' | 'Late' | 'Returned' | 'Processing' | 'Refunded' }
export type Contact = { id: string; name: string; handles: { network: Network; handle: string }[]; followers?: string; since?: string; location: string; tags: string[]; notes?: string; orders: Order[] }

export const CONTACTS: Contact[] = [
  { id: 'k-lea', name: 'Léa Fontaine', handles: [{ network: 'instagram', handle: '@lea.hikes' }], followers: '2.1k', since: 'March 2024', location: 'Grenoble, FR', tags: ['Repeat customer'], notes: 'Posted 6 trip stories tagging Fernway this year.',
    orders: [{ id: '#48102', date: '4 Nov', items: 'Ridge 28L · Moss', total: 140, status: 'Delivered' }, { id: '#45531', date: '12 Jun', items: 'Summit Bottle · Glacier', total: 35, status: 'Delivered' }] },
  { id: 'k-marc', name: 'Marc Delorme', handles: [{ network: 'linkedin', handle: 'Marc Delorme · Outdoor Weekly' }], location: 'Paris, FR', tags: ['Press'], notes: 'Senior reporter, gear and sustainability. Wrote about our repair programme in May.', orders: [] },
  { id: 'k-thomas', name: 'Thomas Girard', handles: [{ network: 'trustpilot', handle: 'Thomas Girard' }, { network: 'facebook', handle: 'Thomas Girard' }], since: 'October 2025', location: 'Lyon, FR', tags: ['At risk'],
    orders: [{ id: '#48213', date: '9 Nov', items: 'Summit Bottle · Slate', total: 35, status: 'Late' }] },
  { id: 'k-tom', name: 'Tom Baudin', handles: [{ network: 'instagram', handle: '@tom.bivouac' }], followers: '860', location: 'Chamonix, FR', tags: ['Prospect'], orders: [] },
  { id: 'k-ines', name: 'Inès Moreau', handles: [{ network: 'instagram', handle: '@ines.mrr' }], followers: '1.4k', since: 'November 2025', location: 'Bordeaux, FR', tags: [],
    orders: [{ id: '#48377', date: '14 Nov', items: 'Ember Fleece · Ember · M', total: 95, status: 'Refunded' }] },
  { id: 'k-hugo', name: 'Hugo Lambert', handles: [{ network: 'x', handle: '@hugo.rando' }], followers: '3.2k', since: 'January 2024', location: 'Annecy, FR', tags: ['Fan'],
    orders: [{ id: '#48011', date: '29 Oct', items: 'Ridge 28L · Slate', total: 140, status: 'Delivered' }] },
  { id: 'k-camille', name: 'Camille Roux', handles: [{ network: 'instagram', handle: '@camille.outdoors' }, { network: 'tiktok', handle: '@camille.outdoors' }], followers: '84k', since: 'August 2025', location: 'Chamonix, FR', tags: ['Creator', 'VIP'], notes: 'Unpaid fan. 3 stories with the Ridge this week. Creator list candidate.',
    orders: [{ id: '#47790', date: '18 Aug', items: 'Ridge 28L · Glacier', total: 140, status: 'Delivered' }] },
  { id: 'k-julien', name: 'Julien Petit', handles: [{ network: 'tiktok', handle: '@julien_trail' }], followers: '3.4k', since: 'September 2025', location: 'Annecy, FR', tags: ['UGC rights granted'],
    orders: [{ id: '#48155', date: '6 Nov', items: 'Summit Bottle ×2 · Moss', total: 70, status: 'Delivered' }] },
  { id: 'k-nadia', name: 'Nadia Rahman', handles: [{ network: 'youtube', handle: 'Nadia R.' }], location: 'Brussels, BE', tags: [],
    orders: [{ id: '#47902', date: '2 Sep', items: 'Storm Jacket · Slate · S', total: 220, status: 'Delivered' }] },
  { id: 'k-sophie', name: 'Sophie Martin', handles: [{ network: 'facebook', handle: 'Sophie Martin' }], since: 'October 2025', location: 'Nantes, FR', tags: ['At risk'], notes: 'Return received 12 Nov. Refund pending at payment provider.',
    orders: [{ id: '#48290', date: '28 Oct', items: 'Storm Jacket · Slate · M', total: 220, status: 'Returned' }] },
  { id: 'k-jonas', name: 'Jonas Keller', handles: [{ network: 'youtube', handle: 'Jonas K.' }], location: 'Munich, DE', tags: [], orders: [] },
  { id: 'k-ana', name: 'Ana Duarte', handles: [{ network: 'instagram', handle: '@ana.climbs' }], followers: '12k', since: 'October 2025', location: 'Porto, PT', tags: [],
    orders: [{ id: '#48301', date: '30 Oct', items: 'Ember Fleece · Ember · S', total: 95, status: 'Delivered' }] },
  { id: 'k-pierre', name: 'Pierre Vasseur', handles: [{ network: 'facebook', handle: 'Pierre Vasseur' }], since: 'May 2024', location: 'Gap, FR', tags: ['Safety'],
    orders: [{ id: '#47655', date: '3 Aug', items: 'Ridge 28L · Moss', total: 140, status: 'Delivered' }] },
  { id: 'k-theo', name: 'Théo Wild', handles: [{ network: 'instagram', handle: '@theo.wild' }], followers: '120k', location: 'Lisbon, PT', tags: ['Creator'], notes: 'Van life and outdoor. Works with Peakline (2024).', orders: [] },
  { id: 'k-max', name: 'Max Turner', handles: [{ network: 'x', handle: '@maxoutside' }], followers: '1.1k', since: 'November 2025', location: 'Bristol, UK', tags: ['First order'],
    orders: [{ id: '#48333', date: '21 Nov', items: 'Storm Jacket · Ember · L', total: 220, status: 'Processing' }] },
]

let n = 0
const m = (from: Msg['from'], text: string, at: number, extra: Partial<Msg> = {}): Msg => ({ id: `m${n++}`, from, text, at, ...extra })
const auto = (text: string, at: number, undo = 0): Msg => m('nova', text, at, { auto: true, undoUntil: undo ? at + undo * MIN : undefined })

type Q = [id: string, author: string, network: Network, type: ConvType, sentiment: Sentiment, at: number, question: string, answer: string, extra?: Partial<Conversation>]

// Handled by Nova on her own (product, shipping, thanks…).
const AUTO: Q[] = [
  ['c-tom', '@tom.bivouac', 'instagram', 'comment', 'neutral', T(8, 8), 'Does the Ridge 28L fit as cabin luggage?', 'It does, Tom: 55 × 30 × 20 cm, so it fits the cabin rules of every major airline.', { contact: 'k-tom', intent: 0.74, rules: ['Give the number, then the answer'], post: 'Reel · “3 days, one bag” · yesterday' }],
  ['c-ines', '@ines.mrr', 'instagram', 'dm', 'negative', T(8, 1), 'My fleece arrived 5 days late, I paid for express 😤', 'Inès, express should mean express. Sorry. I’ve refunded your €9.90 shipping, you’ll see it in 3 to 5 days.', { contact: 'k-ines', rules: ['Apologise once, then fix'], note: 'Refunded €9.90 shipping · within the €15 limit' }],
  ['c-julien', '@julien_trail', 'tiktok', 'comment', 'positive', T(7, 33), 'which colour is this?? need it', 'That’s Moss! Link’s in our bio 🌿', { contact: 'k-julien', intent: 0.81, rules: ['One emoji max'], post: 'TikTok · “Lac Blanc at 5am”' }],
  ['c-sam', '@sam_outside', 'x', 'mention', 'neutral', T(6, 10), '@fernway is the Storm Jacket warm enough for skiing?', 'It’s a shell, Sam, so it keeps you dry but not warm. Layer the Ember Fleece under it for the slopes.', { intent: 0.62 }],
  ['c-nadia', 'Nadia R.', 'youtube', 'comment', 'positive', T(5, 2), 'Great review, what’s the warranty on the bottle?', 'Lifetime, Nadia. If it breaks, we replace it.', { contact: 'k-nadia', post: 'YouTube Short · “Summit Bottle drop test”' }],
  ['c-jonas', 'Jonas K.', 'youtube', 'comment', 'neutral', T(1, 5), 'Gilt die Garantie auch in Deutschland?', 'Ja, Jonas! Die lebenslange Garantie auf die Summit Bottle gilt überall, auch in Deutschland.', { contact: 'k-jonas', post: 'YouTube Short · “Summit Bottle drop test”' }],
  ['c-hugo', '@hugo.rando', 'x', 'mention', 'positive', T(21, 40, -1), 'Fernway support answered in 3 minutes on a Sunday. Respect.', 'Thanks Hugo, enjoy the Ridge out there.', { contact: 'k-hugo' }],
  ['c-camille', '@camille.outdoors', 'instagram', 'mention', 'positive', T(19, 15, -1), 'Third trip with this bag and it still looks new 🏔️ @fernway', 'Camille, that’s exactly what we build it for. Thanks for taking it everywhere.', { contact: 'k-camille', note: 'Creator above 50k: Echo raised a separate card about her to your Desk.' }],
  ['c-swiss', 'Clara Meier', 'facebook', 'dm', 'neutral', T(3, 12), 'Do you ship to Switzerland?', 'We do, Clara. Delivery takes 3 to 5 working days and customs fees are included at checkout.', { intent: 0.7 }],
  ['c-size', '@noe.walks', 'instagram', 'dm', 'neutral', T(2, 58), 'I’m 1m78, 72kg, which size for the Ember Fleece?', 'Go for M. It’s a regular fit with room for a base layer. If you like it loose, take L.', { intent: 0.85, rules: ['Give the number, then the answer'] }],
  ['c-wash', 'Lucas Bernard', 'facebook', 'comment', 'neutral', T(2, 30), 'How do you wash the Storm Jacket without killing the waterproofing?', 'Cold wash at 30°, liquid detergent, no softener. Tumble dry low for 20 minutes to reactivate the coating.', { post: 'Facebook · “Rain test on the GR5”' }],
  ['c-dish', '@marie.camp', 'instagram', 'comment', 'neutral', T(1, 50), 'Is the bottle dishwasher safe?', 'The bottle is, the lid isn’t. Hand-wash the lid to keep the seal tight.', { post: 'Reel · “Storm Jacket vs. a garden hose”' }],
  ['c-belgium', 'Bram Peeters', 'facebook', 'dm', 'neutral', T(0, 44), 'How long is delivery to Ghent?', 'Usually 2 to 3 working days to Belgium. You get tracking by email as soon as it ships.', { intent: 0.66 }],
  ['c-cover', '@wildlou', 'tiktok', 'comment', 'neutral', T(23, 20, -1), 'does the ridge come with a rain cover?', 'It does, tucked in the bottom pocket. Most people never find it 👀', { post: 'TikTok · “Packing for 3 days”' }],
  ['c-return', 'Élodie Simon', 'facebook', 'dm', 'neutral', T(22, 5, -1), 'Can I return a jacket I wore once?', 'Yes, within 30 days if it’s clean and has its tags. Start the return from your order page, the label is free.', { rules: ['Give the number, then the answer'] }],
  ['c-hot', '@trailrunner.jo', 'instagram', 'comment', 'neutral', T(20, 12, -1), 'can you put tea in the Summit bottle?', 'You can. It keeps drinks hot for 12 hours and cold for 24.', { post: 'Carousel · “What’s in Sam’s pack”' }],
  ['c-hood', 'Arthur Leclerc', 'youtube', 'comment', 'neutral', T(18, 40, -1), 'Does the hood fit over a helmet?', 'It does. The hood is sized for a climbing helmet and adjusts with one hand.', { post: 'YouTube · “Storm Jacket in 60 seconds”' }],
  ['c-uk', '@maxoutside', 'x', 'dm', 'neutral', T(17, 3, -1), 'Will I pay customs on a UK order?', 'No, Max. Duties and VAT are included in the price at checkout for UK orders.', { contact: 'k-max' }],
  ['c-glacier', '@hikewithnina', 'instagram', 'dm', 'neutral', T(16, 20, -1), 'When is the Ridge back in Glacier?', 'Glacier is back on 8 December. Want me to save you one? Just reply with your size of torso: S/M or M/L.', { intent: 0.9 }],
  ['c-student', 'Paul Garnier', 'facebook', 'dm', 'neutral', T(15, 0, -1), 'Do you have a student discount?', 'We don’t do student codes, but we run a repair programme so your gear lasts years. Details at fernway.co/repair.'],
  ['c-gift', '@claire.and.co', 'instagram', 'dm', 'neutral', T(14, 22, -1), 'Can you gift wrap for Christmas?', 'We can. Tick “gift” at checkout: recycled paper, a handwritten card and no price on the slip.', { intent: 0.8 }],
  ['c-tracking', 'Rémi Duval', 'facebook', 'dm', 'neutral', T(13, 5, -1), 'Where is my order #48344?', 'It left our warehouse this morning, Rémi. Tracking: CH-48344-FR. Expected Thursday.'],
  ['c-careers', 'Sarah Cohen', 'linkedin', 'dm', 'neutral', T(11, 40, -1), 'Are you hiring in marketing?', 'Thanks Sarah. Open roles are listed at fernway.co/careers, and the team reads every application.', { rules: ['No emojis on LinkedIn'] }],
  ['c-g5', 'Antoine R. · ★★★★★', 'google', 'review', 'positive', T(10, 15, -1), 'Bought the Ridge at the Annecy pop-up last month. Solid bag, great advice.', 'Thanks Antoine. See you on the trails.', { stars: 5 }],
  ['c-tp5', 'Mélanie D. · ★★★★★', 'trustpilot', 'review', 'positive', T(9, 2, -1), 'Fast delivery, beautiful packaging, the fleece is so warm.', 'Thank you Mélanie, enjoy the warmth this winter.', { stars: 5 }],
]

const fromQ = ([id, author, network, type, sentiment, at, q, a, extra]: Q): Conversation => ({
  id, author, network, type, sentiment, at, status: 'auto', reviewed: true, reviewedBy: 'nova',
  messages: [m('them', q, at - 2 * MIN), auto(a, at, id === 'c-tom' || id === 'c-ines' ? 10 : 0)],
  ...extra,
})

// Labels, assignments and notes the team already put on some conversations.
const TEAM: Record<string, Partial<Conversation>> = {
  'c-lea': { labels: ['Product issue'] },
  'c-thomas': { labels: ['Refund'], assignee: 'sam' },
  'c-sophie': { labels: ['Refund'], assignee: 'claire', notes: [{ id: 'n1', at: T(7, 20), by: 'claire', text: 'Checked with finance: the refund left on 12 Nov. Fine to tell her it’s on its way.' }] },
  'c-ana': { labels: ['Product issue'] },
  'c-max': { assignee: 'sam' },
  'c-marc': { labels: ['Press'], assignee: 'claire' },
  'c-pierre': { labels: ['Product issue'], notes: [{ id: 'n2', at: T(7, 5), by: 'sam', text: 'Called him yesterday evening, no injury. Product team has the clip photos.' }] },
  'c-lawyer': { assignee: 'claire' },
  'c-theo': { labels: ['Creator'], assignee: 'claire' },
  'c-tom': { labels: ['Lead'], reviewed: true },
}

/** Conversations saved before labels existed get the seeded team data once (labels is always set afterwards). */
export const withTeam = (c: Conversation): Conversation => reviewedDefault(c.labels !== undefined ? c : { ...c, labels: [], ...TEAM[c.id] })
/** Saved before review existed: what Nova settled alone (her replies, the spam she hid) counts as reviewed by her. */
const reviewedDefault = (c: Conversation): Conversation =>
  c.reviewed !== undefined || !(c.status === 'auto' || (c.status === 'hidden' && c.note?.includes('by Nova'))) ? c : { ...c, reviewed: true, reviewedBy: 'nova' }

export const CONVERSATIONS: Conversation[] = ([
  // Drafts waiting for you
  {
    id: 'c-lea', contact: 'k-lea', author: '@lea.hikes', network: 'instagram', type: 'comment', status: 'draft', sentiment: 'negative', at: T(7, 41), handoff: 'h-strap', unread: true,
    post: 'Reel · “The Ridge on the GR20” · yesterday · 41 likes on this comment',
    messages: [m('them', 'Strap snapped on day 2 of the GR20. For a €140 bag that’s not ok.', T(7, 39)), m('them', '@marco.alp: same thing happened to mine in June', T(7, 40))],
    draft: ['Léa, that should not happen on the ', { text: 'GR20', note: 'Léa wrote GR20 but tagged the Tour du Mont Blanc in her story. Check before sending.' }, ' or anywhere else. Sorry. A new Ridge ships today, no need to send the old one back. Details in your DMs.'],
    attachments: [{ id: 'a1', kind: 'exchange', label: 'Exchange: Ridge 28L Moss → Ridge 28L Moss, free express shipping · €0', limit: 'within your €150 limit' }],
    rules: ['Apologise once, then fix', 'Move order details to DM'],
  },
  {
    id: 'c-thomas', contact: 'k-thomas', author: 'Thomas Girard · ★★', network: 'trustpilot', type: 'review', status: 'draft', sentiment: 'negative', stars: 2, at: T(4, 20), handoff: 'h-review',
    messages: [m('them', 'Nice bottle but it arrived 6 days late. I won’t order again before a trip.', T(4, 18))],
    draft: ['Thomas, 6 days late before a trip is frustrating. Sorry. We’ve refunded your shipping and added a code for your next order. Enjoy the bottle out there.'],
    attachments: [{ id: 'a2', kind: 'refund', label: 'Refund shipping: €9.90', limit: 'within your €15 limit' }, { id: 'a3', kind: 'code', label: 'Code: THANKS10, single use', limit: 'within your 15% limit' }],
    rules: ['Never blame the carrier publicly'],
  },
  {
    id: 'c-sophie', handoff: 'h-sophie', contact: 'k-sophie', author: 'Sophie Martin', network: 'facebook', type: 'dm', status: 'draft', sentiment: 'negative', at: T(6, 48), unread: true,
    messages: [m('them', 'I returned the jacket 2 weeks ago and still no refund. This is getting ridiculous.', T(6, 46))],
    draft: ['Sophie, you’re right to chase us. Your return arrived on 12 November and the €220 refund was sent the same day. ', { text: 'Banks usually take 5 to 10 days', note: 'Her bank is Boursorama: refunds there have taken up to 14 days this month.' }, ', so it should land this week. If it hasn’t by Friday, reply here and I’ll escalate it.'],
    rules: ['Give the number, then the answer'], note: 'Refund confirmed in Shopify on 12 Nov.',
  },
  {
    id: 'c-ana', handoff: 'h-ana', contact: 'k-ana', author: '@ana.climbs', network: 'instagram', type: 'dm', status: 'draft', sentiment: 'negative', at: T(6, 15),
    messages: [m('them', 'My Ember fleece is pilling after 2 washes. Kind of disappointed for €95.', T(6, 13))],
    draft: ['Ana, that’s not normal for the Ember. Sorry. We’ll send you a new one in your size, and you can keep the old one for the crag.'],
    attachments: [{ id: 'a4', kind: 'exchange', label: 'Replacement: Ember Fleece · Ember · S · €95', limit: 'within your €150 limit' }],
    rules: ['Apologise once, then fix'],
  },
  {
    id: 'c-max', handoff: 'h-max', contact: 'k-max', author: '@maxoutside', network: 'x', type: 'dm', status: 'draft', sentiment: 'neutral', at: T(5, 55),
    messages: [m('them', 'Order #48333 has been “processing” for 4 days. Any news?', T(5, 53))],
    draft: ['Max, sorry for the wait. The Storm Jacket in Ember L was back in stock yesterday, so your order ships today. You’ll get tracking by email this afternoon.'],
    attachments: [{ id: 'a5', kind: 'refund', label: 'Refund shipping: €12.50', limit: 'within your €15 limit' }],
    rules: ['Give the number, then the answer'],
  },
  {
    id: 'c-g3', handoff: 'h-g3', author: 'Martine L. · ★★★', network: 'google', type: 'review', status: 'draft', sentiment: 'neutral', stars: 3, at: T(3, 40),
    messages: [m('them', 'Great bag, but delivery took 9 days and nobody told me why.', T(3, 38))],
    draft: ['Thanks Martine, and sorry about the silence. 9 days is too long and we should have told you. We’ve changed carriers for Annecy since. Glad the bag made it worth the wait.'],
    rules: ['Never blame the carrier publicly'],
  },
  // Escalated: Nova never answers these herself
  {
    id: 'c-marc', contact: 'k-marc', author: 'Marc Delorme · Outdoor Weekly', network: 'linkedin', type: 'dm', status: 'escalated', sentiment: 'neutral', at: T(7, 12), handoff: 'h-press', unread: true,
    messages: [m('them', 'Hi, I’m writing a piece on PFAS in rainwear. Can you confirm whether the 2023 Storm Jacket uses a PFC-free DWR? Deadline today 5pm.', T(7, 12))],
    draft: ['Hi Marc, thanks for reaching out. Our Head of Brand will get back to you before your deadline today.'],
    note: 'Press topic · locked. Nova suggests a holding reply only.',
  },
  {
    id: 'c-pierre', contact: 'k-pierre', author: 'Pierre Vasseur', network: 'facebook', type: 'comment', status: 'escalated', sentiment: 'negative', at: T(23, 40, -1),
    post: 'Facebook · “Pack list for winter hikes”',
    messages: [m('them', 'The stove clip on the side of my Ridge snapped while I was scrambling and I nearly went down with it. Is this a known issue?', T(23, 38, -1))],
    draft: ['Pierre, thank you for telling us and we’re glad you’re OK. A member of our team will call you today. Could you send us your phone number in a private message?'],
    note: 'Safety topic · locked. Nova suggests a holding reply only.',
  },
  {
    id: 'c-lawyer', author: '@raph_m', network: 'instagram', type: 'dm', status: 'escalated', sentiment: 'negative', at: T(22, 10, -1),
    messages: [m('them', 'Your jacket leaked for 3 days in Scotland and ruined my trip. My lawyer will be in touch about a refund of the whole trip.', T(22, 8, -1))],
    draft: ['Raphaël, we’re sorry your trip went this way. We’d like to understand what happened. Our customer team will contact you by email today.'],
    note: 'Legal topic · locked. No order found under this handle.',
  },
  {
    id: 'c-theo', contact: 'k-theo', author: '@theo.wild', network: 'instagram', type: 'dm', status: 'escalated', sentiment: 'positive', at: T(20, 30, -1),
    messages: [m('them', 'Hey Fernway! Big fan of the Ridge. Would love to do 3 reels for your winter campaign, my rate is €1,800. Media kit attached.', T(20, 28, -1))],
    note: 'Creator above 50k followers · always yours to decide.',
  },
  // Hidden by Nova
  { id: 'c-spam1', author: '@free_followers_now', network: 'instagram', type: 'comment', status: 'hidden', sentiment: 'neutral', at: T(7, 46), messages: [m('them', 'Boost your account 10k followers DM us!!', T(7, 46))], note: 'Spam · hidden by Nova', reviewed: true, reviewedBy: 'nova' },
  { id: 'c-spam2', author: '@crypto.gains.daily', network: 'instagram', type: 'comment', status: 'hidden', sentiment: 'neutral', at: T(7, 44), messages: [m('them', 'I made €4,200 this week with this simple trick 👉 link in bio', T(7, 44))], note: 'Spam · hidden by Nova', reviewed: true, reviewedBy: 'nova' },
  { id: 'c-spam3', author: '@promo_dealz_88', network: 'tiktok', type: 'comment', status: 'hidden', sentiment: 'neutral', at: T(6, 2), messages: [m('them', 'cheap bags 90% off at dealz88 shop', T(6, 2))], note: 'Spam · hidden by Nova', reviewed: true, reviewedBy: 'nova' },
  { id: 'c-spam4', author: '@bestfollows.co', network: 'facebook', type: 'ad', status: 'hidden', sentiment: 'neutral', at: T(4, 30), messages: [m('them', 'Your page could get 5x more reach. Message us for a free audit.', T(4, 30))], note: 'Spam on an ad · hidden by Nova', reviewed: true, reviewedBy: 'nova' },
  { id: 'c-spam5', author: '@win.iphone.17', network: 'x', type: 'mention', status: 'hidden', sentiment: 'neutral', at: T(2, 12), messages: [m('them', '@fernway congrats you won an iPhone 17 claim here', T(2, 12))], note: 'Bot · hidden by Nova', reviewed: true, reviewedBy: 'nova' },
  // Handled alone
  ...AUTO.map(fromQ),
] as Conversation[]).map(withTeam)
