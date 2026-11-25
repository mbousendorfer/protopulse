// Echo · Listening: everything Echo plugs into the core (see src/app/agents-registry.ts).
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { useStore } from '../../app/store'
import { AlertsTable } from '../insights/alerts'
import { now } from '../../app/core'
import { ago } from '../../app/time'
import { listeningDue, onResolveListening, onUndoListening, tickListening } from './slice'
import { alertSubjects, moodCount, pct, recent, sentimentOf, topComplaints, WEEK } from './model'
import { SCRIPT } from './script'

declare module '../../data/command' {
  interface IntentTypes {
    competitor: { name: string }
    mentions: object
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

const competitor = defineIntent({
  kind: 'competitor', owner: 'echo', order: 100,
  parse: t => (/peakline|norr[øo]|trailkind|basecamp|competitor|rival/.test(t) ? { kind: 'competitor', name: t.match(/peakline|norr[øo]|trailkind|basecamp/)?.[0] ?? 'competitors' } : undefined),
  bar: (i, { go }) => ({
    text: /peak/.test(i.name)
      ? 'Peakline cut the Aero 30 to €99 overnight, −29%. It’s their direct rival to the Ridge. Comments under their post are mixed: 31% ask about durability. I suggest not matching the price and posting about how long the Ridge lasts instead.'
      : `This week: Peakline cut the Aero 30 to €99, Trailkind’s “bag vs. rain” reel hit 1.2M views, Norrø announced lifetime repairs, and Basecamp Co. recalled 8,000 bottles. ${i.name === 'competitors' ? '' : `Most of the noise around ${i.name} is in the Events feed.`}`,
    sources: ['Competitor accounts, Instagram and LinkedIn', 'Echo’s event feed, last 7 days'],
    ctas: [{ label: 'Open competitor events', primary: true, run: () => go('/listening/competitors') }],
  }),
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
  script: SCRIPT,
  onResolve: onResolveListening,
  onUndo: onUndoListening,
  due: listeningDue,
  tick: tickListening,
  intents: [mentions, competitor],
  profileTabs: [{ id: 'alerts', label: 'Alerts', count: s => s.listening.alerts.filter(x => x.on).length, render: () => <Alerts /> }],
  presets: { competitor: { keep: ['h-peakline'], fire: ['ev-trailkind', 'ev-norro', 'ev-basecamp'] } },
}
export default echo
