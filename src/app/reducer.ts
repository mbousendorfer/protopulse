import type { State, Preset } from './state'
import { initialState } from './state'
import type { AgentId, Autonomy, Decision, Flagged, Handoff, ThreadMsg } from './types'
import { DAY, MIN, startClock } from './time'
import {
  actionOf, addRule, agentOf, now, pronoun, notify, pushHandoff, pushLog, removeHandoff, setAutonomy, track, uid, updateHandoff,
} from './core'
import { SCRIPT, CLAIRE } from '../data/script'
import { levelFor } from '../data/agents'
import { onResolveInbox, reduceInbox, type InboxAction } from '../features/inbox/slice'
import { ideaEvent, onResolvePublishing, reducePublishing, tickIdeas, unscheduleIdea, type PublishingAction } from '../features/publishing/slice'
import { onResolveInsights, reduceInsights, type InsightsAction } from '../features/insights/slice'
import { onResolveListening, reduceListening, type ListeningAction } from '../features/listening/slice'
import { onResolveStrategy, reduceStrategy, type StrategyAction } from '../features/strategy/slice'
import { onResolvePlaybook, reducePlaybook, type PlaybookAction } from '../features/playbook/slice'
import { deliverFollowUps, reduceChats, type ChatsAction } from '../features/chats/slice'

export type CoreAction =
  | { type: 'core/resolve'; id: string; decision: Decision; ms?: number }
  | { type: 'core/bulk'; ids: string[]; decision?: Decision; snooze?: { until: number; label: string }; claire?: boolean; summary: string; agent: AgentId }
  | { type: 'core/snooze'; id: string; until: number; label: string }
  | { type: 'core/takeBack'; id: string }
  | { type: 'core/askClaire'; id: string; note?: string }
  | { type: 'core/thread'; id: string; text: string }
  | { type: 'core/acceptRule'; id: string; msg: string }
  | { type: 'core/editDraft'; id: string; text: string }
  | { type: 'core/undo'; id: string }
  | { type: 'core/redo'; id: string }
  | { type: 'core/autonomy'; agent: AgentId; action: string; level: Autonomy }
  | { type: 'core/preset'; agent: AgentId; preset: 'cautious' | 'balanced' | 'autonomous' }
  | { type: 'core/agentStatus'; agent: AgentId; status: 'on' | 'paused'; until?: string }
  | { type: 'core/guardrail'; agent: AgentId; id: string; value: string }
  | { type: 'core/guardrailAdd'; agent: AgentId; label: string; value: string }
  | { type: 'core/guardrailDelete'; agent: AgentId; id: string }
  | { type: 'core/fire'; eventId?: string }
  | { type: 'core/heartbeat' }
  | { type: 'core/engine'; live?: boolean; cadence?: number }
  | { type: 'core/skipDay' }
  | { type: 'core/reset'; preset?: Preset; onboarding?: boolean }
  | { type: 'core/onboarded' }
  | { type: 'core/dropNotice' }
  | { type: 'core/briefRead'; read: boolean }
  | { type: 'core/unfresh' }
  | { type: 'core/track'; kind: string; detail?: Record<string, unknown> }
  | { type: 'core/clearTracker' }
  | { type: 'core/hydrate'; state: State }
  | { type: 'core/restore'; handoff: Handoff }

export type Action = CoreAction | InboxAction | PublishingAction | InsightsAction | ListeningAction | StrategyAction | PlaybookAction | ChatsAction

const QUIET = new Set(['core/heartbeat', 'core/track', 'core/dropNotice', 'core/unfresh', 'core/hydrate', 'core/clearTracker'])

export function reducer(s: State, a: Action): State {
  const next = reduceAll(s, a)
  if (QUIET.has(a.type) || next === s) return next
  const { type, ...detail } = a as { type: string } & Record<string, unknown>
  return track(next, type, detail)
}

