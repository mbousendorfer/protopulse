import type { State } from '../../app/state'
import type { Decision, Flagged, Handoff } from '../../app/types'
import { MIN } from '../../app/time'
import { now, pushHandoff, pushLog, removeHandoff, uid, updateHandoff } from '../../app/core'
import { CONVERSATIONS, withTeam, type Assignee, type ConvStatus, type Conversation, type Sentiment } from '../../data/inbox'

/** The last group action, kept so it can be undone in one click for a few seconds. */
export type InboxUndo = { label: string; at: number; logId?: string; before: Conversation[]; created: string[]; cards: Handoff[] }
export type InboxState = { convs: Conversation[]; undo?: InboxUndo }
export const initialInbox = (): InboxState => ({ convs: structuredClone(CONVERSATIONS) })

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

const plain = (p?: Flagged[]) => (p ?? []).map(x => (typeof x === 'string' ? x : x.text)).join('')

/** Nova reply cards from the Desk that have no conversation yet show up in the Inbox as virtual conversations. */
/** What waits on Sam in the Inbox. Shared by the Needs you view and the rail badge so they always agree. */
export const NEEDS_YOU: Conversation['status'][] = ['draft', 'escalated', 'takeover']
export const inboxNeedsCount = (s: State) => [...virtualConvs(s), ...s.inbox.convs].filter(c => NEEDS_YOU.includes(c.status)).length

