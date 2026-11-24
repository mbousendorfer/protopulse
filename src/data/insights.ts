import type { Network } from '../app/types'
import { T } from '../app/time'

/** A sentence part: plain text, or a number that points to its data source. */
export type Cited = string | { n: string; source: string }

export type ReportSection = { heading: string; paras: Cited[][]; chart?: 'reach' | 'tiktok' | 'pillars' | 'trail' }

export type Report = {
  id: string
  kind: 'brief' | 'weekly' | 'campaign'
  title: string
  period: string
  writtenAt: number
  summary: string
  sections: ReportSection[]
}

const c = (n: string, source: string) => ({ n, source })

export const REPORTS: Report[] = [
  {
    id: 'brief', kind: 'brief', title: 'Morning brief', period: 'Since Mon 24 Nov, 18:40', writtenAt: T(7, 0),
    summary: 'A quiet night for complaints, a loud one for competitors. Peakline cut prices, TikTok is still soft, and next week’s plan is ready.',
    sections: [
      { heading: 'Overnight', paras: [[
        'Nova handled ', c('142 conversations', 'Inbox · Mon 18:40 – Tue 07:00 · all networks'), ' on her own, including ', c('9 shipping questions', 'Inbox · tagged “shipping” · overnight'), ' and ', c('12 spam comments', 'Instagram · hidden by Nova · 07:46'), '. Four need you this morning.',
      ]] },
      { heading: 'What moved', paras: [[
        'TikTok views per video are at ', c('1,840', 'TikTok · median of the last 4 videos · since Thu 20 Nov'), ', down ', c('38%', 'vs. median of the 10 videos before · 9,000'), '. The Storm Jacket carousel keeps climbing: ', c('6.4% engagement', 'Instagram · post of Mon 24 Nov · after 20 h'), ', three times the account average.',
      ]], chart: 'tiktok' },
      { heading: 'Competitors', paras: [[
        'Peakline cut the Aero 30 to ', c('€99', 'peakline.com · product page · checked 06:52'), ' (−29%). Three of your followers asked if you’ll match. Echo has a counter-move ready on your Desk.',
      ]] },
    ],
  },
  {
    id: 'w47', kind: 'weekly', title: 'Weekly report · 17 – 23 November', period: '17 – 23 Nov 2026', writtenAt: T(8, 0, -1),
    summary: 'Reach up 8% to 412k, engagement steady at 3.1%. TikTok dipped late in the week; the repair post did more for LinkedIn than any post this year.',
    sections: [
      { heading: 'What worked', paras: [[
        'Reach reached ', c('412k', 'All networks · unique reach · 17 – 23 Nov'), ', ', c('+8%', 'vs. 381k on 10 – 16 Nov'), ', mostly from Instagram reels. The Storm Jacket carousel posted Monday reached ', c('6.4% engagement', 'Instagram · post of 24 Nov, 20 h after posting'), ' and ', c('214 saves', 'Instagram · saves · same post'), '.',
      ], [
        'The repair programme post on LinkedIn brought ', c('+420 followers', 'LinkedIn · new followers · Fri 21 Nov'), ' in a day after the Green Gear newsletter shared it.',
      ]], chart: 'reach' },
      { heading: 'What didn’t', paras: [[
        'TikTok views per video fell to ', c('1,840', 'TikTok · median of 4 videos · 20 – 23 Nov'), '. All four videos open with a 5 to 7 second intro. Trailkind’s best videos hook in ', c('2 seconds', 'Echo · Trailkind top 20 posts · median hook length'), '.',
      ]], chart: 'tiktok' },
      { heading: 'What we change', paras: [[
        'Atlas will test 3-second hooks on the next 3 TikToks. Sage suggests moving 2 Trail Week posts from Instagram to TikTok, where the campaign is at ', c('118% of target', 'Trail Week · TikTok sign-ups vs plan · day 2'), '.',
      ]] },
      { heading: 'Community', paras: [[
        'Median reply time dropped to ', c('4 minutes', 'Inbox · median first reply · 17 – 23 Nov'), '. Nova handled ', c('91%', 'Inbox · conversations closed without you · 17 – 23 Nov'), ' of conversations alone. Sentiment stayed positive at ', c('78%', 'Listening · brand mentions · positive share'), '.',
      ]] },
    ],
  },
  {
    id: 'w46', kind: 'weekly', title: 'Weekly report · 10 – 16 November', period: '10 – 16 Nov 2026', writtenAt: T(8, 0, -8),
    summary: 'A steady week. Reach 381k, engagement 2.9%. Facebook recovered from the 10 November drop.',
    sections: [
      { heading: 'What worked', paras: [['Reach reached ', c('381k', 'All networks · unique reach · 10 – 16 Nov'), ', ', c('+3%', 'vs. 370k on 3 – 9 Nov'), '. The “5 knots” carousel was the most saved post of the month with ', c('388 saves', 'Instagram · saves · 12 Nov'), '.']] },
      { heading: 'What didn’t', paras: [['Facebook reach dropped ', c('41%', 'Facebook · reach · 10 Nov vs 7-day median'), ' on 10 November after a feed change, then recovered by Thursday.']] },
      { heading: 'What we change', paras: [['Atlas moved Facebook posts to 19:00, where reach recovered fastest.']] },
    ],
  },
  {
    id: 'w45', kind: 'weekly', title: 'Weekly report · 3 – 9 November', period: '3 – 9 Nov 2026', writtenAt: T(8, 0, -15),
    summary: 'Instagram followers jumped after a creator story. Reach 370k, engagement 3.0%.',
    sections: [
      { heading: 'What worked', paras: [['Instagram gained ', c('+1,240 followers', 'Instagram · new followers · 3 Nov'), ' in a day after @camille.outdoors shared the Ridge in a story.']] },
      { heading: 'What we change', paras: [['Echo now watches creators who mention the Ridge without being paid.']] },
    ],
  },
  {
    id: 'w44', kind: 'weekly', title: 'Weekly report · 27 Oct – 2 Nov', period: '27 Oct – 2 Nov 2026', writtenAt: T(8, 0, -22),
    summary: 'Repair Friday week. Reach 402k, the best week of October, with LinkedIn carrying the story.',
    sections: [
      { heading: 'What worked', paras: [['Repair Friday drove ', c('1,180 repair requests', 'fernway.co/repair · form submissions · 24 – 31 Oct'), ' against a goal of ', c('800', 'Repair Friday · campaign goal'), '.']] },
      { heading: 'What we change', paras: [['Keep one repair post per week on LinkedIn: it beats product posts there by ', c('1.9×', 'LinkedIn · engagement rate · repair vs product posts · 90 days'), '.']] },
    ],
  },
  {
    id: 'repair-friday', kind: 'campaign', title: 'Campaign recap · Repair Friday', period: '24 – 31 Oct 2026', writtenAt: T(9, 30, -24),
    summary: 'Goal beaten by 48%. Repair requests 1,180 of 800. LinkedIn and Instagram reels did most of the work; X added little.',
    sections: [
      { heading: 'Result', paras: [['Repair requests reached ', c('1,180', 'fernway.co/repair · 24 – 31 Oct'), ', ', c('148% of goal', 'Repair Friday · goal 800 requests'), '. Cost per request: ', c('€0.42', 'Boost spend €500 / 1,180 requests'), '.']] },
      { heading: 'What worked', paras: [['Before/after repair reels on Instagram drove ', c('46% of requests', 'UTM source · instagram · 24 – 31 Oct'), '. The LinkedIn post by the workshop lead got ', c('5.8% engagement', 'LinkedIn · 28 Oct'), '.']] },
      { heading: 'What didn’t', paras: [['X brought ', c('11 requests', 'UTM source · x · 24 – 31 Oct'), '. Sage proposes dropping X from future repair campaigns.']] },
    ],
  },
]

