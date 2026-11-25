import { expect, test } from 'vitest'
import { reducer } from '../../app/reducer'
import { initialState } from '../../app/state'
import { now } from '../../app/core'
import { MEDIA } from '../../data/publishing'
import atlas from './agent'
import { reducePublishing } from './slice'
import { expiring, search, tagsFor } from './media'
import { libraryOf } from './visuals'

test('Atlas tags an upload from its name and the post it illustrates', () => {
  const p = initialState().publishing.posts.find(x => x.id === 'p-repair')!
  expect(tagsFor('repair bench close up', p)).toEqual(['Repair', 'Upload'])
  expect(tagsFor('ridge on the GR20')).toContain('Ridge')
})

test('tags can be edited; search looks at titles, tags and rights', () => {
  let s = reducePublishing(initialState(), { type: 'publishing/mediaTags', id: 'md-03', tags: ['Product', 'Ridge', 'Hero'] })
  expect(libraryOf(s).find(m => m.id === 'md-03')!.tags).toContain('Hero')
  expect(search(libraryOf(s), 'hero').map(m => m.id)).toEqual(['md-03'])
  expect(search(MEDIA, 'camille').length).toBe(2)
})

test('a creator licence ending soon on a post still to go out: Atlas raises a swap; approving it swaps', () => {
  let s = initialState()
  const e = expiring(s, now(s))
  expect(e.map(x => x.media.name)).toEqual(['tent'])
  expect(e[0].swap!.name).toBe('camp')
  s = atlas.tick!(s, now(s))
  const card = s.handoffs.find(h => h.topic === 'Licence')!
  expect(card.options![0].label).toBe('Swap for “Camp at golden hour”')
  expect(atlas.due!(s, now(s))).toBe(false)
  s = reducer(s, { type: 'core/resolve', id: card.id, decision: { kind: 'option', index: 0, option: card.options![0].label } })
  expect(s.publishing.posts.find(p => p.id === 'p-16')!.media).toBe('camp')
  expect(atlas.due!(s, now(s)) && atlas.tick!(s, now(s)).handoffs.some(h => h.topic === 'Licence')).toBe(false)
})
