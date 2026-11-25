import type { Network } from '../app/types'
import { T } from '../app/time'

export type Pillar = 'Gear that lasts' | 'Trail stories' | 'Repair & care' | 'Community'
export type PostStatus = 'scheduled' | 'published' | 'draft' | 'needs' | 'failed'

export type Post = {
  id: string
  network: Network
  at: number
  text: string
  media?: string
  status: PostStatus
  author: 'atlas' | 'you'
  pillar: Pillar
  /** Campaign name, as shown. `campaignId` points to Sage's campaign when there is one. */
  campaign?: string
  campaignId?: string
  /** Shared contract for every agent; no UI yet. */
  labels?: string[]
  link?: { url: string; utm?: Record<string, string> }
  format?: 'post' | 'carousel' | 'reel' | 'story' | 'short' | 'video' | 'document'
  stats?: { reach: number; er: number }
  handoff?: string
  note?: string
  group?: string
  /** What happened to this post, newest last. */
  history?: { at: number; text: string }[]
}

export type PlanTag = 'New' | 'Recycled' | 'Trend' | 'Campaign'
export type PlanItem = { id: string; day: number; time: string; network: Network; text: string; media?: string; tag: PlanTag; reason: string; pillar: Pillar; included: boolean }

// Pillars and the weekly cadence are Sage's: `targetsOf(s)` in features/strategy/slice.ts.
export const PUBLISH_NETWORKS: Network[] = ['instagram', 'tiktok', 'linkedin', 'facebook', 'youtube', 'x']

/** Best slots per network, with Atlas's reason. */
export const BEST_SLOT: Record<string, { time: string; reason: string }> = {
  instagram: { time: '18:30', reason: 'Evening reels get 2.1× the reach of lunchtime ones on your account.' },
  tiktok: { time: '18:30', reason: 'Your TikTok audience peaks between 18:00 and 20:00.' },
  linkedin: { time: '08:30', reason: 'LinkedIn mornings perform 1.6× better for Fernway, especially Tuesday to Thursday.' },
  facebook: { time: '19:00', reason: 'Facebook engagement is highest after 19:00 on weekdays.' },
  youtube: { time: '17:00', reason: 'Shorts posted at 17:00 get the most views in the first 24 hours.' },
  x: { time: '12:00', reason: 'X posts at 12:00 get 1.4× the replies of evening ones on your account.' },
}

const P = (id: string, network: Network, day: number, h: number, m: number, text: string, pillar: Pillar, media?: string, extra: Partial<Post> = {}): Post => {
  const at = T(h, m, day)
  return { id, network, at, text, pillar, media, author: 'atlas', status: at < T(8, 12) ? 'published' : 'scheduled', ...extra }
}
const st = (reach: number, er: number) => ({ stats: { reach, er } })

