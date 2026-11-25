// Iris · Insights: everything Iris plugs into the core (see src/app/agents-registry.ts).
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { useStore } from '../../app/store'
import { net } from '../../data/command'
import { NETWORK_LABEL } from '../../data/agents'
import { Heatmap, HBars, LineChart } from '../../ui/charts'
import { BEST_CELL, DAILY_REACH, HEAT_COLS, HEAT_ROWS, dayLabels } from '../../data/insights'
import { bestTime, change, fmt, formats, heat, kpi, tiktokViews, type SocialNet } from './metrics'
import { AlertsTable } from './alerts'
import { onResolveInsights } from './slice'
import { SCRIPT } from './script'

declare module '../../data/command' {
  interface IntentTypes {
    tiktok: object
    besttime: { network: SocialNet }
    compare: object
    performance: object
  }
}

const SHORT_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const besttime = defineIntent({
  kind: 'besttime', owner: 'iris', order: 110,
  parse: t => {
    if (!/best (time|slot|hour|day)|when should (i|we) post/.test(t)) return
    const n = net(t)
    return { kind: 'besttime', network: n && n in BEST_CELL ? n as SocialNet : 'instagram' }
  },
  bar: (i, { go }) => {
    const b = bestTime(i.network)
    return {
      text: `Best slot on ${NETWORK_LABEL[i.network]}: ${b.dayName} ${b.window}. Posts in that window got ${b.lift}× the median reach over the last 30 days. Atlas posts at ${b.time}, inside it.`,
      visual: <Heatmap label="Reach by day and hour" rows={HEAT_ROWS} cols={HEAT_COLS} values={heat(i.network)} best={[b.day, b.col]} />,
      sources: [`${NETWORK_LABEL[i.network]} analytics, last 30 days`],
      ctas: [{ label: 'Open Explore', run: () => go('/insights/explore') }],
    }
  },
  chat: i => {
    const b = bestTime(i.network)
    const byDay = heat(i.network).map(row => Math.round(Math.max(...row) * 100))
    return { replies: [{ from: 'iris', text: `Your best ${NETWORK_LABEL[i.network]} slot over the last 30 days is ${b.dayName} ${b.window}: ${b.lift}× the median reach. Atlas posts at ${b.time}, inside it.`, card: { type: 'chart', label: `${NETWORK_LABEL[i.network]} best slot per weekday (index)`, value: `${b.dayName.slice(0, 3)} ${b.time}`, delta: `${b.lift}× median`, series: byDay, labels: SHORT_DAYS, sources: [`${NETWORK_LABEL[i.network]} analytics · 30 days`] } }], effects: [] }
  },
})

const tiktok = defineIntent({
  kind: 'tiktok', owner: 'iris', order: 120,
  parse: t => (/tiktok/.test(t) && /how|did|perform|doing|last week|views|reach/.test(t) ? { kind: 'tiktok' } : undefined),
  bar: (_i, { d, go }) => {
    const v = tiktokViews()
    return {
      text: `TikTok had a weak week: ${fmt.int(v.now)} views per video on the last 4 videos, ${fmt.signed(v.delta)} from ${fmt.int(v.before)} before. All 4 videos since Thursday open on the product for 4 to 6 seconds before anything happens. Trailkind’s best videos hook in 2. I’d test 3-second hooks this week.`,
      visual: <LineChart label="TikTok views per video, last 11 videos" labels={v.series.map((_, i) => `#${i + 1}`)} series={[{ name: 'Views per video (k)', data: v.series }]} h={150} format={x => `${x.toFixed(1)}k`} />,
      sources: ['TikTok analytics, last 11 videos', '4 videos since Thu 20 Nov'],
      ctas: [{ label: 'Ask Atlas to test hooks', primary: true, run: () => d({ type: 'playbook/briefAtlas', title: 'TikTok: test 3-second hooks', network: 'tiktok', slot: 'Thu 27, 18:30', text: 'Bag vs. downpour, 3 seconds in. Spoiler: the laptop stays dry.', brief: 'Test 3-second hooks on TikTok' }) }, { label: 'Open Insights', run: () => go('/insights') }],
    }
  },
  chat: () => {
    const v = tiktokViews()
    return {
      replies: [
        { from: 'iris', text: `TikTok views per video are ${fmt.signed(v.delta)} since Thursday: four videos in a row at ${fmt.int(v.now)}, against ${fmt.int(v.before)} before. The hooks got longer, 4 to 6 seconds.`, card: { type: 'chart', label: 'TikTok views per video (k)', value: fmt.int(v.now), delta: fmt.signed(v.delta), down: v.delta < 0, series: v.series, sources: ['TikTok analytics · last 11 videos'] } },
        { from: 'atlas', text: 'Want me to test 3-second hooks? Here’s the first one.', card: { type: 'post', network: 'tiktok', slot: 'Thu 27, 18:30', text: 'POV: you packed for 3 days and it all fits. Ridge 28L.', status: 'draft' } },
      ], effects: [],
    }
  },
})

