import { describe, expect, it } from 'vitest'
import { initialState } from './state'
import { groupOf, reducer } from './reducer'
import { MIN } from './time'

const s0 = () => initialState()

describe('core reducer', () => {
  it('switching an action to Act hands its Desk cards back to the agent', () => {
    const s = reducer(s0(), { type: 'core/autonomy', agent: 'nova', action: 'nova-complaint', level: 'act' })
    expect(s.handoffs.some(h => h.id === 'h-strap')).toBe(false)
    expect(s.log[0].text).toMatch(/Handled on her own/)
    expect(s.agents.find(a => a.id === 'nova')!.actions.find(x => x.id === 'nova-complaint')!.autonomy).toBe('act')
  })

  it('locked actions never move past Suggest', () => {
    const s = reducer(s0(), { type: 'core/autonomy', agent: 'nova', action: 'nova-sensitive', level: 'act' })
    expect(s.agents.find(a => a.id === 'nova')!.actions.find(x => x.id === 'nova-sensitive')!.autonomy).toBe('suggest')
    expect(s.handoffs.some(h => h.id === 'h-press')).toBe(true)
  })

  it('approving a promotion moves the action and logs it; a trial sets an expiry', () => {
    let s = reducer(s0(), { type: 'core/resolve', id: 'h-promo-nova', decision: { kind: 'trial' } })
    const act = s.agents.find(a => a.id === 'nova')!.actions.find(x => x.id === 'nova-complaint')!
    expect(act.autonomy).toBe('act')
    expect(act.trialFrom).toBe('draft')
    expect(act.trialUntil).toBeGreaterThan(0)
    expect(s.handoffs.some(h => h.id === 'h-promo-nova')).toBe(false)
    s = reducer({ ...s, clock: { base: act.trialUntil! + MIN, realAt: Date.now() } }, { type: 'core/heartbeat' })
    expect(s.agents.find(a => a.id === 'nova')!.actions.find(x => x.id === 'nova-complaint')!.autonomy).toBe('draft')
  })

  it('undo only works inside the window', () => {
    const s = s0()
    const open = s.log.find(l => l.id === 'l-2')!
    expect(reducer(s, { type: 'core/undo', id: 'l-2' }).log.find(l => l.id === 'l-2')!.status).toBe('undone')
    const late = { ...s, clock: { base: open.undoUntil! + MIN, realAt: Date.now() } }
    expect(reducer(late, { type: 'core/undo', id: 'l-2' }).log.find(l => l.id === 'l-2')!.status).toBe('done')
  })

  it('a scripted event becomes a Desk card, or a journal line when the action is on Act', () => {
    let s = reducer(s0(), { type: 'core/fire', eventId: 'ev-colour' })
    expect(s.handoffs[0].title).toMatch(/Wrong colour/)
    s = reducer(s0(), { type: 'core/autonomy', agent: 'nova', action: 'nova-complaint', level: 'act' })
    const before = s.handoffs.length
    s = reducer(s, { type: 'core/fire', eventId: 'ev-colour' })
    expect(s.handoffs.length).toBe(before)
    expect(s.log[0].text).toMatch(/Ember exchange/)
  })

  it('Claire answers when due', () => {
    let s = reducer(s0(), { type: 'core/askClaire', id: 'h-boost' })
    const h = s.handoffs.find(x => x.id === 'h-boost')!
    expect(h.lane).toBe('claire')
    s = reducer({ ...s, clock: { base: h.claire!.dueAt + 1000, realAt: Date.now() } }, { type: 'core/heartbeat' })
    const after = s.handoffs.find(x => x.id === 'h-boost')
    expect(after?.claire?.reply ?? 'resolved').toBeTruthy()
    expect(after?.lane).not.toBe('claire')
  })

  it('a “don’t…” in a thread proposes a rule that can be added to the Playbook', () => {
    let s = reducer(s0(), { type: 'core/thread', id: 'h-review', text: 'don’t offer discount codes on complaints' })
    const msg = s.handoffs.find(h => h.id === 'h-review')!.thread!.find(m => m.rule)!
    expect(msg.rule).toMatch(/^Never offer discount codes/)
    s = reducer(s, { type: 'core/acceptRule', id: 'h-review', msg: msg.id })
    expect(s.playbook.rules[0].text).toBe(msg.rule)
  })

  it('a bulk decision settles every card, writes one journal line, and its undo brings them all back', () => {
    const ids = ['h-review', 'h-ana']
    let s = reducer(s0(), { type: 'core/bulk', ids, decision: { kind: 'approve' }, summary: 'Sent 2 replies Nova drafted', agent: 'nova' })
    expect(s.handoffs.some(h => ids.includes(h.id))).toBe(false)
    expect(s.log[0].text).toBe('Sent 2 replies Nova drafted')
    expect(s.log.filter(l => l.text.startsWith('2-star') || l.text.startsWith('Ember')).length).toBe(0)
    expect(s.desk.done.map(x => x.id).sort()).toEqual([...ids].sort())
    s = reducer(s, { type: 'core/undo', id: s.log[0].id })
    expect(ids.every(id => s.handoffs.some(h => h.id === id))).toBe(true)
    expect(s.desk.done.length).toBe(0)
  })

  it('cards fall into Needs you, Worth a look or Good news', () => {
    const s = s0()
    const g = (id: string) => groupOf(s.handoffs.find(h => h.id === id)!)
    expect(g('h-strap')).toBe('need')
    expect(g('h-tiktok')).toBe('look')
    expect(g('h-peakline')).toBe('look')
    expect(g('g-carousel')).toBe('good')
  })

  it('an answer to missing info becomes a Playbook fact', () => {
    const s = reducer(s0(), { type: 'core/resolve', id: 'h-code', decision: { kind: 'answer', text: 'TRAIL15' } })
    expect(s.playbook.rules.some(r => r.kind === 'fact' && r.text.includes('TRAIL15'))).toBe(true)
  })

  it('restore brings a settled card back', () => {
    const s0_ = s0()
    const h = s0_.handoffs.find(x => x.id === 'h-strap')!
    let s = reducer(s0_, { type: 'core/resolve', id: 'h-strap', decision: { kind: 'approve' } })
    expect(s.handoffs.some(x => x.id === 'h-strap')).toBe(false)
    s = reducer(s, { type: 'core/restore', handoff: h })
    expect(s.handoffs.some(x => x.id === 'h-strap')).toBe(true)
    expect(s.log.find(l => l.text.startsWith(h.title))!.status).toBe('undone')
  })
})

