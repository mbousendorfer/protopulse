import type { State } from '../../app/state'
import type { Decision, Flagged, Handoff, LogEntry } from '../../app/types'
import { hhmm, MIN } from '../../app/time'
import { now, pushHandoff, pushLog, removeHandoff, uid, updateHandoff } from '../../app/core'
import type { Escalation } from '../../data/playbook'
import { actionOf } from '../../app/core'
import type { SavedView } from './filters'
import { fill, firstName, SAVED, type SavedReply } from './saved'
import { didText, effect, matches, RULES, TEAM_DELAY, thenText, whenText, type InboxRule, type RuleOp } from './rules'

declare module '../../app/types' {
  interface LogEntry {
    /** Inbox: the conversations as they were before an Inbox rule changed them (Undo puts them back). */
    inboxBefore?: import('../../data/inbox').Conversation[]
    /** Inbox: the rule whose uses went up, and by how much. */
    inboxRuleUses?: { id: string; n: number }
    /** Inbox: the rule this entry added (Undo removes it). */
    inboxRule?: string
    /** Inbox: rules and labels as they were before a label was renamed or deleted. */
    inboxRulesBefore?: import('./rules').InboxRule[]
    inboxLabelsBefore?: string[]
    /** Inbox: banned authors before a ban. */
    inboxBannedBefore?: string[]
  }
}
import { CONTACTS, CONVERSATIONS, LABELS, ROSTER, TEAMMATES, withTeam, type Assignee, type ConvStatus, type ConvType, type Conversation, type Msg, type Sentiment } from '../../data/inbox'

/** The last group action, kept so it can be undone in one click for a few seconds. */
export type InboxUndo = { label: string; at: number; logId?: string; before: Conversation[]; created: string[]; cards: Handoff[]; rules?: InboxRule[]; banned?: string[] }
/** `taught`: conversations Sam labelled by hand, per label, not covered by a rule yet (3 make Nova propose one). */
/** `targets`: response target per type, in minutes. `warned`: conversations Nova already raised before their target. */
export type InboxState = { convs: Conversation[]; undo?: InboxUndo; rules: InboxRule[]; taught?: Record<string, string[]>; saved: SavedReply[]; targets: Record<ConvType, number>; warned?: string[]; labels: string[]; banned?: string[]; views: SavedView[] }
export const initialInbox = (): InboxState => ({ convs: structuredClone(CONVERSATIONS), rules: structuredClone(RULES), saved: structuredClone(SAVED), targets: { ...TARGETS }, labels: [...LABELS, 'Order status', 'Trail Week'], views: [] })

export type BulkOp =
  | { op: 'approve' } | { op: 'hide' } | { op: 'unhide' } | { op: 'reviewed'; value: boolean }
  | { op: 'assign'; value?: Assignee } | { op: 'label'; value: string } | { op: 'unlabel'; value: string } | { op: 'sentiment'; value: Sentiment }

export type InboxAction =
  | { type: 'inbox/approve'; id: string; text?: string; dm?: string }
  | { type: 'inbox/send'; id: string; text: string; saved?: string }
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
  | { type: 'inbox/savedAdd'; name: string; text: string }
  | { type: 'inbox/savedEdit'; id: string; name: string; text: string }
  | { type: 'inbox/savedDelete'; id: string }
  | { type: 'inbox/savedRestore'; reply: SavedReply; index: number }
  | { type: 'inbox/savedUse'; id: string; saved: string }
  | { type: 'inbox/target'; kind: ConvType; minutes: number }
  | { type: 'inbox/labelAdd'; name: string }
  | { type: 'inbox/labelRename'; from: string; to: string }
  | { type: 'inbox/labelDelete'; name: string }
  | { type: 'inbox/moderate'; ids: string[]; op: ModOp }
  | { type: 'inbox/private'; id: string }
  | { type: 'inbox/ingest'; mention: Ingest }
  | { type: 'inbox/viewAdd'; view: Omit<SavedView, 'id'> }
  | { type: 'inbox/viewDelete'; id: string }
  | { type: 'inbox/viewRestore'; view: SavedView; index: number }

const plain = (p?: Flagged[]) => (p ?? []).map(x => (typeof x === 'string' ? x : x.text)).join('')

/** What waits on Sam in the Inbox. Shared by the Needs you view and the rail badge so they always agree. */
export const NEEDS_YOU: Conversation['status'][] = ['draft', 'escalated', 'takeover']
/** Needs Sam: waiting on a person, and not handed to a teammate who answers it. */
export const needsYou = (c: Conversation) => NEEDS_YOU.includes(c.status) && !(c.assignee && TEAMMATES.includes(c.assignee))
export const inboxNeedsCount = (s: State) => [...virtualConvs(s), ...s.inbox.convs].filter(needsYou).length

type Reply = Extract<NonNullable<Handoff['preview']>, { type: 'reply' }>
const replyOf = (h: Pick<Handoff, 'preview'>) => (h.preview?.type === 'reply' ? h.preview : undefined)

