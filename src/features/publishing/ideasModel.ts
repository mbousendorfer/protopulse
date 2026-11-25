// Atlas's ideas: pure functions, no state. The reducer in slice.ts calls them; ideasModel.test.ts covers them.
import type { Autonomy, Network, PlaybookRule } from '../../app/types'
import { DAY, MIN, T, hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { BEST_SLOT, CADENCE, type Pillar, type Post } from '../../data/publishing'
import { PILLAR_PERF } from '../../data/insights'
import { BANNED, FACTS, PILLARS as PILLAR_TARGETS } from '../../data/playbook'
import { GAP_COPY, IDEA_SEEDS, LOAD_SEEDS, type Idea, type IdeaDraft, type IdeaOrigin, type IdeaSeed, type IdeaVersion } from '../../data/ideas'
import { EMOJI } from './checks'

export const MAX_OPEN = 8
export const OPEN_STATUSES = ['new', 'ready'] as const
export const isOpen = (i: Idea) => i.status === 'new' || i.status === 'ready'
/** Monday 1 December: where the next week's plan and a series start. */
const NEXT_MONDAY = T(0, 0, 6)
const DAY0 = T(0, 0, 0)
const startOfDay = (t: number) => new Date(new Date(t).setHours(0, 0, 0, 0)).getTime()
const offsetOf = (dayStart: number) => Math.round((dayStart - DAY0) / DAY)

/* ---------- Small text helpers (the Composer's copilot uses the first two) ---------- */

export const shorten = (t: string) => { const first = t.split(/(?<=[.!?])\s/)[0]; return first.length > 100 ? first.slice(0, 97).replace(/\s\S*$/, '') + '…' : first }
export const forLinkedIn = (t: string) => `${t.replace(EMOJI, '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim()}\n\nAt Fernway we build gear to last, and we repair what breaks. What would you add?`
const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean)
/** Closes a sentence that has no final punctuation ("Photo: @camille.outdoors"), so the next one doesn't run into it. */
const stop = (t: string) => (/[.!?…:]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`)
/** Text without its trailing emojis, and those emojis. */
const tail = (t: string) => { const m = t.match(/(\s*(?:\p{Extended_Pictographic}️?\s*)+)$/u); return m ? { body: t.slice(0, -m[1].length), end: ' ' + m[1].trim() } : { body: t, end: '' } }
const COMPETITORS = /\b(peakline|norrø|norro|trailkind|basecamp)\b/i
export const namesCompetitor = (text: string) => COMPETITORS.test(text)

/* ---------- Calendar gaps (was recommend() in Page.tsx) ---------- */

/** The calendar's week starts on Monday 24 November (demo day −1), so gaps match what the calendar shows. */
const WEEK0 = T(0, 0, -1)
const mondayOf = (t: number) => WEEK0 + Math.floor((startOfDay(t) - WEEK0) / (7 * DAY)) * 7 * DAY
/** The pillar furthest below Sage's target share. */
export function behindPillar(): { pillar: Pillar; share: number; target: number } {
  return PILLAR_PERF.map(p => ({ pillar: p.pillar as Pillar, share: p.share, target: PILLAR_TARGETS.find(x => x.name === p.pillar)?.share ?? 0 }))
    .sort((a, b) => (b.target - b.share) - (a.target - a.share))[0]
}
const PILLAR_NETWORK: Record<Pillar, Network[]> = { Community: ['facebook', 'instagram'], 'Repair & care': ['linkedin', 'instagram'], 'Trail stories': ['tiktok', 'instagram'], 'Gear that lasts': ['instagram', 'tiktok'] }

/** For a future day with fewer than 2 posts: the network furthest below the weekly cadence, else one that serves the pillar behind target. */
export function recommendNetwork(posts: Post[], day: number, now: number): Network | null {
  const inDay = posts.filter(p => p.at >= day && p.at < day + DAY)
  if (day < startOfDay(now) || inDay.length >= 2) return null
  const start = mondayOf(day)
  const week = posts.filter(p => p.at >= start && p.at < start + 7 * DAY && p.status !== 'draft')
  const taken = new Set(inDay.map(p => p.network))
  const gaps = (Object.keys(CADENCE) as Network[]).map(n => ({ n, gap: (CADENCE[n] ?? 0) - week.filter(p => p.network === n).length })).filter(g => g.gap > 0).sort((a, b) => b.gap - a.gap)
  return gaps.find(g => !taken.has(g.n))?.n ?? PILLAR_NETWORK[behindPillar().pillar].find(n => !taken.has(n)) ?? null
}

/** The next days that need a post, from tomorrow (or today before 16:00). */
export function gapDays(posts: Post[], now: number, horizon = 7): { day: number; network: Network }[] {
  const first = startOfDay(now) + (new Date(now).getHours() >= 16 ? DAY : 0)
  return Array.from({ length: horizon }, (_, i) => first + i * DAY).flatMap(day => { const n = recommendNetwork(posts, day, now); return n ? [{ day, network: n }] : [] })
}

/** An idea for an empty day, with the calendar as its source. Null when every post Atlas has for that network is already proposed. */
export function gapSeed(gap: { day: number; network: Network }, posts: Post[], ideas: Idea[] = []): IdeaSeed | null {
  const taken = new Set(ideas.filter(i => isOpen(i) || i.status === 'scheduled').flatMap(i => Object.values(i.copy)))
  const copy = (GAP_COPY[gap.network] ?? []).find(c => !taken.has(c.text))
  if (!copy) return null
  const count = posts.filter(p => p.at >= gap.day && p.at < gap.day + DAY).length
  const start = mondayOf(gap.day)
  const week = posts.filter(p => p.at >= start && p.at < start + 7 * DAY && p.status !== 'draft' && p.network === gap.network).length
  const target = CADENCE[gap.network]
  const label = new Date(gap.day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
  const long = new Date(gap.day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric' })
  const name = NETWORK_LABEL[gap.network]
  const behind = behindPillar()
  const slot = BEST_SLOT[gap.network]
  const sources: IdeaSeed['sources'] = [
    { type: 'calendar', agent: 'atlas', label, proof: `${count} post${count === 1 ? '' : 's'} planned, 2 a day is your rhythm`, link: '/publishing/calendar', value: String(count), measure: `post${count === 1 ? '' : 's'} planned on ${long}, where 2 a day is your rhythm` },
    ...(target && week < target ? [{ type: 'calendar' as const, agent: 'atlas' as const, label: `${name} this week`, proof: `${week} of ${target} posts`, link: '/strategy/pillars', value: `${week} of ${target}`, measure: `${name} posts this week against Sage’s weekly target` }] : []),
    ...(copy.pillar === behind.pillar ? [{ type: 'analytics' as const, agent: 'iris' as const, label: `${behind.pillar} pillar`, proof: `${behind.share}% of posts vs ${behind.target}% target`, link: '/strategy/pillars', value: `${behind.share}%`, measure: `of your posts are ${behind.pillar}, target ${behind.target}%` }] : []),
    ...(slot ? [{ type: 'analytics' as const, agent: 'iris' as const, label: `Best slot on ${name}`, proof: slot.reason, link: '/insights/explore', value: slot.time, measure: slot.reason }] : []),
  ]
  const behindWeek = target !== undefined && week < target
  return {
    key: `gap-${offsetOf(gap.day)}-${gap.network}`, kind: 'post', topic: copy.title.split(' ').slice(0, 3).join(' '),
    title: copy.title,
    why: `${long} has ${count === 0 ? 'nothing planned' : `only ${count} post`}${behindWeek ? `, and ${name} is at ${week} of its ${target} posts this week` : copy.pillar === behind.pillar ? `, and ${behind.pillar} is your pillar furthest behind target` : ''}. ${copy.why}`,
    sources, confidence: 84, pillar: copy.pillar, networks: [gap.network], action: 'atlas-fill', copy: { [gap.network]: copy.text }, media: copy.media,
    format: copy.format, day: offsetOf(gap.day), expires: { at: gap.day + DAY - MIN, reason: `${label} has passed` },
  }
}

/* ---------- Learning: same redirect or dismissal twice → a rule ---------- */

export const LEARNED_ORIGIN = 'Learned from your redirects · Atlas'
export const LEARN_RULES: Record<string, string> = {
  'angle:shorter': 'Keep captions to two sentences or fewer',
  'angle:playful': 'Open captions with something light',
  'angle:customer': 'Lead with the customer when they gave permission',
  'angle:repair': 'Bring in care or repair when the post is about a product',
  'angle:carousel': 'Make Instagram ideas carousels by default',
  'angle:linkedin': 'Add a LinkedIn version to every idea',
  'dismiss:Off-brand': 'Skip trends with a medium or low brand fit',
  'dismiss:Not timely': 'Only suggest trends with 3 days or more left',
  'dismiss:Already covered': 'Skip ideas on a topic already in the calendar this week',
  'dismiss:Wrong pillar': 'Only suggest ideas for the pillar furthest below target',
}
/** Learned rules still on, as their keys. */
export const learnedKeys = (rules: PlaybookRule[]) => rules.filter(r => !r.paused).flatMap(r => Object.entries(LEARN_RULES).filter(([, t]) => t === r.text).map(([k]) => k))

/** Counts one redirect or dismissal. The second time, Atlas proposes the rule (unless you said no, or it exists). */
export function learn(learned: Record<string, number>, key: string, rules: PlaybookRule[]): { learned: Record<string, number>; proposal?: { key: string; text: string } } {
  const next = { ...learned, [key]: (learned[key] ?? 0) + 1 }
  const text = LEARN_RULES[key]
  if (!text || next[key] < 2 || learned[`no:${key}`] || rules.some(r => r.text === text)) return { learned: next }
  return { learned: next, proposal: { key, text } }
}

/** Seeds a dismiss rule says to hold back, with the rule. */
export function heldByRules(seeds: IdeaSeed[], rules: PlaybookRule[], posts: Post[], now: number): { keep: IdeaSeed[]; held: { seed: IdeaSeed; rule: string }[] } {
  const keys = new Set(learnedKeys(rules))
  const week = posts.filter(p => p.at >= mondayOf(now) && p.at < mondayOf(now) + 7 * DAY)
  const behind = behindPillar().pillar
  const keep: IdeaSeed[] = [], held: { seed: IdeaSeed; rule: string }[] = []
  for (const seed of seeds) {
    const why = keys.has('dismiss:Off-brand') && seed.fit && seed.fit !== 'High' ? 'dismiss:Off-brand'
      : keys.has('dismiss:Not timely') && seed.expires && seed.expires.at - now < 3 * DAY ? 'dismiss:Not timely'
      : keys.has('dismiss:Already covered') && week.some(p => p.text.toLowerCase().includes(seed.topic.toLowerCase())) ? 'dismiss:Already covered'
      : keys.has('dismiss:Wrong pillar') && seed.pillar !== behind ? 'dismiss:Wrong pillar' : null
    if (why) held.push({ seed, rule: LEARN_RULES[why] }); else keep.push(seed)
  }
  return { keep, held }
}

/* ---------- Making and drafting ideas ---------- */

let seq = 0
const newId = () => `idea-${Date.now().toString(36)}${(seq++).toString(36)}`

export function makeIdea(seed: IdeaSeed, origin: IdeaOrigin, at: number, id = newId()): Idea {
  return { ...structuredClone(seed), id, origin, at, status: 'new', versions: [] }
}

/** Atlas drafts on its own only for its trend, recycle and fill actions, and only from Draft up. Never when a competitor is named. */
export const draftsAlone = (idea: Idea, level: Autonomy | undefined) =>
  ['atlas-trend', 'atlas-recycle', 'atlas-fill'].includes(idea.action) && !!level && level !== 'suggest' && !namesCompetitor(Object.values(idea.copy).join(' '))

/** Best slot on the idea's day (or the next free one): never in the past, never a 4th post on that network that day. */
export function pickSlot(network: Network, day: number, posts: Post[], now: number): number {
  const [h, m] = (BEST_SLOT[network]?.time ?? '18:00').split(':').map(Number)
  for (let d = day; d < day + 14; d++) {
    const at = T(h, m, d)
    const same = posts.filter(p => p.network === network && startOfDay(p.at) === startOfDay(at)).length
    if (at > now + 30 * MIN && same < 3) return at
  }
  return T(h, m, day + 14)
}

type Ctx = { now: number; posts: Post[]; rules?: PlaybookRule[] }

const baseDraft = (idea: Idea, network: Network, ctx: Ctx): IdeaDraft => {
  const first = idea.copy[network] ?? Object.values(idea.copy)[0] ?? idea.title
  const text = idea.copy[network] ?? (network === 'linkedin' ? forLinkedIn(first) : first)
  return { network, text, media: idea.media, brief: idea.media ? undefined : idea.brief, at: pickSlot(network, idea.day, ctx.posts, ctx.now), format: network === 'instagram' ? idea.format : undefined }
}

/** Atlas writes the idea: one draft per network, then applies the rules you taught it. */
export function draftIdea(idea: Idea, ctx: Ctx): Idea {
  const drafted: Idea = { ...idea, drafts: idea.networks.map(n => baseDraft(idea, n, ctx)) }
  let out = withVersion(drafted, drafted.drafts!, { mode: 'draft', label: 'Drafted by Atlas', note: `Drafted from ${idea.sources[0]?.label ?? 'the signal'}.`, by: 'atlas' }, ctx.now)
  for (const key of learnedKeys(ctx.rules ?? []).filter(k => k.startsWith('angle:'))) {
    const r = applyAngle(out, key.slice(6) as Angle, ctx, 'atlas')
    if (r.changed) out = { ...r.idea, followsRule: LEARN_RULES[key], versions: [...r.idea.versions.slice(0, -1), { ...r.idea.versions.at(-1)!, label: 'Following your rule', note: `Following your rule “${LEARN_RULES[key]}”. ${r.note}` }] }
  }
  return { ...out, status: 'ready' }
}

export function withVersion(idea: Idea, drafts: IdeaDraft[], v: Omit<IdeaVersion, 'n' | 'at' | 'drafts'>, now: number): Idea {
  return { ...idea, drafts, versions: [...idea.versions, { ...v, n: idea.versions.length + 1, at: now, drafts: structuredClone(drafts) }] }
}

/* ---------- Redirect 1: one-click angles ---------- */

export type Angle = 'shorter' | 'playful' | 'customer' | 'repair' | 'carousel' | 'linkedin'
export const ANGLES: { key: Angle; label: string }[] = [
  { key: 'shorter', label: 'Shorter' }, { key: 'playful', label: 'More playful' }, { key: 'customer', label: 'Customer angle' },
  { key: 'repair', label: 'Repair angle' }, { key: 'carousel', label: 'As a carousel' }, { key: 'linkedin', label: 'For LinkedIn' },
]
const OPENER: Record<Pillar, string> = { 'Gear that lasts': 'Spoiler: it held.', 'Trail stories': 'Alarm at 5, zero regrets.', 'Repair & care': 'Plot twist: we fix it.', Community: 'You did this, not us.' }
const CTA = /^(swipe|save|tag)\b/i

function rewrite(idea: Idea, d: IdeaDraft, angle: Angle): { text: string; note: string } | null {
  const { body, end } = tail(d.text)
  const s = sentences(body)
  switch (angle) {
    case 'shorter': {
      if (s.length < 2) return null
      const keep = s.slice(0, Math.ceil(s.length / 2)).join(' ') + end
      return { text: keep, note: `Kept ${Math.ceil(s.length / 2)} of ${s.length} sentences: ${keep.length} characters instead of ${d.text.length}.` }
    }
    case 'playful': {
      if (d.text.startsWith(OPENER[idea.pillar])) return null
      const emoji = !end && d.network !== 'linkedin' && !(d.text.match(EMOJI) ?? []).length ? ' 🏔️' : ''
      return { text: `${OPENER[idea.pillar]} ${d.text}${emoji}`, note: `Lighter opening${emoji ? ', one emoji' : ''}, same facts.` }
    }
    case 'customer': {
      const c = idea.customer
      if (!c || d.text.startsWith('“')) return null
      const rest = s.filter(x => x !== c.quote).join(' ')
      return { text: `“${c.quote}” ${c.handle} said it, we just agree. ${rest}${end}`.replace(/\s+/g, ' ').trim(), note: `Led with ${c.handle}’s own words. She gave permission to use them.` }
    }
    case 'repair': {
      const all = d.text.toLowerCase()
      if (/repair|re-proof/.test(all)) return null
      const kept = CTA.test(s.at(-1) ?? '') ? s.slice(0, -1) : s
      const jacket = /jacket|fleece/.test(all)
      const add = jacket ? 'Re-proof it once a winter and it keeps doing that: the 3 steps are on the last slide.'
        : /ridge|bag|pack/.test(all) ? 'And if it ever tears, your first repair is free: 1,200 bags fixed in 2025.' : 'Built to last, and we repair what breaks.'
      const note = jacket ? 'Added the care tip from Sunday’s re-proofing post. I didn’t promise a free repair: the repair programme covers bags, not jackets.'
        : add.includes('1,200') ? 'Added the repair promise. 1,200 bags fixed comes from the Playbook facts.' : 'Added the repair line from the Playbook.'
      return { text: `${stop(kept.join(' '))} ${add}${end}`.trim(), note: CTA.test(s.at(-1) ?? '') ? `${note} I dropped “${s.at(-1)}”: one call to action per post.` : note }
    }
    case 'carousel': {
      if (d.format?.startsWith('Carousel') || !['instagram', 'linkedin', 'facebook'].includes(d.network)) return null
      return { text: /swipe/i.test(d.text) ? d.text : `${stop(body)} Swipe for all 5.${end}`, note: 'Turned it into a 5-slide carousel: the caption sets up the slides.' }
    }
    case 'linkedin':
      return null
  }
}

/** Atlas rewrites every draft in the angle; the result is a new version, with what changed. */
export function applyAngle(idea: Idea, angle: Angle, ctx: Ctx, by: 'you' | 'atlas' = 'you'): { idea: Idea; note: string; changed: boolean } {
  const label = ANGLES.find(a => a.key === angle)!.label
  const drafts = idea.drafts ?? []
  if (angle === 'linkedin') {
    if (drafts.some(d => d.network === 'linkedin')) return { idea, note: 'There’s already a LinkedIn version.', changed: false }
    const base = drafts[0]?.text ?? Object.values(idea.copy)[0] ?? idea.title
    const li: IdeaDraft = { network: 'linkedin', text: forLinkedIn(base), media: idea.media, brief: idea.media ? undefined : idea.brief, at: pickSlot('linkedin', idea.day, ctx.posts, ctx.now) }
    const note = 'Added a LinkedIn version: no emoji, no hashtags, one line of context, a question to close.'
    return { idea: withVersion({ ...idea, networks: [...idea.networks, 'linkedin'] }, [...drafts, li], { mode: 'angle', label, note, by }, ctx.now), note, changed: true }
  }
  if (angle === 'carousel' && !drafts.some(d => ['instagram', 'linkedin', 'facebook'].includes(d.network))) {
    const ig: IdeaDraft = { network: 'instagram', text: `${stop(tail(drafts[0]?.text ?? idea.title).body)} Swipe for all 5.`, media: idea.media, at: pickSlot('instagram', idea.day, ctx.posts, ctx.now), format: 'Carousel · 5 slides' }
    const note = 'Added an Instagram carousel, 5 slides, from the same story.'
    return { idea: withVersion({ ...idea, networks: [...idea.networks, 'instagram'] }, [...drafts, ig], { mode: 'angle', label, note, by }, ctx.now), note, changed: true }
  }
  if (angle === 'customer' && !idea.customer) {
    return { idea, note: 'I have no customer quote about this that I’m allowed to use. Ask Echo to find one, or pick another angle.', changed: false }
  }
  let note = ''
  const next = drafts.map(d => {
    const r = rewrite(idea, d, angle)
    if (!r) return d
    note ||= r.note
    return { ...d, text: r.text, format: angle === 'carousel' ? 'Carousel · 5 slides' : d.format }
  })
  if (!note) return { idea, note: `It’s already ${label.toLowerCase()}. Nothing to change.`, changed: false }
  return { idea: withVersion(idea, next, { mode: 'angle', label, note, by }, ctx.now), note, changed: true }
}

/* ---------- Redirect 2: free instruction ---------- */

const PRICES = FACTS.flatMap(f => { const m = f.text.match(/^(.+?): €(\d+)/); return m ? [{ name: m[1], price: +m[2] }] : [] })
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const KEYWORDS: [RegExp, Angle][] = [[/short|trim|tighter|concise/, 'shorter'], [/fun|playful|light|joke/, 'playful'], [/customer|testimonial/, 'customer'], [/repair|care|re-?proof/, 'repair'], [/carousel|slides/, 'carousel'], [/linkedin/, 'linkedin']]

/**
 * "Tell Atlas what to change". Applies what it knows how to do; says plainly what it won't or can't.
 * Your words are never pasted into a caption.
 */
export function applyInstruction(idea: Idea, input: string, ctx: Ctx): { idea: Idea; reply: string; changed: boolean } {
  const t = input.toLowerCase()
  const no = (reply: string) => ({ idea, reply: `${reply} Nothing changed in the draft.`, changed: false })
  if (/40\s?l|ridge 40|bigger bag|larger bag/.test(t)) return no('I can’t mention the Ridge 40L: it isn’t announced.')
  const rival = t.match(COMPETITORS)
  if (rival) return no(`I won’t name ${rival[1][0].toUpperCase() + rival[1].slice(1)} in a post. Naming a competitor is always your call: write it yourself in the editor if you want to.`)
  const banned = BANNED.map(w => w.replace(/\s*\(.*\)$/, '')).find(w => t.includes(w))
  if (banned) return no(`“${banned}” is on the Playbook’s banned list.`)

  let drafts = structuredClone(idea.drafts ?? [])
  let networks = idea.networks
  const did: string[] = []
  const text = drafts.map(d => d.text).join(' ').toLowerCase()
  if (/code|promo|discount|% off/.test(t)) {
    if (!/trail week|#fernwaytrailweek/.test(text) && idea.pillar !== 'Trail stories') return no('I can’t invent a promo code. The only live one is TRAIL10, for bags during Trail Week, and this post isn’t about Trail Week.')
    drafts = drafts.map(d => ({ ...d, text: `${stop(tail(d.text).body)} 10% off bags with TRAIL10, 1 to 7 December.${tail(d.text).end}` }))
    did.push('added the Trail Week code, TRAIL10')
  }
  if (/price|€|cost|how much/.test(t)) {
    const p = PRICES.find(x => text.includes(x.name.toLowerCase()))
    if (!p) return no('I can’t add a price: this post isn’t about one product.')
    drafts = drafts.map(d => ({ ...d, text: `${stop(tail(d.text).body)} The ${p.name} is ${d.network === 'linkedin' ? `${p.price} €` : `€${p.price}`}.${tail(d.text).end}` }))
    did.push(`added the ${p.name} price from the catalog`)
  }
  if (/pfc|pfas/.test(t)) {
    drafts = drafts.map(d => ({ ...d, text: `${stop(tail(d.text).body)} PFAS-free since 2023.${tail(d.text).end}` }))
    did.push('added “PFAS-free since 2023”, from the Playbook facts')
  }
  const day = WEEKDAYS.findIndex(w => t.includes(w))
  if (day >= 0 || /tomorrow/.test(t)) {
    const base = startOfDay(ctx.now)
    const target = /tomorrow/.test(t) ? base + DAY : Array.from({ length: 7 }, (_, i) => base + (i + 1) * DAY).find(x => new Date(x).getDay() === day)!
    drafts = drafts.map(d => ({ ...d, at: pickSlot(d.network, offsetOf(target), ctx.posts, ctx.now) }))
    did.push(`moved it to ${new Date(drafts[0]?.at ?? target).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric' })}, ${hhmm(drafts[0]?.at ?? target)}`)
  }
  let angleNote = ''
  const angle = KEYWORDS.find(([re]) => re.test(t))?.[1]
  if (angle) {
    const r = applyAngle({ ...idea, drafts, networks }, angle, ctx)
    if (r.changed) { drafts = r.idea.drafts!; networks = r.idea.networks; angleNote = r.note; did.push(ANGLES.find(a => a.key === angle)!.label.toLowerCase()) }
    else if (!did.length) return { idea, reply: r.note, changed: false }
  }
  if (!did.length) return { idea, reply: 'I’m not sure how to do that. I can make it shorter, more playful, from a customer’s angle, about repair, a carousel or a LinkedIn version, move it to another day, or add a price, the Trail Week code or “PFAS-free”. Nothing changed.', changed: false }
  const reply = `Understood: ${did.join(', ')}.${angleNote ? ` ${angleNote}` : ''}`
  // One instruction = one version, labelled with your words. Your words never go into the caption.
  return { idea: withVersion({ ...idea, networks }, drafts, { mode: 'free', label: `“${input.trim()}”`, note: reply, by: 'you' }, ctx.now), reply, changed: true }
}

