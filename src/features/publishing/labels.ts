// Labels on posts (set by Atlas, edited by Sam) and the calendar's filters.
import type { State } from '../../app/state'
import type { Post, PostStatus } from '../../data/publishing'

/** Every label in use, plus campaign and queue names Atlas would use: the workspace's label list. */
export const knownLabels = (s: State): string[] =>
  [...new Set([...s.publishing.posts.flatMap(p => p.labels ?? []), ...s.publishing.queues.map(q => q.name), ...s.strategy.campaigns.map(c => c.name)])].sort((a, b) => a.localeCompare(b))

/** Atlas labels what it writes: its campaign, its queue. */
export const withLabels = (p: Post, queueName?: string): Post => {
  const labels = [...new Set([...(p.labels ?? []), ...(p.campaign ? [p.campaign] : []), ...(queueName ? [queueName] : [])])]
  return labels.length ? { ...p, labels } : p
}

export const editLabels = (p: Post, add: string[] = [], remove: string[] = []): Post =>
  ({ ...p, labels: [...new Set([...(p.labels ?? []), ...add.map(x => x.trim()).filter(Boolean)])].filter(l => !remove.includes(l)) })

/* ---------- Calendar filters ---------- */

export const NO_LABEL = '__none'
export type Facet = 'status' | 'label' | 'campaign' | 'pillar' | 'author' | 'account'
export type CalFilters = Partial<Record<Facet, string[]>>
export const STATUS_LABEL: Record<PostStatus, string> = { scheduled: 'Scheduled', published: 'Published', draft: 'Draft', needs: 'Needs you', failed: 'Failed', paused: 'Paused', unapproved: 'To approve' }

const value = (p: Post, f: Facet): string[] =>
  f === 'status' ? [p.status] : f === 'label' ? (p.labels?.length ? p.labels : [NO_LABEL]) : f === 'campaign' ? [p.campaign ?? ''] : f === 'pillar' ? [p.pillar] : f === 'account' ? [p.account ?? p.network] : [p.author]

/** A post passes when, for every facet with choices, one of its values is chosen. */
export const passes = (p: Post, f: CalFilters) => (Object.keys(f) as Facet[]).every(k => !f[k]?.length || value(p, k).some(v => f[k]!.includes(v)))
export const activeCount = (f: CalFilters) => Object.values(f).reduce((n, xs) => n + (xs?.length ?? 0), 0)
