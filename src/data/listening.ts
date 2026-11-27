import type { AgentId, Network } from '../app/types'
import { T, MIN } from '../app/time'

export type CompetitorId = 'peakline' | 'norro' | 'trailkind' | 'basecamp'

export type Competitor = {
  /** One of the four seeded competitors, or the id of one Sam added (see competitorsOf). */
  id: CompetitorId | string
  name: string
  handle: string
  positioning: string
  price: string
  followers: number
  growth: number
  cadence: number
  er: number
  formats: string
  sov: number
  hero: string
}

export const FERNWAY_ROW = { name: 'Fernway', followers: 120000, growth: 2.1, cadence: 17, er: 3.1, formats: 'Carousels, reels', sov: 31 }

export const COMPETITORS: Competitor[] = [
  { id: 'peakline', name: 'Peakline', handle: '@peakline', positioning: 'The biggest outdoor DTC brand in Europe. Wins on price and range, discounts often.', price: '€€', followers: 410000, growth: 1.2, cadence: 24, er: 1.8, formats: 'Product reels, promo carousels', sov: 27, hero: 'Aero 30 bag' },
  { id: 'norro', name: 'Norrø', handle: '@norro_official', positioning: 'Premium Scandinavian brand. Durability and design, slow content, strong on LinkedIn.', price: '€€€', followers: 185000, growth: 1.6, cadence: 9, er: 3.4, formats: 'Long carousels, films', sov: 22, hero: 'Fjell 25 bag' },
  { id: 'trailkind', name: 'Trailkind', handle: '@trailkind', positioning: 'Challenger born on TikTok. Fast hooks, creator-led, younger audience.', price: '€€', followers: 260000, growth: 4.8, cadence: 31, er: 4.6, formats: 'Short video, split screens', sov: 12, hero: 'Drift 26 bag' },
  { id: 'basecamp', name: 'Basecamp Co.', handle: '@basecampco', positioning: 'Mass-market brand sold in sports chains. Low prices, little community.', price: '€', followers: 95000, growth: 0.4, cadence: 12, er: 0.9, formats: 'Catalogue posts', sov: 8, hero: 'Hydra bottle' },
]

export type EventType = 'Launch' | 'Price cut' | 'Campaign' | 'Viral post' | 'Bad buzz' | 'Creator partnership' | 'Cadence change'
export type Move = { label: string; agent: AgentId; kind: 'counter' | 'sage' | 'sales' | 'nova' | 'lesson' | 'none' }

export type CompEvent = {
  id: string
  competitor: CompetitorId | string
  type: EventType
  title: string
  at: number
  proof: { network: Network; text: string; metric: string }
  impact: 'High' | 'Medium' | 'Low'
  impactWhy: string
  read: string
  moves: Move[]
  /** Already handled before the demo starts. */
  done?: { move: string; result: string }
}

const counter = (label: string): Move => ({ label, agent: 'atlas', kind: 'counter' })
const sage = (label: string): Move => ({ label, agent: 'sage', kind: 'sage' })
const sales: Move = { label: 'Tell the sales team', agent: 'echo', kind: 'sales' }
const none: Move = { label: 'Nothing to do', agent: 'echo', kind: 'none' }