describe('chats', () => {
  it('routes a message, lets several agents answer, and scheduling a post lands it in Publishing with a follow-up', () => {
    let s = reducer(initialState(), { type: 'chats/new', id: 'c1' })
    s = reducer(s, { type: 'chats/send', id: 'c1', text: 'What is Peakline up to?' })
    const chat = s.chats.list.find(c => c.id === 'c1')!
    expect(chat.messages.map(m => m.from)).toEqual(['you', 'echo', 'atlas'])
    const post = chat.messages.find(m => m.card?.type === 'post')!
    s = reducer(s, { type: 'chats/act', id: 'c1', msg: post.id, action: 'schedule' })
    const after = s.chats.list.find(c => c.id === 'c1')!
    expect(after.messages.find(m => m.id === post.id)!.card).toMatchObject({ status: 'scheduled' })
    expect(after.followUps.length).toBe(1)
    expect(JSON.stringify(s.publishing)).toContain('Built to last')
  })

  it('an @mention picks who answers', () => {
    let s = reducer(initialState(), { type: 'chats/new', id: 'c2' })
    s = reducer(s, { type: 'chats/send', id: 'c2', text: '@Iris how are we doing?' })
    expect(s.chats.list.find(c => c.id === 'c2')!.messages[1].from).toBe('iris')
  })
})

describe('depth pass', () => {
  it('the feed never raises the same event twice, even after a full loop', () => {
    let s = initialState()
    for (let i = 0; i < 50; i++) s = reducer(s, { type: 'core/fire' })
    const titles = s.handoffs.map(h => h.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('bulk snooze and bulk Ask Claire move every card, and one undo brings them back', () => {
    let s = reducer(initialState(), { type: 'core/bulk', ids: ['h-strap', 'h-review'], snooze: { until: Date.now() + 1e9, label: 'tomorrow 08:00' }, summary: 'Snoozed 2', agent: 'nova' })
    expect(s.handoffs.filter(h => ['h-strap', 'h-review'].includes(h.id)).every(h => h.lane === 'snoozed')).toBe(true)
    s = reducer(s, { type: 'core/undo', id: s.log[0].id })
    expect(s.handoffs.filter(h => ['h-strap', 'h-review'].includes(h.id)).every(h => !h.lane)).toBe(true)
    s = reducer(s, { type: 'core/bulk', ids: ['h-boost', 'h-creator'], claire: true, summary: 'Sent 2 to Claire', agent: 'iris' })
    expect(s.handoffs.filter(h => ['h-boost', 'h-creator'].includes(h.id)).every(h => h.lane === 'claire')).toBe(true)
  })

  it('escalation rules can be added and removed, and guardrails too', () => {
    let s = reducer(initialState(), { type: 'playbook/escalateAdd', rule: { id: 'e-x', label: 'Refunds above €80', to: 'claire', on: true, agents: ['nova'] } })
    expect(s.playbook.escalate.some(e => e.id === 'e-x')).toBe(true)
    s = reducer(s, { type: 'playbook/escalateDelete', id: 'e-x' })
    expect(s.playbook.escalate.some(e => e.id === 'e-x')).toBe(false)
    s = reducer(s, { type: 'core/guardrailAdd', agent: 'nova', label: 'Replies per hour', value: '30 max' })
    const g = s.agents.find(a => a.id === 'nova')!.guardrails.find(x => x.label === 'Replies per hour')!
    s = reducer(s, { type: 'core/guardrailDelete', agent: 'nova', id: g.id })
    expect(s.agents.find(a => a.id === 'nova')!.guardrails.some(x => x.label === 'Replies per hour')).toBe(false)
  })
})
