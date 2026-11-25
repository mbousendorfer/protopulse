import type { State } from '../../app/state'
import type { AgentId, Decision, Network } from '../../app/types'
import { addRule, now, pushLog, pushHandoff, uid } from '../../app/core'
import { T } from '../../app/time'
import { respond, routeText } from './respond'
import { TIKTOK_VIEWS } from '../../data/insights'

/** Rich, serialisable cards an agent can put in a conversation. */
export type Card =
  | { type: 'chart'; label: string; value: string; delta: string; down?: boolean; series: number[]; labels?: string[]; sources: string[] }
  | { type: 'post'; network: Network; slot: string; text: string; status: 'draft' | 'scheduled' | 'discarded' }
  | { type: 'reply'; convo?: string; author: string; network: Network; quote: string; text: string; status: 'draft' | 'sent' }
  | { type: 'rule'; text: string; agent: AgentId; status: 'proposed' | 'added' | 'dismissed' }
  | { type: 'brief'; text: string; status: 'proposed' | 'started' }
  | { type: 'list'; items: { title: string; agent: AgentId; meta?: string; link?: string }[] }
  | { type: 'boost'; post: string; amount: number; status: 'proposed' | 'boosted' | 'declined' }
  | { type: 'done'; text: string }

export type ChatMsg = { id: string; from: 'you' | AgentId; at: number; text: string; card?: Card }
export type FollowUp = { dueAt: number; msg: Omit<ChatMsg, 'id' | 'at'> }
export type Chat = { id: string; title: string; context?: { label: string; link: string }; created: number; updated: number; unread: number; messages: ChatMsg[]; followUps: FollowUp[] }

export type ChatsState = { list: Chat[] }

const SEED: Chat[] = [
  {
    id: 'chat-tiktok', title: 'Why is TikTok down?', created: T(17, 2, -1), updated: T(17, 6, -1), unread: 0, followUps: [],
    messages: [
      { id: 'm1', from: 'you', at: T(17, 2, -1), text: 'Why are TikTok views dropping since Thursday?' },
      { id: 'm2', from: 'iris', at: T(17, 3, -1), text: 'Four videos in a row under 2,200 views, against about 3,000 usually. They all open on the product, not on a person, and the hook lasts 4 to 6 seconds.', card: { type: 'chart', label: 'TikTok views per video', value: '1,840', delta: '−38%', down: true, series: TIKTOK_VIEWS, sources: ['TikTok analytics · last 11 videos', 'Hook length measured by Iris'] } },
      { id: 'm3', from: 'atlas', at: T(17, 4, -1), text: 'I can test 3-second hooks with a person on screen. First one ready for Thursday 18:00:', card: { type: 'post', network: 'tiktok', slot: 'Thu 27, 18:00', text: 'POV: you packed for 3 days and it all fits. Ridge 28L.', status: 'draft' } },
    ],
  },
  {
    id: 'chat-sale', title: 'Weekend sale post', created: T(16, 10, -1), updated: T(16, 14, -1), unread: 0, followUps: [],
    messages: [
      { id: 'm1', from: 'you', at: T(16, 10, -1), text: '@Atlas a post about the weekend sale on Saturday' },
      { id: 'm2', from: 'atlas', at: T(16, 11, -1), text: 'Here’s a Facebook draft for Saturday 10:00, your best weekend slot there.', card: { type: 'post', network: 'facebook', slot: 'Sat 29, 10:00', text: 'Weekend sale: 15% off every Summit Bottle until Sunday 20:00. Cold water for the next trail, warm coffee for the summit.', status: 'scheduled' } },
      { id: 'm3', from: 'you', at: T(16, 13, -1), text: 'Never use exclamation marks in sale posts' },
      { id: 'm4', from: 'atlas', at: T(16, 14, -1), text: 'Noted. Should every agent follow it?', card: { type: 'rule', text: 'Never use exclamation marks in sale posts', agent: 'atlas', status: 'added' } },
    ],
  },
]

export const initialChats = (): ChatsState => ({ list: structuredClone(SEED) })

export type ChatsAction =
  | { type: 'chats/new'; id: string; context?: Chat['context'] }
  | { type: 'chats/send'; id: string; text: string }
  | { type: 'chats/act'; id: string; msg: string; action: 'schedule' | 'discard' | 'shorter' | 'send' | 'addRule' | 'dismissRule' | 'startBrief' | 'boost' | 'decline'; text?: string }
  | { type: 'chats/read'; id: string }
  | { type: 'chats/delete'; id: string }
  | { type: 'chats/restore'; chat: Chat; index: number }

type Resolve = (s: State, id: string, d: Decision) => State

const setChat = (s: State, id: string, f: (c: Chat) => Chat): State => ({ ...s, chats: { list: s.chats.list.map(c => (c.id === id ? f(c) : c)) } })
const setCard = (s: State, id: string, msg: string, card: Partial<Card>): State =>
  setChat(s, id, c => ({ ...c, messages: c.messages.map(m => (m.id === msg && m.card ? { ...m, card: { ...m.card, ...card } as Card } : m)) }))

