import { describe, expect, it } from 'vitest'
import { initialState, type State } from '../../app/state'
import { reducer } from '../../app/reducer'
import type { Autonomy } from '../../app/types'
import { anomaliesDue, tickAnomalies } from './engine'
import { anomalyList } from './slice'

const at = (level: Autonomy) => reducer(initialState(), { type: 'core/autonomy', agent: 'iris', action: 'iris-anomaly', level })
const spike = (s: State) => reducer(s, { type: 'core/fire', eventId: 'ev-linkedin' })
const linkedin = (s: State) => anomalyList(s).find(a => a.key === 'followers:linkedin')

describe('Iris anomaly engine', () => {
  it('raises nothing twice: the seeded rules match anomalies already open', () => {
    const s = initialState()
    expect(anomaliesDue(s)).toBe(false)
    expect(tickAnomalies(s)).toBe(s)
  })

  it('on Act, a follower spike becomes an anomaly Iris acts on, and Undo really undoes it', () => {
    const s = spike(at('act'))
    const an = linkedin(s)!
    expect(an.rule).toMatch(/New followers rises above 4/)
    expect(an.open).toBe(false)
    expect(s.handoffs.some(h => h.ref === `anomaly:${an.id}` && h.agent === 'atlas')).toBe(true)
    const entry = s.log.find(l => /Handled on her own/.test(l.text))!
    const back = reducer(s, { type: 'core/undo', id: entry.id })
    expect(linkedin(back)!.open).toBe(true)
    expect(back.handoffs.some(h => h.ref === `anomaly:${an.id}`)).toBe(false)
    expect(back.handoffs.some(h => h.ref === an.id && h.agent === 'iris')).toBe(true)
  })

  it('on Draft, the anomaly waits on the Desk; picking Iris’s option does it', () => {
    const s = spike(at('draft'))
    const card = s.handoffs.find(h => h.ref === linkedin(s)!.id)!
    expect(card.options![0]).toMatchObject({ label: 'Ask Atlas for a follow-up post', recommended: true })
    const done = reducer(s, { type: 'core/resolve', id: card.id, decision: { kind: 'option', option: card.options![0].label, index: 0 } })
    expect(linkedin(done)!.open).toBe(false)
    expect(done.handoffs.some(h => h.agent === 'atlas' && h.ref === `anomaly:${card.ref}`)).toBe(true)
  })

  it('on Suggest, it is only listed in Insights', () => {
    const s = spike(at('suggest'))
    expect(linkedin(s)!.open).toBe(true)
    expect(s.handoffs.some(h => h.ref === linkedin(s)!.id)).toBe(false)
    expect(s.log[0].text).toMatch(/^Spotted:/)
  })

  it('a rule turned off is respected', () => {
    const s = spike(reducer(initialState(), { type: 'insights/alertToggle', id: 'ia3' }))
    expect(linkedin(s)).toBeUndefined()
    expect(s.log[0].text).toMatch(/no alert rule covers it/)
  })

  it('a rule Sam creates is evaluated on the next heartbeat', () => {
    let s = reducer(at('suggest'), { type: 'insights/alertSave', alert: { id: '', subject: 'reach', condition: 'drops by more than', threshold: 20, unit: '%', to: 'desk', on: true } })
    expect(anomaliesDue(s)).toBe(true)
    s = tickAnomalies(s)
    expect(s.insights.raised.map(a => a.key)).toEqual(['reach:x'])
    expect(s.insights.raised[0].delta).toBe('−35%')
    expect(anomaliesDue(s)).toBe(false)
  })
})