export const EVENTS: CompEvent[] = [
  { id: 'e-peak-price', competitor: 'peakline', type: 'Price cut', title: 'Peakline cut the Aero 30 to €99 (−29%)', at: T(6, 50),
    proof: { network: 'instagram', text: '“The Aero 30 at €99. Because adventures shouldn’t cost a fortune.” Swipe-up to shop.', metric: '3× their usual comments in 1 hour' },
    impact: 'High', impactWhy: 'The Aero 30 is the direct rival to the Ridge 28L (€140). Three of your followers asked if you’ll match.',
    read: 'Most comments are about price, not quality. Matching would teach your followers to wait for discounts. Durability is where you win: your bags are repairable for life, theirs aren’t.',
    moves: [counter('Counter-post by Atlas: “Built to last, not to discount”'), sage('Brief Sage on a response campaign'), sales, none] },
  { id: 'e-trail-viral', competitor: 'trailkind', type: 'Viral post', title: 'Trailkind’s “bag vs. rain” reel hit 1.2M views', at: T(19, 0, -1),
    proof: { network: 'tiktok', text: 'Split screen: Drift 26 vs. “a regular bag” under a garden hose. Hook at 0:02.', metric: '1.2M views · 8.1% engagement' },
    impact: 'Medium', impactWhy: 'Same format as your Storm Jacket hose reel, but faster.',
    read: 'Their hook lands in 2 seconds, yours in 6. The format works in your category; the speed is the lesson.',
    moves: [counter('Atlas tests the same format with the Ridge'), { label: 'Add to Echo’s lessons only', agent: 'echo', kind: 'lesson' }, none] },
  { id: 'e-norro-repair', competitor: 'norro', type: 'Launch', title: 'Norrø launches a lifetime repair programme', at: T(14, 20, -1),
    proof: { network: 'linkedin', text: '“From today, every Norrø bag gets free repairs, forever.” Video from their Oslo workshop.', metric: '4,200 reactions in 18 hours' },
    impact: 'High', impactWhy: 'Repair is your strongest LinkedIn story. They just claimed it loudly.',
    read: 'You’ve repaired 1,200 bags this year and have the numbers to prove it. Talk about results, not promises.',
    moves: [sage('Brief Sage: a “Repair Week” campaign in January'), counter('Atlas posts our repair numbers (1,200 bags fixed)'), sales] },
  { id: 'e-basecamp-recall', competitor: 'basecamp', type: 'Bad buzz', title: 'Basecamp Co. recalls 8,000 water bottles', at: T(7, 30),
    proof: { network: 'x', text: 'National news: BPA found in the lid of the Hydra bottle. Retailers pull it from shelves.', metric: '2,900 mentions since 07:30' },
    impact: 'Medium', impactWhy: 'People will look for a safe alternative. Your Summit Bottle is lab-tested.',
    read: 'Don’t name them. Answer safety questions with your lab results, and let people find you.',
    moves: [{ label: 'Nova answers bottle safety questions with our lab results', agent: 'nova', kind: 'nova' }, counter('Atlas posts our materials page, without naming them'), none] },
  { id: 'e-peak-creator', competitor: 'peakline', type: 'Creator partnership', title: 'Peakline signs @theo.wild for a 6-month series', at: T(11, 0, -2),
    proof: { network: 'instagram', text: 'Announcement reel: “6 months, 6 countries, one Peakline pack.”', metric: '120k followers · 4.4% engagement' },
    impact: 'Low', impactWhy: 'Théo asked you for a collab last month; you didn’t answer yet.',
    read: 'One creator won’t move your share of voice. Your unpaid fans (like @camille.outdoors) convert better.',
    moves: [{ label: 'Nova thanks our unpaid creator fans this week', agent: 'nova', kind: 'nova' }, none],
    done: { move: 'Nothing to do', result: 'Dismissed. Echo watches the series’ engagement monthly.' } },
  { id: 'e-trail-cadence', competitor: 'trailkind', type: 'Cadence change', title: 'Trailkind doubled their TikTok cadence to 3 a day', at: T(9, 0, -3),
    proof: { network: 'tiktok', text: '21 videos in 7 days, mostly reposts of creator content.', metric: 'Reach +38% in a week' },
    impact: 'Low', impactWhy: 'Volume play. Their engagement per video dropped 22%.',
    read: 'Don’t follow. Sage’s cadence for TikTok (4 a week) is where your engagement is highest.',
    moves: [none], done: { move: 'Nothing to do', result: 'Kept your cadence. Trailkind’s engagement fell 22% that week.' } },
  { id: 'e-norro-film', competitor: 'norro', type: 'Campaign', title: 'Norrø’s “Slow Gear” film campaign', at: T(10, 0, -5),
    proof: { network: 'youtube', text: '12-minute film about a bag carried for 20 years in Lofoten.', metric: '310k views in 5 days' },
    impact: 'Medium', impactWhy: 'Premium storytelling aimed at your older customers.',
    read: 'Long films work for them on YouTube. Your Shorts do better; a customer-story series could answer without a 12-minute film.',
    moves: [sage('Brief Sage: a customer-story series'), none], done: { move: 'Brief Sage: a customer-story series', result: 'Sage planned 4 customer stories for January. Two are drafted.' } },
  { id: 'e-peak-black', competitor: 'peakline', type: 'Campaign', title: 'Peakline starts Black Friday a week early', at: T(8, 0, -6),
    proof: { network: 'facebook', text: '“Black Week: up to 50% off everything.” Pinned on their page in France and Germany.', metric: '4,800 comments in 2 days' },
    impact: 'Medium', impactWhy: 'Your followers will be pitched discounts all week.',
    read: 'Trail Week is your answer: get people outside instead of shopping. No discount needed.',
    moves: [counter('Atlas posts a “we’re closed, go outside” reminder'), none], done: { move: 'Counter-post by Atlas', result: 'Counter-post published · 3.2% engagement vs 2.1% average.' } },
  { id: 'e-trail-launch', competitor: 'trailkind', type: 'Launch', title: 'Trailkind launches the Drift 26 in Moss green', at: T(12, 0, -8),
    proof: { network: 'instagram', text: 'Launch carousel. The colour is close to your Moss.', metric: '6.2% engagement' },
    impact: 'Low', impactWhy: 'Colour overlap only. Different price and audience.',
    read: 'Nothing to answer. Your Moss is 3 years older and has 2,400 reviews.',
    moves: [none], done: { move: 'Nothing to do', result: 'Dismissed.' } },
  { id: 'e-basecamp-price', competitor: 'basecamp', type: 'Price cut', title: 'Basecamp Co. bottles at €9 in sports chains', at: T(9, 0, -9),
    proof: { network: 'facebook', text: 'Catalogue post: Hydra bottle €9 (was €15).', metric: 'Low engagement (0.4%)' },
    impact: 'Low', impactWhy: 'Different market. Your bottle buyers don’t shop there.',
    read: 'No overlap in audience. Nothing to do.',
    moves: [none], done: { move: 'Nothing to do', result: 'Dismissed.' } },
  { id: 'e-norro-price', competitor: 'norro', type: 'Price cut', title: 'Norrø raises prices 8% on all bags', at: T(10, 0, -11),
    proof: { network: 'linkedin', text: 'CEO post: “We pay our makers fairly. Prices go up 8% on 1 December.”', metric: '1,900 reactions, mostly positive' },
    impact: 'Low', impactWhy: 'Makes your Ridge look better value against the premium end.',
    read: 'Good news for you. Sales can use it in comparisons.',
    moves: [sales, none], done: { move: 'Tell the sales team', result: 'Sales got the email. Used in 3 B2B quotes since.' } },
  { id: 'e-trail-buzz', competitor: 'trailkind', type: 'Bad buzz', title: 'Trailkind criticised for a misleading “waterproof” claim', at: T(16, 0, -13),
    proof: { network: 'x', text: 'Thread by a gear reviewer: the Drift 26 is water-resistant, not waterproof.', metric: '640 reposts' },
    impact: 'Low', impactWhy: 'Reminds people to check claims. Your Storm Jacket claims are tested.',
    read: 'Don’t pile on. Make sure your own product pages use the exact ratings.',
    moves: [none], done: { move: 'Nothing to do', result: 'Nova checked your product claims: all match the lab ratings.' } },
  { id: 'e-peak-tiktok', competitor: 'peakline', type: 'Viral post', title: 'Peakline’s “what’s in my bag” series passes 3M views', at: T(18, 0, -15),
    proof: { network: 'tiktok', text: 'Staff members empty their packs. 10 episodes.', metric: '3.1M views across the series' },
    impact: 'Medium', impactWhy: 'The packing format is growing (Echo’s trend list).',
    read: 'Your own version with real customers would be more credible.',
    moves: [counter('Atlas drafts a customer “what’s in my bag”'), none], done: { move: 'Counter-post by Atlas', result: 'Your “packing my bag” post is on today’s plan.' } },
  { id: 'e-basecamp-store', competitor: 'basecamp', type: 'Campaign', title: 'Basecamp Co. opens 12 shop-in-shops in sports chains', at: T(9, 0, -18),
    proof: { network: 'linkedin', text: 'Press release on LinkedIn.', metric: '220 reactions' },
    impact: 'Low', impactWhy: 'Retail move, no social impact.',
    read: 'Nothing to answer on social.',
    moves: [none], done: { move: 'Nothing to do', result: 'Dismissed.' } },
  { id: 'e-norro-creator', competitor: 'norro', type: 'Creator partnership', title: 'Norrø partners with mountain guide @ingrid.peaks', at: T(10, 0, -20),
    proof: { network: 'instagram', text: 'Monthly guide tips, all shot in Norrø gear.', metric: '64k followers · 5.9% engagement' },
    impact: 'Low', impactWhy: 'Expert credibility play, slow burn.',
    read: 'Your workshop team is your expert voice. Feature them more.',
    moves: [none], done: { move: 'Nothing to do', result: 'Sage added a monthly “ask the workshop” post.' } },
]

