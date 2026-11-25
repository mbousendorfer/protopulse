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

test('the plan follows the goal, the product, the season and Sage’s cadence', () => {
  const cadence = { instagram: 5, tiktok: 4, linkedin: 2, facebook: 2, youtube: 1, x: 0 }
  const bottle = generatePlan('b', 'Summit Bottle back-to-school push in September, 2,000 orders.', now, { cadence })
  const jacket = generatePlan('j', 'Launch the new Storm Jacket on March 15, goal 300 pre-orders.', now, { cadence })
  const titles = (c: ReturnType<typeof generatePlan>) => c.posts.map(p => p.title)
  expect(titles(bottle).join(' ')).not.toMatch(/rain/)
  expect(titles(bottle)).toContain('Dropped from 5 metres, still fine')
  expect(titles(bottle)[0]).toBe('Back to the commute: something new from Fernway')
  expect(titles(jacket)).toContain('Pre-orders open: the Storm Jacket ships on 15 Mar')
  expect(titles(jacket)[0]).toBe('First hikes of the year: something new from Fernway')
  expect(new Set(titles(bottle)).size).toBe(bottle.posts.length)
  // X is at 0 in the cadence: no X post.
  expect([...bottle.posts, ...jacket.posts].some(p => p.network === 'x')).toBe(false)
  const challenge = generatePlan('c', 'Winter trail challenge in January, 500 sign-ups', now, { cadence })
  expect(titles(challenge)).toContain('Day 1: a winter walk, even 2 km from home')
  expect(challenge.risks.join(' ')).toMatch(/indoor prompts/)
  expect(challenge.posts.every(p => p.pillar)).toBe(true)
})

test('v2 applies every request in the note and lists each change', async () => {
  const { revisePlan } = await import('./strategy')
  const c = generatePlan('b', 'Summit Bottle in September, 2,000 orders', now)
  const v = revisePlan(c, 'More TikTok, cut the budget, and start a week later')
  expect(v.version).toBe(2)
  expect(v.diff!.filter(x => /moved from .* to TikTok/.test(x.text))).toHaveLength(2)
  expect(v.budget).toBeLessThan(c.budget)
  expect(v.start - c.start).toBe(7 * DAY)
  expect(v.posts[0].day - c.posts[0].day).toBe(7)
  const none = revisePlan(c, 'Make it feel warmer')
  expect(none.diff![0].text).toMatch(/Your note/)
  expect(none.risks.at(-1)).toMatch(/warmer/)
})