export type Period = 7 | 30 | 90
export type NetFilter = 'all' | Network

export type Kpi = { key: string; label: string; value: number; prev: number; fmt: 'k' | 'pct' | 'int' | 'min'; lowerBetter?: boolean }

export const KPIS: Record<Period, Kpi[]> = {
  7: [
    { key: 'reach', label: 'Reach', value: 412000, prev: 381000, fmt: 'k' },
    { key: 'er', label: 'Engagement rate', value: 3.1, prev: 2.9, fmt: 'pct' },
    { key: 'followers', label: 'New followers', value: 2140, prev: 1690, fmt: 'int' },
    { key: 'clicks', label: 'Link clicks', value: 5820, prev: 4310, fmt: 'int' },
    { key: 'replies', label: 'Replies handled', value: 1204, prev: 1118, fmt: 'int' },
    { key: 'reply', label: 'Median reply time', value: 4, prev: 26, fmt: 'min', lowerBetter: true },
    { key: 'sentiment', label: 'Positive sentiment', value: 78, prev: 76, fmt: 'pct' },
  ],
  30: [
    { key: 'reach', label: 'Reach', value: 1565000, prev: 1490000, fmt: 'k' },
    { key: 'er', label: 'Engagement rate', value: 3.0, prev: 2.8, fmt: 'pct' },
    { key: 'followers', label: 'New followers', value: 7860, prev: 6020, fmt: 'int' },
    { key: 'clicks', label: 'Link clicks', value: 21400, prev: 18900, fmt: 'int' },
    { key: 'replies', label: 'Replies handled', value: 4630, prev: 4210, fmt: 'int' },
    { key: 'reply', label: 'Median reply time', value: 9, prev: 41, fmt: 'min', lowerBetter: true },
    { key: 'sentiment', label: 'Positive sentiment', value: 77, prev: 74, fmt: 'pct' },
  ],
  90: [
    { key: 'reach', label: 'Reach', value: 4480000, prev: 3960000, fmt: 'k' },
    { key: 'er', label: 'Engagement rate', value: 2.9, prev: 2.6, fmt: 'pct' },
    { key: 'followers', label: 'New followers', value: 19800, prev: 14300, fmt: 'int' },
    { key: 'clicks', label: 'Link clicks', value: 58300, prev: 49100, fmt: 'int' },
    { key: 'replies', label: 'Replies handled', value: 12900, prev: 11800, fmt: 'int' },
    { key: 'reply', label: 'Median reply time', value: 18, prev: 64, fmt: 'min', lowerBetter: true },
    { key: 'sentiment', label: 'Positive sentiment', value: 76, prev: 73, fmt: 'pct' },
  ],
}

