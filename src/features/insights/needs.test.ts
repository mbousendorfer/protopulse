import { expect, test } from 'vitest'
import { initialState } from '../../app/state'
import { reducer } from '../../app/reducer'
import { insightsNeeds } from './needs'
import { videoNeeds } from '../video/slice'

test('the Insights block counts open anomalies once (their Desk cards are the same decision), and empties as Sam decides', () => {
  let s = initialState()
  // Three open anomalies; a Desk card about an anomaly is the same decision, not a fourth thing.
  expect(insightsNeeds(s)).toMatchObject({ count: 3, cards: [] })
  for (const id of ['an-tiktok', 'an-storm', 'an-clicks']) s = reducer(s, { type: 'insights/anomaly', id, title: id, action: 'Snooze a week' })
  expect(insightsNeeds(s).count).toBe(0)
})

test('the Video block counts clips to send or unblock, flops to recut and videos waiting for a go', () => {
  let s = initialState()
  const ready = s.video.clips.filter(c => c.status === 'ready').length
  const flops = videoNeeds(s).flops.length
  expect(videoNeeds(s).count).toBe(ready + flops)
  s = reducer(s, { type: 'video/snooze', ids: [s.video.clips.find(c => c.status === 'ready')!.id] })
  expect(videoNeeds(s).count).toBe(ready + flops - 1)
  // A recut leaves the flop out of the block and joins the clips to review: the count stays.
  for (const c of videoNeeds(s).flops) s = reducer(s, { type: 'video/recut', id: c.id })
  expect(videoNeeds(s).flops).toHaveLength(0)
  expect(videoNeeds(s).count).toBe(ready + flops - 1)
})
