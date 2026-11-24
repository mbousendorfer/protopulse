import type { AgentId, PlaybookRule, RuleKind } from '../app/types'
import { T } from '../app/time'

const r = (id: string, kind: RuleKind, text: string, agents: AgentId[], uses: number, origin: string, day: number): PlaybookRule =>
  ({ id, kind, text, agents, uses, origin, addedAt: T(10, 0, day) })

// Do and don't rules. The first ones are those the agents cite on Desk cards.
export const RULES: PlaybookRule[] = [
  r('r-apologise', 'do', 'Apologise once, then fix', ['nova'], 186, 'Onboarding', -30),
  r('r-dm', 'do', 'Move order details to DM', ['nova'], 142, 'Onboarding', -30),
  r('r-number', 'do', 'Give the number, then the answer', ['nova'], 311, 'Learned from your edit on Nov 4', -21),
  r('r-carrier', 'dont', 'Never blame the carrier publicly', ['nova'], 37, 'Added by you', -18),
  r('r-in-use', 'do', 'Show the product in use, not on a table', ['atlas'], 44, 'Added by you', -26),
  r('r-emoji', 'dont', 'One emoji max', ['nova', 'atlas'], 268, 'Learned from your edit on Nov 9', -16),
  r('r-name', 'do', 'Use the person’s first name in the first sentence', ['nova'], 402, 'Onboarding', -30),
  r('r-stock', 'dont', 'Never use stock photos', ['atlas'], 12, 'Added by you', -29),
  r('r-promo', 'dont', 'Never invent a promo code', ['atlas', 'nova'], 9, 'Added by you', -15),
  r('r-competitor', 'dont', 'Never name a competitor in a reply', ['nova', 'atlas'], 6, 'Onboarding', -30),
  r('r-price', 'do', 'State prices with the euro sign after the number on LinkedIn (140 €)', ['atlas'], 8, 'Learned from your edit on Nov 12', -13),
  r('r-short-li', 'do', 'Keep LinkedIn posts under 700 characters', ['atlas'], 21, 'Learned from your edit on Nov 6', -19),
  r('r-hook', 'do', 'Start TikTok captions with the outcome, not the product', ['atlas'], 18, 'Added by you', -11),
  r('r-cta', 'do', 'One call to action per post', ['atlas'], 63, 'Onboarding', -30),
  r('r-trail', 'do', 'Check trail names against the customer’s own post before using them', ['nova', 'atlas'], 4, 'Learned from your edit on Nov 20', -5),
  r('r-legal', 'dont', 'Never promise a delivery date. Say “usually within 2 days”', ['nova'], 74, 'Added by you', -24),
  r('r-warranty', 'dont', 'Never mention the lifetime warranty for bags (bottles only)', ['nova'], 11, 'Learned from your edit on Nov 17', -8),
  r('r-german', 'do', 'Answer in the customer’s language when it’s French, German, Spanish or Italian', ['nova'], 52, 'Onboarding', -30),
  r('r-thanks', 'do', 'Thank people who share photos, every time', ['nova', 'echo'], 98, 'Onboarding', -30),
  r('r-creator', 'dont', 'Never offer payment to a creator', ['nova', 'echo'], 2, 'Added by you', -22),
  r('r-hashtags', 'do', 'Three hashtags max on Instagram, none on LinkedIn', ['atlas'], 41, 'Onboarding', -30),
  r('r-sources', 'do', 'Link the lab report when someone asks about materials', ['nova'], 7, 'Added by you', -10),
  r('r-weekend', 'dont', 'No sales posts on Sunday', ['atlas'], 3, 'Added by you', -14),
  r('r-repair', 'do', 'Offer a repair before a replacement when the bag is over a year old', ['nova'], 16, 'Added by you', -12),
  r('r-reviews', 'do', 'Reply to every review under 4 stars within 24 hours', ['nova'], 27, 'Onboarding', -30),
]

