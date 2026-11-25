import type { State } from '../../app/state'
import type { AgentId, Decision, Handoff, LogEntry, Network } from '../../app/types'
import { actionOf, agentOf, now, pushHandoff, pushLog, uid } from '../../app/core'
import { CADENCE, CAMPAIGNS, PILLARS, PROPOSALS, applyChange, generatePlan, pillarMix, postsLastWeek, revisePlan, targetsFrom, type Cadence, type CPost, type Campaign, type Pillar, type Proposal, type TargetsChange, type BriefInput } from '../../data/strategy'
import { BEST_SLOT, type Post } from '../../data/publishing'
import { NETWORK_LABEL } from '../../data/agents'
import { DAY, dayLabel } from '../../app/time'

export type StrategyState = { campaigns: Campaign[]; pillars: Pillar[]; cadence: Cadence[]; proposals: Proposal[] }

export const initialStrategy = (): StrategyState => ({
  campaigns: structuredClone(CAMPAIGNS), pillars: structuredClone(PILLARS), cadence: structuredClone(CADENCE), proposals: structuredClone(PROPOSALS),
})

export type StrategyAction =
  | { type: 'strategy/create'; id: string; brief: string; budget?: number; input?: Omit<BriefInput, 'text'> }
  | { type: 'strategy/approve'; id: string }
  | { type: 'strategy/changes'; id: string; feedback: string }
  | { type: 'strategy/discard'; id: string }
  | { type: 'strategy/reassign'; id: string; task: string; agent: AgentId }
  | { type: 'strategy/adjust'; id: string; adj: string; accept: boolean }
  | { type: 'strategy/proposal'; id: string; accept: boolean }
  | { type: 'strategy/reopen'; id: string; adj?: string }
  | { type: 'strategy/cadence'; network: Network; target: number }
  | { type: 'strategy/propose'; proposal: Proposal }

const patch = (s: State, p: Partial<StrategyState>): State => ({ ...s, strategy: { ...s.strategy, ...p } })
const campaign = (s: State, id: string) => s.strategy.campaigns.find(c => c.id === id)
const updateCampaign = (s: State, id: string, f: (c: Campaign) => Campaign): State =>
  patch(s, { campaigns: s.strategy.campaigns.map(c => (c.id === id ? f(c) : c)) })

/** Sage's pillars and weekly cadence: the one source. Atlas (Ideas, plan review, calendar) and the Playbook read them here. */
export const targetsOf = (s: State) => targetsFrom(s.strategy)
/** What actually went out, per pillar (% of posts, 30 days) and per network (posts, 7 days), from Atlas's posts. */
export const mixOf = (s: State, t = now(s)) => pillarMix(s.publishing.posts, s.strategy.pillars.map(p => p.name), t)
export const lastWeekOf = (s: State, t = now(s)) => postsLastWeek(s.publishing.posts, t)

declare module '../../app/types' {
  interface LogEntry {
    /** What Sage changed, so Undo puts it back. `card`: the Desk card it came from, whose Undo is the core's journal line. */
    sage?: SageUndo
  }
}
export type SageUndo = { card?: string; campaigns?: Campaign[]; posts?: { added: string[]; before: Post[] }; targets?: Pick<StrategyState, 'pillars' | 'cadence'>; proposals?: Proposal[] }

