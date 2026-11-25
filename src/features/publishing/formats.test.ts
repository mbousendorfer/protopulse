import { expect, test } from 'vitest'
import { firstCommentFor, formatFor, withFormat } from './formats'

test('Atlas picks a format the network has', () => {
  expect(formatFor('instagram', 'Reel: rain test on the GR5.')).toBe('reel')
  expect(formatFor('instagram', 'Story poll: hut or tent?')).toBe('story')
  expect(formatFor('instagram', 'Carousel: 5 things we learned.')).toBe('carousel')
  expect(formatFor('youtube', 'Short: Summit Bottle, 12 hours hot.')).toBe('short')
  expect(formatFor('x', 'Reel: nope')).toBe('post')
  expect(formatFor('tiktok', 'Anything')).toBe('video')
})

test('a product post gets the size guide as first comment, only where the network allows one', () => {
  expect(firstCommentFor('instagram', 'Storm Jacket in Ember, back in stock.', 'Gear that lasts')).toMatch(/size-guide/)
  expect(firstCommentFor('tiktok', 'Storm Jacket in Ember.', 'Gear that lasts')).toBeUndefined()
  expect(firstCommentFor('linkedin', 'What a 4-day week taught our team.', 'Community')).toBeUndefined()
  expect(withFormat({ id: 'p', network: 'instagram', at: 0, text: 'x', status: 'draft', author: 'you', pillar: 'Community', format: 'story' }).format).toBe('story')
})

test('“Add a first comment with the size guide link” lands on the next product post', async () => {
  const { intentDef } = await import('../../app/agents-registry')
  const { initialState } = await import('../../app/state')
  const def = intentDef('firstComment')!
  const i = def.parse('add a first comment with the size guide link', { raw: 'Add a first comment with the size guide link' })!
  const s = initialState()
  const next = def.chat(i, { s, chat: {} as never, route: {} as never }).effects[0](s)
  const p = next.publishing.posts.find(x => x.firstComment?.includes('size-guide'))!
  expect(['instagram', 'facebook', 'linkedin']).toContain(p.network)
  expect(p.text).toMatch(/ridge|bottle|jacket|fleece/i)
})
