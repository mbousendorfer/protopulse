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
