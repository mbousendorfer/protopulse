import { expect, test } from 'vitest'
import { reducer } from '../../app/reducer'
import { initialState } from '../../app/state'
import { now, pushHandoff } from '../../app/core'
import { DAY } from '../../app/time'
import atlas from './agent'
import { reducePublishing } from './slice'
import { CAP, criticalAlert, fitCap, overCap } from './guards'
import type { Post } from '../../data/publishing'

const spike = (s = initialState()) => pushHandoff(s, { agent: 'echo', kind: 'alert', urgency: 'urgent', topic: 'Negative spike', ref: 'ev-spike', title: '27 negative mentions about Storm Jacket seams', context: '', why: '', confidence: 73 })
const run = (s: ReturnType<typeof initialState>) => (atlas.due!(s, now(s)) ? atlas.tick!(s, now(s)) : s)

test('the cap: a 4th post on a network that day moves to the next day with room', () => {
  const s = initialState()
  const base: Post = { id: 'x1', network: 'x', at: now(s) + 2 * 3_600_000, text: 'a', status: 'scheduled', author: 'atlas', pillar: 'Community' }
  const posts = [base, { ...base, id: 'x2' }, { ...base, id: 'x3' }]
  expect(overCap(posts, { ...base, id: 'x4' })).toBe(true)
  const moved = fitCap(posts, { ...base, id: 'x4' })
  expect(moved.at).toBe(base.at + DAY)
  expect(moved.note).toMatch(/already had 3 posts/)
  expect(CAP).toBe(3)
})

test('drag and drop refuses a 4th post on the same network and day', () => {
  let s = initialState()
  const ig = s.publishing.posts.filter(p => p.network === 'instagram' && p.status === 'scheduled')
  const target = ig[0]
  const day = target.at
  s = { ...s, publishing: { ...s.publishing, posts: [...s.publishing.posts, { ...target, id: 'i2', at: day + 60_000 }, { ...target, id: 'i3', at: day + 120_000 }] } }
  const other = ig.find(p => new Date(p.at).toDateString() !== new Date(day).toDateString())!
  const next = reducePublishing(s, { type: 'publishing/move', id: other.id, at: day + 3_600_000 })
  expect(next.publishing.posts.find(p => p.id === other.id)!.at).toBe(other.at)
  expect(next.notice?.text).toMatch(/already has 3 posts/)
})

test('a critical alert pauses the next 24 hours; the card resumes them; the end of the alert resumes the rest', () => {
  let s = spike()
  expect(criticalAlert(s)).toBeDefined()
  s = run(s)
  const paused = s.publishing.posts.filter(p => p.status === 'paused')
  expect(paused.length).toBeGreaterThan(0)
  expect(paused.every(p => p.at <= now(s) + DAY)).toBe(true)
  const card = s.handoffs.find(h => h.topic === 'Paused posts')!
  expect(card.options![1].label).toBe('Resume all now')
  const resumed = reducer(s, { type: 'core/resolve', id: card.id, decision: { kind: 'option', index: 1, option: 'Resume all now' } })
  expect(resumed.publishing.posts.filter(p => p.status === 'paused').length).toBe(0)
  // Undo of "Resume all" pauses them again.
  const undone = reducer(resumed, { type: 'core/undo', id: resumed.log[0].id })
  expect(undone.publishing.posts.filter(p => p.status === 'paused').length).toBe(paused.length)
  // The alert ends: Atlas resumes on its own.
  const over = run({ ...s, handoffs: s.handoffs.filter(h => h.agent !== 'echo') })
  expect(over.publishing.posts.filter(p => p.status === 'paused').length).toBe(0)
  expect(over.handoffs.some(h => h.topic === 'Paused posts')).toBe(false)
})

test('one post resumes from its preview', () => {
  const s = run(spike())
  const p = s.publishing.posts.find(x => x.status === 'paused')!
  const next = reducePublishing(s, { type: 'publishing/resume', ids: [p.id] })
  expect(next.publishing.posts.find(x => x.id === p.id)!.status).toBe('scheduled')
})
