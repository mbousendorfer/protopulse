import type { State } from '../../app/state'
import type { Decision, Flagged, Handoff } from '../../app/types'
import { MIN } from '../../app/time'
import { now, pushHandoff, pushLog, pushToast, removeHandoff, uid, updateHandoff } from '../../app/core'
import { CONVERSATIONS, type ConvStatus, type Conversation } from '../../data/inbox'

export type InboxState = { convs: Conversation[] }
export const initialInbox = (): InboxState => ({ convs: structuredClone(CONVERSATIONS) })

export type InboxAction =
  | { type: 'inbox/approve'; id: string; text?: string }
  | { type: 'inbox/send'; id: string; text: string }
  | { type: 'inbox/takeover'; id: string }
  | { type: 'inbox/hide'; id: string; hidden: boolean }
  | { type: 'inbox/claire'; id: string }
  | { type: 'inbox/undoAuto'; id: string; msg: string }
  | { type: 'inbox/attach'; id: string; att: string }
  | { type: 'inbox/read'; id: string }

const plain = (p?: Flagged[]) => (p ?? []).map(x => (typeof x === 'string' ? x : x.text)).join('')

/** Nova reply cards from the Desk that have no conversation yet show up in the Inbox as virtual conversations. */
export function virtualConvs(s: State): Conversation[] {
  const known = new Set(s.inbox.convs.map(c => c.handoff).concat(s.inbox.convs.map(c => c.id)))
  return s.handoffs
    .filter(h => h.agent === 'nova' && h.preview?.type === 'reply' && !known.has(h.id) && !(h.ref && known.has(h.ref)))
    .map(h => {
      const p = h.preview as Extract<NonNullable<Handoff['preview']>, { type: 'reply' }>
      return {
        id: `h:${h.id}`, author: p.author, network: p.network, type: 'dm', sentiment: 'negative', at: h.at, handoff: h.id, unread: true,
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
  return [{ ...s, inbox: { convs: [v, ...s.inbox.convs] } }, v]
}

const patch = (s: State, id: string, p: Partial<Conversation> | ((c: Conversation) => Partial<Conversation>)): State => ({
  ...s, inbox: { convs: s.inbox.convs.map(c => (c.id === id ? { ...c, ...(typeof p === 'function' ? p(c) : p) } : c)) },
})

/** Settling a conversation linked to a Desk card takes the card off the Desk. */
function settleCard(s: State, c: Conversation, text: string, status: 'approved' | 'edited' | 'done' = 'approved'): State {
  if (!c.handoff || !s.handoffs.some(h => h.id === c.handoff)) return s
  return pushLog(removeHandoff(s, c.handoff), { agent: 'nova', text, status, reason: 'Your call from the Inbox', link: `/inbox/${c.id}` })
}

const attachmentNote = (c: Conversation) => (c.attachments ?? []).filter(a => !a.removed).map(a => a.label).join(' · ')

export function reduceInbox(s0: State, a: InboxAction): State {
  const [s, c] = materialize(s0, a.id)
  if (!c) return s0
  const t = now(s)
  switch (a.type) {
    case 'inbox/approve': {
      const text = a.text ?? plain(c.draft)
      const edited = a.text !== undefined && a.text !== plain(c.draft)
      let next = patch(s, c.id, x => ({ status: 'you', draft: undefined, unread: false, note: attachmentNote(x) ? `Sent with: ${attachmentNote(x)}` : x.note, messages: [...x.messages, { id: uid('m'), from: 'nova', text, at: t, approved: true }] }))
      next = settleCard(next, c, `Reply to ${c.author}: ${edited ? 'approved with your edits' : 'approved'}`, edited ? 'edited' : 'approved')
      if (!c.handoff) next = pushLog(next, { agent: 'nova', text: `Reply to ${c.author}: ${edited ? 'approved with your edits' : 'approved'}`, status: edited ? 'edited' : 'approved', reason: 'Your call from the Inbox', link: `/inbox/${c.id}`, undoMinutes: 10 })
      return pushToast(next, { agent: 'nova', text: `Sent to ${c.author}${attachmentNote(c) ? `, with ${attachmentNote(c).toLowerCase()}` : ''}.` })
    }
    case 'inbox/send': {
      let next = patch(s, c.id, x => ({ status: 'you', draft: undefined, unread: false, messages: [...x.messages, { id: uid('m'), from: 'you', text: a.text, at: t }] }))
      next = settleCard(next, c, `You replied to ${c.author} yourself`, 'done')
      return pushToast(next, { text: `Reply sent to ${c.author}.` })
    }
    case 'inbox/takeover': {
      const next = patch(s, c.id, { status: 'takeover', unread: false })
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
      return pushToast(next, { agent: 'claire', text: `Sent to Claire: reply to ${c.author}` })
    }
    case 'inbox/undoAuto': {
      const msg = c.messages.find(m => m.id === a.msg)
      if (!msg) return s
      const next = patch(s, c.id, x => ({ status: 'draft', draft: [msg.text], messages: x.messages.map(m => (m.id === a.msg ? { ...m, undone: true, undoUntil: undefined } : m)) }))
      return pushToast(pushLog(next, { agent: 'nova', text: `Undone: Nova’s reply to ${c.author}. It’s back as a draft.`, status: 'undone', link: `/inbox/${c.id}` }), { agent: 'nova', text: `Reply to ${c.author} deleted. It’s back as a draft.` })
    }
    case 'inbox/attach':
      return patch(s, c.id, x => ({ attachments: x.attachments?.map(at => (at.id === a.att ? { ...at, removed: !at.removed } : at)) }))
    case 'inbox/read':
      return c.unread ? patch(s, c.id, { unread: false }) : s0
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
    return { ...s, inbox: { convs: [conv, ...s.inbox.convs] } }
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
  return change ? { ...s, inbox: { convs: s.inbox.convs.map(x => (x.id === c.id ? { ...x, ...change } : x)) } } : s
}
