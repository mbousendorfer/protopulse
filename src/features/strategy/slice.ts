import type { State } from '../../app/state'
import type { AgentId, Decision, Handoff, Network } from '../../app/types'
import { now, pushHandoff, pushLog, uid } from '../../app/core'
import { CADENCE, CAMPAIGNS, PILLARS, PROPOSALS, generatePlan, revisePlan, targetsFrom, type Cadence, type Campaign, type Pillar, type Proposal } from '../../data/strategy'
import { dayLabel } from '../../app/time'

export type StrategyState = { campaigns: Campaign[]; pillars: Pillar[]; cadence: Cadence[]; proposals: Proposal[] }

export const initialStrategy = (): StrategyState => ({
  campaigns: structuredClone(CAMPAIGNS), pillars: structuredClone(PILLARS), cadence: structuredClone(CADENCE), proposals: structuredClone(PROPOSALS),
})

export type StrategyAction =
  | { type: 'strategy/create'; id: string; brief: string; budget?: number }
  | { type: 'strategy/approve'; id: string }
  | { type: 'strategy/changes'; id: string; feedback: string }
  | { type: 'strategy/discard'; id: string }
  | { type: 'strategy/reassign'; id: string; task: string; agent: AgentId }
  | { type: 'strategy/adjust'; id: string; adj: string; accept: boolean }
  | { type: 'strategy/proposal'; id: string; accept: boolean }
  | { type: 'strategy/reopen'; id: string; adj?: string }
  | { type: 'strategy/cadence'; network: Network; target: number }

const patch = (s: State, p: Partial<StrategyState>): State => ({ ...s, strategy: { ...s.strategy, ...p } })
const campaign = (s: State, id: string) => s.strategy.campaigns.find(c => c.id === id)
const updateCampaign = (s: State, id: string, f: (c: Campaign) => Campaign): State =>
  patch(s, { campaigns: s.strategy.campaigns.map(c => (c.id === id ? f(c) : c)) })

/** Sage turns a brief into a plan to review, and puts a card on the Desk. Used by Listening's “Brief Sage”. */
/** Sage's pillars and weekly cadence: the one source. Atlas (Ideas, plan review, calendar) and the Playbook read them here. */
export const targetsOf = (s: State) => targetsFrom(s.strategy)

export function briefSage(s: State, brief: string, source: string, from: AgentId = 'echo'): State {
  const id = uid('cmp')
  const c = generatePlan(id, brief, now(s), { source })
  let next = patch(s, { campaigns: [c, ...s.strategy.campaigns] })
  next = pushHandoff(next, {
    agent: 'sage', kind: 'approval', urgency: 'week', topic: 'Campaign plan', action: 'sage-plan', chain: [from, 'sage'], ref: id,
    title: `Campaign plan ready: ${c.name}`, context: `${c.posts.length} posts in 3 phases, goal ${c.goal.target.toLocaleString('en-GB')} ${c.goal.label}. Brief: “${brief}”`,
    why: 'Campaign plans are set to Draft.', confidence: 72, link: `/strategy/campaigns/${id}`,
    preview: { type: 'plan', title: c.name, lines: [`Goal: ${c.goal.target.toLocaleString('en-GB')} ${c.goal.label}`, `${c.posts.length} posts · boost budget €${c.budget}`, `Starts ${dayLabel(c.start, now(s))}`] },
  })
  return pushLog(next, { agent: 'sage', text: `Built a campaign plan from ${from[0].toUpperCase() + from.slice(1)}’s brief: ${c.name}`, status: 'done', reason: source, link: `/strategy/campaigns/${id}` })
}

function approveCampaign(s: State, id: string): State {
  const c = campaign(s, id)
  if (!c || c.status === 'live' || c.status === 'done') return s
  let next = updateCampaign(s, id, x => ({ ...x, status: 'live', diff: undefined, tasks: x.tasks.map((t, i) => (i < 2 ? { ...t, status: 'doing' } : t)) }))
  next = { ...next, handoffs: next.handoffs.filter(h => !(h.topic === 'Campaign plan' && h.ref === id)) }
  const first = c.posts[0]
  if (first) {
    next = pushHandoff(next, {
      agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Campaign post', action: 'atlas-plan', chain: ['sage', 'atlas'], ref: id,
      title: `First ${c.name} post: ${first.title}`, context: `Sage handed ${c.posts.length} posts to Atlas. This is the first; the rest follow the plan.`,
      why: 'Campaign posts go through you until the campaign is running.', confidence: 76, link: '/publishing/calendar',
      preview: { type: 'post', network: first.network, slot: `${dayLabel(c.base + first.day * 86_400_000, now(s))}, 18:00`, text: [`${first.title}. ${c.messages[0] ?? ''}`.trim()] },
    })
  }
  const byAgent = c.tasks.reduce<Record<string, number>>((m, t) => ({ ...m, [t.agent]: (m[t.agent] ?? 0) + 1 }), {})
  next = pushLog(next, { agent: 'sage', text: `Launched ${c.name}: ${c.posts.length} posts to Atlas, ${Object.entries(byAgent).filter(([a]) => a !== 'atlas').map(([a, n]) => `${n} task${n > 1 ? 's' : ''} to ${a[0].toUpperCase() + a.slice(1)}`).join(', ')}`, status: 'approved', reason: 'You approved the campaign', link: `/strategy/campaigns/${id}` })
  return next
}

