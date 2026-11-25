// Helpers any feature reducer can use to touch shared state. Type-only imports keep this free of cycles.
import type { State } from './state'
import type { AgentId, Autonomy, Handoff, LogEntry, NoticeScope, PlaybookRule } from './types'
import { appNow, MIN } from './time'

let seq = 0
export const uid = (p: string) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}`

export const now = (s: State) => appNow(s.clock)

export const agentOf = (s: State, id: AgentId) => s.agents.find(a => a.id === id)!

export const actionOf = (s: State, agent: AgentId, action?: string) =>
  action ? agentOf(s, agent).actions.find(x => x.id === action) : undefined

export function pushHandoff(s: State, h: Omit<Handoff, 'id' | 'at'> & { id?: string; at?: number }): State {
  const full: Handoff = { ...h, id: h.id ?? uid('h'), at: h.at ?? now(s), fresh: true }
  return { ...s, handoffs: [full, ...s.handoffs] }
}

export function pushLog(s: State, e: Omit<LogEntry, 'id' | 'at'> & { at?: number; undoMinutes?: number }): State {
  const at = e.at ?? now(s)
  const { undoMinutes, ...rest } = e
  const entry: LogEntry = { ...rest, id: uid('l'), at, undoUntil: undoMinutes ? at + undoMinutes * MIN : e.undoUntil }
  return { ...s, log: [entry, ...s.log] }
}

/** Confirms your own action at the top of the list it acted on. With `undo`, it lasts as long as that journal entry can be undone. */
export function notify(s: State, scope: NoticeScope, text: string, opts: { undo?: string; link?: { to: string; label: string } } = {}): State {
  const undoUntil = opts.undo ? s.log.find(l => l.id === opts.undo)?.undoUntil : undefined
  return { ...s, notice: { scope, text, ...opts, until: undoUntil ?? now(s) + NOTICE_MS } }
}
/** A plain confirmation stays as long as the Inbox undo strip did. */
export const NOTICE_MS = 10_000

export function track(s: State, kind: string, detail?: Record<string, unknown>): State {
  return { ...s, tester: [...s.tester, { t: Date.now(), app: now(s), kind, detail }] }
}

export function updateHandoff(s: State, id: string, patch: Partial<Handoff>): State {
  return { ...s, handoffs: s.handoffs.map(h => (h.id === id ? { ...h, ...patch } : h)) }
}

export function removeHandoff(s: State, id: string): State {
  return { ...s, handoffs: s.handoffs.filter(h => h.id !== id) }
}

/**
 * Change one action's level, nothing else. Locked actions never move past Suggest.
 * The reducer's `setLevel` wraps it: moving to Act also has the agent do the pending Desk cards for that action.
 */
export function setAutonomy(s: State, agent: AgentId, action: string, level: Autonomy): State {
  const act = agentOf(s, agent).actions.find(x => x.id === action)
  if (!act || (act.locked && level !== 'suggest')) return s
  return {
    ...s,
    agents: s.agents.map(ag => ag.id !== agent ? ag : { ...ag, actions: ag.actions.map(x => x.id === action ? { ...x, autonomy: level, trialUntil: undefined, trialFrom: undefined } : x) }),
  }
}

export function addRule(s: State, rule: Omit<PlaybookRule, 'id' | 'addedAt' | 'uses'>): State {
  const r: PlaybookRule = { ...rule, id: uid('r'), addedAt: now(s), uses: 0 }
  return { ...s, playbook: { ...s.playbook, rules: [r, ...s.playbook.rules] } }
}

export const pronoun = (agent: AgentId) => (agent === 'nova' || agent === 'iris' || agent === 'echo' || agent === 'juno' ? 'her' : 'its')
