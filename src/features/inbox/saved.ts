// Saved replies: the team's reusable answers. Nova starts her drafts from the closest one and says which.
import { CONTACTS, type Conversation } from '../../data/inbox'

export type SavedReply = { id: string; name: string; text: string; uses: number; by: 'team' | 'you' }

/** `{name}` is the customer's first name. */
export const SAVED: SavedReply[] = [
  { id: 'sr-exchange', name: 'Exchange', text: '{name}, sorry about that. We’re sending you a replacement today by express, no need to send the old one back first. Details in your DMs.', uses: 31, by: 'team' },
  { id: 'sr-refund', name: 'Shipping refund', text: '{name}, sorry for the wait. I’ve refunded your shipping, you’ll see it in 3 to 5 days.', uses: 18, by: 'team' },
  { id: 'sr-late', name: 'Late delivery', text: '{name}, sorry it’s late. Your parcel is with the carrier and should arrive within 2 working days. Tracking is in your inbox.', uses: 12, by: 'team' },
  { id: 'sr-returns', name: 'Returns', text: '{name}, you have 30 days to return it. Start from your order page: the label is free and the refund leaves the day we receive it.', uses: 22, by: 'team' },
  { id: 'sr-warranty', name: 'Warranty', text: '{name}, the Summit Bottle has a lifetime warranty and our bags have 5 years. If something breaks, we repair or replace it: fernway.co/repair.', uses: 9, by: 'team' },
  { id: 'sr-size', name: 'Size advice', text: '{name}, our fits are regular with room for a base layer. Tell me your height and usual size and I’ll pick for you.', uses: 15, by: 'team' },
  { id: 'sr-press', name: 'Press holding reply', text: 'Hi {name}, thanks for reaching out. Our Head of Brand will get back to you before your deadline.', uses: 4, by: 'team' },
  { id: 'sr-ugc', name: 'Can we share it?', text: '{name}, love this! Can we share it on our page? We’ll credit you, of course.', uses: 11, by: 'team' },
]

const titleCase = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)

/** The customer's first name: from their contact record, else from their name or handle. */
export function firstName(c: Pick<Conversation, 'author' | 'contact'>) {
  const k = CONTACTS.find(x => x.id === c.contact)
  if (k) return k.name.split(' ')[0]
  const raw = c.author.split(' · ')[0].replace(/^@/, '')
  return titleCase(raw.split(/[\s._]/)[0])
}

export const fill = (r: Pick<SavedReply, 'text'>, c: Pick<Conversation, 'author' | 'contact'>) => r.text.replaceAll('{name}', firstName(c))

/** A sent reply turned into a saved one: the customer's first name becomes the placeholder. */
export const toTemplate = (text: string, c: Pick<Conversation, 'author' | 'contact'>) => text.replaceAll(firstName(c), '{name}')

/** The saved reply a phrase like "the exchange saved reply" names. */
export const savedNamed = (list: SavedReply[], phrase: string) => {
  const q = phrase.toLowerCase().replace(/\b(?:the|saved|reply|replies|one|template)\b/g, ' ').trim()
  return q ? list.find(r => r.name.toLowerCase() === q) ?? list.find(r => r.name.toLowerCase().includes(q) || q.includes(r.name.toLowerCase())) : undefined
}