export const POSTS: Post[] = [
  // Previous week, published
  P('p-01', 'instagram', -8, 18, 30, 'Five knots every hiker should know. Save this for your next trip.', 'Trail stories', 'map', st(18400, 3.4)),
  P('p-02', 'linkedin', -8, 8, 30, '1,200 bags repaired this year instead of thrown away. Here’s how our workshop in Annecy works.', 'Repair & care', 'workshop', st(6200, 4.1)),
  P('p-03', 'tiktok', -7, 18, 30, 'Drop test from 3 metres. The bottle wins.', 'Gear that lasts', 'bottle', st(210000, 7.8)),
  P('p-04', 'facebook', -7, 19, 0, 'Your best Fernway photos from the weekend. Tag us to be featured.', 'Community', 'lake', st(7400, 2.2)),
  P('p-05', 'instagram', -6, 18, 30, 'Storm Jacket vs. a garden hose. Spoiler: you stay dry.', 'Gear that lasts', 'jacket', st(26100, 4.6)),
  P('p-06', 'youtube', -6, 17, 0, 'How to adjust the Ridge back system in 30 seconds.', 'Gear that lasts', 'pack', st(9800, 5.2)),
  P('p-07', 'tiktok', -5, 18, 30, 'Lac Blanc at 5am. Worth every step.', 'Trail stories', 'sunrise', st(41000, 5.9)),
  P('p-08', 'instagram', -5, 12, 0, 'Inside the Annecy workshop: one zip, four minutes, one bag saved.', 'Repair & care', 'workshop', st(12800, 3.1)),
  P('p-09', 'x', -4, 12, 0, 'We repair every Fernway bag for free, forever. Yes, even the old ones.', 'Repair & care', undefined, st(3100, 1.8)),
  P('p-10', 'instagram', -3, 10, 0, 'Sunday reset: how to clean your jacket the right way.', 'Repair & care', 'rain', st(14900, 3.8)),
  P('p-11', 'tiktok', -3, 18, 30, 'Packing for a 2-day hut trip in 20 seconds.', 'Trail stories', 'pack', st(9200, 2.9)),
  P('p-12', 'facebook', -2, 19, 0, 'Meet Léa: 6 trips, one Ridge, zero regrets.', 'Community', 'trail', st(8800, 2.6)),
  // This week
  P('p-13', 'linkedin', -1, 8, 30, 'Trail Week starts Monday. We close the office for it, here’s why.', 'Community', 'team', st(5400, 3.9)),
  P('p-14', 'instagram', -1, 18, 30, 'Carousel: 5 things we learned testing the Ridge on the GR20.', 'Trail stories', 'ridge', st(22300, 6.4)),
  P('p-15', 'tiktok', 0, 7, 30, 'Morning routine at 2,000 m. Coffee first.', 'Trail stories', 'mug', st(1840, 1.1)),
  P('p-16', 'instagram', 0, 12, 0, 'Story poll: hut or tent?', 'Community', 'tent'),
  P('p-trend', 'tiktok', 0, 18, 30, 'Packing the Ridge 28L for 3 days on the Tour du Mont Blanc. Everything you see fits. Yes, even the stove 🏕️', 'Trail stories', 'pack', { status: 'needs', handoff: 'h-trend', note: 'Trend post waiting for your approval on the Desk.' }),
  P('p-repair', 'linkedin', 1, 9, 0, 'Our repair programme in numbers: 1,200 bags fixed, 3.4 tonnes of waste avoided.', 'Repair & care', undefined, { status: 'needs', handoff: 'h-visual', note: 'Missing visual. Atlas won’t use stock photos.' }),
  P('p-18', 'instagram', 1, 18, 30, 'Reel: rain test on the GR5 with the Storm Jacket.', 'Gear that lasts', 'rain'),
  P('p-19', 'facebook', 1, 19, 0, 'Winter hiking checklist, rewritten for 2025.', 'Trail stories', 'snow'),
  P('p-clip-repair-brands', 'tiktok', -1, 18, 30, 'Most brands would sell you a new bag. We fix yours.', 'Repair & care', 'clip:clip-repair-brands', { ...st(48200, 7.1), note: 'Clip by Juno: Most brands would sell you a new bag' }),
  P('p-clip-repair-unpick', 'tiktok', 2, 18, 30, 'How we replace a strap, one stitch at a time.', 'Repair & care', 'clip:clip-repair-unpick', { note: 'Clip by Juno: One stitch at a time' }),
  P('p-20', 'tiktok', 2, 18, 0, 'Trail Week teaser: 7 days, 7 trails.', 'Trail stories', 'mountain', { campaign: 'Trail Week' }),
  P('p-21', 'instagram', 2, 18, 0, 'Trail kit list: everything we pack for Trail Week.', 'Gear that lasts', 'pack', { campaign: 'Trail Week' }),
  P('p-22', 'youtube', 2, 17, 0, 'Short: Summit Bottle, 12 hours hot. We timed it.', 'Gear that lasts', 'bottle'),
  P('p-23', 'instagram', 3, 18, 30, 'Storm Jacket in Ember, back in stock.', 'Gear that lasts', 'jacket', { note: 'Moved from 12:00 to 18:30 by Atlas.' }),
  P('p-24', 'linkedin', 3, 8, 30, 'What a 4-day week taught our team about gear testing.', 'Community', 'team'),
  P('p-25', 'instagram', 4, 10, 0, 'Sunrise at Lac Blanc by @julien_trail.', 'Community', 'lake', { campaign: 'Trail Week' }),
  P('p-sale', 'facebook', 4, 16, 0, 'Weekend sale: 15% off bottles with code [code] until Sunday.', 'Gear that lasts', 'bottle', { status: 'needs', handoff: 'h-code', note: 'Atlas needs the promo code.' }),
  P('p-27', 'tiktok', 4, 18, 30, 'Bottle drop test, part 2: 5 metres.', 'Gear that lasts', 'bottle'),
  P('p-28', 'instagram', 5, 11, 0, 'Sunday reset: re-proofing your Storm Jacket in 3 steps.', 'Repair & care', 'jacket'),
  // Drafts
  P('p-d1', 'instagram', 3, 12, 0, 'Gift guide: one Fernway piece for every kind of hiker.', 'Gear that lasts', 'fleece', { status: 'draft' }),
  P('p-d2', 'linkedin', 6, 8, 30, 'Why we say no to Black Friday, again.', 'Repair & care', 'workshop', { status: 'draft', author: 'you' }),
  P('p-d3', 'x', 2, 12, 0, 'Hot take: the best jacket is the one you repair.', 'Repair & care', undefined, { status: 'draft' }),
]

