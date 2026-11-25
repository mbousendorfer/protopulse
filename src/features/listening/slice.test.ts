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

describe('Echo · searches, alert rules and guardrails', () => {
  const echo = (s: State) => s.agents.find(a => a.id === 'echo')!
  const g = (s: State, id: string) => echo(s).guardrails.find(x => x.id === id)!.value

  it('a new search collects for 10 minutes, then shows its volume', async () => {
    const { searchVolume } = await import('./model')
    const s = reducer(s0(), { type: 'listening/searchSave', search: { id: '', name: 'Seams', keywords: 'storm jacket seams', exclude: '', volume: 0 } })
    const x = s.listening.searches[0]
    expect(searchVolume(x, x.startedAt!).collecting).toBe(true)
    const done = searchVolume(x, x.startedAt! + 11 * MIN)
    expect(done.collecting).toBe(false)
    expect(done.volume).toBeGreaterThan(0)
  })

  it('the search cap shown in the guardrail is the one applied', () => {
    let s = s0()
    expect(g(s, 'g3')).toBe('11 of 15')
    s = reducer(s, { type: 'core/guardrail', agent: 'echo', id: 'g3', value: '11 of 11' })
    const before = s.listening.searches.length
    s = reducer(s, { type: 'listening/searchSave', search: { id: '', name: 'X', keywords: 'x', exclude: '', volume: 0 } })
    expect(s.listening.searches.length).toBe(before)
    expect(s.notice?.text).toMatch(/search slots/)
    s = reducer(s, { type: 'listening/searchToggle', id: 's1' })
    expect(g(s, 'g3')).toBe('10 of 11')
  })

  it('a rule that matches raises a card once, and Nova can reply to what it found', () => {
    let s = reducer(s0(), { type: 'listening/alertSave', alert: { id: '', subject: 's3', condition: 'gets more than', threshold: 5, unit: ' mentions in 1 h', to: 'desk', on: true } })
    s = fire(level(s, 'draft'))
    const h = s.handoffs.find(x => x.ref?.startsWith('alert:'))!
    expect(h.title).toMatch(/Storm Jacket/)
    s = reducer(at(s, s.clock.base + 2 * MIN), { type: 'core/heartbeat' })
    expect(s.handoffs.filter(x => x.ref === h.ref)).toHaveLength(1)
    s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'option', option: h.options![0].label, index: 0 } })
    expect(s.handoffs.filter(x => x.agent === 'nova' && x.topic === 'Mention reply').length).toBeGreaterThan(5)
  })

  it('the brand negative rule joins the spike instead of a second card, and copies Claire', () => {
    const s = fire(level(s0(), 'draft'))
    expect(s.handoffs.some(x => x.ref === 'alert:la1')).toBe(false)
    expect(s.log.some(l => /Copied Claire|Claire is copied/.test(l.text))).toBe(true)
  })

  it('raising the spike threshold in the guardrail keeps the spike off the Desk', () => {
    const s = fire(reducer(level(s0(), 'draft'), { type: 'core/guardrail', agent: 'echo', id: 'g1', value: '5× usual negative volume in 1 h' }))
    expect(spikeCard(s)).toBeUndefined()
  })

  it('nothing fires on a fresh workspace', () => {
    const s = reducer(s0(), { type: 'core/heartbeat' })
    expect(s.handoffs.some(x => x.ref?.startsWith('alert:'))).toBe(false)
  })
})

describe('Echo · a competitor you add', () => {
  it('gets benchmark numbers after the backfill, then a first event on the Desk', async () => {
    const { competitorsOf, shareOfVoice, BACKFILL_MS, FIRST_EVENT_MS } = await import('./model')
    let s = reducer(s0(), { type: 'listening/watchSave', w: { id: 'c-wild', name: 'Wildroot', website: 'wildroot.eu', accounts: [{ network: 'tiktok', handle: '@wildroot' }], tracking: true, since: 0, custom: true } })
    const since = s.listening.watch.find(w => w.id === 'c-wild')!.since
    expect(competitorsOf(s).some(c => c.id === 'c-wild')).toBe(false)
    s = at(s, since + BACKFILL_MS + MIN)
    const c = competitorsOf(s).find(x => x.id === 'c-wild')!
    expect(c.followers).toBeGreaterThan(0)
    const sov = shareOfVoice(s)
    expect(Object.values(sov).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(99)
    s = reducer(at(s, since + FIRST_EVENT_MS + MIN), { type: 'core/heartbeat' })
    const h = s.handoffs.find(x => x.ref === 'e-c-wild')!
    expect(h.title).toMatch(/Wildroot/)
    s = reducer(s, { type: 'listening/move', event: 'e-c-wild', index: 0 })
    expect(s.handoffs.some(x => x.ref === 'e-c-wild')).toBe(false)
    expect(s.listening.events['e-c-wild'].status).toBe('done')
  })

  it('the competitor cap refuses a seventh one', () => {
    let s = s0()
    for (const n of ['A', 'B', 'C']) s = reducer(s, { type: 'listening/watchSave', w: { id: `c-${n}`, name: n, website: '', accounts: [{ network: 'x', handle: n }], tracking: true, since: 0, custom: true } })
    expect(s.listening.watch).toHaveLength(6)
    expect(s.notice?.text).toMatch(/your cap/)
  })
})
