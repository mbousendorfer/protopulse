import { describe, expect, it } from 'vitest'
import { initialState, type State } from '../../app/state'
import { reducer } from '../../app/reducer'
import { intentDef } from '../../app/agents-registry'
import { MIN } from '../../app/time'
import { allMentions, moodCount, recent, visibleMentions, WEEK } from './model'

const s0 = () => initialState()
const fire = (s: State) => reducer(s, { type: 'core/fire', eventId: 'ev-spike' })
const spikeCard = (s: State) => s.handoffs.find(h => h.ref === 'ev-spike')
const atlas = (s: State) => s.agents.find(a => a.id === 'atlas')!
const level = (s: State, l: 'suggest' | 'draft' | 'act') => reducer(s, { type: 'core/autonomy', agent: 'echo', action: 'echo-spike', level: l })
const at = (s: State, t: number): State => ({ ...s, clock: { base: t, realAt: Date.now() } })

describe('Echo · negative spike', () => {
  it('puts the 27 mentions in the feed and raises a card whose numbers come from them', () => {
    const s = fire(level(s0(), 'draft'))
    expect(s.listening.live.filter(m => m.id.startsWith('spike-'))).toHaveLength(27)
    const h = spikeCard(s)!
    expect(h.title).toMatch(/^27 negative mentions/)
    expect(h.preview?.type === 'metric' && Number(h.preview.value)).toBeGreaterThanOrEqual(27)
    expect(fire(s).handoffs.filter(x => x.ref === 'ev-spike')).toHaveLength(1)
  })

  it('pausing Atlas really pauses it, asks Claire, and Undo puts everything back', () => {
    let s = fire(level(s0(), 'draft'))
    const h = spikeCard(s)!
    s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'option', option: h.options![0].label, index: 0 } })
    expect(atlas(s).status).toBe('paused')
    const statement = s.handoffs.find(x => x.ref === `statement:${h.id}`)!
    expect(statement.lane).toBe('claire')
    s = reducer(s, { type: 'core/undo', id: s.log.find(l => l.restore?.some(r => r.id === h.id))!.id })
    expect(atlas(s).status).toBe('on')
    expect(s.handoffs.some(x => x.ref === `statement:${h.id}`)).toBe(false)
    expect(spikeCard(s)).toBeTruthy()
  })

  it('approving the statement brings Atlas back', () => {
    let s = fire(level(s0(), 'draft'))
    const h = spikeCard(s)!
    s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'option', option: h.options![0].label, index: 0 } })
    const st = s.handoffs.find(x => x.ref === `statement:${h.id}`)!
    s = reducer(s, { type: 'core/resolve', id: st.id, decision: { kind: 'approve' } })
    expect(atlas(s).status).toBe('on')
  })

  it('Nova’s replies mark the spike mentions as replied once approved', () => {
    let s = fire(level(s0(), 'draft'))
    const h = spikeCard(s)!
    s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'option', option: h.options![1].label, index: 1 } })
    const r = s.handoffs.find(x => x.ref === 'spike-replies')!
    expect(r.agent).toBe('nova')
    s = reducer(s, { type: 'core/resolve', id: r.id, decision: { kind: 'approve' } })
    expect(s.listening.mentions['spike-1']).toBe('replied')
  })

  it('Monitor reports two hours later', () => {
    let s = fire(level(s0(), 'draft'))
    const h = spikeCard(s)!
    s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'option', option: h.options![2].label, index: 2 } })
    s = reducer(at(s, s.listening.watchSpike!.until + MIN), { type: 'core/heartbeat' })
    expect(s.handoffs.some(x => /calmed down/.test(x.title))).toBe(true)
  })

  it('the level changes what Echo does: Suggest notes it, Act pauses Atlas herself with an Undo', () => {
    const sug = fire(level(s0(), 'suggest'))
    expect(spikeCard(sug)).toBeUndefined()
    expect(sug.log[0].text).toMatch(/digest/)
    const act = fire(level(s0(), 'act'))
    expect(spikeCard(act)).toBeUndefined()
    expect(atlas(act).status).toBe('paused')
    expect(act.log.find(l => /Handled on her own/.test(l.text))?.undoUntil).toBeTruthy()
  })
})

describe('Echo · counts come from the state', () => {
  it('⌘K cites the feed’s own numbers', () => {
    const s = fire(level(s0(), 'draft'))
    const c = moodCount(s, recent(s, WEEK))
    const text = intentDef('mentions')!.bar({ kind: 'mentions' } as never, { s, d: () => {}, go: () => {}, query: '', ask: () => {} }).text
    expect(text).toContain(`${c.negative} negative mentions out of ${c.total}`)
  })

  it('Chat only cites negative mentions', () => {
    const s = fire(level(s0(), 'draft'))
    const r = intentDef('mentions')!.chat({ kind: 'mentions' } as never, { s, chat: s.chats.list[0], route: {} as never }).replies[0]
    expect(r.text).not.toMatch(/hugo/)
    expect(r.card?.type === 'list' && r.card.items.every(i => !/hugo\.rando/.test(i.title))).toBe(true)
  })

  it('hidden mentions leave the count', () => {
    let s = s0()
    const n = visibleMentions(s).length
    s = reducer(s, { type: 'listening/mentions', ids: [allMentions(s)[0].id], op: 'hide' })
    expect(visibleMentions(s).length).toBe(n - 1)
  })
})

describe('Echo · competitor moves', () => {
  const sales = (s: State) => reducer(s, { type: 'listening/move', event: 'e-norro-repair', index: 2 })
  const salesLevel = (s: State, l: 'suggest' | 'draft' | 'act') => reducer(s, { type: 'core/autonomy', agent: 'echo', action: 'echo-sales', level: l })

  it('Tell sales on Draft puts the email on the Desk; approving sends it', () => {
    let s = sales(s0())
    const h = s.handoffs.find(x => x.ref === 'sales:e-norro-repair')!
    expect(h.preview?.type).toBe('text')
    expect(s.log.some(l => /Emailed the sales team \(sales@/.test(l.text))).toBe(false)
    s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'approve' } })
    expect(s.log.some(l => /Emailed the sales team \(sales@/.test(l.text))).toBe(true)
    expect(s.listening.events['e-norro-repair'].status).toBe('done')
  })

  it('Tell sales on Act sends at once, on Suggest sends nothing', () => {
    expect(sales(salesLevel(s0(), 'act')).log[0].text).toMatch(/Emailed the sales team \(sales@/)
    const sug = sales(salesLevel(s0(), 'suggest'))
    expect(sug.log.some(l => /Emailed the sales team \(sales@/.test(l.text))).toBe(false)
    expect(sug.handoffs.some(x => x.ref === 'sales:e-norro-repair')).toBe(false)
  })

  it('acting on an event in Listening settles its Desk card, whatever the competitor', () => {
    let s = reducer(s0(), { type: 'core/fire', eventId: 'ev-trailkind' })
    expect(s.handoffs.some(h => /Trailkind/.test(h.title))).toBe(true)
    s = reducer(s, { type: 'listening/move', event: 'e-trail-viral', index: 2 })
    expect(s.handoffs.some(h => h.topic === 'Competitor' && /Trailkind/.test(h.title))).toBe(false)
  })
})
