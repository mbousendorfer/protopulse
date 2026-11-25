import type { AgentId, LogEntry } from '../app/types'
import { T, MIN } from '../app/time'

// Recent entries, written by hand. Undo windows still open for the first ones.
const RECENT: LogEntry[] = [
  { id: 'l-1', agent: 'nova', at: T(8, 9), text: 'Answered @tom.bivouac: the Ridge 28L fits cabin rules (55 × 30 × 20 cm)', reason: 'Product question, set to Act', rule: 'Give the number, then the answer', status: 'done', undoUntil: T(8, 19), link: '/inbox/c-tom' },
  { id: 'l-2', agent: 'atlas', at: T(8, 6), text: 'Moved Friday’s reel from 12:00 to 18:30', reason: 'Friday evening reels get 2.1× the reach', status: 'done', undoUntil: T(9, 6), link: '/publishing/calendar', detail: { before: 'Fri 28 · 12:00', after: 'Fri 28 · 18:30' } },
  { id: 'l-3', agent: 'nova', at: T(8, 2), text: 'Refunded €9.90 shipping to Inès Moreau, order #48377', reason: 'Late delivery, refunds up to €15 set to Act', rule: 'Apologise once, then fix', status: 'done', undoUntil: T(8, 32), link: '/inbox/c-ines' },
  { id: 'l-4', agent: 'nova', at: T(7, 58), text: 'Hid 12 spam comments on Instagram', reason: 'Spam, set to Act', status: 'done', undoUntil: T(9, 58), link: '/inbox' },
  { id: 'l-5', agent: 'echo', at: T(7, 50), text: 'Filed 23 new mentions: 17 positive, 4 neutral, 2 negative', reason: 'Daily watch', status: 'done', link: '/listening/mentions' },
  { id: 'l-6', agent: 'echo', at: T(7, 2), text: 'Raised Peakline’s Aero 30 price cut to your Desk', reason: 'Competitor event', status: 'done', link: '/listening/competitors' },
  { id: 'l-7', agent: 'iris', at: T(7, 0), text: 'Wrote this morning’s brief', status: 'done', link: '/' },
  { id: 'l-8', agent: 'iris', at: T(6, 58), text: 'Raised a TikTok views anomaly', reason: '4 posts in a row below normal range', status: 'done', link: '/insights/anomalies' },
  { id: 'l-9', agent: 'atlas', at: T(6, 30), text: 'Built next week’s plan: 14 posts on 5 networks', reason: 'Thursday planning, set to Draft', status: 'done', link: '/publishing/plan' },
  { id: 'l-10', agent: 'sage', at: T(5, 48), text: 'Proposed moving 2 Trail Week posts from Instagram to TikTok', status: 'done', link: '/strategy/campaigns/trail-week' },
  { id: 'l-11', agent: 'nova', at: T(3, 12), text: 'Answered 9 shipping questions overnight', reason: 'Shipping questions, set to Act', status: 'done', link: '/inbox' },
  { id: 'l-12', agent: 'echo', at: T(2, 40), text: 'Spotted “packing my bag” rising 4× on TikTok and handed it to Atlas', status: 'done', link: '/listening/trends' },
  { id: 'l-13', agent: 'nova', at: T(1, 5), text: 'Answered a German warranty question from Jonas K.', reason: 'Product question, set to Act', status: 'done', link: '/inbox' },
  { id: 'l-14', agent: 'nova', at: T(23, 40, -1), text: 'Escalated a stove clip safety question to your Desk', reason: 'Safety topics always escalate', status: 'done' },
  { id: 'l-15', agent: 'atlas', at: T(18, 30, -1), text: 'Published “Storm Jacket vs. a garden hose” on Instagram', status: 'approved', link: '/publishing/calendar' },
  { id: 'l-16', agent: 'nova', at: T(17, 55, -1), text: 'Refunded €12.50 shipping to Hugo Lambert', reason: 'Refunds up to €15 set to Act', status: 'undone', link: '/inbox' },
]

// Older history, generated from templates so the journal feels lived in.
const TEMPLATES: { agent: AgentId; text: string; reason?: string; status?: LogEntry['status'] }[] = [
  { agent: 'nova', text: 'Answered a sizing question about the Ember Fleece', reason: 'Product question, set to Act' },
  { agent: 'nova', text: 'Answered “do you ship to Switzerland?”', reason: 'Shipping question, set to Act' },
  { agent: 'nova', text: 'Hid 4 bot comments on TikTok', reason: 'Spam, set to Act' },
  { agent: 'nova', text: 'Sent you a complaint draft about a leaking bottle lid', reason: 'Complaint, set to Draft' },
  { agent: 'nova', text: 'Complaint reply about a torn zip, approved by you', status: 'approved' },
  { agent: 'nova', text: 'Complaint reply about a late order, edited by you', status: 'edited' },
  { agent: 'nova', text: 'Refunded €7.90 shipping on a delayed order', reason: 'Refunds up to €15 set to Act' },
  { agent: 'nova', text: 'Answered a Google review (5 stars) with thanks', status: 'approved' },
  { agent: 'atlas', text: 'Published a TikTok: “Drop test from 3 metres”', status: 'approved' },
  { agent: 'atlas', text: 'Moved a LinkedIn post from 17:00 to 08:30', reason: 'LinkedIn mornings perform 1.6× better' },
  { agent: 'atlas', text: 'Rewrote the October hiking checklist for a recycle', reason: 'Recycling, set to Draft' },
  { agent: 'atlas', text: 'Published an Instagram carousel: “5 knots every hiker should know”', status: 'approved' },
  { agent: 'iris', text: 'Raised a spike in link clicks on Facebook', reason: 'Anomaly, set to Act' },
  { agent: 'iris', text: 'Wrote the morning brief' },
  { agent: 'echo', text: 'Filed 31 new mentions', reason: 'Daily watch' },
  { agent: 'echo', text: 'Raised Trailkind’s viral reel (1.2M views)', reason: 'Competitor event' },
  { agent: 'echo', text: 'Spotted “repair over replace” growing on LinkedIn', reason: 'Trend watch' },
  { agent: 'echo', text: 'Emailed the sales team about Norrø’s repair programme', status: 'approved' },
  { agent: 'sage', text: 'Moved Trail Week teaser production from Atlas to Echo’s UGC list', reason: 'Reallocation, set to Act' },
]

const generated: LogEntry[] = []
for (let i = 0; i < 104; i++) {
  const tpl = TEMPLATES[(i * 7) % TEMPLATES.length]
  const minutesBack = 480 + i * 37 + ((i * 13) % 17)
  generated.push({ id: `l-g${i}`, agent: tpl.agent, at: T(1, 0) - minutesBack * MIN, text: tpl.text, reason: tpl.reason, status: tpl.status ?? 'done' })
}

export const LOG: LogEntry[] = [...RECENT, ...generated]
