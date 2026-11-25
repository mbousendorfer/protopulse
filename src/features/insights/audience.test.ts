import { describe, expect, it } from 'vitest'
import { initialState, type State } from '../../app/state'
import { reducer } from '../../app/reducer'
import { parse } from '../../data/command'
import { audienceOf } from './audience'

const level = (lvl: 'suggest' | 'draft' | 'act') => reducer(initialState(), { type: 'core/autonomy', agent: 'iris', action: 'iris-audience', level: lvl })
const fire = (s: State) => reducer(s, { type: 'core/fire', eventId: 'ev-audience' })
const brief = (s: State) => s.handoffs.find(h => h.ref === 'audience:tiktok')

describe('Audience', () => {
  it('weights networks by followers and finds TikTok’s under-25s', () => {
    expect(audienceOf('all').followers).toBe(48200)
    expect(audienceOf('tiktok').under25).toBe(62)
    expect(parse('Who follows us on TikTok?').intent).toMatchObject({ kind: 'audience', network: 'tiktok' })
  })

  it('on Draft, the recommendation waits on the Desk; “Brief Atlas” puts a draft on Atlas’s side, Undo takes it back', () => {
    let s = fire(level('draft'))
    const card = s.handoffs.find(h => h.id === 'h-aud-tiktok')!
    expect(card.options![0]).toMatchObject({ label: 'Brief Atlas', recommended: true })
    s = reducer(s, { type: 'core/resolve', id: card.id, decision: { kind: 'option', option: 'Brief Atlas', index: 0 } })
    expect(brief(s)?.agent).toBe('atlas')
    expect(s.insights.tips.tiktok).toBe('briefed')
    s = reducer(s, { type: 'core/undo', id: s.log[0].id })
    expect(brief(s)).toBeUndefined()
    expect(s.insights.tips.tiktok).toBe('open')
  })

  it('on Act Iris briefs Atlas herself; on Suggest she only lists it', () => {
    const act = fire(level('act'))
    expect(brief(act)).toBeDefined()
    expect(act.log.some(l => /Handled on her own/.test(l.text))).toBe(true)
    const sug = fire(level('suggest'))
    expect(sug.handoffs.some(h => h.id === 'h-aud-tiktok')).toBe(false)
    expect(sug.log[0].text).toMatch(/^Spotted: TikTok followers are 62% under 25/)
  })
})
