import type { AgentId, Network } from '../app/types'
import { T, DAY, DEMO_START } from '../app/time'
import type { Pillar as PillarName, Post } from './publishing'
import { NETWORK_LABEL } from './agents'

export type CampaignStatus = 'brief' | 'review' | 'live' | 'done'
export type Phase = { name: 'Teasing' | 'Launch' | 'Follow-up'; start: number; end: number; summary: string }
/** `postId`: the post in Atlas's calendar, when it isn't the same id. */
export type CPost = { id: string; phase: Phase['name']; network: Network; day: number; title: string; published?: boolean; pillar?: PillarName; postId?: string }
export type CTask = { id: string; label: string; agent: AgentId; status: 'todo' | 'doing' | 'done' }
/** What an adjustment does to the campaign's posts (and their copies in Atlas's calendar). */
export type PostMove = { post: string; network?: Network; title?: string }
/** `goal`: the new goal the adjustment sets (the planned trajectory scales with it). */
export type Adjustment = { id: string; text: string; status: 'proposed' | 'accepted' | 'declined'; moves?: PostMove[]; goal?: number }
export type Change = { kind: 'added' | 'removed' | 'changed'; text: string }

export type Campaign = {
  id: string
  name: string
  status: CampaignStatus
  brief: string
  goal: { label: string; target: number; current: number }
  start: number
  end: number
  kpis: string[]
  messages: string[]
  audience: string
  phases: Phase[]
  posts: CPost[]
  tasks: CTask[]
  risks: string[]
  planned: number[]
  actual: number[]
  adjustments: Adjustment[]
  recap?: string[]
  /** Who wrote the recap: Iris (seeded reports) or Sage (when a campaign ends). */
  recapBy?: 'iris' | 'sage'
  version: number
  diff?: Change[]
  createdAt: number
  /** Post `day` values are days from this date. */
  base: number
  source?: string
  /** Iris's recap report, under /insights/reports/:id. */
  reportId?: string
  /** What Sage assumed because the brief didn't say. */
  assumptions?: string[]
  /** Where the results are heading, as a share of the plan (simulated); seeded from the id when absent. */
  pace?: number
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'trail-week', name: 'Trail Week', status: 'live', createdAt: T(10, 0, -21), base: DEMO_START, pace: 0.8,
    brief: 'Close the office for a week and get the community outside. Goal: 300 people join the Trail Week challenge.',
    goal: { label: 'challenge sign-ups', target: 300, current: 154 },
    start: T(0, 0, -1), end: T(23, 59, 12),
    kpis: ['Challenge sign-ups', 'Hashtag #FernwayTrailWeek posts', 'Reach on TikTok and Instagram'],
    messages: ['We close the office so you go outside', 'Any trail counts, even 2 km from home', 'Share it with #FernwayTrailWeek'],
    audience: 'Existing followers aged 25–40, city hikers, people who saved trail posts in the last 90 days',
    phases: [
      { name: 'Teasing', start: T(0, 0, -5), end: T(23, 59, -2), summary: 'Office closing announcement, team trail picks' },
      { name: 'Launch', start: T(0, 0, -1), end: T(23, 59, 5), summary: 'Daily challenge prompts, community reposts' },
      { name: 'Follow-up', start: T(0, 0, 6), end: T(23, 59, 12), summary: 'Best trails recap, Trail Week film' },
    ],
    posts: [
      { id: 'tw1', phase: 'Teasing', network: 'linkedin', day: -4, title: 'Why we close the office for Trail Week', published: true },
      { id: 'tw2', phase: 'Teasing', network: 'tiktok', day: -3, title: 'Trail Week starts Monday', published: true },
      { id: 'tw3', phase: 'Launch', network: 'instagram', day: -1, title: 'Day 1: any trail counts', published: true },
      { id: 'tw4', phase: 'Launch', network: 'x', day: 0, title: 'Trail Week is live: join the challenge', published: true },
      { id: 'tw5', phase: 'Launch', network: 'tiktok', day: 0, title: 'Packing for Trail Week', published: true },
      { id: 'tw6', phase: 'Launch', network: 'instagram', day: 2, title: 'Trail kit list, carousel', postId: 'p-21' },
      { id: 'tw7', phase: 'Launch', network: 'instagram', day: 4, title: 'Sunrise at Lac Blanc, reel', postId: 'p-25' },
      { id: 'tw8', phase: 'Launch', network: 'facebook', day: 3, title: 'Your trails so far' },
      { id: 'tw9', phase: 'Follow-up', network: 'youtube', day: 8, title: 'Trail Week, the film' },
      { id: 'tw10', phase: 'Follow-up', network: 'instagram', day: 7, title: 'The 12 best trails you shared' },
      { id: 'tw11', phase: 'Follow-up', network: 'linkedin', day: 9, title: 'What a week offline taught the team' },
    ],
    tasks: [
      { id: 't1', label: 'Publish daily challenge prompts', agent: 'atlas', status: 'doing' },
      { id: 't2', label: 'Repost the best #FernwayTrailWeek photos', agent: 'echo', status: 'doing' },
      { id: 't3', label: 'Answer “how do I join?” questions', agent: 'nova', status: 'doing' },
      { id: 't4', label: 'Daily sign-ups vs trajectory', agent: 'iris', status: 'doing' },
      { id: 't5', label: 'Edit the Trail Week film', agent: 'atlas', status: 'todo' },
      { id: 't6', label: 'Announcement and team picks', agent: 'atlas', status: 'done' },
    ],
    risks: ['Rain forecast for Thursday in the Alps: keep indoor “plan your trail” prompts ready', 'X brings few sign-ups: keep it to one post a day'],
    planned: [0, 45, 120, 165, 205, 240, 270, 290, 300],
    actual: [0, 61, 154],
    adjustments: [
      { id: 'adj1', text: 'Instagram is at 41% of its target, TikTok at 118%. Move 2 Instagram posts to TikTok.', status: 'proposed', moves: [{ post: 'tw6', network: 'tiktok' }, { post: 'tw7', network: 'tiktok' }] },
      { id: 'adj2', text: 'Rain on Thursday: swap the Lac Blanc reel with “plan your trail from the sofa”.', status: 'proposed', moves: [{ post: 'tw7', title: 'Plan your trail from the sofa' }] },
    ],
    version: 1,
  },
  {
    id: 'repair-friday', name: 'Repair Friday', status: 'done', createdAt: T(10, 0, -45), base: DEMO_START, reportId: 'repair-friday',
    brief: 'Our answer to Black Friday, a month early: repair instead of buy. Goal: 800 repair requests.',
    goal: { label: 'repair requests', target: 800, current: 1180 },
    start: T(0, 0, -32), end: T(23, 59, -25),
    kpis: ['Repair requests', 'LinkedIn engagement', 'Press mentions'],
    messages: ['The greenest bag is the one you already own', 'Free repairs for any Fernway bag, forever'],
    audience: 'Existing customers, sustainability-minded followers on LinkedIn and Instagram',
    phases: [
      { name: 'Teasing', start: T(0, 0, -36), end: T(23, 59, -33), summary: 'Workshop behind the scenes' },
      { name: 'Launch', start: T(0, 0, -32), end: T(23, 59, -26), summary: 'Before/after reels, repair form' },
      { name: 'Follow-up', start: T(0, 0, -25), end: T(23, 59, -22), summary: 'Numbers and thank-you' },
    ],
    posts: [
      { id: 'rf1', phase: 'Teasing', network: 'instagram', day: -36, title: 'Inside our repair workshop', published: true },
      { id: 'rf2', phase: 'Launch', network: 'linkedin', day: -32, title: 'Repair Friday: why we don’t do Black Friday', published: true },
      { id: 'rf3', phase: 'Launch', network: 'instagram', day: -31, title: 'Before/after: a 6-year-old Ridge', published: true },
      { id: 'rf4', phase: 'Launch', network: 'tiktok', day: -30, title: 'Fixing a zip in 40 seconds', published: true },
      { id: 'rf5', phase: 'Follow-up', network: 'linkedin', day: -24, title: '1,180 repairs in a week', published: true },
    ],
    tasks: [
      { id: 'r1', label: 'Before/after reels', agent: 'atlas', status: 'done' },
      { id: 'r2', label: 'Answer repair questions', agent: 'nova', status: 'done' },
      { id: 'r3', label: 'Track press and creator mentions', agent: 'echo', status: 'done' },
      { id: 'r4', label: 'Campaign recap', agent: 'iris', status: 'done' },
    ],
    risks: [],
    planned: [0, 120, 260, 400, 530, 650, 740, 800],
    actual: [0, 190, 410, 640, 820, 960, 1090, 1180],
    adjustments: [{ id: 'adj-rf', text: 'X brought 11 requests: drop it from repair campaigns.', status: 'accepted' }],
    recap: [
      'Repair requests reached 1,180, 148% of the goal.',
      'Before/after reels on Instagram drove 46% of requests. The LinkedIn post by the workshop lead got 5.8% engagement.',
      'X brought 11 requests. Sage dropped X from repair campaigns.',
    ],
    version: 1,
  },
  {
    id: 'gift-guide', name: 'Gift guide that lasts', status: 'review', createdAt: T(16, 20, -1), base: DEMO_START,
    brief: 'Holiday gift guide without the discount noise. Goal: €40,000 revenue from social between 8 and 21 December.',
    goal: { label: 'revenue from social (€)', target: 40000, current: 0 },
    start: T(0, 0, 13), end: T(23, 59, 26),
    kpis: ['Revenue from social (UTM)', 'Gift guide page visits', 'Saves on gift carousels'],
    messages: ['Gifts that outlive the season', 'Repairable, guaranteed, no plastic packaging', 'Order by 19 December for delivery before Christmas'],
    audience: 'Followers and their partners and parents, people who saved Fernway posts in the last 6 months',
    phases: [
      { name: 'Teasing', start: T(0, 0, 13), end: T(23, 59, 14), summary: 'Gift guide preview, “what our team gives”' },
      { name: 'Launch', start: T(0, 0, 15), end: T(23, 59, 23), summary: 'Guide by budget, gift wrapping, last order date' },
      { name: 'Follow-up', start: T(0, 0, 24), end: T(23, 59, 26), summary: 'Gift cards for late shoppers' },
    ],
    posts: [
      { id: 'gg1', phase: 'Teasing', network: 'instagram', day: 13, title: 'What our team is giving this year', pillar: 'Community' },
      { id: 'gg2', phase: 'Launch', network: 'instagram', day: 15, title: 'Gifts under €50, carousel' },
      { id: 'gg3', phase: 'Launch', network: 'tiktok', day: 16, title: 'Wrapping a Ridge without paper' },
      { id: 'gg4', phase: 'Launch', network: 'facebook', day: 17, title: 'Gifts under €150' },
      { id: 'gg5', phase: 'Launch', network: 'linkedin', day: 18, title: 'Corporate gifts that last' },
      { id: 'gg6', phase: 'Launch', network: 'instagram', day: 20, title: 'Last order date: 19 December' },
      { id: 'gg7', phase: 'Follow-up', network: 'instagram', day: 24, title: 'Gift cards, delivered by email' },
    ],
    tasks: [
      { id: 'g1', label: 'Write and schedule the 7 posts', agent: 'atlas', status: 'todo' },
      { id: 'g2', label: 'Answer “will it arrive on time?”', agent: 'nova', status: 'todo' },
      { id: 'g3', label: 'Watch competitor gift guides', agent: 'echo', status: 'todo' },
      { id: 'g4', label: 'Daily revenue vs trajectory', agent: 'iris', status: 'todo' },
    ],
    risks: ['Peakline’s discounts make the “no discount” message harder', 'Carrier delays after 17 December'],
    planned: [0, 3, 8, 14, 20, 27, 33, 38, 40],
    actual: [],
    adjustments: [],
    version: 1,
  },
]

