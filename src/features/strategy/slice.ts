import type { State } from '../../app/state'
import type { AgentId, Decision, Handoff, LogEntry, Network } from '../../app/types'
import { actionOf, agentOf, now, pushHandoff, pushLog, uid } from '../../app/core'
import { CADENCE, CAMPAIGNS, PILLARS, PROPOSALS, generatePlan, revisePlan, targetsFrom, type Cadence, type CPost, type Campaign, type Pillar, type Proposal } from '../../data/strategy'
import { BEST_SLOT, type Post } from '../../data/publishing'
import { DAY, dayLabel } from '../../app/time'

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

/** Sage's pillars and weekly cadence: the one source. Atlas (Ideas, plan review, calendar) and the Playbook read them here. */
export const targetsOf = (s: State) => targetsFrom(s.strategy)

declare module '../../app/types' {
  interface LogEntry {
    /** What Sage changed, so Undo puts it back. `card`: the Desk card it came from, whose Undo is the core's journal line. */
    sage?: SageUndo
  }
}
export type SageUndo = { card?: string; campaigns?: Campaign[]; posts?: { added: string[]; before: Post[] } }

/* ---------- Atlas's calendar ---------- */

// ponytail: Sage writes Atlas's posts inline until Atlas exports its entry point
// (requests/atlas-from-sage-campaign-posts.md); swap these two for receivePosts / withdrawPosts then.
function toAtlas(s: State, posts: Post[]): State {
  const ids = new Set(posts.map(p => p.id))
  const keep = s.publishing.posts.filter(p => !ids.has(p.id) || p.status === 'published')
  const kept = new Set(keep.map(p => p.id))
  return { ...s, publishing: { ...s.publishing, posts: [...keep, ...posts.filter(p => !kept.has(p.id))] } }
}
function fromAtlas(s: State, ids: string[]): State {
  const drop = new Set(ids)
  return { ...s, publishing: { ...s.publishing, posts: s.publishing.posts.filter(p => !drop.has(p.id) || p.status === 'published') } }
}

