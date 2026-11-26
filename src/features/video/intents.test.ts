import { expect, test } from 'vitest'
import { initialState, type State } from '../../app/state'
import { reducer, type Action } from '../../app/reducer'
import { parse } from '../../data/command'
import { intentDef } from '../../app/agents-registry'
import { PHASES, PHASE_MS } from '../../data/video'
import { now } from '../../app/core'
import { bestClips, matchClip } from './intents'

const run = (s: State, ...actions: Action[]) => actions.reduce(reducer, s)
const later = (s: State, ms: number): State => ({ ...s, clock: { base: now(s) + ms, realAt: Date.now() } })
const chat = (s: State, q: string) => {
  const { intent } = parse(q)
  const def = intentDef(intent.kind)!
  const a = def.chat(intent as never, { s, chat: undefined as never, route: undefined as never })
  return { kind: intent.kind, text: a.replies[0].text, after: a.effects.reduce((x, f) => f(x), s) }
}

test('the four Juno questions reach Juno, not another agent', () => {
  expect(parse('Clip the best 3 moments about the strap').intent).toMatchObject({ kind: 'clipFind', query: 'strap', count: 3 })
  expect(parse('Why is this clip not going out?').intent.kind).toBe('clipWhy')
  expect(parse('Which clip did best last week?').intent.kind).toBe('clipBest')
  expect(parse('Make a LinkedIn version of this clip').intent).toMatchObject({ kind: 'clipVersion', network: 'linkedin' })
  expect(parse('Juno, clip the latest video').intent.kind).toBe('clip')
})

test('find: the moments land in Ready to review', () => {
  const r = chat(initialState(), 'Clip the best 2 moments about second-hand bags')
  expect(r.after.video.clips.filter(c => c.id.includes('-find')).length).toBeGreaterThan(0)
})

test('why: the hold reason is the one the clip row shows', () => {
  const s = run(later(run(initialState(), { type: 'core/fire', eventId: 'ev-video-gr20' }), PHASES.length * PHASE_MS + 1000), { type: 'core/heartbeat' })
  expect(chat(s, 'Why is the rain clip not going out?').text).toMatch(/“Three days of rain, still dry” is held: Hugo is on screen without a signed release/)
  expect(matchClip(s, 'why is the zips clip not going out')?.id).toBe('clip-live-zips')
})

test('best: same numbers as the Published group', () => {
  const s = initialState()
  const top = bestClips(s)[0]
  expect(top.id).toBe('clip-repair-brands')
  expect(chat(s, 'Which clip did best last week?').text).toMatch(/Most brands would sell you a new bag/)
})

test('a LinkedIn version adds the network when the length fits, and says why not otherwise', () => {
  const r = chat(initialState(), 'Make a LinkedIn version of the bottle clip')
  expect(r.text).toMatch(/Added a LinkedIn version of “Dented\? Still covered”/)
  expect(r.after.video.clips.find(c => c.id === 'clip-live-bottle')?.post.networks).toContain('linkedin')
  expect(chat(r.after, 'Make a LinkedIn version of the bottle clip').text).toMatch(/already has a LinkedIn version/)
})

test('hook trials in Chat: start one on a named clip, then ask which hook won', () => {
  const r = chat(initialState(), 'Trial the hooks of twenty minutes zero euros')
  expect(r.kind).toBe('clipTrial')
  expect(r.after.video.clips.find(c => c.id === 'clip-repair-twenty')?.status).toBe('trial')
  const s = run(later(r.after, 24 * 3600_000 + 1000), { type: 'core/heartbeat' })
  expect(chat(s, 'Which hook won on twenty minutes?').text).toMatch(/“42 stitches\. 20 minutes\. €0\.” won: \d+% still watching at 3 s/)
})

test('recut in Chat: the clip that did worse than usual gets a new cut', () => {
  const r = chat(initialState(), 'Recut the fabric clip')
  expect(r.kind).toBe('clipRecut')
  expect(r.text).toMatch(/“Fabric goes last” got 8\.4k views/)
  expect(r.after.video.clips.some(c => c.id === 'clip-live-fabric-recut')).toBe(true)
})
