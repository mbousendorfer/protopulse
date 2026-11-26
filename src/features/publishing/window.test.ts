import { expect, test } from 'vitest'
import { reducer } from '../../app/reducer'
import { initialState, type State } from '../../app/state'
import { now, setAutonomy } from '../../app/core'
import { MIN } from '../../app/time'
import atlas from './agent'
import { fillSoon, inWindow, WINDOW_TOPIC } from './window'
import { reducePublishing } from './slice'

const run = (s: State) => (atlas.due!(s, now(s)) ? atlas.tick!(s, now(s)) : s)
const actFill = (s = initialState()) => setAutonomy(s, 'atlas', 'atlas-fill', 'act')
const opt = (s: State, index: number) => {
  const h = s.handoffs.find(x => x.topic === WINDOW_TOPIC)!
  return reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'option', index, option: h.options![index].label } })
}

test('on Act, a post Atlas schedules alone opens a 10-minute window with a Stop card; on Draft it does not', () => {
  const s = run(fillSoon(actFill()))
  const [p] = inWindow(s)
  expect(p.alone?.why).toMatch(/Act/)
  const card = s.handoffs.find(h => h.topic === WINDOW_TOPIC)!
  expect(card.group).toBe('look')
  expect(card.title).toMatch(/^Going out in 10 min/)
  expect(card.options!.map(o => o.label)).toEqual(['Let it go out', 'Stop: wrong time', 'Stop: wrong words', 'Stop: not now'])

  const draft = run(fillSoon(initialState()))
  expect(inWindow(draft)).toHaveLength(0)
  expect(draft.handoffs.some(h => h.topic === WINDOW_TOPIC)).toBe(false)
})

test('Stop sends it back to drafts with the reason as a lesson; Undo puts it back in the window', () => {
  const s = run(fillSoon(actFill()))
  const id = inWindow(s)[0].id
  const stopped = opt(s, 2)
  const p = stopped.publishing.posts.find(x => x.id === id)!
  expect(p.status).toBe('draft')
  expect(p.note).toMatch(/wrong words/)
  expect(stopped.publishing.learned['stop:Wrong words']).toBe(1)
  const undone = run(reducer(stopped, { type: 'core/undo', id: stopped.log[0].id }))
  expect(undone.publishing.posts.find(x => x.id === id)!.status).toBe('scheduled')
  expect(undone.handoffs.some(h => h.topic === WINDOW_TOPIC && h.ref === id)).toBe(true)
})

test('let it go: no more card; the card leaves once the post is out', () => {
  const s = run(fillSoon(actFill()))
  const go = run(opt(s, 0))
  expect(go.handoffs.some(h => h.topic === WINDOW_TOPIC)).toBe(false)
  const later = { ...s, clock: { ...s.clock, base: s.clock.base + 11 * MIN } }
  expect(run(later).handoffs.some(h => h.topic === WINDOW_TOPIC)).toBe(false)
})

test('Pause all holds everything ahead, including what Atlas schedules meanwhile, until Sam resumes', () => {
  const s = reducePublishing(initialState(), { type: 'publishing/pauseAll' })
  const ahead = (x: State) => x.publishing.posts.filter(p => p.status === 'scheduled' && p.at > now(x))
  expect(ahead(s)).toHaveLength(0)
  expect(s.publishing.hold).toBeDefined()
  // Nothing auto-resumes, and a post Atlas adds is paused too.
  const added = run(fillSoon(actFill(s)))
  expect(ahead(added)).toHaveLength(0)
  // Undo restores everything; resume clears the hold.
  const undone = reducePublishing(s, { type: 'publishing/restore' })
  expect(undone.publishing.hold).toBeUndefined()
  expect(ahead(undone).length).toBeGreaterThan(0)
  const resumed = reducePublishing(s, { type: 'publishing/resumeAll' })
  expect(resumed.publishing.hold).toBeUndefined()
  expect(ahead(resumed).length).toBeGreaterThan(0)
  // Resuming from the Desk card, then undoing, keeps the hold.
  const card = s.handoffs.find(h => h.topic === 'Paused posts')!
  const viaDesk = reducer(s, { type: 'core/resolve', id: card.id, decision: { kind: 'option', index: 1, option: 'Resume all now' } })
  expect(viaDesk.publishing.hold).toBeUndefined()
  const back = run(reducer(viaDesk, { type: 'core/undo', id: viaDesk.log[0].id }))
  expect(back.publishing.hold).toBeDefined()
  expect(ahead(back)).toHaveLength(0)
})
