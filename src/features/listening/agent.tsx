// Echo · Listening: everything Echo plugs into the core (see src/app/agents-registry.ts).
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { useStore } from '../../app/store'
import { AlertsTable } from '../insights/alerts'
import { now } from '../../app/core'
import type { Network } from '../../app/types'
import { ago } from '../../app/time'
import { listeningDue, onResolveListening, onUndoListening, tickListening } from './slice'
import { listeningNeedsCount, competitorName, eventsOf, netLabel, networkRead, networkRows, creatorsOf, alertSubjects, moodCount, pct, recent, sentimentOf, topComplaints, WEEK } from './model'
import { SCRIPT } from './script'

declare module '../../data/command' {
  interface IntentTypes {
    competitor: { name: string }
    mentions: object
    creators: { rival?: string }
    benchmark: { network: Network; rival?: string }
  }
}

const startOfDay = (t: number) => new Date(new Date(t).toDateString()).getTime()
const NEG_LINK = '/listening/mentions?sentiment=negative'

const mentions = defineIntent({
  kind: 'mentions', owner: 'echo', order: 90,
  parse: t => (/negative|complain(t|ts)? about us|mentions/.test(t) && !/post/.test(t) ? { kind: 'mentions' } : undefined),
  bar: (_i, { s, go }) => {
    const week = recent(s, WEEK)
    const c = moodCount(s, week)
    const top = topComplaints(s, week).slice(0, 2)
    const about = top.length ? ` Most are about the ${top.map(([p, n]) => `${p} (${n})`).join(' and the ')}.` : ''
    return {
      text: `Last 7 days: ${c.negative} negative mention${c.negative === 1 ? '' : 's'} out of ${c.total}, ${pct(c.negative, c.total)}.${about} Opening Listening filtered on negative.`,
      sources: [`Echo’s mention feed, last 7 days (${c.total} mentions)`],
      after: () => setTimeout(() => go(NEG_LINK), 700),
    }
  },
  chat: (_i, { s }) => {
    const neg = recent(s, now(s) - startOfDay(now(s))).filter(m => sentimentOf(s, m) === 'negative').sort((a, b) => b.reach - a.reach)
    const top = topComplaints(s, neg)[0]
    return { replies: [{ from: 'echo',
      text: neg.length ? `${neg.length} negative mention${neg.length === 1 ? '' : 's'} today${top ? `, ${top[1]} about the ${top[0]}` : ''}. The ones reaching the most people:` : 'No negative mention today.',
      card: neg.length ? { type: 'list', items: neg.slice(0, 3).map(m => ({ title: `${m.author}: “${m.text}”`, agent: 'echo' as const, meta: `${m.network} · reach ${m.reach.toLocaleString('en-GB')} · ${ago(m.at, now(s))}`, link: NEG_LINK })) } : undefined }], effects: [] }
  },
})

/** Creators, all of them or the ones who also talk about a rival. Same list as Listening › Creators. */
function creatorAnswer(s: Parameters<typeof creatorsOf>[0], rival?: string) {
  const all = creatorsOf(s)
  const list = rival ? all.filter(c => c.also.some(a => a.competitor.toLowerCase().replace('ø', 'o').startsWith(rival.replace('ø', 'o')))) : all
  const fits = list.filter(c => c.fit && !s.listening.creators[c.handle])
  const who = rival ? `about ${list[0]?.also.find(a => a.competitor.toLowerCase().replace('ø', 'o').startsWith(rival.replace('ø', 'o')))?.competitor ?? rival}` : 'about Fernway'
  const text = !list.length ? `No creator I follow talks ${who}.`
    : `${list.length} creator${list.length > 1 ? 's' : ''} talk${list.length === 1 ? 's' : ''} ${who}: ${list.slice(0, 3).map(c => `${c.handle} (${Math.round(c.followers / 1000)}k${c.signed ? `, signed with ${c.signed}` : ''})`).join(', ')}.${fits.length ? ` Worth a collab: ${fits.map(c => c.handle).join(' and ')}.` : ''}`
  return { list, text }
}

const creators = defineIntent({
  kind: 'creators', owner: 'echo', order: 95,
  parse: t => (/creator|influencer/.test(t) ? { kind: 'creators', rival: t.match(/peakline|norr[øo]|trailkind|basecamp/)?.[0] } : undefined),
  bar: (i, { s, go }) => ({ text: creatorAnswer(s, i.rival).text, sources: ['Echo’s mention feed · authors reaching 5,000 people or more'], ctas: [{ label: 'Open Creators', primary: true, run: () => go('/listening/creators') }] }),
  chat: (i, { s }) => {
    const { list, text } = creatorAnswer(s, i.rival)
    return { replies: [{ from: 'echo', text, card: list.length ? { type: 'list', items: list.slice(0, 5).map(c => ({ title: `${c.handle} · ${c.name}`, agent: 'echo' as const, meta: `${c.followers.toLocaleString('en-GB')} people · ${c.fitWhy}`, link: `/listening/creators?c=${encodeURIComponent(c.handle)}` })) } : undefined }], effects: [] }
  },
})

const NETS: [RegExp, Network][] = [[/instagram|\big\b/, 'instagram'], [/tiktok/, 'tiktok'], [/linkedin/, 'linkedin'], [/facebook/, 'facebook'], [/youtube/, 'youtube']]
const RIVAL_ID: Record<string, string> = { peakline: 'peakline', norro: 'norro', 'norrø': 'norro', trailkind: 'trailkind', basecamp: 'basecamp' }