/** The conversation a Nova card carries: kind, mood and who it is. Old saved cards have none, so read the network and the topic. */
export type CardConv = {
  type: ConvType; sentiment: Sentiment; contact?: string; stars?: number; intent?: number; post?: string
  /** What Nova sends when she answers alone (she resolved the doubts flagged in the draft). */
  reply?: string
  /** The saved reply Nova started from. */
  saved?: string
  /** Author's audience, for the "creators above 50k" escalation. */
  followers?: number
  note?: string
  /** The private half of the reply on a public message (see `Conversation.dm`). */
  dm?: string
  /** The words that made Nova escalate. */
  trigger?: string
  /** The product a "which one is it?" question is about (see products.ts). */
  product?: Conversation['product']
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
    at, handoff: card, unread: true, labels: [], note: k.note, savedFrom: k.saved, dm: k.dm, trigger: k.trigger, product: k.product,
    status: h.lane === 'claire' ? 'claire' : h.action === 'nova-sensitive' || h.action === 'nova-holding' ? 'escalated' : 'draft',
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

/* ---------- Public line, then a DM ---------- */

/** Public messages Nova can follow up in private. */
export const PUBLIC: ConvType[] = ['comment', 'mention', 'ad']
/** The DM conversation that continues a public one. */
export const dmId = (id: string) => `${id}-dm`
const dmBase = (c: Conversation, t: number): Conversation => ({
  id: dmId(c.id), contact: c.contact, author: c.author, network: c.network, type: 'dm', sentiment: c.sentiment, at: t, status: 'you', labels: c.labels ?? [], assignee: c.assignee,
  messages: [{ id: uid('m'), from: 'them', text: lastThem(c), at: c.at }],
  note: `From a public ${c.type} on ${NET_NAME[c.network]}${c.post ? ` · ${c.post}` : ''}`,
})
/** Nova's DM, sent right after her public line: added to the DM conversation, created if needed. */
function deliverDm(s: State, c: Conversation, text: string, m: Partial<Msg>, p: Partial<Conversation> = {}): State {
  const t = now(s)
  const msg: Msg = { id: uid('m'), from: 'nova', text, at: t, dm: true, ...m }
  const there = s.inbox.convs.find(x => x.id === dmId(c.id))
  if (there) return patch(s, there.id, x => ({ ...p, messages: [...x.messages, msg] }))
  const conv = dmBase(c, t)
  return { ...s, inbox: { ...s.inbox, convs: [{ ...conv, ...p, messages: [...conv.messages, msg] }, ...s.inbox.convs] } }
}
/** Takes Nova's DM back: the message goes, and a DM conversation that only held it goes too. */
function undoDm(s: State, id: string, which: (m: Msg) => boolean): State {
  const c = s.inbox.convs.find(x => x.id === dmId(id))
  if (!c?.messages.some(which)) return s
  const messages = c.messages.filter(m => !which(m))
  const convs = messages.some(m => m.from !== 'them') ? s.inbox.convs.map(x => (x.id === c.id ? { ...x, messages } : x)) : s.inbox.convs.filter(x => x.id !== c.id)
  return { ...s, inbox: { ...s.inbox, convs } }
}

const hasDraft = (c: Conversation) => (c.status === 'draft' || c.status === 'escalated') && !!c.draft?.length
/** What a person sent or looked at is reviewed. */
const BY_SAM = { reviewed: true, reviewedBy: 'sam' } as const
const NAME: Record<Assignee, string> = { sam: 'you', claire: 'Claire', leo: 'Léo', yanis: 'Yanis' }

/** A draft started from a saved reply went out: that reply's count goes up. */
const bumpSaved = (s: State, ...ids: (string | undefined)[]): State => {
  const hit = ids.filter(Boolean)
  return hit.length ? { ...s, inbox: { ...s.inbox, saved: s.inbox.saved.map(r => ({ ...r, uses: r.uses + hit.filter(x => x === r.id).length })) } } : s
}

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
      case 'approve': return { status: 'you', draft: undefined, dm: undefined, note: c.dm ? 'Continued in private messages' : c.note, unread: false, ...BY_SAM, messages: [...c.messages, { id: uid('m'), from: 'nova', text: plain(c.draft), at: t, approved: true }] }
      case 'hide': return { status: 'hidden', note: 'Hidden by you' }
      case 'unhide': return { status: c.draft?.length ? 'draft' : 'auto', note: undefined }
      case 'reviewed': return { reviewed: a.value, reviewedBy: a.value ? 'sam' : undefined, unread: false }
      case 'assign': return { assignee: a.value, teamDue: a.value && TEAMMATES.includes(a.value) ? t + TEAM_DELAY : undefined }
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
  if (a.op === 'approve') next = bumpSaved(next, ...picked.map(c => c.savedFrom))
  // The DM half of a reply on a public message goes out with it, and comes back with the group Undo.
  const dms = a.op === 'approve' ? picked.filter(c => c.dm) : []
  for (const c of dms) next = deliverDm(next, c, c.dm!, { approved: true })
  next = pushLog(next, { agent: 'nova', text: label, status: a.op === 'approve' ? 'approved' : 'done', reason: n > 1 ? 'Your call from the Inbox, in one go' : 'Your call from the Inbox', link: '/inbox' })
  const dmIds = new Set(dms.map(c => dmId(c.id)))
  const undo: InboxUndo = { label, at: t, logId: next.log[0].id, before: s0.inbox.convs.filter(c => ids.has(c.id) || dmIds.has(c.id)), created: [...picked.map(c => c.id), ...dmIds].filter(id => !existing.has(id)), cards: settles ? cards : [] }
  next = { ...next, inbox: { ...next.inbox, undo } }
  if (a.op === 'label' && !next.inbox.labels.includes(a.value)) next = { ...next, inbox: { ...next.inbox, labels: [...next.inbox.labels, a.value] } }
  return a.op === 'label' ? teach(next, a.value, picked.map(c => c.id)) : next
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
    inbox: { ...s.inbox, convs, undo: undefined, rules: u.rules ?? s.inbox.rules, banned: u.banned ?? s.inbox.banned },
  }
}

export function reduceInbox(s0: State, a: InboxAction): State {
  if (isRule(a)) return reduceRules(s0, a)
  if (isSaved(a)) return reduceSaved(s0, a)
  if (a.type === 'inbox/viewAdd') return a.view.name.trim() ? { ...s0, inbox: { ...s0.inbox, views: [...s0.inbox.views, { ...a.view, name: a.view.name.trim(), id: uid('v') }] } } : s0
  if (a.type === 'inbox/viewDelete') return { ...s0, inbox: { ...s0.inbox, views: s0.inbox.views.filter(v => v.id !== a.id) } }
  if (a.type === 'inbox/viewRestore') return s0.inbox.views.some(v => v.id === a.view.id) ? s0 : { ...s0, inbox: { ...s0.inbox, views: [...s0.inbox.views.slice(0, a.index), a.view, ...s0.inbox.views.slice(a.index)] } }
  if (a.type === 'inbox/ingest') return ingest(s0, a.mention)
  if (a.type === 'inbox/moderate') return moderate(s0, a.ids, a.op, 'sam')
  if (a.type === 'inbox/private') return replyInPrivate(s0, a.id)
  if (a.type === 'inbox/labelAdd' || a.type === 'inbox/labelRename' || a.type === 'inbox/labelDelete') return reduceLabels(s0, a)
  if (a.type === 'inbox/target') return { ...s0, inbox: { ...s0.inbox, targets: { ...s0.inbox.targets, [a.kind]: a.minutes } } }
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
      const dm = a.dm ?? c.dm
      let next = patch(s, c.id, x => ({ status: 'you', draft: undefined, dm: undefined, unread: false, ...BY_SAM, note: dm ? 'Continued in private messages' : attachmentNote(x) ? `Sent with: ${attachmentNote(x)}` : x.note, messages: [...x.messages, { id: uid('m'), from: 'nova', text, at: t, approved: true }] }))
      if (dm) next = deliverDm(next, c, dm, { approved: true })
      next = bumpSaved(settleCard(next, c, `Reply to ${c.author}: ${edited ? 'approved with your edits' : 'approved'}`, edited ? 'edited' : 'approved'), c.savedFrom)
      if (!c.handoff) next = pushLog(next, { agent: 'nova', text: `Reply to ${c.author}: ${edited ? 'approved with your edits' : 'approved'}`, status: edited ? 'edited' : 'approved', reason: 'Your call from the Inbox', link: `/inbox/${c.id}` })
      return next
    }
    case 'inbox/send': {
      let next = patch(s, c.id, x => ({ status: 'you', draft: undefined, unread: false, ...BY_SAM, messages: [...x.messages, { id: uid('m'), from: 'you', text: a.text, at: t }] }))
      next = bumpSaved(settleCard(next, c, `You replied to ${c.author} yourself`, 'done'), a.saved)
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
  const pair = msg.log ? s.inbox.convs.find(x => x.id === dmId(c.id))?.messages.find(m => m.log === msg.log) : undefined
  if (pair) return undoHolding(s, c, msg, pair)
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
    ...base, status: 'auto', unread: false, reviewed: true, reviewedBy: 'nova', draft: undefined, dm: undefined, attachments: undefined, note: base.dm ? 'Continued in private messages' : sent ? `Sent with: ${sent}` : undefined,
    messages: [{ ...base.messages[0], at: t - 2 * MIN }, { id: uid('m'), from: 'nova', text: kindOf(h, p).reply ?? plain(p.draft), at: t, auto: true, undoUntil: t + 10 * MIN, log: next.log[0].id }],
  }
  let out = runRules({ ...next, inbox: { ...next.inbox, convs: [conv, ...next.inbox.convs] } }, id)
  // A public answer with a private half: the DM goes out with it, and comes back with its Undo.
  if (base.dm) out = deliverDm(out, conv, base.dm, { auto: true, log: next.log[0].id }, { status: 'auto', reviewed: true, reviewedBy: 'nova', unread: false })
  return out
}