export const FACTS: PlaybookRule[] = [
  r('f-ridge', 'fact', 'Ridge 28L: €140, 55 × 30 × 20 cm, 1.1 kg, fits cabin rules', ['nova', 'atlas'], 96, 'Shopify catalog', -30),
  r('f-bottle', 'fact', 'Summit Bottle: €35, 750 ml, stainless steel, BPA-free lid', ['nova', 'atlas'], 61, 'Shopify catalog', -30),
  r('f-storm', 'fact', 'Storm Jacket: €220, 3-layer shell, PFC-free DWR since 2024', ['nova', 'atlas'], 48, 'Shopify catalog', -30),
  r('f-fleece', 'fact', 'Ember Fleece: €95, recycled polyester, sizes XS to XXL', ['nova', 'atlas'], 22, 'Shopify catalog', -30),
  r('f-colours', 'fact', 'Colours: Moss, Ember, Slate, Glacier', ['nova', 'atlas'], 70, 'Shopify catalog', -30),
  r('f-returns', 'fact', 'Returns: 30 days, free exchange, refund in 5 working days', ['nova'], 132, 'Help centre', -30),
  r('f-warranty', 'fact', 'Lifetime warranty on Summit Bottles only', ['nova'], 58, 'Help centre', -30),
  r('f-bag-warranty', 'fact', 'Bags: 3-year warranty, then the repair programme', ['nova'], 34, 'Help centre', -30),
  r('f-repair', 'fact', 'Repair programme: free first repair, 1,200 bags fixed in 2026', ['nova', 'atlas'], 19, 'Added by you', -20),
  r('f-shipping', 'fact', 'Shipping: free over €60 in the EU, usually within 2 working days', ['nova'], 210, 'Help centre', -30),
  r('f-express', 'fact', 'Express shipping: €9.90, next working day before 14:00 orders', ['nova'], 41, 'Help centre', -30),
  r('f-countries', 'fact', 'Ships to the EU, Switzerland, Norway and the UK', ['nova'], 37, 'Help centre', -30),
  r('f-support', 'fact', 'Support: Monday to Friday, 9:00 to 18:00 CET, support@fernway.co', ['nova'], 88, 'Help centre', -30),
  r('f-annecy', 'fact', 'The Annecy pop-up shop closed on 31 October 2026', ['nova'], 3, 'Added by you', -3),
  r('f-ridge40', 'fact', 'No bag larger than 28L is on sale. The Ridge 40L is not announced', ['nova', 'atlas'], 1, 'Added by you', -2),
  r('f-pfas', 'fact', 'All products are PFAS-free since January 2024 (lab report on fernway.co/materials)', ['nova', 'echo'], 9, 'Added by you', -16),
  r('f-lab', 'fact', 'Bottle lids tested BPA-free by SGS, report dated March 2026', ['nova'], 4, 'Added by you', -16),
  r('f-trailweek', 'fact', 'Trail Week: 1 to 7 December, 10% off bags, code TRAIL10', ['nova', 'atlas'], 14, 'Strategy · Sage', -4),
  r('f-founded', 'fact', 'Founded in Annecy in 2019 by two mountain guides', ['atlas'], 6, 'Onboarding', -30),
  r('f-b2b', 'fact', 'Team and club orders over 20 units go to sales@fernway.co', ['nova'], 5, 'Help centre', -30),
]

export const BANNED = ['cheap', 'guys', 'game-changer', 'unbeatable', 'eco-friendly (without proof)', 'limited time only', 'hurry']
export const PREFERRED: { use: string; instead: string }[] = [
  { use: 'built to last', instead: 'durable' },
  { use: 'trail', instead: 'hike' },
  { use: 'repair', instead: 'fix' },
  { use: 'kit', instead: 'gear' },
  { use: 'team', instead: 'staff' },
]

export type Escalation = { id: string; label: string; to: 'sam' | 'claire'; on: boolean; agents: AgentId[] }
export const ESCALATIONS: Escalation[] = [
  { id: 'e-injury', label: 'Injury, safety or product recall', to: 'sam', on: true, agents: ['nova', 'echo'] },
  { id: 'e-press', label: 'Journalists and press', to: 'claire', on: true, agents: ['nova', 'echo'] },
  { id: 'e-legal', label: 'Lawyers and legal threats', to: 'claire', on: true, agents: ['nova'] },
  { id: 'e-creator', label: 'Creators above 50k followers', to: 'sam', on: true, agents: ['nova', 'echo'] },
  { id: 'e-refund', label: 'Refunds above €150', to: 'sam', on: true, agents: ['nova'] },
  { id: 'e-budget', label: 'Paid boosts and creator fees', to: 'claire', on: true, agents: ['iris', 'nova'] },
  { id: 'e-statement', label: 'Public statements during a negative spike', to: 'claire', on: true, agents: ['echo', 'atlas'] },
  { id: 'e-competitor', label: 'Any post that names a competitor', to: 'sam', on: true, agents: ['atlas'] },
  { id: 'e-pricing', label: 'Price changes and promo codes', to: 'claire', on: false, agents: ['atlas', 'nova'] },
]