/** « How do we compare with Trailkind on TikTok? »: the same rows and reading as Benchmark › TikTok. */
const benchmark = defineIntent({
  kind: 'benchmark', owner: 'echo', order: 98,
  parse: t => {
    const n = NETS.find(([re]) => re.test(t))?.[1]
    if (!n || !/compar|\bvs\.?\b|versus|benchmark|against|beat/.test(t)) return undefined
    return { kind: 'benchmark', network: n, rival: RIVAL_ID[t.match(/peakline|norr[øo]|trailkind|basecamp/)?.[0] ?? ''] }
  },
  bar: (i, { s, go }) => {
    const r = networkRead(s, i.network, i.rival)
    return { text: r.text, sources: [`Benchmark · ${netLabel(i.network)} · last 30 days`, 'Fernway’s numbers: Iris’s analytics'], ctas: [{ label: `Open the ${netLabel(i.network)} benchmark`, primary: true, run: () => go(`/listening/competitors/benchmark?net=${i.network}`) }] }
  },
  chat: (i, { s }) => {
    const r = networkRead(s, i.network, i.rival)
    const rows = networkRows(s, i.network)
    return { replies: [{ from: 'echo', text: r.text, card: { type: 'list', items: rows.map(x => ({ title: `${x.rank}. ${x.name}`, agent: 'echo' as const, meta: `${x.er}% engagement · ${x.perWeek} posts a week · ${(x.followers / 1000).toFixed(0)}k followers`, link: `/listening/competitors/benchmark?net=${i.network}` })) } }], effects: [] }
  },
})

const competitor = defineIntent({
  kind: 'competitor', owner: 'echo', order: 100,
  parse: t => (/peakline|norr[øo]|trailkind|basecamp|competitor|rival/.test(t) ? { kind: 'competitor', name: t.match(/peakline|norr[øo]|trailkind|basecamp/)?.[0] ?? 'competitors' } : undefined),
  bar: (i, { s, go }) => {
    // Same events and states as Listening › Competitors.
    const id = RIVAL_ID[i.name]
    const open = eventsOf(s).filter(e => (!id || e.competitor === id) && !s.listening.events[e.id] && !e.done).sort((a, b) => b.at - a.at)
    const top = open[0]
    const name = id ? competitorName(s, id) : 'your competitors'
    return {
      text: !top ? `Nothing open from ${name}: every move has an answer.`
        : id ? `${top.title}. ${top.impactWhy} ${top.read}`
        : `${open.length} competitor move${open.length > 1 ? 's' : ''} without an answer: ${open.slice(0, 4).map(e => e.title).join('; ')}.`,
      sources: ['Competitor accounts Echo watches', `Echo’s event feed · ${open.length} open`],
      ctas: [{ label: top && id ? 'Open the event' : 'Open competitor events', primary: true, run: () => go(top && id ? `/listening/competitors/${top.id}` : '/listening/competitors') }],
    }
  },
  chat: (_i, { s }) => {
    const events = s.handoffs.filter(h => !h.lane && h.topic === 'Competitor')
    return {
      replies: [
        { from: 'echo', text: events.length ? `${events.length} move${events.length > 1 ? 's' : ''} I’m watching right now:` : 'Nothing new from competitors since this morning.', card: events.length ? { type: 'list', items: events.map(h => ({ title: h.title, agent: 'echo', meta: h.context, link: h.link })) } : undefined },
        ...(events.some(h => /Peakline/.test(h.title)) ? [{ from: 'atlas' as const, text: 'I wouldn’t match the price. A counter-post on durability instead? It mentions no competitor by name.', card: { type: 'post' as const, network: 'instagram' as const, slot: 'Today, 18:00', text: 'Built to last, not to discount. The Ridge 28L: repairable for life, same price all year.', status: 'draft' as const } }] : []),
      ], effects: [],
    }
  },
})

/** Echo's alert rules: when it raises something on the Desk, and to whom. */
function Alerts() {
  const { s, d } = useStore()
  return (
    <AlertsTable agent="Echo" alerts={s.listening.alerts} intro="Echo checks these every minute against her mention feed and raises a match on your Desk, at most once an hour (once a day for daily rules). She copies Claire when you ask."
      subjects={alertSubjects(s)}
      conditions={['gets more than', 'grows faster than']} units={[' negative mentions in 1 h', ' mentions in 1 h', ' mention from press', '% in a day']}
      onSave={alert => d({ type: 'listening/alertSave', alert })} onToggle={id => d({ type: 'listening/alertToggle', id })} onDelete={id => d({ type: 'listening/alertDelete', id })} />
  )
}

const echo: AgentModule = {
  id: 'echo',
  needs: listeningNeedsCount,
  script: SCRIPT,
  onResolve: onResolveListening,
  onUndo: onUndoListening,
  due: listeningDue,
  tick: tickListening,
  intents: [mentions, creators, benchmark, competitor],
  profileTabs: [{ id: 'alerts', label: 'Alerts', count: s => s.listening.alerts.filter(x => x.on).length, render: () => <Alerts /> }],
  presets: { competitor: { keep: ['h-peakline'], fire: ['ev-trailkind', 'ev-norro', 'ev-basecamp'] } },
  // Moderator › Hard to see: what a tester rarely stumbles on (⇧D).
  triggers: [{ event: 'ev-spike', to: '/listening/mentions?sentiment=negative' }, { event: 'ev-creator-fit', to: '/listening/creators' }, { event: 'ev-idea-urgent', to: '/publishing/ideas' },
    { event: 'ev-norro', to: '/listening/competitors/e-norro-repair', label: 'Norrø event: counter-moves, sales email by level' },
    { event: 'ev-trailkind', to: '/listening/competitors/benchmark?net=tiktok', label: 'Trailkind reel, then the TikTok benchmark' },
    { event: 'ev-trend-repair', to: '/listening/trends', label: '“Repair over replace” trend for Atlas' }],
}
export default echo
