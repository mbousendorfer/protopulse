import { expect, test } from 'vitest'
import { DAY, T } from '../../app/time'
import { AGENTS } from '../../data/agents'
import { IDEA_SEEDS, type Idea } from '../../data/ideas'
import { POSTS } from '../../data/publishing'
import { RULES } from '../../data/playbook'
import type { PlaybookRule } from '../../app/types'
import {
  LEARNED_ORIGIN, LEARN_RULES, MAX_OPEN, applyAngle, applyInstruction, capIdeas, diffWords, draftIdea, expireIdeas, gapDays, heldByRules,
  ideaPosts, isOpen, learn, makeIdea, mixVariants, namesCompetitor, pickSlot, spotIdeas, summarize, variantsOf, wakeIdeas,
} from './ideasModel'
import { checkPost } from './checks'

const NOW = T(8, 12)
const LEVELS = Object.fromEntries(AGENTS.find(a => a.id === 'atlas')!.actions.map(x => [x.id, x.autonomy]))
const ctx = { now: NOW, posts: POSTS, rules: RULES }
const ready = (key: string) => draftIdea(makeIdea(IDEA_SEEDS[key], 'continuous', NOW, `idea-${key}`), ctx)
const rule = (text: string): PlaybookRule => ({ id: 'r-x', kind: 'do', text, agents: ['atlas'], origin: LEARNED_ORIGIN, uses: 0, addedAt: NOW })
const text = (i: Idea) => i.drafts!.map(d => d.text).join(' ')

