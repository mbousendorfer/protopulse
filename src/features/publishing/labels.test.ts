import { expect, test } from 'vitest'
import { initialState } from '../../app/state'
import { reducePublishing } from './slice'
import { NO_LABEL, knownLabels, passes } from './labels'
import { withFormat } from './formats'

test('Atlas labels its campaign posts; Sam adds and removes labels, one post or many', () => {
  let s = initialState()
  const tw = s.publishing.posts.find(p => p.campaign === 'Trail Week')!
  expect(tw.labels).toContain('Trail Week')
  expect(withFormat({ ...tw, id: 'x', labels: undefined }).labels).toEqual(['Trail Week'])
  const ids = s.publishing.posts.slice(0, 3).map(p => p.id)
  s = reducePublishing(s, { type: 'publishing/labels', ids, add: ['Black Friday'] })
  expect(s.publishing.posts.filter(p => p.labels?.includes('Black Friday')).length).toBe(3)
  expect(knownLabels(s)).toContain('Black Friday')
  s = reducePublishing(s, { type: 'publishing/labels', ids: [ids[0]], remove: ['Black Friday'] })
  expect(s.publishing.posts.find(p => p.id === ids[0])!.labels).not.toContain('Black Friday')
})

test('filters: any choice within a facet, every facet at once, and “No label”', () => {
  const s = initialState()
  const posts = s.publishing.posts
  const tw = posts.filter(p => passes(p, { label: ['Trail Week'] }))
  expect(tw.length).toBe(posts.filter(p => p.campaign === 'Trail Week').length)
  const both = posts.filter(p => passes(p, { label: ['Trail Week'], status: ['scheduled'] }))
  expect(both.every(p => p.status === 'scheduled' && p.labels!.includes('Trail Week'))).toBe(true)
  expect(posts.filter(p => passes(p, { label: [NO_LABEL] })).every(p => !p.labels?.length)).toBe(true)
  expect(posts.filter(p => passes(p, {})).length).toBe(posts.length)
})