export function reduceStrategy(s: State, a: StrategyAction): State {
  switch (a.type) {
    case 'strategy/create': {
      const c = generatePlan(a.id, a.brief, now(s), { budget: a.budget })
      return pushLog(patch(s, { campaigns: [c, ...s.strategy.campaigns] }), { agent: 'sage', text: `Built a campaign plan: ${c.name}`, status: 'done', reason: 'Your brief', link: `/strategy/campaigns/${c.id}` })
    }
    case 'strategy/approve':
      return approveCampaign(s, a.id)
    case 'strategy/changes': {
      const c = campaign(s, a.id)
      if (!c) return s
      const v = revisePlan(c, a.feedback)
      return pushLog(updateCampaign(s, a.id, () => v), { agent: 'sage', text: `Revised ${c.name} (v${v.version}): ${v.diff?.length ?? 0} changes`, status: 'done', reason: `Your note: ${a.feedback}` })
    }
    case 'strategy/discard': {
      const c = campaign(s, a.id)
      if (!c) return s
      const next = { ...patch(s, { campaigns: s.strategy.campaigns.filter(x => x.id !== a.id) }), handoffs: s.handoffs.filter(h => h.ref !== a.id) }
      return pushLog(next, { agent: 'sage', text: `Discarded the ${c.name} plan`, status: 'rejected', reason: 'Your call' })
    }
    case 'strategy/reassign': {
      const c = campaign(s, a.id)
      const t = c?.tasks.find(x => x.id === a.task)
      if (!c || !t || t.agent === a.agent) return s
      return pushLog(updateCampaign(s, a.id, x => ({ ...x, tasks: x.tasks.map(y => (y.id === a.task ? { ...y, agent: a.agent } : y)) })),
        { agent: 'sage', text: `Moved “${t.label}” from ${cap(t.agent)} to ${cap(a.agent)}`, status: 'approved', reason: `You reassigned it in ${c.name}` })
    }
    case 'strategy/adjust':
      return applyAdjust(s, a.id, a.adj, a.accept)
    case 'strategy/reopen':
      // Only a decline can be taken back: an applied change already moved posts.
      return a.adj
        ? updateCampaign(s, a.id, x => ({ ...x, adjustments: x.adjustments.map(y => (y.id === a.adj && y.status === 'declined' ? { ...y, status: 'proposed' } : y)) }))
        : patch(s, { proposals: s.strategy.proposals.map(x => (x.id === a.id && x.status === 'declined' ? { ...x, status: 'proposed' } : x)) })
    case 'strategy/proposal': {
      const p = s.strategy.proposals.find(x => x.id === a.id)
      if (!p) return s
      return pushLog(patch(s, { proposals: s.strategy.proposals.map(x => (x.id === a.id ? { ...x, status: a.accept ? 'accepted' : 'declined' } : x)) }),
        { agent: 'sage', text: `${p.text}: ${a.accept ? 'accepted' : 'declined'}`, status: a.accept ? 'approved' : 'rejected', reason: 'Your call on the pillars' })
    }
    case 'strategy/cadence':
      return patch(s, { cadence: s.strategy.cadence.map(c => (c.network === a.network ? { ...c, target: Math.max(0, a.target) } : c)) })
  }
}

const cap = (x: string) => x[0].toUpperCase() + x.slice(1)

function applyAdjust(s: State, id: string, adj: string, accept: boolean): State {
  const c = campaign(s, id)
  const a = c?.adjustments.find(x => x.id === adj)
  if (!c || !a) return s
  let next = updateCampaign(s, id, x => ({
    ...x,
    adjustments: x.adjustments.map(y => (y.id === adj ? { ...y, status: accept ? 'accepted' : 'declined' } : y)),
    posts: accept && adj === 'adj1' ? x.posts.map(p => (p.id === 'tw6' || p.id === 'tw7' ? { ...p, network: 'tiktok' as const } : p))
      : accept && adj === 'adj2' ? x.posts.map(p => (p.id === 'tw7' ? { ...p, title: 'Plan your trail from the sofa' } : p)) : x.posts,
  }))
  if (adj === 'adj1') next = { ...next, handoffs: next.handoffs.filter(h => h.id !== 'h-cadence') }
  return pushLog(next, { agent: 'sage', text: `${c.name}: ${a.text.split('.').slice(-2, -1)[0]?.trim() || a.text} ${accept ? '(accepted)' : '(declined)'}`, status: accept ? 'approved' : 'rejected', reason: 'Your call on the campaign' })
}

export function onResolveStrategy(s: State, h: Handoff, d: Decision): State {
  if (h.id === 'h-cadence') return d.kind === 'approve' ? applyAdjust(s, 'trail-week', 'adj1', true) : d.kind === 'reject' ? applyAdjust(s, 'trail-week', 'adj1', false) : s
  if (h.topic === 'Campaign' && /Trail Week/.test(h.title) && d.kind === 'option') {
    return d.index === 0 ? updateCampaign(s, 'trail-week', c => ({ ...c, goal: { ...c.goal, target: 360 }, planned: c.planned.map(v => Math.round(v * 1.2)) })) : s
  }
  if (h.topic === 'Pillars' && d.kind === 'approve') {
    return patch(s, {
      proposals: [{ id: uid('pr'), text: 'Add 2 customer-photo posts per week on Instagram', why: h.context, status: 'accepted' }, ...s.strategy.proposals],
      cadence: s.strategy.cadence.map(c => (c.network === 'instagram' ? { ...c, target: c.target + 2 } : c)),
    })
  }
  if (h.topic === 'Campaign plan' && h.ref) {
    if (d.kind === 'approve') return approveCampaign(s, h.ref)
    if (d.kind === 'reject') return { ...patch(s, { campaigns: s.strategy.campaigns.filter(c => c.id !== h.ref) }) }
  }
  return s
}
