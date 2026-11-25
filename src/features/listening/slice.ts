import type { State } from '../../app/state'
import type { Decision, Handoff, LogEntry, Network } from '../../app/types'
import { actionOf, agentOf, now, pushHandoff, notify, pushLog, removeHandoff, uid } from '../../app/core'
import { DEMO_START, hhmm, MIN } from '../../app/time'
import { EVENTS, LESSONS, SEARCHES, TRENDS, type CompEvent, type Mention, type Move, type Search, type Sentiment } from '../../data/listening'
import { competitorName, eventsOf, firstEvent, FIRST_EVENT_MS, activeSearches, alertSentence, alertValue, alertWindow, competitorCap, mentionOf, negativeLastHour, searchCap, sentimentOf, spikeFactor, spikeMentions, USUAL_NEGATIVE_PER_HOUR, watchedCount } from './model'
import type { Alert } from '../insights/alerts'
import { briefSage } from '../strategy/slice'

/** A competitor Echo watches, with the accounts it follows on each network. */
export type Watched = { id: string; name: string; website: string; accounts: { network: Network; handle: string }[]; tracking: boolean; since: number; custom?: boolean }

const WATCH: Watched[] = [
  { id: 'peakline', name: 'Peakline', website: 'peakline.eu', tracking: true, since: Date.UTC(2025, 3, 2), accounts: [{ network: 'instagram', handle: '@peakline' }, { network: 'tiktok', handle: '@peakline' }, { network: 'facebook', handle: 'Peakline' }, { network: 'youtube', handle: '@peaklineoutdoor' }] },
  { id: 'norro', name: 'Norrø', website: 'norro.no', tracking: true, since: Date.UTC(2025, 3, 2), accounts: [{ network: 'instagram', handle: '@norro_official' }, { network: 'linkedin', handle: 'Norrø AS' }, { network: 'youtube', handle: '@norrofilms' }] },
  { id: 'trailkind', name: 'Trailkind', website: 'trailkind.com', tracking: true, since: Date.UTC(2025, 6, 14), accounts: [{ network: 'tiktok', handle: '@trailkind' }, { network: 'instagram', handle: '@trailkind' }, { network: 'x', handle: '@trailkind' }] },
  { id: 'basecamp', name: 'Basecamp Co.', website: 'basecamp-co.fr', tracking: true, since: Date.UTC(2025, 3, 2), accounts: [{ network: 'facebook', handle: 'Basecamp Co.' }, { network: 'instagram', handle: '@basecampco' }, { network: 'x', handle: '@basecampco' }] },
]

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
  watch: Watched[]
  /** Mentions Echo filed during the session, newest first (see allMentions). */
  live: Mention[]
  /** The spike card that had Echo pause Atlas, while Atlas is still paused for it. */
  pausedAtlas?: string
  /** Echo keeps an eye on a spike until `until`, then reports. */
  watchSpike?: { until: number; from: number; card: string }
  /** Alert rules: when each last fired, and the mentions behind it. */
  fired: Record<string, number>
  hits: Record<string, string[]>
  /** Last time Echo checked her alert rules. */
  checkedAt?: number
  /** Events Echo raised on competitors you added. */
  customEvents: CompEvent[]
}

const ALERTS: Alert[] = [
  { id: 'la1', subject: 'brand', condition: 'gets more than', threshold: 15, unit: ' negative mentions in 1 h', to: 'claire', on: true },
  { id: 'la2', subject: 'competitors', condition: 'gets more than', threshold: 200, unit: ' mentions in 1 h', to: 'desk', on: true },
  { id: 'la3', subject: 's9', condition: 'gets more than', threshold: 1, unit: ' mention from press', to: 'claire', on: true },
]

export const initialListening = (): ListeningState => ({ events: {}, lessons: {}, trends: {}, mentions: {}, searches: structuredClone(SEARCHES), sentiment: {}, tags: {}, alerts: structuredClone(ALERTS), watch: structuredClone(WATCH), live: [],
  // The press mention on “PFAS rainwear” came in overnight: Echo already raised it (Nova's PFAS card).
  fired: { la3: DEMO_START }, hits: {}, customEvents: [] })

export const MENTION_TAGS = ['Product feedback', 'Creator', 'Press', 'Support', 'Competitor']
export const MENTION_NET: Record<string, Network | undefined> = { Instagram: 'instagram', TikTok: 'tiktok', X: 'x', LinkedIn: 'linkedin', Facebook: 'facebook', YouTube: 'youtube' }
export type MentionOp = 'nova' | 'hide' | 'unhide' | 'tag' | 'sentiment' | 'atlas'