/** `aliases`: the names it had before a rename, so posts already out still count for it. */
export type Pillar = { id: string; name: PillarName; desc: string; target: number; aliases?: string[] }
export const PILLARS: Pillar[] = [
  { id: 'p-gear', name: 'Gear that lasts', desc: 'Products tested hard: rain, drops, years of use.', target: 35 },
  { id: 'p-trail', name: 'Trail stories', desc: 'Places, trips and the team outside.', target: 30 },
  { id: 'p-repair', name: 'Repair & care', desc: 'Repairs, maintenance, how to make gear last.', target: 15 },
  { id: 'p-community', name: 'Community', desc: 'Customer photos, UGC, creators, replies worth sharing.', target: 20 },
]

export type Cadence = { network: Network; target: number }
export const CADENCE: Cadence[] = [
  { network: 'instagram', target: 5 }, { network: 'tiktok', target: 4 }, { network: 'linkedin', target: 2 },
  { network: 'facebook', target: 2 }, { network: 'youtube', target: 1 }, { network: 'x', target: 3 },
]

/**
 * What actually went out, read from Atlas's posts: published, or scheduled and past. The calendar only keeps the last
 * weeks, so the 30-day pillar mix adds the posts published before it (`PILLAR_HISTORY`).
 */
// ponytail: the history doesn't slide with the clock; it's the month before the demo's calendar starts.
export const PILLAR_HISTORY: Partial<Record<PillarName, number>> = { 'Gear that lasts': 20, 'Trail stories': 13, 'Repair & care': 5, Community: 2 }
const out = (p: Post, from: number, t: number) => p.at >= from && p.at <= t && (p.status === 'published' || p.status === 'scheduled')
/** Share of posts per pillar over the last 30 days, in %. */
export function pillarMix(posts: Post[], pillars: { name: PillarName; aliases?: string[] }[], t: number): Record<string, number> {
  const recent = posts.filter(p => out(p, t - 30 * DAY, t))
  const count = ({ name, aliases = [] }: { name: PillarName; aliases?: string[] }) => [name, ...aliases].reduce((n, x) => n + (PILLAR_HISTORY[x as keyof typeof PILLAR_HISTORY] ?? 0) + recent.filter(p => p.pillar === x).length, 0)
  const total = pillars.reduce((sum, p) => sum + count(p), 0)
  return Object.fromEntries(pillars.map(p => [p.name, total ? Math.round((count(p) / total) * 100) : 0]))
}
/** Posts that went out per network over the last 7 days. */
export function postsLastWeek(posts: Post[], t: number): Partial<Record<Network, number>> {
  const m: Partial<Record<Network, number>> = {}
  for (const p of posts) if (out(p, t - 7 * DAY, t)) m[p.network] = (m[p.network] ?? 0) + 1
  return m
}