function reduceAll(s: State, a: Action): State {
  if (a.type.startsWith('inbox/')) return reduceInbox(s, a as InboxAction)
  if (a.type.startsWith('publishing/')) return reducePublishing(s, a as PublishingAction)
  if (a.type.startsWith('insights/')) return reduceInsights(s, a as InsightsAction)
  if (a.type.startsWith('listening/')) return reduceListening(s, a as ListeningAction)
  if (a.type.startsWith('strategy/')) return reduceStrategy(s, a as StrategyAction)
  if (a.type.startsWith('playbook/')) return reducePlaybook(s, a as PlaybookAction)
  if (a.type.startsWith('chats/')) return reduceChats(s, a as ChatsAction, resolve)
  return reduceCore(s, a as CoreAction)
}

/** Text of a flagged draft, flags removed. */
export const plain = (parts: Flagged[]) => parts.map(p => (typeof p === 'string' ? p : p.text)).join('')

function verb(d: Decision, h: Handoff): { text: string; status: 'approved' | 'edited' | 'rejected' | 'done' } {
  switch (d.kind) {
    case 'approve': return { text: d.edited ? `${h.title}: approved with your edits` : `${h.title}: approved`, status: d.edited ? 'edited' : 'approved' }
    case 'reject': return { text: `${h.title}: rejected${d.reason ? ` (${d.reason})` : ''}`, status: 'rejected' }
    case 'option': return { text: `${h.title}: ${d.option}`, status: 'approved' }
    case 'answer': return { text: `${h.title}: ${d.text}`, status: 'approved' }
    case 'trial': return { text: `${h.title}: trial for a week`, status: 'approved' }
  }
}

/** Undo what a Desk decision changed outside the card: autonomy moves and Playbook rules added from it. */
function reverseDecision(s: State, h: Handoff): State {
  let next = s
  if (h.kind === 'promotion' && h.promote) {
    next = setAutonomy(next, h.agent, h.promote.action, h.promote.from, 'You undid this decision')
    next = { ...next, agents: next.agents.map(ag => ag.id !== h.agent ? ag : { ...ag, actions: ag.actions.map(x => x.id === h.promote!.action ? { ...x, trialUntil: undefined, trialFrom: undefined } : x) }) }
  }
  const drop = (r: { text: string; origin?: string }) =>
    (!!h.proposal && r.text === h.proposal.text) || (h.kind === 'info' && r.text.startsWith(`${h.field?.label ?? h.topic}: `) && !!r.origin?.startsWith('Your answer'))
  return { ...next, playbook: { ...next.playbook, rules: next.playbook.rules.filter(r => !drop(r)) } }
}

export function resolve(s: State, id: string, d: Decision, opts: { quiet?: boolean; ms?: number } = {}): State {
  const h = s.handoffs.find(x => x.id === id)
  if (!h) return s
  let next = removeHandoff(s, id)

  if (h.kind === 'promotion' && h.promote) {
    const { action, to, from } = h.promote
    const label = actionOf(s, h.agent, action)?.label ?? action
    if (d.kind === 'approve' || d.kind === 'trial') {
      next = setAutonomy(next, h.agent, action, to, `You moved “${label}” to ${to}`)
      if (d.kind === 'trial') next = { ...next, agents: next.agents.map(ag => ag.id !== h.agent ? ag : { ...ag, actions: ag.actions.map(x => x.id === action ? { ...x, trialUntil: now(s) + 7 * DAY, trialFrom: from } : x) }) }
    }
  }

  if (h.proposal && d.kind === 'approve') {
    next = addRule(next, { kind: 'dont', text: h.proposal.text, agents: h.proposal.agents, origin: `Learned from your edits · ${agentOf(s, h.agent).name}` })
  }

  next = onResolveInbox(next, h, d)
  next = onResolvePublishing(next, h, d)
  next = onResolveInsights(next, h, d)
  next = onResolveListening(next, h, d)
  next = onResolveStrategy(next, h, d)
  next = onResolvePlaybook(next, h, d)

  // An answer to "missing info" becomes a Playbook fact, so the agent never asks twice.
  if (h.kind === 'info' && d.kind === 'answer') {
    next = addRule(next, { kind: 'fact', text: `${h.field?.label ?? h.topic}: ${d.text}`, agents: [h.agent], origin: `Your answer to ${agentOf(s, h.agent).name}` })
  }

  const v = verb(d, h)
  next = { ...next, desk: { done: [{ id: h.id, title: h.title, text: doneText(d, h), at: now(s), ms: opts.ms, h }, ...next.desk.done.filter(x => x.id !== h.id)] } }
  if (opts.quiet) return next
  return pushLog(next, { agent: h.agent, text: v.text, status: v.status, reason: 'Your call from the Desk', link: h.link, undoMinutes: d.kind === 'reject' ? undefined : 10, restore: [h] })
}

