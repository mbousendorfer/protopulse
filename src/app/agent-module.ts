// The shape of an agent's registry module (`src/features/<folder>/agent.tsx`). The list lives in agents-registry.ts.
// This file only imports types, so agent modules can use it while the registry is still loading.
import type { ReactNode } from 'react'
import type { Preset, State } from './state'
import type { Action } from './reducer'
import type { AgentId, Decision, Handoff, LogEntry, Preview, PreviewOf, TesterEvent, Urgency } from './types'
import type { ScriptEvent } from '../data/script'
import type { Intent } from '../data/command'
import type { Chat, ChatMsg } from '../features/chats/slice'
import type { Route } from '../features/chats/respond'

/* ---------- ⌘K and Chat ---------- */

export type IntentKind = Intent['kind']
export type IntentOf<K extends IntentKind> = Extract<Intent, { kind: K }>
export type ParseCtx = { raw: string; forced?: AgentId; named?: AgentId }
/** What ⌘K shows: the streamed text, then the visual, the sources and the buttons. `after` runs once the text is out. */
export type BarAnswer = { text: string; visual?: ReactNode; sources?: string[]; ctas?: { label: string; icon?: ReactNode; primary?: boolean; run: () => void }[]; after?: () => void }
export type BarCtx = { s: State; d: (a: Action) => void; go: (to: string) => void; query: string; ask: (q: string) => void }
/** What Chat shows: one or more agents answer in turn; `effects` run once, when the message is sent. */
export type ChatAnswer = { replies: Omit<ChatMsg, 'id' | 'at'>[]; effects: ((s: State) => State)[] }
export type ChatCtx = { s: State; chat: Chat; route: Route }

/**
 * One ⌘K / Chat intent. Its shape is declared by augmenting `IntentTypes` in `src/data/command.ts`.
 * Parsers run by ascending `order` and the first match wins. Core ones: pause 10, resume 20, rule 30, needs 70, overnight 80.
 */
export type IntentDef<K extends IntentKind = IntentKind> = {
  kind: K
  owner: AgentId
  order: number
  /** `t` is the lowercased query, without the leading agent name and the final punctuation. */
  parse: (t: string, ctx: ParseCtx) => IntentOf<K> | undefined
  bar: (i: IntentOf<K>, ctx: BarCtx) => BarAnswer
  chat: (i: IntentOf<K>, ctx: ChatCtx) => ChatAnswer
}
export function defineIntent<K extends IntentKind>(d: IntentDef<K>) { return d as unknown as IntentDef }

/* ---------- Desk ---------- */

/** Similar cards approved in one go. Only groups of 2 or more become a batch. */
export type BatchDef = {
  id: string
  agent: AgentId
  match: (h: Handoff) => boolean
  ready: (h: Handoff) => boolean
  title: (n: number) => string
  meta: (xs: Handoff[], ready: number) => string
  verb: { many: (n: number) => string; done: (n: number) => string }
}
export type Batch = Omit<BatchDef, 'match' | 'ready' | 'title' | 'meta'> & { title: string; meta: string; items: Handoff[]; ready: Handoff[]; urgency: Urgency }

/* ---------- The module ---------- */

export type AgentModule = {
  id: AgentId
  /** Scripted events, played in `order` across all agents (see ScriptEvent). Custom events carry their own `run`. */
  script?: ScriptEvent[]
  /** A Desk card was settled: by Sam, Claire, a bulk action or Act. Called for every card, whoever raised it. */
  onResolve?: (s: State, h: Handoff, d: Decision) => State
  /** A journal entry was undone. `entry.restore` holds the cards it brings back to the Desk. */
  onUndo?: (s: State, entry: LogEntry) => State
  /** Heartbeat. `due` is checked every second and must be cheap; `tick` runs when any module or the core is due. */
  due?: (s: State, t: number) => boolean
  tick?: (s: State, t: number) => State
  intents?: IntentDef[]
  /** Desk renderers for the preview types this agent adds (see PreviewTypes). */
  previews?: { [K in Preview['type']]?: (p: PreviewOf<K>, h: Handoff) => ReactNode }
  batches?: BatchDef[]
  /** Extra tabs on the agent's profile, between Escalation and Track record. */
  profileTabs?: { id: string; label: string; count?: (s: State) => number; render: () => ReactNode }[]
  /** Lines of the moderator's tester log. */
  testerStats?: (ev: TesterEvent[]) => [string, number | string][]
  /** Moderator scenarios: Desk cards kept (by id) and script events fired (by id), on top of the others' choices. */
  presets?: Partial<Record<Preset, { keep?: string[]; fire?: string[] }>>
}
