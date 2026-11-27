import type { AgentId, Handoff } from '../app/types'
import type { State } from '../app/state'

/**
 * Scripted events the agents produce while the demo runs.
 * - If `always` is false and the agent's action is set to Act, the event becomes a journal entry (`auto`) instead of a Desk card.
 * - `rule` events carry a Playbook rule proposal, added when approved.
 * - `run` events do their own thing instead of raising a card: Atlas ideas, Juno videos (see `ideaScript`, `videoScript`).
 * Each agent declares its events in its registry module (`src/features/<folder>/script.ts`).
 */
export type ScriptEvent = {
  id: string
  /** Place in the shared feed, across agents: lower plays first. Existing events use multiples of 10; slot new ones in between. */
  order: number
  label: string
  always?: boolean
  /** Needs a history the workspace doesn't have on Day 1 (a track record, learned edits, a live campaign): skipped there. */
  history?: boolean
  /** Who raises it (shown in the moderator panel). */
  agent?: AgentId
  /** Custom event: runs instead of raising `handoff`. `manual` is true when the moderator triggers it. */
  run?: (s: State, manual: boolean) => State
  /** Short tag shown in the moderator panel, e.g. 'video'. */
  tag?: string
  handoff?: Omit<Handoff, 'id' | 'at'>
  auto?: { text: string; reason: string; link?: string }
  rule?: { text: string; agents: Handoff['agent'][] }
}

// The events themselves live with each agent; `scriptEvents()` in app/agents-registry.ts plays them in order.

/** Claire's scripted replies, chosen by topic. */
export const CLAIRE: Record<string, { verdict: 'approve' | 'changes' | 'decline'; text: string }[]> = {
  Press: [{ verdict: 'approve', text: 'Thanks, I’ll call Marc myself. Send the holding reply now.' }],
  Creator: [{ verdict: 'decline', text: 'Not this quarter. Offer gear and a shoutout instead.' }],
  'Weekly report': [{ verdict: 'approve', text: 'Clear, thanks. Can we talk about the TikTok dip on Thursday?' }],
  'Negative spike': [{ verdict: 'changes', text: 'Statement is fine, but remove the warranty mention until product confirms.' }],
  Safety: [{ verdict: 'approve', text: 'Call him today please, and log it for the product team.' }],
  Competitor: [{ verdict: 'decline', text: 'We don’t react to their prices. Let’s talk about durability on Thursday instead.' }],
  Campaign: [{ verdict: 'approve', text: 'Go for 360. Nice work.' }],
  default: [
    { verdict: 'approve', text: 'Go. Keep it short.' },
    { verdict: 'changes', text: 'Remove the price, legal hasn’t confirmed it yet.' },
    { verdict: 'decline', text: 'Not now, we’ll cover it in Thursday’s newsletter.' },
  ],
}