/**
 * Every settled Desk card updates its conversation: by Sam, Claire, a batch or Act (`d.act`: then the reply is Nova's own,
 * in Handled by Nova). What it looked like before is kept, so the journal's Undo puts it back (see onUndoInbox).
 */
export function onResolveInbox(s0: State, h: Handoff, d: Decision): State {
  if (h.inboxSpam) return d.kind === 'approve' ? moderate(s0, h.inboxSpam, 'spam', d.act ? 'nova' : 'sam') : s0
  if (h.inboxRule) return d.kind === 'approve' ? reduceRules(s0, { type: 'inbox/ruleAdd', rule: h.inboxRule, applyNow: true, origin: LEARNED }) : s0
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
    status: d.act ? 'auto' : status, unread: false, reviewed: true, reviewedBy: d.act ? 'nova' : 'sam', draft: undefined, dm: undefined, note: conv.dm ? 'Continued in private messages' : extras ? `Sent with: ${extras}` : conv.note,
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
  if (change.messages !== conv.messages) s = bumpSaved(s, conv.savedFrom)
  const settled = { card: h.id, created, status: conv.status, draft: conv.draft, dm: conv.dm, note: conv.note, unread: conv.unread, reviewed: conv.reviewed, reviewedBy: conv.reviewedBy }
  const out = patch(s, conv.id, { ...change, settled })
  return conv.dm && change.messages && change.messages !== conv.messages ? deliverDm(out, conv, conv.dm, { approved: !d.act, auto: d.act, card: h.id },
    // Sent by Nova on Act: the answer itself still waits on Sam, in the DM.
    d.act && conv.status === 'escalated' ? { status: 'escalated', unread: true, trigger: conv.trigger, note: `${conv.note ?? 'Escalated'}. Nova sent the holding reply; the answer is yours.` } : {}) : out
}

