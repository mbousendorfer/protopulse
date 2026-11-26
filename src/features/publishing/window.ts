// The send window: what Atlas scheduled alone (Act) shows up 10 minutes before it goes out, with a Stop.
// Draft posts and Sam's own skip it: Sam already saw them.
import type { State } from '../../app/state'
import type { Handoff } from '../../app/types'
import { agentOf, actionOf, now, pushHandoff, removeHandoff } from '../../app/core'
import { MIN, hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import type { Post } from '../../data/publishing'
import { overCap } from './guards'

declare module '../../app/types' {
  interface Handoff {
    /** The Desk's footer line under the options, when the default ("Nothing goes out until you confirm") is wrong. Asked of Trust. */
    footnote?: string
  }
}
import { actOn } from './slice'

export const WINDOW = 10 * MIN
export const WINDOW_TOPIC = 'Going out'
export const STOP_REASONS = ['Wrong time', 'Wrong words', 'Not now'] as const
export type StopReason = (typeof STOP_REASONS)[number]

export const minsLeft = (p: Post, t: number) => Math.max(1, Math.ceil((p.at - t) / MIN))

/** Scheduled alone, not let go yet, going out within 10 minutes. */
export const inWindow = (s: State, t = now(s)) =>
  s.publishing.posts.filter(p => p.status === 'scheduled' && p.alone && !p.alone.cleared && p.at > t && p.at - t <= WINDOW)

const cardOf = (s: State, id: string) => s.handoffs.find(h => h.topic === WINDOW_TOPIC && h.ref === id)
const titleOf = (p: Post, t: number) => `Going out in ${minsLeft(p, t)} min: ${NETWORK_LABEL[p.network]} at ${hhmm(p.at)}`

/** A post entered the window, left it, or its minute changed. Cheap: runs every second. */
export function windowDue(s: State): boolean {
  const t = now(s), open = inWindow(s, t)
  if (open.some(p => cardOf(s, p.id)?.title !== titleOf(p, t))) return true
  return s.handoffs.some(h => h.topic === WINDOW_TOPIC && !open.some(p => p.id === h.ref))
}

/** Heartbeat: one Worth a look card per post in the window, its title counting down; gone once the post is out or stopped. */
export function tickWindow(s: State): State {
  const t = now(s), open = inWindow(s, t)
  let next = s
  for (const h of s.handoffs) if (h.topic === WINDOW_TOPIC && !open.some(p => p.id === h.ref)) next = removeHandoff(next, h.id)
  for (const p of open) {
    const card = cardOf(next, p.id)
    if (card) { if (card.title !== titleOf(p, t)) next = { ...next, handoffs: next.handoffs.map(h => (h.id === card.id ? { ...h, title: titleOf(p, t) } : h)) }; continue }
    next = pushHandoff(next, {
      agent: 'atlas', kind: 'alert', group: 'look', urgency: 'today', topic: WINDOW_TOPIC, ref: p.id, link: `/publishing/calendar?post=${p.id}`,
      title: titleOf(p, t), context: `It goes out at ${hhmm(p.at)} unless you stop it. Nothing to do if it looks right.`,
      footnote: 'It goes out on its own unless you stop it.',
      why: `Atlas scheduled it alone (${p.alone!.why}). Anything Atlas publishes on its own waits 10 minutes, so you can stop it.`, confidence: 90,
      options: [{ label: 'Let it go out', recommended: true }, ...STOP_REASONS.map(r => ({ label: `Stop: ${r.toLowerCase()}` }))],
      preview: { type: 'post', network: p.network, slot: `Today, ${hhmm(p.at)}`, text: [p.text], media: p.media },
    } as Omit<Handoff, 'id' | 'at'>)
  }
  return next
}

/** Back to drafts, with the reason Sam gave. The reason is kept as a lesson (`learned`). */
export function stopPost(s: State, id: string, reason: StopReason | undefined, by = 'you'): State {
  const p = s.publishing.posts.find(x => x.id === id)
  if (!p || p.status !== 'scheduled') return s
  const t = now(s)
  const why = reason ? `: ${reason.toLowerCase()}` : ''
  const posts = s.publishing.posts.map(x => (x.id !== id ? x : {
    ...x, status: 'draft' as const, alone: undefined, note: `Stopped by ${by} ${minsLeft(x, t)} min before it went out${why}. Back to drafts.`,
    history: [...(x.history ?? []), { at: t, text: `Stopped by ${by}${why}` }],
  }))
  const learned = reason ? { ...s.publishing.learned, [`stop:${reason}`]: (s.publishing.learned[`stop:${reason}`] ?? 0) + 1 } : s.publishing.learned
  return { ...s, publishing: { ...s.publishing, posts, learned } }
}

/** "Let it go out": no more window for this post. */
export const letGo = (s: State, id: string): State =>
  ({ ...s, publishing: { ...s.publishing, posts: s.publishing.posts.map(p => (p.id === id && p.alone ? { ...p, alone: { ...p.alone, cleared: true } } : p)) } })

/** Desk answer on a window card: option 0 lets it go, the others stop it with their reason. */
export function resolveWindow(s: State, h: Handoff, index: number): State {
  if (!h.ref) return s
  return index === 0 ? letGo(s, h.ref) : stopPost(s, h.ref, STOP_REASONS[index - 1])
}

/* ---------- ⇧D: Atlas fills a slot that goes out in 10 minutes ---------- */

const FILLERS: { network: Post['network']; text: string; media?: string }[] = [
  { network: 'facebook', text: 'One thermos, forty minutes, no summit needed. Where do you go when you only have an hour?', media: 'lake' },
  { network: 'linkedin', text: 'Every Ridge 28L that comes back for repair teaches the workshop something. This week: the hip-belt buckle.' },
  { network: 'x', text: 'Repair counter tip: a stuck zip wants a pencil, not force. Graphite does the rest.' },
]

/**
 * A slot 10 minutes from now is empty and Atlas fills it. Act (Fill a slot left empty): scheduled alone, so the send
 * window opens straight away. Draft or Suggest: an ordinary card, and the post Sam approves never gets a window.
 */
export function fillSoon(s: State): State {
  const at = Math.floor((now(s) + WINDOW) / MIN) * MIN
  const f = FILLERS.find(x => !overCap(s.publishing.posts, { network: x.network, at })) ?? FILLERS[0]
  const level = actionOf(s, 'atlas', 'atlas-fill')?.autonomy ?? 'draft'
  const next = pushHandoff(s, {
    agent: 'atlas', kind: 'approval', urgency: 'today', topic: 'Empty slot', action: 'atlas-fill', pillar: 'Community',
    group: level === 'suggest' ? 'look' : 'need', link: '/publishing/calendar',
    title: `${NETWORK_LABEL[f.network]} has nothing today at ${hhmm(at)}`, context: 'Atlas wrote a Community post to keep the day from going quiet.',
    why: `Filling empty slots is set to ${level === 'act' ? 'Act' : level === 'suggest' ? 'Suggest' : 'Draft'}.`, confidence: 81,
    preview: { type: 'post', network: f.network, slot: `Today, ${hhmm(at)}`, text: [f.text], media: f.media },
  })
  if (level !== 'act' || agentOf(s, 'atlas').status !== 'on') return next
  return actOn(next, next.handoffs[0], `Filled today’s ${hhmm(at)} ${NETWORK_LABEL[f.network]} slot`, 'It goes out in 10 minutes; you can still stop it.')
}
