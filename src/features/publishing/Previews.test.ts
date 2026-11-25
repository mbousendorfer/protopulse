import { expect, test } from 'vitest'
import { cutAt, cutLines, short } from './Previews'

test('captions are cut where each network cuts them, never mid-word', () => {
  expect(cutAt('Short caption.', 115, 1)).toBe(-1)
  // Instagram: the first line break wins.
  expect(cutAt('Line one\nLine two', 115, 1)).toBe(8)
  // Character budget, then back to the last space.
  const long = 'word '.repeat(40)
  const i = cutAt(long, 115)
  expect(i).toBeLessThanOrEqual(115)
  expect(long[i]).toBe(' ')
  // TikTok leaves short captions alone.
  expect(cutAt('a'.repeat(84), 20, 3, 85)).toBe(-1)
})

test('LinkedIn counts rendered lines, blank ones included', () => {
  expect(cutLines('One\nTwo\nThree', 3, 46)).toBe(-1)
  expect(cutLines('One\n\nThree\nFour', 3, 46)).toBe('One\n\nThree'.length)
  const wrapped = cutLines(`${'word '.repeat(30)}`, 3, 46)
  expect(wrapped).toBeGreaterThan(0)
  expect(wrapped).toBeLessThanOrEqual(3 * 46)
})

test('counts use the networks’ short form', () => {
  expect(short(999)).toBe('999')
  expect(short(12_400)).toBe('12.4K')
  expect(short(210_000)).toBe('210K')
  expect(short(1_250_000)).toBe('1.3M')
})
