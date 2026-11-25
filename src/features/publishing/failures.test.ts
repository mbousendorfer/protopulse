import { expect, test } from 'vitest'
import { reducer } from '../../app/reducer'
import { initialState } from '../../app/state'
import { setAutonomy } from '../../app/core'
import { SCRIPT } from './script'
import { PLAIN_LINK, SHORT_LINK, failureCardOf } from './failures'

const fire = (s = initialState()) => SCRIPT.find(e => e.id === 'ev-x-fail')!.run!(s, true)
const failedOf = (s: ReturnType<typeof initialState>) => s.publishing.posts.find(p => p.network === 'x' && p.failure)

test('X refuses a post: it turns Failed with the cause and a card with three fixes; no second one stacks', () => {
  const s = fire()
  const p = s.publishing.posts.find(x => x.status === 'failed')!
  expect(p.failure!.text).toMatch(/possible redirect/)
  const card = failureCardOf(s, p.id)!
  expect(card.options!.map(o => o.label)).toEqual(['Retry with a plain link', 'Publish without the link', 'Skip X today'])
  expect(fire(s).publishing.posts.filter(x => x.status === 'failed').length).toBe(1)
})

test('each option does what it says, from the Desk or the post', () => {
  const s = fire()
  const p = s.publishing.posts.find(x => x.status === 'failed')!
  const id = failureCardOf(s, p.id)!.id
  const fix = reducer(s, { type: 'core/resolve', id, decision: { kind: 'option', index: 0, option: 'Retry with a plain link' } })
  const fixed = fix.publishing.posts.find(x => x.id === p.id)!
  expect(fixed.status).toBe('published')
  expect(fixed.text).toContain(PLAIN_LINK)
  expect(fixed.text).not.toContain(SHORT_LINK)
  const bare = reducer(s, { type: 'publishing/retry', id: p.id, mode: 'nolink' })
  expect(bare.publishing.posts.find(x => x.id === p.id)!.text).not.toMatch(/fwy|fernway\.co/)
  expect(failureCardOf(bare, p.id)).toBeUndefined()
  const skip = reducer(s, { type: 'core/resolve', id, decision: { kind: 'option', index: 2, option: 'Skip X today' } })
  expect(skip.publishing.posts.find(x => x.id === p.id)!.status).toBe('draft')
})

test('on Act, Atlas retries with the plain link alone; Undo puts the post back as Failed with its card', () => {
  let s = setAutonomy(initialState(), 'atlas', 'atlas-retry', 'act')
  s = fire(s)
  const p = failedOf(s) ?? s.publishing.posts.find(x => x.network === 'x' && x.text.includes(PLAIN_LINK))!
  expect(s.publishing.posts.find(x => x.id === p.id)!.status).toBe('published')
  expect(s.log[0].text).toMatch(/retried with fernway\.co\/trail-week/)
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(s.publishing.posts.find(x => x.id === p.id)!.status).toBe('failed')
  expect(failureCardOf(s, p.id)).toBeDefined()
})

test('switching retries to Act settles an open failure the same way', () => {
  let s = fire()
  s = reducer(s, { type: 'core/autonomy', agent: 'atlas', action: 'atlas-retry', level: 'act' })
  expect(s.publishing.posts.find(x => x.network === 'x' && x.text.includes(PLAIN_LINK))!.status).toBe('published')
})
