// Atlas · Publishing: everything Atlas plugs into the core (see src/app/agents-registry.ts).
import type { Network } from '../../app/types'
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { net } from '../../data/command'
import { NETWORK_LABEL } from '../../data/agents'
import { flagged } from '../desk/parts'
import { actVisuals, ideasDue, onResolvePublishing, tickIdeas, undoCards, unscheduleIdea, visualsDue } from './slice'
import { SCRIPT } from './script'
import { guardsDue, tickGuards } from './guards'
import { approvalsDue, sendToClaire, tickApprovals } from './approvals'
import type { State } from '../../app/state'
import { now } from '../../app/core'
import { hhmm } from '../../app/time'

declare module '../../app/types' {
  interface LogEntry {
    /** Idea Atlas scheduled on its own: Undo takes the posts back out and returns it to Ideas. */
    idea?: string
  }
}
declare module '../../data/command' {
  interface IntentTypes {
    post: { network: Network; topic: string; slot: string }
    postClaire: { day?: string; network?: Network }
  }
}

const BEST_SLOT: Record<Network, string> = { instagram: 'Fri 28, 18:30', linkedin: 'Tue 2, 08:30', tiktok: 'Thu 27, 18:00', facebook: 'Sat 29, 10:00', youtube: 'Sun 30, 11:00', x: 'Today, 12:00', google: '', trustpilot: '' }
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
    return { kind: 'post', network: n, topic, slot: day ? `${day[1]}, ${BEST_SLOT[n].split(', ')[1] ?? '18:00'}` : BEST_SLOT[n] }
  },
  bar: (i, { d, go, query }) => {
    const text = draftPost(i.topic, i.network)
    return {
      text: `Drafted a ${NETWORK_LABEL[i.network]} post on “${i.topic}” for ${i.slot}, the best slot this week. It follows the Playbook: one call to action, one emoji max. It’s on your Desk for approval.`,
      visual: <div className="well cmdk-post"><div className="faint t-xs">{NETWORK_LABEL[i.network]} · {i.slot}</div><p>{text}</p></div>,
      after: () => d({ type: 'playbook/briefAtlas', title: `${NETWORK_LABEL[i.network]} post: ${i.topic}`, network: i.network, slot: i.slot, text, brief: query }),
      ctas: [{ label: 'Open the Desk', primary: true, run: () => go('/') }, { label: 'Open Publishing', run: () => go('/publishing') }],
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

const atlas: AgentModule = {
  id: 'atlas',
  script: SCRIPT,
  onResolve: onResolvePublishing,
  onUndo: (s, l) => undoCards(l.idea ? unscheduleIdea(s, l.idea) : s, l.restore ?? []),
  // Ideas whose window closed leave; snoozed ones come back. On Act, posts held for a visual get one from Media.
  // Guardrail: during a critical alert, the next 24 h are paused; they resume when it's over.
  due: (s, t) => ideasDue(s, t) || visualsDue(s) || guardsDue(s) || approvalsDue(s),
  tick: (s, t) => {
    let next = tickIdeas(s, t)
    if (visualsDue(next)) next = actVisuals(next)
    if (approvalsDue(next)) next = tickApprovals(next)
    return guardsDue(next) ? tickGuards(next) : next
  },
  intents: [post, postClaire],
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
}
export default atlas