/** Sage's targets as Atlas reads them: share of posts per pillar, posts a week per network. */
export type Targets = { pillars: { name: PillarName; target: number }[]; cadence: Partial<Record<Network, number>> }
/** Sage's targets after a change. Pillars stay as they are unless named; posts a week never go below 0. */
export function applyChange<T extends { pillars: Pillar[]; cadence: Cadence[] }>(st: T, ch: TargetsChange): T {
  return {
    ...st,
    pillars: st.pillars.map(p => (ch.pillars?.[p.name] !== undefined ? { ...p, target: ch.pillars[p.name]! } : p)),
    cadence: st.cadence.map(c => ({ ...c, target: Math.max(0, (ch.cadence?.[c.network] ?? c.target) + (ch.add?.[c.network] ?? 0)) })),
  }
}

export const targetsFrom = (st: { pillars: Pillar[]; cadence: Cadence[] }): Targets => ({
  pillars: st.pillars.map(({ name, target }) => ({ name, target })),
  cadence: Object.fromEntries(st.cadence.map(c => [c.network, c.target])),
})

/** A change to Sage's targets: pillar shares and posts a week set to a value, or posts a week added (`add`, may be negative). */
export type TargetsChange = { pillars?: Partial<Record<PillarName, number>>; cadence?: Partial<Record<Network, number>>; add?: Partial<Record<Network, number>> }
/* ---------- Calendar moments: dates worth planning for, which Sage raises 3 weeks before ---------- */

