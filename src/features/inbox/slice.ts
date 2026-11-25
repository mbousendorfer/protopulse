import type { State } from '../../app/state'
import type { Decision, Flagged, Handoff, LogEntry } from '../../app/types'
import { MIN } from '../../app/time'
import { now, pushHandoff, pushLog, removeHandoff, uid, updateHandoff } from '../../app/core'
import type { Escalation } from '../../data/playbook'
import { actionOf } from '../../app/core'
import { didText, effect, matches, RULES, thenText, whenText, type InboxRule, type RuleOp } from './rules'

declare module '../../app/types' {
  interface LogEntry {
    /** Inbox: the conversations as they were before an Inbox rule changed them (Undo puts them back). */
    inboxBefore?: import('../../data/inbox').Conversation[]
    /** Inbox: the rule whose uses went up, and by how much. */
    inboxRuleUses?: { id: string; n: number }
    /** Inbox: the rule this entry added (Undo removes it). */
    inboxRule?: string
  }
}
import { CONVERSATIONS, withTeam, type Assignee, type ConvStatus, type ConvType, type Conversation, type Msg, type Sentiment } from '../../data/inbox'

/** The last group action, kept so it can be undone in one click for a few seconds. */
export type InboxUndo = { label: string; at: number; logId?: string; before: Conversation[]; created: string[]; cards: Handoff[] }
export type InboxState = { convs: Conversation[]; undo?: InboxUndo; rules: InboxRule[] }
export const initialInbox = (): InboxState => ({ convs: structuredClone(CONVERSATIONS), rules: structuredClone(RULES) })

export type BulkOp =
  | { op: 'approve' } | { op: 'hide' } | { op: 'unhide' } | { op: 'reviewed'; value: boolean }
  | { op: 'assign'; value?: Assignee } | { op: 'label'; value: string } | { op: 'unlabel'; value: string } | { op: 'sentiment'; value: Sentiment }

export type InboxAction =
  | { type: 'inbox/approve'; id: string; text?: string }
  | { type: 'inbox/send'; id: string; text: string }
  | { type: 'inbox/takeover'; id: string }
  | { type: 'inbox/hide'; id: string; hidden: boolean }
  | { type: 'inbox/claire'; id: string }
  | { type: 'inbox/undoAuto'; id: string; msg: string }
  | { type: 'inbox/attach'; id: string; att: string }
  | { type: 'inbox/read'; id: string }
  | ({ type: 'inbox/bulk'; ids: string[] } & BulkOp)
  | { type: 'inbox/undo' }
  | { type: 'inbox/dismissUndo' }
  | { type: 'inbox/note'; id: string; text: string }
  | { type: 'inbox/ruleAdd'; rule: Pick<InboxRule, 'words' | 'network' | 'type' | 'then'>; applyNow?: boolean; origin?: string }
  | { type: 'inbox/ruleEdit'; id: string; rule: Pick<InboxRule, 'words' | 'network' | 'type' | 'then'> }
  | { type: 'inbox/ruleToggle'; id: string }
  | { type: 'inbox/ruleDelete'; id: string }
  | { type: 'inbox/ruleRestore'; rule: InboxRule; index: number }
  | { type: 'inbox/ruleApply'; id: string; rule: string }
  | { type: 'inbox/ruleDismiss'; id: string; rule: string }
  | { type: 'inbox/ruleApplyAll' }

const plain = (p?: Flagged[]) => (p ?? []).map(x => (typeof x === 'string' ? x : x.text)).join('')

/** What waits on Sam in the Inbox. Shared by the Needs you view and the rail badge so they always agree. */
export const NEEDS_YOU: Conversation['status'][] = ['draft', 'escalated', 'takeover']
export const inboxNeedsCount = (s: State) => [...virtualConvs(s), ...s.inbox.convs].filter(c => NEEDS_YOU.includes(c.status)).length

type Reply = Extract<NonNullable<Handoff['preview']>, { type: 'reply' }>
const replyOf = (h: Pick<Handoff, 'preview'>) => (h.preview?.type === 'reply' ? h.preview : undefined)

