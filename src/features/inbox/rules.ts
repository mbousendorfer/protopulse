// Nova's Inbox rules (Agorapulse's "Automated moderation"): when a message says some words, on some network or type,
// Nova labels, assigns, hides, reviews or sets the sentiment. She applies them on Act; on Draft and Suggest she proposes.
import type { Network } from '../../app/types'
import type { Assignee, Conversation, ConvType, Sentiment } from '../../data/inbox'
import { NETWORK_LABEL } from '../../data/agents'

export type RuleOp =
  | { op: 'label'; value: string } | { op: 'assign'; value: Assignee } | { op: 'hide' } | { op: 'review' } | { op: 'sentiment'; value: Sentiment }

export type InboxRule = {
  id: string
  /** Matched in what the customer wrote, case-insensitive. Any of them is enough. */
  words: string[]
  network?: Network
  type?: ConvType
  then: RuleOp
  on: boolean
  uses: number
  origin: string
}

export const RULES: InboxRule[] = [
  { id: 'ir-refund', words: ['refund', 'money back', 'reimburse'], then: { op: 'label', value: 'Refund' }, on: true, uses: 14, origin: 'Set up with you on Day 1' },
  { id: 'ir-order', words: ['where is my order', 'tracking', 'order #', 'processing'], then: { op: 'label', value: 'Order status' }, on: true, uses: 22, origin: 'Set up with you on Day 1' },
  { id: 'ir-press', words: ['journalist', 'reporter', 'writing a piece', 'article'], then: { op: 'assign', value: 'claire' }, on: true, uses: 3, origin: 'Claire asked for press on 12 Nov' },
  { id: 'ir-spam', words: ['followers', 'crypto', 'claim here', '90% off', 'link in bio'], then: { op: 'hide' }, on: true, uses: 9, origin: 'Learned from your edits' },
  { id: 'ir-thanks', words: ['thank you', 'thanks', 'love it', 'respect'], type: 'mention', then: { op: 'review' }, on: true, uses: 41, origin: 'Set up with you on Day 1' },
]

const SENT: Record<Sentiment, string> = { positive: 'positive', neutral: 'neutral', negative: 'negative' }
const TYPE: Record<ConvType, string> = { comment: 'comments', dm: 'messages', mention: 'mentions', review: 'reviews', ad: 'ad comments' }

export const whenText = (r: Pick<InboxRule, 'words' | 'network' | 'type'>) =>
  [`says ${r.words.map(w => `“${w}”`).join(', ')}`, r.type && `in ${TYPE[r.type]}`, r.network && `on ${NETWORK_LABEL[r.network]}`].filter(Boolean).join(' ')

export const thenText = (o: RuleOp) =>
  o.op === 'label' ? `Label ${o.value}` : o.op === 'assign' ? `Assign to ${o.value === 'sam' ? 'you' : 'Claire'}` : o.op === 'hide' ? 'Hide' : o.op === 'review' ? 'Mark reviewed' : `Mark ${SENT[o.value]}`

const said = (c: Conversation) => c.messages.filter(m => m.from === 'them').map(m => m.text).join(' ').toLowerCase()

/** The rule fits this conversation (it is on, the network and type match, one word is there). */
export const matches = (r: InboxRule, c: Conversation) =>
  r.on && (!r.network || r.network === c.network) && (!r.type || r.type === c.type) && r.words.some(w => w.trim() && said(c).includes(w.trim().toLowerCase()))

/** What the rule changes on the conversation, or nothing when it is already so. */
export function effect(o: RuleOp, c: Conversation): Partial<Conversation> | undefined {
  switch (o.op) {
    case 'label': return c.labels?.includes(o.value) ? undefined : { labels: [...(c.labels ?? []), o.value] }
    case 'assign': return c.assignee === o.value ? undefined : { assignee: o.value }
    case 'hide': return c.status === 'hidden' ? undefined : { status: 'hidden', note: 'Hidden by Nova · Inbox rule', reviewed: true, reviewedBy: 'nova' }
    case 'review': return c.reviewed ? undefined : { reviewed: true, reviewedBy: 'nova' }
    case 'sentiment': return c.sentiment === o.value ? undefined : { sentiment: o.value }
  }
}

/** Past tense for the journal: "Labelled @ana.climbs Refund". */
export function didText(o: RuleOp, who: string) {
  switch (o.op) {
    case 'label': return `Labelled ${who} “${o.value}”`
    case 'assign': return `Assigned ${who} to ${o.value === 'sam' ? 'you' : 'Claire'}`
    case 'hide': return `Hid ${who}`
    case 'review': return `Marked ${who} reviewed`
    case 'sentiment': return `Marked ${who} ${o.value}`
  }
}

const FILLER = /\b(?:all|any|every|the|requests?|messages?|comments?|dms?|reviews?|mentions?|posts?|people|customers?|about|mentioning|that|which|who|say|says|saying|with|containing|on (?:her|its) own|automatically|always)\b/g

/** The words a sentence like "refund requests" or "messages about crypto or followers" points at. */
export const wordsOf = (phrase: string) =>
  phrase.toLowerCase().replace(FILLER, ' ').split(/,|\bor\b|\band\b/).map(w => w.replace(/[“”"']/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean)
