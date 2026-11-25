// Everything an agent plugs into the core, one module per agent. The core (reducer, store, ⌘K, Chat, Desk,
// profile, moderator) loops over the registry instead of calling each agent by name: to add a capability, an agent
// session edits only its own module, `src/features/<folder>/agent.tsx` (shape in agent-module.ts), and what it imports.
import type { AgentModule } from './agent-module'
import type { ScriptEvent } from '../data/script'
import inbox from '../features/inbox/agent'
import publishing from '../features/publishing/agent'
import insights from '../features/insights/agent'
import listening from '../features/listening/agent'
import strategy from '../features/strategy/agent'
import video from '../features/video/agent'

/**
 * Read at call time, never stored at load time: agent modules import UI that imports the store, which imports this
 * file, so it can still be loading when they run. Order matters where hooks chain (onResolve, tick): the app's agent order.
 */
export const registry = (): AgentModule[] => [inbox, publishing, insights, listening, strategy, video]

export const intentDefs = () => registry().flatMap(m => m.intents ?? [])
export const intentDef = (kind: string) => intentDefs().find(x => x.kind === kind)

let script: ScriptEvent[] | undefined
/** Every agent's events, in play order (`order`; ties keep the registry's agent order). */
export const scriptEvents = () => (script ??= registry().flatMap(m => m.script ?? []).sort((x, y) => x.order - y.order))