export type Voice = { warmth: number; play: number; length: number }
export const VOICE: Voice = { warmth: 75, play: 55, length: 30 }

export const PILLARS = [
  { name: 'Gear that lasts', share: 35 },
  { name: 'Trail stories', share: 25 },
  { name: 'Repair & care', share: 20 },
  { name: 'Community', share: 20 },
]

/** A reply to the same message, written at a given voice. Used for the live example. */
export function voiceSample(v: Voice) {
  const hi = v.warmth > 60 ? 'Léa, that should not happen' : v.warmth > 30 ? 'Hello Léa, this should not happen' : 'Hello, we have received your message'
  const joke = v.play > 65 ? ' (on the GR20 or on the sofa)' : ''
  const sorry = v.warmth > 60 ? ' Sorry.' : v.warmth > 30 ? ' We apologise.' : ' We apologise for the inconvenience.'
  const fix = v.length > 60
    ? ' We are sending you a new Ridge 28L today by express shipping, free of charge, and you don’t need to send the old one back. You’ll find the tracking link and the details in your DMs within the hour.'
    : v.length > 30 ? ' A new Ridge ships today by express, no need to send the old one back. Details in your DMs.' : ' New Ridge ships today. Details in DM.'
  const end = v.play > 65 ? ' Back on the trail soon 🏔️' : ''
  return `${hi}${joke}.${sorry}${fix}${end}`
}

/* ---------- Message checker (Try a message) ---------- */
const COMPETITORS = ['peakline', 'norrø', 'norro', 'trailkind', 'basecamp']
export type Issue = { rule: string; terms: string[] }

export function checkMessage(text: string, banned: string[], preferred: { use: string; instead: string }[], network: string): Issue[] {
  const t = text.toLowerCase()
  const out: Issue[] = []
  const hits = banned.map(w => w.replace(/\s*\(.*\)$/, '')).filter(w => w && t.includes(w.toLowerCase()))
  if (hits.length) out.push({ rule: 'Banned words', terms: hits })
  const emojis = text.match(/\p{Extended_Pictographic}/gu) ?? []
  if (emojis.length > 1) out.push({ rule: 'One emoji max', terms: emojis })
  const tags = text.match(/#\w+/g) ?? []
  if (network === 'linkedin' && tags.length) out.push({ rule: 'Three hashtags max on Instagram, none on LinkedIn', terms: tags })
  if (network === 'instagram' && tags.length > 3) out.push({ rule: 'Three hashtags max on Instagram, none on LinkedIn', terms: tags })
  if (network === 'linkedin' && text.length > 700) out.push({ rule: 'Keep LinkedIn posts under 700 characters', terms: [] })
  const comp = COMPETITORS.filter(c => t.includes(c))
  if (comp.length) out.push({ rule: 'Never name a competitor in a reply', terms: comp })
  const date = text.match(/\b(tomorrow|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday)|in \d+ days?|guaranteed)\b/i)
  if (date) out.push({ rule: 'Never promise a delivery date. Say “usually within 2 days”', terms: [date[0]] })
  if (/lifetime warranty/i.test(text) && /\b(bag|ridge|backpack)\b/i.test(text)) out.push({ rule: 'Never mention the lifetime warranty for bags (bottles only)', terms: ['lifetime warranty'] })
  if (/\b(code|promo)\b/i.test(text) && /\b[A-Z]{4,}\d{1,3}\b/.test(text) && !/TRAIL10/.test(text)) out.push({ rule: 'Never invent a promo code', terms: [text.match(/\b[A-Z]{4,}\d{1,3}\b/)![0]] })
  const pref = preferred.filter(p => p.instead && new RegExp(`\\b${p.instead}\\b`, 'i').test(text))
  if (pref.length) out.push({ rule: `Preferred words: ${pref.map(p => `“${p.use}” instead of “${p.instead}”`).join(', ')}`, terms: pref.map(p => p.instead) })
  return out
}