/** Share of reach, followers and clicks per network; engagement rate per network. */
export const NET_SHARE: Record<Network, { share: number; er: number }> = {
  instagram: { share: 0.46, er: 3.6 }, tiktok: { share: 0.24, er: 2.4 }, linkedin: { share: 0.1, er: 3.9 },
  facebook: { share: 0.13, er: 1.8 }, youtube: { share: 0.05, er: 2.7 }, x: { share: 0.02, er: 0.9 },
  google: { share: 0, er: 0 }, trustpilot: { share: 0, er: 0 },
}

export const NETWORKS_SOCIAL: Network[] = ['instagram', 'tiktok', 'linkedin', 'facebook', 'youtube', 'x']

/** Daily reach (thousands), 90 days ending today. Deterministic wave + growth. */
export const DAILY_REACH: number[] = Array.from({ length: 90 }, (_, i) => {
  const base = 44 + i * 0.16
  const weekly = Math.sin((i % 7) / 7 * Math.PI * 2) * 6
  const noise = ((i * 37) % 11) - 5
  return Math.round(base + weekly + noise + (i > 83 ? 6 : 0))
})

export const dayLabels = (n: number) => Array.from({ length: n }, (_, i) => {
  const d = new Date(T(8, 0, -(n - 1 - i)))
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
})

export type PostRow = { id: string; network: Network; date: number; title: string; reach: number; er: number; clicks: number; pillar: string; author: 'Atlas' | 'Sam' }