export type TopPost = { id: string; competitor: CompetitorId; network: Network; title: string; views: string; er: number; format: string; takeaway: string }

export const TOP_POSTS: TopPost[] = [
  { id: 'tp1', competitor: 'trailkind', network: 'tiktok', title: 'Bag vs. rain, split screen', views: '1.2M', er: 8.1, format: 'Short video', takeaway: 'Product and problem on screen in the first 2 seconds.' },
  { id: 'tp2', competitor: 'peakline', network: 'tiktok', title: 'What’s in my bag, ep. 4', views: '640k', er: 5.2, format: 'Series', takeaway: 'Numbered series bring people back for the next episode.' },
  { id: 'tp3', competitor: 'norro', network: 'linkedin', title: 'Lifetime repairs, from today', views: '89k', er: 6.4, format: 'Video', takeaway: 'Workshop footage beats product shots on LinkedIn.' },
  { id: 'tp4', competitor: 'trailkind', network: 'instagram', title: 'POV: you forgot your rain cover', views: '410k', er: 7.3, format: 'Reel', takeaway: 'Humour about a mistake everyone makes.' },
  { id: 'tp5', competitor: 'norro', network: 'youtube', title: 'Slow Gear: 20 years in Lofoten', views: '310k', er: 4.2, format: 'Film', takeaway: 'Long form works only with a real person and a long time span.' },
  { id: 'tp6', competitor: 'peakline', network: 'instagram', title: 'Aero 30 at €99', views: '220k', er: 2.9, format: 'Carousel', takeaway: 'Price posts get comments, not saves.' },
  { id: 'tp7', competitor: 'trailkind', network: 'tiktok', title: 'Packing for 5 days in 26 litres', views: '890k', er: 6.6, format: 'Short video', takeaway: 'Concrete constraint (“5 days, 26 litres”) in the title.' },
  { id: 'tp8', competitor: 'norro', network: 'instagram', title: 'The 7 repairs we do most', views: '150k', er: 5.8, format: 'Carousel', takeaway: 'Numbered lists get saved.' },
  { id: 'tp9', competitor: 'peakline', network: 'youtube', title: 'Aero 30 vs. the competition', views: '180k', er: 3.1, format: 'Video', takeaway: 'Comparison videos rank on search for months.' },
  { id: 'tp10', competitor: 'trailkind', network: 'instagram', title: 'Creator take-over: Lisbon to Porto', views: '330k', er: 6.1, format: 'Stories', takeaway: 'Creator take-overs feel less like ads.' },
  { id: 'tp11', competitor: 'basecamp', network: 'facebook', title: 'Back to school bundle', views: '42k', er: 1.1, format: 'Catalogue', takeaway: 'Catalogue posts don’t travel. Nothing to copy.' },
  { id: 'tp12', competitor: 'norro', network: 'linkedin', title: 'Why we raised our prices', views: '74k', er: 5.5, format: 'Text post', takeaway: 'Plain-spoken CEO posts earn trust on LinkedIn.' },
  { id: 'tp13', competitor: 'trailkind', network: 'tiktok', title: 'Rating your hiking bags 1 to 10', views: '560k', er: 7.0, format: 'Duet', takeaway: 'Duets with followers’ gear drive replies.' },
  { id: 'tp14', competitor: 'peakline', network: 'instagram', title: 'Staff picks for winter', views: '130k', er: 3.6, format: 'Carousel', takeaway: 'Real staff faces lift engagement 40% vs. models.' },
  { id: 'tp15', competitor: 'norro', network: 'instagram', title: 'Before and after: a 15-year-old pack', views: '260k', er: 6.9, format: 'Reel', takeaway: 'Before/after is the strongest repair format.' },
  { id: 'tp16', competitor: 'trailkind', network: 'youtube', title: 'Drift 26 in 60 seconds', views: '95k', er: 4.0, format: 'Short', takeaway: 'Under 60 seconds keeps retention above 55%.' },
  { id: 'tp17', competitor: 'peakline', network: 'tiktok', title: 'Unboxing at 6am at base camp', views: '300k', er: 4.9, format: 'Short video', takeaway: 'Location first, product second.' },
  { id: 'tp18', competitor: 'basecamp', network: 'instagram', title: 'Hydra bottle, 6 colours', views: '38k', er: 0.8, format: 'Carousel', takeaway: 'Colour range alone doesn’t engage.' },
  { id: 'tp19', competitor: 'trailkind', network: 'instagram', title: 'Our worst product, honestly', views: '280k', er: 8.4, format: 'Reel', takeaway: 'Admitting a flaw earns more trust than any claim.' },
  { id: 'tp20', competitor: 'norro', network: 'tiktok', title: 'One bag, 4 seasons', views: '120k', er: 5.1, format: 'Short video', takeaway: 'Seasonal montage works for durable products.' },
]

