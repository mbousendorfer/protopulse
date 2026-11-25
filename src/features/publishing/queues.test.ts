import { expect, test } from 'vitest'
import { reducer } from '../../app/reducer'
import { initialState, type State } from '../../app/state'
import { now, setAutonomy } from '../../app/core'
import { SCRIPT } from './script'
import { reducePublishing } from './slice'
import { occurrences, upcoming } from './queues'
import { intentDef } from '../../app/agents-registry'

const fire = (s: State) => SCRIPT.find(e => e.id === 'ev-queue')!.run!(s, true)
const qPosts = (s: State) => s.publishing.posts.filter(p => p.queue)

test('a queue has its recurring slots over the next two weeks', () => {
  const s = initialState()
  const tips = s.publishing.queues.find(q => q.id === 'q-tips')!
  const at = occurrences(tips, now(s), now(s) + 14 * 86_400_000)
  expect(at.length).toBe(2)
  expect(at.every(t => new Date(t).getDay() === 2 && new Date(t).getHours() === 8)).toBe(true)
})

test('Draft (default): Atlas drafts each empty slot, To review on the Desk; approving schedules it', () => {
  let s = fire(initialState())
  expect(qPosts(s).length).toBe(4)
  expect(qPosts(s).every(p => p.status === 'needs')).toBe(true)
  expect(new Set(qPosts(s).map(p => p.text)).size).toBe(4)
  const card = s.handoffs.find(h => h.topic === 'Queue')!
  s = reducer(s, { type: 'core/resolve', id: card.id, decision: { kind: 'approve' } })
  expect(s.publishing.posts.find(p => p.id === card.ref)!.status).toBe('scheduled')
  expect(qPosts(fire(s)).length).toBe(4)
})

test('Act: scheduled at once, Undo takes them out', () => {
  let s = fire(setAutonomy(initialState(), 'atlas', 'atlas-fill', 'act'))
  expect(qPosts(s).every(p => p.status === 'scheduled')).toBe(true)
  expect(s.handoffs.some(h => h.topic === 'Queue')).toBe(false)
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(qPosts(s).length).toBe(0)
})

test('moving a slot changes the next two weeks', () => {
  let s = initialState()
  s = reducePublishing(s, { type: 'publishing/queueSlot', queue: 'q-tips', index: 0, weekday: 3, time: '12:00' })
  const tips = s.publishing.queues.find(q => q.id === 'q-tips')!
  expect(upcoming(s, tips).every(x => new Date(x.at).getDay() === 4 && new Date(x.at).getHours() === 12)).toBe(true)
})

test('“Fill next week’s Tips slots” fills only next week’s Tuesday tip', () => {
  const s = initialState()
  const def = intentDef('fillQueue')!
  const i = def.parse('fill next week’s tips slots', { raw: '' })!
  const next = def.chat(i, { s, chat: {} as never, route: {} as never }).effects[0](s)
  expect(qPosts(next).length).toBe(1)
  expect(qPosts(next)[0].queue).toBe('q-tips')
  expect(new Date(qPosts(next)[0].at).getDate()).toBe(2)
})