const I = (id: string, day: number, time: string, network: Network, text: string, tag: PlanTag, reason: string, pillar: Pillar, media?: string): PlanItem =>
  ({ id, day, time, network, text, tag, reason, pillar, media, included: true })

/** Atlas's proposed plan for the week of Monday 1 December (Trail Week). day 0 = Monday. */
export const PLAN: PlanItem[] = [
  I('n-01', 0, '08:30', 'linkedin', 'Trail Week starts today. The whole team is out on the trails, and so are our agents’ reports.', 'Campaign', 'Trail Week launch day, LinkedIn morning slot.', 'Community', 'team'),
  I('n-02', 0, '18:30', 'instagram', 'Day 1 of Trail Week: Lac d’Annecy to the Semnoz. Follow along.', 'Campaign', 'Trail Week launch, evening reel.', 'Trail stories', 'lake'),
  I('n-03', 1, '18:30', 'tiktok', 'Packing my bag: Ridge 28L, Trail Week edition.', 'Trend', 'Echo: “packing my bag” is up 4× this week.', 'Trail stories', 'pack'),
  I('n-04', 1, '19:00', 'facebook', 'Your Trail Week photos, day 1 and 2. Tag #FernwayTrailWeek.', 'Campaign', 'Community pillar is under target (9% vs 20%).', 'Community', 'trail'),
  I('n-05', 2, '08:30', 'linkedin', 'Repair over replace: why our bags come with a lifetime repair promise.', 'Trend', 'Echo: “repair over replace” +60% this month on LinkedIn.', 'Repair & care', 'workshop'),
  I('n-06', 2, '18:30', 'instagram', 'Storm Jacket vs. a garden hose, the winter cut.', 'Recycled', 'Recycled: 26k reach in November, top 3 post of the month.', 'Gear that lasts', 'jacket'),
  I('n-07', 3, '17:00', 'youtube', 'Short: adjusting the Ridge back system on the trail.', 'Recycled', 'Recycled: 9.8k views, your best Short this quarter.', 'Gear that lasts', 'pack'),
  I('n-08', 3, '18:30', 'tiktok', 'Gorpcore, but make it functional: the Trail Week fit.', 'Trend', 'Echo: gorpcore city outfits +180% in 14 days.', 'Gear that lasts', 'city'),
  I('n-09', 4, '08:00', 'instagram', 'Story poll: where are you heading this weekend?', 'New', 'Polls get 3× more replies than questions on your stories.', 'Community', 'valley'),
  I('n-10', 4, '18:30', 'tiktok', 'Bottle drop test from 3 metres, Trail Week edition.', 'Recycled', 'Recycled: 210k views on TikTok in November.', 'Gear that lasts', 'bottle'),
  I('n-11', 5, '10:00', 'instagram', 'Customer story: Léa’s GR20 in 12 photos.', 'New', 'Léa agreed to share her photos (UGC rights granted).', 'Community', 'ridge'),
  I('n-12', 5, '16:00', 'facebook', 'Last call: 15% off bottles until Sunday night.', 'New', 'Weekend sale, Facebook converts best for promotions.', 'Gear that lasts', 'bottle'),
  I('n-13', 6, '11:00', 'instagram', 'Sunday reset: cleaning your jacket the right way.', 'New', 'Repair & care pillar, Sunday slot performs well.', 'Repair & care', 'rain'),
  I('n-14', 6, '19:00', 'tiktok', 'Trail Week recap in 20 seconds.', 'Campaign', 'Campaign close, recap format.', 'Trail stories', 'mountain'),
]

