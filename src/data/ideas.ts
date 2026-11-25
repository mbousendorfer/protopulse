import type { AgentId, Network } from '../app/types'
import { T } from '../app/time'
import type { Pillar } from './publishing'
import { ANOMALIES, PILLAR_PERF, POSTS as PERF } from './insights'
import { LESSONS, MENTIONS, TRENDS } from './listening'
import { FACTS } from './playbook'

/* ---------- Model ---------- */

export type IdeaSourceType = 'analytics' | 'listening' | 'brand' | 'calendar'
/** Where Atlas found the idea: the number that justifies it and the screen it comes from. */
export type IdeaSource = {
  type: IdeaSourceType; agent: AgentId; label: string; proof: string; link: string
  /** The figure shown big in "Why Atlas suggests this" ("6.4%"), and what it measures, named in words. */
  value?: string; measure?: string
}
export type IdeaAction = 'atlas-trend' | 'atlas-recycle' | 'atlas-fill' | 'atlas-competitor' | 'atlas-plan'
export type IdeaOrigin = 'continuous' | 'weekly' | 'gap' | 'urgent'
export type IdeaStatus = 'new' | 'ready' | 'scheduled' | 'snoozed' | 'dismissed' | 'sent-to-sage' | 'expired'
export type IdeaDraft = { network: Network; text: string; media?: string; brief?: string; at: number; format?: string }
export type IdeaVersion = { n: number; at: number; mode: 'draft' | 'angle' | 'free' | 'variant' | 'edit'; label: string; note: string; by: 'atlas' | 'you'; drafts: IdeaDraft[] }
export type SeriesStep = { step: 'Teaser' | 'Proof' | 'Customer voice' | 'Call'; network: Network; day: number; text: string }

/** What Atlas knows about an idea before anything is written: the angle, the proof, the raw copy. */
export type IdeaSeed = {
  key: string
  kind: 'post' | 'series'
  title: string
  why: string
  sources: IdeaSource[]
  confidence: number
  pillar: Pillar
  networks: Network[]
  action: IdeaAction
  /** Atlas's first copy, per network. A network without copy gets an adapted version. */
  copy: Partial<Record<Network, string>>
  media?: string
  /** Asked for when no photo with rights fits. Atlas never uses stock. */
  brief?: string
  format?: string
  /** Preferred day, relative to the demo day (0 = Tue 25 Nov). */
  day: number
  expires?: { at: number; reason: string }
  fit?: 'High' | 'Medium' | 'Low'
  hooks?: { question: string; number: string; story: string }
  customer?: { handle: string; quote: string }
  steps?: SeriesStep[]
  /** One word to spot the same topic already in the calendar. */
  topic: string
}

export type Idea = IdeaSeed & {
  id: string
  origin: IdeaOrigin
  /** Arrival, app time. */
  at: number
  status: IdeaStatus
  drafts?: IdeaDraft[]
  versions: IdeaVersion[]
  dismissReason?: string
  snoozedUntil?: number
  /** Desk card raised for an urgent idea. */
  handoff?: string
  /** Posts created when it was scheduled. */
  posts?: string[]
  campaign?: string
  followsRule?: string
  openedAt?: number
  /** Rule Atlas proposes after the same redirect or dismissal twice. */
  proposal?: { key: string; text: string }
  /** Your last instruction and Atlas's answer, shown in the panel. */
  said?: { you: string; atlas: string }
  /** Added to next week's plan instead of the calendar. */
  inPlan?: boolean
}

/* ---------- Sources, read from the data so the numbers match the other screens ---------- */