/** The conversation a Nova card carries: kind, mood and who it is. Old saved cards have none, so read the network and the topic. */
export type CardConv = {
  type: ConvType; sentiment: Sentiment; contact?: string; stars?: number; intent?: number; post?: string
  /** What Nova sends when she answers alone (she resolved the doubts flagged in the draft). */
  reply?: string
  /** Author's audience, for the "creators above 50k" escalation. */
  followers?: number
  note?: string
}
export function kindOf(h: Pick<Handoff, 'conv' | 'context' | 'topic' | 'title'>, p: Reply): CardConv {
  if (h.conv) return h.conv
  return {
    type: p.network === 'google' || p.network === 'trustpilot' ? 'review' : /comment|reel|post/i.test(h.context) ? 'comment' : 'dm',
    sentiment: /complaint|review|refund|wrong|late|broken|safety/i.test(`${h.topic} ${h.title}`) ? 'negative' : 'neutral',
  }
}

/** A Nova reply card as a conversation: the customer's message and Nova's draft. */
function cardConv(h: Omit<Handoff, 'id' | 'at'>, p: Reply, id: string, at: number, card?: string): Conversation {
  const k = kindOf(h, p)
  return {
    id, contact: k.contact, author: p.author, network: p.network, type: k.type, sentiment: k.sentiment, stars: k.stars, intent: k.intent, post: k.post,
    at, handoff: card, unread: true, labels: [], note: k.note,
    status: h.lane === 'claire' ? 'claire' : h.action === 'nova-sensitive' ? 'escalated' : 'draft',
    messages: [{ id: `${id}-q`, from: 'them', text: p.text, at: at - MIN }],
    draft: p.draft, rules: h.rules,
    attachments: p.attachments?.map((a, i) => ({ id: `${id}-a${i}`, kind: /refund/i.test(a) ? 'refund' : /code/i.test(a) ? 'code' : 'exchange', label: a.split(' · within')[0], limit: a.includes('within') ? a.slice(a.indexOf('within')) : 'within your limits' })),
  }
}

const sayKey = (author: string, text: string) => `${author}|${text}`
const lastThem = (c: Conversation) => c.messages.filter(m => m.from === 'them').slice(-1)[0]?.text ?? ''