/* ---------- Redirect 3: variants side by side ---------- */

export type Variant = { key: 'A' | 'B' | 'C'; label: string; hook: string; body: string }
const GENERIC_HOOKS: Record<Pillar, { question: string; number: string; story: string }> = {
  'Gear that lasts': { question: 'Would yours have made it?', number: '1 test. 0 excuses.', story: 'We almost didn’t post this one.' },
  'Trail stories': { question: 'When did you last see the sun come up from a trail?', number: '5am. 1 trail. 0 regrets.', story: 'The car park was still dark when we got there.' },
  'Repair & care': { question: 'Fix it or bin it?', number: '1,200 bags. 0 thrown away.', story: 'It came back to the workshop in two pieces.' },
  Community: { question: 'What’s in your bag right now?', number: '1 bag. 3 trips. Still going.', story: 'She sent us the photo on a Sunday night.' },
}

/** Three versions of one draft: a question, a number, a story. Each has a hook and a body you can mix. */
export function variantsOf(idea: Idea, network: Network): Variant[] {
  const d = idea.drafts?.find(x => x.network === network) ?? idea.drafts?.[0]
  const text = d?.text ?? Object.values(idea.copy)[0] ?? idea.title
  const h = idea.hooks ?? GENERIC_HOOKS[idea.pillar]
  const s = sentences(tail(text).body)
  const end = tail(text).end
  const rest = (s.length > 1 ? s.slice(1) : s).join(' ')
  return [
    { key: 'A', label: 'Question hook', hook: h.question, body: `${s.join(' ')}${end}` },
    { key: 'B', label: 'Number first', hook: h.number, body: `${rest}${end}` },
    { key: 'C', label: 'Story', hook: h.story, body: `${s.slice(Math.floor(s.length / 2)).join(' ')}${end}`.trim() },
  ]
}
export const variantText = (v: Variant) => `${v.hook} ${v.body}`.trim()
/** The hook of one variant on the body of another. */
export const mixVariants = (hook: Variant, body: Variant) => `${hook.hook} ${body.body}`.trim()

