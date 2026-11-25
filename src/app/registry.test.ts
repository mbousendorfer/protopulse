import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialState } from './state'
import { reducer } from './reducer'
import { registry, scriptEvents } from './agents-registry'
import type { AgentModule } from './agent-module'

// The feed as it played when every event lived in one array in src/data/script.ts.
const BEFORE = [
  'ev-colour', 'ev-spike', 'ev-video-gr20', 'ev-recycle', 'ev-idea-signal', 'ev-stove', 'ev-linkedin', 'ev-video-captions', 'ev-trailkind',
  'ev-idea-urgent', 'ev-german', 'ev-fill', 'ev-promo-exchange', 'ev-trail-goal', 'ev-google', 'ev-idea-gap', 'ev-demote', 'ev-norro',
  'ev-rule-emoji', 'ev-x-fail', 'ev-intent', 'ev-trend-repair', 'ev-basecamp', 'ev-idea-weekly', 'ev-collab', 'ev-pillar', 'ev-rule-tiktok',
]

/** Wraps one hook of every module that has it in a spy, restored after the test. */
const restore: (() => void)[] = []
function spyOn<K extends 'onResolve' | 'onUndo' | 'tick'>(hook: K) {
  return registry().filter(m => m[hook]).map(m => {
    const original = m[hook]!
    const spy = vi.fn(original as (...a: unknown[]) => unknown)
    ;(m as AgentModule)[hook] = spy as never
    restore.push(() => { (m as AgentModule)[hook] = original })
    return { id: m.id, spy }
  })
}
afterEach(() => { restore.splice(0).forEach(f => f()) })

describe('agent registry', () => {
  it('plays the script in the same order as before the split (new events slot in by `order`)', () => {
    expect(scriptEvents().map(e => e.id).filter(id => BEFORE.includes(id))).toEqual(BEFORE)
  })

  it('every agent has a module, and event ids are unique', () => {
    expect(registry().map(m => m.id)).toEqual(['nova', 'atlas', 'iris', 'echo', 'sage', 'juno'])
    const ids = scriptEvents().map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('calls every onResolve when a card is settled, and every onUndo when it is undone', () => {
    const resolves = spyOn('onResolve')
    const undos = spyOn('onUndo')
    expect(resolves.length).toBe(6)
    let s = reducer(initialState(), { type: 'core/resolve', id: 'h-plan', decision: { kind: 'approve' } })
    for (const r of resolves) expect(r.spy, r.id).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'h-plan' }), { kind: 'approve' })
    const line = s.log.find(l => l.restore?.some(h => h.id === 'h-plan'))!
    s = reducer(s, { type: 'core/undo', id: line.id })
    expect(undos.length).toBeGreaterThan(0)
    for (const u of undos) expect(u.spy, u.id).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: line.id }))
    expect(s.handoffs.some(h => h.id === 'h-plan')).toBe(true)
  })

  it('ticks every agent on the heartbeat, and the store wakes it when one is due', () => {
    const ticks = spyOn('tick')
    // Agents add their own clocks: only check the original ones are still there.
    expect(ticks.map(t => t.id)).toEqual(expect.arrayContaining(['atlas', 'juno']))
    reducer(initialState(), { type: 'core/heartbeat' })
    for (const t of ticks) expect(t.spy, t.id).toHaveBeenCalledTimes(1)
    // A video in processing is due once its phases are over.
    let s = reducer(initialState(), { type: 'core/fire', eventId: 'ev-video-gr20' })
    const later = s.clock.base + 10 * 60_000
    expect(registry().some(m => m.due?.(s, later))).toBe(true)
    s = reducer({ ...s, clock: { base: later, realAt: Date.now() } }, { type: 'core/heartbeat' })
    expect(s.video.sources.find(x => x.id === 'gr20')!.status).toBe('ready')
  })

  it('custom events run their own code, and a scenario keeps what each agent asks for', () => {
    const s = reducer(initialState(), { type: 'core/fire', eventId: 'ev-idea-weekly' })
    expect(s.publishing.ideas.length).toBeGreaterThan(initialState().publishing.ideas.length)
    const calm = reducer(initialState(), { type: 'core/reset', preset: 'calm' })
    expect(calm.handoffs.map(h => h.id).sort()).toEqual(['h-plan', 'h-report', 'h-strap', 'h-tiktok'])
  })
})
