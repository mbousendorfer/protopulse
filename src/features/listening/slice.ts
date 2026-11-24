import type { State } from '../../app/state'
import type { Decision, Handoff, Network } from '../../app/types'
import { now, pushHandoff, pushLog, pushToast, uid } from '../../app/core'
import { EVENTS, LESSONS, MENTIONS, SEARCHES, TRENDS, type CompEvent, type Mention, type Move, type Search, type Sentiment } from '../../data/listening'
import type { Alert } from '../insights/alerts'
import { briefSage } from '../strategy/slice'

export type EventState = { status: 'handed' | 'done' | 'dismissed'; move: string; result: string; at: number }

export type ListeningState = {
  events: Record<string, EventState>
  lessons: Record<string, 'tested' | 'dismissed'>
  trends: Record<string, 'handed' | 'dismissed'>
  mentions: Record<string, 'replied' | 'hidden' | 'handed'>
  searches: Search[]
  /** Your corrections and tags on mentions. */
  sentiment: Record<string, Sentiment>
  tags: Record<string, string[]>
  alerts: Alert[]
}

const ALERTS: Alert[] = [
  { id: 'la1', subject: 'brand', condition: 'gets more than', threshold: 15, unit: ' negative mentions in 1 h', to: 'claire', on: true },
  { id: 'la2', subject: 'competitors', condition: 'gets more than', threshold: 200, unit: ' mentions in 1 h', to: 'desk', on: true },
  { id: 'la3', subject: 's9', condition: 'gets more than', threshold: 1, unit: ' mention from press', to: 'claire', on: true },
]

export const initialListening = (): ListeningState => ({ events: {}, lessons: {}, trends: {}, mentions: {}, searches: structuredClone(SEARCHES), sentiment: {}, tags: {}, alerts: structuredClone(ALERTS) })

export const MENTION_TAGS = ['Product feedback', 'Creator', 'Press', 'Support', 'Competitor']
export const MENTION_NET: Record<string, Network | undefined> = { Instagram: 'instagram', TikTok: 'tiktok', X: 'x', LinkedIn: 'linkedin', Facebook: 'facebook', YouTube: 'youtube' }
export type MentionOp = 'nova' | 'hide' | 'unhide' | 'tag' | 'sentiment' | 'atlas'

export type ListeningAction =
  | { type: 'listening/move'; event: string; index: number }
  | { type: 'listening/lesson'; id: string; test: boolean }
  | { type: 'listening/trend'; id: string; hand: boolean }
  | { type: 'listening/mention'; id: string; action: 'replied' | 'hidden' }
  | { type: 'listening/searchSave'; search: Search }
  | { type: 'listening/searchToggle'; id: string }
  | { type: 'listening/searchDelete'; id: string }
  | { type: 'listening/mentions'; ids: string[]; op: MentionOp; tag?: string; sentiment?: Sentiment }
  | { type: 'listening/alertSave'; alert: Alert }
  | { type: 'listening/alertToggle'; id: string }
  | { type: 'listening/alertDelete'; id: string }

const patch = (s: State, p: Partial<ListeningState>): State => ({ ...s, listening: { ...s.listening, ...p } })
const setEvent = (s: State, id: string, e: Omit<EventState, 'at'>): State => patch(s, { events: { ...s.listening.events, [id]: { ...e, at: now(s) } } })

const COUNTER: Record<string, { network: Network; text: string }> = {
  'e-peak-price': { network: 'instagram', text: 'Built to last, not to discount. The Ridge 28L: repairable for life, 2,400 five-star reviews, and the same price all year.' },
  'e-trail-viral': { network: 'tiktok', text: 'Ridge 28L vs. a garden hose. Watch the first 2 seconds and you’ll see why we don’t sell rain covers.' },
  'e-norro-repair': { network: 'linkedin', text: '1,200 bags repaired this year. Not a promise, a number. Here’s what our workshop fixed most, and how we design around it.' },
  'e-basecamp-recall': { network: 'instagram', text: 'What your bottle is made of matters. The Summit Bottle is lab-tested, BPA-free and guaranteed for life. Full results on our materials page.' },
  'e-peak-black': { network: 'instagram', text: 'We’re closed this week. Go outside. #FernwayTrailWeek' },
  'e-peak-tiktok': { network: 'tiktok', text: 'What’s in your Ridge? Episode 1 with @sarah.hikes, 3 days on the GR20.' },
}

