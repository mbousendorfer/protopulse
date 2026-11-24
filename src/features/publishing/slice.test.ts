import { expect, test } from 'vitest'
import { initialState } from '../../app/state'
import { T } from '../../app/time'
import { onResolvePublishing, parseSlot, reducePublishing } from './slice'
import { onResolveInbox, reduceInbox } from '../inbox/slice'

test('parseSlot reads the slot strings agents write', () => {
  const now = T(8, 12)
  expect(parseSlot('Today, 18:30', now)).toBe(T(18, 30))
  expect(parseSlot('Tomorrow, 18:00', now)).toBe(T(18, 0, 1))
  expect(parseSlot('Thu 27, 18:00', now)).toBe(T(18, 0, 2))
  expect(parseSlot('Sat 29, 10:00', now)).toBe(T(10, 0, 4))
})

test('approving the plan schedules only the included posts', () => {
  let s = initialState()
  const before = s.publishing.posts.length
  s = reducePublishing(s, { type: 'publishing/planToggle', id: 'n-03' })
  s = reducePublishing(s, { type: 'publishing/planApprove' })
  expect(s.publishing.plan.status).toBe('approved')
  expect(s.publishing.posts.length).toBe(before + 13)
  expect(s.handoffs.some(h => h.id === 'h-plan')).toBe(false)
})

test('any approved post card lands in the calendar; the trend card schedules its linked post', () => {
  const s = initialState()
  const trend = s.handoffs.find(h => h.id === 'h-trend')!
  const after = onResolvePublishing(s, trend, { kind: 'approve' })
  expect(after.publishing.posts.find(p => p.id === 'p-trend')!.status).toBe('scheduled')
  const counter = { ...trend, id: 'h-x', preview: { type: 'post' as const, network: 'instagram' as const, slot: 'Tomorrow, 18:00', text: ['Built to last.'] } }
  const added = onResolvePublishing(s, counter, { kind: 'approve' })
  expect(added.publishing.posts.length).toBe(s.publishing.posts.length + 1)
})

test('inbox: approving Léa’s draft takes the Desk card away; Desk approval updates the conversation', () => {
  const s = initialState()
  const a = reduceInbox(s, { type: 'inbox/approve', id: 'c-lea' })
  expect(a.inbox.convs.find(c => c.id === 'c-lea')!.status).toBe('you')
  expect(a.handoffs.some(h => h.id === 'h-strap')).toBe(false)
  const b = onResolveInbox(s, s.handoffs.find(h => h.id === 'h-press')!, { kind: 'option', index: 0, option: 'Forward to Claire with a holding reply' })
  expect(b.inbox.convs.find(c => c.id === 'c-marc')!.status).toBe('claire')
})

test('bulk reschedule moves posts, delete removes them, and restore brings the snapshot back', () => {
  let s = initialState()
  const ids = s.publishing.posts.filter(p => p.status !== 'published').slice(0, 3).map(p => p.id)
  const before = s.publishing.posts.filter(p => ids.includes(p.id)).map(p => p.at)
  s = reducePublishing(s, { type: 'publishing/bulk', ids, op: 'reschedule', shiftDays: 1 })
  expect(s.publishing.posts.filter(p => ids.includes(p.id)).map(p => p.at)).toEqual(before.map(t => t + 86_400_000))
  expect(s.publishing.posts.find(p => p.id === ids[0])!.history!.at(-1)!.text).toMatch(/^Moved from/)
  const count = s.publishing.posts.length
  s = reducePublishing(s, { type: 'publishing/bulk', ids, op: 'delete' })
  expect(s.publishing.posts.length).toBe(count - 3)
  expect(s.log[0].text).toBe('3 posts deleted')
  s = reducePublishing(s, { type: 'publishing/restore' })
  expect(s.publishing.posts.length).toBe(count)
  expect(s.publishing.undo).toBeUndefined()
})

test('mentions: asking Nova to reply puts reply cards on the Desk, skipping networks Nova can’t answer', async () => {
  const { reduceListening } = await import('../listening/slice')
  const { MENTIONS } = await import('../../data/listening')
  const s = initialState()
  const ig = MENTIONS.find(m => m.network === 'Instagram')!
  const web = MENTIONS.find(m => m.network === 'Web')!
  const after = reduceListening(s, { type: 'listening/mentions', ids: [ig.id, web.id], op: 'nova' })
  const cards = after.handoffs.filter(h => h.topic === 'Mention reply')
  expect(cards.length).toBe(1)
  expect(cards[0].preview).toMatchObject({ type: 'reply', network: 'instagram', author: ig.author })
  expect(after.listening.mentions[ig.id]).toBe('replied')
})