/** The journal's Undo: a card's decision comes off its conversation, and a reply Nova sent alone comes back as a draft. */
export function onUndoInbox(s: State, entry: LogEntry): State {
  let next = undoRules(s, entry)
  // A learned rule approved from the Desk goes away with its card's Undo.
  for (const h of entry.restore ?? []) {
    const r = h.inboxRule
    if (r) next = setRules(next, next.inbox.rules.filter(x => !(x.origin === LEARNED && x.words.join() === r.words.join() && thenText(x.then) === thenText(r.then))))
  }
  for (const h of entry.restore ?? []) {
    const c = next.inbox.convs.find(x => x.settled?.card === h.id)
    if (!c?.settled) continue
    const b = c.settled
    next = undoDm(next, c.id, m => m.card === h.id)
    next = b.created
      ? { ...next, inbox: { ...next.inbox, convs: next.inbox.convs.filter(x => x.id !== c.id) } }
      : patch(next, c.id, { status: b.status, draft: b.draft, dm: b.dm, note: b.note, unread: b.unread, reviewed: b.reviewed, reviewedBy: b.reviewedBy, settled: undefined, messages: c.messages.filter(m => m.card !== h.id) })
  }
  const alone = next.inbox.convs.find(x => x.messages.some(m => m.log === entry.id && !m.undone && !m.dm))
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
export type EscalationHit = Pick<Escalation, 'id' | 'label' | 'to'> & { topic: string; /** The words that matched, quoted on the card. */ match?: string }

/** The first escalation rule that is on for Nova and matches what came in, in the Playbook's order. */
export function escalationFor(s: State, text: string, meta: { followers?: number; refund?: number } = {}): EscalationHit | undefined {
  for (const e of s.playbook.escalate) {
    if (!e.on || !e.agents.includes('nova')) continue
    const hit = e.id === 'e-creator' ? (meta.followers ?? 0) > 50_000 : e.id === 'e-refund' ? (meta.refund ?? 0) > 150 : (ESC_WORDS[e.id] ?? labelWords(e.label)).exec(text)
    if (hit) return { id: e.id, label: e.label, to: e.to, topic: TOPIC[e.id] ?? 'Escalation', match: typeof hit === 'object' ? hit[0] : undefined }
  }
}

/** The largest euro amount Nova's draft would refund or exchange. */
const refundOf = (p: Reply) => Math.max(0, ...(p.attachments ?? []).map(a => Number(a.match(/€\s?(\d+(?:[.,]\d+)?)/)?.[1].replace(',', '.') ?? 0)))

/** The escalation a Nova reply card would trigger, if any. */
export const escalationOf = (s: State, h: Omit<Handoff, 'id' | 'at'>) => {
  const p = replyOf(h)
  return p ? escalationFor(s, p.text, { followers: h.conv?.followers, refund: refundOf(p) }) : undefined
}

/** Who the fan is, in one line: audience, orders, earlier conversations, tags. */
export function fanOf(s: State, c: Pick<Conversation, 'id' | 'contact' | 'author'>): string | undefined {
  const k = c.contact ? CONTACTS.find(x => x.id === c.contact) : undefined
  const past = s.inbox.convs.filter(x => x.id !== c.id && x.id !== dmId(c.id) && (c.contact ? x.contact === c.contact : x.author === c.author)).length
  const late = k?.orders.filter(o => o.status === 'Late').length ?? 0
  const parts = [
    k?.followers && `${k.followers} followers`,
    k && `${k.orders.length} order${k.orders.length === 1 ? '' : 's'}${late ? ` (${late} late)` : ''}`,
    past && `${past} earlier conversation${past > 1 ? 's' : ''}`,
    k?.tags.length && k.tags.join(', '),
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : undefined
}

/**
 * A message that matches an escalation rule never gets Nova's own answer, whatever her autonomy: it goes to Your call
 * (or to Claire when the rule says so) with a holding reply, and the journal quotes the rule. Same rules in DMs and in
 * public; in public the holding reply is one line ("we've sent you a DM") and the rest goes in private, so nothing about
 * refunds or liability is ever said in public. With "Send holding replies" on Act, Nova sends the pair herself and the
 * answer stays Sam's, in the DM.
 */
export function escalate(s: State, h: Omit<Handoff, 'id' | 'at'>, hit: EscalationHit, ref: string): State {
  const p = replyOf(h)!
  const t = now(s)
  const k = kindOf(h, p)
  const first = p.author.replace(/^@/, '').split(/[\s._·]/)[0]
  const name = first.charAt(0).toUpperCase() + first.slice(1)
  const open = PUBLIC.includes(k.type)
  const holding = `${name}, thank you for telling us. ${hit.id === 'e-injury' ? 'We’re sorry, and we hope you’re OK. ' : 'We’re sorry about this. '}A member of our team will get back to you today.`
  const line = `${name}, we’ve sent you a DM.`
  const rule = `Escalated · rule “${hit.label}”`
  const said = `${hit.match ? `“${hit.match}” ` : ''}${open ? `in a public ${k.type}` : k.type === 'review' ? 'in a review' : 'in a DM'}`
  const fan = fanOf(s, { id: '', contact: k.contact, author: p.author })
  const sources = fan ? [{ label: fan, from: 'Contact' }] : undefined
  const to = hit.to === 'claire' ? 'Claire' : 'you'

  if (open && actionOf(s, 'nova', 'nova-holding')?.autonomy === 'act') {
    // Nova sends "we've sent you a DM" and the DM herself; the answer waits on Sam in the DM.
    let next = pushHandoff(s, {
      agent: 'nova', kind: 'decision', action: 'nova-sensitive', topic: hit.topic, urgency: 'urgent', ref, title: h.title, context: `${p.author}: “${p.text}”`,
      why: `${rule}: ${said}. Nova sent the holding reply (in public “we’ve sent you a DM”, the rest in private). The answer is yours.`,
      confidence: h.confidence, rules: [hit.label], sources, link: h.link,
      options: hit.to === 'claire'
        ? [{ label: 'Forward to Claire', recommended: true }, { label: 'I’ll answer in the DM' }]
        : [{ label: 'I’ll answer in the DM', recommended: true }, { label: 'Forward to Claire' }],
    })
    const card = next.handoffs[0].id
    next = pushLog(next, { agent: 'nova', text: `Sent ${p.author} a holding reply (public line, then a DM) · rule: ${hit.label}`, status: 'done', undoMinutes: 10, reason: 'Holding replies on escalations, set to Act', link: `/inbox/${dmId(`c-${card}`)}` })
    const log = next.log[0].id
    const base = cardConv({ ...h, conv: k }, p, `c-${card}`, t)
    const pub: Conversation = { ...base, status: 'auto', unread: false, reviewed: true, reviewedBy: 'nova', draft: undefined, dm: undefined, attachments: undefined, note: 'Continued in private messages',
      messages: [{ ...base.messages[0], at: t - 2 * MIN }, { id: uid('m'), from: 'nova', text: line, at: t, auto: true, undoUntil: t + 10 * MIN, log }] }
    next = { ...next, inbox: { ...next.inbox, convs: [pub, ...next.inbox.convs] } }
    next = deliverDm(next, pub, holding, { auto: true, log }, { status: 'escalated', handoff: card, unread: true, trigger: hit.match, note: `${rule}. Nova sent the holding reply; the answer is yours.` })
    return runRules(next, dmId(pub.id))
  }

  let next = pushHandoff(s, {
    ...structuredClone(h), kind: 'approval', action: 'nova-holding', topic: hit.topic, urgency: 'urgent', ref,
    why: `${rule}: ${said}. ${open ? 'In public Nova only says “we’ve sent you a DM”; the DM holds the rest. Nothing about refunds or liability in public.' : 'Nova never answers this herself, whatever her autonomy.'}`,
    rules: [hit.label], sources,
    conv: { ...k, note: rule, trigger: hit.match, dm: open ? holding : undefined }, preview: { ...p, draft: [open ? line : holding], attachments: undefined },
  })
  const id = next.handoffs[0].id
  if (hit.to === 'claire') next = updateHandoff(next, id, { lane: 'claire', claire: { askedAt: t, dueAt: t + 45_000 } })
  next = land(next, id)
  return pushLog(next, { agent: 'nova', text: `Escalated ${p.author} to ${to} · rule: ${hit.label}`, status: 'done', reason: 'Playbook escalation, whatever the autonomy', link: `/inbox/h:${id}` })
}

/** A public reply and its DM taken back: both crossed out, the pair back as a draft on the public message, the DM gone. */
function undoHolding(s: State, c: Conversation, msg: Msg, pair: Msg): State {
  const dmc = s.inbox.convs.find(x => x.id === dmId(c.id))!
  const held = dmc.status === 'escalated' || dmc.status === 'claire'
  let next = undoDm(s, c.id, m => m.id === pair.id)
  next = patch(next, c.id, x => ({
    status: held ? 'escalated' : 'draft', draft: [msg.text], dm: pair.text, handoff: dmc.handoff, trigger: dmc.trigger, note: held ? dmc.note?.split('. ')[0] : undefined, reviewed: false, reviewedBy: undefined, unread: true,
    messages: x.messages.map(m => (m.id === msg.id ? { ...m, undone: true, undoUntil: undefined } : m)),
  }))
  next = { ...next, log: next.log.map(l => (l.id === msg.log ? { ...l, status: 'undone' as const } : l)) }
  if (s.log.find(l => l.id === msg.log)?.status === 'undone') return next
  return pushLog(next, { agent: 'nova', text: `Undone: Nova’s ${held ? 'holding reply' : 'reply and DM'} to ${c.author}. ${held ? 'It’s' : 'They’re'} back as a draft.`, status: 'undone', link: `/inbox/${c.id}` })
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
  if (s.inbox.banned?.includes(c.author)) {
    return pushLog(patch(s, id, { status: 'hidden', note: 'Author banned · hidden by Nova', reviewed: true, reviewedBy: 'nova' }), { agent: 'nova', text: `Hid ${c.author}’s new ${c.type === 'dm' ? 'message' : c.type}: author banned`, status: 'done', reason: 'You banned this author', undoMinutes: 30, link: `/inbox/${id}`, inboxBefore: [c] })
  }
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
  if (entry.inboxRulesBefore) next = setRules(next, entry.inboxRulesBefore)
  if (entry.inboxLabelsBefore) next = { ...next, inbox: { ...next.inbox, labels: entry.inboxLabelsBefore } }
  if (entry.inboxBannedBefore) next = { ...next, inbox: { ...next.inbox, banned: entry.inboxBannedBefore } }
  return next
}
export type { RuleOp }

/* ---------- Rules learned from Sam's gestures ---------- */

const LEARNED = 'Learned from your labels'
const STOP = new Set(['that', 'this', 'with', 'have', 'from', 'your', 'after', 'again', 'about', 'what', 'when', 'still', 'just', 'they', 'them', 'there', 'their', 'would', 'could', 'into', 'been', 'were', 'will', 'very', 'much', 'more', 'than', 'then', 'only', 'also', 'some', 'does', 'fernway', 'thanks', 'please'])
const tokens = (t: string) => new Set(t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]{4,}/g)?.filter(w => !STOP.has(w)) ?? [])