export type ListeningAction =
  | { type: 'listening/move'; event: string; index: number }
  | { type: 'listening/watchSave'; w: Watched }
  | { type: 'listening/watchToggle'; id: string }
  | { type: 'listening/watchDelete'; id: string }
  | { type: 'listening/lesson'; id: string; test: boolean }
  | { type: 'listening/trend'; id: string; hand: boolean }
  | { type: 'listening/reopen'; kind: 'trends' | 'lessons' | 'events'; id: string }
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
      })
      return setEvent(next, ev.id, { status: 'handed', move: move.label, result: 'Atlas drafted it. The post is on your Desk.' })
    }
    case 'sage': {
      const brief = /repair/i.test(move.label) ? 'Repair Week in January: answer Norrø with our repair numbers, goal 1,000 repair requests.'
        : /customer-story/i.test(move.label) ? 'Customer-story series in January, goal 2,000 new followers.'
        : `Response campaign to ${ev.title}: talk durability, not price. Goal 300 orders of the Ridge 28L.`
      return setEvent(briefSage(s, brief, `Echo · ${ev.title}`), ev.id, { status: 'handed', move: move.label, result: 'Sage built a campaign plan. It’s on your Desk.' })
    }
    case 'sales': return tellSales(s, ev, move)
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
    why: 'You handed this trend to Atlas from Listening.', confidence: 70, link: '/publishing/calendar',
    preview: { type: 'post', network: /tiktok/i.test(t.networks) ? 'tiktok' : /linkedin/i.test(t.networks) ? 'linkedin' : 'instagram', slot: 'Tomorrow, 18:00', text: [`Our take on ${t.name.toLowerCase()}, the Fernway way. Draft v1: edit before approving.`] },
  })
  return patch(next, { trends: { ...next.listening.trends, [id]: 'handed' } })
}

export function reduceListening(s: State, a: ListeningAction): State {
  const next = reduceListeningRaw(s, a)
  return next === s ? s : syncGuardrails(next)
}