export type Lesson = { id: string; text: string; evidence: string; idea: string }

export const LESSONS: Lesson[] = [
  { id: 'ls1', text: 'Show the product in the first 2 seconds on TikTok', evidence: 'Trailkind’s top 5 videos all hook in under 2 s. Yours average 6 s.', idea: 'Recut the Ridge packing video so the bag appears at 0:01.' },
  { id: 'ls2', text: 'Before/after beats product shots for repair content', evidence: 'Norrø’s before/after reel: 6.9% engagement vs. 3.1% for their product reels.', idea: 'Before/after of a 6-year-old Ridge from the workshop.' },
  { id: 'ls3', text: 'Numbered series bring people back', evidence: 'Peakline’s “what’s in my bag” episodes keep 70% of viewers from one episode to the next.', idea: 'A 5-episode “what’s in your Ridge” series with customers.' },
  { id: 'ls4', text: 'Admitting a flaw earns trust', evidence: 'Trailkind’s “our worst product, honestly”: 8.4% engagement, their best this year.', idea: 'The zip we redesigned in 2024, and why.' },
  { id: 'ls5', text: 'Staff faces beat models', evidence: 'Peakline staff picks: +40% engagement vs. model shots.', idea: 'The workshop team’s winter picks.' },
  { id: 'ls6', text: 'Concrete constraints in titles', evidence: '“5 days in 26 litres” style titles average 1.8× views at Trailkind.', idea: '“3 days on the GR20 in 28 litres”.' },
  { id: 'ls7', text: 'Price posts get comments, not saves', evidence: 'Peakline price posts: 0.3% saves vs. 2.4% for how-to posts.', idea: 'Keep promotions out of the feed; use stories.' },
  { id: 'ls8', text: 'CEO voice works on LinkedIn', evidence: 'Norrø’s pricing post by their CEO: 5.5% engagement.', idea: 'A plain post from your founder on why repairs are free.' },
]