/** Keep a variant (or a mix, or your own edit) for one network: a new version. */
export function setDraftText(idea: Idea, network: Network, text: string, v: { mode: 'variant' | 'edit'; label: string }, now: number): Idea {
  const drafts = (idea.drafts ?? []).map(d => (d.network === network ? { ...d, text } : d))
  const note = v.mode === 'edit' ? 'Your edit.' : `You kept ${v.label}.`
  return withVersion(idea, drafts, { ...v, note, by: 'you' }, now)
}

/* ---------- Diff ---------- */

export type DiffPart = { op: 'same' | 'add' | 'del'; text: string }
/** Word diff, for the highlighted "what changed". */
export function diffWords(a: string, b: string): DiffPart[] {
  const x = a.split(/\s+/).filter(Boolean), y = b.split(/\s+/).filter(Boolean)
  const L = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0))
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out: DiffPart[] = []
  const push = (op: DiffPart['op'], w: string) => { const last = out.at(-1); if (last?.op === op) last.text += ` ${w}`; else out.push({ op, text: w }) }
  let i = 0, j = 0
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { push('same', x[i]); i++; j++ }
    else if (L[i + 1][j] >= L[i][j + 1]) push('del', x[i++])
    else push('add', y[j++])
  }
  while (i < x.length) push('del', x[i++])
  while (j < y.length) push('add', y[j++])
  return out
}

