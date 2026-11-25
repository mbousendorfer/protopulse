import type { AgentId, Network } from '../app/types'
import { intentDef, intentDefs } from '../app/agents-registry'
import type { IntentDef } from '../app/agent-module'

/**
 * What the command bar understood. Mocked: keyword intents, no model behind it.
 * The core owns these; each agent adds its own from its registry module:
 * `declare module '../../data/command' { interface IntentTypes { post: { network: Network; topic: string; slot: string } } }`.
 */
export interface IntentTypes {
  pause: { agent: AgentId; until?: string }
  resume: { agent: AgentId }
  rule: { rule: string; agent: AgentId }
  needs: object
  overnight: { agent: AgentId }
  unknown: object
}
export type Intent = { [K in keyof IntentTypes]: { kind: K } & IntentTypes[K] }[keyof IntentTypes]

const CORE_OWNER: Partial<Record<Intent['kind'], AgentId>> = { pause: 'sage', resume: 'sage', rule: 'nova', needs: 'iris', overnight: 'iris', unknown: 'iris' }

/** The agent whose job an intent is. */
export const ownerOf = (kind: Intent['kind']): AgentId => CORE_OWNER[kind] ?? intentDef(kind)?.owner ?? 'iris'

const NAMES: AgentId[] = ['nova', 'atlas', 'iris', 'echo', 'sage', 'juno']
const NETS: [RegExp, Network][] = [[/linkedin/, 'linkedin'], [/tiktok/, 'tiktok'], [/instagram|insta\b|\big\b|reel|carousel/, 'instagram'], [/facebook|\bfb\b/, 'facebook'], [/youtube|short\b/, 'youtube'], [/\bx\b|twitter|tweet/, 'x']]

/** The network a query names, if any. */
export const net = (t: string): Network | undefined => NETS.find(([re]) => re.test(t))?.[1]

/** The core's own parsers, mixed with the agents' by order. */
const CORE: Pick<IntentDef, 'order' | 'parse'>[] = [
  { order: 10, parse: t => {
    if (!/^(pause|stop)\s+(nova|atlas|iris|echo|sage|juno)/.test(t)) return
    const m = t.match(/^(?:pause|stop)\s+(\w+)(?:\s+(?:until|till)\s+(.+))?/)!
    return { kind: 'pause', agent: m[1] as AgentId, until: m[2] }
  } },
  { order: 20, parse: t => /^(resume|restart|unpause|wake)\s+(nova|atlas|iris|echo|sage|juno)/.test(t) ? { kind: 'resume', agent: t.split(/\s+/)[1] as AgentId } : undefined },
  { order: 30, parse: (t, { forced, named }) => {
    const never = t.match(/^(?:please\s+)?(never|don['’]?t|do not|stop|no more)\s+(.+)/)
    if (!never) return
    const body = never[2].replace(/\byou\b/g, 'we')
    return { kind: 'rule', rule: `Never ${body.replace(/^(ever\s+)/, '')}`, agent: forced ?? named ?? (/post|caption|publish|hashtag/.test(body) ? 'atlas' : 'nova') }
  } },
  { order: 70, parse: t => /what needs me|needs me|on my desk|what('?s| is) waiting/.test(t) ? { kind: 'needs' } : undefined },
  { order: 80, parse: t => {
    if (!/(did|has)\s+(nova|atlas|iris|echo|sage|juno)\s+(do|done)|overnight|while i was/.test(t)) return
    return { kind: 'overnight', agent: (t.match(/\b(nova|atlas|iris|echo|sage|juno)\b/)?.[1] ?? 'nova') as AgentId }
  } },
]

export function parse(raw: string): { intent: Intent; forced?: AgentId } {
  let t = raw.toLowerCase().trim().replace(/[?!.]+$/, '')
  const lead = t.match(/^(nova|atlas|iris|echo|sage|juno)\b[,:]?\s*/)
  const forced = lead ? (lead[1] as AgentId) : undefined
  if (lead) t = t.slice(lead[0].length)
  const named = NAMES.find(n => new RegExp(`\\b${n}\\b`).test(t))
  const ctx = { raw, forced, named }
  for (const def of [...CORE, ...intentDefs()].sort((a, b) => a.order - b.order)) {
    const intent = def.parse(t, ctx)
    if (intent) return { intent, forced }
  }
  return { intent: { kind: 'unknown' }, forced }
}

/** Examples shown when the command bar opens. */
export const EXAMPLES = [
  'Atlas, a post about the weekend sale on Friday',
  'Write a LinkedIn post about our repair programme',
  'How did TikTok do last week?',
  'Best time to post on Instagram?',
  'What is Peakline up to?',
  'Pause Atlas until Monday',
  'Nova, never offer codes on complaints',
  'Brief: launch the Storm Jacket in March, 300 pre-orders',
  'What needs me today?',
  'What did Nova do overnight?',
  'Reply to Léa',
  'Show me negative mentions this week',
  'Juno, clip the latest video',
]
