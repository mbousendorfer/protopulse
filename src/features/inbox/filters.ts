// Inbox filters: one predicate shared by the Inbox, saved views and ⌘K, so the counts agree everywhere.
import type { Network } from '../../app/types'
import { DAY } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { ROSTER, type Assignee, type Conversation, type ConvType, type Sentiment } from '../../data/inbox'

export type Filters = {
  network?: Network; type?: ConvType; sentiment?: Sentiment; intent?: boolean
  date?: 'today' | '7d' | '30d'; who?: Assignee | 'none'; label?: string; review?: 'todo' | 'done'; q?: string
}
export type SavedView = { id: string; name: string; view: string; f: Filters }

export const DATES: Record<NonNullable<Filters['date']>, string> = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days' }
const TYPES: Record<ConvType, string> = { comment: 'comments', dm: 'messages', mention: 'mentions', review: 'reviews', ad: 'ad comments' }

const dayStart = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
const since = (d: NonNullable<Filters['date']>, now: number) => (d === 'today' ? dayStart(now) : now - (d === '7d' ? 7 : 30) * DAY)

export function matchFilters(c: Conversation, f: Filters, now: number) {
  return (!f.network || c.network === f.network) && (!f.type || c.type === f.type) && (!f.sentiment || c.sentiment === f.sentiment) &&
    (!f.intent || (c.intent ?? 0) >= 0.6) && (!f.date || c.at >= since(f.date, now)) &&
    (!f.who || (f.who === 'none' ? !c.assignee : c.assignee === f.who)) && (!f.label || !!c.labels?.includes(f.label)) &&
    (!f.review || (f.review === 'done') === !!c.reviewed) &&
    (!f.q || `${c.author} ${c.messages.map(m => m.text).join(' ')}`.toLowerCase().includes(f.q.toLowerCase()))
}

export const isEmpty = (f: Filters) => !Object.values(f).some(v => v !== undefined && v !== false && v !== '')

/** "negative Instagram messages from the last 7 days, assigned to Léo". */
export function describe(f: Filters) {
  const what = [f.review === 'todo' ? 'unreviewed' : f.review === 'done' ? 'reviewed' : '', f.sentiment ?? '', f.network ? NETWORK_LABEL[f.network] : '', f.type ? TYPES[f.type] : 'conversations'].filter(Boolean).join(' ')
  const extra = [
    f.date && (f.date === 'today' ? 'from today' : `from the ${DATES[f.date].toLowerCase()}`),
    f.label && `labelled “${f.label}”`, f.who && (f.who === 'none' ? 'not assigned' : `assigned to ${f.who === 'sam' ? 'you' : ROSTER[f.who].short}`),
    f.intent && 'with buying intent', f.q && `mentioning “${f.q}”`,
  ].filter(Boolean)
  const tail = extra.length > 1 ? `${extra.slice(0, -1).join(', ')} and ${extra[extra.length - 1]}` : extra[0] ?? ''
  return tail ? `${what} ${tail}` : what
}

const NETS: [RegExp, Network][] = [[/linkedin/, 'linkedin'], [/tiktok/, 'tiktok'], [/instagram|insta\b|\big\b/, 'instagram'], [/facebook|\bfb\b/, 'facebook'], [/youtube/, 'youtube'], [/\bx\b|twitter/, 'x'], [/google/, 'google'], [/trustpilot/, 'trustpilot']]

/** "show me negative Instagram DMs this week" → filters. Undefined when the sentence names no Inbox items. */
export function parseFilters(t: string): Filters | undefined {
  if (!/^(?:show|find|list|filter|open|which|what)\b/.test(t)) return
  const type: ConvType | undefined = /\bad comments?\b/.test(t) ? 'ad' : /\b(dms?|messages?|private)\b/.test(t) ? 'dm' : /\bcomments?\b/.test(t) ? 'comment' : /\bmentions?\b/.test(t) ? 'mention' : /\breviews?\b/.test(t) ? 'review' : undefined
  if (!type && !/\b(conversations?|inbox|items?)\b/.test(t)) return
  const who = t.match(/assigned to (me|claire|l[eé]o|yanis)/)?.[1]
  const f: Filters = {
    type, network: NETS.find(([re]) => re.test(t))?.[1],
    sentiment: /\bnegative|angry|unhappy\b/.test(t) ? 'negative' : /\bpositive|happy\b/.test(t) ? 'positive' : undefined,
    date: /\btoday\b/.test(t) ? 'today' : /this week|7 days|last week/.test(t) ? '7d' : /this month|30 days/.test(t) ? '30d' : undefined,
    review: /\bunreviewed|to review|not reviewed\b/.test(t) ? 'todo' : undefined,
    intent: /buying intent|want to buy|leads?\b/.test(t) || undefined,
    who: who === 'me' ? 'sam' : who === 'claire' ? 'claire' : who === 'yanis' ? 'yanis' : who ? 'leo' : /\bunassigned|not assigned\b/.test(t) ? 'none' : undefined,
  }
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as Filters
}

/** Filters as URL search params (⌘K opens the Inbox with them), and back. */
export const toSearch = (f: Filters) => new URLSearchParams(Object.entries(f).filter(([, v]) => v !== undefined && v !== false && v !== '').map(([k, v]) => [k, String(v)])).toString()
export function fromSearch(p: URLSearchParams): Filters | undefined {
  const f: Filters = {}
  for (const k of ['network', 'type', 'sentiment', 'date', 'who', 'review', 'q'] as const) { const v = p.get(k); if (v) (f as Record<string, string>)[k] = v }
  if (p.get('intent') === 'true') f.intent = true
  return isEmpty(f) ? undefined : f
}