/** What a Sage Desk card changes when it's approved (or its first option picked). */
export type SageCard = { campaign?: string; goal?: number; adjust?: string; change?: TargetsChange }
declare module '../../app/types' {
  interface Handoff { sage?: SageCard }
}
/** Cards seeded outside Sage's files (the Desk seed, Day 1) say what they change here. */
const SEED_CARDS: Record<string, SageCard> = {
  'h-cadence': { campaign: 'trail-week', adjust: 'adj1' },
  'd1-sage': { change: { pillars: { 'Gear that lasts': 35, 'Trail stories': 25, 'Repair & care': 20, Community: 20 }, cadence: { instagram: 5, tiktok: 4, facebook: 3, linkedin: 3, youtube: 1, x: 1 } } },
}
export const cardOf = (h: Handoff): SageCard | undefined => h.sage ?? SEED_CARDS[h.id]

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
  return addPlan(s, generatePlan(uid('cmp'), brief, now(s), { source, cadence: targetsOf(s).cadence }), { brief, source, from })
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
  if (u.targets) next = patch(next, u.targets)
  if (u.proposals) next = patch(next, { proposals: u.proposals })
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
      return addPlan(s, generatePlan(a.id, { ...a.input, text: a.brief }, now(s), { budget: a.budget, cadence: targetsOf(s).cadence }), { brief: a.brief })
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
      // A decline is taken back here; an applied change is undone from the journal.
      return a.adj
        ? updateCampaign(s, a.id, x => ({ ...x, adjustments: x.adjustments.map(y => (y.id === a.adj && y.status === 'declined' ? { ...y, status: 'proposed' } : y)) }))
        : patch(s, { proposals: s.strategy.proposals.map(x => (x.id === a.id && x.status === 'declined' ? { ...x, status: 'proposed' } : x)) })
    case 'strategy/proposal': {
      const p = s.strategy.proposals.find(x => x.id === a.id)
      if (!p || p.status !== 'proposed') return s
      const next = patch(s, { proposals: s.strategy.proposals.map(x => (x.id === a.id ? { ...x, status: a.accept ? 'accepted' : 'declined' } : x)) })
      if (!a.accept) return pushLog(next, { agent: 'sage', text: `${p.text}: declined`, status: 'rejected', reason: 'Your call on the pillars', link: '/strategy/pillars' })
      return changeTargets(next, p.change ?? {}, { text: `${p.text}: applied`, reason: 'You applied Sage’s proposal', before: s.strategy })
    }
    case 'strategy/propose': {
      if (s.strategy.proposals.some(p => p.text === a.proposal.text && p.status === 'proposed')) return s
      return pushLog(patch(s, { proposals: [a.proposal, ...s.strategy.proposals] }), { agent: 'sage', text: `Proposed: ${a.proposal.text}`, status: 'done', reason: 'You asked for it', link: '/strategy/pillars' })
    }
    case 'strategy/cadence': {
      const c = s.strategy.cadence.find(x => x.network === a.network)
      const target = Math.max(0, a.target)
      if (!c || c.target === target) return s
      // Steppers clicked in a row make one journal line, undone in one go.
      const last = s.log[0]
      const again = last?.agent === 'sage' && last.status === 'done' && last.sage?.targets && last.text.startsWith(`You set ${NETWORK_LABEL[a.network]} to `) && (last.undoUntil ?? 0) > now(s)
      const base = again ? { ...s, log: s.log.slice(1) } : s
      return changeTargets(base, { cadence: { [a.network]: target } }, {
        text: `You set ${NETWORK_LABEL[a.network]} to ${target} post${target === 1 ? '' : 's'} a week. Atlas plans to it from next week.`,
        reason: 'Your change to the cadence', status: 'done', before: again ? { ...s.strategy, ...last.sage!.targets! } : s.strategy,
      })
    }
  }
}

const cap = (x: string) => x[0].toUpperCase() + x.slice(1)

/** Sage's targets change: pillars, cadence, or both. Logged with a real Undo; Atlas reads the new targets at once. */
function changeTargets(s: State, ch: TargetsChange, o: { text: string; reason: string; status?: 'approved' | 'done'; card?: Handoff; before?: StrategyState; record?: Proposal }): State {
  const before = o.before ?? s.strategy
  let next = patch(s, applyChange(s.strategy, ch))
  if (o.record) next = patch(next, { proposals: [o.record, ...next.strategy.proposals] })
  return pushLog(next, {
    agent: 'sage', text: o.text, status: o.status ?? 'approved', reason: o.reason, link: '/strategy/pillars', undoMinutes: o.card ? undefined : 10,
    sage: { card: o.card?.id, targets: { pillars: before.pillars, cadence: before.cadence }, proposals: before.proposals },
  })
}

