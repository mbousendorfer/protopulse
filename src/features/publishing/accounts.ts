// Social profiles: one main Fernway account per network, plus Fernway Repair on Instagram. A post without `account` is on the main one.
import type { Network } from '../../app/types'
import { NETWORK_LABEL } from '../../data/agents'
import { PUBLISH_NETWORKS, type Post } from '../../data/publishing'

export type Account = { id: string; network: Network; name: string; handle: string; main?: true }
const HANDLE: Partial<Record<Network, string>> = { instagram: '@fernway', tiktok: '@fernway', youtube: '@fernway', x: '@fernway', linkedin: 'Fernway', facebook: 'Fernway' }

/** Main accounts use the network as their id, so posts written before profiles existed stay where they were. */
export const ACCOUNTS: Account[] = PUBLISH_NETWORKS.flatMap((n): Account[] => [
  { id: n, network: n, name: 'Fernway', handle: HANDLE[n] ?? 'Fernway', main: true },
  ...(n === 'instagram' ? [{ id: 'ig-repair', network: n, name: 'Fernway Repair', handle: '@fernway.repair' }] : []),
])
export const GROUPS: { id: string; name: string; accounts: string[] }[] = [
  { id: 'g-brand', name: 'Fernway, every network', accounts: PUBLISH_NETWORKS },
  { id: 'g-repair', name: 'Repair', accounts: ['ig-repair', 'linkedin'] },
]

export const accountById = (id: string) => ACCOUNTS.find(a => a.id === id) ?? ACCOUNTS[0]
export const accountOf = (p: Pick<Post, 'account' | 'network'>) => accountById(p.account ?? p.network)
export const accountLabel = (a: Account) => (a.main ? NETWORK_LABEL[a.network] : `${NETWORK_LABEL[a.network]} · ${a.name}`)

/** Where Atlas puts a post: repair content on Instagram goes to Fernway Repair. */
export function routeAccount(p: Pick<Post, 'network' | 'pillar' | 'account'>): string | undefined {
  if (p.account) return p.account
  if (p.network === 'instagram' && p.pillar === 'Repair & care') return 'ig-repair'
}
export const ROUTE_REASON = 'Repair content on Instagram goes to Fernway Repair.'