/** Words most of these conversations share (two at most); the label itself when they share none. */
export function sharedWords(convs: Conversation[], label: string): string[] {
  const n = new Map<string, number>()
  for (const c of convs) for (const w of tokens(c.messages.filter(m => m.from === 'them').map(m => m.text).join(' '))) n.set(w, (n.get(w) ?? 0) + 1)
  const common = [...n].filter(([, k]) => k >= 2).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, 2).map(([w]) => w)
  return common.length ? common : [label.toLowerCase()]
}

/** Nova proposes the rule that would have done these labels for Sam: a Desk card he approves once. */
export function proposeRule(s: State, label: string, ids: string[]): State {
  const convs = ids.map(id => s.inbox.convs.find(c => c.id === id)).filter((c): c is Conversation => !!c)
  if (!convs.length || s.handoffs.some(h => h.inboxRule?.then.op === 'label' && h.inboxRule.then.value === label)) return s
  const rule = { words: sharedWords(convs, label), then: { op: 'label' as const, value: label } }
  return pushHandoff(s, {
    agent: 'nova', kind: 'approval', urgency: 'week', topic: 'Inbox rule', action: 'nova-rules', link: '/inbox?rules=1', confidence: 85,
    title: `New Inbox rule? ${thenText(rule.then)} when a message ${whenText(rule)}`,
    context: `You labelled ${convs.length} conversations “${label}” by hand.`,
    why: `Same label added by hand ${convs.length} times. With a rule I’d do it as messages arrive.`,
    inboxRule: rule,
    preview: { type: 'evidence', lines: convs.map(c => `${c.author}: “${c.messages.find(m => m.from === 'them')?.text ?? ''}”`) },
  })
}

/** Count Sam's hand labels that no rule covers; the third one makes Nova propose a rule. */
function teach(s: State, label: string, ids: string[]): State {
  const covered = (c: Conversation) => s.inbox.rules.some(r => r.then.op === 'label' && r.then.value === label && matches(r, withTeam(c)))
  const fresh = ids.filter(id => { const c = s.inbox.convs.find(x => x.id === id); return c && !covered(c) })
  const seen = [...new Set([...(s.inbox.taught?.[label] ?? []), ...fresh])]
  const keep = (list: string[]): State => ({ ...s, inbox: { ...s.inbox, taught: { ...s.inbox.taught, [label]: list } } })
  return seen.length >= 3 ? proposeRule(keep([]), label, seen.slice(-3)) : keep(seen)
}

/* ---------- Saved replies ---------- */

type SavedAction = Extract<InboxAction, { type: `inbox/saved${string}` }>
const isSaved = (a: InboxAction): a is SavedAction => a.type.startsWith('inbox/saved')
const setSaved = (s: State, saved: SavedReply[]): State => ({ ...s, inbox: { ...s.inbox, saved } })

function reduceSaved(s: State, a: SavedAction): State {
  const list = s.inbox.saved
  switch (a.type) {
    case 'inbox/savedAdd': return a.name.trim() && a.text.trim() ? setSaved(s, [...list, { id: uid('sr'), name: a.name.trim(), text: a.text.trim(), uses: 0, by: 'you' }]) : s
    case 'inbox/savedEdit': return setSaved(s, list.map(r => (r.id === a.id ? { ...r, name: a.name.trim() || r.name, text: a.text.trim() || r.text } : r)))
    case 'inbox/savedDelete': return setSaved(s, list.filter(r => r.id !== a.id))
    case 'inbox/savedRestore': return list.some(r => r.id === a.reply.id) ? s : setSaved(s, [...list.slice(0, a.index), a.reply, ...list.slice(a.index)])
    case 'inbox/savedUse': {
      // Sam asked for this saved reply (⌘K, Chat): it becomes the draft, adapted to the customer, ready to send.
      const r = list.find(x => x.id === a.saved)
      const [next, c] = materialize(s, a.id)
      if (!r || !c) return s
      return patch(next, c.id, x => ({ draft: [fill(r, x)], savedFrom: r.id, status: x.status === 'escalated' || x.status === 'claire' ? x.status : 'draft' }))
    }
  }
}

/* ---------- Response time ---------- */

export const TARGETS: Record<ConvType, number> = { dm: 60, comment: 240, mention: 240, ad: 240, review: 1440 }

/** Waiting on the team: Sam, Claire or a draft to send. */
export const waitingOn = (c: Conversation) => NEEDS_YOU.includes(c.status) || c.status === 'claire'
/** Since the customer's last message. */
export const waitSince = (c: Conversation) => c.messages.filter(m => m.from === 'them').slice(-1)[0]?.at ?? c.at