export type MomentIdea = { title: string; network: Network; copy: string; pillar: PillarName; media?: string }
export type Moment = { id: string; name: string; start: number; end: number; why: string; source: string; pillars: PillarName[]; ideas: MomentIdea[]; status?: 'added' | 'skipped' }
/** Sage raises a moment this long before it starts. */
export const MOMENT_LEAD = 21 * DAY
export const MOMENTS: Moment[] = [
  { id: 'm-blackfriday', name: 'Black Friday, without the discount', start: T(0, 0, 3), end: T(23, 59, 3), source: 'Strategy › Repair Friday',
    why: 'Repair Friday drove 1,180 repair requests in October: Fernway answers Black Friday with repairs, not discounts.', pillars: ['Repair & care'],
    ideas: [
      { title: 'Black Friday? Bring us your old bag instead', network: 'instagram', pillar: 'Repair & care', media: 'workshop', copy: 'Black Friday? Bring us your old bag instead. We repair any Fernway bag for free, forever. Link in bio.' },
      { title: 'We fixed 40 bags while everyone was shopping', network: 'tiktok', pillar: 'Repair & care', media: 'workshop', copy: 'While everyone was shopping, the Annecy workshop fixed 40 bags. Here are 3 of them in 30 seconds.' },
    ] },
  { id: 'm-snow', name: 'First snow', start: T(0, 0, 15), end: T(23, 59, 19), source: 'Insights › December 2024',
    why: 'Last year, “first snow” posts got 2.3× your usual saves.', pillars: ['Gear that lasts', 'Trail stories'],
    ideas: [
      { title: 'First snow on the Semnoz: the Ember Fleece’s day', network: 'instagram', pillar: 'Gear that lasts', media: 'snow', copy: 'First snow on the Semnoz this morning. −4°C, one Ember Fleece, zero regrets.' },
      { title: 'Packing for the first snow hike in 20 seconds', network: 'tiktok', pillar: 'Trail stories', media: 'pack', copy: 'Packing for the first snow hike: fleece, flask, spikes, and the Ridge 28L. 20 seconds.' },
    ] },
  { id: 'm-xmas', name: 'Last order date for Christmas', start: T(0, 0, 22), end: T(23, 59, 24), source: 'Orders › December 2024',
    why: 'Carriers slow down after 17 December, and 31% of last December’s orders came in the final week.', pillars: ['Gear that lasts'],
    ideas: [
      { title: 'Order by 19 December, delivered before Christmas', network: 'instagram', pillar: 'Gear that lasts', media: 'fleece', copy: 'Order by 19 December and it’s under the tree in time. Wrapped without plastic, repairable for life.' },
      { title: 'Gift cards for late shoppers, by email', network: 'facebook', pillar: 'Gear that lasts', copy: 'Missed the last order date? A Fernway gift card arrives by email in a minute, and never expires.' },
    ] },
  { id: 'm-newyear', name: 'First hike of the year', start: T(0, 0, 37), end: T(23, 59, 40), source: 'Listening › “first hike”',
    why: '“First hike” mentions double in the first week of January.', pillars: ['Trail stories', 'Community'],
    ideas: [
      { title: 'Your first hike of the year: tag us', network: 'instagram', pillar: 'Community', media: 'trail', copy: 'Your first hike of the year, wherever it is: tag #FernwayFirstHike and we share our favourites on Sunday.' },
      { title: '5 easy first hikes around Annecy', network: 'tiktok', pillar: 'Trail stories', media: 'lake', copy: '5 easy first hikes around Annecy, all under 2 hours, all with a view. Save it for January.' },
    ] },
]

export type Proposal = { id: string; text: string; why: string; status: 'proposed' | 'accepted' | 'declined'; change?: TargetsChange }
export const PROPOSALS: Proposal[] = [
  { id: 'pr1', text: 'Raise Community from 20% to 25% of posts, Gear that lasts from 35% to 30%', why: 'Community posts have the best saves rate (4.1%) and cost nothing to produce.', status: 'proposed', change: { pillars: { Community: 25, 'Gear that lasts': 30 } } },
  { id: 'pr2', text: 'Cut X from 3 posts a week to 1, add 1 on TikTok', why: 'X brings 2% of reach and 0.8% engagement. The time goes to TikTok instead.', status: 'proposed', change: { cadence: { x: 1 }, add: { tiktok: 1 } } },
  { id: 'pr3', text: 'Add a weekly repair post on LinkedIn', why: 'Repair posts do 1.9× better than product posts on LinkedIn.', status: 'accepted' },
]

/* ---------- Sage's plan generator (scripted, deterministic) ---------- */

type Product = { re: RegExp; name: string; audience: string; msg: string[]; proof: [string, string]; behind: string; use: string; why: string }
const PRODUCTS: Product[] = [
  { re: /storm|jacket|rain/i, name: 'Storm Jacket', audience: 'Hikers and city commuters who saved rain gear posts, ages 25–45', msg: ['Dry after 4 hours in the rain, tested on camera', 'PFC-free, repairable, guaranteed'],
    proof: ['4 hours in the rain in 30 seconds', 'Storm Jacket vs a garden hose'], behind: 'Inside the rain room: how we test it', use: 'From the commute to the col in one jacket', why: 'Why we spent 2 years on a PFC-free membrane' },
  { re: /ridge|bag|pack/i, name: 'Ridge 28L', audience: 'Weekend hikers and travellers, followers who engaged with packing videos', msg: ['Everything for 3 days in 28 litres', 'Cabin-size, repairable forever'],
    proof: ['3 days in 28 litres: everything we packed', 'A Ridge after 6 years and 40 trips'], behind: 'Stitch by stitch: how a Ridge is built', use: 'Cabin bag on Friday, trail pack on Saturday', why: 'Why the Ridge has no plastic buckles' },
  { re: /bottle|summit/i, name: 'Summit Bottle', audience: 'Daily commuters and gym-goers, gift buyers', msg: ['One bottle for life, guaranteed', 'No plastic, no BPA, lab-tested'],
    proof: ['Dropped from 5 metres, still fine', '12 hours hot: we timed it'], behind: 'Inside the lab: the drop test', use: 'Desk to trail in 20 seconds', why: 'One bottle for life: the maths' },
  { re: /fleece|ember/i, name: 'Ember Fleece', audience: 'Cold-weather hikers, layering enthusiasts', msg: ['The warm layer under everything', 'Recycled fleece, repairable seams'],
    proof: ['Ember Fleece at −8°C on the Semnoz', '100 washes later'], behind: 'From bottles to fleece: where the yarn comes from', use: 'The layer under everything, 3 ways', why: 'Why recycled fleece, and why it lasts' },
  { re: /repair/i, name: 'Repair programme', audience: 'Existing customers and sustainability-minded followers on LinkedIn', msg: ['The greenest bag is the one you already own', 'Free repairs, forever'],
    proof: ['Before/after: a 6-year-old Ridge', 'Fixing a zip in 40 seconds'], behind: 'Inside the Annecy workshop', use: 'How to send us your bag', why: 'Why we repair instead of replace' },
]

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const BRAND: Product = { re: /fernway/i, name: 'Fernway', audience: 'Followers aged 25–40 who engaged in the last 90 days', msg: ['Gear that lasts', 'Go outside more'],
  proof: ['Gear tested hard: rain, drops, years of use', 'Our oldest bag still in use'], behind: 'A day with the Fernway team', use: 'Our team’s kit for the season', why: 'Why we make fewer, better things' }
