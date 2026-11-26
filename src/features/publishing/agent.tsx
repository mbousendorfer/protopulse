// Atlas · Publishing: everything Atlas plugs into the core (see src/app/agents-registry.ts).
import type { Network } from '../../app/types'
import { BEST_SLOT } from '../../data/publishing'
import { DEMO_START } from '../../app/time'
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { net } from '../../data/command'
import { NETWORK_LABEL } from '../../data/agents'
import { flagged } from '../desk/parts'
import { actVisuals, licencesDue, tickLicences, ideasDue, onResolvePublishing, publishDue, publishingDue, tickIdeas, undoCards, unscheduleIdea, visualsDue } from './slice'
import { SCRIPT } from './script'
import { guardsDue, tickGuards } from './guards'
import { approvalsDue, sendToClaire, tickApprovals } from './approvals'
import type { State } from '../../app/state'
import { FIRST_COMMENT, SIZE_GUIDE } from './formats'
import { fillQueues, unfill } from './queues'
import { tickWindow, windowDue } from './window'
import { RESULT_TOPIC, TEST_TOPIC, dropTestRule, proposeTest, readTest, testPosts, testsDue } from './tests'
import { PairPreview } from './PairPreview'
import { actionOf, now } from '../../app/core'
import { hhmm } from '../../app/time'

declare module '../../app/types' {
  interface LogEntry {
    /** Idea Atlas scheduled on its own: Undo takes the posts back out and returns it to Ideas. */
    idea?: string
    /** Queue slots Atlas filled on Act: Undo takes those posts out. */
    queuePosts?: string[]
  }
}
declare module '../../data/command' {
  interface IntentTypes {
    post: { network: Network; topic: string; slot: string }
    postClaire: { day?: string; network?: Network }
    firstComment: { day?: string; network?: Network; text: string }
    fillQueue: { queue?: string; nextWeek: boolean }
    tryTwo: { network?: Network }
  }
}

