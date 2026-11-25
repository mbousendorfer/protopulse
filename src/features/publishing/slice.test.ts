import { expect, test } from 'vitest'
import { reducer } from '../../app/reducer'
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

test('ideas: urgent idea reaches the Desk; settling it on the Desk schedules it and empties Ideas of it', async () => {
  const { reducer } = await import('../../app/reducer')
  let s = reducer(initialState(), { type: 'core/fire', eventId: 'ev-idea-urgent' })
  const idea = s.publishing.ideas.find(i => i.key === 'first-snow')!
  expect(idea.status).toBe('ready')
  const card = s.handoffs.find(h => h.ref === idea.id)!
  expect(card).toMatchObject({ topic: 'Idea', urgency: 'urgent', link: `/publishing/ideas/${idea.id}` })
  // It stands alone on the Desk, never inside Atlas's batch of post approvals.
  const { batchesOf } = await import('../desk/Batch')
  expect(batchesOf(s.handoffs).batches.some(x => x.items.some(h => h.id === card.id))).toBe(false)
  s = reducer(s, { type: 'core/resolve', id: card.id, decision: { kind: 'approve' } })
  expect(s.publishing.ideas.find(i => i.id === idea.id)!.status).toBe('scheduled')
  expect(s.publishing.posts.filter(p => p.note?.startsWith('From Ideas')).length).toBe(2)
  // And the other way round: dismissed in Ideas, the card leaves the Desk.
  let t = reducer(initialState(), { type: 'core/fire', eventId: 'ev-idea-urgent' })
  const id = t.publishing.ideas.find(i => i.key === 'first-snow')!.id
  t = reducer(t, { type: 'publishing/ideaDismiss', id, reason: 'Not timely' })
  expect(t.handoffs.some(h => h.ref === id)).toBe(false)
})

test('ideas: on Act, Atlas schedules alone and the journal Undo puts the idea back', async () => {
  const { reducer } = await import('../../app/reducer')
  let s = reducer(initialState(), { type: 'core/autonomy', agent: 'atlas', action: 'atlas-recycle', level: 'act' })
  s = reducer(s, { type: 'core/fire', eventId: 'ev-idea-signal' })
  const idea = s.publishing.ideas.find(i => i.key === 'knots-winter')!
  expect(idea.status).toBe('scheduled')
  const line = s.log.find(l => l.idea === idea.id)!
  expect(line.undoUntil).toBeGreaterThan(0)
  s = reducer(s, { type: 'core/undo', id: line.id })
  expect(s.publishing.ideas.find(i => i.id === idea.id)!.status).toBe('ready')
  expect(s.publishing.posts.some(p => idea.posts!.includes(p.id))).toBe(false)
})

test('ideas: schedule two ready ones, undo puts them back; a series goes to Sage as a campaign', () => {
  let s = initialState()
  const ready = s.publishing.ideas.filter(i => i.status === 'ready').map(i => i.id)
  expect(ready).toHaveLength(2)
  s = reducePublishing(s, { type: 'publishing/ideaSchedule', ids: ready })
  expect(s.publishing.ideas.filter(i => i.status === 'scheduled')).toHaveLength(2)
  s = reducePublishing(s, { type: 'publishing/restore' })
  expect(s.publishing.ideas.filter(i => i.status === 'ready')).toHaveLength(2)
  const series = s.publishing.ideas.find(i => i.kind === 'series')!
  s = reducePublishing(s, { type: 'publishing/ideaToSage', id: series.id })
  const after = s.publishing.ideas.find(i => i.id === series.id)!
  expect(after.status).toBe('sent-to-sage')
  expect(s.strategy.campaigns[0].id).toBe(after.campaign)
  expect(s.handoffs.some(h => h.topic === 'Campaign plan' && h.ref === after.campaign)).toBe(true)
})

test('ideas: the same angle twice proposes a rule; accepting it adds it to the Playbook', () => {
  let s = initialState()
  const [a, b] = s.publishing.ideas.filter(i => i.status === 'ready')
  s = reducePublishing(s, { type: 'publishing/ideaRedirect', id: a.id, mode: 'angle', angle: 'linkedin' })
  s = reducePublishing(s, { type: 'publishing/ideaRedirect', id: b.id, mode: 'angle', angle: 'linkedin' })
  expect(s.publishing.ideas.find(i => i.id === b.id)!.proposal?.key).toBe('angle:linkedin')
  s = reducePublishing(s, { type: 'publishing/ideaRule', id: b.id, accept: true })
  expect(s.playbook.rules[0].text).toBe('Add a LinkedIn version to every idea')
})

test('an approved post card keeps its pillar and campaign in the calendar', () => {
  let s = initialState()
  s = { ...s, handoffs: [{ id: 'h-test', agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Post', title: 'Test post', context: '', why: '', confidence: 90, at: s.clock.base,
    pillar: 'Repair & care', campaign: 'Trail Week', campaignId: 'trail-week', preview: { type: 'post', network: 'instagram', slot: 'Fri 28, 18:30', text: ['Repair kit, packed.'] } }, ...s.handoffs] }
  s = reducer(s, { type: 'core/resolve', id: 'h-test', decision: { kind: 'approve' } })
  const post = s.publishing.posts.find(p => p.handoff === 'h-test')!
  expect(post).toMatchObject({ pillar: 'Repair & care', campaign: 'Trail Week', campaignId: 'trail-week', status: 'scheduled' })
})