/** An adjustment to a live campaign: its moves change the campaign's posts and their copies in Atlas's calendar. */
function applyAdjust(s: State, id: string, adj: string, accept: boolean, card?: Handoff): State {
  const c = campaign(s, id)
  const a = c?.adjustments.find(x => x.id === adj)
  if (!c || !a || a.status !== 'proposed') return s
  const moves = accept ? a.moves ?? [] : []
  const posts = c.posts.map(p => {
    const m = moves.find(x => x.post === p.id)
    return m ? { ...p, network: m.network ?? p.network, title: m.title ?? p.title } : p
  })
  const after: Campaign = { ...c, posts, adjustments: c.adjustments.map(y => (y.id === adj ? { ...y, status: accept ? 'accepted' : 'declined' } : y)) }
  const touched = new Set(moves.map(m => posts.find(p => p.id === m.post)).filter((p): p is CPost => !!p).map(p => p.postId ?? p.id))
  const inCalendar = s.publishing.posts.filter(p => touched.has(p.id) && p.status !== 'published')
  const moved = inCalendar.map(p => {
    const cp = posts.find(x => (x.postId ?? x.id) === p.id)!
    const m = moves.find(x => x.post === cp.id)!
    return { ...p, network: cp.network, text: m.title ? `${m.title}. ${c.messages[0] ?? ''}`.trim() : p.text, note: `Changed by Sage: ${a.text}` }
  })
  // The Desk card raising the same adjustment goes with it.
  const cards = s.handoffs.filter(h => h.id !== card?.id && cardOf(h)?.adjust === adj && cardOf(h)?.campaign === id)
  let next = toAtlas({ ...updateCampaign(s, id, () => after), handoffs: s.handoffs.filter(h => !cards.includes(h)) }, moved)
  const what = a.text.split('. ').slice(-1)[0].replace(/\.$/, '')
  if (!accept) return pushLog(next, { agent: 'sage', text: `${c.name}: ${what} (declined)`, status: 'rejected', reason: 'Your call on the campaign', link: `/strategy/campaigns/${id}` })
  next = pushLog(next, {
    agent: 'sage', text: `${c.name}: ${what}${moved.length ? ` (${moved.length} post${moved.length > 1 ? 's' : ''} changed in Atlas’s calendar)` : ''}`, status: 'approved', reason: 'Your call on the campaign',
    link: `/strategy/campaigns/${id}`, undoMinutes: card ? undefined : 10, restore: card ? undefined : cards,
    sage: { card: card?.id, campaigns: [c], posts: { added: [], before: inCalendar } },
  })
  return next
}

/** A new goal for a live campaign: the planned trajectory scales with it. */
function setGoal(s: State, id: string, goal: number, card: Handoff): State {
  const c = campaign(s, id)
  if (!c || c.goal.target === goal) return s
  const k = goal / c.goal.target
  const next = updateCampaign(s, id, x => ({ ...x, goal: { ...x.goal, target: goal }, planned: x.planned.map(v => Math.round(v * k)) }))
  return pushLog(next, { agent: 'sage', text: `${c.name}: goal raised from ${c.goal.target.toLocaleString('en-GB')} to ${goal.toLocaleString('en-GB')} ${c.goal.label}`, status: 'approved', reason: 'Your call on the goal', link: `/strategy/campaigns/${id}`, sage: { card: card.id, campaigns: [c] } })
}

export function onResolveStrategy(s: State, h: Handoff, d: Decision): State {
  const k = cardOf(h)
  const yes = d.kind === 'approve' || d.kind === 'trial' || (d.kind === 'option' && d.index === 0)
  if (k?.adjust && k.campaign) return yes ? applyAdjust(s, k.campaign, k.adjust, true, h) : d.kind === 'reject' ? applyAdjust(s, k.campaign, k.adjust, false, h) : s
  if (k?.goal && k.campaign) return yes ? setGoal(s, k.campaign, k.goal, h) : s
  if (k?.change) {
    if (!yes) return s
    const record: Proposal = { id: uid('pr'), text: h.title, why: h.context, status: 'accepted', change: k.change }
    return changeTargets(s, k.change, { text: `${h.title}: applied`, reason: 'You approved it on the Desk', card: h, record })
  }
  if (h.topic === 'Campaign plan' && h.ref && h.kind === 'approval') {
    if (d.kind === 'approve' || d.kind === 'trial') return approveCampaign(s, h.ref, { card: h })
    if (d.kind === 'reject') return { ...patch(s, { campaigns: s.strategy.campaigns.filter(c => c.id !== h.ref) }) }
  }
  return s
}

/* ---------- What Sage says in Chat and ⌘K (numbers read from the state, the same as the screens) ---------- */

