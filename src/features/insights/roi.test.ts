import { describe, expect, it } from 'vitest'
import { initialState } from '../../app/state'
import { reducer } from '../../app/reducer'
import { parse } from '../../data/command'
import { kpi } from './metrics'
import { bestReturn, roiByNetwork, roiTotals } from './roi'
import { parseEdits, writeStudio, DEFAULT_SECTIONS } from './studio'

describe('Social Media ROI', () => {
  it('starts from Explore’s link clicks, network by network', () => {
    const t = roiTotals(roiByNetwork(30))
    expect(Math.abs(t.clicks - kpi('clicks', 30).value)).toBeLessThan(5)
    expect(t.sessions).toBeLessThan(t.clicks)
    expect(t.revenue).toBeGreaterThan(0)
    expect(parse('Which network brings sales?').intent.kind).toBe('roi')
  })

  it('Trail Week returns most per boost euro, counting this month’s boosts; Sage gets it as a fact, Undo removes it', () => {
    const s0 = initialState()
    expect(bestReturn(s0)!.fact).toBe('Trail Week returns €20.0 per boost euro (€5,600 for €280 of boosts)')
    let s = reducer(s0, { type: 'insights/tellSage', via: 'test' })
    expect(s.playbook.rules.some(r => r.text === bestReturn(s0)!.fact && r.agents.includes('sage'))).toBe(true)
    s = reducer(s, { type: 'core/undo', id: s.log[0].id })
    expect(s.playbook.rules.some(r => r.text === bestReturn(s0)!.fact)).toBe(false)
  })

  it('“add the website results” adds the ROI section to a report', () => {
    const s = initialState()
    const r = writeStudio(s, { days: 30, networks: [], audience: 'claire', sections: DEFAULT_SECTIONS }, 'r1', 0)
    expect(parseEdits('add the website results', r).ops).toEqual([{ op: 'add', kind: 'roi' }])
  })
})
