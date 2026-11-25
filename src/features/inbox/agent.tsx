// Nova · Inbox: everything Nova plugs into the core (see src/app/agents-registry.ts).
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { flagged, isLead } from '../desk/parts'
import type { State } from '../../app/state'
import { CONTACTS, withTeam } from '../../data/inbox'
import { NEEDS_YOU, onResolveInbox, onUndoInbox, virtualConvs, type CardConv } from './slice'
import { SCRIPT } from './script'

declare module '../../data/command' {
  interface IntentTypes { reply: { name: string } }
}
declare module '../../app/types' {
  interface Handoff {
    /** Nova reply cards: the conversation behind the card (kind, mood, contact), so the Inbox never has to guess. */
    conv?: CardConv
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const fold = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^@/, '')

/** The conversation with someone, by name or handle, in the contacts and the Inbox: what waits on Sam first, then the newest. */
export function findConvo(s: State, name: string) {
  const n = fold(name)
  if (!n) return
  const ids = new Set(CONTACTS.filter(k => fold(k.name).split(/\s+/).includes(n) || fold(k.name) === n || k.handles.some(h => fold(h.handle).startsWith(n))).map(k => k.id))
  const words = (t: string) => fold(t).split(/[\s.·_@]+/)
  return [...virtualConvs(s), ...s.inbox.convs.map(withTeam)]
    .filter(c => (c.contact && ids.has(c.contact)) || words(c.author).includes(n) || fold(c.author).startsWith(n))
    .sort((a, b) => Number(NEEDS_YOU.includes(b.status)) - Number(NEEDS_YOU.includes(a.status)) || b.at - a.at)[0]
}

const reply = defineIntent({
  kind: 'reply', owner: 'nova', order: 60,
  parse: t => {
    const m = t.match(/reply to\s+(\S+)/)
    if (!m) return
    return { kind: 'reply', name: m[1].replace(/^@/, '') }
  },
  bar: (i, { s, go }) => {
    const c = findConvo(s, i.name)
    if (!c) return { text: `I couldn’t find a conversation with “${i.name}” in the last 30 days. Try their handle, or search the Inbox.`, ctas: [{ label: 'Open the Inbox', run: () => go('/inbox') }] }
    return { text: `Opening the conversation with ${c.author}. ${c.draft?.length ? 'Nova’s draft is ready if you want it.' : 'There’s no draft waiting: you can reply from there.'}`, after: () => setTimeout(() => go(`/inbox/${c.id}`), 500) }
  },
  chat: (i, { s }) => {
    const conv = findConvo(s, i.name)
    if (!conv) return { replies: [{ from: 'nova', text: `I can’t find a conversation with ${cap(i.name)}. Try their handle, like @lea.hikes.` }], effects: [] }
    const draft = (conv.draft ?? []).map(x => (typeof x === 'string' ? x : x.text)).join('') || `Thanks ${cap(i.name)}, we’re on it.`
    return { replies: [{ from: 'nova', text: `Here’s my reply to ${conv.author}. It goes out when you send it.`, card: { type: 'reply', convo: conv.id, author: conv.author, network: conv.network, quote: conv.messages[conv.messages.length - 1]?.text ?? '', text: draft, status: 'draft' } }], effects: [] }
  },
})

const nova: AgentModule = {
  id: 'nova',
  script: SCRIPT,
  onResolve: onResolveInbox,
  onUndo: onUndoInbox,
  intents: [reply],
  batches: [{
    id: 'nova', agent: 'nova', match: h => h.agent === 'nova' && h.kind === 'approval' && h.preview?.type === 'reply' && !h.proposal,
    ready: h => h.confidence >= 80 && !flagged(h),
    title: n => `${n} replies Nova drafted`, meta: (xs, r) => [xs.filter(isLead).length ? `${xs.filter(isLead).length} want to buy` : '', `${r} ready to send`].filter(Boolean).join(' · '),
    verb: { many: n => `Send ${n} selected`, done: n => `Sent ${n} replies Nova drafted` },
  }],
  presets: {
    calm: { keep: ['h-strap'] },
    trust: { keep: ['h-promo-nova', 'h-strap', 'h-review'], fire: ['ev-promo-exchange', 'ev-demote', 'ev-rule-emoji'] },
  },
}
export default nova
