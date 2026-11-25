import { expect, test } from 'vitest'
import { reducer } from '../../app/reducer'
import { initialState } from '../../app/state'
import { now, setAutonomy } from '../../app/core'
import { hhmm } from '../../app/time'
import { SCRIPT } from './script'
import { betterSlot, betterSlots } from './slots'

const fire = (s: ReturnType<typeof initialState>) => SCRIPT.find(e => e.id === 'ev-slot')!.run!(s, true)

test('Atlas only moves a post within its day, to a free best hour still ahead', () => {
  const s = initialState()
  const [m] = betterSlots(s)
  expect(new Date(m.at).toDateString()).toBe(new Date(m.post.at).toDateString())
  expect(hhmm(m.at)).toBe('18:30')
  expect(m.post.network).toBe('instagram')
  const p = { ...m.post, at: m.at }
  expect(betterSlot(p, s.publishing.posts, now(s))).toBeUndefined()
  expect(betterSlot({ ...m.post, status: 'published' }, s.publishing.posts, now(s))).toBeUndefined()
})

test('Act (the default): the post moves and the journal says why; Undo puts it back', () => {
  let s = initialState()
  const m = betterSlots(s)[0]
  s = fire(s)
  expect(s.publishing.posts.find(p => p.id === m.post.id)!.at).toBe(m.at)
  expect(s.log[0].reason).toMatch(/2\.1×/)
  expect(s.handoffs.some(h => h.topic === 'Better slot')).toBe(false)
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(s.publishing.posts.find(p => p.id === m.post.id)!.at).toBe(m.post.at)
})

test('Draft: a card in Needs you that moves the post when approved; Suggest: the card waits in Worth a look', () => {
  let s = fire(setAutonomy(initialState(), 'atlas', 'atlas-slot', 'draft'))
  const h = s.handoffs.find(x => x.topic === 'Better slot')!
  expect(h.group).toBeUndefined()
  const m = betterSlots(initialState())[0]
  s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'approve' } })
  expect(s.publishing.posts.find(p => p.id === m.post.id)!.at).toBe(m.at)
  expect(s.publishing.posts.length).toBe(initialState().publishing.posts.length)
  const sug = fire(setAutonomy(initialState(), 'atlas', 'atlas-slot', 'suggest'))
  expect(sug.handoffs.find(x => x.topic === 'Better slot')!.group).toBe('look')
})
