import { describe, expect, it } from 'vitest'
import { initialState } from '../../app/state'
import { withTeam } from '../../data/inbox'
import { leadOf, needOf } from './parts'
import { needsYou, waitOf } from './slice'

describe('the conversation set apart in Needs you', () => {
  it('is an escalation first, the one furthest past its target', () => {
    const s = initialState()
    const list = s.inbox.convs.map(withTeam).filter(needsYou)
    const now = Math.max(...list.map(c => c.at)) + 12 * 3_600_000
    const lead = leadOf(s, list, now)!
    expect(needOf(lead)).toBe('call')
    const over = (id: string) => { const w = waitOf(s, list.find(c => c.id === id)!, now)!; return w.waited - w.target }
    for (const c of list.filter(c => needOf(c) === 'call')) expect(over(lead.id)).toBeGreaterThanOrEqual(over(c.id))
    // Nothing escalated and nothing late: none is set apart.
    expect(leadOf(s, list.filter(c => needOf(c) !== 'call'), Math.min(...list.map(c => c.at)))).toBeUndefined()
  })
})