/** Alternatives Atlas uses for a v2 when you ask for changes. */
export const PLAN_ALTERNATIVES: Partial<Record<Network, { text: string; reason: string; pillar: Pillar; media: string }>> = {
  instagram: { text: 'Trail Week, day 3: the crew’s favourite viewpoint.', reason: 'New, replaces a removed post on Instagram.', pillar: 'Trail stories', media: 'mountain' },
  tiktok: { text: '3-second hook test: the Ridge in the rain.', reason: 'Tests Iris’s hook hypothesis after the TikTok dip.', pillar: 'Gear that lasts', media: 'rain' },
  linkedin: { text: 'What 1,200 repairs taught us about design.', reason: 'New, replaces a removed post on LinkedIn.', pillar: 'Repair & care', media: 'workshop' },
  facebook: { text: 'Ask us anything about winter hiking, Thursday 19:00.', reason: 'Community pillar, live Q&A format.', pillar: 'Community', media: 'snow' },
  youtube: { text: 'Short: the Storm Jacket seam tape, up close.', reason: 'Answers the questions about seams this week.', pillar: 'Gear that lasts', media: 'jacket' },
}

export type Media = { id: string; name: string; title: string; tags: string[]; rights: string; used: number; added: string }

export const MEDIA: Media[] = [
  { id: 'md-01', name: 'mountain', title: 'Aiguilles Rouges at dusk', tags: ['Landscape', 'Trail Week'], rights: 'Fernway', used: 4, added: '12 Nov' },
  { id: 'md-02', name: 'lake', title: 'Lac Blanc, sunrise', tags: ['Landscape', 'UGC'], rights: 'UGC · @julien_trail, permission granted', used: 2, added: '20 Nov' },
  { id: 'md-03', name: 'pack', title: 'Ridge 28L · Moss, studio', tags: ['Product', 'Ridge'], rights: 'Fernway', used: 9, added: '3 Sep' },
  { id: 'md-04', name: 'bottle', title: 'Summit Bottle · Slate, studio', tags: ['Product', 'Bottle'], rights: 'Fernway', used: 7, added: '3 Sep' },
  { id: 'md-05', name: 'jacket', title: 'Storm Jacket · Ember, studio', tags: ['Product', 'Storm'], rights: 'Fernway', used: 6, added: '10 Oct' },
  { id: 'md-06', name: 'fleece', title: 'Ember Fleece · Ember, studio', tags: ['Product', 'Fleece'], rights: 'Fernway', used: 3, added: '10 Oct' },
  { id: 'md-07', name: 'workshop', title: 'Annecy repair workshop', tags: ['Repair', 'Behind the scenes'], rights: 'Fernway', used: 3, added: '14 Oct' },
  { id: 'md-08', name: 'sunrise', title: 'Col de la Forclaz, 6am', tags: ['Landscape'], rights: 'Fernway', used: 2, added: '2 Nov' },
  { id: 'md-09', name: 'trail', title: 'GR5 forest section', tags: ['Landscape', 'Trail'], rights: 'Fernway', used: 1, added: '18 Oct' },
  { id: 'md-10', name: 'tent', title: 'Bivouac above Chamonix', tags: ['Camp'], rights: 'Creator · @camille.outdoors, licensed until Mar 2026', used: 1, added: '6 Nov' },
  { id: 'md-11', name: 'camp', title: 'Camp at golden hour', tags: ['Camp', 'Landscape'], rights: 'Fernway', used: 0, added: '21 Nov' },
  { id: 'md-12', name: 'ridge', title: 'GR20 ridge line', tags: ['Landscape', 'UGC'], rights: 'UGC · @lea.hikes, permission granted', used: 1, added: '15 Nov' },
  { id: 'md-13', name: 'snow', title: 'First snow on the Semnoz', tags: ['Landscape', 'Winter'], rights: 'Fernway', used: 1, added: '19 Nov' },
  { id: 'md-14', name: 'river', title: 'Gorges du Fier', tags: ['Landscape'], rights: 'Fernway', used: 0, added: '8 Nov' },
  { id: 'md-15', name: 'forest', title: 'Bauges forest trail', tags: ['Landscape', 'Trail'], rights: 'Fernway', used: 2, added: '30 Sep' },
  { id: 'md-16', name: 'rain', title: 'Rain test, GR5', tags: ['Product', 'Storm'], rights: 'Fernway', used: 3, added: '12 Oct' },
  { id: 'md-17', name: 'valley', title: 'Vallée de Chamonix', tags: ['Landscape'], rights: 'Fernway', used: 1, added: '1 Oct' },
  { id: 'md-18', name: 'boots', title: 'Boots drying by the hut', tags: ['Lifestyle'], rights: 'Fernway', used: 0, added: '22 Oct' },
  { id: 'md-19', name: 'stove', title: 'Morning stove, studio', tags: ['Product', 'Lifestyle'], rights: 'Fernway', used: 1, added: '25 Sep' },
  { id: 'md-20', name: 'map', title: 'Route planning, IGN map', tags: ['Lifestyle'], rights: 'Fernway', used: 2, added: '17 Sep' },
  { id: 'md-21', name: 'mug', title: 'Coffee at 2,000 m', tags: ['Lifestyle'], rights: 'Fernway', used: 1, added: '20 Nov' },
  { id: 'md-22', name: 'team', title: 'Team meeting, Annecy office', tags: ['Behind the scenes'], rights: 'Fernway', used: 2, added: '4 Nov' },
  { id: 'md-23', name: 'night', title: 'Stars over the Aravis', tags: ['Landscape'], rights: 'Creator · @theo.wild, licensed until Jan 2026', used: 0, added: '9 Nov' },
  { id: 'md-24', name: 'coast', title: 'Coastal path, Brittany', tags: ['Landscape'], rights: 'Fernway', used: 0, added: '28 Aug' },
  { id: 'md-25', name: 'desert', title: 'Wadi Rum trek', tags: ['Landscape', 'UGC'], rights: 'UGC · @ana.climbs, permission granted', used: 1, added: '2 Oct' },
  { id: 'md-26', name: 'city', title: 'Storm Jacket in Lyon', tags: ['Lifestyle', 'Storm'], rights: 'Fernway', used: 1, added: '14 Nov' },
  { id: 'md-27', name: 'snow', title: 'Snowshoe tracks', tags: ['Winter'], rights: 'Fernway', used: 0, added: '22 Nov' },
  { id: 'md-28', name: 'mountain', title: 'Mont Blanc from Brévent', tags: ['Landscape'], rights: 'Fernway', used: 3, added: '11 Sep' },
  { id: 'md-29', name: 'pack', title: 'Ridge 28L · Glacier, on trail', tags: ['Product', 'Ridge', 'UGC'], rights: 'UGC · @camille.outdoors, permission granted', used: 2, added: '19 Nov' },
  { id: 'md-30', name: 'workshop', title: 'Zip repair, close-up (October)', tags: ['Repair'], rights: 'Fernway', used: 0, added: '16 Oct' },
]
