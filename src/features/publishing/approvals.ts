// Approvals: a post goes to Claire (To approve), her answer acts on it. Atlas sends her what the Playbook says she owns.
import type { State } from '../../app/state'
import type { Handoff } from '../../app/types'
import { agentOf, now, pushHandoff, pushLog, uid, updateHandoff } from '../../app/core'
import { hhmm } from '../../app/time'
import type { Post } from '../../data/publishing'
import { shorten } from './ideasModel'

export type Comment = NonNullable<Post['comments']>[number]

/** A price or a promo code in a caption. */
export const PRICED = /€\s?\d|\d\s?€|\d+\s?%\s?off|\bcode\s+[A-Z0-9]{4,}|\bprices?\b/i
/** The Playbook escalation "Price changes and promo codes → Claire" is on. */
export const pricingToClaire = (s: State) => !!s.playbook.escalate?.find(e => e.id === 'e-pricing')?.on

const when = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}, ${hhmm(t)}`
const comment = (p: Post, c: Comment): Post['comments'] => [...(p.comments ?? []), c]

/** Send one post to Claire: To approve, a comment saying why, a card in Claire's lane. */
export function sendToClaire(s: State, post: Post, why: string, by: 'you' | 'atlas'): { s: State; hid: string } {
  const t = now(s)
  const held: Post = {
    ...post, status: 'unapproved', note: 'To approve: with Claire.',
    approval: { state: 'pending', at: t },
    comments: comment(post, { from: by, text: by === 'atlas' ? `Sent to Claire: ${why}` : 'Sent to Claire for approval.', at: t }),
    history: [...(post.history ?? []), { at: t, text: by === 'atlas' ? 'Atlas sent it to Claire' : 'Sent to Claire' }],
  }
  let next: State = { ...s, publishing: { ...s.publishing, posts: s.publishing.posts.some(p => p.id === post.id) ? s.publishing.posts.map(p => (p.id === post.id ? held : p)) : [...s.publishing.posts, held] } }
  const hid = uid('h')
  next = pushHandoff(next, {
    id: hid, agent: 'atlas', kind: 'approval', urgency: 'today', topic: 'Post', action: 'atlas-fill', ref: post.id, link: `/publishing/calendar?post=${post.id}`,
    title: `Post for ${when(post.at)}`, context: post.text, why: by === 'atlas' ? why : 'You sent this post to Claire.', confidence: 85,
    preview: { type: 'post', network: post.network, slot: when(post.at), text: [post.text], media: post.media },
  })
  next = updateHandoff(next, hid, { lane: 'claire', claire: { askedAt: t, dueAt: t + (30 + Math.round(Math.random() * 30)) * 1000 } })
  next = { ...next, publishing: { ...next.publishing, posts: next.publishing.posts.map(p => (p.id === post.id ? { ...p, approval: { ...p.approval!, card: hid } } : p)) } }
  return { s: next, hid }
}

/** What Atlas changes after "changes requested": the price out when Claire asks, otherwise a shorter cut. */
export function revise(text: string, ask: string): string {
  if (/price|promo|code|discount/i.test(ask) && PRICED.test(text)) {
    return text.replace(/:?\s*\d+\s?%\s?off\s*/i, ' on ').replace(/\s*with code\s+\S+/i, '').replace(/\s*(€\s?\d+|\d+\s?€)/g, '')
      .replace(/\s+/g, ' ').replace(/\s([.,!?])/g, '$1').trim()
  }
  return shorten(text)
}

/** Claire's last word on a card. */
const claireSaid = (h: Handoff) => [...(h.thread ?? [])].reverse().find(m => m.from === 'claire')?.text ?? h.claire?.reply ?? ''

/** Claire approved (or Sam approved after her): the post is scheduled, her comment stays on it. */
export function approved(p: Post, h: Handoff, t: number, text?: string): Post {
  const said = claireSaid(h)
  return {
    ...p, status: 'scheduled', text: text ?? p.text, note: undefined, approval: { ...p.approval!, state: 'approved', at: t },
    comments: said && !(p.comments ?? []).some(c => c.from === 'claire' && c.text === said) ? comment(p, { from: 'claire', text: said, at: t }) : p.comments,
  }
}

/** Heartbeat: Claire asked for changes or declined (the core hands the card back to Sam): the post follows. */
export function followClaire(s: State): State {
  let next = s
  for (const p of s.publishing.posts) {
    if (p.approval?.state !== 'pending' || !p.approval.card) continue
    const h = next.handoffs.find(x => x.id === p.approval!.card)
    const v = h?.claire?.verdict
    if (!h || !v || v === 'approve') continue
    const t = now(next)
    const said = claireSaid(h)
    if (v === 'changes') {
      const text = revise(p.text, said)
      next = setPost(next, { ...p, status: 'draft', note: 'Changes requested by Claire. Atlas revised it.', approval: { ...p.approval, state: 'changes', at: t },
        comments: [...(p.comments ?? []), { from: 'claire', text: said, at: t }, { from: 'atlas', text: `Revised: “${text}”. It’s on your Desk to approve.`, at: t }] })
      next = updateHandoff(next, h.id, { title: `Claire asked for changes: ${h.title}`, why: `Claire: “${said}” Atlas revised the post. Approve to schedule it.`, preview: h.preview?.type === 'post' ? { ...h.preview, text: [text] } : h.preview, answer: text })
      next = pushLog(next, { agent: 'atlas', text: `Revised the post for ${when(p.at)} after Claire’s changes`, status: 'done', reason: `Claire: “${said}”`, link: `/publishing/calendar?post=${p.id}` })
    } else {
      next = setPost(next, { ...p, status: 'draft', note: 'Declined by Claire.', approval: { ...p.approval, state: 'declined', at: t }, comments: [...(p.comments ?? []), { from: 'claire', text: said, at: t }] })
    }
  }
  return next
}

const setPost = (s: State, p: Post): State => ({ ...s, publishing: { ...s.publishing, posts: s.publishing.posts.map(x => (x.id === p.id ? p : x)) } })

/** Atlas's own scheduled posts that quote a price or a code, not yet approved by Claire. */
const toRoute = (s: State) => s.publishing.posts.filter(p => p.author === 'atlas' && p.status === 'scheduled' && p.at > now(s) && PRICED.test(p.text) && p.approval?.state !== 'approved')

export const approvalsDue = (s: State) =>
  s.publishing.posts.some(p => p.approval?.state === 'pending' && !!p.approval.card && !!s.handoffs.find(h => h.id === p.approval!.card)?.claire?.verdict && s.handoffs.find(h => h.id === p.approval!.card)?.claire?.verdict !== 'approve')
  || (pricingToClaire(s) && agentOf(s, 'atlas').status === 'on' && toRoute(s).length > 0)

/** Heartbeat: follow Claire's answers, and send her what the pricing escalation says she owns, on any level. */
export function tickApprovals(s: State): State {
  let next = followClaire(s)
  if (!pricingToClaire(next) || agentOf(next, 'atlas').status !== 'on') return next
  for (const p of toRoute(next)) {
    next = sendToClaire(next, p, 'it quotes a price or a promo code (Playbook: price changes and promo codes go to Claire).', 'atlas').s
    next = pushLog(next, { agent: 'atlas', text: `Sent the post for ${when(p.at)} to Claire: it quotes a price`, status: 'done', reason: 'Playbook escalation: price changes and promo codes go to Claire', link: `/publishing/calendar?post=${p.id}` })
  }
  return next
}
