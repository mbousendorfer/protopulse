import { expect, test } from 'vitest'
import { captionOf, commentOf, query, track } from './links'

test('Atlas tracks a link by convention; X keeps the plain link; Instagram puts it in the first comment', () => {
  const ig = track('https://fernway.co/trail-week/', { network: 'instagram', campaign: 'Trail Week', pillar: 'Trail stories' })!
  expect(ig.url).toBe('fernway.co/trail-week')
  expect(query(ig)).toBe('utm_source=instagram&utm_medium=social&utm_campaign=trail-week')
  expect(ig.short).toBe('fwy.link/tw-ig')
  const x = track('fernway.co/trail-week', { network: 'x', pillar: 'Repair & care' })!
  expect(x.short).toBeUndefined()
  expect(x.utm!.utm_campaign).toBe('repair-and-care')
  expect(captionOf({ text: 'Go.', network: 'x', link: x })).toBe('Go. fernway.co/trail-week')
  expect(captionOf({ text: 'Go.', network: 'instagram', link: ig })).toBe('Go.')
  expect(commentOf({ network: 'instagram', link: ig, firstComment: 'Sizes: fernway.co/size-guide' })).toBe('Sizes: fernway.co/size-guide · fwy.link/tw-ig')
  expect(track('  ', { network: 'x', pillar: 'Community' })).toBeUndefined()
})
