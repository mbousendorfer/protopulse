import { describe, expect, it } from 'vitest'
import { initialState } from '../../app/state'
import { parse } from '../../data/command'
import { kpi } from './metrics'
import { roiByNetwork, roiTotals } from './roi'
import { parseEdits, writeStudio, DEFAULT_SECTIONS } from './studio'

describe('Social Media ROI', () => {
  it('starts from Explore’s link clicks, network by network', () => {
    const t = roiTotals(roiByNetwork(30))
    expect(Math.abs(t.clicks - kpi('clicks', 30).value)).toBeLessThan(5)
    expect(t.sessions).toBeLessThan(t.clicks)
    expect(t.revenue).toBeGreaterThan(0)
    expect(parse('Which network brings sales?').intent.kind).toBe('roi')
  })

  it('“add the website results” adds the ROI section to a report', () => {
    const s = initialState()
    const r = writeStudio(s, { days: 30, networks: [], audience: 'claire', sections: DEFAULT_SECTIONS }, 'r1', 0)
    expect(parseEdits('add the website results', r).ops).toEqual([{ op: 'add', kind: 'roi' }])
  })
})
