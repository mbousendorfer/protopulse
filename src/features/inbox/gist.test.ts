import { expect, test } from 'vitest'
import { gist } from './gist'

test('a row keeps the first sentence, or the first words', () => {
  expect(gist('Anna, it is: zips are repaired free for 5 years. Send the bag to our workshop.')).toBe('Anna, it is: zips are repaired free for 5 years.')
  expect(gist('Refunded €9.90 shipping. Done.')).toBe('Refunded €9.90 shipping.')
  expect(gist('one two three four five, six', 4)).toBe('one two three four…')
  expect(gist('Short')).toBe('Short')
})