/** Nova reply cards from the Desk that have no conversation yet show up in the Inbox as virtual conversations. */
export function virtualConvs(s: State): Conversation[] {
  const known = new Set(s.inbox.convs.map(c => c.handoff).concat(s.inbox.convs.map(c => c.id)))
  // Same author + same message = same conversation, whatever card raised it.
  const said = new Set(s.inbox.convs.map(c => sayKey(c.author, lastThem(c))))
  const seen = new Set<string>()
  return s.handoffs
    .filter(h => h.agent === 'nova' && replyOf(h) && !known.has(h.id) && !(h.ref && known.has(h.ref)))
    .filter(h => {
      const key = sayKey(replyOf(h)!.author, replyOf(h)!.text)
      if (said.has(key) || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(h => cardConv(h, replyOf(h)!, `h:${h.id}`, h.at, h.id))
}

/** The stored conversation a card is about: linked by id, or the same person saying the same thing. */
function convOf(s: State, h: Handoff): Conversation | undefined {
  const p = replyOf(h)
  return s.inbox.convs.find(x => x.handoff === h.id || x.id === h.ref) ?? (p ? s.inbox.convs.find(x => sayKey(x.author, lastThem(x)) === sayKey(p.author, p.text)) : undefined)
}

/** Turn a virtual conversation into a stored one so actions can apply to it. */
function materialize(s: State, id: string): [State, Conversation | undefined] {
  const c = s.inbox.convs.find(x => x.id === id)
  if (c) return [s, c]
  const v = virtualConvs(s).find(x => x.id === id)
  if (!v) return [s, undefined]
  return [{ ...s, inbox: { ...s.inbox, convs: [v, ...s.inbox.convs] } }, v]
}

const patch = (s: State, id: string, p: Partial<Conversation> | ((c: Conversation) => Partial<Conversation>)): State => ({
  ...s, inbox: { ...s.inbox, convs: s.inbox.convs.map(c => (c.id === id ? { ...withTeam(c), ...(typeof p === 'function' ? p(withTeam(c)) : p) } : c)) },
})

/** Settling a conversation linked to a Desk card takes the card off the Desk. */
function settleCard(s: State, c: Conversation, text: string, status: 'approved' | 'edited' | 'done' = 'approved'): State {
  if (!c.handoff || !s.handoffs.some(h => h.id === c.handoff)) return s
  return pushLog(removeHandoff(s, c.handoff), { agent: 'nova', text, status, reason: 'Your call from the Inbox', link: `/inbox/${c.id}` })
}

const attachmentNote = (c: Conversation) => (c.attachments ?? []).filter(a => !a.removed).map(a => a.label).join(' · ')

const hasDraft = (c: Conversation) => (c.status === 'draft' || c.status === 'escalated') && !!c.draft?.length
/** What a person sent or looked at is reviewed. */
const BY_SAM = { reviewed: true, reviewedBy: 'sam' } as const
const NAME: Record<Assignee, string> = { sam: 'you', claire: 'Claire' }

/** One action on many conversations: one journal line, one Undo. */
function bulk(s0: State, a: Extract<InboxAction, { type: 'inbox/bulk' }>): State {
  const existing = new Set(s0.inbox.convs.map(c => c.id))
  let s = s0
  const targets: Conversation[] = []
  for (const id of a.ids) { const [n, c] = materialize(s, id); s = n; if (c) targets.push(c) }
  const picked = a.op === 'approve' ? targets.filter(hasDraft) : targets
  if (!picked.length) return s0
  const t = now(s)
  const ids = new Set(picked.map(c => c.id))
  const cards = s.handoffs.filter(h => picked.some(c => c.handoff === h.id))
  const change = (c: Conversation): Partial<Conversation> => {
    switch (a.op) {
      case 'approve': return { status: 'you', draft: undefined, unread: false, ...BY_SAM, messages: [...c.messages, { id: uid('m'), from: 'nova', text: plain(c.draft), at: t, approved: true }] }
      case 'hide': return { status: 'hidden', note: 'Hidden by you' }
      case 'unhide': return { status: c.draft?.length ? 'draft' : 'auto', note: undefined }
      case 'reviewed': return { reviewed: a.value, reviewedBy: a.value ? 'sam' : undefined, unread: false }
      case 'assign': return { assignee: a.value }
      case 'label': return { labels: [...new Set([...(c.labels ?? []), a.value])] }
      case 'unlabel': return { labels: (c.labels ?? []).filter(l => l !== a.value) }
      case 'sentiment': return { sentiment: a.value }
    }
  }
  const n = picked.length, them = n === 1 ? picked[0].author : `${n} conversations`
  const label = {
    approve: `Sent ${n === 1 ? `the reply to ${picked[0].author}` : `${n} replies Nova drafted`}`,
    hide: `Hid ${them}`, unhide: `Unhid ${them}`,
    reviewed: `Marked ${them} as ${a.op === 'reviewed' && a.value ? 'reviewed' : 'not reviewed'}`,
    assign: a.op === 'assign' ? (a.value ? `Assigned ${them} to ${NAME[a.value]}` : `Unassigned ${them}`) : '',
    label: a.op === 'label' ? `Labelled ${them} “${a.value}”` : '', unlabel: a.op === 'unlabel' ? `Removed “${a.value}” from ${them}` : '',
    sentiment: a.op === 'sentiment' ? `Set ${them} to ${a.value}` : '',
  }[a.op]
  // Sending or hiding settles the linked Desk cards, like doing it one by one.
  const settles = a.op === 'approve' || a.op === 'hide'
  let next: State = { ...s, handoffs: settles ? s.handoffs.filter(h => !cards.includes(h)) : s.handoffs, inbox: { ...s.inbox, convs: s.inbox.convs.map(c => (ids.has(c.id) ? { ...withTeam(c), ...change(withTeam(c)) } : c)) } }
  next = pushLog(next, { agent: 'nova', text: label, status: a.op === 'approve' ? 'approved' : 'done', reason: n > 1 ? 'Your call from the Inbox, in one go' : 'Your call from the Inbox', link: '/inbox' })
  const undo: InboxUndo = { label, at: t, logId: next.log[0].id, before: s0.inbox.convs.filter(c => ids.has(c.id)), created: picked.map(c => c.id).filter(id => !existing.has(id)), cards: settles ? cards : [] }
  return { ...next, inbox: { ...next.inbox, undo } }
}

function undoBulk(s: State): State {
  const u = s.inbox.undo
  if (!u) return s
  const before = new Map(u.before.map(c => [c.id, c]))
  const convs = s.inbox.convs.filter(c => !u.created.includes(c.id)).map(c => before.get(c.id) ?? c)
  const cardIds = new Set(s.handoffs.map(h => h.id))
  return {
    ...s,
    handoffs: [...u.cards.filter(h => !cardIds.has(h.id)), ...s.handoffs],
    log: s.log.map(l => (l.id === u.logId ? { ...l, status: 'undone' as const } : l)),
    inbox: { ...s.inbox, convs, undo: undefined },
  }
}

export function reduceInbox(s0: State, a: InboxAction): State {
  if (isRule(a)) return reduceRules(s0, a)
  if (a.type === 'inbox/bulk') return bulk(s0, a)
  if (a.type === 'inbox/undo') return undoBulk(s0)
  if (a.type === 'inbox/dismissUndo') return s0.inbox.undo ? { ...s0, inbox: { ...s0.inbox, undo: undefined } } : s0
  const [s, c] = materialize(s0, a.id)
  if (!c) return s0
  const t = now(s)
  switch (a.type) {
    case 'inbox/approve': {
      const text = a.text ?? plain(c.draft)
      const edited = a.text !== undefined && a.text !== plain(c.draft)
      let next = patch(s, c.id, x => ({ status: 'you', draft: undefined, unread: false, ...BY_SAM, note: attachmentNote(x) ? `Sent with: ${attachmentNote(x)}` : x.note, messages: [...x.messages, { id: uid('m'), from: 'nova', text, at: t, approved: true }] }))
      next = settleCard(next, c, `Reply to ${c.author}: ${edited ? 'approved with your edits' : 'approved'}`, edited ? 'edited' : 'approved')
      if (!c.handoff) next = pushLog(next, { agent: 'nova', text: `Reply to ${c.author}: ${edited ? 'approved with your edits' : 'approved'}`, status: edited ? 'edited' : 'approved', reason: 'Your call from the Inbox', link: `/inbox/${c.id}` })
      return next
    }
    case 'inbox/send': {
      let next = patch(s, c.id, x => ({ status: 'you', draft: undefined, unread: false, ...BY_SAM, messages: [...x.messages, { id: uid('m'), from: 'you', text: a.text, at: t }] }))
      next = settleCard(next, c, `You replied to ${c.author} yourself`, 'done')
      if (!c.handoff || next === s) next = pushLog(next, { agent: 'nova', text: `You replied to ${c.author} yourself`, status: 'done', reason: 'Your call from the Inbox', link: `/inbox/${c.id}` })
      return next
    }
    case 'inbox/takeover': {
      // Assigned to Sam too, so it's under "Assigned to me" once he closes the panel.
      const next = patch(s, c.id, { status: 'takeover', unread: false, assignee: 'sam' })
      return pushLog(next, { agent: 'nova', text: `You took over the conversation with ${c.author}. Nova stops replying there.`, status: 'done', link: `/inbox/${c.id}` })
    }
    case 'inbox/hide': {
      let next = patch(s, c.id, { status: a.hidden ? 'hidden' : c.messages.some(m => m.from !== 'them') ? 'auto' : 'draft', note: a.hidden ? 'Hidden by you' : undefined })
      if (a.hidden) next = settleCard(next, c, `Hid ${c.author}’s message`, 'done')
      return pushLog(next, { agent: 'nova', text: a.hidden ? `You hid ${c.author}’s message` : `You unhid ${c.author}’s message`, status: 'done', link: `/inbox/${c.id}` })
    }
    case 'inbox/claire': {
      let next = patch(s, c.id, { status: 'claire' })
      const claire = { askedAt: t, dueAt: t + (30 + Math.round(Math.random() * 30)) * 1000 }
      if (c.handoff && next.handoffs.some(h => h.id === c.handoff)) next = updateHandoff(next, c.handoff, { lane: 'claire', claire })
      else {
        const hid = uid('h')
        next = pushHandoff(next, {
          id: hid, agent: 'nova', kind: 'approval', urgency: 'today', topic: 'Reply', action: 'nova-complaint', ref: c.id, link: `/inbox/${c.id}`,
          title: `Reply to ${c.author}`, context: c.messages.filter(m => m.from === 'them').slice(-1)[0]?.text ?? '', why: 'You asked Claire from the Inbox.', confidence: 80,
          preview: { type: 'reply', network: c.network, author: c.author, text: c.messages.filter(m => m.from === 'them').slice(-1)[0]?.text ?? '', draft: c.draft ?? [''] },
        })
        next = updateHandoff(patch(next, c.id, { handoff: hid }), hid, { lane: 'claire', claire })
      }
      return next
    }
    case 'inbox/undoAuto': {
      const msg = c.messages.find(m => m.id === a.msg)
      return msg ? undoAlone(s, c, msg) : s
    }
    case 'inbox/attach':
      return patch(s, c.id, x => ({ attachments: x.attachments?.map(at => (at.id === a.att ? { ...at, removed: !at.removed } : at)) }))
    case 'inbox/read':
      return c.unread ? patch(s, c.id, { unread: false }) : s0
    case 'inbox/note': {
      if (!a.text.trim()) return s0
      return patch(s, c.id, x => ({ notes: [...(x.notes ?? []), { id: uid('n'), at: t, by: 'sam', text: a.text.trim() }] }))
    }
  }
}

/** Nova's reply sent alone, taken back: the message stays crossed out, the text comes back as a draft, the journal says so. */
function undoAlone(s: State, c: Conversation, msg: Msg): State {
  let next = patch(s, c.id, x => ({ status: 'draft', draft: [msg.text], reviewed: false, reviewedBy: undefined, messages: x.messages.map(m => (m.id === msg.id ? { ...m, undone: true, undoUntil: undefined } : m)) }))
  if (msg.log) next = { ...next, log: next.log.map(l => (l.id === msg.log ? { ...l, status: 'undone' as const } : l)) }
  if (msg.log && s.log.find(l => l.id === msg.log)?.status === 'undone') return next
  return pushLog(next, { agent: 'nova', text: `Undone: Nova’s reply to ${c.author}. It’s back as a draft.`, status: 'undone', link: `/inbox/${c.id}` })
}

/**
 * A scripted Nova event handled alone (on Act): the conversation lands in Handled by Nova with her reply, and the journal
 * line links to it. Undoing the line puts the reply back as a draft. Once per event.
 */
export function handledAlone(s: State, h: Omit<Handoff, 'id' | 'at'>, auto: { text: string; reason: string }): State {
  if (s.log.some(l => l.text === auto.text)) return s
  const p = replyOf(h)
  const t = now(s)
  const id = uid('c')
  const next = pushLog(s, { agent: 'nova', text: auto.text, reason: auto.reason, status: 'done', undoMinutes: 10, link: p ? `/inbox/${id}` : '/inbox' })
  if (!p) return next
  const base = cardConv(h, p, id, t)
  const sent = (base.attachments ?? []).map(a => a.label).join(' · ')
  const conv: Conversation = {
    ...base, status: 'auto', unread: false, reviewed: true, reviewedBy: 'nova', draft: undefined, attachments: undefined, note: sent ? `Sent with: ${sent}` : undefined,
    messages: [{ ...base.messages[0], at: t - 2 * MIN }, { id: uid('m'), from: 'nova', text: kindOf(h, p).reply ?? plain(p.draft), at: t, auto: true, undoUntil: t + 10 * MIN, log: next.log[0].id }],
  }
  return runRules({ ...next, inbox: { ...next.inbox, convs: [conv, ...next.inbox.convs] } }, id)
}

/**
 * Every settled Desk card updates its conversation: by Sam, Claire, a batch or Act (`d.act`: then the reply is Nova's own,
 * in Handled by Nova). What it looked like before is kept, so the journal's Undo puts it back (see onUndoInbox).
 */
export function onResolveInbox(s0: State, h: Handoff, d: Decision): State {
  const p = replyOf(h)
  let s = s0
  let c = convOf(s, h)
  let created = false
  if (!c) {
    // A Nova reply settled straight from the Desk: record the conversation so the Inbox stays the full history.
    if (h.agent !== 'nova' || !p || (d.kind !== 'approve' && d.kind !== 'option')) return s0
    c = cardConv(h, p, uid('c'), h.at, h.id)
    s = { ...s, inbox: { ...s.inbox, convs: [c, ...s.inbox.convs] } }
    created = true
  }
  const conv = c
  const t = now(s)
  const draft = p ? plain(p.draft) : plain(conv.draft)
  const extras = attachmentNote(conv)
  const send = (status: ConvStatus, text = draft): Partial<Conversation> => ({
    status: d.act ? 'auto' : status, unread: false, reviewed: true, reviewedBy: d.act ? 'nova' : 'sam', draft: undefined, note: extras ? `Sent with: ${extras}` : conv.note,
    messages: text ? [...conv.messages, { id: uid('m'), from: 'nova', text, at: t, approved: !d.act, auto: d.act, card: h.id }] : conv.messages,
  })
  let change: Partial<Conversation> | undefined
  switch (d.kind) {
    case 'approve': change = send('you', d.edited ?? draft); break
    case 'reject': change = { status: d.reason === 'Dismissed' ? 'auto' : 'takeover', note: `Nova’s draft rejected${d.reason ? `: ${d.reason.toLowerCase()}` : ''}. You’re handling it.` }; break
    case 'option':
      if (/claire/i.test(d.option)) change = { ...send('claire'), status: 'claire', note: draft ? 'Holding reply sent. Forwarded to Claire.' : 'Forwarded to Claire.' }
      else if (/holding/i.test(d.option)) change = send('you')
      else change = { status: 'takeover', note: 'You’re handling this one yourself.' }
      break
    case 'answer': change = { status: 'takeover' }; break
    case 'trial': break
  }
  if (!change) return s0
  const settled = { card: h.id, created, status: conv.status, draft: conv.draft, note: conv.note, unread: conv.unread, reviewed: conv.reviewed, reviewedBy: conv.reviewedBy }
  return patch(s, conv.id, { ...change, settled })
}

/** The journal's Undo: a card's decision comes off its conversation, and a reply Nova sent alone comes back as a draft. */
export function onUndoInbox(s: State, entry: LogEntry): State {
  let next = undoRules(s, entry)
  for (const h of entry.restore ?? []) {
    const c = next.inbox.convs.find(x => x.settled?.card === h.id)
    if (!c?.settled) continue
    const b = c.settled
    next = b.created
      ? { ...next, inbox: { ...next.inbox, convs: next.inbox.convs.filter(x => x.id !== c.id) } }
      : patch(next, c.id, { status: b.status, draft: b.draft, note: b.note, unread: b.unread, reviewed: b.reviewed, reviewedBy: b.reviewedBy, settled: undefined, messages: c.messages.filter(m => m.card !== h.id) })
  }
  const alone = next.inbox.convs.find(x => x.messages.some(m => m.log === entry.id && !m.undone))
  const msg = alone?.messages.find(m => m.log === entry.id)
  return alone && msg ? undoAlone(next, alone, msg) : next
}

/* ---------- Playbook escalations, applied on arrival ---------- */

/** What each built-in escalation listens for. A rule Sam adds in Agents › Escalation listens for the long words of its label. */
const ESC_WORDS: Record<string, RegExp> = {
  'e-injury': /injur|\bhurt|\bfell\b|\bfall(?:en|ing)?\b|bleed|hospital|\bknee|ankle|wrist|\bburn|recall|unsafe|dangerous/i,
  'e-press': /journalist|reporter|article|editor\b|magazine|newspaper|podcast|writing a (?:piece|story)|for a story/i,
  'e-legal': /lawyer|legal|attorney|\bsue\b|suing|court|lawsuit|consumer protection/i,
  'e-budget': /\bmy rate\b|\bfee\b|paid (?:collab|partnership)|sponsor|media kit/i,
  'e-pricing': /\bprice|discount|promo code|coupon/i,
}
const TOPIC: Record<string, string> = { 'e-injury': 'Safety', 'e-press': 'Press', 'e-legal': 'Legal', 'e-creator': 'Creator', 'e-refund': 'Refund', 'e-budget': 'Creator', 'e-pricing': 'Pricing' }
const labelWords = (label: string) => {
  const w = label.toLowerCase().match(/[a-zà-ÿ]{5,}/g) ?? []
  return w.length ? new RegExp(w.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i') : /$^/
}
export type EscalationHit = Pick<Escalation, 'id' | 'label' | 'to'> & { topic: string }

/** The first escalation rule that is on for Nova and matches what came in, in the Playbook's order. */
export function escalationFor(s: State, text: string, meta: { followers?: number; refund?: number } = {}): EscalationHit | undefined {
  for (const e of s.playbook.escalate) {
    if (!e.on || !e.agents.includes('nova')) continue
    const hit = e.id === 'e-creator' ? (meta.followers ?? 0) > 50_000 : e.id === 'e-refund' ? (meta.refund ?? 0) > 150 : (ESC_WORDS[e.id] ?? labelWords(e.label)).test(text)
    if (hit) return { id: e.id, label: e.label, to: e.to, topic: TOPIC[e.id] ?? 'Escalation' }
  }
}

/** The largest euro amount Nova's draft would refund or exchange. */
const refundOf = (p: Reply) => Math.max(0, ...(p.attachments ?? []).map(a => Number(a.match(/€\s?(\d+(?:[.,]\d+)?)/)?.[1].replace(',', '.') ?? 0)))

/** The escalation a Nova reply card would trigger, if any. */
export const escalationOf = (s: State, h: Omit<Handoff, 'id' | 'at'>) => {
  const p = replyOf(h)
  return p ? escalationFor(s, p.text, { followers: h.conv?.followers, refund: refundOf(p) }) : undefined
}

/**
 * A message that matches an escalation rule never gets Nova's own answer, whatever her autonomy: it goes to Your call
 * (or to Claire when the rule says so) with a holding reply, and the journal quotes the rule.
 */
export function escalate(s: State, h: Omit<Handoff, 'id' | 'at'>, hit: EscalationHit, ref: string): State {
  const p = replyOf(h)!
  const t = now(s)
  const first = p.author.replace(/^@/, '').split(/[\s._·]/)[0]
  const name = first.charAt(0).toUpperCase() + first.slice(1)
  const holding = `${name}, thank you for telling us. ${hit.id === 'e-injury' ? 'We’re sorry, and we hope you’re OK. ' : ''}A member of our team will get back to you today.`
  const why = `Escalated · rule “${hit.label}”`
  let next = pushHandoff(s, {
    ...structuredClone(h), kind: 'approval', action: 'nova-sensitive', topic: hit.topic, urgency: 'urgent', ref,
    why: `${why}. Nova never answers this herself, whatever her autonomy.`, rules: [hit.label], sources: undefined,
    conv: { ...kindOf(h, p), note: why }, preview: { ...p, draft: [holding], attachments: undefined },
  })
  const id = next.handoffs[0].id
  if (hit.to === 'claire') next = updateHandoff(next, id, { lane: 'claire', claire: { askedAt: t, dueAt: t + 45_000 } })
  next = land(next, id)
  return pushLog(next, { agent: 'nova', text: `Escalated ${p.author} to ${hit.to === 'claire' ? 'Claire' : 'you'} · rule: ${hit.label}`, status: 'done', reason: 'Playbook escalation, whatever the autonomy', link: `/inbox/h:${id}` })
}

/* ---------- Inbox rules ---------- */

const rulesLevel = (s: State) => actionOf(s, 'nova', 'nova-rules')?.autonomy ?? 'act'
const setRules = (s: State, rules: InboxRule[]): State => ({ ...s, inbox: { ...s.inbox, rules } })

/** Apply one rule to some conversations: one journal line, a real Undo, the rule's count goes up. */
function applyRule(s: State, r: InboxRule, ids: string[], by: 'nova' | 'sam', reason: string): State {
  const pick = new Set(ids)
  const before = s.inbox.convs.filter(c => pick.has(c.id) && effect(r.then, withTeam(c)))
  if (!before.length) return s
  const hit = new Set(before.map(c => c.id))
  const next = {
    ...s,
    inbox: {
      ...s.inbox,
      rules: s.inbox.rules.map(x => (x.id === r.id ? { ...x, uses: x.uses + before.length } : x)),
      convs: s.inbox.convs.map(c => (hit.has(c.id) ? { ...withTeam(c), ...effect(r.then, withTeam(c)), suggested: c.suggested?.filter(x => x !== r.id) } : c)),
    },
  }
  const who = before.length === 1 ? before[0].author : `${before.length} conversations`
  return pushLog(next, {
    agent: 'nova', text: `${didText(r.then, who)} · rule: ${whenText(r)}`, status: by === 'nova' ? 'done' : 'approved', reason, undoMinutes: 30,
    link: before.length === 1 ? `/inbox/${before[0].id}` : '/inbox', inboxBefore: before, inboxRuleUses: { id: r.id, n: before.length },
  })
}

/** A conversation just came in: on Act Nova applies every rule that fits; otherwise she lists them as suggestions. */
export function runRules(s: State, id: string): State {
  const c = s.inbox.convs.find(x => x.id === id)
  if (!c) return s
  const fits = s.inbox.rules.filter(r => matches(r, withTeam(c)) && effect(r.then, withTeam(c)))
  if (!fits.length) return s
  if (rulesLevel(s) !== 'act') return patch(s, id, { suggested: fits.map(r => r.id) })
  return fits.reduce((next, r) => applyRule(next, r, [id], 'nova', 'Inbox rule, set to Act'), s)
}

/** A card's conversation lands in the Inbox for real, so rules can act on it. */
export function land(s: State, cardId: string): State {
  const [next, c] = materialize(s, `h:${cardId}`)
  return c ? runRules(next, c.id) : s
}

type RuleAction = Extract<InboxAction, { type: `inbox/rule${string}` }>
const isRule = (a: InboxAction): a is RuleAction => a.type.startsWith('inbox/rule')

function reduceRules(s: State, a: RuleAction): State {
  const rules = s.inbox.rules
  switch (a.type) {
    case 'inbox/ruleAdd': {
      const r: InboxRule = { ...a.rule, id: uid('ir'), on: true, uses: 0, origin: a.origin ?? 'Added by you' }
      let next = pushLog(setRules(s, [r, ...rules]), {
        agent: 'nova', text: `New Inbox rule: when a message ${whenText(r)}, ${thenText(r.then).toLowerCase()}`, status: 'done',
        reason: a.origin ?? 'You added it', undoMinutes: 30, link: '/inbox?rules=1', inboxRule: r.id,
      })
      if (a.applyNow) next = applyRule(next, r, next.inbox.convs.filter(c => matches(r, withTeam(c))).map(c => c.id), 'sam', 'New rule, applied to what matches now')
      return next
    }
    case 'inbox/ruleEdit': return setRules(s, rules.map(r => (r.id === a.id ? { ...r, ...a.rule } : r)))
    case 'inbox/ruleToggle': return setRules(s, rules.map(r => (r.id === a.id ? { ...r, on: !r.on } : r)))
    case 'inbox/ruleDelete': return setRules(s, rules.filter(r => r.id !== a.id))
    case 'inbox/ruleRestore': return rules.some(r => r.id === a.rule.id) ? s : setRules(s, [...rules.slice(0, a.index), a.rule, ...rules.slice(a.index)])
    case 'inbox/ruleApply': {
      const r = rules.find(x => x.id === a.rule)
      return r ? applyRule(s, r, [a.id], 'sam', 'Nova suggested it, you applied it') : s
    }
    case 'inbox/ruleDismiss': return patch(s, a.id, c => ({ suggested: c.suggested?.filter(x => x !== a.rule) }))
    case 'inbox/ruleApplyAll': return rules.reduce((next, r) => applyRule(next, r, next.inbox.convs.filter(c => c.suggested?.includes(r.id)).map(c => c.id), 'sam', 'Nova lined them up, you applied them in one go'), s)
  }
}

/** Every suggestion waiting, for the Draft batch in the rules panel. */
export const suggestedCount = (s: State) => s.inbox.convs.reduce((n, c) => n + (c.suggested?.filter(id => s.inbox.rules.some(r => r.id === id && r.on)).length ?? 0), 0)

/** Undo of a rule's journal line: the conversations as they were, the count back down; a rule added is removed. */
function undoRules(s: State, entry: LogEntry): State {
  let next = s
  if (entry.inboxBefore) {
    const back = new Map(entry.inboxBefore.map(c => [c.id, c]))
    next = { ...next, inbox: { ...next.inbox, convs: next.inbox.convs.map(c => back.get(c.id) ?? c) } }
  }
  if (entry.inboxRuleUses) {
    const { id, n } = entry.inboxRuleUses
    next = setRules(next, next.inbox.rules.map(r => (r.id === id ? { ...r, uses: Math.max(0, r.uses - n) } : r)))
  }
  if (entry.inboxRule) next = setRules(next, next.inbox.rules.filter(r => r.id !== entry.inboxRule))
  return next
}
export type { RuleOp }
