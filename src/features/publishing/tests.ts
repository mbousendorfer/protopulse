// Try two versions of a post: Atlas schedules both, reads the results, says which one won, and offers to make it a rule.
// ponytail: one test per workspace (the Instagram opening). A list of tests and new subjects when a second one is needed.
import type { State } from '../../app/state'
import type { Handoff } from '../../app/types'
import { actionOf, addRule, agentOf, now, pushHandoff, uid } from '../../app/core'
import { MIN, hhmm } from '../../app/time'
import { BEST_SLOT, type Post } from '../../data/publishing'
import { actOn } from './slice'

export const TEST_TOPIC = 'Two versions'
export const RESULT_TOPIC = 'Test result'
export const TEST_RULE = 'Open Instagram reels with a question'

type Side = { label: string; text: string; day: number }
/** Same subject, same photo, same hour; only the opening changes. Days are from the demo's Tuesday. */
const A: Side = { label: 'Question opening', text: 'Ever packed for 3 days in one bag? The Ridge 28L does it: 3 cubes, 1 rule, nothing extra.', day: 1 }
const B: Side = { label: 'Plain opening', text: '3 days. One bag. The Ridge 28L does it: 3 cubes, 1 rule, nothing extra.', day: 3 }
const MEDIA = 'pack'
/** What Iris reads once both have been out a day (saves first: that's what the test is about). */
const RESULTS = { a: { reach: 9100, er: 5.8, saves: 412 }, b: { reach: 8800, er: 4.1, saves: 258 } }

