import { expect, test } from 'vitest'
import { initialState } from '../../app/state'
import { now } from '../../app/core'
import { SCRIPT } from './script'
import { accountOf, routeAccount } from './accounts'
import { overCap } from './guards'
import type { Post } from '../../data/publishing'

test('repair content on Instagram goes to Fernway Repair; everything else stays on the main account', () => {
  expect(routeAccount({ network: 'instagram', pillar: 'Repair & care' })).toBe('ig-repair')
  expect(routeAccount({ network: 'instagram', pillar: 'Community' })).toBeUndefined()
  expect(routeAccount({ network: 'linkedin', pillar: 'Repair & care' })).toBeUndefined()
  expect(routeAccount({ network: 'instagram', pillar: 'Repair & care', account: 'instagram' })).toBe('instagram')
  const s = initialState()
  expect(accountOf(s.publishing.posts.find(p => p.id === 'p-28')!).name).toBe('Fernway Repair')
})

test('the Sunday repair queue fills Fernway Repair', () => {
  const s = SCRIPT.find(e => e.id === 'ev-queue')!.run!(initialState(), true)
  const repair = s.publishing.posts.filter(p => p.queue === 'q-repair')
  expect(repair.length).toBeGreaterThan(0)
  expect(repair.every(p => p.account === 'ig-repair')).toBe(true)
})

test('three posts a day is per profile: Fernway Repair has its own three', () => {
  const s = initialState()
  const base: Post = { id: 'a', network: 'instagram', at: now(s) + 3_600_000, text: 'x', status: 'scheduled', author: 'atlas', pillar: 'Community' }
  const three = [base, { ...base, id: 'b' }, { ...base, id: 'c' }]
  expect(overCap(three, { ...base, id: 'd' })).toBe(true)
  expect(overCap(three, { ...base, id: 'd', account: 'ig-repair' })).toBe(false)
})
