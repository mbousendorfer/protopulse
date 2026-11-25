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

describe('response time', () => {
  it('waiting time per conversation, longest first, and ⌘K says the same numbers', async () => {
    const { waitingList, dur, responseStats } = await import('./slice')
    const { now } = await import('../../app/core')
    const s = initialState()
    const list = waitingList(s, now(s))
    expect(list.length).toBeGreaterThan(3)
    expect(list.every((x, i) => i === 0 || list[i - 1].w.since <= x.w.since)).toBe(true)
    const sophie = list.find(x => x.c.id === 'c-sophie')!
    expect(sophie.w.target).toBe(60 * 60_000)
    expect(sophie.w.over).toBe(true)
    expect(responseStats(s, now(s)).waiting).toBe(list.length)
    const { parse } = await import('../../data/command')
    expect(parse('who is waiting longest?').intent.kind).toBe('waiting')
    expect(dur(185 * 60_000)).toBe('3 h 05')
  })

  it('15 minutes before a target, Nova raises one Desk card; it goes once they are answered', async () => {
    const { tickInbox, waitingList } = await import('./slice')
    const { now } = await import('../../app/core')
    let s = initialState()
    const next = waitingList(s, now(s)).filter(x => !x.w.over && !['leo', 'yanis'].includes(x.c.assignee ?? '')).sort((a, b) => a.w.due - b.w.due)[0]
    const t = next.w.due - 10 * 60_000
    s = tickInbox(s, t)
    const card = s.handoffs.find(h => h.sla?.includes(next.c.id))!
    expect(card.title).toMatch(/response target at/)
    expect(tickInbox(s, t).handoffs.filter(h => h.sla).length).toBe(1)
    s = reducer(s, { type: 'inbox/send', id: next.c.id, text: 'On it' })
    s = tickInbox(s, t)
    expect(s.handoffs.some(h => h.id === card.id)).toBe(card.sla!.length > 1)
  })
})

describe('team', () => {
  it('what is with Léo or Yanis is not Sam’s, and they answer it when due', async () => {
    const { needsYou, tickInbox, inboxNeedsCount } = await import('./slice')
    let s = initialState()
    expect(needsYou(conv(s, 'c-hotel'))).toBe(false)
    const before = inboxNeedsCount(s)
    s = reducer(s, { type: 'inbox/bulk', ids: ['c-ana'], op: 'assign', value: 'leo' })
    expect(inboxNeedsCount(s)).toBe(before - 1)
    s = tickInbox(s, Math.max(conv(s, 'c-ana').teamDue!, conv(s, 'c-hotel').teamDue!) + 1)
    expect(conv(s, 'c-ana')).toMatchObject({ status: 'you', reviewedBy: 'leo' })
    expect(conv(s, 'c-ana').messages.slice(-1)[0]).toMatchObject({ from: 'you', by: 'leo' })
    expect(conv(s, 'c-hotel').messages.slice(-1)[0].text).toMatch(/I’m Yanis/)
    expect(s.log.some(l => l.text === 'Yanis replied to Hôtel Les Cimes')).toBe(true)
  })

  it('the wholesale rule assigns to Yanis on arrival', async () => {
    const { matches, RULES, didText } = await import('./rules')
    const r = RULES.find(x => x.id === 'ir-wholesale')!
    expect(matches(r, conv(initialState(), 'c-hotel'))).toBe(true)
    expect(didText(r.then, 'Hôtel Les Cimes')).toBe('Assigned Hôtel Les Cimes to Yanis')
  })
})