const at = (s: State, side: Side) => {
  const [h, m] = (BEST_SLOT.instagram?.time ?? '18:00').split(':').map(Number)
  const d = new Date(now(s))
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + side.day, h, m).getTime()
}
const slot = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}, ${hhmm(t)}`

export const testPosts = (s: State, id?: string) => s.publishing.posts.filter(p => p.test && (!id || p.test.id === id))
const level = (s: State) => actionOf(s, 'atlas', 'atlas-test')?.autonomy ?? 'draft'

declare module '../../app/types' {
  interface PreviewTypes { pair: { network: Post['network']; rows: { label: string; slot: string; text: string }[] } }
}

/** Atlas proposes the test (once). Draft: Needs you. Suggest: Worth a look. Act: both scheduled alone. */
export function proposeTest(s: State): State {
  if (testPosts(s).length || s.handoffs.some(h => h.topic === TEST_TOPIC)) return s
  const id = uid('t')
  const l = level(s)
  const next = pushHandoff(s, {
    agent: 'atlas', kind: 'approval', urgency: 'week', topic: TEST_TOPIC, action: 'atlas-test', ref: id, pillar: 'Gear that lasts',
    group: l === 'suggest' ? 'look' : 'need', link: '/publishing/calendar',
    title: 'Atlas wants to try two openings on Instagram',
    context: 'None of your Instagram posts open with a question. Same reel, same hour, two openings: we’ll see which one people save more.',
    why: `Trying two versions is set to ${l === 'act' ? 'Act' : l === 'suggest' ? 'Suggest' : 'Draft'}. Atlas only proposes a rule once the results are in.`, confidence: 74,
    preview: { type: 'pair', network: 'instagram', rows: [A, B].map(x => ({ label: x.label, slot: slot(at(s, x)), text: x.text })) },
  } as Omit<Handoff, 'id' | 'at'>)
  if (l !== 'act' || agentOf(s, 'atlas').status !== 'on') return next
  return actOn(next, next.handoffs[0], 'Scheduled two versions of the Ridge 28L reel on Instagram', 'Question opening vs plain opening, same hour, two days apart.')
}

/** Approved (by Sam, or Act): both versions go in the calendar. */
export function startTest(s: State, h: Handoff): State {
  if (!h.ref || testPosts(s, h.ref).length) return s
  const make = (x: Side, side: 'a' | 'b'): Post => ({
    id: uid('p'), network: 'instagram', format: 'reel', at: at(s, x), text: x.text, media: MEDIA, status: 'scheduled', author: 'atlas', pillar: 'Gear that lasts',
    test: { id: h.ref!, side }, labels: ['Test'], note: `Test: ${x.label.toLowerCase()} vs ${(side === 'a' ? B : A).label.toLowerCase()}.`,
  })
  return { ...s, publishing: { ...s.publishing, posts: [...s.publishing.posts, make(A, 'a'), make(B, 'b')] } }
}

const ratio = (x: number, y: number) => Math.round((x / y) * 10) / 10
/** The verdict in plain words: a winner only when saves differ by 20% or more. */
export function verdict(a: { reach: number; saves: number }, b: { reach: number; saves: number }) {
  const [w, l, wn, ln] = a.saves >= b.saves ? [a, b, A.label, B.label] : [b, a, B.label, A.label]
  const reach = `Reach was about the same (${(a.reach / 1000).toFixed(1)}k vs ${(b.reach / 1000).toFixed(1)}k).`
  if (w.saves < l.saves * 1.2) return { winner: undefined, text: `No real difference: ${a.saves} saves vs ${b.saves}. ${reach} Atlas won’t change anything.` }
  return { winner: wn, text: `The ${wn.toLowerCase()} got ${ratio(w.saves, l.saves)}× more saves (${w.saves} vs ${l.saves}) than the ${ln.toLowerCase()}. ${reach}` }
}

/** Both versions are out and Iris hasn't been read yet. */
export const testsDue = (s: State) => {
  const ps = testPosts(s)
  return ps.length === 2 && ps.every(p => p.status === 'published' && p.stats?.saves === undefined)
}

/** Heartbeat: Atlas reads Iris's numbers on both posts and says which opening won. The rule is Sam's call, never Act. */
export function readTest(s: State): State {
  const ps = testPosts(s)
  if (ps.length !== 2) return s
  const posts = s.publishing.posts.map(p => (p.test ? { ...p, stats: RESULTS[p.test.side] } : p))
  const v = verdict(RESULTS.a, RESULTS.b)
  const next = { ...s, publishing: { ...s.publishing, posts } }
  return pushHandoff(next, {
    agent: 'atlas', chain: ['iris', 'atlas'], kind: v.winner === A.label ? 'approval' : 'news', urgency: 'week', topic: RESULT_TOPIC, ref: ps[0].test!.id, link: `/publishing/calendar?post=${ps[0].id}`,
    title: v.winner ? `The ${v.winner.toLowerCase()} won` : 'No winner between the two openings',
    context: v.text, why: 'Iris’s numbers, one day after each post. Same reel, same hour, so the opening is the only difference.', confidence: v.winner ? 81 : 70,
    sources: ps.map(p => ({ label: `${p.test!.side === 'a' ? A.label : B.label}: ${RESULTS[p.test!.side].saves} saves`, from: 'Insights' })),
    ...(v.winner === A.label ? { options: [{ label: `Yes: “${TEST_RULE}”`, recommended: true }, { label: 'Not yet' }] } : {}),
  } as Omit<Handoff, 'id' | 'at'>)
}

/** Sam's answer to the result: the rule goes into the Playbook (Undo takes it out, see agent.tsx). */
export function resolveResult(s: State, index: number): State {
  if (index !== 0 || s.playbook.rules.some(r => r.text === TEST_RULE)) return s
  return addRule(s, { kind: 'do', text: TEST_RULE, agents: ['atlas'], origin: 'From Atlas’s test of two openings' })
}
export const dropTestRule = (s: State): State => ({ ...s, playbook: { ...s.playbook, rules: s.playbook.rules.filter(r => r.text !== TEST_RULE) } })

/** ⇧D: the results are in. Both versions are moved back so the later one went out an hour ago, then Atlas reads them. */
export function resultsIn(s: State): State {
  const ps = testPosts(s).filter(p => p.status === 'scheduled' || p.status === 'paused')
  if (ps.length !== 2) return s
  const shift = Math.max(...ps.map(p => p.at)) - (now(s) - 60 * MIN)
  const posts = s.publishing.posts.map(p => (ps.includes(p) ? { ...p, at: p.at - shift, status: 'published' as const, alone: undefined, history: [...(p.history ?? []), { at: p.at - shift, text: 'Published' }] } : p))
  return readTest({ ...s, publishing: { ...s.publishing, posts } })
}