export type Wait = { since: number; target: number; due: number; waited: number; over: boolean }
export function waitOf(s: State, c: Conversation, t: number): Wait | undefined {
  if (!waitingOn(c)) return
  const since = waitSince(c)
  const target = (s.inbox.targets?.[c.type] ?? TARGETS[c.type]) * MIN
  return { since, target, due: since + target, waited: t - since, over: t > since + target }
}

/** "52 min", "3 h 05", "2 days". */
export const dur = (ms: number) => {
  const m = Math.max(0, Math.round(ms / MIN))
  if (m < 60) return `${m} min`
  if (m < 48 * 60) return `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}`
  return `${Math.round(m / 1440)} days`
}

/** Every conversation waiting on the team, longest wait first. Shared by the sort, ⌘K, Chat and Iris. */
export function waitingList(s: State, t: number) {
  return [...virtualConvs(s), ...s.inbox.convs].map(c => ({ c, w: waitOf(s, c, t) })).filter((x): x is { c: Conversation; w: Wait } => !!x.w).sort((a, b) => a.w.since - b.w.since)
}

/**
 * Contract for Iris (community report): what is waiting, what is late, and how fast the team answers.
 * `firstReply` is the median minutes between a customer's first message and the first answer, over today's answered conversations.
 */
export function responseStats(s: State, t: number) {
  const list = waitingList(s, t)
  const day = new Date(t); day.setHours(0, 0, 0, 0)
  const gaps = s.inbox.convs.flatMap(c => {
    const q = c.messages.find(m => m.from === 'them')
    const a = q && c.messages.find(m => m.from !== 'them' && m.at >= q.at && !m.undone)
    return q && a && a.at >= day.getTime() ? [Math.round((a.at - q.at) / MIN)] : []
  }).sort((a, b) => a - b)
  const handled = s.inbox.convs.filter(c => c.status === 'auto').length
  return {
    waiting: list.length,
    overdue: list.filter(x => x.w.over).length,
    longest: list[0] ? { id: list[0].c.id, author: list[0].c.author, minutes: Math.round(list[0].w.waited / MIN) } : undefined,
    firstReply: gaps.length ? gaps[Math.floor(gaps.length / 2)] : undefined,
    handledAlone: handled,
    answered: s.inbox.convs.filter(c => c.status === 'auto' || c.status === 'you').length,
  }
}

const SOON = 15 * MIN
/** About to miss its target and on Sam or Claire (Léo and Yanis answer their own). */
const soon = (s: State, t: number) => waitingList(s, t).filter(x => !x.w.over && x.w.due - t <= SOON && !s.inbox.warned?.includes(x.c.id) && !onTeammate(x.c))
const onTeammate = (c: Conversation) => !!c.assignee && TEAMMATES.includes(c.assignee)
/** Nova's warning cards whose conversations were all answered since. */
const staleWarnings = (s: State, t: number) => {
  const still = new Set(waitingList(s, t).map(x => x.c.id))
  return s.handoffs.filter(h => h.sla && !h.sla.some(id => still.has(id)))
}

/** One Desk card for the conversations about to miss (or past) their target. */
export function warnLate(s: State, t: number, items: { c: Conversation; w: Wait }[]): State {
  if (!items.length) return s
  const late = items.every(x => x.w.over)
  const when = hhmm(Math.min(...items.map(x => x.w.due)))
  const n = items.length
  const them = n === 1 ? items[0].c.author : `${n} conversations`
  return pushHandoff({ ...s, inbox: { ...s.inbox, warned: [...(s.inbox.warned ?? []), ...items.map(x => x.c.id)] } }, {
    agent: 'nova', kind: 'news', group: 'need', urgency: 'urgent', topic: 'Response time', confidence: 95, link: '/inbox?sort=waiting',
    title: late ? `${them} ${n === 1 ? 'is' : 'are'} past ${n === 1 ? 'its' : 'their'} response target` : `${them} miss${n === 1 ? 'es' : ''} ${n === 1 ? 'its' : 'their'} response target at ${when}`,
    context: 'They wait on you or Claire. Nova can’t answer them on her own.',
    why: `Targets: messages ${dur(s.inbox.targets.dm * MIN)}, comments ${dur(s.inbox.targets.comment * MIN)}, reviews ${dur(s.inbox.targets.review * MIN)}.`,
    preview: { type: 'evidence', lines: items.map(x => `${x.c.author} · waiting ${dur(x.w.waited)} · ${dur(x.w.target)} target`) },
    cta: { label: 'Open them', to: '/inbox?sort=waiting' }, sla: items.map(x => x.c.id),
  })
}

export const dueInbox = (s: State, t: number) => soon(s, t).length > 0 || staleWarnings(s, t).length > 0 || teamDue(s, t).length > 0
export function tickInbox(s: State, t: number): State {
  let next = teamReplies(s, t)
  next = staleWarnings(next, t).reduce((x, h) => removeHandoff(x, h.id), next)
  next = warnLate(next, t, soon(next, t))
  return next
}

/* ---------- Teammates ---------- */

const TEAM_REPLY: Partial<Record<Assignee, (first: string) => string>> = {
  leo: n => `${n}, I’ve checked your order: it’s with the carrier and moving again, you’ll have it within 2 working days. Tracking is in your inbox. Léo, Fernway care`,
  yanis: () => 'Hello! Thanks for thinking of us. I’m Yanis, I handle wholesale at Fernway. I’m sending our trade price list and minimums by email today.',
}
const teamDue = (s: State, t: number) => s.inbox.convs.filter(c => c.teamDue && c.teamDue <= t && c.assignee && TEAMMATES.includes(c.assignee) && waitingOn(c))

/** Léo and Yanis answer what is assigned to them: Nova's draft if she wrote one, else their own words. */
function teamReplies(s: State, t: number): State {
  return teamDue(s, t).reduce((next, c) => {
    const who = c.assignee!
    const text = c.draft?.length ? plain(c.draft) : TEAM_REPLY[who]?.(firstName(c)) ?? ''
    const done = patch(next, c.id, x => ({
      status: 'you', draft: undefined, unread: false, teamDue: undefined, reviewed: true, reviewedBy: who,
      messages: [...x.messages, { id: uid('m'), from: 'you', by: who, text, at: Math.max(x.teamDue ?? t, waitSince(x)) }],
    }))
    const line = `${ROSTER[who].short} replied to ${c.author}`
    return c.handoff && done.handoffs.some(h => h.id === c.handoff) ? settleCard(done, c, line, 'done') : pushLog(done, { agent: 'nova', text: line, status: 'done', reason: `Assigned to ${ROSTER[who].short}`, link: `/inbox/${c.id}` })
  }, s)
}

