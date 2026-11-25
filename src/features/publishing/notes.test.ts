import { expect, test } from 'vitest'
import { reducer } from '../../app/reducer'
import { initialState, type State } from '../../app/state'
import { setAutonomy } from '../../app/core'
import { T } from '../../app/time'
import { reducePublishing } from './slice'
import { onQuietDays, startOfDay } from './notes'
import { SCRIPT } from './script'

const fri = T(0, 0, 3) // Fri 28 Nov
const quiet = (s: State) => reducePublishing(s, { type: 'publishing/noteAdd', day: fri + 3_600_000, text: 'Bank holiday', quiet: true })

test('a plain note is just a note; Trail Week’s note is there from the start', () => {
  const s = reducePublishing(initialState(), { type: 'publishing/noteAdd', day: fri, text: 'Shoot at the workshop', quiet: false })
  expect(s.publishing.notes.length).toBe(2)
  expect(s.handoffs.some(h => h.topic === 'Quiet day')).toBe(false)
})

test('a quiet day on Act (moving posts is on Act): Atlas moves Friday’s posts, Undo puts them back', () => {
  const before = initialState().publishing.posts.filter(p => startOfDay(p.at) === fri && p.status === 'scheduled').length
  expect(before).toBeGreaterThan(0)
  let s = quiet(initialState())
  expect(onQuietDays(s).length).toBe(0)
  expect(s.log[0].text).toMatch(/^Moved \d post/)
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(onQuietDays(s).length).toBe(before)
})

test('a quiet day on Draft: a card asks; Keep them leaves them', () => {
  let s = quiet(setAutonomy(initialState(), 'atlas', 'atlas-slot', 'draft'))
  const card = s.handoffs.find(h => h.topic === 'Quiet day')!
  expect(card.title).toMatch(/quiet day: “Bank holiday”/)
  s = reducer(s, { type: 'core/resolve', id: card.id, decision: { kind: 'option', index: 1, option: 'Keep them' } })
  expect(onQuietDays(s).length).toBeGreaterThan(0)
})

test('Atlas places nothing on a quiet day: queues skip it, removing the note frees it', () => {
  let s = reducePublishing(initialState(), { type: 'publishing/noteAdd', day: T(0, 0, 7), text: 'Strike', quiet: true }) // Tue 2 Dec
  s = SCRIPT.find(e => e.id === 'ev-queue')!.run!(s, true)
  expect(s.publishing.posts.some(p => p.queue === 'q-tips' && startOfDay(p.at) === T(0, 0, 7))).toBe(false)
  s = reducePublishing(s, { type: 'publishing/noteRemove', id: s.publishing.notes.at(-1)!.id })
  s = SCRIPT.find(e => e.id === 'ev-queue')!.run!(s, true)
  expect(s.publishing.posts.some(p => p.queue === 'q-tips' && startOfDay(p.at) === T(0, 0, 7))).toBe(true)
})
