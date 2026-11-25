import { describe, expect, it } from 'vitest'
import { BEST_CELL } from '../../data/insights'
import { bestTime, formats, heat, kpi, kpis, rangeKpis, tiktokViews, type SocialNet } from './metrics'
import { answer } from './slice'

describe('Iris numbers', () => {
  it('finds each network’s best slot from its own heatmap', () => {
    for (const n of Object.keys(BEST_CELL) as SocialNet[]) {
      const b = bestTime(n)
      expect([b.day, b.col]).toEqual([BEST_CELL[n].day, BEST_CELL[n].col])
      expect(heat(n)[b.day][b.col]).toBe(1)
    }
  })

  it('weights all networks by reach, so Instagram’s Friday evening wins', () => {
    const b = bestTime('all')
    expect([b.dayName, b.window, b.time]).toEqual(['Friday', '18:00 – 20:00', '18:30'])
  })

  it('derives the TikTok dip and the format ratios instead of typing them', () => {
    expect(tiktokViews()).toMatchObject({ now: 1840, before: 2970, delta: -38 })
    expect(formats()).toMatchObject({ reachX: 2.4, savesX: 1.8 })
  })

  it('answers follow-ups with the same numbers as Explore', () => {
    expect(answer('Reels or carousels?')).toContain('1.8× the saves')
    expect(answer('Reels or carousels?')).toContain('2.4× the reach')
    expect(answer('Why did TikTok drop?')).toContain('2,970 to 1,840')
    expect(answer('Best time to post?')).toContain('Friday 18:00 – 20:00')
    expect(answer('How is reach growing?')).toContain(`${Math.round(kpi('reach').value / 1000)}k`)
  })

  it('a custom range follows daily reach in its window, rates stay those of the base period', () => {
    expect(rangeKpis({ days: 7, offset: 0 }, 'all')).toEqual(kpis(7, 'all'))
    const two = rangeKpis({ days: 14, offset: 0 }, 'all'), month = kpis(30, 'all')
    const reach = two.find(k => k.key === 'reach')!.value
    expect(reach).toBeGreaterThan(kpi('reach').value)
    expect(reach).toBeLessThan(month.find(k => k.key === 'reach')!.value)
    expect(two.find(k => k.key === 'er')!.value).toBe(month.find(k => k.key === 'er')!.value)
  })
})
