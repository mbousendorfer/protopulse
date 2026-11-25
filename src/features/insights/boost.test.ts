import { describe, expect, it } from 'vitest'
import { initialState, type State } from '../../app/state'
import { reducer } from '../../app/reducer'
import { anomalyList, boostBudget } from './slice'

const g2 = (s: State) => s.agents.find(a => a.id === 'iris')!.guardrails.find(g => g.id === 'g2')!.value
const storm = (s: State) => anomalyList(s).find(a => a.id === 'an-storm')!
const boostCard = (s: State) => reducer(s, { type: 'core/resolve', id: 'h-boost', decision: { kind: 'option', option: 'Boost €150 for 5 days', index: 0 } })

describe('Iris boost budget', () => {
  it('reads the cap from the guardrail and the spend from the boosts', () => {
    expect(boostBudget(initialState())).toEqual({ cap: 1500, used: 580, left: 920 })
  })

  it('a boost decided on the Desk is spent, shown, and given back by Undo', () => {
    const s = boostCard(initialState())
    expect(boostBudget(s).used).toBe(730)
    expect(g2(s)).toBe('€730 of €1,500 used')
    expect(storm(s).open).toBe(false)
    const back = reducer(s, { type: 'core/undo', id: s.log[0].id })
    expect(boostBudget(back).used).toBe(580)
    expect(g2(back)).toBe('€580 of €1,500 used')
  })

  it('refuses a boost over the cap and brings the card back with the reason', () => {
    const tight = reducer(initialState(), { type: 'core/guardrail', agent: 'iris', id: 'g2', value: '€600' })
    const s = boostCard(tight)
    expect(boostBudget(s).used).toBe(580)
    expect(s.handoffs.find(h => h.id === 'h-boost')!.why).toMatch(/^Not boosted: €150 would take this month to €730, over the €600 cap/)
    expect(storm(s).open).toBe(true)
  })

  it('a boost from Insights can be undone too', () => {
    const s = reducer(initialState(), { type: 'insights/anomaly', id: 'an-storm', title: storm(initialState()).title, action: 'Boost €150 for 5 days' })
    expect(boostBudget(s).used).toBe(730)
    const back = reducer(s, { type: 'core/undo', id: s.log[0].id })
    expect(boostBudget(back).used).toBe(580)
    expect(storm(back).open).toBe(true)
  })
})
