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