const fmtN = (c: Campaign, v: number) => (c.goal.label.includes('€') ? `€${v.toLocaleString('en-GB')}` : v.toLocaleString('en-GB'))
const unit = (c: Campaign) => c.goal.label.replace(' (€)', '')

/** The campaign a question names, or the live one. */
export function findCampaign(s: State, name?: string): Campaign | undefined {
  const q = name?.toLowerCase().replace(/\b(the|campaign)\b/g, '').trim()
  const named = q ? s.strategy.campaigns.find(c => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase().split(' ').slice(0, 2).join(' '))) : undefined
  return named ?? s.strategy.campaigns.find(c => c.status === 'live') ?? s.strategy.campaigns[0]
}

/** How a campaign is doing, in one sentence, with the numbers the campaign page shows. */
export function campaignStatus(s: State, c: Campaign, t = now(s)): { text: string; pct: number; trajectory?: number } {
  const pct = Math.round((c.goal.current / c.goal.target) * 100)
  if (c.status === 'review') return { pct, text: `${c.name} is a plan waiting for your approval: goal ${fmtN(c, c.goal.target)} ${unit(c)}, ${c.posts.length} posts from ${dateLabel(c.start)}.${launchBlock(s, c) ? ` ${launchBlock(s, c)}` : ''}` }
  if (c.status === 'done') return { pct, text: `${c.name} is over: ${fmtN(c, c.goal.current)} ${unit(c)} against a goal of ${fmtN(c, c.goal.target)}, ${pct}% of goal.` }
  const days = Math.ceil((c.end - c.start) / DAY)
  const day = Math.min(days, Math.max(1, Math.ceil((t - c.start) / DAY)))
  const expected = c.planned[Math.min(c.planned.length - 1, c.actual.length - 1)] ?? 0
  const trajectory = expected > 0 ? Math.round((c.goal.current / expected) * 100) : undefined
  const left = c.posts.filter(p => !p.published && slotOf(c, p) > t).sort((a, b) => a.day - b.day)
  const open = c.adjustments.filter(a => a.status === 'proposed').length
  return {
    pct, trajectory,
    text: `${c.name}: ${fmtN(c, c.goal.current)} of ${fmtN(c, c.goal.target)} ${unit(c)} on day ${day} of ${days}, ${pct}% of goal${trajectory ? ` and ${trajectory}% of the trajectory (${fmtN(c, expected)} expected by now)` : ''}. ${left.length} post${left.length === 1 ? '' : 's'} to go${left[0] ? `, next “${left[0].title}” on ${dateLabel(slotOf(c, left[0]))}` : ''}.${open ? ` I have ${open} adjustment${open > 1 ? 's' : ''} waiting for you.` : ''}`,
  }
}

/** Every pillar against its target, the furthest behind first. */
export function pillarStatus(s: State, t = now(s)) {
  const mix = mixOf(s, t)
  return s.strategy.pillars.map(p => ({ name: p.name, target: p.target, actual: mix[p.name] ?? 0, gap: (mix[p.name] ?? 0) - p.target })).sort((a, b) => a.gap - b.gap)
}

/** “More Community”: +5 points to that pillar, taken from the one furthest above its target (or the reverse for “less”). */
export function pillarProposal(s: State, pillar: string, more: boolean): Proposal | undefined {
  const rows = pillarStatus(s)
  const me = rows.find(r => r.name.toLowerCase() === pillar.toLowerCase())
  if (!me) return
  const other = more ? [...rows].reverse().find(r => r.name !== me.name && r.target >= 5) : rows.find(r => r.name !== me.name)
  if (!other || (!more && me.target < 5)) return
  const d = more ? 5 : -5
  const change: TargetsChange = { pillars: { [me.name]: me.target + d, [other.name]: other.target - d } }
  return {
    id: uid('pr'), status: 'proposed', change,
    text: `${more ? 'Raise' : 'Lower'} ${me.name} from ${me.target}% to ${me.target + d}% of posts, ${other.name} from ${other.target}% to ${other.target - d}%`,
    why: `${me.name} is at ${me.actual}% of posts against ${me.target}%; ${other.name} is at ${other.actual}% against ${other.target}%. Last 30 days.`,
  }
}