/* ---------- Lifecycle ---------- */

/** Open ideas past their window leave, with the reason Atlas gives. */
export function expireIdeas(ideas: Idea[], now: number): { ideas: Idea[]; expired: Idea[] } {
  const expired = ideas.filter(i => isOpen(i) && !!i.expires && i.expires.at <= now)
  if (!expired.length) return { ideas, expired }
  return { ideas: ideas.map(i => (expired.includes(i) ? { ...i, status: 'expired' } : i)), expired }
}

/** Snoozed ideas come back when their time is up, as they were. */
export function wakeIdeas(ideas: Idea[], now: number): Idea[] {
  return ideas.map(i => (i.status === 'snoozed' && (i.snoozedUntil ?? Infinity) <= now ? { ...i, status: i.drafts ? 'ready' : 'new', snoozedUntil: undefined } : i))
}

/**
 * Never more than 8 open. Newcomers fill the free places, strongest first. When full, a newcomer that is urgent or more
 * confident than the weakest undrafted idea takes its place (Atlas retires that one); the rest are held back.
 */
export function capIdeas(ideas: Idea[], incoming: Idea[]): { accepted: Idea[]; held: Idea[]; retired: Idea[] } {
  const open = ideas.filter(isOpen)
  let free = Math.max(0, MAX_OPEN - open.length)
  // A series and an idea also on the Desk are never retired to make room.
  const weak = open.filter(i => i.status === 'new' && i.kind === 'post' && !i.handoff).sort((a, b) => a.confidence - b.confidence)
  const accepted: Idea[] = [], held: Idea[] = [], retired: Idea[] = []
  for (const inc of [...incoming].sort((a, b) => Number(b.origin === 'urgent') - Number(a.origin === 'urgent') || b.confidence - a.confidence)) {
    if (free > 0) { accepted.push(inc); free--; continue }
    if (weak[0] && (inc.origin === 'urgent' || inc.confidence > weak[0].confidence)) { retired.push(weak.shift()!); accepted.push(inc) }
    else held.push(inc)
  }
  return { accepted, held, retired }
}