describe('labels', () => {
  it('rename goes everywhere (conversations and rules); delete switches the rules off; Undo puts it all back', () => {
    let s = reducer(initialState(), { type: 'inbox/labelRename', from: 'Refund', to: 'Money back' })
    expect(conv(s, 'c-thomas').labels).toContain('Money back')
    expect(s.inbox.rules.find(r => r.id === 'ir-refund')!.then).toEqual({ op: 'label', value: 'Money back' })
    expect(s.inbox.labels).toContain('Money back')
    s = reducer(s, { type: 'inbox/labelDelete', name: 'Money back' })
    expect(conv(s, 'c-thomas').labels).not.toContain('Money back')
    expect(s.inbox.rules.find(r => r.id === 'ir-refund')!.on).toBe(false)
    expect(s.log[0].text).toBe('Deleted the label “Money back”: removed from 2 conversations, 1 rule switched off')
    s = reducer(s, { type: 'core/undo', id: s.log[0].id })
    expect(conv(s, 'c-thomas').labels).toContain('Money back')
    expect(s.inbox.rules.find(r => r.id === 'ir-refund')!.on).toBe(true)
    expect(s.inbox.labels).toContain('Money back')
  })

  it('⌘K assigns to Léo and Yanis too', async () => {
    const { parse } = await import('../../data/command')
    expect(parse('assign wholesale requests to Yanis').intent).toMatchObject({ kind: 'inboxRule', words: ['wholesale'], then: { op: 'assign', value: 'yanis' } })
  })
})

describe('moderation', () => {
  it('report as spam hides it and teaches Nova’s spam rule; Undo puts both back', () => {
    let s = reducer(initialState(), { type: 'inbox/moderate', ids: ['c-dish'], op: 'spam' })
    expect(conv(s, 'c-dish').status).toBe('hidden')
    const words = s.inbox.rules.find(r => r.id === 'ir-spam')!.words
    expect(words.length).toBe(6)
    s = reducer(s, { type: 'inbox/undo' })
    expect(conv(s, 'c-dish').status).toBe('auto')
    expect(s.inbox.rules.find(r => r.id === 'ir-spam')!.words.length).toBe(5)
  })

  it('ban hides everything from the author and what they send later; delete is final and says so', async () => {
    let s = reducer(initialState(), { type: 'inbox/moderate', ids: ['c-uk'], op: 'ban' })
    expect(conv(s, 'c-uk').status).toBe('hidden')
    expect(conv(s, 'c-max').status).toBe('hidden')
    expect(s.inbox.banned).toContain('@maxoutside')
    s = reducer(s, { type: 'inbox/moderate', ids: ['c-dish'], op: 'delete' })
    expect(conv(s, 'c-dish')).toMatchObject({ removed: true, status: 'hidden' })
    expect(s.log[0].undoUntil).toBeUndefined()
    expect(reducer(s, { type: 'inbox/moderate', ids: ['c-g5'], op: 'delete' })).toBe(s)
  })

  it('reply in private opens a DM drafted by Nova; bots are reported by Nova on Act, or raised as one card on Draft', () => {
    let s = reducer(initialState(), { type: 'inbox/private', id: 'c-lea' })
    expect(conv(s, 'c-lea-dm')).toMatchObject({ type: 'dm', status: 'draft', author: '@lea.hikes' })
    s = reducer(s, { type: 'core/fire', eventId: 'ev-bots' })
    expect(s.inbox.convs.filter(c => c.note === 'Reported as spam by Nova').length).toBe(3)
    let d = reducer(initialState(), { type: 'core/autonomy', agent: 'nova', action: 'nova-spam', level: 'draft' })
    d = reducer(d, { type: 'core/fire', eventId: 'ev-bots' })
    const card = d.handoffs.find(h => h.inboxSpam)!
    d = reducer(d, { type: 'core/resolve', id: card.id, decision: { kind: 'approve' } })
    expect(d.inbox.convs.filter(c => c.note === 'Reported as spam by you').length).toBe(3)
  })
})

describe('Sage’s Trail Week label', () => {
  it('the seed has Trail Week conversations, labelled, and Nova’s rule for it', () => {
    const s = initialState()
    expect(s.inbox.convs.filter(c => c.labels?.includes('Trail Week')).length).toBe(4)
    expect(s.inbox.rules.find(r => r.then.op === 'label' && r.then.value === 'Trail Week')?.origin).toBe('Sage · Trail Week campaign')
  })
})

