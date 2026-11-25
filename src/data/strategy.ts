import type { AgentId, Network } from '../app/types'
import { T, DAY, DEMO_START } from '../app/time'
import type { Pillar as PillarName } from './publishing'

export type CampaignStatus = 'brief' | 'review' | 'live' | 'done'
export type Phase = { name: 'Teasing' | 'Launch' | 'Follow-up'; start: number; end: number; summary: string }
/** `postId`: the post in Atlas's calendar, when it isn't the same id. */
export type CPost = { id: string; phase: Phase['name']; network: Network; day: number; title: string; published?: boolean; pillar?: PillarName; postId?: string }
export type CTask = { id: string; label: string; agent: AgentId; status: 'todo' | 'doing' | 'done' }
export type Adjustment = { id: string; text: string; status: 'proposed' | 'accepted' | 'declined' }
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
  budget: number
  planned: number[]
  actual: number[]
  adjustments: Adjustment[]
  recap?: string[]
  version: number
  diff?: Change[]
  createdAt: number
  /** Post `day` values are days from this date. */
  base: number
  source?: string
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'trail-week', name: 'Trail Week', status: 'live', createdAt: T(10, 0, -21), base: DEMO_START,
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
    budget: 400,
    planned: [0, 45, 120, 165, 205, 240, 270, 290, 300],
    actual: [0, 61, 154],
    adjustments: [
      { id: 'adj1', text: 'Instagram is at 41% of its target, TikTok at 118%. Move 2 Instagram posts to TikTok.', status: 'proposed' },
      { id: 'adj2', text: 'Rain on Thursday: swap the Lac Blanc reel with “plan your trail from the sofa”.', status: 'proposed' },
    ],
    version: 1,
  },
  {
    id: 'repair-friday', name: 'Repair Friday', status: 'done', createdAt: T(10, 0, -45), base: DEMO_START,
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
    budget: 500,
    planned: [0, 120, 260, 400, 530, 650, 740, 800],
    actual: [0, 190, 410, 640, 820, 960, 1090, 1180],
    adjustments: [{ id: 'adj-rf', text: 'X brought 11 requests: drop it from repair campaigns.', status: 'accepted' }],
    recap: [
      'Repair requests reached 1,180, 148% of the goal, for €500 of boosts (€0.42 per request).',
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
    budget: 900,
    planned: [0, 3, 8, 14, 20, 27, 33, 38, 40],
    actual: [],
    adjustments: [],
    version: 1,
  },
]

export type Pillar = { id: string; name: PillarName; desc: string; target: number; actual: number }
export const PILLARS: Pillar[] = [
  { id: 'p-gear', name: 'Gear that lasts', desc: 'Products tested hard: rain, drops, years of use.', target: 35, actual: 41 },
  { id: 'p-trail', name: 'Trail stories', desc: 'Places, trips and the team outside.', target: 30, actual: 32 },
  { id: 'p-repair', name: 'Repair & care', desc: 'Repairs, maintenance, how to make gear last.', target: 15, actual: 18 },
  { id: 'p-community', name: 'Community', desc: 'Customer photos, UGC, creators, replies worth sharing.', target: 20, actual: 9 },
]

export type Cadence = { network: Network; target: number; actual: number }
export const CADENCE: Cadence[] = [
  { network: 'instagram', target: 5, actual: 5 }, { network: 'tiktok', target: 4, actual: 4 }, { network: 'linkedin', target: 2, actual: 2 },
  { network: 'facebook', target: 2, actual: 3 }, { network: 'youtube', target: 1, actual: 1 }, { network: 'x', target: 3, actual: 2 },
]

/** Sage's targets as Atlas reads them: share of posts per pillar, posts a week per network. */
export type Targets = { pillars: { name: PillarName; target: number }[]; cadence: Partial<Record<Network, number>> }
export const targetsFrom = (st: { pillars: Pillar[]; cadence: Cadence[] }): Targets => ({
  pillars: st.pillars.map(({ name, target }) => ({ name, target })),
  cadence: Object.fromEntries(st.cadence.map(c => [c.network, c.target])),
})

export type Proposal = { id: string; text: string; why: string; status: 'proposed' | 'accepted' | 'declined' }
export const PROPOSALS: Proposal[] = [
  { id: 'pr1', text: 'Raise Community from 20% to 25% of posts', why: 'Community posts have the best saves rate (4.1%) and cost nothing to produce.', status: 'proposed' },
  { id: 'pr2', text: 'Cut X to 1 post a day', why: 'X brings 2% of reach and 0.8% engagement. The time goes to TikTok instead.', status: 'proposed' },
  { id: 'pr3', text: 'Add a weekly repair post on LinkedIn', why: 'Repair posts do 1.9× better than product posts on LinkedIn.', status: 'accepted' },
]

