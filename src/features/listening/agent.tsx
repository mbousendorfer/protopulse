// Echo · Listening: everything Echo plugs into the core (see src/app/agents-registry.ts).
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { useStore } from '../../app/store'
import { AlertsTable } from '../insights/alerts'
import { onResolveListening } from './slice'
import { SCRIPT } from './script'

declare module '../../data/command' {
  interface IntentTypes {
    competitor: { name: string }
    mentions: object
  }
}

const mentions = defineIntent({
  kind: 'mentions', owner: 'echo', order: 90,
  parse: t => (/negative|complain(t|ts)? about us|mentions/.test(t) && !/post/.test(t) ? { kind: 'mentions' } : undefined),
  bar: (_i, { go }) => ({
    text: 'This week: 14 negative mentions out of 388, 3.6%. Most are about the Storm Jacket seams thread on Reddit and late deliveries. Opening Listening filtered on negative.',
    sources: ['Echo’s mention feed, 18–24 Nov'],
    after: () => setTimeout(() => go('/listening/mentions?sentiment=negative'), 700),
  }),
  chat: () => ({ replies: [{ from: 'echo', text: '2 negative mentions today, both about the Storm Jacket seams. One Reddit thread is gaining traction.', card: { type: 'list', items: [{ title: 'r/ultralight: “Storm Jacket seams leak after 3 washes”', agent: 'echo', meta: '41 upvotes · 2 h ago', link: '/listening/mentions' }, { title: '@hugo.rando: “Seams on my Storm are peeling”', agent: 'echo', meta: 'X · 4 h ago', link: '/listening/mentions' }] } }], effects: [] }),
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
    <AlertsTable agent="Echo" alerts={s.listening.alerts} intro="Echo raises these on your Desk as soon as they happen, and copies Claire when you ask."
      subjects={[{ value: 'brand', label: 'Fernway mentions' }, { value: 'competitors', label: 'Competitor mentions' }, ...s.listening.searches.map(x => ({ value: x.id, label: `“${x.name}”` }))]}
      conditions={['gets more than', 'grows faster than']} units={[' negative mentions in 1 h', ' mentions in 1 h', ' mention from press', '% in a day']}
      onSave={alert => d({ type: 'listening/alertSave', alert })} onToggle={id => d({ type: 'listening/alertToggle', id })} onDelete={id => d({ type: 'listening/alertDelete', id })} />
  )
}

const echo: AgentModule = {
  id: 'echo',
  script: SCRIPT,
  onResolve: onResolveListening,
  intents: [mentions, competitor],
  profileTabs: [{ id: 'alerts', label: 'Alerts', count: s => s.listening.alerts.filter(x => x.on).length, render: () => <Alerts /> }],
  presets: { competitor: { keep: ['h-peakline'], fire: ['ev-trailkind', 'ev-norro', 'ev-basecamp'] } },
}
export default echo
