import { expect, test } from 'vitest'
import { initialState } from '../../app/state'
import { reducer } from '../../app/reducer'
import { insightsNeeds } from './needs'
import { videoNeeds } from '../video/slice'

test('the Insights block counts open anomalies once (their Desk cards are the same decision), and empties as Sam decides', () => {
  let s = initialState()
  // Three open anomalies; the boost card is the Storm Jacket anomaly, not a fourth thing.
  expect(insightsNeeds(s)).toMatchObject({ count: 3, cards: [] })
  for (const id of ['an-tiktok', 'an-storm', 'an-clicks']) s = reducer(s, { type: 'insights/anomaly', id, title: id, action: 'Snooze a week' })
  expect(insightsNeeds(s).count).toBe(0)
})

test('the Video block counts clips to send or unblock and videos waiting for a go', () => {
  let s = initialState()
  const ready = s.video.clips.filter(c => c.status === 'ready').length
  expect(videoNeeds(s).count).toBe(ready)
  s = reducer(s, { type: 'video/snooze', ids: [s.video.clips.find(c => c.status === 'ready')!.id] })
  expect(videoNeeds(s).count).toBe(ready - 1)
})