function reduceListeningRaw(s: State, a: ListeningAction): State {
  switch (a.type) {
    case 'listening/watchSave': {
      const exists = s.listening.watch.some(w => w.id === a.w.id)
      if (!exists && a.w.tracking && watchedCount(s) >= competitorCap(s)) return capped(s, `Echo already watches ${competitorCap(s)} competitors, your cap. Pause one first, or raise the cap in Echo’s guardrails.`)
      const watch = exists ? s.listening.watch.map(w => (w.id === a.w.id ? a.w : w)) : [...s.listening.watch, { ...a.w, since: now(s) }]
      const next = { ...s, listening: { ...s.listening, watch } }
      return exists ? next : notify(pushLog(next, { agent: 'echo', text: `Started watching ${a.w.name} on ${a.w.accounts.length} account${a.w.accounts.length > 1 ? 's' : ''}`, status: 'done', reason: 'You added a competitor' }), 'listening', `Echo is reading ${a.w.name}’s last 30 days. Benchmark in about 10 minutes, first events within the hour.`)
    }
    case 'listening/watchToggle': {
      const w = s.listening.watch.find(x => x.id === a.id)!
      if (!w.tracking && watchedCount(s) >= competitorCap(s)) return capped(s, `Echo already watches ${competitorCap(s)} competitors, your cap. Pause one first, or raise the cap in Echo’s guardrails.`)
      const next = { ...s, listening: { ...s.listening, watch: s.listening.watch.map(x => (x.id === a.id ? { ...x, tracking: !x.tracking } : x)) } }
      return pushLog(next, { agent: 'echo', text: w.tracking ? `Paused watching ${w.name}` : `Resumed watching ${w.name}`, status: 'done', reason: 'You changed the competitor list' })
    }
    case 'listening/watchDelete': {
      const w = s.listening.watch.find(x => x.id === a.id)!
      return pushLog({ ...s, listening: { ...s.listening, watch: s.listening.watch.filter(x => x.id !== a.id) } }, { agent: 'echo', text: `Stopped watching ${w.name} and removed it`, status: 'done', reason: 'You changed the competitor list' })
    }
    case 'listening/move': {
      const ev = eventsOf(s).find(e => e.id === a.event)
      const move = ev?.moves[a.index]
      if (!ev || !move) return s
      // The event is settled here: every Desk card about it goes too.
      const next = { ...s, handoffs: s.handoffs.filter(h => !(h.topic === 'Competitor' && EVENT_OF(s, h)?.id === ev.id)) }
      return applyMove(next, ev, move)
    }
    case 'listening/lesson': {
      const l = LESSONS.find(x => x.id === a.id)
      if (!l) return s
      let next = patch(s, { lessons: { ...s.listening.lessons, [a.id]: a.test ? 'tested' : 'dismissed' } })
      if (a.test) next = pushHandoff(next, {
        agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Lesson test', action: 'atlas-fill', chain: ['echo', 'atlas'],
        title: `Test: ${l.text}`, context: l.evidence, why: 'You asked Atlas to test one of Echo’s lessons.', confidence: 66, link: '/publishing/calendar',
        preview: { type: 'post', network: /tiktok/i.test(l.text) ? 'tiktok' : /linkedin/i.test(l.text) ? 'linkedin' : 'instagram', slot: 'This week', text: [l.idea] },
      })
      return next
    }
    case 'listening/reopen': {
      const rest = { ...s.listening[a.kind] }
      delete rest[a.id]
      return patch(s, { [a.kind]: rest })
    }
    case 'listening/trend':
      return a.hand ? handTrend(s, a.id) : patch(s, { trends: { ...s.listening.trends, [a.id]: 'dismissed' } })
    case 'listening/mention': {
      const m = mentionOf(s, a.id)
      if (!m) return s
      const next = patch(s, { mentions: { ...s.listening.mentions, [a.id]: a.action } })
      return a.action === 'replied'
        ? notify(pushLog(next, { agent: 'nova', text: `Drafted a reply to ${m.author} on ${m.network}`, status: 'done', reason: 'You asked from Listening' }), 'listening', `Nova is drafting a reply to ${m.author}.`, { link: { to: '/', label: 'Review on Desk' } })
        : pushLog(next, { agent: 'echo', text: `Hid ${m.author}’s mention from the feed`, status: 'done', reason: 'You hid it' })
    }
    case 'listening/searchSave': {
      const exists = s.listening.searches.some(x => x.id === a.search.id)
      if (!exists && !a.search.paused && activeSearches(s) >= searchCap(s)) return capped(s, SEARCH_CAP(s))
      // A brand-new search starts collecting now; one brought back by Undo keeps its data.
      const fresh = !exists && !a.search.id
      const searches = exists ? s.listening.searches.map(x => (x.id === a.search.id ? a.search : x)) : [fresh ? { ...a.search, id: uid('s'), volume: 0, startedAt: now(s) } : a.search, ...s.listening.searches]
      const next = patch(s, { searches })
      return fresh ? notify(pushLog(next, { agent: 'echo', text: `Started tracking “${a.search.name}”`, status: 'done', reason: 'You created a search', link: '/listening/searches' }), 'listening', `Echo is collecting the last 7 days for “${a.search.name}”. Results in about 10 minutes.`) : next
    }
    case 'listening/searchToggle': {
      const x = s.listening.searches.find(y => y.id === a.id)
      if (x?.paused && activeSearches(s) >= searchCap(s)) return capped(s, SEARCH_CAP(s))
      return patch(s, { searches: s.listening.searches.map(y => (y.id === a.id ? { ...y, paused: !y.paused } : y)) })
    }
    case 'listening/searchDelete':
      return patch(s, { searches: s.listening.searches.filter(x => x.id !== a.id) })
    case 'listening/mentions':
      return mentionsBulk(s, a)
    case 'listening/alertSave': {
      const exists = s.listening.alerts.some(x => x.id === a.alert.id)
      const alerts = exists ? s.listening.alerts.map(x => (x.id === a.alert.id ? a.alert : x)) : [...s.listening.alerts, { ...a.alert, id: uid('la') }]
      return patch(s, { alerts })
    }
    case 'listening/alertToggle':
      return patch(s, { alerts: s.listening.alerts.map(x => (x.id === a.id ? { ...x, on: !x.on } : x)) })
    case 'listening/alertDelete':
      return patch(s, { alerts: s.listening.alerts.filter(x => x.id !== a.id) })
  }
}

export { sentimentOf }

const firstName = (author: string) => author.replace(/^@/, '').split(/[._\s]/)[0].replace(/^\w/, c => c.toUpperCase())

