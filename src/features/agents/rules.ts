import type { AgentId, Handoff, PlaybookRule } from '../../app/types'

/** Everything in the Playbook one agent applies: do / don't rules, then facts. Paused ones stay, so they can be resumed. */
export function rulesFor(rules: PlaybookRule[], agent: AgentId) {
  const mine = rules.filter(r => r.agents.includes(agent))
  return { rules: mine.filter(r => r.kind === 'do' || r.kind === 'dont'), facts: mine.filter(r => r.kind === 'fact') }
}

/** Rule proposals still open (not snoozed, not with Claire) that would apply to this agent or that it raised. */
export const proposalsFor = (handoffs: Handoff[], agent: AgentId) =>
  handoffs.filter(h => h.proposal && !h.lane && (h.agent === agent || h.proposal.agents.includes(agent)))

/** Who a rule applies to, in Shared rules, where no agent is the point of view. */
export function appliesTo(agents: AgentId[], team: AgentId[], name: (a: AgentId) => string) {
  if (team.every(a => agents.includes(a))) return 'All agents'
  return agents.length === 1 ? `${name(agents[0])} only` : agents.map(name).join(' and ')
}

/** Where an old /playbook address lands now. `search` is the query string, with or without "?". */
export function playbookTarget(search: string) {
  const tab = new URLSearchParams(search).get('tab')
  if (tab === 'escalation') return '/agents/escalation'
  if (tab === 'pillars') return '/strategy/pillars'
  if (tab === 'words' || tab === 'facts' || tab === 'voice') return `/agents/rules?section=${tab}`
  return '/agents/rules'
}

/** Old profile tabs land on the tab that holds them now. `rules` goes to Shared rules, filtered on the agent. */
export function profileTab(tab: string | null): string {
  if (!tab || ['overview', 'autonomy', 'guardrails', 'escalation'].includes(tab)) return 'how'
  if (tab === 'activity') return 'record'
  return tab
}
