import type { State } from '../../app/state'
import type { AgentId } from '../../app/types'
import { pushLog } from '../../app/core'
import { OWNER, draftPost, parse, type Intent } from '../../data/command'
import { NETWORK_LABEL } from '../../data/agents'
import type { Chat, ChatMsg } from './slice'
import { reduceVideo, validUrl, videoEvent } from '../video/slice'

type Reply = Omit<ChatMsg, 'id' | 'at'>
export type Route = { intent: Intent; agent: AgentId; raw: string; mentioned?: AgentId }

/** "@Atlas, a post about…" or "… @iris" → the mentioned agent leads, the rest is parsed as usual. */
export function routeText(raw: string): Route {
  const m = raw.match(/@(nova|atlas|iris|echo|sage|juno)\b/i)
  const mentioned = m ? (m[1].toLowerCase() as AgentId) : undefined
  const clean = raw.replace(/@(nova|atlas|iris|echo|sage|juno)\b[,:]?\s*/gi, '').trim()
  const { intent, forced } = parse(mentioned ? `${mentioned} ${clean}` : clean)
  return { intent, agent: mentioned ?? forced ?? OWNER[intent.kind], raw: clean, mentioned }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Scripted, data-backed answers. Several agents can answer in turn. Effects run once, when the message is sent. */
export function respond(r: Route, s: State, chat: Chat): { replies: Reply[]; effects: ((s: State) => State)[] } {
  const i = r.intent
  const open = s.handoffs.filter(h => !h.lane)
  switch (i.kind) {
    case 'post':
      return { replies: [{ from: 'atlas', text: `Here’s a ${NETWORK_LABEL[i.network]} draft for ${i.slot}${i.slot.includes('18') ? ', your best evening slot there' : ''}. Nothing goes out until you schedule it.`, card: { type: 'post', network: i.network, slot: i.slot, text: draftPost(i.topic, i.network), status: 'draft' } }], effects: [] }

    case 'tiktok':
      return {
        replies: [
          { from: 'iris', text: 'TikTok views per video are down 38% since Thursday: four videos in a row under 2,000, against 9,000 usually. The hooks got longer, 4 to 6 seconds.', card: { type: 'chart', label: 'TikTok views per video (k)', value: '1,840', delta: '−38%', down: true, series: [8.2, 9.1, 10.4, 8.8, 9.6, 7.9, 9.3, 2.1, 1.9, 1.7, 1.8], sources: ['TikTok analytics · last 11 videos'] } },
          { from: 'atlas', text: 'Want me to test 3-second hooks? Here’s the first one.', card: { type: 'post', network: 'tiktok', slot: 'Thu 27, 18:00', text: 'POV: you packed for 3 days and it all fits. Ridge 28L.', status: 'draft' } },
        ], effects: [],
      }

    case 'besttime': {
      const slot = { instagram: 'Friday 18:30', linkedin: 'Tuesday 08:30', tiktok: 'Thursday 18:00' }[i.network]
      return { replies: [{ from: 'iris', text: `Your best ${NETWORK_LABEL[i.network]} slot over the last 90 days is ${slot}: 2.1× the average reach. Second best is Sunday 11:00.`, card: { type: 'chart', label: `${NETWORK_LABEL[i.network]} reach by weekday (k)`, value: slot, delta: '2.1× average', series: [21, 24, 22, 27, 44, 19, 31], labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], sources: [`${NETWORK_LABEL[i.network]} analytics · 90 days`] } }], effects: [] }
    }

    case 'compare':
      return { replies: [{ from: 'iris', text: 'Over 30 days, reels reach 2.4× more people, carousels get 1.8× more saves. Reels to be found, carousels to be kept.', card: { type: 'chart', label: 'Saves per post', value: '1.8×', delta: 'carousels vs reels', series: [42, 51, 38, 77, 92, 88], labels: ['R', 'R', 'R', 'C', 'C', 'C'], sources: ['Instagram analytics · 30 days, 24 posts'] } }], effects: [] }

    case 'performance':
      return { replies: [{ from: 'iris', text: 'Last 7 days: reach 412k (+8%), engagement rate 3.1% (+0.4 pt), 1,204 replies handled, 91% of them by Nova. TikTok is the one weak spot.', card: { type: 'chart', label: 'Weekly reach (k)', value: '412k', delta: '+8%', series: [300, 340, 330, 380, 410, 390, 440, 412], sources: ['All networks · weekly report w47'] } }], effects: [] }

    case 'competitor': {
      const events = open.filter(h => h.topic === 'Competitor')
      return {
        replies: [
          { from: 'echo', text: events.length ? `${events.length} move${events.length > 1 ? 's' : ''} I’m watching right now:` : 'Nothing new from competitors since this morning.', card: events.length ? { type: 'list', items: events.map(h => ({ title: h.title, agent: 'echo', meta: h.context, link: h.link })) } : undefined },
          ...(events.some(h => /Peakline/.test(h.title)) ? [{ from: 'atlas' as const, text: 'I wouldn’t match the price. A counter-post on durability instead? It mentions no competitor by name.', card: { type: 'post' as const, network: 'instagram' as const, slot: 'Today, 18:00', text: 'Built to last, not to discount. The Ridge 28L: repairable for life, same price all year.', status: 'draft' as const } }] : []),
        ], effects: [],
      }
    }

    case 'mentions':
      return { replies: [{ from: 'echo', text: '2 negative mentions today, both about the Storm Jacket seams. One Reddit thread is gaining traction.', card: { type: 'list', items: [{ title: 'r/ultralight: “Storm Jacket seams leak after 3 washes”', agent: 'echo', meta: '41 upvotes · 2 h ago', link: '/listening/mentions' }, { title: '@hugo.rando: “Seams on my Storm are peeling”', agent: 'echo', meta: 'X · 4 h ago', link: '/listening/mentions' }] } }], effects: [] }

    case 'clip': {
      if (i.url && validUrl(i.url)) return { replies: [{ from: 'juno', text: 'On it. I’ll transcribe it, pick the best moments and caption them. They’ll be in Video in about 40 seconds.', card: { type: 'done', text: 'Video added to Juno’s queue' } }], effects: [(st: State) => reduceVideo(st, { type: 'video/addLink', url: i.url! })] }
      if (i.url) return { replies: [{ from: 'juno', text: 'That link doesn’t look right. Paste the full address, starting with https://.' }], effects: [] }
      const ready = s.video.clips.filter(c => c.status === 'ready')
      if (!s.video.sources.some(x => x.id === 'gr20')) return { replies: [{ from: 'juno', text: 'Your latest upload is “Storm Jacket: 3 days of GR20 rain”. I’m cutting it now and will tell you when the clips are ready.', card: { type: 'done', text: 'Juno is clipping the latest video' } }], effects: [(st: State) => videoEvent(st, 'gr20', true)] }
      return { replies: [{ from: 'juno', text: `I already cut the latest video. ${ready.length} clip${ready.length === 1 ? ' is' : 's are'} waiting for you:`, card: { type: 'list', items: ready.slice(0, 5).map(c => ({ title: c.title, agent: 'juno' as const, meta: `“${c.hook}”`, link: `/video/clips/${c.id}` })) } }], effects: [] }
    }

    case 'rule':
      return { replies: [{ from: i.agent, text: `Got it. I’ll stop doing that here. Should every agent follow it?`, card: { type: 'rule', text: i.rule, agent: i.agent, status: 'proposed' } }], effects: [] }

    case 'campaign':
      return { replies: [{ from: 'sage', text: 'I can turn that into a full campaign plan: goal, phases, posts and who does what. It takes me about a minute.', card: { type: 'brief', text: cap(i.brief), status: 'proposed' } }], effects: [] }

    case 'needs':
      return { replies: [{ from: 'iris', text: `${open.length} things need you. The most urgent:`, card: { type: 'list', items: [...open].sort((a, b) => (a.urgency === 'urgent' ? -1 : 0) - (b.urgency === 'urgent' ? -1 : 0)).slice(0, 5).map(h => ({ title: h.title, agent: h.agent, meta: h.topic, link: '/' })) } }], effects: [] }

    case 'overnight': {
      const items = s.log.filter(l => l.agent === i.agent).slice(0, 5)
      return { replies: [{ from: i.agent, text: `Here’s what I did since yesterday evening, most recent first:`, card: { type: 'list', items: items.map(l => ({ title: l.text, agent: l.agent, meta: l.reason, link: l.link ?? '/activity' })) } }], effects: [] }
    }

    case 'reply': {
      const conv = (s.inbox as { convs?: { id: string; author: string; network: string; messages?: { text: string }[]; draft?: (string | { text: string })[] }[] }).convs?.find(c => c.id === i.convo)
      if (!conv) return { replies: [{ from: 'nova', text: `I can’t find a conversation with ${cap(i.name)}. Try their handle, like @lea.hikes.` }], effects: [] }
      const draft = (conv.draft ?? []).map(x => (typeof x === 'string' ? x : x.text)).join('') || `Thanks ${cap(i.name)}, we’re on it.`
      return { replies: [{ from: 'nova', text: `Here’s my reply to ${conv.author}. It goes out when you send it.`, card: { type: 'reply', convo: conv.id, author: conv.author, network: conv.network as never, quote: conv.messages?.[conv.messages.length - 1]?.text ?? '', text: draft, status: 'draft' } }], effects: [] }
    }

    case 'pause':
    case 'resume': {
      const name = cap(i.agent)
      return {
        replies: [{ from: 'sage', text: i.kind === 'pause' ? `${name} is paused${i.until ? ` until ${i.until}` : ''}. Their work waits on your Desk.` : `${name} is back on shift.`, card: { type: 'done', text: i.kind === 'pause' ? `${name} paused` : `${name} resumed` } }],
        effects: [(st: State) => ({ ...st, agents: st.agents.map(a => (a.id === i.agent ? { ...a, status: i.kind === 'pause' ? 'paused' as const : 'on' as const, pausedUntil: i.kind === 'pause' ? i.until : undefined } : a)) }),
          (st: State) => pushLog(st, { agent: i.agent, text: i.kind === 'pause' ? `${name} paused from a chat` : `${name} resumed from a chat`, status: 'done' })],
      }
    }

    default: {
      const ctx = chat.context ? ` I can see you’re on ${chat.context.label}.` : ''
      return { replies: [{ from: r.agent, text: `I’m not sure I can help with that yet.${ctx} I can draft posts, answer questions about performance, check competitors and mentions, reply to customers, or turn a “don’t…” into a rule.` }], effects: [] }
    }
  }
}