/** Nova's first draft for a mention, by mood. */
function novaDraft(m: Mention, mood: Sentiment) {
  const n = firstName(m.author)
  if (mood === 'positive') return `Thanks ${n}, that made the team’s day. ${m.product ? `Enjoy the ${m.product} out there.` : 'See you on the trail.'}`
  if (mood === 'negative') return `${n}, sorry to read this. ${m.product ? `That’s not how the ${m.product} should behave.` : 'That’s not the experience we want for you.'} Can you send us a DM with your order number? We’ll sort it out today.`
  return `Hi ${n}, thanks for the mention. Happy to help if you have any question about ${m.product ?? 'our gear'}.`
}

function mentionsBulk(s: State, a: Extract<ListeningAction, { type: 'listening/mentions' }>): State {
  const ms = a.ids.map(id => mentionOf(s, id)).filter((m): m is Mention => !!m)
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
      return notify(next, 'listening', `Nova drafted ${made} repl${made === 1 ? 'y' : 'ies'}${skipped.length ? `. ${skipped.length} on ${[...new Set(skipped)].join(' and ')} can’t be answered from here.` : '.'}`, { link: { to: '/', label: 'Review on Desk' } })
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
      return patch(s, { tags })
    }
    case 'sentiment': {
      if (!a.sentiment) return s
      const sentiment = { ...s.listening.sentiment }
      for (const m of ms) sentiment[m.id] = a.sentiment
      return pushLog(patch(s, { sentiment }), { agent: 'echo', text: `You marked ${noun} as ${a.sentiment}. Echo learns from it.`, status: 'edited', reason: 'Sentiment correction' })
    }
    case 'atlas': {
      let next = s
      // Handing the same mention twice would put two identical cards on the Desk.
      for (const m of ms.filter(m => !s.handoffs.some(h => h.ref === `mention-post:${m.id}`))) {
        next = pushHandoff(next, {
          agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Mention to post', action: 'atlas-fill', chain: ['echo', 'atlas'], ref: `mention-post:${m.id}`,
          title: `Post from ${m.author}’s mention`, context: m.text, why: 'You handed this mention to Atlas from Listening.', confidence: 72, link: '/publishing/calendar',
          preview: { type: 'post', network: MENTION_NET[m.network] ?? 'instagram', slot: 'Tomorrow, 18:00', text: [`“${m.text}” Thanks ${m.author}. ${m.product ? `The ${m.product}, ` : ''}seen by you.`] },
        })
        next = patch(next, { mentions: { ...next.listening.mentions, [m.id]: next.listening.mentions[m.id] ?? 'handed' } })
      }
      return notify(next, 'listening', `Atlas drafted ${n} post${n > 1 ? 's' : ''} from these mentions.`, { link: { to: '/', label: 'Review on Desk' } })
    }
  }
}

const EVENT_OF = (s: State, h: Handoff): CompEvent | undefined => {
  const own = h.ref ? s.listening.customEvents.find(e => e.id === h.ref) : undefined
  if (own) return own
  if (h.id === 'h-peakline' || /Peakline cut/.test(h.title)) return EVENTS.find(e => e.id === 'e-peak-price')
  if (/Trailkind/.test(h.title)) return EVENTS.find(e => e.id === 'e-trail-viral')
  if (/Norrø/.test(h.title)) return EVENTS.find(e => e.id === 'e-norro-repair')
  if (/Basecamp/.test(h.title)) return EVENTS.find(e => e.id === 'e-basecamp-recall')
}