/** When a campaign post goes out: its day, at Atlas's best slot for the network. */
export function slotOf(c: Campaign, p: CPost): number {
  const [h, m] = (BEST_SLOT[p.network]?.time ?? '18:00').split(':').map(Number)
  const d = new Date(c.base + p.day * DAY)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

/** The campaign's posts still to come, as Atlas schedules them: campaign, pillar and label kept. */
export function campaignPosts(c: Campaign, t: number): Post[] {
  return c.posts.filter(p => !p.published && slotOf(c, p) > t).map((p, i) => ({
    id: p.postId ?? p.id, network: p.network, at: slotOf(c, p), text: `${p.title}. ${c.messages[i % Math.max(1, c.messages.length)] ?? ''}`.trim(),
    status: 'scheduled', author: 'atlas', pillar: p.pillar ?? 'Gear that lasts', campaign: c.name, campaignId: c.id, labels: [c.name],
    note: `Campaign post from Sage’s ${c.name} plan.`,
  }))
}

/* ---------- Guardrail: active campaigns ---------- */

/** Why Sage can't launch this campaign now, or nothing. Reads the guardrail as Sam set it on Sage's profile. */
export function launchBlock(s: State, c: Campaign): string | undefined {
  const g = agentOf(s, 'sage').guardrails.find(x => x.id === 'g2')
  const max = g ? parseInt(g.value, 10) : NaN
  if (!Number.isFinite(max)) return undefined
  const live = s.strategy.campaigns.filter(x => x.status === 'live' && x.id !== c.id)
  if (live.length < max) return undefined
  const first = live.reduce((a, b) => (b.end < a.end ? b : a))
  return `${list(live.map(x => x.name))} ${live.length > 1 ? 'are' : 'is'} already live and the guardrail is ${max} active campaign${max > 1 ? 's' : ''}. ${c.name} can launch when ${first.name} ends, on ${dateLabel(first.end)}.`
}
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const dateLabel = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/* ---------- Plans ---------- */

/** A new plan: a Desk card at Draft, a heads-up at Suggest, launched straight away at Act (guardrail permitting). */
function addPlan(s: State, c: Campaign, opts: { brief: string; source?: string; from?: AgentId }): State {
  const level = actionOf(s, 'sage', 'sage-plan')?.autonomy ?? 'draft'
  const from = opts.from ? cap(opts.from) : undefined
  let next = patch(s, { campaigns: [c, ...s.strategy.campaigns] })
  next = pushLog(next, { agent: 'sage', text: from ? `Built a campaign plan from ${from}’s brief: ${c.name}` : `Built a campaign plan: ${c.name}`, status: 'done', reason: opts.source ?? 'Your brief', link: `/strategy/campaigns/${c.id}` })
  if (level === 'act' && !launchBlock(next, c)) return approveCampaign(next, c.id, { why: 'Campaign plans are set to Act' })
  const suggest = level === 'suggest'
  return pushHandoff(next, {
    agent: 'sage', kind: suggest ? 'news' : 'approval', urgency: 'week', topic: 'Campaign plan', action: 'sage-plan', chain: opts.from ? [opts.from, 'sage'] : undefined, ref: c.id,
    title: `Campaign plan ready: ${c.name}`, context: `${c.posts.length} posts in 3 phases, goal ${c.goal.target.toLocaleString('en-GB')} ${c.goal.label}. Brief: “${opts.brief}”`,
    why: suggest ? 'Campaign plans are set to Suggest: you launch them from Strategy.' : launchBlock(next, c) ?? 'Campaign plans are set to Draft.', confidence: 72, link: `/strategy/campaigns/${c.id}`,
    preview: { type: 'plan', title: c.name, lines: [`Goal: ${c.goal.target.toLocaleString('en-GB')} ${c.goal.label}`, `${c.posts.length} posts · boost budget €${c.budget}`, `Starts ${dayLabel(c.start, now(s))}`] },
    ...(suggest ? { cta: { label: 'Review the plan', to: `/strategy/campaigns/${c.id}` } } : {}),
  })
}

/** Sage turns a brief into a plan to review, and puts a card on the Desk. Used by Listening's “Brief Sage” and Atlas's Ideas. */
export function briefSage(s: State, brief: string, source: string, from: AgentId = 'echo'): State {
  return addPlan(s, generatePlan(uid('cmp'), brief, now(s), { source }), { brief, source, from })
}

/**
 * Launch: the campaign goes live, every post still to come lands in Atlas's calendar, the plan card leaves the Desk.
 * `card`: settled from the Desk (the core's journal line carries the Undo). `why`: Sage did it alone (Act).
 */
function approveCampaign(s: State, id: string, opts: { card?: Handoff; why?: string } = {}): State {
  const c = campaign(s, id)
  if (!c || c.status === 'live' || c.status === 'done') return s
  const block = launchBlock(s, c)
  if (block) return opts.card ? pushHandoff(s, { ...opts.card, why: block, fresh: true }) : s
  const posts = campaignPosts(c, now(s))
  const ids = new Set(posts.map(p => p.id))
  const before = s.publishing.posts.filter(p => ids.has(p.id))
  const cards = s.handoffs.filter(h => h.topic === 'Campaign plan' && h.ref === id)
  let next = updateCampaign(s, id, x => ({ ...x, status: 'live', diff: undefined, tasks: x.tasks.map((t, i) => (i < 2 && t.status === 'todo' ? { ...t, status: 'doing' } : t)) }))
  next = toAtlas({ ...next, handoffs: next.handoffs.filter(h => !cards.includes(h)) }, posts)
  const byAgent = c.tasks.reduce<Record<string, number>>((m, t) => ({ ...m, [t.agent]: (m[t.agent] ?? 0) + 1 }), {})
  const tasks = Object.entries(byAgent).filter(([a]) => a !== 'atlas').map(([a, n]) => `${n} task${n > 1 ? 's' : ''} to ${cap(a)}`)
  return pushLog(next, {
    agent: 'sage', text: `Launched ${c.name}: ${posts.length} post${posts.length === 1 ? '' : 's'} in Atlas’s calendar${tasks.length ? `, ${list(tasks)}` : ''}`,
    status: opts.why ? 'done' : 'approved', reason: opts.why ?? 'You approved the campaign', link: `/strategy/campaigns/${id}`,
    undoMinutes: opts.card ? undefined : opts.why ? 30 : 10, restore: opts.card ? undefined : cards,
    sage: { card: opts.card?.id, campaigns: [c], posts: { added: posts.map(p => p.id), before } },
  })
}

/** Put back what one of Sage's journal lines changed. */
function reverse(s: State, u: SageUndo): State {
  let next = s
  if (u.campaigns) {
    const back = new Map(u.campaigns.map(c => [c.id, c]))
    next = patch(next, { campaigns: next.strategy.campaigns.map(c => back.get(c.id) ?? c) })
  }
  if (u.posts) next = toAtlas(fromAtlas(next, u.posts.added), u.posts.before)
  return next
}

/** A journal line was undone: Sage's own, or the core's line for a Sage card settled on the Desk. */
export function onUndoStrategy(s: State, entry: LogEntry): State {
  if (entry.sage) return reverse(s, entry.sage)
  let next = s
  for (const h of entry.restore ?? []) {
    const mine = next.log.find(l => l.sage?.card === h.id && l.status !== 'undone')
    if (mine?.sage) next = { ...reverse(next, mine.sage), log: next.log.map(l => (l.id === mine.id ? { ...l, status: 'undone' as const } : l)) }
  }
  return next
}

/** Campaigns past their end date close themselves. */
export const campaignsDue = (s: State, t: number) => s.strategy.campaigns.some(c => c.status === 'live' && c.end < t)
export function closeCampaigns(s: State, t: number): State {
  let next = s
  for (const c of s.strategy.campaigns.filter(x => x.status === 'live' && x.end < t)) {
    next = updateCampaign(next, c.id, x => ({ ...x, status: 'done' }))
    next = pushLog(next, { agent: 'sage', text: `${c.name} ended: ${c.goal.current.toLocaleString('en-GB')} of ${c.goal.target.toLocaleString('en-GB')} ${c.goal.label}`, status: 'done', reason: `The campaign ran until ${dateLabel(c.end)}`, link: `/strategy/campaigns/${c.id}` })
  }
  return next
}

export function reduceStrategy(s: State, a: StrategyAction): State {
  switch (a.type) {
    case 'strategy/create':
      return addPlan(s, generatePlan(a.id, a.brief, now(s), { budget: a.budget }), { brief: a.brief })
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
  if (h.topic === 'Campaign plan' && h.ref && h.kind === 'approval') {
    if (d.kind === 'approve' || d.kind === 'trial') return approveCampaign(s, h.ref, { card: h })
    if (d.kind === 'reject') return { ...patch(s, { campaigns: s.strategy.campaigns.filter(c => c.id !== h.ref) }) }
  }
  return s
}