export const PRODUCT_NAMES = PRODUCTS.map(p => p.name)

export type GoalUnit = 'pre-orders' | 'orders' | 'sign-ups' | 'requests' | 'new followers' | 'revenue from social (€)'
export const GOAL_UNITS: GoalUnit[] = ['pre-orders', 'orders', 'sign-ups', 'requests', 'new followers', 'revenue from social (€)']

/** A brief as Sage reads it: the sentence, plus whatever the optional fields or Sage's questions settled. */
export type BriefInput = { text: string; product?: string; launch?: number; goal?: { target: number; unit: GoalUnit }; audience?: string; networks?: Network[] }
export type BriefGap = 'goal' | 'launch'

/** The number that says it worked, if the text gives one: “300 pre-orders”, “2k orders”, “€40,000”. */
export function readGoal(text: string): BriefInput['goal'] {
  const found = [...text.matchAll(/(€\s*)?(\d[\d,.]*)\s*(k\b)?\s*(?:(?!pre|sign|sale|order|request|follow)[a-z-]+\s+)?(pre-?orders?|sign-?ups?|sales|orders?|requests?|followers|€|euros?)?/gi)].map(m => {
    const target = Math.round(parseFloat(m[2].replace(/,/g, '')) * (m[3] ? 1000 : 1))
    const u = (m[4] ?? '').toLowerCase()
    const unit: GoalUnit = m[1] || /€|euro/.test(u) ? 'revenue from social (€)' : /pre/.test(u) ? 'pre-orders' : /sign/.test(u) ? 'sign-ups' : /request/.test(u) ? 'requests' : /follow/.test(u) ? 'new followers' : /order|sale/.test(u) ? 'orders' : /pre-?order/i.test(text) ? 'pre-orders' : 'sign-ups'
    return { target, unit, named: !!(m[1] || m[3] || m[4]) }
  })
  // A number with a unit wins; a bare one counts only if it can't be a day or a year.
  const g = found.find(x => x.named && x.target >= 10) ?? found.find(x => x.target >= 100 && !(x.target >= 1900 && x.target <= 2100))
  return g && { target: g.target, unit: g.unit }
}

/** The launch date, if the text gives one: “March 15”, “15 March”, “in March”, “in 3 weeks”, “next month”. */
export function readLaunch(text: string, now: number): number | undefined {
  const lower = text.toLowerCase()
  const weeks = lower.match(/in (\d+|two|three|four|six) weeks?/)
  if (weeks) return now + ({ two: 2, three: 3, four: 4, six: 6 }[weeks[1]] ?? +weeks[1]) * 7 * DAY
  const nd = new Date(now)
  if (/next month/.test(lower)) return new Date(nd.getFullYear(), nd.getMonth() + 1, 1, 9).getTime()
  if (/next week/.test(lower)) return now + 7 * DAY
  const mi = MONTHS.findIndex(m => new RegExp(`\\b${m}`).test(lower))
  if (mi < 0) return
  const dm = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b(?!\s*(?:k\b|pre|sign|order|request|follow|€|%|,\d|\d))/)
  const year = mi < nd.getMonth() ? nd.getFullYear() + 1 : nd.getFullYear()
  return new Date(year, mi, dm ? Math.min(28, +dm[1]) : 1, 9).getTime()
}

/** What the brief says, and the two things Sage won't guess when a person is there to answer: the goal and the date. */
export function readBrief(text: string, now: number, fields: Partial<BriefInput> = {}): { input: BriefInput; missing: BriefGap[] } {
  const input: BriefInput = { text, ...fields, goal: fields.goal ?? readGoal(text), launch: fields.launch ?? readLaunch(text, now) }
  return { input, missing: [...(input.goal ? [] : ['goal' as const]), ...(input.launch ? [] : ['launch' as const])] }
}

