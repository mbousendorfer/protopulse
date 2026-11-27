import { expect, test } from 'vitest'
import { LIMIT } from './checks'
import { assetsOf, cropOf, insertAt, maxVisuals, mediaOf, missingOptions, optionsWith, plainOn, splitThread } from './composerModel'

test('a long caption splits into numbered X posts of 280 characters at most', () => {
  expect(splitThread('Short one.')).toEqual(['Short one.'])
  const long = Array.from({ length: 12 }, (_, i) => `Day ${i + 1} on the Tour du Mont Blanc was harder than the last one.`).join(' ')
  const parts = splitThread(long)
  expect(parts.length).toBeGreaterThan(1)
  parts.forEach((p, i) => { expect(p.length).toBeLessThanOrEqual(280); expect(p.endsWith(`${i + 1}/${parts.length}`)).toBe(true) })
  // Nothing is lost: every word is still there, in order.
  expect(parts.map(p => p.replace(/ \d+\/\d+$/, '')).join(' ')).toBe(long)
})

test('each network keeps its real caption limit', () => {
  expect(LIMIT.x).toBe(280)
  expect(LIMIT.instagram).toBe(2200)
  expect(LIMIT.linkedin).toBe(3000)
  expect(LIMIT.tiktok).toBe(2200)
})

test('`media` is always the first visual', () => {
  const assets = [{ src: 'pack', alt: 'The Ridge 28L' }, { src: 'trail' }]
  expect(mediaOf(assets)).toBe('pack')
  expect(mediaOf([])).toBeUndefined()
  expect(assetsOf({ media: 'lake' })).toEqual([{ src: 'lake' }])
  expect(assetsOf({ assets, media: 'pack' })).toBe(assets)
  expect(maxVisuals('instagram')).toBe(10)
  expect(maxVisuals('x')).toBe(4)
  expect(cropOf('instagram', 'reel')).toBe('9:16')
  expect(cropOf('linkedin', 'post')).toBeUndefined()
})

test('a YouTube post needs a title; a LinkedIn document needs one only as a document', () => {
  expect(missingOptions('youtube', 'video', {})).toEqual(['title'])
  expect(missingOptions('youtube', 'video', { title: 'Ridge 28L, 3 days' })).toEqual([])
  expect(missingOptions('linkedin', 'post', {})).toEqual([])
  expect(missingOptions('linkedin', 'document', {})).toEqual(['document title'])
  expect(optionsWith('tiktok').privacy).toBe('Public')
})

test('mentions and inserts', () => {
  expect(plainOn('@lea.hikes', ['instagram', 'x'])).toEqual(['x'])
  expect(insertAt('Packing the Ridge', 17, 17, '#Hiking')).toEqual({ value: 'Packing the Ridge #Hiking', caret: 25 })
  expect(insertAt('', 0, 0, '🎒').value).toBe('🎒')
})
