import { expect, test } from 'vitest'
import { reducer } from '../../app/reducer'
import { initialState, type State } from '../../app/state'
import { now, setAutonomy } from '../../app/core'
import atlas from './agent'
import { RESULT_TOPIC, TEST_RULE, TEST_TOPIC, proposeTest, resultsIn, testPosts, verdict } from './tests'

const run = (s: State) => (atlas.due!(s, now(s)) ? atlas.tick!(s, now(s)) : s)
const card = (s: State, topic: string) => s.handoffs.find(h => h.topic === topic)!
const approve = (s: State, topic: string) => reducer(s, { type: 'core/resolve', id: card(s, topic).id, decision: { kind: 'approve' } })

test('the verdict names a winner only past 20% more saves', () => {
  expect(verdict({ reach: 9100, saves: 412 }, { reach: 8800, saves: 258 }).text).toMatch(/question opening got 1.6× more saves \(412 vs 258\)/)
  expect(verdict({ reach: 9100, saves: 300 }, { reach: 8800, saves: 270 }).winner).toBeUndefined()
})

test('Draft: a card with both versions; approving schedules the pair, Undo takes it back out', () => {
  const s = proposeTest(initialState())
  const h = card(s, TEST_TOPIC)
  expect(h.group).toBe('need')
  expect(h.preview?.type).toBe('pair')
  const on = approve(s, TEST_TOPIC)
  const pair = testPosts(on)
  expect(pair.map(p => p.test!.side)).toEqual(['a', 'b'])
  expect(pair.every(p => p.status === 'scheduled' && p.media === 'pack')).toBe(true)
  expect(new Date(pair[0].at).getHours()).toBe(new Date(pair[1].at).getHours())
  expect(testPosts(reducer(on, { type: 'core/undo', id: on.log[0].id }))).toHaveLength(0)
  // One test at a time.
  expect(proposeTest(on)).toBe(on)
})

test('Act: both scheduled alone; results come in, the rule is offered, Yes adds it and Undo removes it', () => {
  const s = proposeTest(setAutonomy(initialState(), 'atlas', 'atlas-test', 'act'))
  expect(s.handoffs.some(h => h.topic === TEST_TOPIC)).toBe(false)
  expect(testPosts(s).every(p => p.alone)).toBe(true)
  const r = run(resultsIn(s))
  expect(testPosts(r).every(p => p.status === 'published' && p.stats?.saves && p.at < now(r))).toBe(true)
  const res = card(r, RESULT_TOPIC)
  expect(res.title).toBe('The question opening won')
  expect(res.action).toBeUndefined() // never settled by Act: rules are Sam's
  const yes = reducer(r, { type: 'core/resolve', id: res.id, decision: { kind: 'option', index: 0, option: res.options![0].label } })
  expect(yes.playbook.rules.some(x => x.text === TEST_RULE && x.kind === 'do')).toBe(true)
  const undone = reducer(yes, { type: 'core/undo', id: yes.log[0].id })
  expect(undone.playbook.rules.some(x => x.text === TEST_RULE)).toBe(false)
})

test('asked from the command bar, Atlas proposes the test once', async () => {
  const { intentDef } = await import('../../app/agents-registry')
  const def = intentDef('tryTwo')!
  expect(def.parse('try two openings on instagram', { forced: undefined, raw: 'try two openings on instagram' } as never)).toEqual({ kind: 'tryTwo' })
  const s = reducer(initialState(), { type: 'publishing/tryTwo' })
  expect(s.handoffs.filter(h => h.topic === TEST_TOPIC)).toHaveLength(1)
  expect(reducer(s, { type: 'publishing/tryTwo' }).handoffs.filter(h => h.topic === TEST_TOPIC)).toHaveLength(1)
})
