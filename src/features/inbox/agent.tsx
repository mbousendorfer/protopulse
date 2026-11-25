// Nova · Inbox: everything Nova plugs into the core (see src/app/agents-registry.ts).
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { flagged, isLead } from '../desk/parts'
import { onResolveInbox } from './slice'
import { SCRIPT } from './script'

declare module '../../data/command' {
  interface IntentTypes { reply: { name: string; convo?: string } }
}

const CONVOS: Record<string, string> = { lea: 'c-lea', 'léa': 'c-lea', thomas: 'c-thomas', marc: 'c-marc', tom: 'c-tom', ines: 'c-ines', 'inès': 'c-ines' }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const reply = defineIntent({
  kind: 'reply', owner: 'nova', order: 60,
  parse: t => {
    const m = t.match(/reply to\s+(\S+)/)
    if (!m) return
    const name = m[1].replace(/^@/, '')
    return { kind: 'reply', name, convo: CONVOS[name] }
  },
  bar: (i, { go }) => i.convo
    ? { text: `Opening the conversation with ${cap(i.name)}. Nova’s draft is ready if you want it.`, after: () => setTimeout(() => go(`/inbox/${i.convo}`), 500) }
    : { text: `I couldn’t find a conversation with “${i.name}” in the last 30 days. Try their handle, or search the Inbox.`, ctas: [{ label: 'Open the Inbox', run: () => go('/inbox') }] },
  chat: (i, { s }) => {
    const conv = s.inbox.convs.find(c => c.id === i.convo)
    if (!conv) return { replies: [{ from: 'nova', text: `I can’t find a conversation with ${cap(i.name)}. Try their handle, like @lea.hikes.` }], effects: [] }
    const draft = (conv.draft ?? []).map(x => (typeof x === 'string' ? x : x.text)).join('') || `Thanks ${cap(i.name)}, we’re on it.`
    return { replies: [{ from: 'nova', text: `Here’s my reply to ${conv.author}. It goes out when you send it.`, card: { type: 'reply', convo: conv.id, author: conv.author, network: conv.network, quote: conv.messages[conv.messages.length - 1]?.text ?? '', text: draft, status: 'draft' } }], effects: [] }
  },
})

const nova: AgentModule = {
  id: 'nova',
  script: SCRIPT,
  onResolve: onResolveInbox,
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
