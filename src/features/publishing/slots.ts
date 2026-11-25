// Better slots: a scheduled post sits far from its network's best hour, the same day still has that hour free.
import type { State } from '../../app/state'
import type { Handoff } from '../../app/types'
import { actionOf, agentOf, now, pushHandoff, uid } from '../../app/core'
import { hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { BEST_SLOT, type Post } from '../../data/publishing'

const HOUR = 3_600_000
export type SlotMove = { post: Post; at: number; reason: string }

/** The same-day move Atlas would make for a post, or nothing: more than an hour off, the new time still ahead, no same-network post within an hour. */
export function betterSlot(p: Post, posts: Post[], t: number): SlotMove | undefined {
  const best = BEST_SLOT[p.network]
  if (!best || p.status !== 'scheduled' || p.at <= t) return
  const [h, m] = best.time.split(':').map(Number)
  const d = new Date(p.at)
  const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime()
  if (Math.abs(at - p.at) <= HOUR || at <= t) return
  if (posts.some(o => o.id !== p.id && o.network === p.network && Math.abs(o.at - at) < HOUR)) return
  return { post: p, at, reason: best.reason }
}

/** Posts Atlas would move, soonest first, minus those already on the Desk. */
export const betterSlots = (s: State): SlotMove[] =>
  s.publishing.posts.slice().sort((a, b) => a.at - b.at)
    .filter(p => !s.handoffs.some(h => h.topic === 'Better slot' && h.ref === p.id))
    .flatMap(p => betterSlot(p, s.publishing.posts, now(s)) ?? [])

const dayName = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'long' })
const short = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}, ${hhmm(t)}`

/** The card for one move. On Suggest it waits in Worth a look; on Draft and Act it is a change ready to approve. */
export function slotCard(s: State, m: SlotMove): State {
  const act = actionOf(s, 'atlas', 'atlas-slot')
  const level = act?.autonomy === 'suggest' ? 'Suggest' : act?.autonomy === 'act' ? 'Act' : 'Draft'
  const card: Omit<Handoff, 'at'> = {
    id: uid('h'), agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Better slot', action: 'atlas-slot', ref: m.post.id,
    group: level === 'Suggest' ? 'look' : undefined,
    title: `Move ${dayName(m.post.at)}’s ${NETWORK_LABEL[m.post.network]} post from ${hhmm(m.post.at)} to ${hhmm(m.at)}`,
    context: m.post.text, why: `${m.reason} ${act?.label ?? 'Moving posts'} is set to ${level}.`, confidence: 88,
    link: `/publishing/calendar?post=${m.post.id}`,
    sources: [{ label: `Best ${NETWORK_LABEL[m.post.network]} slot on your account: ${hhmm(m.at)}`, from: 'Insights' }],
    preview: { type: 'post', network: m.post.network, slot: short(m.at), text: [m.post.text], media: m.post.media },
  }
  return pushHandoff(s, card)
}

export const movesAlone = (s: State) => agentOf(s, 'atlas').status === 'on' && actionOf(s, 'atlas', 'atlas-slot')?.autonomy === 'act'
