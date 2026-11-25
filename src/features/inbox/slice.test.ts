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

describe('Playbook escalations on arrival', () => {
  it('an injury goes to Your call with the rule quoted, even with complaints on Act', async () => {
    let s = reducer(initialState(), { type: 'core/autonomy', agent: 'nova', action: 'nova-complaint', level: 'act' })
    s = reducer(s, { type: 'core/fire', eventId: 'ev-injury' })
    const h = s.handoffs.find(x => x.ref === 'ev-injury')!
    expect(h).toMatchObject({ action: 'nova-sensitive', topic: 'Safety', rules: ['Injury, safety or product recall'] })
    expect(s.log[0].text).toBe('Escalated @lucie.alpine to you · rule: Injury, safety or product recall')
    expect(s.inbox.convs.find(c => c.handoff === h.id)).toMatchObject({ status: 'escalated', note: 'Escalated · rule “Injury, safety or product recall”' })
  })

  it('turning the rule off lets Nova handle it like any complaint; a press rule goes to Claire', async () => {
    const { escalationFor } = await import('./slice')
    let s = reducer(initialState(), { type: 'playbook/escalate', id: 'e-injury', on: false })
    expect(s.playbook.escalate.find(e => e.id === 'e-injury')?.on).toBe(false)
    s = reducer(s, { type: 'core/fire', eventId: 'ev-injury' })
    expect(s.handoffs.find(x => x.ref === 'ev-injury')?.action).toBe('nova-complaint')
    expect(escalationFor(s, 'I’m a reporter at Outdoor Weekly, writing a piece on PFAS')).toMatchObject({ id: 'e-press', to: 'claire' })
    expect(escalationFor(s, 'Love it!', { followers: 120_000 })?.id).toBe('e-creator')
    expect(escalationFor(s, 'Where is my order?')).toBeUndefined()
  })
})

describe('Inbox rules', () => {
  it('on Act Nova applies the rules to what comes in, with a journal line that undoes', () => {
    let s = reducer(initialState(), { type: 'core/fire', eventId: 'ev-refund-ask' })
    const c = s.inbox.convs.find(x => x.author === 'Hélène Dubois')!
    expect(c.status).toBe('auto')
    expect(c.labels).toContain('Refund')
    const line = s.log.find(l => l.inboxRuleUses?.id === 'ir-refund')!
    expect(line.text).toBe('Labelled Hélène Dubois “Refund” · rule: says “refund”, “money back”, “reimburse”')
    expect(s.inbox.rules.find(r => r.id === 'ir-refund')!.uses).toBe(15)
    s = reducer(s, { type: 'core/undo', id: line.id })
    expect(conv(s, c.id).labels).not.toContain('Refund')
    expect(s.inbox.rules.find(r => r.id === 'ir-refund')!.uses).toBe(14)
  })

  it('on Draft Nova only suggests, and Sam applies the suggestions in one go', () => {
    let s = reducer(initialState(), { type: 'core/autonomy', agent: 'nova', action: 'nova-rules', level: 'draft' })
    s = reducer(s, { type: 'core/fire', eventId: 'ev-refund-ask' })
    const c = s.inbox.convs.find(x => x.author === 'Hélène Dubois')!
    expect(c.labels).not.toContain('Refund')
    expect(c.suggested).toContain('ir-refund')
    s = reducer(s, { type: 'inbox/ruleApplyAll' })
    expect(conv(s, c.id).labels).toContain('Refund')
    expect(conv(s, c.id).suggested).toEqual([])
  })

  it('⌘K “label refund requests as Refund” parses into a rule; adding one applies it to what matches now, and Undo removes it', async () => {
    const { parse } = await import('../../data/command')
    expect(parse('make nova label pilling or broken strap as Product issue').intent).toMatchObject({ kind: 'inboxRule', words: ['pilling', 'broken strap'], then: { op: 'label', value: 'Product issue' } })
    expect(parse('assign press requests to Claire').intent).toMatchObject({ kind: 'inboxRule', words: ['press'], then: { op: 'assign', value: 'claire' } })
    let s = reducer(initialState(), { type: 'inbox/ruleAdd', rule: { words: ['pilling'], then: { op: 'label', value: 'Quality' } }, applyNow: true })
    expect(conv(s, 'c-ana').labels).toContain('Quality')
    const added = s.log.find(l => l.inboxRule)!
    s = reducer(s, { type: 'core/undo', id: added.id })
    expect(s.inbox.rules.some(r => r.id === added.inboxRule)).toBe(false)
  })
})

