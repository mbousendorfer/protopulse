import { expect, test } from 'vitest'
import { reducer } from '../../app/reducer'
import { initialState, type State } from '../../app/state'
import { now, updateHandoff } from '../../app/core'
import atlas from './agent'
import { reducePublishing } from './slice'
import { revise } from './approvals'
import { intentDef } from '../../app/agents-registry'

const tick = (s: State) => (atlas.due!(s, now(s)) ? atlas.tick!(s, now(s)) : s)
const post = (s: State, id: string) => s.publishing.posts.find(p => p.id === id)!
const send = () => {
  const s = initialState()
  return reducePublishing(s, { type: 'publishing/claire', post: post(s, 'p-27') })
}
const cardOf = (s: State) => s.handoffs.find(h => h.ref === 'p-27' && h.lane === 'claire')!
const answer = (s: State, verdict: 'approve' | 'changes' | 'decline', text: string) => {
  const h = cardOf(s)
  return updateHandoff(s, h.id, { lane: undefined, claire: { ...h.claire!, reply: text, verdict }, thread: [{ id: 'm', from: 'claire', text, at: now(s) }] })
}

test('sent to Claire: To approve, a comment, a card in her lane', () => {
  const s = send()
  expect(post(s, 'p-27').status).toBe('unapproved')
  expect(post(s, 'p-27').comments![0].text).toBe('Sent to Claire for approval.')
  expect(cardOf(s)).toBeDefined()
})

test('Claire approves: scheduled, her comment on the post', () => {
  let s = send()
  const h = cardOf(s)
  s = reducer(updateHandoff(s, h.id, { thread: [{ id: 'm', from: 'claire', text: 'Go. Keep it short.', at: now(s) }] }), { type: 'core/resolve', id: h.id, decision: { kind: 'approve' } })
  expect(post(s, 'p-27').status).toBe('scheduled')
  expect(post(s, 'p-27').approval!.state).toBe('approved')
  expect(post(s, 'p-27').comments!.at(-1)).toMatchObject({ from: 'claire', text: 'Go. Keep it short.' })
})

test('Claire asks for changes: back to draft, Atlas revises, Sam approves the revision', () => {
  let s = tick(answer(send(), 'changes', 'Remove the price, legal hasn’t confirmed it yet.'))
  const p = post(s, 'p-27')
  expect(p.status).toBe('draft')
  expect(p.comments!.map(c => c.from)).toEqual(['you', 'claire', 'atlas'])
  const h = s.handoffs.find(x => x.ref === 'p-27')!
  expect(h.title).toMatch(/^Claire asked for changes/)
  s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'approve' } })
  expect(post(s, 'p-27').status).toBe('scheduled')
})

test('Claire declines: the post goes back to drafts with her comment', () => {
  const s = tick(answer(send(), 'decline', 'Not now.'))
  expect(post(s, 'p-27').status).toBe('draft')
  expect(post(s, 'p-27').approval!.state).toBe('declined')
})

test('revision takes the price and the code out', () => {
  expect(revise('Weekend sale: 15% off bottles with code TRAIL15 until Sunday.', 'Remove the price')).toBe('Weekend sale on bottles until Sunday.')
})

test('with the pricing escalation on, Atlas sends its priced posts to Claire on its own; off, it does not', () => {
  const base = initialState()
  const priced = { ...post(base, 'p-27'), id: 'p-price', text: 'Last call: 15% off bottles until Sunday night.' }
  const s0: State = { ...base, publishing: { ...base.publishing, posts: [...base.publishing.posts, priced] } }
  expect(post(tick(s0), 'p-price').status).toBe('scheduled')
  const on: State = { ...s0, playbook: { ...s0.playbook, escalate: s0.playbook.escalate.map(e => (e.id === 'e-pricing' ? { ...e, on: true } : e)) } }
  const s = tick(on)
  expect(post(s, 'p-price').status).toBe('unapproved')
  expect(s.log[0].reason).toMatch(/price changes and promo codes/)
})

test('“Send Friday’s post to Claire for approval” finds Friday’s post', () => {
  const def = intentDef('postClaire')!
  const i = def.parse('send friday’s post to claire for approval', { raw: '' })!
  const s = initialState()
  const r = def.chat(i, { s, chat: {} as never, route: {} as never })
  const next = r.effects[0](s)
  const sent = next.publishing.posts.find(p => p.status === 'unapproved')!
  expect(new Date(sent.at).getDay()).toBe(5)
})
