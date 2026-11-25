// Nova · Inbox: everything Nova plugs into the core (see src/app/agents-registry.ts).
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { flagged, isLead } from '../desk/parts'
import type { State } from '../../app/state'
import { CONTACTS, withTeam } from '../../data/inbox'
import { now } from '../../app/core'
import { dueInbox, dur, NEEDS_YOU, onResolveInbox, reduceInbox, tickInbox, waitingList, onUndoInbox, virtualConvs, type CardConv } from './slice'
import { fill, savedNamed } from './saved'
import { matches, thenText, whenText, wordsOf, type InboxRule, type RuleOp } from './rules'
import { SCRIPT } from './script'

declare module '../../data/command' {
  interface IntentTypes {
    reply: { name: string; saved?: string }
    inboxRule: { words: string[]; then: RuleOp }
    waiting: object
  }
}
declare module '../../app/types' {
  interface Handoff {
    /** Nova reply cards: the conversation behind the card (kind, mood, contact), so the Inbox never has to guess. */
    conv?: CardConv
    /** Nova proposes this Inbox rule (learned from Sam's labels); approving the card adds it. */
    inboxRule?: Pick<InboxRule, 'words' | 'network' | 'type' | 'then'>
    /** Nova's response-time warning: the conversations it is about (the card goes once they are answered). */
    sla?: string[]
    /** Nova's spam suspects (conversation ids): approving the card reports them as spam. */
    inboxSpam?: string[]
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
    const m = t.match(/reply to\s+(\S+)(?:\s+with\s+(.+))?/)
    if (!m) return
    return { kind: 'reply', name: m[1].replace(/^@/, ''), saved: m[2] }
  },
  bar: (i, { s, d, go }) => {
    const c = findConvo(s, i.name)
    if (!c) return { text: `I couldn’t find a conversation with “${i.name}” in the last 30 days. Try their handle, or search the Inbox.`, ctas: [{ label: 'Open the Inbox', run: () => go('/inbox') }] }
    if (i.saved) {
      const r = savedNamed(s.inbox.saved, i.saved)
      if (!r) return { text: `I don’t have a saved reply called “${i.saved}”. You have: ${s.inbox.saved.map(x => x.name).join(', ')}.`, ctas: [{ label: 'See saved replies', run: () => go('/inbox?saved=1') }] }
      return { text: `Opening the conversation with ${c.author}. I put the “${r.name}” saved reply in the draft, adapted to them: “${fill(r, c)}” It goes out when you send it.`, after: () => { d({ type: 'inbox/savedUse', id: c.id, saved: r.id }); setTimeout(() => go(`/inbox/${c.id}`), 500) } }
    }
    return { text: `Opening the conversation with ${c.author}. ${c.draft?.length ? 'Nova’s draft is ready if you want it.' : 'There’s no draft waiting: you can reply from there.'}`, after: () => setTimeout(() => go(`/inbox/${c.id}`), 500) }
  },
  chat: (i, { s }) => {
    const conv = findConvo(s, i.name)
    if (!conv) return { replies: [{ from: 'nova', text: `I can’t find a conversation with ${cap(i.name)}. Try their handle, like @lea.hikes.` }], effects: [] }
    const r = i.saved ? savedNamed(s.inbox.saved, i.saved) : undefined
    if (i.saved && !r) return { replies: [{ from: 'nova', text: `I don’t have a saved reply called “${i.saved}”. You have: ${s.inbox.saved.map(x => x.name).join(', ')}.` }], effects: [] }
    const draft = r ? fill(r, conv) : (conv.draft ?? []).map(x => (typeof x === 'string' ? x : x.text)).join('') || `Thanks ${cap(i.name)}, we’re on it.`
    const said = r ? `Here’s the “${r.name}” saved reply, adapted to ${conv.author}. It’s also the draft in the Inbox. It goes out when you send it.` : `Here’s my reply to ${conv.author}. It goes out when you send it.`
    return {
      replies: [{ from: 'nova', text: said, card: { type: 'reply', convo: conv.id, author: conv.author, network: conv.network, quote: conv.messages[conv.messages.length - 1]?.text ?? '', text: draft, status: 'draft' } }],
      effects: r ? [st => reduceInbox(st, { type: 'inbox/savedUse', id: conv.id, saved: r.id })] : [],
    }
  },
})

