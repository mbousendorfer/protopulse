import type { State } from '../../app/state'
import type { Agent, AgentId, Handoff } from '../../app/types'
import { groupOf } from '../../app/reducer'
import { inboxNeedsCount } from '../inbox/slice'
import { proposalsFor } from './rules'
import { registry } from '../../app/agents-registry'

/** Open = not snoozed, not with Claire. */
const open = (h: Handoff) => !h.lane

/** Requests to move an action up (or back down): decided on Agents › Team and on the agent's profile. */
export const autonomyRequests = (handoffs: Handoff[], agent?: AgentId) =>
  handoffs.filter(h => open(h) && h.kind === 'promotion' && !!h.promote && (!agent || h.agent === agent))

/** Rule proposals that apply to the agent or that it raised (all of them without an agent). */
export const ruleProposals = (handoffs: Handoff[], agent?: AgentId) =>
  agent ? proposalsFor(handoffs, agent) : handoffs.filter(h => open(h) && !!h.proposal)

/**
 * What waits in the agent's department: the exact number its rail entry shows.
 * Nova's counts Inbox conversations; a module with `needs` (its landing's decisions block) counts that; the others
 * count their Desk cards in Needs you.
 */
export const departmentNeeds = (s: State, agent: AgentId) =>
  agent === 'nova' ? inboxNeedsCount(s) : registry().find(m => m.id === agent)?.needs?.(s) ?? s.handoffs.filter(h => open(h) && groupOf(h) === 'need' && h.agent === agent).length

/** The Agents rail badge: what is decided on Agents itself. Department items already badge their own rail entry. */
export const agentsNeedsCount = (s: State) => autonomyRequests(s.handoffs).length + ruleProposals(s.handoffs).length

/** Trust, in words: “92% approved unchanged”, then volume and undos. */
export function trustOf(a: Agent) {
  const r = a.record
  if (!r.handled) return { head: 'No track record yet', sub: 'Starts with its first action' }
  return {
    head: `${r.approvedUnchanged}% approved unchanged`,
    sub: `${r.handled.toLocaleString('en-GB')} handled alone · ${r.undone ? `${r.undone} undone` : 'nothing undone'}`,
  }
}
