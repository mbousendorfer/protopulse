// Sage · Strategy: everything Sage plugs into the core (see src/app/agents-registry.ts).
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { HBars, LineChart } from '../../ui/charts'
import { campaignStatus, campaignsDue, closeCampaigns, findCampaign, onResolveStrategy, onUndoStrategy, pillarProposal, pillarStatus } from './slice'
import { SCRIPT } from './script'

declare module '../../data/command' {
  interface IntentTypes {
    campaign: { brief: string }
    campaignStatus: { name?: string }
    pillars: { pillar?: string }
    pillarChange: { pillar: string; more: boolean }
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const PILLAR = /\b(community|gear that lasts|trail stories|repair(?: & care| and care)?)\b/
const pillarName = (m: string) => (m.startsWith('repair') ? 'Repair & care' : m.split(' ').map(cap).join(' ').replace('That', 'that'))

const campaign = defineIntent({
  kind: 'campaign', owner: 'sage', order: 50,
  parse: (t, { raw }) => (/^brief\b|campaign|launch/.test(t) ? { kind: 'campaign', brief: raw.replace(/^\s*(sage[,:]?\s*)?(brief:?\s*)?/i, '').trim() } : undefined),
  bar: (i, { go }) => ({
    text: `Got the brief. I’m opening Strategy to turn “${i.brief}” into a campaign plan: goal, phases, posts and who does what.`,
    after: () => setTimeout(() => go(`/strategy/new?brief=${encodeURIComponent(i.brief)}&auto=1`), 600),
  }),
  chat: i => ({ replies: [{ from: 'sage', text: 'I can turn that into a full campaign plan: goal, phases, posts and who does what. It takes me about a minute.', card: { type: 'brief', text: cap(i.brief), status: 'proposed' } }], effects: [] }),
})

/** “How is Trail Week doing?”: the campaign page's numbers, in a sentence. */
const campaignStatusIntent = defineIntent({
  kind: 'campaignStatus', owner: 'sage', order: 45,
  parse: t => {
    if (!/campaign|launch|trail week|repair friday|gift guide/.test(t) || !/how|doing|going|status|progress|on track|behind|ahead/.test(t)) return
    const m = t.match(/(?:how(?:'?s| is| are)|is) (?:the )?(.+?) (?:campaign )?(?:doing|going|performing|tracking|on track|behind|ahead)/)
    return { kind: 'campaignStatus', name: m?.[1] }
  },
  bar: (i, { s, go }) => {
    const c = findCampaign(s, i.name)
    if (!c) return { text: 'No campaign yet. Write me a two-line brief and I’ll build the plan.', ctas: [{ label: 'New campaign brief', primary: true, run: () => go('/strategy/new') }] }
    const st = campaignStatus(s, c)
    return {
      text: st.text,
      visual: c.actual.length ? <LineChart label="Plan versus actual" labels={c.planned.map((_, n) => `Day ${n}`)} h={150} series={[{ name: 'Planned', data: c.planned, dashed: true, tone: 'faint' }, { name: 'Actual', data: c.actual, color: 'var(--a-sage)' }]} /> : undefined,
      sources: [`Strategy › ${c.name}`, 'Goal tracking by Iris'],
      ctas: [{ label: 'Open the campaign', primary: true, run: () => go(`/strategy/campaigns/${c.id}`) }],
    }
  },
  chat: (i, { s }) => {
    const c = findCampaign(s, i.name)
    if (!c) return { replies: [{ from: 'sage', text: 'No campaign yet. Write me a two-line brief and I’ll build the plan.' }], effects: [] }
    const st = campaignStatus(s, c)
    return {
      replies: [{ from: 'sage', text: st.text, ...(c.actual.length ? { card: { type: 'chart' as const, label: `${c.name}: ${c.goal.label.replace(' (€)', '')} so far`, value: c.goal.current.toLocaleString('en-GB'), delta: st.trajectory ? `${st.trajectory}% of trajectory` : `${st.pct}% of goal`, down: !!st.trajectory && st.trajectory < 100, series: c.actual, sources: [`Strategy › ${c.name}`] } } : {}) }],
      effects: [],
    }
  },
})

/** “Is Community behind?”: pillar shares against Sage's targets, read from Atlas's posts. */
const pillars = defineIntent({
  kind: 'pillars', owner: 'sage', order: 46,
  parse: t => {
    const p = t.match(PILLAR)?.[1]
    if (/pillar|content mix|cadence/.test(t) || (p && /behind|ahead|on track|under|over|enough|how|where|doing|share/.test(t))) return { kind: 'pillars', pillar: p && pillarName(p) }
  },
  bar: (i, { s, go }) => {
    const rows = pillarStatus(s)
    const me = rows.find(r => r.name === i.pillar)
    const worst = rows[0]
    const line = (r: typeof worst) => `${r.name} is at ${r.actual}% of posts against a target of ${r.target}%`
    return {
      text: me ? `${line(me)}, ${me.gap < -5 ? 'behind' : me.gap > 5 ? 'ahead' : 'on track'}. ${me.gap < -5 ? 'Ask me for more of it and I’ll propose the change.' : ''}`.trim() : `${line(worst)}: the one furthest behind. Over the last 30 days, from what Atlas published.`,
      visual: <HBars items={rows.map(r => ({ label: r.name, value: r.actual, sub: `target ${r.target}%` }))} format={v => `${v}%`} highlight={me?.name ?? worst.name} color="var(--a-sage)" />,
      sources: ['Atlas’s posts, last 30 days', 'Sage’s pillar targets'],
      ctas: [{ label: 'Open Pillars and cadence', primary: true, run: () => go('/strategy/pillars') }],
    }
  },
  chat: (i, { s }) => {
    const rows = pillarStatus(s)
    const me = rows.find(r => r.name === i.pillar) ?? rows[0]
    return { replies: [{ from: 'sage', text: `${me.name} is at ${me.actual}% of posts over the last 30 days, against a target of ${me.target}%. ${rows.filter(r => r !== me).map(r => `${r.name} ${r.actual}% (target ${r.target}%)`).join(', ')}.`, card: { type: 'chart', label: 'Share of posts by pillar (%)', value: `${me.actual}%`, delta: `target ${me.target}%`, down: me.gap < 0, series: rows.map(r => r.actual), labels: rows.map(r => r.name.split(' ')[0]), sources: ['Atlas’s posts · last 30 days'] } }], effects: [] }
  },
})

/** “Put more Community in the mix”: pillars are locked, so Sage writes the proposal and Sam applies it. */
const pillarChange = defineIntent({
  kind: 'pillarChange', owner: 'sage', order: 44,
  parse: t => {
    const p = t.match(PILLAR)?.[1]
    const dir = t.match(/\b(more|less|fewer|raise|increase|lower|cut|reduce)\b/)?.[1]
    return p && dir ? { kind: 'pillarChange', pillar: pillarName(p), more: /more|raise|increase/.test(dir) } : undefined
  },
  bar: (i, { s, d, go }) => {
    const p = pillarProposal(s, i.pillar, i.more)
    if (!p) return { text: `I can’t move ${i.pillar} that way without dropping another pillar under 5%.`, ctas: [{ label: 'Open Pillars and cadence', run: () => go('/strategy/pillars') }] }
    return {
      text: `${p.why} I’d ${p.text.charAt(0).toLowerCase() + p.text.slice(1)}. Pillars are yours to change: I’ll add it to my proposals and you apply it.`,
      sources: ['Atlas’s posts, last 30 days', 'Sage’s pillar targets'],
      ctas: [{ label: 'Add to Sage’s proposals', primary: true, run: () => { d({ type: 'strategy/propose', proposal: p }); go('/strategy/pillars') } }],
    }
  },
  chat: (i, { s }) => {
    const p = pillarProposal(s, i.pillar, i.more)
    if (!p) return { replies: [{ from: 'sage', text: `I can’t move ${i.pillar} that way without dropping another pillar under 5%.` }], effects: [] }
    return {
      replies: [{ from: 'sage', text: `${p.why} I added it to my proposals in Strategy: ${p.text}. Pillars are yours to change, so you apply it there.`, card: { type: 'list', items: [{ title: p.text, agent: 'sage', meta: 'Proposal · waiting for you', link: '/strategy/pillars' }] } }],
      effects: [st => (st.strategy.proposals.some(x => x.text === p.text && x.status === 'proposed') ? st : { ...st, strategy: { ...st.strategy, proposals: [p, ...st.strategy.proposals] } })],
    }
  },
})

const sage: AgentModule = {
  id: 'sage',
  script: SCRIPT,
  onResolve: onResolveStrategy,
  onUndo: onUndoStrategy,
  due: campaignsDue,
  tick: closeCampaigns,
  intents: [campaign, campaignStatusIntent, pillars, pillarChange],
  // Moderator › Hard to see: what a tester rarely stumbles on (⇧D).
  triggers: [{ event: 'ev-trajectory', to: '/strategy/campaigns/trail-week' }, { event: 'ev-campaign-end', to: '/strategy/campaigns/trail-week' }, { event: 'ev-moment', to: '/' }],
}
export default sage