export type Sentiment = 'positive' | 'neutral' | 'negative'
/** `search`: the search that caught it (Searches tab), when Echo knows. */
export type Mention = { id: string; author: string; network: string; text: string; sentiment: Sentiment; reach: number; at: number; product?: string; risk?: boolean; search?: string }

const M: [string, string, string, Sentiment, number, string?, boolean?][] = [
  ['@camille.outdoors', 'Instagram', 'Third trip with this bag and it still looks new. @fernway you got me.', 'positive', 84000, 'Ridge 28L'],
  ['r/ultralight', 'Reddit', 'Fernway Ridge vs Peakline Aero, which one for the GR20? Aero is €99 now.', 'neutral', 12000, 'Ridge 28L'],
  ['@hugo.rando', 'X', 'Fernway support answered in 3 minutes on a Sunday. Respect.', 'positive', 2100],
  ['Outdoor Weekly', 'Web', 'Which rainwear brands still use PFAS? We asked them.', 'negative', 38000, 'Storm Jacket', true],
  ['@julien_trail', 'TikTok', 'Sunrise at Lac Blanc with the Ridge. 4:30 alarm, zero regrets.', 'positive', 9200, 'Ridge 28L'],
  ['@margaux.vb', 'Instagram', 'The Ember Fleece is the softest thing I own. Wearing it to bed.', 'positive', 1400, 'Ember Fleece'],
  ['@leo_alpes', 'X', 'My Storm Jacket seams leaked after 3 washes. Anyone else?', 'negative', 3100, 'Storm Jacket', true],
  ['Green Gear newsletter', 'Web', 'Fernway repaired 1,200 bags this year instead of selling new ones.', 'positive', 38000],
  ['@sarah.hikes', 'Instagram', 'Joined #FernwayTrailWeek! 6 km before work today.', 'positive', 2600],
  ['@tom.bivouac', 'Instagram', 'Does the Ridge fit as cabin luggage? Asking before I buy.', 'neutral', 900, 'Ridge 28L'],
  ['r/BuyItForLife', 'Reddit', 'Summit Bottle survived a 4 m drop off a via ferrata. Not even a dent.', 'positive', 21000, 'Summit Bottle'],
  ['@nadia.runs', 'TikTok', 'Fernway bottle in my gym bag every day for a year. Still no smell.', 'positive', 5400, 'Summit Bottle'],
  ['@pierre.v', 'Facebook', 'Stove clip broke during a climb. Not happy.', 'negative', 600, 'Ridge 28L', true],
  ['@anais.trek', 'Instagram', 'Got the wrong colour but support fixed it in an hour.', 'positive', 1200],
  ['Le Dauphiné', 'Web', 'Annecy brand Fernway closes its office for a week of hiking.', 'positive', 54000],
  ['@max.velo', 'X', 'Fernway prices are getting steep. €220 for a jacket?', 'negative', 800, 'Storm Jacket'],
  ['@clara.mountains', 'Instagram', 'Matching Moss Ridge and Moss Fleece. I have a problem.', 'positive', 3300],
  ['r/CampingGear', 'Reddit', 'Fernway vs Norrø for repairs? Both say lifetime now.', 'neutral', 8800],
  ['@benoit.gr20', 'TikTok', 'Day 5 of the GR20. Ridge straps holding up fine this time.', 'positive', 4100, 'Ridge 28L'],
  ['@lucie_k', 'Instagram', 'Is the Storm Jacket PFC-free or not? Can’t find it anywhere.', 'neutral', 700, 'Storm Jacket', true],
  ['Trail Running FR', 'Web', 'Best bottles of 2025: Fernway Summit in our top 3.', 'positive', 22000, 'Summit Bottle'],
  ['@ines.moreau', 'X', 'Late delivery but they refunded shipping without me asking.', 'positive', 450],
  ['@theo.wild', 'Instagram', 'Testing a few packs for a long trip. Fernway is on the list.', 'neutral', 120000],
  ['@jeanne.paris', 'TikTok', 'Fernway gorpcore fit check for the office.', 'positive', 15000],
  ['@mathis.ski', 'X', 'Storm Jacket in a snowstorm: dry but cold. It’s a shell, fair.', 'neutral', 1100, 'Storm Jacket'],
]

