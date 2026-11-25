import { describe, expect, it } from 'vitest'
import { initialState } from '../../app/state'
import { reducer } from '../../app/reducer'

const conv = (s: ReturnType<typeof initialState>, id: string) => s.inbox.convs.find(c => c.id === id)!

describe('inbox bulk actions', () => {
  it('assign, label, reviewed and hide apply to every selected conversation, and Undo puts them back', () => {
    const ids = ['c-ana', 'c-max']
    const s0 = initialState()
    let s = reducer(s0, { type: 'inbox/bulk', ids, op: 'assign', value: 'claire' })
    expect(ids.every(id => conv(s, id).assignee === 'claire')).toBe(true)
    expect(s.log[0].text).toBe('Assigned 2 conversations to Claire')
    s = reducer(s, { type: 'inbox/bulk', ids, op: 'label', value: 'Refund' })
    expect(ids.every(id => conv(s, id).labels?.includes('Refund'))).toBe(true)
    s = reducer(s, { type: 'inbox/bulk', ids, op: 'reviewed', value: true })
    expect(ids.every(id => conv(s, id).reviewed)).toBe(true)
    s = reducer(s, { type: 'inbox/undo' })
    expect(ids.every(id => !conv(s, id).reviewed)).toBe(true)
    expect(s.inbox.undo).toBeUndefined()

    const before = s.handoffs.length
    s = reducer(s, { type: 'inbox/bulk', ids, op: 'hide' })
    expect(ids.every(id => conv(s, id).status === 'hidden')).toBe(true)
    expect(s.handoffs.length).toBe(before - 2)
    s = reducer(s, { type: 'inbox/undo' })
    expect(ids.every(id => conv(s, id).status === 'draft')).toBe(true)
    expect(s.handoffs.length).toBe(before)
  })

  it('bulk approve sends only the drafts, settles their Desk cards, and writes one journal line', () => {
    const s0 = initialState()
    const logs = s0.log.length
    const s = reducer(s0, { type: 'inbox/bulk', ids: ['c-sophie', 'c-ana', 'c-tom'], op: 'approve' })
    expect(conv(s, 'c-sophie').status).toBe('you')
    expect(conv(s, 'c-ana').status).toBe('you')
    expect(conv(s, 'c-tom').status).toBe('auto')
    expect(s.handoffs.some(h => h.id === 'h-sophie' || h.id === 'h-ana')).toBe(false)
    expect(s.log.length).toBe(logs + 1)
    const back = reducer(s, { type: 'inbox/undo' })
    expect(back.handoffs.some(h => h.id === 'h-sophie')).toBe(true)
    expect(conv(back, 'c-sophie').status).toBe('draft')
    expect(back.log[0].status).toBe('undone')
  })

  it('a note is added to the conversation', () => {
    const s = reducer(initialState(), { type: 'inbox/note', id: 'c-lea', text: 'Check the batch number' })
    expect(conv(s, 'c-lea').notes?.slice(-1)[0]).toMatchObject({ text: 'Check the batch number', by: 'sam' })
  })
})

describe('Nova on Act and from the Desk', () => {
  it('moving complaints to Act sends the linked conversation as Nova’s own reply, and the journal Undo puts the draft back', () => {
    let s = initialState()
    s = reducer(s, { type: 'core/autonomy', agent: 'nova', action: 'nova-complaint', level: 'act' })
    const lea = conv(s, 'c-lea')
    expect(lea.status).toBe('auto')
    expect(lea.messages.slice(-1)[0]).toMatchObject({ from: 'nova', auto: true, card: 'h-strap' })
    const line = s.log.find(l => l.restore?.some(h => h.id === 'h-strap'))!
    s = reducer(s, { type: 'core/undo', id: line.id })
    expect(conv(s, 'c-lea').status).toBe('draft')
    expect(conv(s, 'c-lea').draft?.length).toBeGreaterThan(0)
    expect(conv(s, 'c-lea').messages.some(m => m.card === 'h-strap')).toBe(false)
    expect(s.handoffs.some(h => h.id === 'h-strap')).toBe(true)
  })

  it('a Nova event on Act lands in Handled by Nova with her reply, and undoing the line brings it back as a draft', () => {
    let s = initialState()
    s = reducer(s, { type: 'core/autonomy', agent: 'nova', action: 'nova-reviews', level: 'act' })
    const before = s.inbox.convs.length
    s = reducer(s, { type: 'core/fire', eventId: 'ev-google' })
    expect(s.inbox.convs.length).toBe(before + 1)
    const c = s.inbox.convs[0]
    expect(c).toMatchObject({ author: 'Martine L. · ★', network: 'google', type: 'review', sentiment: 'negative', stars: 1, status: 'auto' })
    expect(s.log[0].link).toBe(`/inbox/${c.id}`)
    s = reducer(s, { type: 'core/undo', id: s.log[0].id })
    expect(conv(s, c.id).status).toBe('draft')
  })

  it('approving a review card from the Desk records a review, not an angry DM', () => {
    let s = reducer(initialState(), { type: 'core/fire', eventId: 'ev-google' })
    const h = s.handoffs.find(x => x.ref === 'ev-google')!
    s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'approve' } })
    expect(s.inbox.convs.find(c => c.handoff === h.id)).toMatchObject({ type: 'review', network: 'google', stars: 1, status: 'you' })
  })

  it('a reply typed in a conversation without a card is in the journal', () => {
    const s = reducer(initialState(), { type: 'inbox/send', id: 'c-tom', text: 'Have a great trip!' })
    expect(s.log[0].text).toBe('You replied to @tom.bivouac yourself')
  })
})

describe('⌘K reply to', () => {
  it('finds people by first name, accent-free name or handle, what waits on Sam first', async () => {
    const { findConvo } = await import('./agent')
    const s = initialState()
    expect(findConvo(s, 'lea')?.id).toBe('c-lea')
    expect(findConvo(s, 'Sophie')?.id).toBe('c-sophie')
    expect(findConvo(s, 'ines')?.id).toBe('c-ines')
    expect(findConvo(s, 'noe.walks')?.id).toBe('c-size')
    expect(findConvo(s, 'nobody-here')).toBeUndefined()
  })
})

describe('review', () => {
  it('Nova reviews what she settles alone, a person what they send; Review all is one Undo', () => {
    let s = initialState()
    expect(conv(s, 'c-tom').reviewedBy).toBe('nova')
    expect(conv(s, 'c-lea').reviewed).toBeFalsy()
    s = reducer(s, { type: 'core/autonomy', agent: 'nova', action: 'nova-complaint', level: 'act' })
    expect(conv(s, 'c-lea')).toMatchObject({ reviewed: true, reviewedBy: 'nova' })
    s = reducer(s, { type: 'inbox/approve', id: 'c-thomas' })
    expect(conv(s, 'c-thomas')).toMatchObject({ reviewed: true, reviewedBy: 'sam' })
    const todo = s.inbox.convs.filter(c => !c.reviewed).map(c => c.id)
    expect(todo.length).toBeGreaterThan(0)
    s = reducer(s, { type: 'inbox/bulk', ids: todo, op: 'reviewed', value: true })
    expect(s.inbox.convs.every(c => c.reviewed)).toBe(true)
    s = reducer(s, { type: 'inbox/undo' })
    expect(s.inbox.convs.filter(c => !c.reviewed).map(c => c.id)).toEqual(todo)
  })
})