export function virtualConvs(s: State): Conversation[] {
  const known = new Set(s.inbox.convs.map(c => c.handoff).concat(s.inbox.convs.map(c => c.id)))
  // Same author + same message = same conversation, whatever card raised it.
  const said = new Set(s.inbox.convs.map(c => `${c.author}|${c.messages.filter(m => m.from === 'them').slice(-1)[0]?.text ?? ''}`))
  const seen = new Set<string>()
  return s.handoffs
    .filter(h => h.agent === 'nova' && h.preview?.type === 'reply' && !known.has(h.id) && !(h.ref && known.has(h.ref)))
    .filter(h => {
      const p = h.preview as Extract<NonNullable<Handoff['preview']>, { type: 'reply' }>
      const key = `${p.author}|${p.text}`
      if (said.has(key) || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(h => {
      const p = h.preview as Extract<NonNullable<Handoff['preview']>, { type: 'reply' }>
      return {
        id: `h:${h.id}`, author: p.author, network: p.network, at: h.at, handoff: h.id, unread: true,
        // Read the kind and the mood from the card instead of assuming an angry DM.
        type: p.network === 'google' || p.network === 'trustpilot' ? 'review' : /comment|reel|post/i.test(h.context) ? 'comment' : 'dm',
        sentiment: /complaint|review|refund|wrong|late|broken|safety/i.test(`${h.topic} ${h.title}`) ? 'negative' : /intent|question|warranty/i.test(`${h.topic} ${h.title}`) ? 'neutral' : 'neutral',
        status: h.lane === 'claire' ? 'claire' : h.action === 'nova-sensitive' ? 'escalated' : 'draft',
        messages: [{ id: `${h.id}-q`, from: 'them', text: p.text, at: h.at - MIN }],
        draft: p.draft, rules: h.rules,
        attachments: p.attachments?.map((a, i) => ({ id: `${h.id}-a${i}`, kind: /refund/i.test(a) ? 'refund' : /code/i.test(a) ? 'code' : 'exchange', label: a.split(' · within')[0], limit: a.includes('within') ? a.slice(a.indexOf('within')) : 'within your limits' })),
      } satisfies Conversation
    })
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
      case 'approve': return { status: 'you', draft: undefined, unread: false, messages: [...c.messages, { id: uid('m'), from: 'nova', text: plain(c.draft), at: t, approved: true }] }
      case 'hide': return { status: 'hidden', note: 'Hidden by you' }
      case 'unhide': return { status: c.draft?.length ? 'draft' : 'auto', note: undefined }
      case 'reviewed': return { reviewed: a.value, unread: false }
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
    inbox: { convs, undo: undefined },
  }
}

export function reduceInbox(s0: State, a: InboxAction): State {
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
      let next = patch(s, c.id, x => ({ status: 'you', draft: undefined, unread: false, note: attachmentNote(x) ? `Sent with: ${attachmentNote(x)}` : x.note, messages: [...x.messages, { id: uid('m'), from: 'nova', text, at: t, approved: true }] }))
      next = settleCard(next, c, `Reply to ${c.author}: ${edited ? 'approved with your edits' : 'approved'}`, edited ? 'edited' : 'approved')
      if (!c.handoff) next = pushLog(next, { agent: 'nova', text: `Reply to ${c.author}: ${edited ? 'approved with your edits' : 'approved'}`, status: edited ? 'edited' : 'approved', reason: 'Your call from the Inbox', link: `/inbox/${c.id}` })
      return next
    }
    case 'inbox/send': {
      let next = patch(s, c.id, x => ({ status: 'you', draft: undefined, unread: false, messages: [...x.messages, { id: uid('m'), from: 'you', text: a.text, at: t }] }))
      next = settleCard(next, c, `You replied to ${c.author} yourself`, 'done')
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
      if (!msg) return s
      const next = patch(s, c.id, x => ({ status: 'draft', draft: [msg.text], messages: x.messages.map(m => (m.id === a.msg ? { ...m, undone: true, undoUntil: undefined } : m)) }))
      return pushLog(next, { agent: 'nova', text: `Undone: Nova’s reply to ${c.author}. It’s back as a draft.`, status: 'undone', link: `/inbox/${c.id}` })
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

/** Desk decisions on cards linked to a conversation update that conversation. */
export function onResolveInbox(s: State, h: Handoff, d: Decision): State {
  const c = s.inbox.convs.find(x => x.handoff === h.id || x.id === h.ref)
  const t = now(s)
  const p = h.preview?.type === 'reply' ? h.preview : undefined
  if (!c) {
    // A Nova reply approved straight from the Desk: record the conversation so the Inbox stays the full history.
    if (h.agent !== 'nova' || !p || (d.kind !== 'approve' && d.kind !== 'option')) return s
    const conv: Conversation = {
      id: uid('c'), author: p.author, network: p.network, type: 'dm', sentiment: 'negative', at: h.at, handoff: h.id, status: 'you',
      messages: [{ id: uid('m'), from: 'them', text: p.text, at: h.at - MIN }, { id: uid('m'), from: 'nova', text: plain(p.draft), at: t, approved: true }],
      rules: h.rules, note: p.attachments?.length ? `Sent with: ${p.attachments.join(' · ')}` : undefined,
    }
    return { ...s, inbox: { ...s.inbox, convs: [conv, ...s.inbox.convs] } }
  }
  const draft = p ? plain(p.draft) : plain(c.draft)
  const send = (status: ConvStatus, text = draft): Partial<Conversation> => ({ status, unread: false, draft: undefined, messages: [...c.messages, { id: uid('m'), from: 'nova', text, at: t, approved: true }] })
  let change: Partial<Conversation> | undefined
  switch (d.kind) {
    case 'approve': change = send('you', d.edited ?? draft); break
    case 'reject': change = { status: d.reason === 'Dismissed' ? 'auto' : 'takeover', note: `Nova’s draft rejected${d.reason ? `: ${d.reason.toLowerCase()}` : ''}. You’re handling it.` }; break
    case 'option':
      if (/claire/i.test(d.option)) change = { ...send('claire'), note: 'Holding reply sent. Forwarded to Claire.' }
      else if (/holding/i.test(d.option)) change = send('you')
      else change = { status: 'takeover', note: 'You’re handling this one yourself.' }
      break
    case 'answer': change = { status: 'takeover' }; break
    case 'trial': break
  }
  return change ? { ...s, inbox: { ...s.inbox, convs: s.inbox.convs.map(x => (x.id === c.id ? { ...x, ...change } : x)) } } : s
}