const FILLER: [string, Sentiment, string?][] = [
  ['Love the Moss colour, ordering one for my sister.', 'positive', 'Ridge 28L'],
  ['Joined Trail Week, 4 km at lunch.', 'positive'],
  ['Any discount code for students?', 'neutral'],
  ['Bottle lid is a bit stiff at first.', 'neutral', 'Summit Bottle'],
  ['Shipping to Belgium took 2 days. Nice.', 'positive'],
  ['Their repair form is easy, fixed my zip for free.', 'positive', 'Ridge 28L'],
  ['Saw Fernway at a trail race in Chamonix.', 'positive'],
  ['Waiting 9 days for an exchange, not great.', 'negative'],
  ['Is the fleece warm enough for -5°C?', 'neutral', 'Ember Fleece'],
  ['The hose test reel is fun.', 'positive', 'Storm Jacket'],
  ['Fernway or Peakline for a first hiking bag?', 'neutral', 'Ridge 28L'],
  ['Best gift I got last year was a Summit Bottle.', 'positive', 'Summit Bottle'],
  ['Strap padding is thin for heavy loads.', 'negative', 'Ridge 28L'],
]
const NETS = ['Instagram', 'TikTok', 'X', 'Facebook', 'Reddit']
const NAMES = ['@lea.m', '@paul_outdoor', '@emma.trail', '@yanis.hike', '@chloe.rando', '@romain.alps', '@ana.lisboa', '@kevin_fr', '@sofia.runs', '@nico.peaks', '@ella.bv', '@jules.gr', '@marie.ct', '@victor.ski', '@lina.trek', '@hugo_m', '@zoe.vertical', '@arthur.camp', '@manon.k', '@louis.trail', '@eva.mont', '@gab_alps', '@ines.rando', '@sam.lyon', '@noah.peak']

