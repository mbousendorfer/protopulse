import type { State } from '../../app/state'
import type { AgentId } from '../../app/types'
import { pushLog } from '../../app/core'
import { ownerOf, parse, type Intent } from '../../data/command'
import { intentDef } from '../../app/agents-registry'
import type { ChatAnswer } from '../../app/agent-module'
import type { Chat } from './slice'

export type Route = { intent: Intent; agent: AgentId; raw: string; mentioned?: AgentId }

/** "@Atlas, a post about…" or "… @iris" → the mentioned agent leads, the rest is parsed as usual. */
export function routeText(raw: string): Route {
  const m = raw.match(/@(nova|atlas|iris|echo|sage|juno)\b/i)
  const mentioned = m ? (m[1].toLowerCase() as AgentId) : undefined
  const clean = raw.replace(/@(nova|atlas|iris|echo|sage|juno)\b[,:]?\s*/gi, '').trim()
  const { intent, forced } = parse(mentioned ? `${mentioned} ${clean}` : clean)
  return { intent, agent: mentioned ?? forced ?? ownerOf(intent.kind), raw: clean, mentioned }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Scripted, data-backed answers. Several agents can answer in turn. Effects run once, when the message is sent. */
export function respond(r: Route, s: State, chat: Chat): ChatAnswer {
  const i = r.intent
  const def = intentDef(i.kind)
  if (def) return def.chat(i, { s, chat, route: r })
  const open = s.handoffs.filter(h => !h.lane)
  switch (i.kind) {
    case 'rule':
      return { replies: [{ from: i.agent, text: `Got it. I’ll stop doing that here. Should every agent follow it?`, card: { type: 'rule', text: i.rule, agent: i.agent, status: 'proposed' } }], effects: [] }

    case 'needs':
      return { replies: [{ from: 'iris', text: `${open.length} things need you. The most urgent:`, card: { type: 'list', items: [...open].sort((a, b) => (a.urgency === 'urgent' ? -1 : 0) - (b.urgency === 'urgent' ? -1 : 0)).slice(0, 5).map(h => ({ title: h.title, agent: h.agent, meta: h.topic, link: '/' })) } }], effects: [] }

    case 'overnight': {
      const items = s.log.filter(l => l.agent === i.agent).slice(0, 5)
      return { replies: [{ from: i.agent, text: `Here’s what I did since yesterday evening, most recent first:`, card: { type: 'list', items: items.map(l => ({ title: l.text, agent: l.agent, meta: l.reason, link: l.link ?? '/activity' })) } }], effects: [] }
    }

    case 'pause':
    case 'resume': {
      const name = cap(i.agent)
      return {
        replies: [{ from: 'sage', text: i.kind === 'pause' ? `${name} is paused${i.until ? ` until ${i.until}` : ''}. Their work waits on your Desk.` : `${name} is back on shift.`, card: { type: 'done', text: i.kind === 'pause' ? `${name} paused` : `${name} resumed` } }],
        effects: [(st: State) => ({ ...st, agents: st.agents.map(a => (a.id === i.agent ? { ...a, status: i.kind === 'pause' ? 'paused' as const : 'on' as const, pausedUntil: i.kind === 'pause' ? i.until : undefined } : a)) }),
          (st: State) => pushLog(st, { agent: i.agent, text: i.kind === 'pause' ? `${name} paused from a chat` : `${name} resumed from a chat`, status: 'done' })],
      }
    }

    default: {
      const ctx = chat.context ? ` I can see you’re on ${chat.context.label}.` : ''
      return { replies: [{ from: r.agent, text: `I’m not sure I can help with that yet.${ctx} I can draft posts, answer questions about performance, check competitors and mentions, reply to customers, or turn a “don’t…” into a rule.` }], effects: [] }
    }
  }
}
