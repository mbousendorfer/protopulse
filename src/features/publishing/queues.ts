// Queues: recurring slots for one kind of content. Atlas keeps the next two weeks filled.
import type { State } from '../../app/state'
import { actionOf, agentOf, now, pushHandoff, pushLog, uid } from '../../app/core'
import { DAY, hhmm } from '../../app/time'
import type { Post, Queue } from '../../data/publishing'
import { withFormat } from './formats'

const MIN = 60_000
const monday = (t: number) => { const d = new Date(t); const dow = (d.getDay() + 6) % 7; return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow).getTime() }

/** Every slot of a queue between `from` and `to`. */
export function occurrences(q: Queue, from: number, to: number): number[] {
  const out: number[] = []
  for (let w = monday(from); w < to; w += 7 * DAY) {
    for (const sl of q.slots) {
      const [h, m] = sl.time.split(':').map(Number)
      const at = new Date(w + sl.weekday * DAY).setHours(h, m, 0, 0)
      if (at > from && at <= to) out.push(at)
    }
  }
  return out.sort((a, b) => a - b)
}

/** The post already in a slot: same queue, within 5 minutes. */
export const inSlot = (posts: Post[], q: Queue, at: number) => posts.find(p => p.queue === q.id && Math.abs(p.at - at) < 5 * MIN && p.status !== 'failed')

export type Slot = { at: number; post?: Post }
export const upcoming = (s: State, q: Queue, days = 14): Slot[] =>
  occurrences(q, now(s), now(s) + days * DAY).map(at => ({ at, post: inSlot(s.publishing.posts, q, at) }))

/** Copy Atlas hasn't used in this queue yet; it starts over when all of it has run. */
function nextCopy(q: Queue, posts: Post[], taken: string[]) {
  const used = new Set([...posts.filter(p => p.queue === q.id).map(p => p.text), ...taken])
  return q.copy.find(c => !used.has(c)) ?? q.copy[taken.length % q.copy.length]
}

const when = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}, ${hhmm(t)}`

/**
 * Atlas fills the empty slots of one queue (or all) up to `days` ahead.
 * Act: scheduled, one journal line with Undo. Draft and Suggest: posts To review on the Desk, one card each (they batch).
 */
export function fillQueues(s: State, opts: { queue?: string; days?: number; from?: number; why: string } ): State {
  const queues = s.publishing.queues.filter(q => !opts.queue || q.id === opts.queue)
  const level = actionOf(s, 'atlas', 'atlas-fill')?.autonomy ?? 'draft'
  const from = opts.from ?? now(s)
  let next = s
  const made: Post[] = []
  for (const q of queues) {
    const taken: string[] = []
    for (const at of occurrences(q, from, from + (opts.days ?? 14) * DAY)) {
      if (at <= now(s) || inSlot(next.publishing.posts, q, at)) continue
      const text = nextCopy(q, next.publishing.posts, taken)
      taken.push(text)
      const post = withFormat({ id: uid('p'), network: q.network, at, text, media: q.media, pillar: q.pillar, author: 'atlas', queue: q.id, labels: [q.name], status: level === 'act' ? 'scheduled' : 'needs', note: `${q.name} queue` })
      made.push(post)
      next = { ...next, publishing: { ...next.publishing, posts: [...next.publishing.posts, post] } }
      if (level !== 'act') {
        next = pushHandoff(next, {
          agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Queue', action: 'atlas-fill', ref: post.id, link: `/publishing/queues`,
          title: `${q.name}: ${when(at)}`, context: `Atlas filled the ${q.name} slot from the queue’s ${q.pillar} tips.`,
          why: `${opts.why} Filling empty slots is set to ${level === 'suggest' ? 'Suggest' : 'Draft'}.`, confidence: 84,
          preview: { type: 'post', network: q.network, slot: when(at), text: [text], media: q.media },
        })
      }
    }
  }
  if (!made.length) return next
  const n = made.length
  return pushLog(next, {
    agent: 'atlas', status: 'done', link: '/publishing/queues', reason: opts.why,
    text: level === 'act' ? `Filled ${n} queue slot${n > 1 ? 's' : ''} and scheduled ${n > 1 ? 'them' : 'it'}` : `Drafted ${n} post${n > 1 ? 's' : ''} for the queues; ${n > 1 ? 'they are' : 'it is'} on your Desk`,
    ...(level === 'act' ? { undoMinutes: 30, queuePosts: made.map(p => p.id) } : {}),
  })
}

/** Undo of a fill done on Act: the posts leave. */
export const unfill = (s: State, ids: string[]): State => ({ ...s, publishing: { ...s.publishing, posts: s.publishing.posts.filter(p => !ids.includes(p.id)) } })

export const canFill = (s: State, manual: boolean) => manual || agentOf(s, 'atlas').status === 'on'