/** Short line shown on a done row. */
function doneText(d: Decision, h: Handoff) {
  if (h.kind === 'promotion') return d.kind === 'reject' ? 'Kept as is' : d.kind === 'trial' ? 'Trial for a week' : `Moved to ${h.promote?.to}`
  if (h.kind === 'news') return d.kind === 'reject' ? 'Noted' : h.cta?.label ?? 'Done'
  switch (d.kind) {
    case 'approve': return h.proposal ? 'Rule added' : h.preview?.type === 'reply' ? (d.edited ? 'Sent with your edits' : 'Reply sent') : h.preview?.type === 'post' ? 'Scheduled' : 'Approved'
    case 'reject': return `Rejected${d.reason ? ` · ${d.reason}` : ''}`
    case 'option': return d.option
    case 'answer': return `Answered: ${d.text}`
    case 'trial': return 'Trial for a week'
  }
}

/** Which Desk group a card belongs to. */
export function groupOf(h: Handoff): 'need' | 'look' | 'good' {
  if (h.group) return h.group
  if (h.kind === 'news') return 'good'
  if (h.kind === 'alert' || /^(Competitor|Trend|Anomaly|Negative spike)$/.test(h.topic)) return 'look'
  return 'need'
}

/** Fire one scripted event: a Desk card, or a journal entry if the agent is on Act for that action. */
function fire(s: State, eventId?: string): State {
  const idx = eventId ? SCRIPT.findIndex(e => e.id === eventId) : s.engine.cursor % SCRIPT.length
  const ev = SCRIPT[idx]
  if (!ev) return s
  let next: State = eventId ? s : { ...s, engine: { ...s.engine, cursor: s.engine.cursor + 1 } }
  if (ev.idea) {
    // Ideas arrive in Publishing › Ideas. A paused agent spots nothing, unless the moderator triggers it.
    if (!eventId && (agentOf(next, ev.idea.agent).status !== 'on' || agentOf(next, 'atlas').status !== 'on')) return next
    return ideaEvent(next, ev.idea)
  }
  if (!ev.handoff) return next
  // Never raise the same thing twice: skip it if it's already on the Desk or was settled since the brief.
  const handoff = ev.handoff
  const seen = next.handoffs.some(h => h.ref === ev.id || h.title === handoff.title) || next.desk.done.some(x => x.title === handoff.title)
  if (seen && !eventId) {
    // Once the script has played, the feed keeps the day alive with quiet work done alone.
    if (!ev.auto) return next
    return next.log.some(l => l.text === ev.auto!.text) ? next : pushLog(next, { agent: handoff.agent, text: ev.auto.text, reason: ev.auto.reason, status: 'done', undoMinutes: 10, link: ev.auto.link })
  }
  const agent = agentOf(next, handoff.agent)
  if (agent.status !== 'on' && !eventId) return next
  const level = actionOf(next, agent.id, handoff.action)?.autonomy
  if (!ev.always && level === 'act' && ev.auto) {
    // Work done alone shows up in the Live feed and the journal, without interrupting. Once is enough.
    if (next.log.some(l => l.text === ev.auto!.text)) return next
    return pushLog(next, { agent: agent.id, text: ev.auto.text, reason: ev.auto.reason, status: 'done', undoMinutes: 10, link: ev.auto.link })
  }
  // New cards land in Your day quietly, urgent ones included (PROMPT §5): the Desk ranks them.
  return pushHandoff(next, { ...structuredClone(handoff), ref: handoff.ref ?? ev.id, proposal: ev.rule })
}

const AGENT_REPLY = (h: Handoff, text: string): ThreadMsg => ({ id: uid('m'), from: 'agent', text, at: h.at })