/** Apply a counter-move: hand it to the right agent and record the follow-up. */
export function applyMove(s: State, ev: CompEvent, move: Move): State {
  switch (move.kind) {
    case 'counter': {
      const c = COUNTER[ev.id] ?? { network: 'instagram' as Network, text: `Our answer to ${ev.title.toLowerCase()}, without naming anyone. Draft v1.` }
      const next = pushHandoff(s, {
        agent: 'atlas', kind: 'approval', urgency: 'today', topic: 'Counter-post', action: 'atlas-competitor', chain: ['echo', 'atlas'], ref: ev.id,
        title: `Counter-post: ${move.label.replace(/^Counter-post by Atlas: /, '').replace(/^Atlas /, '')}`,
        context: `Answer to: ${ev.title}. Atlas wrote it without naming ${ev.competitor === 'norro' ? 'Norrø' : ev.competitor === 'basecamp' ? 'Basecamp Co.' : ev.competitor[0].toUpperCase() + ev.competitor.slice(1)}.`,
        why: 'Anything that answers a competitor is locked to Suggest: you publish it.', confidence: 71, link: `/listening/competitors/${ev.id}`,
        rules: ['Never name a competitor in a post'],
        preview: { type: 'post', network: c.network, slot: 'Today, 18:00', text: [c.text] },
      }, '')
      return setEvent(next, ev.id, { status: 'handed', move: move.label, result: 'Atlas drafted it. The post is on your Desk.' })
    }
    case 'sage': {
      const brief = /repair/i.test(move.label) ? 'Repair Week in January: answer Norrø with our repair numbers, goal 1,000 repair requests.'
        : /customer-story/i.test(move.label) ? 'Customer-story series in January, goal 2,000 new followers.'
        : `Response campaign to ${ev.title}: talk durability, not price. Goal 300 orders of the Ridge 28L.`
      return setEvent(briefSage(s, brief, `Echo · ${ev.title}`), ev.id, { status: 'handed', move: move.label, result: 'Sage built a campaign plan. It’s on your Desk.' })
    }
    case 'sales': {
      const next = pushLog(s, { agent: 'echo', text: `Emailed the sales team: ${ev.title}`, status: 'approved', reason: 'You asked from Listening', undoMinutes: 5 })
      return pushToast(setEvent(next, ev.id, { status: 'done', move: move.label, result: 'Sales team informed by email.' }),
        { agent: 'echo', text: `Email to sales: “${ev.title}. ${ev.read.split('.')[0]}.”`, undo: next.log[0].id })
    }
    case 'nova':
      return setEvent(pushLog(s, { agent: 'nova', text: `Counter-move: ${move.label}`, status: 'approved', reason: `Echo’s counter-move to: ${ev.title}` }), ev.id, { status: 'done', move: move.label, result: 'Nova is on it.' })
    case 'lesson':
      return setEvent(s, ev.id, { status: 'done', move: move.label, result: 'Added to Echo’s lessons.' })
    case 'none':
      return setEvent(s, ev.id, { status: 'dismissed', move: move.label, result: 'Dismissed. Echo keeps watching.' })
  }
}