/** The search that caught a seeded mention, by its number. */
const SEARCH_OF: Record<number, string> = { 1: 's2', 2: 's5', 4: 's9', 5: 's2', 7: 's3', 9: 's11', 10: 's2', 11: 's4', 12: 's4', 16: 's3', 18: 's12', 19: 's10', 20: 's9', 21: 's4', 25: 's3' }

export const MENTIONS: Mention[] = [
  ...M.map(([author, network, text, sentiment, reach, product, risk], i) => ({ id: `m${i + 1}`, author, network, text, sentiment, reach, product, risk, search: SEARCH_OF[i + 1], at: T(8, 0) - (i * 47 + 12) * MIN })),
  ...NAMES.map((author, i) => {
    const [text, sentiment, product] = FILLER[i % FILLER.length]
    return { id: `m${M.length + i + 1}`, author, network: NETS[i % NETS.length], text, sentiment, product, reach: 200 + ((i * 397) % 2400), at: T(8, 0) - (i * 83 + 30) * MIN }
  }),
]

export type Trend = { id: string; name: string; networks: string; growth: string; fit: 'High' | 'Medium' | 'Low'; fitWhy: string; examples: string[] }

export const TRENDS: Trend[] = [
  { id: 't1', name: 'Packing my bag videos', networks: 'TikTok, Reels', growth: '4× this week', fit: 'High', fitWhy: 'The Ridge is the hero product, and you have the footage.', examples: ['@trailkind · 890k views', '@peakline “what’s in my bag” · 3.1M across the series'] },
  { id: 't2', name: 'Gorpcore in city outfits', networks: 'TikTok', growth: '+180% in 14 days', fit: 'Medium', fitWhy: 'Works for the Storm Jacket and Ember Fleece, less for bags.', examples: ['@jeanne.paris · 15k views', '#gorpcore · 2.4B views'] },
  { id: 't3', name: 'Repair over replace', networks: 'LinkedIn, Instagram', growth: '+60% this month', fit: 'High', fitWhy: 'Matches your Repair & care pillar and your 1,200 repairs.', examples: ['Norrø lifetime repairs · 4,200 reactions', 'Green Gear newsletter feature'] },
  { id: 't4', name: 'Slow hiking challenges', networks: 'Instagram', growth: '+45% this week', fit: 'Low', fitWhy: 'Off-brand tone: you’re about going outside more, not slower.', examples: ['#slowhiking · 180k posts'] },
  { id: 't5', name: '“Dawn patrol” before-work hikes', networks: 'TikTok, Instagram', growth: '+70% in 3 weeks', fit: 'High', fitWhy: 'Fits Trail Week exactly: hike before work.', examples: ['@sarah.hikes · #FernwayTrailWeek', '#dawnpatrol · 640k posts'] },
  { id: 't6', name: 'Rating gear 1 to 10', networks: 'TikTok', growth: '+90% this month', fit: 'Medium', fitWhy: 'Fun, but invites comparisons with Peakline’s cheaper bags.', examples: ['@trailkind duet · 560k views'] },
  { id: 't7', name: 'Buy-it-for-life lists', networks: 'Reddit, YouTube', growth: '+35% this month', fit: 'High', fitWhy: 'Your Summit Bottle already appears in r/BuyItForLife threads.', examples: ['r/BuyItForLife · 21k upvotes'] },
  { id: 't8', name: 'AI-generated trail maps', networks: 'X, Instagram', growth: '+120% this week', fit: 'Low', fitWhy: 'Nothing to do with your products, and your audience distrusts AI content.', examples: ['#aitrails · 40k posts'] },
]

/** A search created during the session fills up from `startedAt` (see searchVolume). */
export type Search = { id: string; name: string; keywords: string; exclude: string; volume: number; paused?: boolean; startedAt?: number }

