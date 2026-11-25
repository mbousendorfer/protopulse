// Publishing failures: a network refuses a post, Atlas says why and fixes what is safe to fix.
import type { State } from '../../app/state'
import type { Handoff } from '../../app/types'
import { actionOf, agentOf, now, pushHandoff, uid } from '../../app/core'
import { hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import type { Post } from '../../data/publishing'

/** The redirect X refused, and the plain link Atlas swaps in. */
export const SHORT_LINK = 'fwy.link/tw7'
export const PLAIN_LINK = 'fernway.co/trail-week'

export type Retry = 'fix' | 'nolink' | 'skip'
export const RETRY_OPTIONS: { mode: Retry; label: string }[] = [
  { mode: 'fix', label: 'Retry with a plain link' }, { mode: 'nolink', label: 'Publish without the link' }, { mode: 'skip', label: 'Skip X today' },
]

/** The open "Publishing failed" card for a post. */
export const failureCardOf = (s: State, id: string): Handoff | undefined => s.handoffs.find(h => h.topic === 'Publishing failed' && h.ref === id)

/** A post with its link fixed (or removed), published now; or kept as a draft when you skip the day. */
export function retried(p: Post, mode: Retry, at: number, by: string): Post {
  const history = [...(p.history ?? [])]
  if (mode === 'skip') return { ...p, status: 'draft', failure: undefined, note: 'Skipped today. Kept as a draft.', history: [...history, { at, text: `Skipped by ${by}` }] }
  const text = mode === 'fix' ? p.text.replace(SHORT_LINK, PLAIN_LINK) : p.text.replace(` ${SHORT_LINK}`, '').replace(SHORT_LINK, '').trim()
  const what = mode === 'fix' ? 'with a plain link' : 'without the link'
  return {
    ...p, text, at, status: 'published', failure: undefined, link: mode === 'fix' ? { url: `https://${PLAIN_LINK}` } : undefined,
    note: `Retried ${what} at ${hhmm(at)}. Published.`, history: [...history, { at, text: `Retried ${what} by ${by}. Published.` }],
  }
}

/**
 * X refuses the post Atlas just sent: the post turns Failed with the cause, and a card asks what to do.
 * A second one never stacks while the first is open.
 */
export function failXPost(s: State): { s: State; card?: string } {
  if (s.publishing.posts.some(p => p.status === 'failed' && failureCardOf(s, p.id))) return { s }
  const t = now(s)
  const post: Post = {
    id: uid('p'), network: 'x', at: t, author: 'atlas', pillar: 'Trail stories', campaign: 'Trail Week', status: 'failed',
    text: `Trail Week starts Monday: 7 days, 7 trails, the whole team outside. ${SHORT_LINK}`, link: { url: `https://${SHORT_LINK}` },
    failure: { at: t, text: `X flagged ${SHORT_LINK} as a possible redirect and refused the post.` },
    note: 'X refused it: the short link looks like a redirect.', history: [{ at: t, text: 'X refused it: link flagged as a possible redirect' }],
  }
  let next: State = { ...s, publishing: { ...s.publishing, posts: [...s.publishing.posts, post] } }
  const act = actionOf(next, 'atlas', 'atlas-retry')
  const id = uid('h')
  next = pushHandoff(next, {
    // An alert, but one that needs Sam: it goes with Needs you, not Worth a look.
    id, agent: 'atlas', kind: 'alert', group: 'need', urgency: 'today', topic: 'Publishing failed', action: 'atlas-retry', ref: post.id,
    title: `X refused the ${hhmm(t)} post`, context: `The short link ${SHORT_LINK} was flagged as a possible redirect. Atlas can retry with ${PLAIN_LINK}.`,
    why: `Publishing failures always reach you. ${act?.label ?? 'Retrying'} is set to ${act?.autonomy === 'act' ? 'Act' : act?.autonomy === 'suggest' ? 'Suggest' : 'Draft'}.`,
    confidence: 97, link: `/publishing/calendar?post=${post.id}`,
    sources: [{ label: `X error: link flagged as a possible redirect (${SHORT_LINK})`, from: 'Calendar' }],
    options: RETRY_OPTIONS.map((o, i) => ({ label: o.label, recommended: i === 0 })),
  })
  return { s: next, card: id }
}

/** Atlas may retry on its own: the action is on Act and Atlas is on. */
export const retriesAlone = (s: State) => agentOf(s, 'atlas').status === 'on' && actionOf(s, 'atlas', 'atlas-retry')?.autonomy === 'act'

export const netName = (p: Post) => NETWORK_LABEL[p.network] ?? p.network
