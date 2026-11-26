import { describe, expect, it } from 'vitest'
import { initialState } from '../../app/state'
import { reducer } from '../../app/reducer'
import { FERNWAY_ROW } from '../../data/listening'
import { benchmarkRows } from './benchmark'
import { answer } from './slice'
import { DEFAULT_SECTIONS, parseEdits, writeStudio } from './studio'

describe('Benchmark', () => {
  it('puts Iris’s Fernway numbers next to the competitors Echo tracks', () => {
    const s = initialState()
    const rows = benchmarkRows(s)
    expect(rows[0]).toMatchObject({ name: 'Fernway', followers: FERNWAY_ROW.followers, er: FERNWAY_ROW.er, us: true })
    const paused = { ...s, listening: { ...s.listening, watch: s.listening.watch.map(w => (w.id === 'peakline' ? { ...w, tracking: false } : w)) } }
    expect(benchmarkRows(paused).some(r => r.id === 'peakline')).toBe(false)
  })

  it('“add the benchmark” adds the section; the follow-up answer reads the same rows', () => {
    const s = initialState()
    const r = writeStudio(s, { days: 30, networks: [], audience: 'claire', sections: DEFAULT_SECTIONS }, 'r1', 0)
    expect(parseEdits('add the benchmark', r).ops).toEqual([{ op: 'add', kind: 'benchmark' }])
    const pk = benchmarkRows(s).find(x => x.id === 'peakline')!
    expect(answer('How are we doing against Peakline?', s)).toContain(`Peakline ${pk.sov}%`)
    const asked = reducer(s, { type: 'insights/ask', report: 'w47', q: 'How are we doing against Peakline?' })
    expect(asked.insights.followUps[0].a).toContain(`Peakline ${pk.sov}%`)
  })
})