export function onResolveListening(s: State, h: Handoff, d: Decision): State {
  if (h.ref?.startsWith('sales:')) {
    const ev = EVENTS.find(e => e.id === h.ref!.slice('sales:'.length))
    if (!ev) return s
    if (d.kind === 'approve') return sendSales(s, ev, d.edited ?? salesEmail(ev), 'You approved the email from the Desk')
    if (d.kind === 'reject') return patch(s, { events: Object.fromEntries(Object.entries(s.listening.events).filter(([k]) => k !== ev.id)) })
    return s
  }
  if (h.agent === 'echo' && h.ref === SPIKE_REF && d.kind === 'option') return spikeMove(s, h, d.index)
  if (h.ref?.startsWith('statement:') && d.kind === 'approve') return resumeAtlas(s, 'Claire’s statement is out')
  if (h.ref === SPIKE_REPLIES && d.kind === 'approve') return markSpikeReplied(s, true)
  if (h.ref?.startsWith('alert:') && d.kind === 'option' && d.index === 0) return mentionsBulk(s, { type: 'listening/mentions', ids: s.listening.hits[h.ref.slice('alert:'.length)] ?? [], op: 'nova' })
  if (h.topic === 'Competitor') {
    const ev = EVENT_OF(s, h)
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

/* ---------- Negative spike ---------- */

export const SPIKE_REF = 'ev-spike'
const SPIKE_REPLIES = 'spike-replies'
const STATEMENT = 'We’ve seen your posts about the Storm Jacket seams. We’re sorry. Our workshop is checking the affected batch today. If yours leaks, send us your order number: we repair or replace it, free.'
const CARE = 'Sorry about this. That’s not how the Storm Jacket should behave. Send us your order number in DM: we’ll repair or replace it for free. Until then, wash it at 30°C, no softener, and tumble dry low to reactivate the seam tape.'

const spikeNow = (s: State) => s.listening.live.filter(m => m.id.startsWith('spike-') && sentimentOf(s, m) === 'negative' && m.at > now(s) - 60 * MIN)

/**
 * Script event: a Reddit thread about the Storm Jacket seams brings 27 negative mentions in 40 minutes.
 * The mentions land in the feed; Echo's spike guardrail (3× her usual hourly volume) decides what reaches Sam,
 * by her level on “Raise a negative spike”: Suggest notes it for the digest, Draft raises it, Act pauses Atlas herself.
 */
export function raiseSpike(s: State, manual: boolean): State {
  if (!manual && agentOf(s, 'echo').status !== 'on') return s
  if (s.handoffs.some(h => h.ref === SPIKE_REF)) return s
  const live = [...spikeMentions(now(s)), ...s.listening.live.filter(m => !m.id.startsWith('spike-'))]
  let next = patch(s, { live })
  const { count, series, ratio } = negativeLastHour(next)
  if (ratio < spikeFactor(next)) return next
  const ms = spikeNow(next)
  const nets = (n: string) => ms.filter(m => m.network === n).length
  const top = [...ms].sort((x, y) => y.reach - x.reach)[0]
  const level = actionOf(next, 'echo', 'echo-spike')?.autonomy ?? 'draft'
  const times = `${ratio.toFixed(1)}×`
  if (level === 'suggest') return pushLog(next, { agent: 'echo', text: `Negative mentions at ${count} an hour, ${times} usual: Storm Jacket seams. In tonight’s digest.`, status: 'done', reason: 'Negative spikes, set to Suggest', link: '/listening/mentions?sentiment=negative' })
  const h: Omit<Handoff, 'id' | 'at'> = {
    agent: 'echo', kind: 'alert', group: 'need', urgency: 'urgent', topic: 'Negative spike', action: 'echo-spike', ref: SPIKE_REF,
    title: `${ms.length} negative mentions in 40 minutes about Storm Jacket seams`,
    context: `${nets('Reddit')} on Reddit, ${nets('X')} on X, ${ms.length - nets('Reddit') - nets('X')} elsewhere. Loudest: ${top.author}, “${top.text}”`,
    why: `${count} negative mentions in the last hour, ${times} my usual ${USUAL_NEGATIVE_PER_HOUR}. My spike threshold is ${spikeFactor(next)}×.`, confidence: 73,
    link: '/listening/mentions?sentiment=negative&product=Storm%20Jacket',
    options: [{ label: 'Pause Atlas and ask Claire for a statement', recommended: true }, { label: 'Nova sends the care-instructions reply to each mention' }, { label: 'Monitor for 2 hours' }],
    preview: { type: 'metric', label: 'Negative mentions per hour', value: String(count), delta: `${times} usual`, down: true, series },
    sources: [{ label: `${ms.length} mentions`, from: 'Listening › Mentions · Storm Jacket · negative' }],
  }
  const id = uid('h')
  next = pushHandoff(next, { ...h, id })
  if (level !== 'act') return checkAlerts(next)
  // On Act, Echo makes the recommended move herself, through the same effect as Sam's choice, with a real Undo.
  const card = next.handoffs.find(x => x.id === id)!
  next = removeHandoff(spikeMove(next, card, 0), id)
  return pushLog(next, { agent: 'echo', text: `Handled on her own: ${card.title}`, status: 'done', reason: 'Negative spikes, set to Act', link: card.link, undoMinutes: 30, restore: [card] })
}

function spikeMove(s: State, h: Handoff, index: number): State {
  const ms = spikeNow(s).length || s.listening.live.filter(m => m.id.startsWith('spike-')).length
  if (index === 0) {
    let next = s
    if (agentOf(s, 'atlas').status === 'on') {
      next = { ...next, agents: next.agents.map(a => (a.id === 'atlas' ? { ...a, status: 'paused' as const, pausedUntil: 'Claire’s statement is out' } : a)) }
      next = patch(next, { pausedAtlas: h.id })
      const today = s.publishing.posts.filter(p => p.status === 'scheduled' && new Date(p.at).toDateString() === new Date(now(s)).toDateString()).length
      next = pushLog(next, { agent: 'atlas', text: `Paused for the Storm Jacket spike. No new drafts or ideas until Claire’s statement is out${today ? `; ${today} post${today > 1 ? 's' : ''} already scheduled today ${today > 1 ? 'stay' : 'stays'} in the calendar` : ''}`, status: 'done', reason: 'Echo’s negative spike', link: '/publishing/calendar' })
    }
    const t = now(next)
    return pushHandoff(next, {
      agent: 'echo', kind: 'approval', urgency: 'urgent', topic: 'Negative spike', ref: `statement:${h.id}`, lane: 'claire', claire: { askedAt: t, dueAt: t + 90_000 },
      title: 'Statement on the Storm Jacket seams', context: `${ms} negative mentions since ${hhmm(t - 40 * MIN)}. Atlas is paused until this is out.`,
      why: 'Public statements go to Claire first (Playbook escalation).', confidence: 70, link: '/listening/mentions?sentiment=negative&product=Storm%20Jacket',
      preview: { type: 'post', network: 'x', slot: 'As soon as Claire approves', text: [STATEMENT] },
    })
  }
  if (index === 1) {
    return pushHandoff(s, {
      agent: 'nova', kind: 'approval', urgency: 'urgent', topic: 'Mention reply', action: 'nova-complaint', chain: ['echo', 'nova'], ref: SPIKE_REPLIES,
      title: `Reply to the ${ms} mentions about Storm Jacket seams`, context: 'One reply, adapted to each author’s first name, on Reddit, X, Instagram and TikTok.',
      why: 'You picked Echo’s second move on the spike.', confidence: 81, link: '/listening/mentions?sentiment=negative&product=Storm%20Jacket',
      preview: { type: 'reply', network: 'x', author: `${ms} people`, text: 'Storm Jacket seams leak after 3 washes.', draft: [CARE] },
    })
  }
  const t = now(s)
  return pushLog(patch(s, { watchSpike: { until: t + 120 * MIN, from: t, card: h.id } }), { agent: 'echo', text: `Watching the Storm Jacket seams thread. I’ll report at ${hhmm(t + 120 * MIN)}.`, status: 'done', reason: 'You asked Echo to monitor' })
}

function resumeAtlas(s: State, why: string): State {
  if (!s.listening.pausedAtlas || agentOf(s, 'atlas').status !== 'paused') return patch(s, { pausedAtlas: undefined })
  const next = patch({ ...s, agents: s.agents.map(a => (a.id === 'atlas' ? { ...a, status: 'on' as const, pausedUntil: undefined } : a)) }, { pausedAtlas: undefined })
  return pushLog(next, { agent: 'atlas', text: 'Back on shift after the Storm Jacket spike', status: 'done', reason: why })
}

function markSpikeReplied(s: State, on: boolean): State {
  const mentions = { ...s.listening.mentions }
  for (const m of s.listening.live) if (m.id.startsWith('spike-')) { if (on && !mentions[m.id]) mentions[m.id] = 'replied'; else if (!on && mentions[m.id] === 'replied') delete mentions[m.id] }
  return patch(s, { mentions })
}

/** Undo puts the spike back as it was: Atlas back on, the statement and the replies withdrawn. */
export function onUndoListening(s: State, entry: LogEntry): State {
  let next = s
  for (const h of entry.restore ?? []) {
    if (h.ref === SPIKE_REF) {
      if (next.listening.pausedAtlas === h.id) next = resumeAtlas(next, 'You undid the spike decision')
      next = { ...next, handoffs: next.handoffs.filter(x => x.ref !== `statement:${h.id}` && x.ref !== SPIKE_REPLIES) }
      if (next.listening.watchSpike?.card === h.id) next = patch(next, { watchSpike: undefined })
    }
    if (h.ref === SPIKE_REPLIES) next = markSpikeReplied(next, false)
    if (h.ref?.startsWith('statement:') && agentOf(next, 'atlas').status === 'on' && !next.listening.pausedAtlas) {
      const spike = h.ref.slice('statement:'.length)
      next = patch({ ...next, agents: next.agents.map(a => (a.id === 'atlas' ? { ...a, status: 'paused' as const, pausedUntil: 'Claire’s statement is out' } : a)) }, { pausedAtlas: spike })
    }
  }
  return next
}

/** Every minute Echo checks her alert rules; two hours after “Monitor”, she reports what the thread did. */
export const listeningDue = (s: State, t: number) => t >= (s.listening.checkedAt ?? 0) + MIN || (!!s.listening.watchSpike && s.listening.watchSpike.until <= t)
export function tickListening(s: State, t: number): State {
  const checked = t >= (s.listening.checkedAt ?? 0) + MIN ? newcomers(checkAlerts(patch(s, { checkedAt: t })), t) : s
  return watchTick(checked, t)
}

/** A competitor you added gets its first event within the hour, raised as Echo's level on competitor events says. */
function newcomers(s: State, t: number): State {
  let next = s
  for (const w of s.listening.watch) {
    if (!w.custom || !w.tracking || t < w.since + FIRST_EVENT_MS || next.listening.customEvents.some(e => e.competitor === w.id)) continue
    const ev = firstEvent(w, t)
    next = patch(next, { customEvents: [ev, ...next.listening.customEvents] })
    const level = actionOf(next, 'echo', 'echo-events')?.autonomy ?? 'act'
    next = level === 'suggest'
      ? pushLog(next, { agent: 'echo', text: `First move spotted at ${w.name}: ${ev.title}. In this week’s digest.`, status: 'done', reason: 'Competitor events, set to Suggest', link: `/listening/competitors/${ev.id}` })
      : pushHandoff(next, {
        agent: 'echo', kind: 'decision', urgency: 'week', topic: 'Competitor', action: 'echo-counter', ref: ev.id,
        title: ev.title, context: ev.proof.text, why: `First event since you added ${competitorName(next, w.id)}. ${ev.impactWhy}`, confidence: 66, link: `/listening/competitors/${ev.id}`,
        options: ev.moves.map((m, i) => ({ label: m.label, recommended: i === 0 })),
      })
  }
  return next
}
function watchTick(s: State, t: number): State {
  const w = s.listening.watchSpike
  if (!w || w.until > t) return s
  const since = s.listening.live.filter(m => m.product === 'Storm Jacket' && sentimentOf(s, m) === 'negative' && m.at > w.from).length
  const next = patch(s, { watchSpike: undefined })
  return pushHandoff(next, since >= USUAL_NEGATIVE_PER_HOUR * spikeFactor(s)
    ? { agent: 'echo', kind: 'alert', urgency: 'urgent', topic: 'Negative spike', title: `Storm Jacket seams: ${since} more negative mentions in 2 hours`, context: 'The thread is still growing.', why: 'You asked me to monitor for 2 hours.', confidence: 75, link: '/listening/mentions?sentiment=negative&product=Storm%20Jacket' }
    : { agent: 'echo', kind: 'news', urgency: 'week', topic: 'Negative spike', title: `Storm Jacket seams calmed down: ${since} new negative mention${since === 1 ? '' : 's'} in 2 hours`, context: `Back under my usual ${USUAL_NEGATIVE_PER_HOUR} an hour. No move needed.`, why: 'You asked me to monitor for 2 hours.', confidence: 80, link: '/listening/mentions?sentiment=negative&product=Storm%20Jacket', cta: { label: 'See the mentions', to: '/listening/mentions?sentiment=negative&product=Storm%20Jacket' } })
}

/* ---------- Telling the sales team ---------- */

const SALES_TO = 'sales@fernway.co'
export const salesEmail = (ev: CompEvent) => `Hi team, heads-up from Listening: ${ev.title}. ${ev.impactWhy} ${ev.read} Proof: ${ev.proof.metric}. Echo`

function sendSales(s: State, ev: CompEvent, body: string, reason: string): State {
  // An email can't be unsent: no Undo, and the Draft card says so before.
  const next = pushLog(s, { agent: 'echo', text: `Emailed the sales team (${SALES_TO}): ${ev.title}`, status: 'approved', reason, detail: { after: body } })
  return setEvent(next, ev.id, { status: 'done', move: 'Tell the sales team', result: `Sales team informed by email: “${ev.title}”.` })
}

/** Suggest: Echo says what sales should know. Draft: the email waits on your Desk. Act: Echo sends it. */
function tellSales(s: State, ev: CompEvent, move: Move): State {
  const level = actionOf(s, 'echo', 'echo-sales')?.autonomy ?? 'draft'
  if (level === 'act') return notify(sendSales(s, ev, salesEmail(ev), 'Sales digest, set to Act'), 'listening', `Echo emailed the sales team about ${ev.title}. Emails can’t be unsent.`)
  if (level === 'suggest') {
    return setEvent(s, ev.id, { status: 'done', move: move.label, result: `Echo suggests telling sales: ${ev.impactWhy} She doesn’t email at this level.` })
  }
  const next = pushHandoff(s, {
    agent: 'echo', kind: 'approval', urgency: 'today', topic: 'Sales digest', action: 'echo-sales', ref: `sales:${ev.id}`,
    title: `Email the sales team: ${ev.title}`, context: `To ${SALES_TO}. Once sent, it can’t be unsent.`,
    why: 'Emails to sales are set to Draft: you read it first.', confidence: 84, link: `/listening/competitors/${ev.id}`,
    preview: { type: 'text', label: `To ${SALES_TO}`, body: salesEmail(ev) },
  })
  return setEvent(next, ev.id, { status: 'handed', move: move.label, result: 'Echo drafted the email to sales. It’s on your Desk.' })
}

/* ---------- Alert rules ---------- */

/** Evaluate every rule that's on and not quiet; a match raises a card (or joins the spike already on the Desk). */
export function checkAlerts(s: State): State {
  const t = now(s)
  let next = s
  for (const a of s.listening.alerts) {
    if (!a.on || t - (next.listening.fired[a.id] ?? -Infinity) < alertWindow(a)) continue
    const { value, ms } = alertValue(next, a)
    if (value < a.threshold) continue
    const sentence = alertSentence(next, a)
    next = patch(next, { fired: { ...next.listening.fired, [a.id]: t }, hits: { ...next.listening.hits, [a.id]: ms.map(m => m.id) } })
    const claire = a.to === 'claire' ? ' Claire is copied.' : ''
    const spike = next.handoffs.find(h => h.ref === SPIKE_REF)
    if (spike && /negative/.test(a.unit) && a.subject === 'brand') {
      next = pushLog(next, { agent: 'echo', text: `Your alert “${sentence}” matched (${value}): it’s the spike already on your Desk.${claire}`, status: 'done', reason: 'Alert rule', link: spike.link })
      continue
    }
    const top = [...ms].sort((x, y) => y.reach - x.reach).slice(0, 2)
    next = pushHandoff(next, {
      agent: 'echo', kind: 'alert', urgency: 'today', topic: 'Alert', action: 'echo-file', ref: `alert:${a.id}`,
      title: `${sentence.replace(/^“|”/g, '')}: ${value}${/%/.test(a.unit) ? '%' : ''} now`,
      context: top.length ? top.map(m => `${m.author}: “${m.text}”`).join(' · ') : 'Read from the searches’ hourly volume.',
      why: `Your alert rule: “${sentence}”.${claire}`, confidence: 90, link: a.subject === 'brand' || a.subject === 'competitors' ? '/listening/mentions' : '/listening/searches',
      options: ms.length ? [{ label: `Nova drafts replies to ${ms.length === 1 ? 'this mention' : `these ${ms.length} mentions`}`, recommended: true }, { label: 'Nothing to do' }] : undefined,
    })
    if (claire) next = pushLog(next, { agent: 'echo', text: `Copied Claire on your alert: ${sentence} (${value})`, status: 'done', reason: 'Alert rule' })
  }
  return next
}

/* ---------- Caps and guardrails ---------- */

const SEARCH_CAP = (s: State) => `All ${searchCap(s)} search slots are in use. Pause a search first, or raise the cap in Echo’s guardrails.`
const capped = (s: State, text: string) => notify(s, 'listening', text, { link: { to: '/agents/echo?tab=guardrails', label: 'Echo’s guardrails' } })

/** The counts in Echo's guardrails follow the state; the cap after “of” stays Sam's. */
function syncGuardrails(s: State): State {
  const names = s.listening.watch.filter(w => w.tracking).map(w => w.name).join(', ')
  const value = (id: string, text: (cap: string) => string) => <G extends { id: string; value: string }>(g: G): G => (g.id === id ? { ...g, value: text(g.value.match(/of (\d+)/)?.[1] ?? '') } : g)
  return { ...s, agents: s.agents.map(ag => ag.id !== 'echo' ? ag : { ...ag, guardrails: ag.guardrails
    .map(value('g2', cap => `${watchedCount(s)}${cap ? ` of ${cap}` : ''}: ${names || 'none'}`))
    .map(value('g3', cap => `${activeSearches(s)}${cap ? ` of ${cap}` : ''}`)) }) }
}
