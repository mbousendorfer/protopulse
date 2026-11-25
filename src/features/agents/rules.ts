import type { AgentId, Handoff, PlaybookRule } from '../../app/types'

/** Who else a rule applies to, seen from one agent. */
export type Scope = { kind: 'all' } | { kind: 'only' } | { kind: 'some'; others: AgentId[] }
export type ScopedRule = { rule: PlaybookRule; scope: Scope }

export function scopeOf(r: PlaybookRule, agent: AgentId, team: AgentId[]): Scope {
  if (team.every(a => r.agents.includes(a))) return { kind: 'all' }
  const others = r.agents.filter(a => a !== agent)
  return others.length ? { kind: 'some', others } : { kind: 'only' }
}

/** Everything in the Playbook one agent applies: do / don't rules, then facts, each with its scope. Paused ones stay, so they can be resumed. */
export function rulesFor(rules: PlaybookRule[], agent: AgentId, team: AgentId[]) {
  const mine = rules.filter(r => r.agents.includes(agent)).map(rule => ({ rule, scope: scopeOf(rule, agent, team) }))
  return { rules: mine.filter(x => x.rule.kind === 'do' || x.rule.kind === 'dont'), facts: mine.filter(x => x.rule.kind === 'fact') }
}

/** Rule proposals still open (not snoozed, not with Claire) that would apply to this agent or that it raised. */
export const proposalsFor = (handoffs: Handoff[], agent: AgentId) =>
  handoffs.filter(h => h.proposal && !h.lane && (h.agent === agent || h.proposal.agents.includes(agent)))

export function scopeLabel(s: Scope, agentName: string, name: (a: AgentId) => string) {
  if (s.kind === 'all') return 'Shared · all agents'
  if (s.kind === 'only') return `${agentName} only`
  return `Shared with ${s.others.map(name).join(' and ')}`
}