describe('filters and saved views', () => {
  it('⌘K “show me negative Instagram DMs this week” sets the same filters the Inbox uses', async () => {
    const { parse } = await import('../../data/command')
    const { describe: say, matchFilters, toSearch, fromSearch } = await import('./filters')
    const i = parse('show me negative instagram dms this week').intent as { kind: string; f: import('./filters').Filters }
    expect(i).toMatchObject({ kind: 'inboxFilter', f: { type: 'dm', network: 'instagram', sentiment: 'negative', date: '7d' } })
    expect(say(i.f)).toBe('negative Instagram messages from the last 7 days')
    expect(fromSearch(new URLSearchParams(toSearch(i.f)))).toEqual(i.f)
    const s = initialState()
    expect(s.inbox.convs.filter(c => matchFilters(c, i.f, s.clock.base)).map(c => c.id)).toContain('c-ana')
    expect(parse('show me mentions of the Ridge').intent.kind).not.toBe('inboxFilter')
  })

  it('a saved view is stored and can be deleted and restored', () => {
    let s = reducer(initialState(), { type: 'inbox/viewAdd', view: { name: 'Negative IG', view: 'all', f: { network: 'instagram', sentiment: 'negative' } } })
    const v = s.inbox.views[0]
    s = reducer(s, { type: 'inbox/viewDelete', id: v.id })
    expect(s.inbox.views).toEqual([])
    s = reducer(s, { type: 'inbox/viewRestore', view: v, index: 0 })
    expect(s.inbox.views[0].name).toBe('Negative IG')
  })
})

describe('comments under their post', () => {
  it('a post groups its comments, whatever details each comment line carries', async () => {
    const { matchFilters, postKey } = await import('./filters')
    const s = initialState()
    expect(postKey(conv(s, 'c-lea'))).toBe('Reel · “The Ridge on the GR20”')
    const on = s.inbox.convs.filter(c => matchFilters(c, { post: 'Reel · “The Ridge on the GR20”' }, s.clock.base)).map(c => c.id)
    expect(on.sort()).toEqual(['c-gr20-ben', 'c-gr20-julie', 'c-gr20-marco', 'c-lea'])
  })
})

describe('translation', () => {
  it('every foreign-language message and reply in the seed and the German event has its English', async () => {
    const { translate } = await import('./translate')
    const s = reducer(initialState(), { type: 'core/fire', eventId: 'ev-german' })
    for (const id of ['c-jonas', 'c-fr-blue', 'c-es-ship', 'c-it-weight']) for (const m of conv(s, id).messages) expect(translate(m.text), m.text).toBeDefined()
    // Product questions are on Act: Nova answered Lena alone, in German.
    for (const m of s.inbox.convs.find(c => c.author === 'Lena W.')!.messages) expect(translate(m.text), m.text).toBeDefined()
    const { SCRIPT } = await import('./script')
    const p = SCRIPT.find(e => e.id === 'ev-german')!.handoff!.preview as { text: string; draft: (string | { text: string })[] }
    expect(translate(p.text)?.lang).toBe('German')
    expect(translate(p.draft.map(x => (typeof x === 'string' ? x : x.text)).join(''))).toBeDefined()
  })
})

describe('contracts', () => {
  it('Echo hands a mention to the Inbox: once, escalations and rules applied', () => {
    const m = { id: 'm1', author: '@trail.mag', network: 'instagram' as const, text: 'Journalist at Trail Mag here, writing a piece on repair programmes. Can we talk?', from: 'Echo' }
    let s = reducer(initialState(), { type: 'inbox/ingest', mention: m })
    expect(conv(s, 'c-in-m1')).toMatchObject({ type: 'mention', status: 'escalated', assignee: 'claire' })
    expect(s.log.some(l => l.text.startsWith('Echo passed @trail.mag’s mention to the Inbox'))).toBe(true)
    const n = s.inbox.convs.length
    s = reducer(s, { type: 'inbox/ingest', mention: m })
    expect(s.inbox.convs.length).toBe(n)
  })

  it('Fernway Repair conversations filter by profile', async () => {
    const { matchFilters } = await import('./filters')
    const s = initialState()
    expect(s.inbox.convs.filter(c => matchFilters(c, { account: 'ig-repair' }, s.clock.base)).map(c => c.id).sort()).toEqual(['c-rep-dry', 'c-rep-free', 'c-rep-zip'])
    expect(matchFilters(conv(s, 'c-lea'), { account: 'instagram' }, s.clock.base)).toBe(true)
  })
})