function handTrend(s: State, id: string): State {
  const t = TRENDS.find(x => x.id === id)
  if (!t || s.listening.trends[id] === 'handed') return s
  const next = pushHandoff(s, {
    agent: 'atlas', kind: 'approval', urgency: 'today', topic: 'Trend post', action: 'atlas-trend', chain: ['echo', 'atlas'],
    title: `Trend post: ${t.name}`, context: `${t.networks} · ${t.growth}. ${t.fitWhy}`,
    why: 'You handed this trend to Atlas from Listening.', confidence: 70, link: '/publishing',
    preview: { type: 'post', network: /tiktok/i.test(t.networks) ? 'tiktok' : /linkedin/i.test(t.networks) ? 'linkedin' : 'instagram', slot: 'Tomorrow, 18:00', text: [`Our take on ${t.name.toLowerCase()}, the Fernway way. Draft v1: edit before approving.`] },
  }, 'Atlas is on it. The draft is on your Desk.')
  return patch(next, { trends: { ...next.listening.trends, [id]: 'handed' } })
}

export function reduceListening(s: State, a: ListeningAction): State {
  switch (a.type) {
    case 'listening/move': {
      const ev = EVENTS.find(e => e.id === a.event)
      const move = ev?.moves[a.index]
      if (!ev || !move) return s
      // Settle the Desk card for the same event, if any.
      const deskId = ev.id === 'e-peak-price' ? 'h-peakline' : undefined
      const next = deskId ? { ...s, handoffs: s.handoffs.filter(h => h.id !== deskId) } : s
      return applyMove(next, ev, move)
    }
    case 'listening/lesson': {
      const l = LESSONS.find(x => x.id === a.id)
      if (!l) return s
      let next = patch(s, { lessons: { ...s.listening.lessons, [a.id]: a.test ? 'tested' : 'dismissed' } })
      if (a.test) next = pushHandoff(next, {
        agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Lesson test', action: 'atlas-fill', chain: ['echo', 'atlas'],
        title: `Test: ${l.text}`, context: l.evidence, why: 'You asked Atlas to test one of Echo’s lessons.', confidence: 66, link: '/publishing',
        preview: { type: 'post', network: /tiktok/i.test(l.text) ? 'tiktok' : /linkedin/i.test(l.text) ? 'linkedin' : 'instagram', slot: 'This week', text: [l.idea] },
      }, 'Atlas drafted a test post. It’s on your Desk.')
      return next
    }
    case 'listening/trend':
      return a.hand ? handTrend(s, a.id) : patch(s, { trends: { ...s.listening.trends, [a.id]: 'dismissed' } })
    case 'listening/mention': {
      const m = MENTIONS.find(x => x.id === a.id)
      if (!m) return s
      const next = patch(s, { mentions: { ...s.listening.mentions, [a.id]: a.action } })
      return a.action === 'replied'
        ? pushToast(pushLog(next, { agent: 'nova', text: `Drafted a reply to ${m.author} on ${m.network}`, status: 'done', reason: 'You asked from Listening', undoMinutes: 10 }), { agent: 'nova', text: `Nova is replying to ${m.author}` })
        : pushLog(next, { agent: 'echo', text: `Hid ${m.author}’s mention from the feed`, status: 'done', reason: 'You hid it' })
    }
    case 'listening/searchSave': {
      const exists = s.listening.searches.some(x => x.id === a.search.id)
      const searches = exists ? s.listening.searches.map(x => (x.id === a.search.id ? a.search : x)) : [{ ...a.search, id: a.search.id || uid('s'), volume: 0 }, ...s.listening.searches]
      return pushToast(patch(s, { searches }), { agent: 'echo', text: exists ? `Search “${a.search.name}” updated` : `Echo started tracking “${a.search.name}”. First results within the hour.` })
    }
    case 'listening/searchToggle':
      return patch(s, { searches: s.listening.searches.map(x => (x.id === a.id ? { ...x, paused: !x.paused } : x)) })
    case 'listening/searchDelete':
      return patch(s, { searches: s.listening.searches.filter(x => x.id !== a.id) })
    case 'listening/mentions':
      return mentionsBulk(s, a)
    case 'listening/alertSave': {
      const exists = s.listening.alerts.some(x => x.id === a.alert.id)
      const alerts = exists ? s.listening.alerts.map(x => (x.id === a.alert.id ? a.alert : x)) : [...s.listening.alerts, { ...a.alert, id: uid('la') }]
      return pushToast(patch(s, { alerts }), { agent: 'echo', text: exists ? 'Alert updated' : 'Echo will raise this alert on your Desk' })
    }
    case 'listening/alertToggle':
      return patch(s, { alerts: s.listening.alerts.map(x => (x.id === a.id ? { ...x, on: !x.on } : x)) })
    case 'listening/alertDelete':
      return patch(s, { alerts: s.listening.alerts.filter(x => x.id !== a.id) })
  }
}

