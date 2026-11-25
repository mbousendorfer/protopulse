import { expect, test } from 'vitest'
import { initialState } from '../../app/state'
import { reducePublishing } from './slice'
import { perfOf } from './perf'

test('a top post reads against its network median and can be recycled once', () => {
  let s = initialState()
  const drop = s.publishing.posts.find(p => p.id === 'p-03')! // TikTok drop test, 210k
  const perf = perfOf(s, drop)!
  expect(perf.ratio).toBeGreaterThan(4)
  expect(perf.worth).toBe(true)
  expect(perf.to).toBe('instagram')
  const n = s.publishing.ideas.length
  s = reducePublishing(s, { type: 'publishing/recycle', id: 'p-03' })
  expect(s.publishing.ideas.length).toBe(n + 1)
  expect(s.publishing.ideas[0].networks).toEqual(['instagram'])
  expect(reducePublishing(s, { type: 'publishing/recycle', id: 'p-03' }).publishing.ideas.length).toBe(n + 1)
})

test('a weak post is not worth recycling, and a scheduled one has no results', () => {
  const s = initialState()
  const weak = s.publishing.posts.find(p => p.id === 'p-15')! // TikTok, 1,840
  expect(perfOf(s, weak)!.worth).toBe(false)
  expect(perfOf(s, s.publishing.posts.find(p => p.status === 'scheduled')!)).toBeUndefined()
})
