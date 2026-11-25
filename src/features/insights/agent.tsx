// Iris · Insights: everything Iris plugs into the core (see src/app/agents-registry.ts).
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { useStore } from '../../app/store'
import { net } from '../../data/command'
import { NETWORK_LABEL } from '../../data/agents'
import { Heatmap, HBars, LineChart } from '../../ui/charts'
import { AlertsTable } from './alerts'
import { onResolveInsights } from './slice'
import { SCRIPT } from './script'

declare module '../../data/command' {
  interface IntentTypes {
    tiktok: object
    besttime: { network: 'instagram' | 'linkedin' | 'tiktok' }
    compare: object
    performance: object
  }
}

const besttime = defineIntent({
  kind: 'besttime', owner: 'iris', order: 110,
  parse: t => {
    if (!/best (time|slot|hour|day)|when should (i|we) post/.test(t)) return
    const n = net(t)
    return { kind: 'besttime', network: n === 'linkedin' || n === 'tiktok' ? n : 'instagram' }
  },
  bar: (i, { go }) => {
    const best = { instagram: ['Friday 18:30', 4, 5], linkedin: ['Tuesday 08:30', 1, 1], tiktok: ['Thursday 18:00', 3, 5] }[i.network] as [string, number, number]
    const values = Array.from({ length: 7 }, (_, r) => Array.from({ length: 6 }, (_, c) => Math.max(0.08, 0.65 - Math.abs(r - best[1]) * 0.12 - Math.abs(c - best[2]) * 0.1 + ((r * 7 + c * 3) % 5) * 0.03)))
    values[best[1]][best[2]] = 1
    return {
      text: `Best slot on ${i.network === 'linkedin' ? 'LinkedIn' : i.network === 'tiktok' ? 'TikTok' : 'Instagram'}: ${best[0]}. Posts in that slot got 2.1× the median reach over the last 90 days. Atlas already uses it for the plan.`,
      visual: <Heatmap label="Reach by day and hour" rows={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} cols={['08', '10', '12', '14', '16', '18']} values={values} best={[best[1], best[2]]} />,
      sources: ['Native analytics, last 90 days', '312 posts'],
      ctas: [{ label: 'Open Insights', run: () => go('/insights') }],
    }
  },
  chat: i => {
    const slot = { instagram: 'Friday 18:30', linkedin: 'Tuesday 08:30', tiktok: 'Thursday 18:00' }[i.network]
    return { replies: [{ from: 'iris', text: `Your best ${NETWORK_LABEL[i.network]} slot over the last 90 days is ${slot}: 2.1× the average reach. Second best is Sunday 11:00.`, card: { type: 'chart', label: `${NETWORK_LABEL[i.network]} reach by weekday (k)`, value: slot, delta: '2.1× average', series: [21, 24, 22, 27, 44, 19, 31], labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], sources: [`${NETWORK_LABEL[i.network]} analytics · 90 days`] } }], effects: [] }
  },
})

const tiktok = defineIntent({
  kind: 'tiktok', owner: 'iris', order: 120,
  parse: t => (/tiktok/.test(t) && /how|did|perform|doing|last week|views|reach/.test(t) ? { kind: 'tiktok' } : undefined),
  bar: (_i, { d, go }) => ({
    text: 'TikTok had a weak week: 1,840 views per video on average, down 38% from 2,970 the week before. All 4 videos since Thursday open on the product for 4 to 6 seconds before anything happens. Trailkind’s best reels hook in 2. I’d test 3-second hooks this week.',
    visual: <LineChart label="TikTok views per video, last 10 days" labels={['15', '16', '17', '18', '19', '20', '21', '22', '23', '24']} series={[{ name: 'Views per video', data: [8200, 9100, 10400, 8800, 9600, 7900, 2100, 1900, 1700, 1800] }]} h={150} />,
    sources: ['TikTok analytics, 15–24 Nov', '4 videos since Thu 20 Nov'],
    ctas: [{ label: 'Ask Atlas to test hooks', primary: true, run: () => d({ type: 'playbook/briefAtlas', title: 'TikTok: test 3-second hooks', network: 'tiktok', slot: 'Thu 27, 18:00', text: 'Bag vs. downpour, 3 seconds in. Spoiler: the laptop stays dry.', brief: 'Test 3-second hooks on TikTok' }) }, { label: 'Open Insights', run: () => go('/insights') }],
  }),
  chat: () => ({
    replies: [
      { from: 'iris', text: 'TikTok views per video are down 38% since Thursday: four videos in a row under 2,000, against 9,000 usually. The hooks got longer, 4 to 6 seconds.', card: { type: 'chart', label: 'TikTok views per video (k)', value: '1,840', delta: '−38%', down: true, series: [8.2, 9.1, 10.4, 8.8, 9.6, 7.9, 9.3, 2.1, 1.9, 1.7, 1.8], sources: ['TikTok analytics · last 11 videos'] } },
      { from: 'atlas', text: 'Want me to test 3-second hooks? Here’s the first one.', card: { type: 'post', network: 'tiktok', slot: 'Thu 27, 18:00', text: 'POV: you packed for 3 days and it all fits. Ridge 28L.', status: 'draft' } },
    ], effects: [],
  }),
})