describe('rules learned from Sam’s labels', () => {
  it('the third hand label no rule covers makes Nova propose a rule; approving it adds the rule, Undo takes it back', () => {
    let s = initialState()
    s = reducer(s, { type: 'inbox/bulk', ids: ['c-lea'], op: 'label', value: 'Gear failure' })
    s = reducer(s, { type: 'inbox/bulk', ids: ['c-pierre', 'c-ana'], op: 'label', value: 'Gear failure' })
    const h = s.handoffs.find(x => x.inboxRule)!
    expect(h.inboxRule).toEqual({ words: ['snapped'], then: { op: 'label', value: 'Gear failure' } })
    expect(s.inbox.taught?.['Gear failure']).toEqual([])
    s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'approve' } })
    expect(s.inbox.rules[0]).toMatchObject({ words: ['snapped'], origin: 'Learned from your labels' })
    const line = s.log.find(l => l.restore?.some(x => x.id === h.id))!
    s = reducer(s, { type: 'core/undo', id: line.id })
    expect(s.inbox.rules.some(r => r.origin === 'Learned from your labels')).toBe(false)
  })

  it('labels a rule already covers don’t count', () => {
    const s = reducer(initialState(), { type: 'inbox/bulk', ids: ['c-sophie', 'c-thomas', 'c-ines'], op: 'label', value: 'Refund' })
    expect(s.handoffs.some(x => x.inboxRule)).toBe(false)
  })
})

describe('saved replies', () => {
  it('⌘K “reply to Léa with the exchange saved reply” makes it her draft; sending it counts a use', async () => {
    const { parse } = await import('../../data/command')
    expect(parse('reply to léa with the exchange saved reply').intent).toMatchObject({ kind: 'reply', name: 'léa', saved: 'the exchange saved reply' })
    const { savedNamed } = await import('./saved')
    let s = initialState()
    const r = savedNamed(s.inbox.saved, 'the exchange saved reply')!
    expect(r.id).toBe('sr-exchange')
    s = reducer(s, { type: 'inbox/savedUse', id: 'c-lea', saved: r.id })
    expect(conv(s, 'c-lea').draft).toEqual(['Léa, sorry about that. We’re sending you a replacement today by express, no need to send the old one back first. Details in your DMs.'])
    s = reducer(s, { type: 'inbox/approve', id: 'c-lea' })
    expect(s.inbox.saved.find(x => x.id === 'sr-exchange')!.uses).toBe(32)
  })

  it('a reply typed from a saved one counts it; Save as reply keeps {name}', async () => {
    const { toTemplate } = await import('./saved')
    let s = reducer(initialState(), { type: 'inbox/send', id: 'c-tom', text: 'Tom, you have 30 days…', saved: 'sr-returns' })
    expect(s.inbox.saved.find(x => x.id === 'sr-returns')!.uses).toBe(23)
    expect(toTemplate('Thanks Tom, enjoy it', conv(s, 'c-tom'))).toBe('Thanks {name}, enjoy it')
    s = reducer(s, { type: 'inbox/savedAdd', name: 'Enjoy', text: 'Thanks {name}, enjoy it' })
    expect(s.inbox.saved.slice(-1)[0]).toMatchObject({ name: 'Enjoy', by: 'you', uses: 0 })
  })
})