/* ---------- Labels ---------- */

/** Rename or delete a label everywhere: conversations, Nova's rules, the list. One journal line, a real Undo. */
function reduceLabels(s: State, a: Extract<InboxAction, { type: 'inbox/labelAdd' | 'inbox/labelRename' | 'inbox/labelDelete' }>): State {
  const labels = s.inbox.labels
  if (a.type === 'inbox/labelAdd') return a.name.trim() && !labels.includes(a.name.trim()) ? { ...s, inbox: { ...s.inbox, labels: [...labels, a.name.trim()] } } : s
  const name = a.type === 'inbox/labelRename' ? a.from : a.name
  const to = a.type === 'inbox/labelRename' ? a.to.trim() : undefined
  if (a.type === 'inbox/labelRename' && (!to || to === name || labels.includes(to))) return s
  const before = s.inbox.convs.filter(c => c.labels?.includes(name))
  const uses = s.inbox.rules.filter(r => r.then.op === 'label' && r.then.value === name)
  const relabel = (l: string[]) => (to ? l.map(x => (x === name ? to : x)) : l.filter(x => x !== name))
  const next: State = {
    ...s,
    inbox: {
      ...s.inbox,
      labels: to ? labels.map(x => (x === name ? to : x)) : labels.filter(x => x !== name),
      convs: s.inbox.convs.map(c => (c.labels?.includes(name) ? { ...c, labels: relabel(c.labels) } : c)),
      rules: s.inbox.rules.map(r => (r.then.op === 'label' && r.then.value === name ? (to ? { ...r, then: { op: 'label' as const, value: to } } : { ...r, on: false }) : r)),
    },
  }
  const n = before.length
  const where = [`${n} conversation${n === 1 ? '' : 's'}`, uses.length ? `${uses.length} rule${uses.length > 1 ? 's' : ''}${to ? '' : ' switched off'}` : ''].filter(Boolean).join(', ')
  return pushLog(next, {
    agent: 'nova', text: to ? `Renamed the label “${name}” to “${to}” on ${where}` : `Deleted the label “${name}”: removed from ${where}`,
    status: 'done', reason: 'You changed the labels', undoMinutes: 30, link: '/inbox?labels=1',
    inboxBefore: before, inboxRulesBefore: uses.length ? s.inbox.rules : undefined, inboxLabelsBefore: labels,
  })
}

/* ---------- Moderation ---------- */

export type ModOp = 'like' | 'unlike' | 'spam' | 'ban' | 'unban' | 'delete'
const NET_NAME: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', facebook: 'Facebook', youtube: 'YouTube', x: 'X', google: 'Google', trustpilot: 'Trustpilot' }
/** Deleting from the network can't be taken back: said before, in the confirmation. */
export const deleteWarning = (c: Pick<Conversation, 'network'>) => `Deleting removes it from ${NET_NAME[c.network]} for good. Nova keeps a copy here.`
/** Reviews can't be deleted, hidden or reported by the brand. */
export const canModerate = (c: Pick<Conversation, 'type'>) => c.type !== 'review'

/** The word that best marks this message as spam, for Nova's spam rule. */
function spamWord(s: State, c: Conversation) {
  const rule = s.inbox.rules.find(r => r.id === 'ir-spam')
  return [...tokens(c.messages.filter(m => m.from === 'them').map(m => m.text).join(' '))].filter(w => w.length >= 5 && !rule?.words.includes(w)).sort((a, b) => b.length - a.length)[0]
}

/** Like, spam, ban, delete: one journal line, one Undo (except delete, said before). Nova uses it too, on Act. */
export function moderate(s0: State, ids: string[], op: ModOp, by: 'nova' | 'sam'): State {
  let s = s0
  const targets: Conversation[] = []
  for (const id of ids) { const [n, c] = materialize(s, id); s = n; if (c) targets.push(withTeam(c)) }
  const picked = targets.filter(c => (op === 'like' ? !c.liked : op === 'unlike' ? c.liked : op === 'ban' || op === 'unban' ? true : canModerate(c) && !c.removed))
  if (!picked.length) return s0
  const authors = [...new Set(picked.map(c => c.author))]
  const banned = s.inbox.banned ?? []
  const nextBanned = op === 'ban' ? [...new Set([...banned, ...authors])] : op === 'unban' ? banned.filter(a => !authors.includes(a)) : banned
  // Ban hides everything the author wrote, not only the picked conversations.
  const hit = op === 'ban' || op === 'unban' ? s.inbox.convs.filter(c => authors.includes(c.author)) : picked
  const ids2 = new Set(hit.map(c => c.id))
  const learn = op === 'spam' ? [...new Set(picked.map(c => spamWord(s, c)).filter((w): w is string => !!w))] : []
  const t = now(s)
  const change = (c: Conversation): Partial<Conversation> => {
    switch (op) {
      case 'like': return { liked: true }
      case 'unlike': return { liked: false }
      case 'spam': return { status: 'hidden', note: `Reported as spam by ${by === 'nova' ? 'Nova' : 'you'}`, reviewed: true, reviewedBy: by === 'nova' ? 'nova' : 'sam' }
      case 'ban': return { status: 'hidden', note: 'Author banned', reviewed: true, reviewedBy: by === 'nova' ? 'nova' : 'sam' }
      case 'unban': return c.note === 'Author banned' || c.note === 'Author banned · hidden by Nova' ? { status: c.messages.some(m => m.from !== 'them') ? 'auto' : 'draft', note: undefined } : {}
      case 'delete': return { status: 'hidden', removed: true, draft: undefined, note: `Deleted by ${by === 'nova' ? 'Nova' : 'you'} · removed from ${NET_NAME[c.network]}`, reviewed: true, reviewedBy: by === 'nova' ? 'nova' : 'sam' }
    }
  }
  const rules = learn.length ? s.inbox.rules.map(r => (r.id === 'ir-spam' ? { ...r, words: [...r.words, ...learn], on: true } : r)) : s.inbox.rules
  const cards = op === 'like' || op === 'unlike' ? [] : s.handoffs.filter(h => hit.some(c => c.handoff === h.id))
  let next: State = {
    ...s, handoffs: s.handoffs.filter(h => !cards.includes(h)),
    inbox: { ...s.inbox, banned: nextBanned, rules, convs: s.inbox.convs.map(c => (ids2.has(c.id) ? { ...withTeam(c), ...change(withTeam(c)) } : c)) },
  }
  const n = picked.length, them = n === 1 ? picked[0].author : `${n} conversations`
  const text = {
    like: `Liked ${them}`, unlike: `Unliked ${them}`,
    spam: `Reported ${them} as spam${learn.length ? `. Nova’s spam rule now also hides “${learn.join('”, “')}”` : ''}`,
    ban: `Banned ${authors.join(', ')}: ${hit.length} item${hit.length > 1 ? 's' : ''} hidden, and anything new from ${authors.length > 1 ? 'them' : 'this author'}`,
    unban: `Unbanned ${authors.join(', ')}`,
    delete: `Deleted ${them} from the network`,
  }[op]
  const undoable = op !== 'delete'
  next = pushLog(next, {
    agent: 'nova', text, status: by === 'nova' ? 'done' : op === 'delete' ? 'done' : 'approved', reason: by === 'nova' ? 'Spam and bots, set to Act' : 'Your call from the Inbox',
    undoMinutes: undoable ? 30 : undefined, link: n === 1 ? `/inbox/${picked[0].id}` : '/inbox',
    inboxBefore: undoable ? hit : undefined, inboxRulesBefore: learn.length ? s.inbox.rules : undefined, inboxBannedBefore: op === 'ban' || op === 'unban' ? banned : undefined, restore: undoable && cards.length ? cards : undefined,
  })
  if (by === 'nova' || !undoable) return next
  const undo: InboxUndo = { label: text, at: t, logId: next.log[0].id, before: hit, created: [], cards, rules: learn.length ? s.inbox.rules : undefined, banned: op === 'ban' || op === 'unban' ? banned : undefined }
  return { ...next, inbox: { ...next.inbox, undo } }
}