/* ---------- Sage's plan generator (scripted, deterministic) ---------- */

const PRODUCTS: { re: RegExp; name: string; audience: string; msg: string[] }[] = [
  { re: /storm|jacket|rain/i, name: 'Storm Jacket', audience: 'Hikers and city commuters who saved rain gear posts, ages 25–45', msg: ['Dry after 4 hours in the rain, tested on camera', 'PFC-free, repairable, guaranteed', 'Pre-order now, ships on launch day'] },
  { re: /ridge|bag|pack/i, name: 'Ridge 28L', audience: 'Weekend hikers and travellers, followers who engaged with packing videos', msg: ['Everything for 3 days in 28 litres', 'Cabin-size, repairable forever', 'Built to last, not to discount'] },
  { re: /bottle|summit/i, name: 'Summit Bottle', audience: 'Daily commuters and gym-goers, gift buyers', msg: ['One bottle for life, guaranteed', 'Dropped from 5 metres, still fine', 'No plastic, no BPA, lab-tested'] },
  { re: /fleece|ember/i, name: 'Ember Fleece', audience: 'Cold-weather hikers, layering enthusiasts', msg: ['The warm layer under everything', 'Recycled fleece, repairable seams'] },
  { re: /repair/i, name: 'Repair programme', audience: 'Existing customers and sustainability-minded followers on LinkedIn', msg: ['The greenest bag is the one you already own', 'Free repairs, forever'] },
]

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

export function generatePlan(id: string, brief: string, now: number, opts: { budget?: number; source?: string } = {}): Campaign {
  const prod = PRODUCTS.find(p => p.re.test(brief)) ?? { name: 'Fernway', audience: 'Followers aged 25–40 who engaged in the last 90 days', msg: ['Gear that lasts', 'Go outside more'] }
  const num = brief.match(/(\d[\d,.]*)\s*(k\b|pre-?orders?|sign-?ups?|sales|orders|requests|followers|€|euros?)?/i)
  let target = num ? Math.round(parseFloat(num[1].replace(/,/g, '')) * (num[2]?.toLowerCase() === 'k' ? 1000 : 1)) : 300
  if (!target || target < 10) target = 300
  const unit = num?.[2] ? (/pre/i.test(num[2]) ? 'pre-orders' : /sign/i.test(num[2]) ? 'sign-ups' : /request/i.test(num[2]) ? 'requests' : /follow/i.test(num[2]) ? 'new followers' : /€|euro/i.test(num[2]) ? 'revenue from social (€)' : 'orders') : /pre-?order/i.test(brief) ? 'pre-orders' : 'sign-ups'
  // Launch date: "March 15", "15 March", "in March"… default: 3 weeks from now.
  const lower = brief.toLowerCase()
  const mi = MONTHS.findIndex(m => new RegExp(`\\b${m}`).test(lower))
  const dm = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b(?!\s*(?:k|pre|sign|order|request|follow|€|%))/)
  let launch = now + 21 * DAY
  if (mi >= 0) {
    const nd = new Date(now)
    const year = mi < nd.getMonth() ? nd.getFullYear() + 1 : nd.getFullYear()
    launch = new Date(year, mi, dm ? Math.min(28, +dm[1]) : 1, 9).getTime()
  }
  const start = launch - 5 * DAY, end = launch + 9 * DAY
  const dayOf = (t: number) => Math.round((t - now) / DAY)
  const L = dayOf(launch)
  const name = `${prod.name} ${/launch/i.test(brief) ? 'launch' : 'campaign'}`
  const posts: CPost[] = [
    { id: `${id}-1`, phase: 'Teasing', network: 'instagram', day: L - 5, title: `Something is coming: ${prod.name} teaser`, pillar: 'Gear that lasts' },
    { id: `${id}-2`, phase: 'Teasing', network: 'tiktok', day: L - 3, title: 'Behind the scenes: the rain test', pillar: 'Gear that lasts' },
    { id: `${id}-3`, phase: 'Teasing', network: 'linkedin', day: L - 2, title: `Why we spent 2 years on the ${prod.name}`, pillar: 'Repair & care' },
    { id: `${id}-4`, phase: 'Launch', network: 'instagram', day: L, title: `${prod.name} is here, carousel`, pillar: 'Gear that lasts' },
    { id: `${id}-5`, phase: 'Launch', network: 'tiktok', day: L, title: '4 hours in the rain in 30 seconds', pillar: 'Gear that lasts' },
    { id: `${id}-6`, phase: 'Launch', network: 'facebook', day: L + 1, title: `${prod.name}: everything you asked`, pillar: 'Gear that lasts' },
    { id: `${id}-7`, phase: 'Launch', network: 'youtube', day: L + 2, title: 'Full review by the design team', pillar: 'Gear that lasts' },
    { id: `${id}-8`, phase: 'Launch', network: 'instagram', day: L + 3, title: 'First customers, first trails', pillar: 'Community' },
    { id: `${id}-9`, phase: 'Follow-up', network: 'tiktok', day: L + 6, title: 'Your first week with it', pillar: 'Community' },
    { id: `${id}-10`, phase: 'Follow-up', network: 'linkedin', day: L + 8, title: 'Launch numbers and what we learned', pillar: 'Trail stories' },
  ]
  const budget = opts.budget ?? (target >= 1000 ? 1200 : 600)
  return {
    id, name, status: 'review', brief, createdAt: now, base: now, source: opts.source,
    goal: { label: unit, target, current: 0 }, start, end,
    kpis: [unit[0].toUpperCase() + unit.slice(1), 'Reach on Instagram and TikTok', 'Saves and shares on launch posts'],
    messages: prod.msg, audience: prod.audience,
    phases: [
      { name: 'Teasing', start, end: launch - DAY, summary: 'Teaser, behind the scenes, the why' },
      { name: 'Launch', start: launch, end: launch + 4 * DAY, summary: 'Reveal, proof, answers to every question' },
      { name: 'Follow-up', start: launch + 5 * DAY, end, summary: 'Customer stories, numbers, last call' },
    ],
    posts,
    tasks: [
      { id: `${id}-t1`, label: `Write and schedule the ${posts.length} posts`, agent: 'atlas', status: 'todo' },
      { id: `${id}-t2`, label: `Answer ${prod.name} questions and send ${unit} links`, agent: 'nova', status: 'todo' },
      { id: `${id}-t3`, label: 'Watch competitor reactions and launch mentions', agent: 'echo', status: 'todo' },
      { id: `${id}-t4`, label: `Daily ${unit} vs trajectory`, agent: 'iris', status: 'todo' },
      { id: `${id}-t5`, label: 'Find 3 creators who already use Fernway', agent: 'echo', status: 'todo' },
    ],
    risks: [
      'Peakline usually discounts during competitor launches: keep the message on durability, not price',
      'Stock: confirm launch-day quantities with ops before the teaser',
      ...(target > 500 ? [`${target.toLocaleString('en-GB')} ${unit} is 2× your last launch: the boost budget matters`] : []),
    ],
    budget,
    planned: Array.from({ length: 9 }, (_, i) => Math.round((target * Math.pow(i / 8, 1.3)))),
    actual: [],
    adjustments: [],
    version: 1,
  }
}