export const SEARCHES: Search[] = [
  { id: 's1', name: 'Brand', keywords: 'Fernway, @fernway, fernway.co', exclude: 'fernway road, fernway farm', volume: 1840 },
  { id: 's2', name: 'Ridge 28L', keywords: 'Ridge 28L, Fernway Ridge, Ridge bag', exclude: '', volume: 420 },
  { id: 's3', name: 'Storm Jacket', keywords: 'Storm Jacket Fernway, Fernway jacket', exclude: 'storm warning', volume: 310 },
  { id: 's4', name: 'Summit Bottle', keywords: 'Summit Bottle, Fernway bottle', exclude: '', volume: 260 },
  { id: 's5', name: 'Peakline', keywords: 'Peakline, @peakline, Aero 30', exclude: '', volume: 5200 },
  { id: 's6', name: 'Norrø', keywords: 'Norrø, Norro, @norro_official', exclude: '', volume: 2100 },
  { id: 's7', name: 'Trailkind', keywords: 'Trailkind, @trailkind, Drift 26', exclude: '', volume: 3900 },
  { id: 's8', name: 'Basecamp Co.', keywords: 'Basecamp Co, @basecampco, Hydra bottle', exclude: 'base camp everest', volume: 3100 },
  { id: 's9', name: 'PFAS rainwear', keywords: 'PFAS rainwear, PFC-free jacket, DWR', exclude: '', volume: 880 },
  { id: 's10', name: 'GR20', keywords: 'GR20, #gr20', exclude: '', volume: 1500 },
  { id: 's11', name: 'Trail Week', keywords: '#FernwayTrailWeek, Trail Week Fernway', exclude: '', volume: 640 },
  { id: 's12', name: 'Gear repair', keywords: 'bag repair, repair outdoor gear, réparation sac', exclude: 'phone repair', volume: 970, paused: true },
]

/** What Echo knows about the creators in the feed beyond their mentions. Followers come from the mention's reach. */
export type CreatorInfo = { name: string; network: Network; also: { competitor: CompetitorId; n: number }[]; history: string[]; signed?: CompetitorId }
export const CREATOR_INFO: Record<string, CreatorInfo> = {
  '@camille.outdoors': { name: 'Camille Roux', network: 'instagram', also: [], history: ['3 unpaid stories with the Ridge this week, 2.4k replies', 'Has tagged Fernway 11 times since June'] },
  '@theo.wild': { name: 'Théo Wild', network: 'instagram', also: [{ competitor: 'peakline', n: 6 }], history: ['Signed a 6-month series with Peakline in September', 'Asked Fernway for a collab last month, no answer'], signed: 'peakline' },
  '@jeanne.paris': { name: 'Jeanne Martin', network: 'tiktok', also: [{ competitor: 'trailkind', n: 1 }], history: ['Weekly gorpcore fit checks, about 15k views each', 'Wore the Storm Jacket in 2 of her last 5 videos'] },
  '@julien_trail': { name: 'Julien Favre', network: 'tiktok', also: [{ competitor: 'trailkind', n: 2 }], history: ['Sunrise hikes around Chamonix every weekend'] },
  '@nadia.runs': { name: 'Nadia Benali', network: 'tiktok', also: [], history: ['Daily gym-bag routine, the Summit Bottle in every one'] },
}

/** Competitors per network, last 30 days: followers, posts a week, engagement rate. Totals match COMPETITORS. */
export type NetStat = { followers: number; perWeek: number; er: number }
export const COMP_NETWORKS: Record<CompetitorId, Partial<Record<Network, NetStat>>> = {
  peakline: { instagram: { followers: 230000, perWeek: 8, er: 1.6 }, tiktok: { followers: 95000, perWeek: 9, er: 3.2 }, facebook: { followers: 70000, perWeek: 5, er: 0.7 }, youtube: { followers: 15000, perWeek: 2, er: 2.9 } },
  norro: { instagram: { followers: 110000, perWeek: 4, er: 3.1 }, linkedin: { followers: 48000, perWeek: 3, er: 4.6 }, youtube: { followers: 27000, perWeek: 2, er: 2.4 } },
  trailkind: { tiktok: { followers: 180000, perWeek: 21, er: 6.8 }, instagram: { followers: 70000, perWeek: 8, er: 4.1 }, x: { followers: 10000, perWeek: 2, er: 0.8 } },
  basecamp: { facebook: { followers: 60000, perWeek: 7, er: 0.6 }, instagram: { followers: 30000, perWeek: 4, er: 1.2 }, x: { followers: 5000, perWeek: 1, er: 0.3 } },
}