/* What kind of campaign each goal calls for: phases, the posts in them (days from launch), the trajectory's shape. */
type Kind = 'teaser' | 'behind' | 'why' | 'preorder' | 'reveal' | 'proof' | 'proof2' | 'use' | 'faq' | 'guide' | 'guide2' | 'lastcall' | 'challenge' | 'ugc' | 'creator' | 'numbers' | 'recap'
type Slot = [Kind, number]
type Template = { name: string; phases: [number, number, number, number]; slots: Slot[]; curve: number }
const TEMPLATES: Record<GoalUnit, Template> = {
  // phases: teasing starts, launch, follow-up starts, end (days from launch)
  'pre-orders': { name: 'launch', phases: [-7, 0, 5, 10], curve: 0.8, slots: [['teaser', -7], ['behind', -5], ['why', -3], ['preorder', -1], ['reveal', 0], ['proof', 0], ['faq', 1], ['proof2', 3], ['ugc', 6], ['numbers', 9]] },
  orders: { name: 'push', phases: [-3, 0, 7, 10], curve: 1.2, slots: [['teaser', -3], ['behind', -2], ['reveal', 0], ['proof', 0], ['use', 1], ['guide', 3], ['proof2', 4], ['lastcall', 6], ['ugc', 8], ['numbers', 10]] },
  'revenue from social (€)': { name: 'sales push', phases: [-2, 0, 7, 9], curve: 1.3, slots: [['teaser', -2], ['guide', 0], ['proof', 1], ['use', 2], ['guide2', 3], ['creator', 4], ['lastcall', 6], ['ugc', 8]] },
  'sign-ups': { name: 'challenge', phases: [-4, 0, 7, 12], curve: 1, slots: [['teaser', -4], ['why', -2], ['challenge', 0], ['challenge', 1], ['ugc', 2], ['challenge', 3], ['creator', 4], ['ugc', 6], ['recap', 9], ['numbers', 11]] },
  requests: { name: 'week', phases: [-3, 0, 6, 9], curve: 1, slots: [['teaser', -3], ['behind', -2], ['why', 0], ['proof', 0], ['use', 1], ['proof2', 3], ['ugc', 5], ['numbers', 8]] },
  'new followers': { name: 'community push', phases: [-1, 0, 8, 11], curve: 1, slots: [['teaser', -1], ['creator', 0], ['ugc', 1], ['proof', 2], ['challenge', 3], ['ugc', 5], ['creator', 7], ['recap', 10]] },
}
/** Where each kind of post works best, in order. */
const NETS: Record<Kind, Network[]> = {
  teaser: ['instagram', 'tiktok', 'x'], behind: ['tiktok', 'youtube', 'instagram'], why: ['linkedin', 'facebook', 'instagram'], preorder: ['instagram', 'facebook', 'x'],
  reveal: ['instagram', 'tiktok', 'facebook'], proof: ['tiktok', 'instagram', 'youtube'], proof2: ['youtube', 'tiktok', 'instagram'], use: ['tiktok', 'instagram', 'youtube'],
  faq: ['facebook', 'instagram', 'x'], guide: ['instagram', 'facebook', 'linkedin'], guide2: ['facebook', 'instagram', 'linkedin'], lastcall: ['instagram', 'facebook', 'x'],
  challenge: ['instagram', 'tiktok', 'facebook', 'x'], ugc: ['instagram', 'facebook', 'tiktok'], creator: ['instagram', 'tiktok', 'youtube'], numbers: ['linkedin', 'x', 'facebook'], recap: ['youtube', 'tiktok', 'instagram'],
}
const PILLAR_OF: Record<Kind, PillarName> = {
  teaser: 'Gear that lasts', behind: 'Gear that lasts', why: 'Repair & care', preorder: 'Gear that lasts', reveal: 'Gear that lasts', proof: 'Gear that lasts', proof2: 'Gear that lasts',
  use: 'Trail stories', faq: 'Gear that lasts', guide: 'Gear that lasts', guide2: 'Gear that lasts', lastcall: 'Gear that lasts', challenge: 'Trail stories', ugc: 'Community', creator: 'Community', numbers: 'Community', recap: 'Trail stories',
}
const SEASONS = [
  { months: [11, 0, 1], hook: 'First snow', place: 'snowy trails', prompt: 'a winter walk, even 2 km from home', gift: true },
  { months: [2, 3, 4], hook: 'First hikes of the year', place: 'spring trails', prompt: 'your first trail of the year', gift: false },
  { months: [5, 6, 7], hook: 'Long days on the trail', place: 'summer trails', prompt: 'a sunrise or sunset hike', gift: false },
  { months: [8, 9, 10], hook: 'Back to the commute', place: 'autumn trails', prompt: 'your commute on foot or by bike', gift: false },
]
const seasonOf = (t: number) => SEASONS.find(x => x.months.includes(new Date(t).getMonth()))!
const short = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function titleOf(k: Kind, p: Product, season: (typeof SEASONS)[number], launch: number, n: number): string {
  switch (k) {
    case 'teaser': return `${season.hook}: something new from Fernway`
    case 'behind': return p.behind
    case 'why': return p.why
    case 'preorder': return `Pre-orders open: the ${p.name} ships on ${short(launch)}`
    case 'reveal': return `${p.name} is here, carousel`
    case 'proof': return p.proof[0]
    case 'proof2': return p.proof[1]
    case 'use': return p.use
    case 'faq': return `${p.name}: everything you asked`
    case 'guide': return season.gift ? `Gift guide: ${p.name} and what goes with it` : `${p.name}: which one is yours`
    case 'guide2': return season.gift ? 'Gifts under €50, €100, €150' : 'Bundles for the season, by budget'
    case 'lastcall': return season.gift ? 'Last order date for delivery before Christmas' : `Last week to get it before the ${season.place}`
    case 'challenge': return n === 1 ? `Day 1: ${season.prompt}` : `Day ${n}: your ${season.place}, shared with #FernwayChallenge`
    case 'ugc': return `Your first photos from the ${season.place}`
    case 'creator': return `A creator who already uses ${p.name === 'Fernway' ? 'Fernway' : `the ${p.name}`}: 3 stories`
    case 'numbers': return 'The numbers so far, and what we learned'
    case 'recap': return 'The recap film'
  }
}

/** Networks a plan may use: the ones Sam ticked, or those in Sage's cadence. */
const usable = (input: BriefInput, cadence?: Partial<Record<Network, number>>): Network[] => {
  if (input.networks?.length) return input.networks
  const fromCadence = cadence ? (Object.keys(cadence) as Network[]).filter(n => (cadence[n] ?? 0) > 0) : []
  return fromCadence.length ? fromCadence : ['instagram', 'tiktok', 'facebook', 'linkedin', 'youtube']
}