const compare = defineIntent({
  kind: 'compare', owner: 'iris', order: 130,
  parse: t => (/reels? (vs|versus|or|against) carousels?|carousels? (vs|versus|or|against) reels?|compare/.test(t) ? { kind: 'compare' } : undefined),
  bar: (_i, { go }) => ({
    text: 'Carousels win on saves, reels win on reach. Over 30 days, carousels averaged a 4.2% engagement rate against 2.9% for reels, but reels reached 2.4× more people. For sales posts, carousels convert better: 1.8% link clicks against 0.9%.',
    visual: <HBars items={[{ label: 'Carousels · engagement', value: 4.2 }, { label: 'Reels · engagement', value: 2.9 }, { label: 'Carousels · clicks', value: 1.8 }, { label: 'Reels · clicks', value: 0.9 }]} format={v => `${v}%`} />,
    sources: ['Instagram analytics, 26 Oct – 24 Nov', '18 carousels, 22 reels'],
    ctas: [{ label: 'Open Insights', run: () => go('/insights') }],
  }),
  chat: () => ({ replies: [{ from: 'iris', text: 'Over 30 days, reels reach 2.4× more people, carousels get 1.8× more saves. Reels to be found, carousels to be kept.', card: { type: 'chart', label: 'Saves per post', value: '1.8×', delta: 'carousels vs reels', series: [42, 51, 38, 77, 92, 88], labels: ['R', 'R', 'R', 'C', 'C', 'C'], sources: ['Instagram analytics · 30 days, 24 posts'] } }], effects: [] }),
})

const performance = defineIntent({
  kind: 'performance', owner: 'iris', order: 150,
  parse: t => (/reach|engagement|how are we doing|how('?s| is) it going|performance|numbers|followers/.test(t) ? { kind: 'performance' } : undefined),
  bar: (_i, { go }) => ({
    text: 'Last 7 days: reach 412k, up 8% on the week before. Engagement rate 3.1%, up 0.4 points. 1,204 replies handled, 91% by Nova, with a median reply time of 4 minutes. The one dip is TikTok views per video, down 38%.',
    visual: <LineChart label="Reach per day, last 2 weeks" labels={['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24']} h={140}
      series={[{ name: 'This week', data: [52, 55, 58, 61, 57, 60, 63, 58, 61, 59, 64, 62, 60, 66].map(x => x * 1000) }, { name: 'Previous', dashed: true, tone: 'faint', data: [49, 51, 53, 55, 52, 54, 56, 53, 55, 54, 57, 55, 54, 58].map(x => x * 1000) }]} />,
    sources: ['Native analytics, 18–24 Nov vs 11–17 Nov'],
    ctas: [{ label: 'Read the weekly report', run: () => go('/insights') }],
  }),
  chat: () => ({ replies: [{ from: 'iris', text: 'Last 7 days: reach 412k (+8%), engagement rate 3.1% (+0.4 pt), 1,204 replies handled, 91% of them by Nova. TikTok is the one weak spot.', card: { type: 'chart', label: 'Weekly reach (k)', value: '412k', delta: '+8%', series: [300, 340, 330, 380, 410, 390, 440, 412], sources: ['All networks · weekly report w47'] } }], effects: [] }),
})

/** Iris's alert rules: when she raises something on the Desk, and to whom. */
function Alerts() {
  const { s, d } = useStore()
  return (
    <AlertsTable agent="Iris" alerts={s.insights.alerts} intro="Iris raises an anomaly on your Desk when a rule fires, and copies Claire when you ask."
      subjects={[{ value: 'views', label: 'Views per video' }, { value: 'reach', label: 'Daily reach' }, { value: 'er', label: 'Engagement rate of a post' }, { value: 'followers', label: 'New followers' }, { value: 'clicks', label: 'Link clicks' }, { value: 'reply', label: 'Reply time' }, { value: 'sentiment', label: 'Negative sentiment' }]}
      conditions={['drops by more than', 'rises above', 'falls below']} units={['%', '% over 3 posts', '× the account average', '× usual daily growth', ' min median']}
      onSave={alert => d({ type: 'insights/alertSave', alert })} onToggle={id => d({ type: 'insights/alertToggle', id })} onDelete={id => d({ type: 'insights/alertDelete', id })} />
  )
}

const iris: AgentModule = {
  id: 'iris',
  script: SCRIPT,
  onResolve: onResolveInsights,
  intents: [besttime, tiktok, compare, performance],
  profileTabs: [{ id: 'alerts', label: 'Alerts', count: s => s.insights.alerts.filter(x => x.on).length, render: () => <Alerts /> }],
  presets: { calm: { keep: ['h-tiktok', 'h-report'] }, competitor: { keep: ['h-report'] }, trust: { keep: ['h-report'] } },
}
export default iris