/** The next best-day slot from the demo's first morning: Iris's best weekday and time for the network. */
const bestDay = (n: Network) => {
  const b = BEST_SLOT[n]
  if (!b) return ''
  const start = new Date(DEMO_START)
  const ahead = ((b.day - (start.getDay() + 6) % 7) + 7) % 7 || 7
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + ahead)
  return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${d.getDate()}, ${b.time}`
}
const DAYS: [RegExp, string][] = [[/monday/, 'Mon 1'], [/tuesday/, 'Tue 2'], [/wednesday/, 'Wed 26'], [/thursday/, 'Thu 27'], [/friday/, 'Fri 28'], [/saturday/, 'Sat 29'], [/sunday/, 'Sun 30'], [/tomorrow/, 'Wed 26'], [/today|tonight/, 'Today']]

/** Post copy Atlas drafts from a topic, per network. */
export function draftPost(topic: string, network: Network) {
  const T = topic.charAt(0).toUpperCase() + topic.slice(1)
  if (/sale|discount|% off|promo/.test(topic)) return 'Weekend sale: 15% off every Summit Bottle until Sunday 20:00. Cold water for the next trail, warm coffee for the summit.'
  switch (network) {
    case 'linkedin': return `${T}. Here’s what our team learned this year, and why it matters to anyone who spends their weekends outside.`
    case 'tiktok': return `${T} in 20 seconds. Wait for the last shot.`
    case 'facebook': return `${T}. Tell us in the comments where you’d take it first.`
    case 'x': return `${T}. More on fernway.co`
    case 'youtube': return `${T}: the short version, filmed above Annecy.`
    default: return `${T}. Shot on the trail above Annecy, no filter needed.`
  }
}

const post = defineIntent({
  kind: 'post', owner: 'atlas', order: 140,
  parse: (t, { forced }) => {
    if (!((/(post|reel|carousel|tweet|caption|story)\b/.test(t) && /(write|draft|create|make|post about|a post|an? (reel|carousel|tweet))/.test(t)) || (forced === 'atlas' && /about|sale|post/.test(t)))) return
    const n = net(t) ?? 'instagram'
    const day = DAYS.find(([re]) => re.test(t))
    const topic = (t.match(/(?:about|on|for)\s+(?:the\s+|our\s+)?(.+?)(?:\s+(?:on|for|this|next)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|linkedin|instagram|tiktok|facebook|youtube|x)\b.*)?$/)?.[1]
      ?? t.replace(/^(?:write|draft|create|make)\s+(?:me\s+)?(?:an?\s+)?(?:\w+\s+)?(?:post|reel|carousel|tweet)\s*/, '')).trim() || 'our latest news'
    return { kind: 'post', network: n, topic, slot: day ? `${day[1]}, ${BEST_SLOT[n]?.time ?? '18:00'}` : bestDay(n) }
  },
  bar: (i, { d, go, query }) => {
    const text = draftPost(i.topic, i.network)
    return {
      text: `Drafted a ${NETWORK_LABEL[i.network]} post on “${i.topic}” for ${i.slot}, the best slot this week. It follows the Playbook: one call to action, one emoji max. It’s on your Desk for approval.`,
      visual: <div className="well cmdk-post"><div className="faint t-xs">{NETWORK_LABEL[i.network]} · {i.slot}</div><p>{text}</p></div>,
      after: () => d({ type: 'playbook/briefAtlas', title: `${NETWORK_LABEL[i.network]} post: ${i.topic}`, network: i.network, slot: i.slot, text, brief: query }),
      ctas: [{ label: 'Review on Desk', primary: true, run: () => go('/') }, { label: 'Open Publishing', run: () => go('/publishing') }],
    }
  },
  chat: i => ({ replies: [{ from: 'atlas', text: `Here’s a ${NETWORK_LABEL[i.network]} draft for ${i.slot}${i.slot.includes('18') ? ', your best evening slot there' : ''}. Nothing goes out until you schedule it.`, card: { type: 'post', network: i.network, slot: i.slot, text: draftPost(i.topic, i.network), status: 'draft' } }], effects: [] }),
})

/** The post a sentence points at: the day named ("Friday's post"), the network if named, the soonest one still to go out. */
function postNamed(s: State, i: { day?: string; network?: Network }) {
  const today = new Date(now(s)).getDate()
  const date = i.day === 'Today' ? today : i.day ? +i.day.split(' ')[1] : undefined
  return s.publishing.posts
    .filter(p => ['scheduled', 'draft', 'needs'].includes(p.status) && p.at > now(s) && (!date || new Date(p.at).getDate() === date) && (!i.network || p.network === i.network))
    .sort((a, b) => a.at - b.at)[0]
}
const sentText = (p: { network: Network; at: number; text: string }) =>
  `Sent the ${NETWORK_LABEL[p.network]} post for ${new Date(p.at).toLocaleDateString('en-GB', { weekday: 'long' })} ${hhmm(p.at)} to Claire: “${p.text}”. It’s To approve until she answers, usually within a minute.`

const postClaire = defineIntent({
  kind: 'postClaire', owner: 'atlas', order: 135,
  parse: t => {
    if (!/claire/.test(t) || !/\b(send|ask|share|get)\b/.test(t) || !/\b(post|reel|tweet|story|carousel)\b/.test(t)) return
    return { kind: 'postClaire', day: DAYS.find(([re]) => re.test(t))?.[1], network: net(t) }
  },
  bar: (i, { s, d, go }) => {
    const p = postNamed(s, i)
    if (!p) return { text: `I don’t see a post to send${i.day ? ` on ${i.day}` : ''}${i.network ? ` on ${NETWORK_LABEL[i.network]}` : ''}. Open the calendar to pick one.`, ctas: [{ label: 'Open the calendar', primary: true, run: () => go('/publishing/calendar') }] }
    return {
      text: sentText(p),
      after: () => d({ type: 'publishing/claire', post: p }),
      ctas: [{ label: 'Open the post', primary: true, run: () => go(`/publishing/calendar?post=${p.id}`) }],
    }
  },
  chat: (i, { s }) => {
    const p = postNamed(s, i)
    if (!p) return { replies: [{ from: 'atlas', text: `I don’t see a post to send${i.day ? ` on ${i.day}` : ''}. Tell me the day or open the calendar.` }], effects: [] }
    return { replies: [{ from: 'atlas', text: sentText(p) }], effects: [x => { const q = x.publishing.posts.find(y => y.id === p.id); return q ? sendToClaire(x, q, 'You asked from Chat.', 'you').s : x }] }
  },
})

/** The post a first comment goes on: the one named, else the next product post on a network that has first comments. */
const commentTarget = (s: State, i: { day?: string; network?: Network }) => {
  const named = i.day || i.network ? postNamed(s, i) : undefined
  if (named && FIRST_COMMENT.includes(named.network)) return named
  return s.publishing.posts.filter(p => p.status === 'scheduled' && p.at > now(s) && FIRST_COMMENT.includes(i.network ?? p.network) && p.network === (i.network ?? p.network) && (i.day ? false : /ridge|bottle|jacket|fleece/i.test(p.text)))
    .sort((a, b) => a.at - b.at)[0]
}
const commentText = (i: { day?: string; network?: Network; text: string }, p: { network: Network; at: number }) =>
  `Added the first comment “${i.text}” to the ${NETWORK_LABEL[p.network]} post for ${new Date(p.at).toLocaleDateString('en-GB', { weekday: 'long' })} ${hhmm(p.at)}. It goes out with the post.`

const firstComment = defineIntent({
  kind: 'firstComment', owner: 'atlas', order: 136,
  parse: (t, { raw }) => {
    if (!/first comment/.test(t)) return
    const quoted = raw.match(/[“"]([^”"]+)[”"]/)?.[1]
    const text = quoted ?? (/size guide|sizes?\b/.test(t) ? `Sizes, weights and specs: ${SIZE_GUIDE}` : `More on ${'fernway.co'}`)
    return { kind: 'firstComment', day: DAYS.find(([re]) => re.test(t))?.[1], network: net(t), text }
  },
  bar: (i, { s, d, go }) => {
    const p = commentTarget(s, i)
    if (!p) return { text: 'I don’t see a post on Instagram, Facebook or LinkedIn to add it to. First comments only exist there.', ctas: [{ label: 'Open the calendar', primary: true, run: () => go('/publishing/calendar') }] }
    return { text: commentText(i, p), after: () => d({ type: 'publishing/firstComment', id: p.id, text: i.text }), ctas: [{ label: 'Open the post', primary: true, run: () => go(`/publishing/calendar?post=${p.id}`) }] }
  },
  chat: (i, { s }) => {
    const p = commentTarget(s, i)
    if (!p) return { replies: [{ from: 'atlas', text: 'I don’t see a post on Instagram, Facebook or LinkedIn to add it to. First comments only exist there.' }], effects: [] }
    return { replies: [{ from: 'atlas', text: commentText(i, p) }], effects: [x => ({ ...x, publishing: { ...x.publishing, posts: x.publishing.posts.map(q => (q.id === p.id ? { ...q, firstComment: i.text } : q)) } })] }
  },
})

const nextMonday = (t: number) => { const d = new Date(t); const dow = (d.getDay() + 6) % 7; return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow + 7).getTime() }
const fillQueue = defineIntent({
  kind: 'fillQueue', owner: 'atlas', order: 137,
  parse: t => {
    if (!/\bfill\b/.test(t) || !/(tips?|repair|queues?|slots?)\b/.test(t)) return
    return { kind: 'fillQueue', queue: /tip/.test(t) ? 'q-tips' : /repair/.test(t) ? 'q-repair' : undefined, nextWeek: /next week/.test(t) }
  },
  bar: (i, { s, d, go }) => {
    const opts = i.nextWeek ? { from: nextMonday(now(s)), days: 7 } : {}
    const after = fillQueues(s, { queue: i.queue, ...opts, why: 'You asked from the command bar.' })
    const n = after.publishing.posts.length - s.publishing.posts.length
    return {
      text: n ? `${n} ${i.queue === 'q-tips' ? 'Tuesday tips' : i.queue === 'q-repair' ? 'Sunday repair' : 'queue'} slot${n > 1 ? 's' : ''} filled${actionOf(s, 'atlas', 'atlas-fill')?.autonomy === 'act' ? ' and scheduled' : '. They wait for your OK on the Desk'}.` : 'Those slots are already filled. Nothing to add.',
      after: n ? () => d({ type: 'publishing/fillQueue', queue: i.queue, ...opts }) : undefined,
      ctas: [{ label: 'Open the queues', primary: true, run: () => go('/publishing/queues') }],
    }
  },
  chat: (i, { s }) => {
    const opts = i.nextWeek ? { from: nextMonday(now(s)), days: 7 } : {}
    const n = fillQueues(s, { queue: i.queue, ...opts, why: 'You asked in Chat.' }).publishing.posts.length - s.publishing.posts.length
    return { replies: [{ from: 'atlas', text: n ? `Filled ${n} slot${n > 1 ? 's' : ''}. ${actionOf(s, 'atlas', 'atlas-fill')?.autonomy === 'act' ? 'They’re scheduled.' : 'They’re on your Desk to approve.'}` : 'Those slots are already filled.' }], effects: n ? [x => fillQueues(x, { queue: i.queue, ...opts, why: 'You asked in Chat.' })] : [] }
  },
})

/** "Try two versions", "test two openings": Atlas proposes its Instagram test (once). */
const tryTwoText = (s: State) => testPosts(s).length ? 'The two openings are already in the calendar. I’ll tell you which one won once both are out.'
  : s.handoffs.some(h => h.topic === TEST_TOPIC) ? 'It’s already on your Desk: two openings of the Ridge 28L reel.'
  : actionOf(s, 'atlas', 'atlas-test')?.autonomy === 'act' ? 'Scheduled two versions of the Ridge 28L reel on Instagram, a question opening and a plain one. I’ll tell you which one people save more.'
  : 'Wrote two versions of the Ridge 28L reel, a question opening and a plain one. They’re on your Desk.'
const tryTwo = defineIntent({
  kind: 'tryTwo', owner: 'atlas', order: 138,
  parse: t => (/\b(test|try)\b/.test(t) && /(two|2) (versions|openings|hooks)|a\/b|opening/.test(t) ? { kind: 'tryTwo' } : undefined),
  bar: (_i, { s, d, go }) => ({
    text: tryTwoText(s),
    after: testPosts(s).length || s.handoffs.some(h => h.topic === TEST_TOPIC) ? undefined : () => d({ type: 'publishing/tryTwo' }),
    ctas: [{ label: 'Open the Desk', primary: true, run: () => go('/') }],
  }),
  chat: (_i, { s }) => ({ replies: [{ from: 'atlas', text: tryTwoText(s) }], effects: [proposeTest] }),
})

const atlas: AgentModule = {
  id: 'atlas',
  script: SCRIPT,
  onResolve: onResolvePublishing,
  onUndo: (s, l) => {
    // A test result answered "Yes": the rule comes back out of the Playbook.
    const next = l.restore?.some(h => h.topic === RESULT_TOPIC) ? dropTestRule(s) : s
    return undoCards(unfill(l.idea ? unscheduleIdea(next, l.idea) : next, l.queuePosts ?? []), l.restore ?? [])
  },
  // Ideas whose window closed leave; snoozed ones come back. On Act, posts held for a visual get one from Media.
  // Guardrail: during a critical alert, the next 24 h are paused; they resume when it's over.
  // Send window: what Atlas scheduled alone gets a Stop card 10 minutes before it goes out.
  due: (s, t) => ideasDue(s, t) || visualsDue(s) || guardsDue(s) || approvalsDue(s) || publishingDue(s, t) || licencesDue(s) || windowDue(s) || testsDue(s),
  tick: (s, t) => {
    let next = publishDue(tickIdeas(s, t), t)
    if (windowDue(next)) next = tickWindow(next)
    if (testsDue(next)) next = readTest(next)
    if (visualsDue(next)) next = actVisuals(next)
    if (approvalsDue(next)) next = tickApprovals(next)
    if (licencesDue(next)) next = tickLicences(next)
    return guardsDue(next) ? tickGuards(next) : next
  },
  intents: [post, postClaire, firstComment, fillQueue, tryTwo],
  previews: { pair: p => <PairPreview p={p} /> },
  batches: [{
    // An idea with a short window stands on its own: it opens the idea, and its other networks live there.
    id: 'atlas', agent: 'atlas', match: h => h.kind === 'approval' && h.preview?.type === 'post' && !h.proposal && h.topic !== 'Idea',
    ready: h => h.confidence >= 75 && !flagged(h),
    title: n => `${n} posts to approve`, meta: (_xs, r) => `${r} ready to schedule`,
    verb: { many: n => `Schedule ${n} selected`, done: n => `Scheduled ${n} posts Atlas drafted` },
  }],
  testerStats: ev => [
    ['Ideas opened', ev.filter(e => e.kind === 'publishing/ideaOpen').length],
    ['Ideas redirected', ev.filter(e => e.kind === 'publishing/ideaRedirect').length],
    ['Ideas accepted as is', ev.filter(e => e.kind === 'ideas/decision' && e.detail?.outcome === 'as-is').length],
    ['Ideas accepted modified', ev.filter(e => e.kind === 'ideas/decision' && e.detail?.outcome === 'modified').length],
    ['Ideas rejected', ev.filter(e => e.kind === 'ideas/decision' && e.detail?.outcome === 'rejected').length],
  ],
  presets: { calm: { keep: ['h-plan'] }, competitor: { keep: ['h-plan'] } },
  // Moderator › Hard to see: what a tester rarely stumbles on (⇧D).
  triggers: [{ event: 'ev-x-fail', to: '/publishing/calendar' }, { event: 'ev-slot', to: '/publishing/calendar' }, { event: 'ev-queue', to: '/publishing/queues' }, { event: 'ev-window', to: '/' }, { event: 'ev-test', to: '/' }, { event: 'ev-test-result', to: '/' }],
}
export default atlas
