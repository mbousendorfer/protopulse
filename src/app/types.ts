// Shared domain types. Feature-specific types live next to their feature.
import type { Pillar } from '../data/publishing'

export type AgentId = 'nova' | 'atlas' | 'iris' | 'echo' | 'sage' | 'juno'
export type Autonomy = 'suggest' | 'draft' | 'act'
export type Risk = 'safe' | 'risky' | 'destructive'
export type Network = 'instagram' | 'tiktok' | 'linkedin' | 'facebook' | 'youtube' | 'x' | 'google' | 'trustpilot'

export type AgentAction = {
  id: string
  label: string
  risk: Risk
  autonomy: Autonomy
  locked?: boolean
  lockReason?: string
  /** Typical volume a week, and one concrete case: shows what a level produces. */
  perWeek?: number
  example?: string
  /** One sentence per level, shown under the control. */
  says: Record<Autonomy, string>
  /** 30-day track record for this action. */
  approvedUnchanged?: number
  reviewed?: number
  /** Set when the user picked "Try for a week": the level reverts to `trialFrom` at this app time. */
  trialUntil?: number
  trialFrom?: Autonomy
}

export type Agent = {
  id: AgentId
  name: string
  /** What the weekly volume counts, e.g. 'messages'. */
  unit: string
  dept: string
  route: string
  role: string
  status: 'on' | 'paused' | 'off'
  pausedUntil?: string
  shift: string
  now: string
  actions: AgentAction[]
  guardrails: { id: string; label: string; value: string }[]
  record: { handled: number; escalated: number; approvedUnchanged: number; undone: number; series: number[] }
}

export type Kind = 'approval' | 'decision' | 'info' | 'alert' | 'promotion' | 'news'
export type Group = 'need' | 'look' | 'good'
export type Urgency = 'urgent' | 'today' | 'week'
export type Lane = Urgency | 'claire' | 'snoozed'

/** A span of text, optionally flagged as uncertain by the agent. */
export type Flagged = string | { text: string; note: string }

/**
 * Desk preview shapes, by type. An agent adds its own from its registry module, without touching this file:
 * `declare module '../../app/types' { interface PreviewTypes { clip: { clip: string } } }`, plus a renderer in `previews`.
 */
export interface PreviewTypes {
  reply: { network: Network; author: string; text: string; draft: Flagged[]; attachments?: string[] }
  post: { network: Network; slot: string; text: Flagged[]; media?: string }
  metric: { label: string; value: string; delta: string; down?: boolean; series: number[] }
  plan: { title: string; lines: string[] }
  evidence: { lines: string[] }
  text: { label: string; body: string }
}
export type Preview = { [K in keyof PreviewTypes]: { type: K } & PreviewTypes[K] }[keyof PreviewTypes]
export type PreviewOf<K extends Preview['type']> = Extract<Preview, { type: K }>

export type ThreadMsg = { id: string; from: 'agent' | 'you' | 'claire'; text: string; at: number; rule?: string; ruleAdded?: boolean }

/** An interface so an agent can add its own optional fields from its module (declaration merging), like `LogEntry`. */
export interface Handoff {
  id: string
  agent: AgentId
  kind: Kind
  urgency: Urgency
  topic: string
  title: string
  context: string
  why: string
  confidence: number
  at: number
  action?: string
  chain?: AgentId[]
  rules?: string[]
  preview?: Preview
  options?: { label: string; recommended?: boolean }[]
  field?: { label: string; placeholder: string }
  link?: string
  /** promotion requests target an action and a level */
  promote?: { action: string; to: Autonomy; from: Autonomy }
  /** Lifecycle */
  lane?: 'claire' | 'snoozed'
  snoozedUntil?: number
  claire?: { askedAt: number; dueAt: number; reply?: string; verdict?: 'approve' | 'changes' | 'decline' }
  thread?: ThreadMsg[]
  fresh?: boolean
  /** Opaque reference to the object in its feature (conversation id, post id…). */
  ref?: string
  /** Playbook rule proposed by the agent, added when approved. */
  proposal?: { text: string; agents: AgentId[] }
  /** Free text the user typed in an info card or edited draft. */
  answer?: string
  /** Desk group; derived from kind/topic when absent. */
  group?: Group
  /** Where the agent took its facts from, shown as chips under the draft. */
  sources?: { label: string; from: string }[]
  /** Good news: the one useful thing to do with it. */
  cta?: { label: string; to?: string }
  /** A post card's pillar and campaign, kept when the approved post lands in the calendar. */
  pillar?: Pillar
  campaign?: string
  campaignId?: string
}

export type RuleKind = 'do' | 'dont' | 'word' | 'fact' | 'escalate'
export type PlaybookRule = {
  id: string
  kind: RuleKind
  text: string
  agents: AgentId[]
  origin: string
  uses: number
  paused?: boolean
  addedAt: number
}

export type LogStatus = 'done' | 'approved' | 'edited' | 'rejected' | 'undone' | 'redone' | 'dismissed'

export interface LogEntry {
  id: string
  agent: AgentId
  at: number
  text: string
  reason?: string
  rule?: string
  status: LogStatus
  /** App time until which the entry can be undone. */
  undoUntil?: number
  link?: string
  detail?: { before?: string; after?: string }
  /** Cards to bring back when this entry is undone (bulk decisions). */
  restore?: Handoff[]
}

/** A Desk card the user settled this session. */
export type DoneItem = { id: string; title: string; text: string; at: number; ms?: number; h: Handoff }

/** Where your own action's confirmation shows: the top of the list it acted on. */
export type NoticeScope = 'desk' | 'publishing' | 'listening' | 'agents' | 'video' | 'strategy'
/** The one confirmation of your last action. `undo` is a journal entry id; it lasts while that entry can be undone. */
export type Notice = { scope: NoticeScope; text: string; undo?: string; link?: { to: string; label: string }; until: number }

export type TesterEvent = { t: number; app: number; kind: string; detail?: Record<string, unknown> }

/** How the user settled a Desk card. */
export type Decision = (
  | { kind: 'approve'; edited?: string }
  | { kind: 'reject'; reason?: string }
  | { kind: 'option'; option: string; index: number }
  | { kind: 'answer'; text: string }
  | { kind: 'trial' }
) & {
  /** Set when the agent settled the card alone, on Act (see `resolve`): the same decision, not taken by Sam. */
  act?: true
}