/** "Make Nova label refund requests as Refund", "assign press to Claire", "hide messages about crypto": a new Inbox rule. */
const inboxRule = defineIntent({
  kind: 'inboxRule', owner: 'nova', order: 55,
  parse: t => {
    const q = t.replace(/^(?:make|have|ask|let)\s+nova\s+|^nova,?\s+/, '').replace(/^(?:please\s+)?(?:always\s+)?/, '')
    let m = q.match(/^(?:label|tag)\s+(.+?)\s+(?:as|with)\s+["“]?(.+?)["”]?$/)
    if (m) return { kind: 'inboxRule', words: wordsOf(m[1]), then: { op: 'label', value: cap(m[2].trim()) } }
    m = q.match(/^assign\s+(.+?)\s+to\s+(claire|me|sam|l[eé]o|yanis)$/)
    if (m) return { kind: 'inboxRule', words: wordsOf(m[1]), then: { op: 'assign', value: m[2] === 'me' || m[2] === 'sam' ? 'sam' : m[2] === 'yanis' ? 'yanis' : m[2] === 'claire' ? 'claire' : 'leo' } }
    m = q.match(/^hide\s+(.+)$/)
    if (m && wordsOf(m[1]).length) return { kind: 'inboxRule', words: wordsOf(m[1]), then: { op: 'hide' } }
    m = q.match(/^(?:mark\s+(.+?)\s+(?:as\s+)?reviewed|review\s+(.+))$/)
    if (m) return { kind: 'inboxRule', words: wordsOf(m[1] ?? m[2]), then: { op: 'review' } }
  },
  bar: (i, { s, d, go }) => {
    if (!i.words.length) return { text: 'Which words should I look for? Try “label refund requests as Refund”.' }
    const rule = { words: i.words, then: i.then }
    const n = s.inbox.convs.filter(c => matches({ ...rule, id: '', on: true, uses: 0, origin: '' }, withTeam(c))).length
    return {
      text: `Done. When a message ${whenText(rule)}, I’ll ${thenText(i.then).toLowerCase()}.${n ? ` ${n} conversation${n > 1 ? 's' : ''} already match: I applied it there too.` : ''} You can undo it from the journal.`,
      after: () => d({ type: 'inbox/ruleAdd', rule, applyNow: true, origin: 'You asked in ⌘K' }),
      ctas: [{ label: 'See the rules', run: () => go('/inbox?rules=1') }],
    }
  },
  chat: (i, { s }) => {
    if (!i.words.length) return { replies: [{ from: 'nova', text: 'Which words should I look for? Try “label refund requests as Refund”.' }], effects: [] }
    const rule = { words: i.words, then: i.then }
    const n = s.inbox.convs.filter(c => matches({ ...rule, id: '', on: true, uses: 0, origin: '' }, withTeam(c))).length
    return {
      replies: [{ from: 'nova', text: `Done. When a message ${whenText(rule)}, I’ll ${thenText(i.then).toLowerCase()}.${n ? ` ${n} conversation${n > 1 ? 's' : ''} already match: I applied it there too.` : ''} It’s in Inbox › Rules.` }],
      effects: [st => reduceInbox(st, { type: 'inbox/ruleAdd', rule, applyNow: true, origin: 'You asked in Chat' })],
    }
  },
})

/** "Who is waiting longest?": the same list and numbers as the Inbox's Waiting longest sort. */
function waitingAnswer(s: State) {
  const list = waitingList(s, now(s))
  if (!list.length) return { text: 'Nobody is waiting on you or Claire right now. Nova answered everything else.', top: list }
  const over = list.filter(x => x.w.over).length
  const top = list.slice(0, 3)
  const lines = top.map(x => `${x.c.author}, ${dur(x.w.waited)} (target ${dur(x.w.target)}${x.w.over ? ', over' : ''})`).join('; ')
  return { text: `${list.length} conversation${list.length > 1 ? 's' : ''} wait on the team, ${over} past target. Longest: ${lines}.`, top }
}
const waiting = defineIntent({
  kind: 'waiting', owner: 'nova', order: 58,
  parse: t => (/(who(?:’|')?s|who is|who has been)\s+(?:been\s+)?waiting|waiting (?:the )?longest|longest wait|overdue (?:messages|conversations|replies)/.test(t) ? { kind: 'waiting' } : undefined),
  bar: (_i, { s, go }) => ({ text: waitingAnswer(s).text, ctas: [{ label: 'Open them, longest first', primary: true, run: () => go('/inbox?sort=waiting') }] }),
  chat: (_i, { s }) => ({ replies: [{ from: 'nova', text: `${waitingAnswer(s).text} Sort the Inbox by “Waiting longest” to see them all.` }], effects: [] }),
})

const nova: AgentModule = {
  id: 'nova',
  script: SCRIPT,
  onResolve: onResolveInbox,
  onUndo: onUndoInbox,
  intents: [reply, inboxRule, waiting],
  due: dueInbox,
  tick: tickInbox,
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
  // Moderator › Hard to see: what a tester rarely stumbles on (⇧D).
  triggers: [{ event: 'ev-sla', to: '/inbox?sort=waiting' }, { event: 'ev-injury', to: '/inbox' }, { event: 'ev-refund-ask', to: '/activity' }, { event: 'ev-teach-rule', to: '/' }],
}
export default nova