const compare = defineIntent({
  kind: 'compare', owner: 'iris', order: 130,
  parse: t => (/reels? (vs|versus|or|against) carousels?|carousels? (vs|versus|or|against) reels?|compare/.test(t) ? { kind: 'compare' } : undefined),
  bar: (_i, { go }) => {
    const f = formats()
    return {
      text: `Carousels win on saves, reels win on reach. Over 30 days, carousels averaged a ${fmt.pct(f.carousel.er)} engagement rate against ${fmt.pct(f.reel.er)} for reels, but reels reached ${f.reachX}× more people. Carousels get ${f.savesX}× the saves, and convert better: ${fmt.pct(f.carousel.clicks)} link clicks against ${fmt.pct(f.reel.clicks)}.`,
      visual: <HBars items={[{ label: 'Carousels · engagement', value: f.carousel.er }, { label: 'Reels · engagement', value: f.reel.er }, { label: 'Carousels · saves', value: f.carousel.saves }, { label: 'Reels · saves', value: f.reel.saves }, { label: 'Carousels · clicks', value: f.carousel.clicks }, { label: 'Reels · clicks', value: f.reel.clicks }]} format={v => `${v}%`} />,
      sources: ['Instagram analytics, last 30 days', `${f.carousel.posts} carousels, ${f.reel.posts} reels`],
      ctas: [{ label: 'Open Insights', run: () => go('/insights') }],
    }
  },
  chat: () => {
    const f = formats()
    return { replies: [{ from: 'iris', text: `Over 30 days, reels reach ${f.reachX}× more people, carousels get ${f.savesX}× the saves (${fmt.pct(f.carousel.saves)} against ${fmt.pct(f.reel.saves)}). Reels to be found, carousels to be kept.`, card: { type: 'chart', label: 'Saves rate (%)', value: `${f.savesX}×`, delta: 'carousels vs reels', series: [f.reel.saves, f.carousel.saves], labels: ['Reels', 'Carousels'], sources: [`Instagram analytics · 30 days, ${f.carousel.posts + f.reel.posts} posts`] } }], effects: [] }
  },
})

/** Last 7 days, as Explore shows them. */
function weekLine() {
  const reach = kpi('reach'), er = kpi('er'), replies = kpi('replies'), reply = kpi('reply'), v = tiktokViews()
  return { reach, er, replies, reply, v, text: `reach ${fmt.k(reach.value)} (${fmt.signed(change(reach))}), engagement rate ${fmt.pct(er.value)} (${fmt.signed(change(er), ' pt')}), ${fmt.int(replies.value)} replies handled with a median reply time of ${reply.value} minutes` }
}

const performance = defineIntent({
  kind: 'performance', owner: 'iris', order: 150,
  parse: t => (/reach|engagement|how are we doing|how('?s| is) it going|performance|numbers|followers/.test(t) ? { kind: 'performance' } : undefined),
  bar: (_i, { go }) => {
    const w = weekLine()
    return {
      text: `Last 7 days: ${w.text}. The one dip is TikTok views per video, ${fmt.signed(w.v.delta)}.`,
      visual: <LineChart label="Daily reach, last 7 days against the 7 before" labels={dayLabels(7)} h={140} format={v => `${Math.round(v)}k`}
        series={[{ name: 'Last 7 days', data: DAILY_REACH.slice(-7) }, { name: 'Previous 7 days', dashed: true, tone: 'faint', data: DAILY_REACH.slice(-14, -7) }]} />,
      sources: ['Native analytics, last 7 days vs the 7 before'],
      ctas: [{ label: 'Open Explore', run: () => go('/insights/explore') }],
    }
  },
  chat: () => {
    const w = weekLine()
    return { replies: [{ from: 'iris', text: `Last 7 days: ${w.text}. TikTok is the one weak spot.`, card: { type: 'chart', label: 'Daily reach, last 7 days (k)', value: fmt.k(w.reach.value), delta: fmt.signed(change(w.reach)), series: DAILY_REACH.slice(-7), labels: dayLabels(7), sources: ['All networks · Insights › Explore'] } }], effects: [] }
  },
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
