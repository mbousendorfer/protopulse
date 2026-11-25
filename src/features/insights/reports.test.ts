import { describe, expect, it } from 'vitest'
import { initialState, type State } from '../../app/state'
import { reducer } from '../../app/reducer'
import { startClock } from '../../app/time'
import { now } from '../../app/core'
import { reportList } from './reports'

const skip = (s: State) => reducer(reducer(s, { type: 'core/skipDay' }), { type: 'core/heartbeat' })
const later = (s: State, ms: number) => reducer({ ...s, clock: startClock(now(s) + ms) }, { type: 'core/heartbeat' })
const level = (s: State, action: string, lvl: 'suggest' | 'draft' | 'act') => reducer(s, { type: 'core/autonomy', agent: 'iris', action, level: lvl })

describe('Iris writes her reports from the state', () => {
  it('Skip to tomorrow brings a new morning brief, written from the Desk and the anomalies', () => {
    const s = skip(initialState())
    const top = reportList(s)[0]
    expect(top.id).toBe('brief-2025-11-26')
    expect(top.summary).toMatch(/anomal(y is|ies are) open/)
    expect(skip(s).insights.reports.filter(r => r.kind === 'brief')).toHaveLength(2)
  })

  it('on Draft the brief waits on the Desk; approving it publishes it', () => {
    const s = skip(level(initialState(), 'iris-brief', 'draft'))
    expect(s.insights.reports[0].draft).toBe(true)
    const card = s.handoffs.find(h => h.topic === 'Brief')!
    const done = reducer(s, { type: 'core/resolve', id: card.id, decision: { kind: 'approve' } })
    expect(done.insights.reports[0].draft).toBe(false)
  })

  it('on Monday the weekly report is written; approved, Claire reads it and her answer is kept', () => {
    let s = initialState()
    for (let i = 0; i < 6; i++) s = skip(s) // Tue 25 → Mon 1 Dec
    const weekly = s.insights.reports.find(r => r.kind === 'weekly')!
    expect(weekly.sections.some(x => x.chart === 'pillars')).toBe(true)
    const card = s.handoffs.find(h => h.ref === weekly.id && !h.lane)!
    s = reducer(s, { type: 'core/resolve', id: card.id, decision: { kind: 'approve' } })
    expect(s.insights.shared[weekly.id]).toBeDefined()
    expect(s.handoffs.some(h => h.lane === 'claire' && h.ref === weekly.id)).toBe(true)
    s = later(s, 60_000)
    expect(s.insights.shared[weekly.id].reply).toMatch(/Clear, thanks/)
  })

  it('sharing from Insights goes through Claire too', () => {
    let s = reducer(initialState(), { type: 'insights/share', id: 'w44', title: 'Weekly report · 27 October – 2 November' })
    expect(s.handoffs.some(h => h.id === 'h-share-w44' && h.lane === 'claire')).toBe(true)
    s = later(s, 60_000)
    expect(s.insights.shared.w44.reply).toBeDefined()
  })
})