test('demo load: at least 6 ideas from the four sources, 2 ready, 1 series, 1 expiring soon, each with a sourced number', () => {
  const ideas = spotIdeas(NOW, POSTS, LEVELS)
  expect(ideas.length).toBeGreaterThanOrEqual(6)
  expect(ideas.length).toBeLessThanOrEqual(MAX_OPEN)
  expect(new Set(ideas.flatMap(i => i.sources.map(s => s.type)))).toEqual(new Set(['analytics', 'listening', 'brand', 'calendar']))
  expect(ideas.filter(i => i.status === 'ready')).toHaveLength(2)
  expect(ideas.filter(i => i.kind === 'series')).toHaveLength(1)
  expect(ideas.some(i => i.expires && i.expires.at - NOW < DAY)).toBe(true)
  for (const i of ideas) for (const s of i.sources) { expect(s.proof).toMatch(/\d/); expect(s.link).toMatch(/^\//) }
  expect(summarize(ideas)).toBe('3 of 7 ideas are for Community, the pillar furthest behind target.')
})

test('trend ideas stay suggestions on Suggest; recycle and fill get drafted on Draft', () => {
  const ideas = spotIdeas(NOW, POSTS, LEVELS)
  expect(ideas.find(i => i.key === 'dawn-patrol')!.status).toBe('new')
  expect(ideas.find(i => i.key === 'storm-snow')!.status).toBe('ready')
  const onDraft = spotIdeas(NOW, POSTS, { ...LEVELS, 'atlas-trend': 'draft' })
  expect(onDraft.find(i => i.key === 'dawn-patrol')!.status).toBe('ready')
})

test('the calendar gap is Sunday 30 on Facebook: one post that day, cadence met, Community behind', () => {
  const [gap] = gapDays(POSTS, NOW)
  expect(gap).toEqual({ day: T(0, 0, 5), network: 'facebook' })
  const idea = spotIdeas(NOW, POSTS, LEVELS).find(i => i.origin === 'gap')!
  expect(idea.pillar).toBe('Community')
  expect(idea.drafts![0].at).toBe(T(19, 0, 5))
})

test('a draft has a slot in the future, max 3 posts per network per day, and media with rights or a visual brief', () => {
  const storm = ready('storm-snow')
  expect(storm.drafts![0]).toMatchObject({ network: 'instagram', media: 'snow', at: T(18, 30, 2) })
  const founder = ready('founder-repair')
  expect(founder.drafts![0].media).toBeUndefined()
  expect(founder.drafts![0].brief).toMatch(/no stock/)
  // Thursday already has 3 TikTok posts? Build one: the slot moves to the next day.
  const busy = [0, 1, 2].map(i => ({ ...POSTS[0], id: `b${i}`, network: 'tiktok' as const, at: T(10 + i, 0, 3) }))
  expect(pickSlot('tiktok', 3, busy, NOW)).toBe(T(18, 30, 4))
  expect(pickSlot('instagram', 0, [], T(18, 15))).toBe(T(18, 30, 1))
})

test('drafts pass the Playbook check: no banned word, one emoji, no competitor, no Ridge 40L', () => {
  for (const key of Object.keys(IDEA_SEEDS)) {
    const i = ready(key)
    for (const d of i.drafts ?? []) {
      const bad = checkPost({ text: d.text, network: d.network, media: d.media, brief: d.brief, words: ['cheap', 'guys', 'game-changer', 'unbeatable', 'hurry'], rules: RULES }).filter(c => !c.ok && !/visual/.test(c.label))
      expect(bad, `${key} on ${d.network}`).toEqual([])
      expect(namesCompetitor(d.text)).toBe(false)
      expect(d.text).not.toMatch(/40L/)
    }
  }
})

test('angles: each makes a version with a note; shorter keeps the emoji; repair on a jacket never promises a free repair', () => {
  const storm = ready('storm-snow')
  const short = applyAngle(storm, 'shorter', ctx)
  expect(short.changed).toBe(true)
  expect(short.idea.versions).toHaveLength(2)
  expect(text(short.idea).length).toBeLessThan(text(storm).length)
  expect(text(short.idea)).toMatch(/❄️$/)
  const repair = applyAngle(storm, 'repair', ctx)
  expect(text(repair.idea)).toMatch(/Re-proof/)
  expect(text(repair.idea)).not.toMatch(/Swipe for the test/)
  expect(repair.note).toMatch(/covers bags, not jackets/)
  const li = applyAngle(storm, 'linkedin', ctx)
  expect(li.idea.drafts!.find(d => d.network === 'linkedin')!.text).not.toMatch(/\p{Extended_Pictographic}/u)
  expect(applyAngle(li.idea, 'linkedin', ctx).changed).toBe(false)
  // No permission, no quote: Atlas says so instead of inventing one.
  const customer = applyAngle(storm, 'customer', ctx)
  expect(customer.changed).toBe(false)
  expect(customer.note).toMatch(/no customer quote/)
  expect(text(applyAngle(ready('camille-ridge'), 'customer', ctx).idea)).toMatch(/^“Third trip/)
  expect(applyAngle(ready('dawn-patrol'), 'carousel', ctx).idea.drafts!.find(d => d.network === 'instagram')!.format).toMatch(/Carousel/)
})

test('free instruction: applies what it can, refuses plainly, never pastes the note into the caption', () => {
  const storm = ready('storm-snow')
  const r = applyInstruction(storm, 'make it about repair and post it Friday', ctx)
  expect(r.changed).toBe(true)
  const friday = [1, 2, 3, 4, 5, 6, 7].map(d => T(18, 30, d)).find(t => new Date(t).getDay() === 5)!
  expect(r.reply).toMatch(new RegExp(`^Understood: moved it to Friday ${new Date(friday).getDate()}, 18:30, repair angle`))
  expect(r.idea.drafts![0].at).toBe(friday)
  expect(r.idea.versions.at(-1)!.mode).toBe('free')
  expect(text(r.idea)).not.toMatch(/make it about/)
  for (const [ask, says] of [['mention the new 40L', /Ridge 40L/], ['compare with Peakline', /won’t name Peakline/], ['say it is unbeatable', /banned list/], ['add a promo code', /can’t invent a promo code/], ['translate to Klingon', /not sure how/]] as const) {
    const x = applyInstruction(storm, ask, ctx)
    expect(x.changed, ask).toBe(false)
    expect(x.reply).toMatch(says)
    expect(x.idea).toBe(storm)
  }
  expect(text(applyInstruction(storm, 'add the price', ctx).idea)).toMatch(/Storm Jacket is €220/)
  expect(applyInstruction(ready('founder-repair'), 'add the price', ctx).reply).toMatch(/isn’t about one product/)
  expect(text(applyInstruction(ready('dawn-patrol'), 'add the discount code', ctx).idea)).toMatch(/TRAIL10/)
})

test('variants: three different hooks, and a mix takes the hook of one and the body of another', () => {
  const v = variantsOf(ready('storm-snow'), 'instagram')
  expect(v.map(x => x.key)).toEqual(['A', 'B', 'C'])
  expect(new Set(v.map(x => x.hook)).size).toBe(3)
  expect(mixVariants(v[1], v[2])).toBe(`${v[1].hook} ${v[2].body}`)
})

test('diffWords marks what was removed and added', () => {
  expect(diffWords('We stayed dry. Swipe for the test', 'We stayed dry. Re-proof it yearly')).toEqual([
    { op: 'same', text: 'We stayed dry.' }, { op: 'del', text: 'Swipe for the test' }, { op: 'add', text: 'Re-proof it yearly' },
  ])
})

test('learning: the same chip twice proposes a rule once; the next idea follows it and says so', () => {
  const a = learn({}, 'angle:repair', [])
  expect(a.proposal).toBeUndefined()
  const b = learn(a.learned, 'angle:repair', [])
  expect(b.proposal).toEqual({ key: 'angle:repair', text: LEARN_RULES['angle:repair'] })
  expect(learn({ ...b.learned, 'no:angle:repair': 1 }, 'angle:repair', []).proposal).toBeUndefined()
  expect(learn(b.learned, 'angle:repair', [rule(LEARN_RULES['angle:repair'])]).proposal).toBeUndefined()
  const next = draftIdea(makeIdea(IDEA_SEEDS['knots-winter'], 'continuous', NOW), { ...ctx, rules: [rule(LEARN_RULES['angle:repair'])] })
  expect(next.followsRule).toBe(LEARN_RULES['angle:repair'])
  expect(next.versions.at(-1)!.note).toMatch(/^Following your rule/)
})

test('a learned dismiss rule holds matching ideas back', () => {
  const seeds = ['fleece-city', 'bottle-bifl'].map(k => IDEA_SEEDS[k])
  const r = heldByRules(seeds, [rule(LEARN_RULES['dismiss:Off-brand'])], POSTS, NOW)
  expect(r.keep.map(s => s.key)).toEqual(['bottle-bifl'])
  expect(r.held[0]).toMatchObject({ seed: { key: 'fleece-city' }, rule: LEARN_RULES['dismiss:Off-brand'] })
})

test('expiry, snooze and the cap of 8 open ideas', () => {
  const ideas = spotIdeas(NOW, POSTS, LEVELS)
  const later = expireIdeas(ideas, T(9, 31))
  expect(later.expired.map(i => i.key)).toEqual(['gr20-throwback'])
  expect(later.ideas.find(i => i.key === 'gr20-throwback')!.status).toBe('expired')
  const snoozed = ideas.map(i => (i.key === 'storm-snow' ? { ...i, status: 'snoozed' as const, snoozedUntil: T(14, 0) } : i))
  expect(wakeIdeas(snoozed, T(14, 0)).find(i => i.key === 'storm-snow')!.status).toBe('ready')
  const incoming = ['fleece-city', 'bottle-bifl', 'zip-flaw'].map(k => makeIdea(IDEA_SEEDS[k], 'weekly', NOW))
  const { accepted, held, retired } = capIdeas(ideas, incoming)
  // 7 open: one free place (the strongest, 80%), then the 71% one replaces the weakest undrafted idea (68%), the 63% one waits.
  expect(ideas.filter(isOpen).length + accepted.length - retired.length).toBe(MAX_OPEN)
  expect(accepted.map(i => i.key)).toEqual(['bottle-bifl', 'zip-flaw'])
  expect(retired.map(i => i.key)).toEqual(['gr20-throwback'])
  expect(held.map(i => i.key)).toEqual(['fleece-city'])
  // Urgent always gets in.
  const full = [...ideas, ...accepted]
  expect(capIdeas(full, [makeIdea(IDEA_SEEDS['first-snow'], 'urgent', NOW)]).accepted).toHaveLength(1)
})

test('scheduling: a post per draft, a brief without a photo waits for the visual, a series becomes its steps', () => {
  let n = 0
  const id = () => `p${n++}`
  expect(ideaPosts(ready('storm-snow'), id)).toMatchObject([{ network: 'instagram', status: 'scheduled', media: 'snow', author: 'atlas' }])
  expect(ideaPosts(ready('founder-repair'), id)[0]).toMatchObject({ status: 'needs', note: expect.stringMatching(/Waiting for the visual/) })
  const series = ideaPosts(makeIdea(IDEA_SEEDS['series-ridge'], 'continuous', NOW), id)
  expect(series).toHaveLength(4)
  expect(series[0].at).toBe(T(18, 30, 6))
})