/** Atlas's one line at the top of Ideas: only what the counts beside it don't already say. */
export function summarize(ideas: Idea[]): string {
  const open = ideas.filter(isOpen)
  if (!open.length) return 'No ideas waiting. Atlas brings the next one as soon as a signal is worth it.'
  const behind = behindPillar().pillar
  const inPillar = open.filter(i => i.pillar === behind).length
  const soon = open.filter(i => i.expires && i.expires.at - Math.max(...open.map(x => x.at)) < DAY).length
  if (inPillar) return `${inPillar} of ${open.length} ideas are for ${behind}, the pillar furthest behind target.`
  return soon ? `${soon} idea${soon > 1 ? 's' : ''} won’t keep past today.` : `${open.length} idea${open.length > 1 ? 's' : ''} waiting.`
}

/** "Good until Thu 27", "Good until 21:00", or no deadline. */
export function freshness(idea: Idea, now: number): { label: string; soon: boolean } {
  if (!idea.expires) return { label: 'No deadline', soon: false }
  const at = idea.expires.at
  const today = startOfDay(at) === startOfDay(now)
  return { label: `Good until ${today ? hhmm(at) : new Date(at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}`, soon: at - now < 2 * DAY }
}

/** Accepted as Atlas wrote it, or after you redirected or edited it. */
export const outcomeOf = (idea: Idea) => (idea.versions.some(v => v.by === 'you') ? 'modified' : 'as-is')

