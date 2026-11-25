import { expect, test } from 'vitest'
import { generatePlan, readBrief, readGoal, readLaunch } from './strategy'
import { DAY, DEMO_START } from '../app/time'

const now = DEMO_START

test('Sage reads the goal from the brief, and doesn’t take a date or a year for one', () => {
  expect(readGoal('Launch the Storm Jacket on March 15, goal 300 pre-orders.')).toEqual({ target: 300, unit: 'pre-orders' })
  expect(readGoal('Repair Week in January: 1,000 repair requests.')).toEqual({ target: 1000, unit: 'requests' })
  expect(readGoal('€40,000 from social in December')).toEqual({ target: 40000, unit: 'revenue from social (€)' })
  expect(readGoal('2k orders in September')).toEqual({ target: 2000, unit: 'orders' })
  expect(readGoal('Launch the Summit Bottle on March 15')).toBeUndefined()
  expect(readGoal('Spring push in 2026')).toBeUndefined()
})

test('Sage reads the launch date, or says it is missing', () => {
  const march = new Date(readLaunch('Launch on March 15, goal 300 pre-orders', now)!)
  expect([march.getMonth(), march.getDate()]).toEqual([2, 15])
  expect(readLaunch('Push in 3 weeks', now)).toBe(now + 21 * DAY)
  expect(readBrief('Plan a launch for the Summit Bottle', now).missing).toEqual(['goal', 'launch'])
  expect(readBrief('Summit Bottle in March, 500 orders', now).missing).toEqual([])
})

test('the fields win over the sentence; what nobody answered is written down as an assumption', () => {
  const c = generatePlan('c', { text: 'Plan a launch for the Summit Bottle', networks: ['instagram', 'tiktok'], audience: 'Gym-goers', goal: { target: 800, unit: 'orders' } }, now)
  expect(c.goal).toMatchObject({ target: 800, label: 'orders' })
  expect(c.audience).toBe('Gym-goers')
  expect(new Set(c.posts.map(p => p.network))).toEqual(new Set(['instagram', 'tiktok']))
  expect(c.assumptions).toEqual([expect.stringMatching(/^Launch on .* the brief gives no date$/)])
})