export function generatePlan(id: string, brief: string | BriefInput, now: number, opts: { source?: string; cadence?: Partial<Record<Network, number>> } = {}): Campaign {
  const { input, missing } = readBrief(typeof brief === 'string' ? brief : brief.text, now, typeof brief === 'string' ? {} : brief)
  const text = input.text
  const prod = PRODUCTS.find(p => p.name === input.product) ?? (input.product ? undefined : PRODUCTS.find(p => p.re.test(text))) ?? BRAND
  const unit: GoalUnit = input.goal?.unit ?? (/pre-?order/i.test(text) ? 'pre-orders' : /challenge|join/i.test(text) ? 'sign-ups' : prod === BRAND ? 'sign-ups' : 'orders')
  const target = input.goal?.target ?? (unit === 'revenue from social (€)' ? 20000 : 300)
  const launch = input.launch ?? now + 21 * DAY
  const tpl = TEMPLATES[unit]
  const season = seasonOf(launch)
  // Sage says what it assumed when nobody was there to ask (a brief from another agent).
  const assumptions = [
    ...(missing.includes('goal') ? [`Goal: ${target.toLocaleString('en-GB')} ${unit}, the brief gives no number`] : []),
    ...(missing.includes('launch') ? [`Launch on ${short(launch)}, 3 weeks out: the brief gives no date`] : []),
  ]
  const nets = usable(input, opts.cadence)
  const L = Math.round((launch - now) / DAY)
  const at = (d: number) => launch + d * DAY
  const phaseOf = (d: number): Phase['name'] => (d < tpl.phases[1] ? 'Teasing' : d < tpl.phases[2] ? 'Launch' : 'Follow-up')
  let challenge = 0
  const posts: CPost[] = []
  tpl.slots.forEach(([k, d], i) => {
    if (k === 'challenge') challenge++
    // The best network for this kind of post that Sam uses, not the one the post before used that day.
    const prefs = NETS[k].filter(n => nets.includes(n))
    const sameDay = posts.filter(p => p.day === L + d).map(p => p.network)
    const network = prefs.find(n => !sameDay.includes(n)) ?? prefs[0] ?? nets[i % nets.length]
    posts.push({ id: `${id}-${i + 1}`, phase: phaseOf(d), network, day: L + d, title: titleOf(k, prod, season, launch, challenge), pillar: PILLAR_OF[k] })
  })
  const kinds = new Set(tpl.slots.map(([k]) => k))
  const cta: Record<GoalUnit, string> = {
    'pre-orders': `Pre-order now, ships on ${short(launch)}`, orders: 'Free repairs for life on every order',
    'revenue from social (€)': season.gift ? `Order by ${short(at(tpl.phases[3] - 4))} for delivery before Christmas` : 'Delivered in 48 hours, repaired for life',
    'sign-ups': 'Join the challenge: any trail counts', requests: 'Send us your bag: we fix it for free', 'new followers': 'Follow for the trail stories',
  }
  const name = `${prod.name} ${/launch/i.test(text) ? 'launch' : season.gift && unit === 'revenue from social (€)' ? 'gift guide' : tpl.name}`
  return {
    id, name, status: 'review', brief: text, createdAt: now, base: now, source: opts.source, assumptions: assumptions.length ? assumptions : undefined,
    goal: { label: unit, target, current: 0 }, start: at(tpl.phases[0]), end: at(tpl.phases[3]) + DAY - 60_000,
    kpis: [unit[0].toUpperCase() + unit.slice(1), `Reach on ${nets.slice(0, 2).map(n => NET_NAME[n]).join(' and ')}`, kinds.has('ugc') ? 'Customer photos shared with the campaign' : 'Saves and shares on launch posts'],
    messages: [...prod.msg, cta[unit]], audience: input.audience || prod.audience,
    phases: [
      { name: 'Teasing', start: at(tpl.phases[0]), end: at(tpl.phases[1]) - 60_000, summary: kinds.has('preorder') ? 'Teaser, behind the scenes, pre-orders open' : 'Teaser and the why' },
      { name: 'Launch', start: at(tpl.phases[1]), end: at(tpl.phases[2]) - 60_000, summary: kinds.has('challenge') ? 'Daily prompts, community reposts' : kinds.has('guide') ? 'Guide by budget, proof, last order date' : 'Reveal, proof, answers to every question' },
      { name: 'Follow-up', start: at(tpl.phases[2]), end: at(tpl.phases[3]) + DAY - 60_000, summary: kinds.has('recap') ? 'Best entries, the recap film' : 'Customer photos, numbers' },
    ],
    posts,
    tasks: [
      { id: `${id}-t1`, label: `Write and schedule the ${posts.length} posts`, agent: 'atlas', status: 'todo' },
      { id: `${id}-t2`, label: `Answer ${prod.name} questions and send ${unit.replace(' (€)', '')} links`, agent: 'nova', status: 'todo' },
      { id: `${id}-t3`, label: 'Watch competitor reactions and campaign mentions', agent: 'echo', status: 'todo' },
      { id: `${id}-t4`, label: `Daily ${unit.replace(' (€)', '')} vs trajectory`, agent: 'iris', status: 'todo' },
      ...(kinds.has('creator') ? [{ id: `${id}-t5`, label: 'Find 3 creators who already use Fernway', agent: 'echo' as const, status: 'todo' as const }] : []),
      ...(kinds.has('ugc') ? [{ id: `${id}-t6`, label: 'Repost the best customer photos', agent: 'echo' as const, status: 'todo' as const }] : []),
    ],
    risks: [
      'Peakline usually discounts during competitor launches: keep the message on durability, not price',
      ...(unit === 'pre-orders' || unit === 'orders' ? ['Stock: confirm launch-day quantities with ops before the teaser'] : []),
      ...(season.gift ? ['Carrier delays after 17 December: say the last order date early'] : []),
      ...(kinds.has('challenge') && season.months.includes(0) ? ['Snow or rain on challenge days: keep indoor prompts ready'] : []),
    ],
    planned: Array.from({ length: 9 }, (_, i) => Math.round(target * Math.pow(i / 8, tpl.curve))),
    actual: [],
    adjustments: [],
    version: 1,
  }
}