export const POSTS: PostRow[] = [
  { id: 'p-storm', network: 'instagram', date: T(18, 0, -1), title: 'Storm Jacket: 4 hours in the rain, carousel', reach: 38400, er: 6.4, clicks: 920, pillar: 'Gear that lasts', author: 'Atlas' },
  { id: 'p-tt4', network: 'tiktok', date: T(18, 30, -1), title: 'Ridge 28L: what fits for a weekend', reach: 1700, er: 1.9, clicks: 12, pillar: 'Gear that lasts', author: 'Atlas' },
  { id: 'p-hose', network: 'instagram', date: T(18, 30, -1), title: 'Storm Jacket vs. a garden hose, reel', reach: 52100, er: 4.1, clicks: 640, pillar: 'Gear that lasts', author: 'Atlas' },
  { id: 'p-tt3', network: 'tiktok', date: T(18, 0, -3), title: 'Lac Blanc at sunrise', reach: 1900, er: 2.0, clicks: 18, pillar: 'Trail stories', author: 'Atlas' },
  { id: 'p-li-repair', network: 'linkedin', date: T(8, 30, -4), title: 'Our repair programme: 1,200 bags fixed', reach: 21800, er: 5.2, clicks: 1140, pillar: 'Repair & care', author: 'Sam' },
  { id: 'p-tt2', network: 'tiktok', date: T(12, 30, -4), title: 'Packing for Trail Week', reach: 2100, er: 2.2, clicks: 21, pillar: 'Trail stories', author: 'Atlas' },
  { id: 'p-fb-weekend', network: 'facebook', date: T(19, 0, -4), title: 'Your best Fernway photos from the weekend', reach: 9800, er: 2.1, clicks: 160, pillar: 'Community', author: 'Atlas' },
  { id: 'p-tt1', network: 'tiktok', date: T(18, 0, -5), title: 'Trail Week starts Monday', reach: 1650, er: 1.7, clicks: 9, pillar: 'Trail stories', author: 'Atlas' },
  { id: 'p-knots', network: 'instagram', date: T(18, 0, -13), title: '5 knots every hiker should know, carousel', reach: 41200, er: 5.1, clicks: 380, pillar: 'Trail stories', author: 'Atlas' },
  { id: 'p-drop', network: 'tiktok', date: T(18, 30, -34), title: 'Bottle drop test from 3 metres', reach: 210000, er: 6.8, clicks: 2400, pillar: 'Gear that lasts', author: 'Atlas' },
  { id: 'p-yt-back', network: 'youtube', date: T(12, 0, -6), title: 'Short: adjust the Ridge back system in 30 s', reach: 7400, er: 2.9, clicks: 210, pillar: 'Repair & care', author: 'Atlas' },
  { id: 'p-x-tw', network: 'x', date: T(12, 0, -2), title: 'Trail Week is live: join the challenge', reach: 3100, er: 0.8, clicks: 44, pillar: 'Trail stories', author: 'Atlas' },
  { id: 'p-ig-ugc', network: 'instagram', date: T(10, 0, -9), title: '@julien_trail’s Tour du Mont Blanc in 8 photos', reach: 29800, er: 4.7, clicks: 210, pillar: 'Community', author: 'Sam' },
  { id: 'p-li-team', network: 'linkedin', date: T(9, 0, -11), title: 'Why we close the office for Trail Week', reach: 12400, er: 3.6, clicks: 380, pillar: 'Trail stories', author: 'Sam' },
  { id: 'p-fb-sale', network: 'facebook', date: T(16, 0, -12), title: 'Weekend sale reminder: 15% off bottles', reach: 11200, er: 1.2, clicks: 690, pillar: 'Gear that lasts', author: 'Atlas' },
  { id: 'p-ig-clean', network: 'instagram', date: T(11, 0, -16), title: 'Cleaning your jacket the right way', reach: 24600, er: 3.4, clicks: 290, pillar: 'Repair & care', author: 'Atlas' },
  { id: 'p-tt-old', network: 'tiktok', date: T(18, 0, -20), title: 'Gorpcore but make it functional', reach: 11300, er: 4.0, clicks: 140, pillar: 'Gear that lasts', author: 'Atlas' },
  { id: 'p-yt-review', network: 'youtube', date: T(17, 0, -25), title: 'Summit Bottle: one year later', reach: 9100, er: 3.2, clicks: 320, pillar: 'Gear that lasts', author: 'Sam' },
]

export const PILLAR_PERF = [
  { pillar: 'Gear that lasts', share: 41, er: 3.9, saves: 2.6 },
  { pillar: 'Trail stories', share: 32, er: 3.1, saves: 2.2 },
  { pillar: 'Repair & care', share: 18, er: 4.2, saves: 3.4 },
  { pillar: 'Community', share: 9, er: 4.4, saves: 4.1 },
]