function threadReply(s: State, h: Handoff, input: string): { msg: ThreadMsg; patch?: Partial<Handoff>; claire?: boolean } {
  const t = input.toLowerCase().trim()
  const name = agentOf(s, h.agent).name
  const base = { id: uid('m'), from: 'agent' as const, at: now(s) }
  const draft = h.preview && (h.preview.type === 'reply' ? h.preview.draft : h.preview.type === 'post' ? h.preview.text : undefined)
  const setDraft = (text: string): Partial<Handoff> | undefined => {
    if (!h.preview) return
    if (h.preview.type === 'reply') return { preview: { ...h.preview, draft: [text] } }
    if (h.preview.type === 'post') return { preview: { ...h.preview, text: [text] } }
  }

  if (/claire/.test(t)) return { msg: { ...base, text: 'Sent to Claire. I’ll move the card to “Waiting on Claire” and tell you when she answers.' }, claire: true }
  if (/^why|reason|how come|explain/.test(t)) {
    const rules = h.rules?.length ? ` I applied ${h.rules.map(r => `“${r}”`).join(' and ')} from the Playbook.` : ''
    return { msg: { ...base, text: `${h.why}${rules} I’m ${h.confidence}% confident. ${h.confidence < 75 ? 'The marked passages are where I’m least sure.' : ''}`.trim() } }
  }
  const never = t.match(/^(?:please )?(?:don['’]?t|do not|never|stop|no more)\s+(.+?)[.!]?$/)
  if (never) {
    const rule = `Never ${never[1].replace(/^(?:ever )?/, '').replace(/\byou\b/g, 'we')}`
    return { msg: { ...base, text: `Understood. I’ll stop doing that here. Should I make it a Playbook rule so every agent follows it? “${rule}”`, rule } }
  }
  const instead = t.match(/^(?:use|say|write)\s+(.+?)\s+instead/)
  if (instead && draft) {
    return { msg: { ...base, text: `Done, I used “${instead[1]}” in the draft.` }, patch: setDraft(plain(draft).replace(/\.$/, '') + ` — ${instead[1]}.`) }
  }
  if (/short|concise|trim/.test(t) && draft) {
    const sentences = plain(draft).split(/(?<=[.!?])\s+/)
    const shorter = sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join(' ')
    return { msg: { ...base, text: `Shorter version is in the draft: ${shorter.length} characters instead of ${plain(draft).length}.` }, patch: setDraft(shorter) }
  }
  if (/warm|friendl|kind/.test(t) && draft) {
    return { msg: { ...base, text: 'Warmer version is in the draft.' }, patch: setDraft(plain(draft).replace(/^(\w[^,]*),/, '$1, thanks for telling us,').replace(/Sorry\./, 'We’re really sorry.')) }
  }
  if (/formal|professional/.test(t) && draft) {
    return { msg: { ...base, text: 'More formal version is in the draft.' }, patch: setDraft(plain(draft).replace(/[🏕️😕🌿]/gu, '').replace(/Sorry\./, 'Please accept our apologies.').replace(/isn’t/g, 'is not').replace(/won’t/g, 'will not')) }
  }
  if (/source|data|number|proof/.test(t)) {
    return { msg: { ...base, text: h.preview?.type === 'metric' ? `${h.preview.label}: ${h.preview.value} (${h.preview.delta}). Source: native ${h.agent === 'iris' ? 'analytics' : 'listening'} data, refreshed at ${new Date(h.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.` : `I used the conversation, the order history and the Playbook facts. Nothing else.` } }
  }
  return { msg: { ...base, text: `I’m not sure what you mean. I can explain why I raised this, make the draft shorter, warmer or more formal, use other words, or turn a “don’t…” into a Playbook rule for ${name} and the team.` } }
}

const TRAIL_SCRIPT_PRESETS: Record<Preset, string[]> = {
  calm: ['h-strap', 'h-plan', 'h-tiktok', 'h-report'],
  busy: [],
  competitor: ['h-peakline', 'h-plan', 'h-report'],
  trust: ['h-promo-nova', 'h-strap', 'h-review', 'h-report'],
}

function applyPreset(s: State, p: Preset): State {
  if (p === 'busy') return s
  let next: State = { ...s, handoffs: s.handoffs.filter(h => TRAIL_SCRIPT_PRESETS[p].includes(h.id)) }
  const extra: Record<Preset, string[]> = { calm: [], busy: [], competitor: ['ev-trailkind', 'ev-norro', 'ev-basecamp'], trust: ['ev-promo-exchange', 'ev-demote', 'ev-rule-emoji'] }
  for (const id of extra[p]) next = fire(next, id)
  return { ...next, handoffs: next.handoffs.map(h => ({ ...h, fresh: false })), notice: undefined }
}

function reduceCore(s: State, a: CoreAction): State {
  switch (a.type) {
    case 'core/resolve':
      return resolve(s, a.id, a.decision, { ms: a.ms })

    case 'core/bulk': {
      const cards = s.handoffs.filter(h => a.ids.includes(h.id))
      if (!cards.length) return s
      let next = s
      for (const h of cards) {
        if (a.snooze) next = updateHandoff(next, h.id, { lane: 'snoozed', snoozedUntil: a.snooze.until })
        else if (a.claire) next = reduceCore(next, { type: 'core/askClaire', id: h.id })
        else if (a.decision) next = resolve(next, h.id, a.decision, { quiet: true })
      }
      next = pushLog(next, { agent: a.agent, text: a.summary, status: 'approved', reason: 'Your call from the Desk, in one go', undoMinutes: 10, restore: cards })
      return notify(next, 'desk', a.summary, { undo: next.log[0].id })
    }

    case 'core/snooze': {
      const h = s.handoffs.find(x => x.id === a.id)
      if (!h) return s
      return pushLog(updateHandoff(s, a.id, { lane: 'snoozed', snoozedUntil: a.until }), { agent: h.agent, text: `${h.title}: snoozed until ${a.label}`, status: 'done', reason: 'Your call from the Desk' })
    }

    case 'core/askClaire': {
      const h = s.handoffs.find(x => x.id === a.id)
      if (!h) return s
      const t = now(s)
      const wait = (30 + Math.round(Math.random() * 30)) * 1000
      const msg: ThreadMsg = { id: uid('m'), from: 'you', text: a.note ? `@Claire ${a.note}` : '@Claire can you take a look?', at: t }
      return updateHandoff(s, a.id, { lane: 'claire', claire: { askedAt: t, dueAt: t + wait }, thread: [...(h.thread ?? []), msg] })
    }

    case 'core/thread': {
      const h = s.handoffs.find(x => x.id === a.id)
      if (!h) return s
      const you: ThreadMsg = { id: uid('m'), from: 'you', text: a.text, at: now(s) }
      const r = threadReply(s, h, a.text)
      let next = updateHandoff(s, a.id, { ...r.patch, thread: [...(h.thread ?? [{ ...AGENT_REPLY(h, `${h.why}`), id: uid('m') }]), you, r.msg] })
      if (r.claire) next = reduceCore(next, { type: 'core/askClaire', id: a.id })
      return next
    }

    case 'core/acceptRule': {
      const h = s.handoffs.find(x => x.id === a.id)
      const m = h?.thread?.find(x => x.id === a.msg)
      if (!h || !m?.rule) return s
      let next = addRule(s, { kind: 'dont', text: m.rule, agents: [h.agent], origin: `From your conversation with ${agentOf(s, h.agent).name}` })
      next = updateHandoff(next, h.id, { thread: h.thread!.map(x => x.id === m.id ? { ...x, ruleAdded: true } : x).concat({ id: uid('m'), from: 'agent', at: now(s), text: `Added. I’ll follow “${m.rule}” from now on. You can pause or delete it in my Rules tab.` }) })
      return next
    }

    case 'core/editDraft': {
      const h = s.handoffs.find(x => x.id === a.id)
      if (!h?.preview) return s
      if (h.preview.type === 'reply') return updateHandoff(s, a.id, { preview: { ...h.preview, draft: [a.text] }, answer: a.text })
      if (h.preview.type === 'post') return updateHandoff(s, a.id, { preview: { ...h.preview, text: [a.text] }, answer: a.text })
      return s
    }

    case 'core/undo': {
      const l = s.log.find(x => x.id === a.id)
      if (!l || !l.undoUntil || l.undoUntil < now(s)) return s
      let next: State = { ...s, log: s.log.map(x => (x.id === a.id ? { ...x, status: 'undone' as const } : x)) }
      if (l.restore?.length) {
        const ids = new Set(l.restore.map(h => h.id))
        next = { ...next, handoffs: [...l.restore.map(h => ({ ...h, fresh: true, lane: undefined })), ...next.handoffs.filter(h => !ids.has(h.id))], desk: { done: next.desk.done.filter(x => !ids.has(x.id)) } }
        for (const h of l.restore) next = reverseDecision(next, h)
      }
      if (l.idea) next = unscheduleIdea(next, l.idea)
      return next.notice?.undo === a.id ? { ...next, notice: undefined } : next
    }

    case 'core/redo': {
      const l = s.log.find(x => x.id === a.id)
      if (!l || l.status !== 'undone') return s
      return { ...s, log: s.log.map(x => (x.id === a.id ? { ...x, status: 'redone' as const } : x)) }
    }

    case 'core/autonomy': {
      const next = setAutonomy(s, a.agent, a.action, a.level)
      const n = s.handoffs.length - next.handoffs.length
      return n ? notify(next, 'agents', `${n} card${n > 1 ? 's' : ''} left your Desk. ${agentOf(s, a.agent).name} handles ${n > 1 ? 'them' : 'it'} now.`, { link: { to: '/activity', label: 'See in Activity' } }) : next
    }

    case 'core/preset': {
      const ag = agentOf(s, a.agent)
      let next = s
      for (const x of ag.actions) {
        if (x.locked) continue
        next = setAutonomy(next, a.agent, x.id, levelFor(x.risk, a.preset), `You set ${ag.name} to ${a.preset}`)
      }
      return next
    }

    case 'core/agentStatus': {
      const ag = agentOf(s, a.agent)
      const next = { ...s, agents: s.agents.map(x => (x.id === a.agent ? { ...x, status: a.status, pausedUntil: a.until } : x)) }
      return pushLog(next, { agent: a.agent, text: a.status === 'paused' ? `${ag.name} paused${a.until ? ` until ${a.until}` : ''}` : `${ag.name} is back on shift`, status: 'done', reason: 'You changed the shift' })
    }

    case 'core/guardrail':
      return { ...s, agents: s.agents.map(x => (x.id !== a.agent ? x : { ...x, guardrails: x.guardrails.map(g => (g.id === a.id ? { ...g, value: a.value } : g)) })) }

    case 'core/guardrailAdd':
      return { ...s, agents: s.agents.map(x => (x.id !== a.agent ? x : { ...x, guardrails: [...x.guardrails, { id: uid('g'), label: a.label, value: a.value }] })) }

    case 'core/guardrailDelete':
      return { ...s, agents: s.agents.map(x => (x.id !== a.agent ? x : { ...x, guardrails: x.guardrails.filter(g => g.id !== a.id) })) }

    case 'core/fire':
      return fire(s, a.eventId)

    case 'core/heartbeat': {
      const t = now(s)
      let next = s
      // Claire answers.
      for (const h of next.handoffs) {
        if (h.lane === 'claire' && h.claire && !h.claire.reply && h.claire.dueAt <= t) {
          const pool = CLAIRE[h.topic] ?? CLAIRE.default
          const r = pool[Math.floor(Math.random() * pool.length)]
          const msg: ThreadMsg = { id: uid('m'), from: 'claire', text: r.text, at: t }
          if (r.verdict === 'approve') {
            next = resolve(updateHandoff(next, h.id, { thread: [...(h.thread ?? []), msg] }), h.id, { kind: 'approve' })
            next = pushLog(next, { agent: h.agent, text: `Claire approved: ${h.title}`, status: 'approved', reason: r.text })
          } else {
            next = updateHandoff(next, h.id, { lane: undefined, urgency: r.verdict === 'changes' ? 'urgent' : h.urgency, claire: { ...h.claire, reply: r.text, verdict: r.verdict }, thread: [...(h.thread ?? []), msg], fresh: true })
          }
        }
        if (h.lane === 'snoozed' && h.snoozedUntil && h.snoozedUntil <= t) next = updateHandoff(next, h.id, { lane: undefined, snoozedUntil: undefined, fresh: true })
      }
      // Trials ending.
      for (const ag of next.agents) for (const x of ag.actions) {
        if (x.trialUntil && x.trialUntil <= t && x.trialFrom) {
          next = setAutonomy(next, ag.id, x.id, x.trialFrom)
          next = pushLog(next, { agent: ag.id, text: `Trial week on “${x.label}” is over. Back to ${x.trialFrom}.`, status: 'done', reason: 'The trial you started ended' })
        }
      }
      // Agents coming back in a conversation.
      next = deliverFollowUps(next, t)
      // Ideas whose window closed leave; snoozed ones come back.
      next = tickIdeas(next, t)
      // Proactive feed.
      if (next.engine.live && t >= next.engine.nextAt) {
        next = fire({ ...next, engine: { ...next.engine, nextAt: t + next.engine.cadence * 1000 } })
      }
      return next
    }

    case 'core/engine': {
      const live = a.live ?? s.engine.live
      const cadence = a.cadence ?? s.engine.cadence
      return { ...s, engine: { ...s.engine, live, cadence, nextAt: now(s) + cadence * 1000 } }
    }

    case 'core/skipDay': {
      const t = now(s)
      const d = new Date(t)
      const tomorrow8 = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 8, 0).getTime()
      let next: State = { ...s, clock: startClock(tomorrow8), brief: { read: false, since: t }, handoffs: s.handoffs.map(h => ({ ...h, fresh: false })) }
      next = pushLog(next, { agent: 'iris', at: tomorrow8 - 60 * MIN, text: 'Wrote this morning’s brief', status: 'done' })
      next = pushLog(next, { agent: 'nova', at: tomorrow8 - 5 * 60 * MIN, text: 'Answered 14 questions overnight', reason: 'Product questions, set to Act', status: 'done' })
      for (let i = 0; i < 4; i++) next = { ...fire(next), engine: { ...next.engine, cursor: next.engine.cursor + 1 } }
      return { ...next, engine: { ...next.engine, nextAt: tomorrow8 + next.engine.cadence * 1000 }, notice: undefined }
    }

    case 'core/reset': {
      const fresh = { ...initialState(), tester: s.tester }
      if (a.onboarding) return { ...fresh, onboarded: false, engine: { ...fresh.engine, live: false } }
      return a.preset ? applyPreset(fresh, a.preset) : fresh
    }

    case 'core/onboarded': {
      return { ...initialState(), onboarded: true, tester: s.tester }
    }

    case 'core/dropNotice':
      return { ...s, notice: undefined }

    case 'core/briefRead':
      return { ...s, brief: { ...s.brief, read: a.read } }

    case 'core/unfresh':
      return s.handoffs.some(h => h.fresh) ? { ...s, handoffs: s.handoffs.map(h => (h.fresh ? { ...h, fresh: false } : h)) } : s

    case 'core/track':
      return track(s, a.kind, a.detail)

    case 'core/takeBack': {
      // Sam takes a card back from Claire's lane and decides himself.
      const h = s.handoffs.find(x => x.id === a.id)
      if (!h) return s
      return pushLog(updateHandoff(s, a.id, { lane: undefined, claire: undefined }), { agent: h.agent, text: `You took back “${h.title}” from Claire`, status: 'done', reason: 'You decide it yourself' })
    }
    case 'core/clearTracker':
      return { ...s, tester: [] }

    case 'core/hydrate':
      return a.state

    case 'core/restore': {
      // Undo of a Desk decision: the card comes back, the journal line is marked undone.
      const lastLog = s.log.find(l => l.text.startsWith(a.handoff.title) && l.status !== 'undone')
      const next = reverseDecision({ ...s, desk: { done: s.desk.done.filter(x => x.id !== a.handoff.id) }, handoffs: [{ ...a.handoff, fresh: true, lane: undefined }, ...s.handoffs.filter(h => h.id !== a.handoff.id)] }, a.handoff)
      return lastLog ? { ...next, log: next.log.map(l => (l.id === lastLog.id ? { ...l, status: 'undone' as const } : l)) } : next
    }
  }
}

export { pronoun }