/** A public comment answered in private: a new DM with the same person, drafted by Nova; the comment says where it went. */
export function replyInPrivate(s0: State, id: string): State {
  const [s, c] = materialize(s0, id)
  if (!c || c.type === 'dm' || c.type === 'review') return s0
  const dm = `${c.id}-dm`
  if (s.inbox.convs.some(x => x.id === dm)) return s0
  const t = now(s)
  const conv: Conversation = { ...dmBase(c, t), status: 'draft', draft: [`Hi ${firstName(c)}, following up here in private so we can sort this out properly. Could you send me your order number?`] }
  const next = patch({ ...s, inbox: { ...s.inbox, convs: [conv, ...s.inbox.convs] } }, c.id, { note: 'Continued in private messages', status: c.status === 'draft' ? 'you' : c.status, draft: c.status === 'draft' ? undefined : c.draft })
  const line = `Moved ${c.author}’s ${c.type} to private messages. Nova drafted the DM.`
  const settled = settleCard(next, c, line, 'done')
  return settled !== next ? settled : pushLog(next, { agent: 'nova', text: line, status: 'done', reason: 'Your call from the Inbox', link: `/inbox/${dm}` })
}

const BOTS: [string, Conversation['network'], string][] = [
  ['@followers.boost.24', 'instagram', 'Want 10k real followers? DM us, results in 48h 🔥'],
  ['@crypto_wins_daily', 'instagram', 'I turned €200 into €4,000 this month, link in bio 👉'],
  ['@giveaway.iphone17', 'instagram', 'Congrats! You were selected for a free iPhone 17, claim here'],
]
/**
 * Three bot comments land under a post. On Act (Hide spam and bots) Nova reports them as spam herself; on Draft or
 * Suggest she raises one card to hide them in one go.
 */
export function botWave(s: State): State {
  const t = now(s)
  const convs: Conversation[] = BOTS.map(([author, network, text], i) => ({
    id: uid('c'), author, network, type: 'comment', sentiment: 'neutral', at: t - i * MIN, status: 'new', labels: [], unread: true,
    post: 'Reel · “Storm Jacket vs. a garden hose”', messages: [{ id: uid('m'), from: 'them', text, at: t - i * MIN }],
  }))
  const next: State = { ...s, inbox: { ...s.inbox, convs: [...convs, ...s.inbox.convs] } }
  const ids = convs.map(c => c.id)
  if (actionOf(s, 'nova', 'nova-spam')?.autonomy === 'act') return moderate(next, ids, 'spam', 'nova')
  return pushHandoff(next, {
    agent: 'nova', kind: 'approval', urgency: 'today', topic: 'Spam', action: 'nova-spam', confidence: 97, link: '/inbox?view=review',
    title: '3 bot comments under your Storm Jacket reel', context: 'Follower selling, a crypto link and a fake giveaway, in the last 3 minutes.',
    why: 'Spam and bots are set to Draft: I hide them when you say so.', inboxSpam: ids,
    preview: { type: 'evidence', lines: convs.map(c => `${c.author}: “${c.messages[0].text}”`) },
  })
}

/* ---------- Contract for Echo: mentions that need an answer become Inbox conversations ---------- */

/**
 * What Echo hands over. `id` makes it idempotent (the same mention twice is one conversation). `draft`: Echo's or
 * Nova's suggested answer; without it the conversation waits as New.
 */
export type Ingest = {
  id: string; author: string; network: Conversation['network']; text: string; at?: number
  sentiment?: Sentiment; post?: string; followers?: number; draft?: string; from?: string; account?: string
}

/** A mention lands in the Inbox: escalations first, then Nova's rules, like any conversation that arrives. */
export function ingest(s: State, m: Ingest): State {
  const id = `c-in-${m.id}`
  if (s.inbox.convs.some(c => c.id === id)) return s
  const t = m.at ?? now(s)
  const hit = escalationFor(s, m.text, { followers: m.followers })
  const conv: Conversation = {
    id, author: m.author, network: m.network, account: m.account, type: 'mention', sentiment: m.sentiment ?? 'neutral', at: t, post: m.post, labels: [], unread: true,
    status: hit ? 'escalated' : m.draft ? 'draft' : 'new',
    messages: [{ id: uid('m'), from: 'them', text: m.text, at: t }],
    draft: m.draft ? [m.draft] : undefined,
    note: hit ? `Escalated · rule “${hit.label}”` : m.from ? `Found by ${m.from}` : undefined,
  }
  let next = pushLog({ ...s, inbox: { ...s.inbox, convs: [conv, ...s.inbox.convs] } }, {
    agent: 'nova', text: `${m.from ?? 'Echo'} passed ${m.author}’s mention to the Inbox${hit ? ` · escalated: ${hit.label}` : ''}`,
    status: 'done', reason: hit ? 'Playbook escalation' : 'A mention that needs an answer', link: `/inbox/${id}`,
  })
  next = runRules(next, id)
  return next
}