export function reduceChats(s: State, a: ChatsAction, resolve: Resolve): State {
  switch (a.type) {
    case 'chats/new': {
      const t = now(s)
      const chat: Chat = { id: a.id, title: 'New conversation', context: a.context, created: t, updated: t, unread: 0, messages: [], followUps: [] }
      return { ...s, chats: { list: [chat, ...s.chats.list] } }
    }
    case 'chats/send': {
      const chat = s.chats.list.find(c => c.id === a.id)
      if (!chat || !a.text.trim()) return s
      const t = now(s)
      const you: ChatMsg = { id: uid('m'), from: 'you', at: t, text: a.text.trim() }
      const { replies, effects } = respond(routeText(a.text), s, chat)
      // Replies arrive one after the other, as if typed.
      const msgs = replies.map((r, i) => ({ ...r, id: uid('m'), at: t + 900 + i * 1400 }))
      let next = setChat(s, a.id, c => ({
        ...c, title: c.messages.length ? c.title : a.text.trim().replace(/^@\w+\s*/, '').slice(0, 48), updated: t,
        messages: [...c.messages, you, ...msgs],
      }))
      for (const e of effects) next = e(next)
      return next
    }
    case 'chats/act': {
      const chat = s.chats.list.find(c => c.id === a.id)
      const m = chat?.messages.find(x => x.id === a.msg)
      const card = m?.card
      if (!chat || !m || !card) return s
      const t = now(s)
      if (card.type === 'post') {
        if (a.action === 'shorter') return setCard(s, a.id, a.msg, { text: card.text.split(/(?<=[.!?])\s+/)[0] })
        if (a.action === 'discard') return setCard(s, a.id, a.msg, { status: 'discarded' })
        if (a.action === 'schedule') {
          // Same path as a Desk approval, so Publishing puts it in the calendar.
          const hid = uid('h')
          let next = pushHandoff(s, { id: hid, agent: 'atlas', kind: 'approval', urgency: 'today', topic: 'Draft from a chat', title: `Post from your chat: “${card.text.slice(0, 48)}…”`, context: chat.title, why: 'You asked for it in a conversation.', confidence: 90, preview: { type: 'post', network: card.network, slot: card.slot, text: [a.text ?? card.text] } })
          next = resolve(next, hid, { kind: 'approve' })
          next = setCard(next, a.id, a.msg, { status: 'scheduled', text: a.text ?? card.text })
          return setChat(next, a.id, c => ({ ...c, followUps: [...c.followUps, { dueAt: t + 75_000, msg: { from: 'iris', text: `Early read on the post Atlas scheduled for ${card.slot}: similar posts got 2.1× the average saves in their first hour. Want to put €100 behind it when it goes live?`, card: { type: 'boost', post: card.text.slice(0, 60), amount: 100, status: 'proposed' } } }] }))
        }
      }
      if (card.type === 'reply' && a.action === 'send') {
        const h = s.handoffs.find(x => x.ref === card.convo || x.link === `/inbox/${card.convo}`)
        let next = h ? resolve(s, h.id, { kind: 'approve', edited: a.text }) : pushLog(s, { agent: 'nova', text: `Replied to ${card.author}`, status: 'approved', reason: 'From a chat', undoMinutes: 10 })
        next = setCard(next, a.id, a.msg, { status: 'sent', text: a.text ?? card.text })
        return next
      }
      if (card.type === 'rule') {
        if (a.action === 'dismissRule') return setCard(s, a.id, a.msg, { status: 'dismissed' })
        const next = addRule(s, { kind: 'dont', text: card.text, agents: [card.agent], origin: `From your chat “${chat.title}”` })
        return setCard(next, a.id, a.msg, { status: 'added' })
      }
      if (card.type === 'brief' && a.action === 'startBrief') return setCard(s, a.id, a.msg, { status: 'started' })
      if (card.type === 'boost') {
        if (a.action === 'decline') return setCard(s, a.id, a.msg, { status: 'declined' })
        const next = pushLog(s, { agent: 'iris', text: `Boost of €${card.amount} on “${card.post}” set up for when it goes live`, status: 'approved', reason: 'From a chat', undoMinutes: 30 })
        return setCard(next, a.id, a.msg, { status: 'boosted' })
      }
      return s
    }
    case 'chats/read':
      return setChat(s, a.id, c => ({ ...c, unread: 0 }))
    case 'chats/delete':
      return { ...s, chats: { list: s.chats.list.filter(c => c.id !== a.id) } }
    case 'chats/restore': {
      const list = [...s.chats.list]
      list.splice(Math.min(a.index, list.length), 0, a.chat)
      return { ...s, chats: { list } }
    }
  }
}

/** Heartbeat hook: deliver agent follow-ups that are due. Quiet: they show as unread, no toast. */
export function deliverFollowUps(s: State, t: number): State {
  if (!s.chats.list.some(c => c.followUps.some(f => f.dueAt <= t))) return s
  return {
    ...s,
    chats: {
      list: s.chats.list.map(c => {
        const due = c.followUps.filter(f => f.dueAt <= t)
        if (!due.length) return c
        return { ...c, updated: t, unread: c.unread + due.length, followUps: c.followUps.filter(f => f.dueAt > t), messages: [...c.messages, ...due.map(f => ({ ...f.msg, id: uid('m'), at: f.dueAt }))] }
      }),
    },
  }
}

export const hasDueFollowUps = (s: State, t: number) => s.chats.list.some(c => c.followUps.some(f => f.dueAt <= t))