/** The sentiment you see: your correction if you made one, Echo's otherwise. */
export const sentimentOf = (s: State, m: Mention): Sentiment => s.listening.sentiment[m.id] ?? m.sentiment

const firstName = (author: string) => author.replace(/^@/, '').split(/[._\s]/)[0].replace(/^\w/, c => c.toUpperCase())

/** Nova's first draft for a mention, by mood. */
function novaDraft(m: Mention, mood: Sentiment) {
  const n = firstName(m.author)
  if (mood === 'positive') return `Thanks ${n}, that made the team’s day. ${m.product ? `Enjoy the ${m.product} out there.` : 'See you on the trail.'}`
  if (mood === 'negative') return `${n}, sorry to read this. ${m.product ? `That’s not how the ${m.product} should behave.` : 'That’s not the experience we want for you.'} Can you send us a DM with your order number? We’ll sort it out today.`
  return `Hi ${n}, thanks for the mention. Happy to help if you have any question about ${m.product ?? 'our gear'}.`
}

function mentionsBulk(s: State, a: Extract<ListeningAction, { type: 'listening/mentions' }>): State {
  const ms = MENTIONS.filter(m => a.ids.includes(m.id))
  if (!ms.length) return s
  const n = ms.length
  const noun = `${n} mention${n > 1 ? 's' : ''}`
  switch (a.op) {
    case 'nova': {
      let next = s
      const skipped: string[] = []
      for (const m of ms) {
        const network = MENTION_NET[m.network]
        if (!network || s.listening.mentions[m.id] === 'replied') { if (!network) skipped.push(m.network); continue }
        const mood = sentimentOf(s, m)
        next = pushHandoff(next, {
          agent: 'nova', kind: 'approval', urgency: mood === 'negative' ? 'today' : 'week', topic: 'Mention reply', action: mood === 'negative' ? 'nova-complaint' : 'nova-faq',
          chain: ['echo', 'nova'], ref: `mention:${m.id}`, title: `Reply to ${m.author}’s mention`, context: `${m.network} · reach ${m.reach.toLocaleString('en-GB')}${m.product ? ` · ${m.product}` : ''}`,
          why: 'You asked Nova to reply from Listening.', confidence: mood === 'negative' ? 76 : 88, link: '/listening/mentions',
          preview: { type: 'reply', network, author: m.author, text: m.text, draft: [novaDraft(m, mood)] },
        })
        next = patch(next, { mentions: { ...next.listening.mentions, [m.id]: 'replied' } })
      }
      const made = n - skipped.length
      next = pushLog(next, { agent: 'nova', text: `Drafted ${made} repl${made === 1 ? 'y' : 'ies'} to mentions, waiting on your Desk`, status: 'done', reason: 'You asked from Listening' })
      return pushToast(next, { agent: 'nova', text: `${made} draft${made === 1 ? '' : 's'} on your Desk${skipped.length ? `. ${skipped.length} on ${[...new Set(skipped)].join(' and ')} can’t be answered from here.` : '.'}`, link: '/' })
    }
    case 'hide':
    case 'unhide': {
      const mentions = { ...s.listening.mentions }
      for (const m of ms) { if (a.op === 'hide') mentions[m.id] = 'hidden'; else delete mentions[m.id] }
      return pushLog(patch(s, { mentions }), { agent: 'echo', text: `${a.op === 'hide' ? 'Hid' : 'Brought back'} ${noun}`, status: 'done', reason: 'Your call from Listening' })
    }
    case 'tag': {
      if (!a.tag) return s
      const tags = { ...s.listening.tags }
      for (const m of ms) tags[m.id] = [...new Set([...(tags[m.id] ?? []), a.tag])]
      return pushToast(patch(s, { tags }), { agent: 'echo', text: `Tagged ${noun} “${a.tag}”` })
    }
    case 'sentiment': {
      if (!a.sentiment) return s
      const sentiment = { ...s.listening.sentiment }
      for (const m of ms) sentiment[m.id] = a.sentiment
      return pushLog(patch(s, { sentiment }), { agent: 'echo', text: `You marked ${noun} as ${a.sentiment}. Echo learns from it.`, status: 'edited', reason: 'Sentiment correction' })
    }
    case 'atlas': {
      let next = s
      for (const m of ms) {
        next = pushHandoff(next, {
          agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Mention to post', action: 'atlas-fill', chain: ['echo', 'atlas'], ref: `mention-post:${m.id}`,
          title: `Post from ${m.author}’s mention`, context: m.text, why: 'You handed this mention to Atlas from Listening.', confidence: 72, link: '/publishing',
          preview: { type: 'post', network: MENTION_NET[m.network] ?? 'instagram', slot: 'Tomorrow, 18:00', text: [`“${m.text}” Thanks ${m.author}. ${m.product ? `The ${m.product}, ` : ''}seen by you.`] },
        })
        next = patch(next, { mentions: { ...next.listening.mentions, [m.id]: next.listening.mentions[m.id] ?? 'handed' } })
      }
      return pushToast(next, { agent: 'atlas', text: `Atlas drafted ${n} post${n > 1 ? 's' : ''} from these mentions. They’re on your Desk.`, link: '/' })
    }
  }
}