const NET_NAME = NETWORK_LABEL
const NET_RE: [RegExp, Network][] = [[/instagram|insta\b|\big\b/, 'instagram'], [/tiktok|tik tok/, 'tiktok'], [/linkedin/, 'linkedin'], [/facebook|\bfb\b/, 'facebook'], [/youtube|\byt\b/, 'youtube'], [/\bx\b|twitter/, 'x']]
const netIn = (t: string) => NET_RE.find(([re]) => re.test(t))?.[1]

/** Sage's v2: each request in the note (“more TikTok, no price, start a week later”) is applied, and listed in the diff. */
export function revisePlan(c: Campaign, feedback: string): Campaign {
  const diff: Change[] = []
  let { posts, messages, goal, planned, phases, start, end, risks } = structuredClone(c)
  const clauses = feedback.toLowerCase().split(/,|;|\.\s|\band\b|\balso\b|\bthen\b/).map(x => x.trim()).filter(Boolean)
  for (const f of clauses) {
    const net = netIn(f)
    const days = f.match(/(\d+|a|one|two|three) (week|day)s? (later|earlier|sooner)/)
    if (days) {
      const n = (/^\d/.test(days[1]) ? +days[1] : days[1] === 'two' ? 2 : days[1] === 'three' ? 3 : 1) * (days[2] === 'week' ? 7 : 1) * (days[3] === 'later' ? 1 : -1)
      posts = posts.map(p => ({ ...p, day: p.day + n }))
      phases = phases.map(p => ({ ...p, start: p.start + n * DAY, end: p.end + n * DAY }))
      start += n * DAY; end += n * DAY
      diff.push({ kind: 'changed', text: `Dates moved ${Math.abs(n) % 7 ? `${Math.abs(n)} day${Math.abs(n) > 1 ? 's' : ''}` : `${Math.abs(n) / 7} week${Math.abs(n) > 7 ? 's' : ''}`} ${n > 0 ? 'later' : 'earlier'}: ${short(start)} – ${short(end)}` })
    } else if (/goal|target/.test(f) && /\d/.test(f)) {
      const g = readGoal(f)
      if (g && g.target !== goal.target) {
        const k = g.target / goal.target
        diff.push({ kind: 'changed', text: `Goal ${goal.target.toLocaleString('en-GB')} → ${g.target.toLocaleString('en-GB')} ${goal.label}` })
        goal = { ...goal, target: g.target }; planned = planned.map(v => Math.round(v * k))
      }
    } else if (net && /\b(no|drop|remove|without|skip|cut|less|fewer)\b/.test(f)) {
      const gone = posts.filter(p => p.network === net)
      if (/\b(less|fewer)\b/.test(f) && gone.length > 1) {
        // Less, not none: half of them move to the network with the fewest posts.
        const others = [...new Set(posts.map(p => p.network))].filter(n => n !== net)
        const to = others.sort((a, b) => posts.filter(p => p.network === a).length - posts.filter(p => p.network === b).length)[0] ?? 'instagram'
        const moved = gone.slice(0, Math.ceil(gone.length / 2))
        posts = posts.map(p => (moved.includes(p) ? { ...p, network: to } : p))
        moved.forEach(p => diff.push({ kind: 'changed', text: `“${p.title}” moved from ${NET_NAME[net]} to ${NET_NAME[to]}` }))
      } else {
        posts = posts.filter(p => p.network !== net)
        gone.forEach(p => diff.push({ kind: 'removed', text: `“${p.title}” (${NET_NAME[net]})` }))
      }
    } else if (net && /\b(more|add|move|switch|focus)\b/.test(f)) {
      // Two posts move from the network with the most of them.
      const from = [...new Set(posts.map(p => p.network))].filter(n => n !== net).sort((a, b) => posts.filter(p => p.network === b).length - posts.filter(p => p.network === a).length)[0]
      const moved = posts.filter(p => p.network === from).slice(0, 2)
      posts = posts.map(p => (moved.includes(p) ? { ...p, network: net } : p))
      moved.forEach(p => diff.push({ kind: 'changed', text: `“${p.title}” moved from ${NET_NAME[p.network]} to ${NET_NAME[net]}` }))
    } else if (/price|discount|promo/.test(f)) {
      const before = messages.length
      messages = messages.filter(m => !/price|discount|€|offer/i.test(m))
      risks = [...risks, 'No price or discount in any post: you asked']
      diff.push({ kind: 'changed', text: before > messages.length ? 'Removed the mention of price from the key messages' : 'No price or discount in any post (added to the risks Sage checks)' })
    } else if (/creator|influenc|ugc/.test(f)) {
      const day = posts.find(x => x.phase === 'Launch')?.day ?? 0
      const p: CPost = { id: `${c.id}-v${c.version + 1}-c`, phase: 'Launch', network: 'instagram', day: day + 1, title: 'Creator take-over: 3 stories from someone who owns it', pillar: 'Community' }
      posts = [...posts, p]
      diff.push({ kind: 'added', text: `“${p.title}” (Instagram, launch week)` })
    } else if (/shorter|fewer posts|less posts/.test(f)) {
      const cut = posts.filter(p => p.phase === 'Follow-up').slice(-1)
      posts = posts.filter(p => !cut.includes(p))
      cut.forEach(p => diff.push({ kind: 'removed', text: `“${p.title}”` }))
    }
  }
  // What Sage couldn't turn into a change still counts: it becomes a rule for this campaign.
  if (!diff.length) {
    risks = [...risks, `Your note: “${feedback.slice(0, 120)}”`]
    diff.push({ kind: 'added', text: `Your note, as a rule Atlas follows when writing: “${feedback.slice(0, 80)}”` })
  }
  return { ...c, posts, messages, goal, planned, phases, start, end, risks, version: c.version + 1, diff }
}
