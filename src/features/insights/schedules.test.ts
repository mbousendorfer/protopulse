import { describe, expect, it } from 'vitest'
import { initialState, type State } from '../../app/state'
import { reducer } from '../../app/reducer'
import { parse } from '../../data/command'
import { T } from '../../app/time'
import { DEFAULT_SECTIONS } from './studio'
import { nextRun } from './reports'

const recipe = { days: 30, networks: ['instagram' as const], audience: 'claire' as const, sections: DEFAULT_SECTIONS }
const plan = (s: State, extra: Partial<{ to: 'claire' | 'sam' }> = {}) => reducer(s, { type: 'insights/schedule', name: 'Monthly for Claire', recipe, every: 'week', to: 'claire', via: 'test', ...extra })
const toMonday = (s: State) => { for (let i = 0; i < 6; i++) s = reducer(reducer(s, { type: 'core/skipDay' }), { type: 'core/heartbeat' }); return s }
const level = (s: State, lvl: 'suggest' | 'draft' | 'act') => reducer(s, { type: 'core/autonomy', agent: 'iris', action: 'iris-report', level: lvl })
const sent = (s: State) => s.insights.reports.find(r => r.title === 'Monthly for Claire')

describe('Scheduled reports', () => {
  it('“Send it to Claire every Monday” is a schedule, and the next run is Monday 08:00', () => {
    expect(parse('Send it to Claire every Monday').intent).toMatchObject({ kind: 'schedule', every: 'week', to: 'claire' })
    const s = plan(initialState())
    expect(nextRun(s.insights.schedules[0], s.clock.base)).toBe(T(8, 0, 6))
  })

  it('on Draft, Monday’s report waits on the Desk, then goes to Claire', () => {
    let s = toMonday(plan(initialState()))
    const r = sent(s)!
    const card = s.handoffs.find(h => h.ref === r.id && !h.lane)!
    expect(card.title).toMatch(/ready to send to Claire/)
    s = reducer(s, { type: 'core/resolve', id: card.id, decision: { kind: 'approve' } })
    expect(s.handoffs.some(h => h.id === `h-share-${r.id}` && h.lane === 'claire')).toBe(true)
  })

  it('on Act, Iris sends it herself; Undo takes it back', () => {
    let s = toMonday(plan(level(initialState(), 'act')))
    const r = sent(s)!
    expect(s.insights.shared[r.id]).toBeDefined()
    const line = s.log.find(l => l.unshare === r.id)!
    s = reducer(s, { type: 'core/undo', id: line.id })
    expect(s.insights.shared[r.id]).toBeUndefined()
    expect(s.handoffs.some(h => h.id === `h-share-${r.id}`)).toBe(false)
  })

  it('a paused schedule writes nothing, and runs once a day only', () => {
    let s = plan(initialState())
    s = reducer(s, { type: 'insights/schedulePause', id: s.insights.schedules[0].id })
    expect(sent(toMonday(s))).toBeUndefined()
    const on = toMonday(plan(initialState()))
    expect(on.insights.reports.filter(r => r.title === 'Monthly for Claire')).toHaveLength(1)
    expect(reducer(on, { type: 'core/heartbeat' }).insights.reports.filter(r => r.title === 'Monthly for Claire')).toHaveLength(1)
  })
})
