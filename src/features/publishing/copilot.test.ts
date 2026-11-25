import { expect, test } from 'vitest'
import { initialState } from '../../app/state'
import { variantsOf } from './copilot'

const rules = initialState().playbook.rules

test('variants come from the text and its pillar, not a fixed story', () => {
  const v = variantsOf('Our repair programme in numbers: 1,200 bags fixed this year. Every one came back to a trail.', { pillar: 'Repair & care', network: 'linkedin', words: [], rules })
  expect(v.map(x => x.label)).toEqual(['Question hook · Repair & care', 'Number first', 'Shorter'])
  expect(v[0].text.startsWith('Repair or replace? Our repair programme')).toBe(true)
  expect(v[1].text).toBe('1,200 bags fixed this year. Every one came back to a trail.')
  expect(v.every(x => !/GR20|Chamonix/.test(x.text))).toBe(true)
})

test('the Playbook applies to every variant and says so', () => {
  const v = variantsOf('Cheap gear breaks 😬🏔️ Ours gets repaired.', { pillar: 'Gear that lasts', network: 'instagram', words: ['cheap'], rules })
  for (const x of v) {
    expect(x.text.toLowerCase()).not.toContain('cheap')
    expect((x.text.match(/\p{Extended_Pictographic}/gu) ?? []).length).toBeLessThanOrEqual(1)
  }
  expect(v[0].applied).toContain('One emoji max')
})

test('a one-line caption still gets distinct variants, and no variant repeats the original', () => {
  const t = 'Storm Jacket in Ember, back in stock.'
  const v = variantsOf(t, { pillar: 'Gear that lasts', network: 'instagram', words: [], rules })
  expect(new Set(v.map(x => x.text)).size).toBe(v.length)
  expect(v.some(x => x.text === t)).toBe(false)
  expect(v.length).toBeGreaterThanOrEqual(2)
})
