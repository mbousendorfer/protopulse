// Atlas's guardrails, applied: 3 posts per network per day, and no publishing during a critical alert.
import type { State } from '../../app/state'
import type { Handoff } from '../../app/types'
import { now, pushHandoff, pushLog, removeHandoff, uid } from '../../app/core'
import { DAY, hhmm } from '../../app/time'
import { NETWORK_LABEL, agentName } from '../../data/agents'
import type { Post } from '../../data/publishing'

/* ---------- 3 posts per network per day ---------- */

export const CAP = 3
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString()
/** Posts that take a place that day: drafts and failed ones don't. */
const counts = (p: Post) => p.status !== 'draft' && p.status !== 'failed'

/** Per profile: Fernway Repair has its own three. */
export const postsThatDay = (posts: Post[], p: Pick<Post, 'network' | 'at'> & { id?: string; account?: string }) =>
  posts.filter(o => o.id !== p.id && (o.account ?? o.network) === (p.account ?? p.network) && counts(o) && sameDay(o.at, p.at)).length

export const overCap = (posts: Post[], p: Pick<Post, 'network' | 'at'> & { id?: string; account?: string }) => postsThatDay(posts, p) >= CAP

/** Same time on the next day that still has room on that network (two weeks at most). */
export function nextRoom(posts: Post[], p: Pick<Post, 'network' | 'at'> & { id?: string; account?: string }): number {
  for (let i = 1; i <= 14; i++) if (!overCap(posts, { ...p, at: p.at + i * DAY })) return p.at + i * DAY
  return p.at + 15 * DAY
}

/** A post that would break the cap moves to the next day with room, and says why. */
export function fitCap(posts: Post[], p: Post): Post {
  if (!counts(p) || !overCap(posts, p)) return p
  const at = nextRoom(posts, p)
  const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
  return { ...p, at, note: `${NETWORK_LABEL[p.network]} already had ${CAP} posts on ${day(p.at)}, so Atlas moved it to ${day(at)}, ${hhmm(at)}.` }
}

/* ---------- No publishing during a critical alert ---------- */

export type Alert = { key: string; label: string }
export const PAUSE_TOPIC = 'Paused posts'

/** A critical alert from Echo or Iris is open, or Echo has paused Atlas until it's handled. */
export function criticalAlert(s: State): Alert | undefined {
  const h = s.handoffs.find(x => (x.agent === 'echo' || x.agent === 'iris') && x.kind === 'alert' && x.urgency === 'urgent')
  if (h) return { key: h.ref ?? h.id, label: `${agentName(h.agent)}’s alert: ${h.title}` }
  const paused = s.listening?.pausedAtlas
  if (paused) return { key: 'ev-spike', label: 'Echo’s negative spike, until Claire’s statement is out' }
}

const nextDay = (s: State) => s.publishing.posts.filter(p => p.status === 'scheduled' && p.at > now(s) && p.at <= now(s) + DAY)
const pausedPosts = (s: State) => s.publishing.posts.filter(p => p.status === 'paused')

const ahead = (s: State) => s.publishing.posts.filter(p => p.status === 'scheduled' && p.at > now(s))

export const guardsDue = (s: State) => {
  // Sam pulled the brake: everything stays paused, including what Atlas schedules meanwhile, until Sam resumes.
  if (s.publishing.hold) return ahead(s).length > 0
  const a = criticalAlert(s)
  return a ? nextDay(s).length > 0 : pausedPosts(s).length > 0
}

/** Heartbeat: pause the next 24 h when a critical alert opens, resume when it's over. */
export function tickGuards(s: State): State {
  if (s.publishing.hold) return pauseAll(s, true)
  const a = criticalAlert(s)
  return a ? pauseFor(s, a) : resumeAll(s, 'The alert is over')
}

/** "Pause all publishing": every scheduled post ahead, until Sam resumes. Same paused status and card as the alert pause. */
export function pauseAll(s: State, quiet = false): State {
  const hold = ahead(s)
  const t = now(s)
  const ids = new Set(hold.map(p => p.id))
  let next: State = { ...s, publishing: { ...s.publishing, hold: { at: s.publishing.hold?.at ?? t }, posts: s.publishing.posts.map(p => (ids.has(p.id) ? { ...p, status: 'paused', note: 'Paused: you paused all publishing.', history: [...(p.history ?? []), { at: t, text: 'Paused: you paused all publishing' }] } : p)) } }
  const n = pausedPosts(next).length
  next = pauseCard(next, {
    title: `You paused all publishing: ${n} post${n === 1 ? '' : 's'} on hold`,
    context: 'Nothing goes out until you resume, including what Atlas schedules meanwhile.',
    why: 'You pulled the brake from Publishing. Atlas keeps planning and drafting; nothing is published.',
    sources: [{ label: 'Pause all publishing', from: 'Publishing' }],
    options: [{ label: 'Keep everything paused', recommended: true }, { label: 'Resume all now' }],
  })
  if (quiet) return next
  return pushLog(next, { agent: 'atlas', text: `Paused all publishing: ${hold.length} post${hold.length === 1 ? '' : 's'} on hold`, status: 'approved', reason: 'Your call from Publishing', link: '/publishing/calendar' })
}

