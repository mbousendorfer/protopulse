import { describe, expect, it } from 'vitest'
import { initialState } from './state'
import { groupOf, reducer } from './reducer'
import { MIN } from './time'
import { AGENTS, levelFor, weeklyLoad } from '../data/agents'

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

  it('undoing a Desk decision brings the card back and reverses what it changed', () => {
    let s = reducer(s0(), { type: 'core/resolve', id: 'h-promo-nova', decision: { kind: 'approve' } })
    expect(s.agents.find(a => a.id === 'nova')!.actions.find(x => x.id === 'nova-complaint')!.autonomy).toBe('act')
    const line = s.log.find(l => l.restore?.some(h => h.id === 'h-promo-nova'))!
    s = reducer(s, { type: 'core/undo', id: line.id })
    expect(s.handoffs.some(h => h.id === 'h-promo-nova')).toBe(true)
    expect(s.desk.done.some(x => x.id === 'h-promo-nova')).toBe(false)
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
    // No toast: the confirmation sits on the Desk and lasts as long as the journal's undo window.
    expect(s.notice).toMatchObject({ scope: 'desk', text: 'Sent 2 replies Nova drafted', undo: s.log[0].id, until: s.log[0].undoUntil })
    s = reducer(s, { type: 'core/undo', id: s.log[0].id })
    expect(ids.every(id => s.handoffs.some(h => h.id === id))).toBe(true)
    expect(s.desk.done.length).toBe(0)
    expect(s.notice).toBeUndefined()
  })

  it('a declined Sage adjustment and a dismissed trend can be reopened', () => {
    let s = reducer(s0(), { type: 'listening/trend', id: 't1', hand: false })
    expect(s.listening.trends.t1).toBe('dismissed')
    s = reducer(s, { type: 'listening/reopen', kind: 'trends', id: 't1' })
    expect(s.listening.trends.t1).toBeUndefined()
    const c = s.strategy.campaigns.find(x => x.adjustments.length)!
    const adj = c.adjustments[0].id
    s = reducer(s, { type: 'strategy/adjust', id: c.id, adj, accept: false })
    s = reducer(s, { type: 'strategy/reopen', id: c.id, adj })
    expect(s.strategy.campaigns.find(x => x.id === c.id)!.adjustments[0].status).toBe('proposed')
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

describe('autonomy presets and weekly load', () => {
  it('levelFor maps risk to a level per preset', () => {
    expect([levelFor('safe', 'cautious'), levelFor('risky', 'cautious')]).toEqual(['draft', 'suggest'])
    expect([levelFor('safe', 'balanced'), levelFor('risky', 'balanced')]).toEqual(['act', 'draft'])
    expect(levelFor('risky', 'autonomous')).toBe('act')
  })

  it('weeklyLoad sums volume per level and keeps locked actions with the person', () => {
    const nova = AGENTS.find(a => a.id === 'nova')!
    const all = weeklyLoad(nova.actions, () => 'act')
    expect(all.suggest).toBe(nova.actions.filter(x => x.locked).reduce((n, x) => n + (x.perWeek ?? 0), 0))
    expect(all.act + all.draft + all.suggest).toBe(nova.actions.reduce((n, x) => n + (x.perWeek ?? 0), 0))
    expect(all.draft).toBe(0)
  })

  it('every action says what it produces', () => {
    for (const a of AGENTS) for (const x of a.actions) expect(x.perWeek && x.example, x.id).toBeTruthy()
  })
})

describe('Act does the action', () => {
  const level = (s: ReturnType<typeof s0>, agent: string, action: string) => s.agents.find(a => a.id === agent)!.actions.find(x => x.id === action)!.autonomy

  it('a card taken by Act goes through its agent like an approval, with a journal line that really undoes', () => {
    let s = reducer(s0(), { type: 'core/autonomy', agent: 'atlas', action: 'atlas-plan', level: 'act' })
    expect(level(s, 'atlas', 'atlas-plan')).toBe('act')
    // Atlas's weekly plan is approved and its posts are in the calendar, as if Sam had approved it.
    expect(s.publishing.plan.status).toBe('approved')
    expect(s.publishing.posts.length).toBeGreaterThan(s0().publishing.posts.length)
    const line = s.log.find(l => l.restore?.some(h => h.id === 'h-plan'))!
    expect(line.text).toBe('Handled on its own: ' + s0().handoffs.find(h => h.id === 'h-plan')!.title)
    expect(line.undoUntil).toBeGreaterThan(line.at)
    expect(s.desk.done.some(x => x.id === 'h-plan')).toBe(false)
    s = reducer(s, { type: 'core/undo', id: line.id })
    expect(s.handoffs.some(h => h.id === 'h-plan')).toBe(true)
    expect(s.log.find(l => l.id === line.id)!.status).toBe('undone')

    // Iris shares the weekly report; Nova sends her reply and the conversation leaves Needs you.
    // (Once Claire has answered: a card Sam sent to Claire waits for her.)
    const back = s0()
    expect(reducer(back, { type: 'core/autonomy', agent: 'iris', action: 'iris-report', level: 'act' }).insights.shared.w47).toBeUndefined()
    s = reducer({ ...back, handoffs: back.handoffs.map(h => (h.id === 'h-report' ? { ...h, lane: undefined } : h)) }, { type: 'core/autonomy', agent: 'iris', action: 'iris-report', level: 'act' })
    expect(s.insights.shared.w47).toBeDefined()
    s = reducer(s0(), { type: 'core/autonomy', agent: 'nova', action: 'nova-complaint', level: 'act' })
    expect(s.inbox.convs.find(c => c.id === 'c-lea')!.status).toBe('you')
    // A recommended option is the agent's own call: Echo picks its counter-move.
    s = reducer(s0(), { type: 'core/autonomy', agent: 'echo', action: 'echo-counter', level: 'act' })
    expect(s.handoffs.some(h => h.id === 'h-peakline')).toBe(false)
    expect(s.listening.events['e-peak-price']?.move).toMatch(/Counter-post/)
  })

  it('a choice the agent never recommended, or missing information, stays with Sam', () => {
    // Atlas never invents a promo code: the question stays on the Desk while the plan goes out.
    let s = reducer(s0(), { type: 'core/autonomy', agent: 'atlas', action: 'atlas-plan', level: 'act' })
    expect(s.handoffs.some(h => h.id === 'h-code')).toBe(true)
    // Missing visual (info, with options) stays too.
    s = reducer(s0(), { type: 'core/autonomy', agent: 'atlas', action: 'atlas-fill', level: 'act' })
    expect(s.handoffs.some(h => h.id === 'h-visual')).toBe(true)
    // Same counter-move card, but no recommendation: Echo doesn't decide for Sam.
    const open = s0()
    const card = open.handoffs.find(h => h.id === 'h-peakline')!
    const unsure = { ...open, handoffs: open.handoffs.map(h => (h.id === card.id ? { ...h, options: h.options!.map(o => ({ label: o.label })) } : h)) }
    s = reducer(unsure, { type: 'core/autonomy', agent: 'echo', action: 'echo-counter', level: 'act' })
    expect(s.handoffs.some(h => h.id === 'h-peakline')).toBe(true)
    expect(s.listening.events['e-peak-price']).toBeUndefined()
  })
})