const EVENT_OF = (h: Handoff): CompEvent | undefined => {
  if (h.id === 'h-peakline' || /Peakline cut/.test(h.title)) return EVENTS.find(e => e.id === 'e-peak-price')
  if (/Trailkind/.test(h.title)) return EVENTS.find(e => e.id === 'e-trail-viral')
  if (/Norrø/.test(h.title)) return EVENTS.find(e => e.id === 'e-norro-repair')
  if (/Basecamp/.test(h.title)) return EVENTS.find(e => e.id === 'e-basecamp-recall')
}

export function onResolveListening(s: State, h: Handoff, d: Decision): State {
  if (h.topic === 'Competitor') {
    const ev = EVENT_OF(h)
    if (!ev) return s
    if (d.kind === 'reject') return setEvent(s, ev.id, { status: 'dismissed', move: 'Dismissed from the Desk', result: 'Dismissed. Echo keeps watching.' })
    if (d.kind !== 'option') return s
    const move = ev.moves.find(m => m.label === d.option)
      ?? (/atlas|counter/i.test(d.option) ? { label: d.option, agent: 'atlas', kind: 'counter' } as Move
        : /sage/i.test(d.option) ? { label: d.option, agent: 'sage', kind: 'sage' } as Move
        : /sales/i.test(d.option) ? { label: d.option, agent: 'echo', kind: 'sales' } as Move
        : /nova/i.test(d.option) ? { label: d.option, agent: 'nova', kind: 'nova' } as Move
        : /lesson/i.test(d.option) ? { label: d.option, agent: 'echo', kind: 'lesson' } as Move
        : { label: d.option, agent: 'echo', kind: 'none' } as Move)
    return applyMove(s, ev, move)
  }
  if (h.topic === 'Trend' && d.kind === 'approve') return handTrend(s, 't3')
  if (h.id === 'h-trend' && d.kind === 'approve') return patch(s, { trends: { ...s.listening.trends, t1: 'handed' } })
  if (h.id === 'h-creator' && d.kind === 'option') {
    return d.index === 0 ? pushLog(s, { agent: 'nova', text: 'Sent a thank-you DM to @camille.outdoors', status: 'approved', reason: 'Your call on Echo’s creator alert', undoMinutes: 10 })
      : d.index === 1 ? pushLog(s, { agent: 'echo', text: 'Added @camille.outdoors to the creator list', status: 'approved' }) : s
  }
  return s
}