type PauseCard = Pick<Handoff, 'title' | 'context' | 'why' | 'sources' | 'options'>
/** One paused-posts card on the Desk, whoever paused them. */
function pauseCard(s: State, c: PauseCard): State {
  const card = s.handoffs.find(h => h.topic === PAUSE_TOPIC)
  const next = card ? removeHandoff(s, card.id) : s
  return pushHandoff(next, { id: card?.id ?? uid('h'), agent: 'atlas', kind: 'alert', group: 'need', urgency: 'urgent', topic: PAUSE_TOPIC, confidence: 95, link: '/publishing/calendar', ...c } as Omit<Handoff, 'id' | 'at'> & { id: string })
}

export function pauseFor(s: State, a: Alert): State {
  const hold = nextDay(s)
  if (!hold.length) return s
  const t = now(s)
  const ids = new Set(hold.map(p => p.id))
  let next: State = { ...s, publishing: { ...s.publishing, posts: s.publishing.posts.map(p => (ids.has(p.id) ? { ...p, status: 'paused', note: `Paused: ${a.label}.`, history: [...(p.history ?? []), { at: t, text: `Paused during ${a.label}` }] } : p)) } }
  const all = pausedPosts(next)
  const list = all.slice().sort((x, y) => x.at - y.at).map(p => `${hhmm(p.at)} ${NETWORK_LABEL[p.network]}`)
  next = pauseCard(next, {
    title: `Atlas paused ${all.length} post${all.length > 1 ? 's' : ''} during ${a.label.split(':')[0]}`,
    context: `${list.slice(0, 4).join(' · ')}${list.length > 4 ? ` and ${list.length - 4} more` : ''}. They go out on their own once the alert is over.`,
    why: 'Guardrail: during a critical alert, Atlas pauses publishing. Nothing goes out while people are angry.',
    sources: [{ label: a.label, from: 'Desk' }],
    options: [{ label: 'Keep them paused until the alert is over', recommended: true }, { label: 'Resume all now' }],
  })
  return pushLog(next, { agent: 'atlas', text: `Paused ${hold.length} post${hold.length > 1 ? 's' : ''} for the next 24 hours`, status: 'done', reason: `Guardrail: ${a.label}`, link: '/publishing/calendar' })
}

/** Paused posts go back: still ahead, scheduled again; their slot gone, back to drafts. */
export function resumeAll(s: State, why: string, ids?: string[]): State {
  const t = now(s)
  const pick = pausedPosts(s).filter(p => !ids || ids.includes(p.id))
  if (!pick.length) return s.publishing.hold && !ids ? { ...s, publishing: { ...s.publishing, hold: undefined } } : s
  const set = new Set(pick.map(p => p.id))
  const missed = pick.filter(p => p.at <= t).length
  let next: State = {
    ...s, publishing: {
      ...s.publishing, hold: ids ? s.publishing.hold : undefined, posts: s.publishing.posts.map(p => (!set.has(p.id) ? p : p.at > t
        ? { ...p, status: 'scheduled', note: undefined, history: [...(p.history ?? []), { at: t, text: `Resumed: ${why.toLowerCase()}` }] }
        : { ...p, status: 'draft', note: 'Its slot passed during the pause. Pick a new one.', history: [...(p.history ?? []), { at: t, text: 'Slot passed during the pause: back to drafts' }] })),
    },
  }
  if (!pausedPosts(next).length) { const card = next.handoffs.find(h => h.topic === PAUSE_TOPIC); if (card) next = removeHandoff(next, card.id) }
  return pushLog(next, { agent: 'atlas', text: `Resumed ${pick.length - missed} post${pick.length - missed === 1 ? '' : 's'}${missed ? `; ${missed} missed ${missed > 1 ? 'their slots' : 'its slot'} and went back to drafts` : ''}`, status: 'done', reason: why, link: '/publishing/calendar' })
}
