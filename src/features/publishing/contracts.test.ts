import { expect, test } from 'vitest'
import { initialState } from '../../app/state'
import { now } from '../../app/core'
import { BEST_SLOT, type Post } from '../../data/publishing'
import { holdToday, publishDue, receivePosts, releaseToday, withdrawPosts } from './slice'
import { applyInstruction, makeIdea, namesCompetitor } from './ideasModel'
import { intentDef } from '../../app/agents-registry'
import { IDEA_SEEDS } from '../../data/ideas'

const s0 = initialState()
const camp: Post = { id: 'c-1', network: 'instagram', at: now(s0) + 3 * 86_400_000, text: 'Summit Bottle, March launch.', status: 'scheduled', author: 'atlas', pillar: 'Gear that lasts', campaignId: 'c', campaign: 'Launch', labels: ['Launch'] }

test('Sage: campaign posts enter and leave the calendar; a published post is never touched', () => {
  let s = receivePosts(s0, [camp], 'sage')
  expect(s.publishing.posts.find(p => p.id === 'c-1')!.firstComment).toMatch(/size-guide/)
  s = receivePosts(s, [{ ...camp, text: 'Retitled.' }], 'sage')
  expect(s.publishing.posts.filter(p => p.id === 'c-1').length).toBe(1)
  expect(s.publishing.posts.find(p => p.id === 'c-1')!.text).toBe('Retitled.')
  const pub = s.publishing.posts.find(p => p.status === 'published')!
  expect(withdrawPosts(s, ['c-1', pub.id]).publishing.posts.some(p => p.id === pub.id)).toBe(true)
  expect(withdrawPosts(s, ['c-1']).publishing.posts.some(p => p.id === 'c-1')).toBe(false)
})

test('Echo: holdToday pauses the next 24 hours, releaseToday puts them back', () => {
  const held = holdToday(s0, 'Echo’s negative spike')
  const ids = held.publishing.posts.filter(p => p.status === 'paused').map(p => p.id)
  expect(ids.length).toBeGreaterThan(0)
  expect(holdToday(held, 'again').publishing.posts.filter(p => p.status === 'paused').length).toBe(ids.length)
  expect(releaseToday(held).publishing.posts.filter(p => ids.includes(p.id)).every(p => p.status === 'scheduled')).toBe(true)
})

test('Juno: a scheduled post whose time has come is published', () => {
  const p = s0.publishing.posts.find(x => x.status === 'scheduled')!
  const s = publishDue(s0, p.at)
  expect(s.publishing.posts.find(x => x.id === p.id)!.status).toBe('published')
})

test('Echo: a competitor added in Listening is recognised', () => {
  expect(namesCompetitor('Better than Wildroot', ['Wildroot'])).toBe(true)
  expect(namesCompetitor('Better than Wildroot')).toBe(false)
  const idea = makeIdea(Object.values(IDEA_SEEDS)[0], 'weekly', now(s0))
  const r = applyInstruction(idea, 'compare it with Wildroot', { now: now(s0), posts: s0.publishing.posts, competitors: ['Wildroot'] })
  expect(r.changed).toBe(false)
  expect(r.reply).toMatch(/Wildroot/)
})

test('Iris: Atlas reads her best time; a TikTok post lands on Thursday 18:30', () => {
  expect(BEST_SLOT.tiktok).toMatchObject({ time: '18:30', dayName: 'Thursday' })
  const i = intentDef('post')!.parse('write a tiktok post about the ridge', { raw: '' }) as { slot: string }
  expect(i.slot).toBe('Thu 27, 18:30')
})

test('Sage: a new pillar works everywhere Atlas reads one, through its family', async () => {
  const { pillarFamily } = await import('../../data/publishing')
  const { variantsOf } = await import('./copilot')
  const { pickVisual } = await import('./visuals')
  expect(pillarFamily('Gift ideas')).toBe('Gear that lasts')
  expect(pillarFamily('Repair & care')).toBe('Repair & care')
  const v = variantsOf('A gift that lasts.', { pillar: 'Gift ideas', network: 'instagram', words: [], rules: [] })
  expect(v[0].text.startsWith('Would you still trust it')).toBe(true)
  const s = initialState()
  expect(pickVisual({ ...s.publishing.posts[0], pillar: 'Gift ideas', text: 'Ridge for Christmas' }, (await import('../../data/publishing')).MEDIA, now(s))).toBeDefined()
})