/** Sage's v2: applies the feedback and returns what changed. */
export function revisePlan(c: Campaign, feedback: string): Campaign {
  const f = feedback.toLowerCase()
  const diff: Change[] = []
  let posts = [...c.posts]
  let budget = c.budget
  let messages = [...c.messages]
  if (/tiktok|video/.test(f)) {
    const moved = posts.filter(p => p.network === 'instagram').slice(0, 2)
    posts = posts.map(p => moved.includes(p) ? { ...p, network: 'tiktok' as const } : p)
    moved.forEach(p => diff.push({ kind: 'changed', text: `“${p.title}” moved from Instagram to TikTok` }))
  }
  if (/budget|cheaper|less money|cost/.test(f)) {
    const nb = Math.round((budget * 0.7) / 50) * 50
    diff.push({ kind: 'changed', text: `Boost budget €${budget} → €${nb}` })
    budget = nb
  }
  if (/x\b|twitter/.test(f) || /drop|remove|less/.test(f) && /linkedin/.test(f)) {
    const net = /linkedin/.test(f) ? 'linkedin' : 'x'
    posts.filter(p => p.network === net).forEach(p => diff.push({ kind: 'removed', text: `“${p.title}”` }))
    posts = posts.filter(p => p.network !== net)
  }
  if (/price|discount/.test(f)) {
    messages = messages.filter(m => !/price|discount/i.test(m))
    diff.push({ kind: 'changed', text: 'Removed any mention of price from the key messages' })
  }
  if (/creator|influenc|ugc/.test(f) || !diff.length) {
    const p = { id: `${c.id}-v${c.version + 1}`, phase: 'Launch' as const, network: 'instagram' as const, day: posts.find(x => x.phase === 'Launch')?.day ?? 0, title: 'Creator take-over: 3 stories from someone who owns it' }
    posts = [...posts, p]
    diff.push({ kind: 'added', text: `“${p.title}” (Instagram, launch week)` })
    if (!/creator|influenc|ugc/.test(f)) diff.push({ kind: 'changed', text: `Key messages tightened from your note: “${feedback.slice(0, 80)}”` })
  }
  return { ...c, posts, budget, messages, version: c.version + 1, diff }
}