export const HEAT_ROWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const HEAT_COLS = ['06', '08', '10', '12', '14', '16', '18', '20']
export const HEAT: number[][] = HEAT_ROWS.map((_, r) => HEAT_COLS.map((_, c) => {
  const evening = c === 6 ? 0.55 : c === 7 ? 0.35 : 0
  const morning = c === 1 ? 0.3 : 0
  const lunch = c === 3 ? 0.25 : 0
  const weekend = r >= 5 ? (c === 2 ? 0.45 : 0.08) : 0
  const fri = r === 4 && c === 6 ? 0.3 : 0
  return Math.min(1, 0.12 + evening + morning + lunch + weekend + fri + (((r * 7 + c * 3) % 5) / 40))
}))

export type Anomaly = {
  id: string
  title: string
  network: Network
  metric: string
  value: string
  delta: string
  down?: boolean
  series: number[]
  detectedAt: number
  cause: string
  confidence: number
  actions: string[]
  open: boolean
  resolution?: string
  handoff?: string
}

export const ANOMALIES: Anomaly[] = [
  { id: 'an-tiktok', title: 'TikTok views per video down 38%', network: 'tiktok', metric: 'Views per video', value: '1,840', delta: '−38%', down: true, series: [8.2, 9.1, 10.4, 8.8, 9.6, 7.9, 9.3, 2.1, 1.9, 1.7, 1.8], detectedAt: T(6, 58),
    cause: 'All 4 videos since Thursday open with a 5 to 7 second intro before the product appears. Average watch time fell from 9.1 s to 3.4 s. Trailkind’s best videos hook in 2 seconds.', confidence: 68,
    actions: ['Ask Atlas to test 3-second hooks this week', 'Ignore for a week'], open: true, handoff: 'h-tiktok' },
  { id: 'an-storm', title: 'Storm Jacket carousel at 3× the usual engagement', network: 'instagram', metric: 'Engagement rate', value: '6.4%', delta: '3.1× average', series: [1.8, 2.1, 2, 2.3, 1.9, 2.2, 4.8, 6.1, 6.4], detectedAt: T(7, 6),
    cause: 'Saves drive it: 214 saves, mostly from people who never bought from Fernway. The rain test format works for cold-weather intent.', confidence: 74,
    actions: ['Boost €150 for 5 days', 'Ask Atlas for a follow-up carousel', 'No action'], open: true, handoff: 'h-boost' },
  { id: 'an-clicks', title: 'LinkedIn link clicks +210% this week', network: 'linkedin', metric: 'Link clicks', value: '1,140', delta: '+210%', series: [210, 240, 190, 260, 230, 250, 1140], detectedAt: T(9, 10, -3),
    cause: 'The repair programme post was shared by the Green Gear newsletter (38k readers). 71% of clicks went to the repair form.', confidence: 81,
    actions: ['Ask Atlas for a follow-up post', 'Tell Sage: repair content works on LinkedIn', 'No action'], open: true },
  { id: 'an-fb', title: 'Facebook reach dropped 41% in a day', network: 'facebook', metric: 'Reach', value: '5.8k', delta: '−41%', down: true, series: [9.8, 10.1, 9.6, 9.9, 5.8, 6.2, 8.4, 9.7], detectedAt: T(10, 0, -15),
    cause: 'A feed change on 10 November. Every brand in your category dropped the same day (Echo checked 40 accounts).', confidence: 86,
    actions: [], open: false, resolution: 'Atlas moved Facebook posts to 19:00. Reach recovered by Thursday 13 November.' },
  { id: 'an-ig', title: 'Instagram followers +1,240 in a day', network: 'instagram', metric: 'New followers', value: '+1,240', delta: '6.8× usual', series: [170, 190, 160, 180, 1240, 320, 210], detectedAt: T(21, 0, -22),
    cause: '@camille.outdoors (84k) shared the Ridge in an unpaid story.', confidence: 92,
    actions: [], open: false, resolution: 'Nova sent a thank-you DM. Echo added Camille to the creator watch list.' },
  { id: 'an-yt', title: 'YouTube Shorts retention fell under 40%', network: 'youtube', metric: 'Average view duration', value: '38%', delta: '−17 pt', down: true, series: [58, 61, 55, 57, 44, 40, 38], detectedAt: T(9, 0, -30),
    cause: 'Shorts longer than 40 seconds lose half their viewers at 12 seconds.', confidence: 71,
    actions: [], open: false, resolution: 'Atlas now cuts Shorts to 30 seconds. Retention back to 55% the week after.' },
]
