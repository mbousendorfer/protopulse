// Helpers any feature reducer can use to touch shared state. Type-only imports keep this free of cycles.
import type { State } from './state'
import type { AgentId, Autonomy, Handoff, LogEntry, PlaybookRule, Toast } from './types'
import { appNow, MIN } from './time'

let seq = 0
export const uid = (p: string) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}`

export const now = (s: State) => appNow(s.clock)

export const agentOf = (s: State, id: AgentId) => s.agents.find(a => a.id === id)!

export const actionOf = (s: State, agent: AgentId, action?: string) =>
  action ? agentOf(s, agent).actions.find(x => x.id === action) : undefined

export function pushHandoff(s: State, h: Omit<Handoff, 'id' | 'at'> & { id?: string; at?: number }, toastText?: string): State {
  const full: Handoff = { ...h, id: h.id ?? uid('h'), at: h.at ?? now(s), fresh: true }
  const next = { ...s, handoffs: [full, ...s.handoffs] }
  return toastText === undefined ? next : pushToast(next, { agent: full.agent, text: toastText || `New on your Desk: ${full.title}`, link: '/' })
}

export function pushLog(s: State, e: Omit<LogEntry, 'id' | 'at'> & { at?: number; undoMinutes?: number }): State {
  const at = e.at ?? now(s)
  const { undoMinutes, ...rest } = e
  const entry: LogEntry = { ...rest, id: uid('l'), at, undoUntil: undoMinutes ? at + undoMinutes * MIN : e.undoUntil }
  return { ...s, log: [entry, ...s.log] }
}

export function pushToast(s: State, t: Omit<Toast, 'id'>): State {
  return { ...s, toasts: [...s.toasts.slice(-3), { ...t, id: uid('t') }] }
}

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
 * Change one action's level. Moving to Act hands every pending Desk card for that action back to the agent:
 * they leave the Desk and show up in the journal as handled on its own.
 */
export function setAutonomy(s: State, agent: AgentId, action: string, level: Autonomy, why = 'You switched this action to Act'): State {
  const a = agentOf(s, agent)
  const act = a.actions.find(x => x.id === action)
  if (!act || (act.locked && level !== 'suggest')) return s
  let next: State = {
    ...s,
    agents: s.agents.map(ag => ag.id !== agent ? ag : { ...ag, actions: ag.actions.map(x => x.id === action ? { ...x, autonomy: level, trialUntil: undefined, trialFrom: undefined } : x) }),
  }
  if (level !== 'act') return next
  const taken = s.handoffs.filter(h => h.action === action && h.kind !== 'promotion' && !h.lane)
  for (const h of taken) next = pushLog(removeHandoff(next, h.id), { agent: h.agent, text: `Handled on ${pronoun(agent)} own: ${h.title}`, reason: why, status: 'done', undoMinutes: 30, link: h.link })
  if (taken.length) next = pushToast(next, { agent, text: `${taken.length} card${taken.length > 1 ? 's' : ''} left your Desk. ${a.name} handles ${taken.length > 1 ? 'them' : 'it'} now.` })
  return next
}

export function addRule(s: State, rule: Omit<PlaybookRule, 'id' | 'addedAt' | 'uses'>): State {
  const r: PlaybookRule = { ...rule, id: uid('r'), addedAt: now(s), uses: 0 }
  return { ...s, playbook: { ...s.playbook, rules: [r, ...s.playbook.rules] } }
}

export const pronoun = (agent: AgentId) => (agent === 'nova' || agent === 'iris' || agent === 'echo' ? 'her' : 'its')