const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`)
const perf = (id: string) => PERF.find(p => p.id === id)!
const trend = (id: string) => TRENDS.find(t => t.id === id)!
const lesson = (id: string) => LESSONS.find(l => l.id === id)!
const fact = (id: string) => FACTS.find(f => f.id === id)!
const mention = (author: string) => MENTIONS.find(m => m.author === author)!
const pillar = (p: string) => PILLAR_PERF.find(x => x.pillar === p)!

export const srcPost = (id: string): IdeaSource => {
  const p = perf(id)
  return { type: 'analytics', agent: 'iris', label: p.title, proof: `${k(p.reach)} reach, ${p.er}% engagement`, link: '/insights/explore', value: k(p.reach), measure: `reach for “${p.title}”, at ${p.er}% engagement` }
}
export const srcAnomaly = (id: string): IdeaSource => {
  const a = ANOMALIES.find(x => x.id === id)!
  return { type: 'analytics', agent: 'iris', label: a.title.split(' at ')[0], proof: `${a.value} ${a.metric.toLowerCase()}, ${a.delta}`, link: '/insights/anomalies', value: a.value, measure: `${a.metric.toLowerCase()} on the ${a.title.split(' at ')[0]}, ${a.delta}` }
}
export const srcTrend = (id: string): IdeaSource => {
  const t = trend(id)
  const name = t.name.replace(/[“”]/g, '')
  const [, value = t.growth, rest = ''] = t.growth.match(/^(\S+)\s*(.*)$/) ?? []
  return { type: 'listening', agent: 'echo', label: `“${name}” trend`, proof: `${t.growth}, ${t.fit.toLowerCase()} fit`, link: '/listening/trends', value, measure: `growth of “${name}” ${rest}${rest ? ', ' : ''}${t.fit.toLowerCase()} fit with Fernway` }
}
export const srcLesson = (id: string, label: string): IdeaSource =>
  ({ type: 'listening', agent: 'echo', label, proof: lesson(id).evidence, link: '/listening/competitors/benchmark', value: lesson(id).evidence.match(/[+−-]?\d[\d.,]*\s?[%×]?/)?.[0].trim(), measure: lesson(id).evidence })
export const srcMention = (author: string): IdeaSource => {
  const m = mention(author)
  return { type: 'listening', agent: 'echo', label: m.author, proof: `“${m.text}”, ${k(m.reach)} reach`, link: '/listening/mentions', value: k(m.reach), measure: `people reached by ${m.author}: “${m.text}”` }
}
export const srcFact = (id: string, label: string): IdeaSource => ({ type: 'brand', agent: 'atlas', label, proof: fact(id).text, link: '/playbook', measure: `${label}: ${fact(id).text}` })
export const srcPillar = (p: string, target: number): IdeaSource => {
  const x = pillar(p)
  return { type: 'analytics', agent: 'iris', label: `${p} pillar`, proof: `${x.share}% of posts vs ${target}% target, ${x.saves}% saves`, link: '/strategy/pillars', value: `${x.share}%`, measure: `of your posts are ${p}, target ${target}%. It has your best saves rate (${x.saves}%)` }
}

/* ---------- Seeds ---------- */

/** What Atlas writes for an empty day, per network, in order of preference. Atlas never proposes the same post twice. */
export type GapCopy = { title: string; text: string; media: string; pillar: Pillar; format?: string; why: string }
export const GAP_COPY: Partial<Record<Network, GapCopy[]>> = {
  facebook: [
    { title: 'Show us your oldest Fernway bag', text: 'Show us your oldest Fernway bag. The most worn one this week gets a free repair kit from the Annecy workshop.', media: 'workshop', pillar: 'Community', why: 'Customer photo calls are your best Community format on Facebook.' },
    { title: 'Ask us anything about winter hiking', text: 'Ask us anything about winter hiking. Our guides answer in the comments, Thursday from 19:00.', media: 'snow', pillar: 'Community', why: 'Questions in the comments keep Facebook reach up after 19:00.' },
  ],
  instagram: [
    { title: '4 ways to layer the Ember Fleece under the Storm Jacket', text: '4 ways to layer the Ember Fleece under the Storm Jacket. Save it for your first cold morning.', media: 'fleece', pillar: 'Gear that lasts', format: 'Carousel · 4 slides', why: 'Carousels are your most saved format on Instagram.' },
    { title: 'What’s in the workshop this week', text: 'What’s in the workshop this week: a 6-year-old Ridge, a new zip, and a bag that will see another winter.', media: 'workshop', pillar: 'Repair & care', format: 'Carousel · 3 slides', why: 'Behind-the-scenes repair posts get your best saves rate after Community.' },
    { title: 'Sunrise at Lac Blanc, by @julien_trail', text: 'Sunrise at Lac Blanc by @julien_trail. 4:30 alarm, zero regrets. Where’s your next sunrise?', media: 'lake', pillar: 'Community', why: '@julien_trail gave you the photo, and Community is the pillar furthest behind.' },
  ],
  tiktok: [
    { title: 'POV: the rain cover is in the bottom pocket', text: 'POV: you forgot the rain cover is in the bottom pocket.', media: 'rain', pillar: 'Gear that lasts', why: 'Short POV hooks show the product in the first second.' },
    { title: 'Packing the Ridge in 20 seconds', text: 'Packing the Ridge 28L for a hut night in 20 seconds.', media: 'pack', pillar: 'Trail stories', why: 'Packing videos are up 4× this week.' },
  ],
  linkedin: [
    { title: 'How we test a bag before it reaches you', text: 'How we test a bag before it reaches you: 40 hours, 3 climates, one workshop in Annecy.', media: 'workshop', pillar: 'Gear that lasts', why: 'Behind-the-scenes posts are your best on LinkedIn mornings.' },
  ],
  youtube: [
    { title: 'How to pack a sleeping bag in 15 seconds', text: 'Short: how to pack a sleeping bag in 15 seconds.', media: 'pack', pillar: 'Trail stories', why: 'Shorts under 30 seconds keep 55% of viewers.' },
  ],
  x: [
    { title: 'Rain tomorrow in the Alps', text: 'Rain tomorrow in the Alps. Good day to test a jacket.', media: 'rain', pillar: 'Gear that lasts', why: 'Weather posts get replies at lunchtime.' },
  ],
}

const SEEDS: IdeaSeed[] = [
  {
    key: 'storm-snow', kind: 'post', topic: 'Storm Jacket', title: 'Storm Jacket, part 2: four hours in the snow',
    why: 'Your rain-test carousel is doing 3 times your usual engagement, and most of its saves come from people who never bought from Fernway. A snow test while it’s still being saved should reach the same people, right when they’re looking for winter gear.',
    sources: [srcAnomaly('an-storm'), srcPost('p-storm')], confidence: 82, pillar: 'Gear that lasts', networks: ['instagram'], action: 'atlas-recycle',
    copy: { instagram: 'Four hours in the rain last month. This time, four hours in the snow on the Semnoz. The Storm Jacket kept us dry, the hot chocolate didn’t last. Swipe for the test ❄️' },
    media: 'snow', format: 'Carousel · 5 slides', day: 2,
    hooks: { question: 'Would your jacket survive four hours of snow?', number: '4 hours. −6 °C. Zero wet layers.', story: 'We left the car at 7. By 11 the snow had turned to sleet.' },
  },
  {
    key: 'dawn-patrol', kind: 'post', topic: 'dawn', title: 'Dawn patrol: a hike before work, Trail Week edition', fit: 'High',
    why: 'Before-work hikes are rising fast and Trail Week starts Monday: the trend is the campaign.',
    sources: [srcTrend('t5'), srcMention('@sarah.hikes'), srcFact('f-trailweek', 'Trail Week')], confidence: 74, pillar: 'Trail stories', networks: ['tiktok', 'instagram'], action: 'atlas-trend',
    copy: {
      tiktok: '6:10, headlamp on. 6 km before work, back at the desk by 9. Trail Week starts Monday: who’s in? #FernwayTrailWeek',
      instagram: 'Dawn patrol: 6 km before work, back at the desk by 9. Trail Week starts Monday. Tag yours with #FernwayTrailWeek.',
    },
    media: 'sunrise', day: 1, expires: { at: T(12, 0, 2), reason: 'the “dawn patrol” trend peaks before Trail Week' },
    hooks: { question: 'What time did your alarm go off today?', number: '6 km. 2 hours. Back by 9.', story: 'The office was still dark when we parked at the trailhead.' },
  },
  {
    key: 'founder-repair', kind: 'post', topic: 'repair', title: 'Why repairs are free, in your founders’ words', fit: 'High',
    why: '“Repair over replace” is growing on LinkedIn, and a founder’s own voice gets more reactions there than a brand post.',
    sources: [srcTrend('t3'), srcLesson('ls8', 'Founder posts on LinkedIn'), srcFact('f-repair', 'Repair programme')], confidence: 79, pillar: 'Repair & care', networks: ['linkedin'], action: 'atlas-trend',
    copy: { linkedin: 'We started Fernway in Annecy in 2019, two mountain guides tired of throwing gear away. That’s why your first repair is free. This year our workshop fixed 1,200 bags. Here’s what they taught us about design.' },
    brief: 'Photo brief: both founders at the workshop bench, a Ridge open in front of them. Shot in Annecy, no stock.', day: 3,
    hooks: { question: 'Why would a bag brand pay to fix its own bags?', number: '1,200 bags. One workshop. Zero thrown away.', story: 'In 2019 we were two guides with a pile of broken gear and an idea.' },
  },
  {
    key: 'camille-ridge', kind: 'post', topic: 'Ridge', title: '@camille.outdoors, third trip with the same Ridge',
    why: 'An 84k-follower customer praised the Ridge on her own, gave us her photo, and Community is your best pillar for saves.',
    sources: [srcMention('@camille.outdoors'), srcPillar('Community', 20)], confidence: 77, pillar: 'Community', networks: ['instagram'], action: 'atlas-plan',
    copy: { instagram: 'Third trip with this bag and it still looks new. Thanks @camille.outdoors for taking the Ridge 28L everywhere. Photo: @camille.outdoors 📸' },
    media: 'pack', day: 4, customer: { handle: '@camille.outdoors', quote: 'Third trip with this bag and it still looks new.' },
  },
  {
    key: 'gr20-throwback', kind: 'post', topic: 'GR20', title: '#GR20 throwback: the Ridge on the ridge line', fit: 'High',
    why: 'The GR20 is the talk of your audience this morning, and @lea.hikes already gave you her ridge-line photo.',
    sources: [{ type: 'listening', agent: 'echo', label: 'GR20 search', proof: '1,500 mentions this week, 320 since 06:00', link: '/listening/searches', value: '320', measure: 'GR20 mentions since 06:00 (1,500 this week)' }, srcMention('@benoit.gr20')], confidence: 68, pillar: 'Trail stories', networks: ['instagram'], action: 'atlas-trend',
    copy: { instagram: 'Day 5 on the GR20, straps still holding. Where would you take your Ridge next?' },
    media: 'ridge', day: 0, expires: { at: T(9, 30), reason: 'the #GR20 conversation dropped 40% since this morning' },
  },
  {
    key: 'series-ridge', kind: 'series', topic: 'in your Ridge', title: 'What’s in your Ridge: 4 episodes with customers',
    why: 'Numbered series bring people back, packing videos are up 4 times this week, and customers already shared their Ridge with permission.',
    sources: [srcLesson('ls3', 'Numbered series'), srcTrend('t1')], confidence: 72, pillar: 'Community', networks: ['tiktok', 'instagram'], action: 'atlas-plan',
    copy: {}, day: 6, brief: 'Video brief: each customer films their own bag being unpacked, phone vertical, 20 seconds, daylight.',
    steps: [
      { step: 'Teaser', network: 'tiktok', day: 0, text: '4 hikers, 4 bags, one question: what’s in your Ridge?' },
      { step: 'Proof', network: 'instagram', day: 2, text: 'Everything @lea.hikes packed for the GR20, in 28 litres.' },
      { step: 'Customer voice', network: 'tiktok', day: 4, text: '@benoit.gr20 on day 5: what he’d leave at home next time.' },
      { step: 'Call', network: 'instagram', day: 6, text: 'Your turn: show us what’s in your Ridge with #WhatsInMyRidge.' },
    ],
  },
  // Arrive during the session.
  {
    key: 'knots-winter', kind: 'post', topic: 'knots', title: '5 knots every hiker should know, winter edition',
    why: 'The knots carousel is being saved again two weeks after it went out, and cold-weather questions are up.',
    sources: [srcPost('p-knots'), { type: 'analytics', agent: 'iris', label: 'New saves', proof: '+380 saves since Sunday, 2 weeks after posting', link: '/insights/explore', value: '+380', measure: 'new saves since Sunday, 2 weeks after it was posted' }], confidence: 81, pillar: 'Trail stories', networks: ['instagram'], action: 'atlas-recycle',
    copy: { instagram: 'Five knots every hiker should know, now with gloves on. Save this before your first winter trip.' },
    media: 'map', format: 'Carousel · 6 slides', day: 3,
  },
  {
    key: 'first-snow', kind: 'post', topic: 'snow', title: 'First snow above Annecy: post it tonight', fit: 'High',
    why: 'Everyone around Annecy is posting the first snow this morning. The moment is over by tonight.',
    sources: [{ type: 'listening', agent: 'echo', label: '“First snow” in Haute-Savoie', proof: '5× the usual mentions since 07:00', link: '/listening/mentions', value: '5×', measure: 'the usual “first snow” mentions in Haute-Savoie since 07:00' }, srcFact('f-storm', 'Storm Jacket')], confidence: 76, pillar: 'Trail stories', networks: ['instagram', 'tiktok'], action: 'atlas-trend',
    copy: {
      instagram: 'First snow on the Semnoz this morning. Jackets out, thermos full. Who’s going up this weekend?',
      tiktok: 'First snow on the Semnoz. We went up before work, obviously.',
    },
    media: 'snow', day: 0, expires: { at: T(21, 0), reason: 'the first-snow moment is over' },
  },
  // Thursday batch: ideas for next week.
  {
    key: 'fleece-city', kind: 'post', topic: 'Fleece', title: 'Gorpcore, but warm: the Ember Fleece in Lyon', fit: 'Medium',
    why: trend('t2').fitWhy, sources: [srcTrend('t2')], confidence: 63, pillar: 'Gear that lasts', networks: ['tiktok'], action: 'atlas-trend',
    copy: { tiktok: 'Trail at 7, office at 9. Same fleece.' }, media: 'city', day: 7,
  },
  {
    key: 'bottle-bifl', kind: 'post', topic: 'Bottle', title: 'Buy it for life: the Summit Bottle after a 4 m drop', fit: 'High',
    why: trend('t7').fitWhy, sources: [srcTrend('t7'), srcMention('r/BuyItForLife')], confidence: 80, pillar: 'Gear that lasts', networks: ['instagram', 'youtube'], action: 'atlas-trend',
    copy: { instagram: 'Someone dropped it 4 metres off a via ferrata. Not even a dent. Built to last, tested by you.', youtube: 'Short: the via ferrata drop, told by the person who dropped it.' },
    media: 'bottle', day: 8,
  },
  {
    key: 'zip-flaw', kind: 'post', topic: 'zip', title: 'The zip we got wrong, and how we redesigned it',
    why: lesson('ls4').text + '.', sources: [srcLesson('ls4', 'Admitting a flaw')], confidence: 71, pillar: 'Repair & care', networks: ['linkedin', 'instagram'], action: 'atlas-plan',
    copy: { linkedin: 'In 2024 we redesigned the Ridge zip after reading our own repair tickets. Here’s what we changed, and what 1,200 repairs taught us.', instagram: 'The zip we got wrong. The zip we fixed. Swipe for the difference.' },
    media: 'workshop', day: 9,
  },
  {
    key: 'staff-picks', kind: 'post', topic: 'picks', title: 'The workshop team’s winter picks',
    why: lesson('ls5').text + '.', sources: [srcLesson('ls5', 'Team faces')], confidence: 69, pillar: 'Community', networks: ['instagram'], action: 'atlas-plan',
    copy: { instagram: 'Five people who repair your bags, five things they pack for winter.' }, media: 'team', day: 10,
  },
  {
    key: 'hook-test', kind: 'post', topic: 'hook', title: 'Ridge in the rain, product in the first second',
    why: 'TikTok views fell when the product appeared late. This one shows the bag at 0:01.', sources: [srcAnomaly('an-tiktok'), srcLesson('ls1', 'Product in the first 2 seconds')], confidence: 66, pillar: 'Gear that lasts', networks: ['tiktok'], action: 'atlas-plan',
    copy: { tiktok: 'Ridge 28L, 3 hours of rain, dry inside.' }, media: 'rain', day: 8,
  },
  {
    key: 'support-sunday', kind: 'post', topic: 'support', title: 'Answered in 3 minutes on a Sunday',
    why: 'A customer praised your support in public, and service is part of “built to last”.', sources: [srcMention('@hugo.rando')], confidence: 64, pillar: 'Community', networks: ['x'], action: 'atlas-plan',
    copy: { x: '“Fernway support answered in 3 minutes on a Sunday.” Thanks @hugo.rando. We’ll take it.' }, day: 11,
  },
]

export const IDEA_SEEDS: Record<string, IdeaSeed> = Object.fromEntries(SEEDS.map(s => [s.key, s]))

/** On screen when the demo loads, in this order. The gap idea is computed from the calendar. */
export const LOAD_SEEDS = ['storm-snow', 'dawn-patrol', 'founder-repair', 'camille-ridge', 'gr20-throwback', 'series-ridge']
/** Thursday's "Ideas for next week". */
export const WEEKLY_SEEDS = ['fleece-city', 'bottle-bifl', 'zip-flaw', 'staff-picks', 'hook-test', 'support-sunday']
