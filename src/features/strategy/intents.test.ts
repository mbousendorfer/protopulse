import { expect, test } from 'vitest'
import { parse } from '../../data/command'
import { initialState } from '../../app/state'
import { intentDef } from '../../app/agents-registry'
import { campaignStatus, findCampaign, pillarProposal, pillarStatus } from './slice'

const kind = (q: string) => parse(q).intent.kind

test('Sage answers the test scenarios; briefs and the others’ questions still go where they did', () => {
  expect(kind('How is Trail Week doing?')).toBe('campaignStatus')
  expect(kind('Is Community behind?')).toBe('pillars')
  expect(kind('Put more Community in the mix')).toBe('pillarChange')
  expect(kind('Plan a launch for the Summit Bottle in March')).toBe('campaign')
  expect(kind('Brief: launch the Storm Jacket in March, 300 pre-orders')).toBe('campaign')
  expect(kind('How are we doing?')).toBe('performance')
  expect(kind('How did TikTok do last week?')).toBe('tiktok')
})

test('the numbers Sage quotes are the campaign page’s and the pillar bars’', () => {
  const s = initialState()
  const tw = findCampaign(s, 'trail week')!
  expect(tw.id).toBe('trail-week')
  expect(campaignStatus(s, tw).text).toMatch(/154 of 300 challenge sign-ups .* 51% of goal and 128% of the trajectory/)
  expect(pillarStatus(s)[0]).toMatchObject({ name: 'Community', actual: 9, target: 20 })
})

test('“more Community” becomes a proposal that keeps the pillars at 100%, added from Chat', () => {
  const s = initialState()
  const p = pillarProposal(s, 'Community', true)!
  expect(p.text).toBe('Raise Community from 20% to 25% of posts, Gear that lasts from 35% to 30%')
  const def = intentDef('pillarChange')!
  const a = def.chat({ kind: 'pillarChange', pillar: 'Community', more: true } as never, { s, chat: {} as never, route: {} as never })
  const after = a.effects.reduce((x, f) => f(x), s)
  expect(after.strategy.proposals[0].text).toBe(p.text)
})
