import { expect, test } from 'vitest'
import { reducer } from '../../app/reducer'
import { initialState } from '../../app/state'
import { now } from '../../app/core'
import { MEDIA } from '../../data/publishing'
import atlas from './agent'
import { reducePublishing } from './slice'
import { pickVisual, usable, waitingForVisual } from './visuals'

const repair = (s = initialState()) => s.publishing.posts.find(p => p.id === 'p-repair')!

test('Atlas picks a repair photo for the repair post, never a lapsed licence or stock', () => {
  const s = initialState()
  expect(pickVisual(repair(s), MEDIA, now(s))!.name).toBe('workshop')
  expect(usable({ ...MEDIA[0], rights: 'Stock · Unsplash' }, now(s))).toBe(false)
  expect(usable({ ...MEDIA[0], rights: 'Creator · @x, licensed until Jan 2025' }, now(s))).toBe(false)
  expect(pickVisual({ ...repair(s), text: 'zzz', pillar: 'Repair & care' }, [], now(s))).toBeUndefined()
})

test('on Act, Atlas gives the waiting post a visual and schedules it; Undo brings the card and the hold back', () => {
  let s = reducer(initialState(), { type: 'core/autonomy', agent: 'atlas', action: 'atlas-fill', level: 'act' })
  expect(waitingForVisual(s).map(p => p.id)).toEqual(['p-repair'])
  expect(atlas.due!(s, now(s))).toBe(true)
  s = atlas.tick!(s, now(s))
  expect(repair(s).media).toBe('workshop')
  expect(repair(s).status).toBe('scheduled')
  expect(s.handoffs.some(h => h.id === 'h-visual')).toBe(false)
  expect(s.log[0].text).toMatch(/^Picked “Annecy repair workshop”/)
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(repair(s).status).toBe('needs')
  expect(repair(s).media).toBeUndefined()
  expect(s.handoffs.some(h => h.id === 'h-visual')).toBe(true)
})

test('“I’ll upload one” holds the post; an upload for it schedules it with the new image', () => {
  let s = reducer(initialState(), { type: 'core/resolve', id: 'h-visual', decision: { kind: 'option', index: 1, option: 'I’ll upload one' } })
  expect(repair(s).waiting).toBe('visual')
  expect(waitingForVisual(s).map(p => p.id)).toEqual(['p-repair'])
  s = reducePublishing(s, { type: 'publishing/upload', post: 'p-repair', media: { id: 'md-u', name: 'data:image/jpeg;base64,AAA', title: 'Repair bench', tags: ['Upload'], rights: 'Fernway · uploaded by you', used: 0, added: '25 Nov' } })
  expect(repair(s).status).toBe('scheduled')
  expect(repair(s).media).toBe('data:image/jpeg;base64,AAA')
  expect(s.publishing.uploads[0].title).toBe('Repair bench')
  expect(waitingForVisual(s)).toEqual([])
})
