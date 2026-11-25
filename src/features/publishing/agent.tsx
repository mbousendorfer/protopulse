// Atlas · Publishing: everything Atlas plugs into the core (see src/app/agents-registry.ts).
import type { Network } from '../../app/types'
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { net } from '../../data/command'
import { NETWORK_LABEL } from '../../data/agents'
import { flagged } from '../desk/parts'
import { ideasDue, onResolvePublishing, tickIdeas, unscheduleIdea } from './slice'
import { SCRIPT } from './script'

declare module '../../app/types' {
  interface LogEntry {
    /** Idea Atlas scheduled on its own: Undo takes the posts back out and returns it to Ideas. */
    idea?: string
  }
}
declare module '../../data/command' {
  interface IntentTypes { post: { network: Network; topic: string; slot: string } }
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

const atlas: AgentModule = {
  id: 'atlas',
  script: SCRIPT,
  onResolve: onResolvePublishing,
  onUndo: (s, l) => (l.idea ? unscheduleIdea(s, l.idea) : s),
  // Ideas whose window closed leave; snoozed ones come back.
  due: ideasDue,
  tick: tickIdeas,
  intents: [post],
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