/** The posts an idea becomes when scheduled. A series becomes its steps, from next Monday. */
export function ideaPosts(idea: Idea, makeId: () => string): Post[] {
  const note = `From Ideas: ${idea.title}`
  if (idea.kind === 'series' && idea.steps) {
    return idea.steps.map(st => {
      const [h, m] = (BEST_SLOT[st.network]?.time ?? '18:00').split(':').map(Number)
      return { id: makeId(), network: st.network, at: NEXT_MONDAY + st.day * DAY + (h * 60 + m) * MIN, text: st.text, media: idea.media, status: 'scheduled', author: 'atlas', pillar: idea.pillar, campaign: idea.title.split(':')[0], note }
    })
  }
  return (idea.drafts ?? []).map(d => ({ id: makeId(), network: d.network, at: d.at, text: d.text, media: d.media, status: d.media || !d.brief ? 'scheduled' : 'needs', author: 'atlas', pillar: idea.pillar, note: d.brief && !d.media ? `Waiting for the visual: ${d.brief}` : note }))
}

/** The ideas on screen when the demo loads: from the data, plus the first calendar gap. */
export function spotIdeas(now: number, posts: Post[], levels: Partial<Record<string, Autonomy>>, rules: PlaybookRule[] = []): Idea[] {
  const ARRIVED: Record<string, number> = { 'storm-snow': T(8, 2), 'dawn-patrol': T(7, 40), 'founder-repair': T(17, 20, -1), 'camille-ridge': T(7, 55), 'gr20-throwback': T(6, 50), 'series-ridge': T(7, 40) }
  const gap = gapDays(posts, now)[0]
  const gs = gap && gapSeed(gap, posts)
  const seeds = LOAD_SEEDS.map(k => IDEA_SEEDS[k])
  const list = seeds.map(seed => makeIdea(seed, 'continuous', ARRIVED[seed.key] ?? now, `idea-${seed.key}`))
  if (gs) list.splice(1, 0, makeIdea(gs, 'gap', T(8, 5), `idea-${gs.key}`))
  return list.map(i => (draftsAlone(i, levels[i.action]) ? draftIdea(i, { now, posts, rules }) : i))
}
