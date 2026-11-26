import { expect, test } from 'vitest'
import { groupOf } from '../../app/reducer'
import { initialState } from '../../app/state'
import { SCRIPT } from './script'
import { atlasNeeds, gestureOf } from './Needs'

test('Publishing landing: the Needs you block holds exactly what the rail badge counts, each card in one gesture group', () => {
  const s = SCRIPT.find(e => e.id === 'ev-x-fail')!.run!(initialState(), true)
  // Same filter as the Shell's rail badge for Atlas.
  const rail = s.handoffs.filter(h => !h.lane && groupOf(h) === 'need' && h.agent === 'atlas')
  expect(atlasNeeds(s.handoffs).map(h => h.id)).toEqual(rail.map(h => h.id))
  const by = Object.fromEntries(atlasNeeds(s.handoffs).map(h => [h.id, gestureOf(h)]))
  expect(by['h-plan']).toBe('plan')
  expect(by['h-trend']).toBe('approve')
  expect(by['h-code']).toBe('answer')
  expect(by['h-visual']).toBe('answer')
  expect(Object.values(by)).toContain('fix')
})
