import type { State } from '../../app/state'
import type { Decision, Flagged, Handoff, Network } from '../../app/types'
import { DAY, T, hhmm } from '../../app/time'
import { actionOf, addRule, agentOf, now, pushHandoff, notify, pushLog, removeHandoff, track, uid } from '../../app/core'
import { BEST_SLOT, PLAN, PLAN_ALTERNATIVES, PLAN_B, POSTS, QUEUES, type Media, type PlanItem, type Post, type Queue } from '../../data/publishing'
import { AGENTS, agentName } from '../../data/agents'
import { RULES } from '../../data/playbook'
import { DEMO_START } from '../../app/time'
import { IDEA_SEEDS, type Idea, type IdeaOrigin } from '../../data/ideas'
import { briefSage, targetsOf } from '../strategy/slice'
import { libraryOf, pickVisual, visualCardOf, waitingForVisual } from './visuals'
import { RETRY_OPTIONS, failureCardOf, retried, type Retry } from './failures'
import { PAUSE_TOPIC, fitCap, overCap, pauseAll, pauseFor, resumeAll } from './guards'
import { WINDOW_TOPIC, resolveWindow } from './window'
import { approved, sendToClaire } from './approvals'
import { withFormat } from './formats'
import { fillQueues } from './queues'
import { perfOf, recycleSeed } from './perf'
import { editLabels, withLabels } from './labels'
import { licencesToRaise, tagsFor } from './media'
import { NOTES, avoidQuiet, onQuietDays, quietCardText, startOfDay, type DayNote } from './notes'
import {
  LEARNED_ORIGIN, applyAngle, applyInstruction, capIdeas, draftIdea, draftsAlone, expireIdeas, gapDays, gapSeed, heldByRules, ideaPosts,
  isOpen, learn, makeIdea, outcomeOf, setDraftText, spotIdeas, wakeIdeas, type Angle,
} from './ideasModel'

export type PlanState = {
  /** upcoming: a Day 1 workspace, before Atlas's first plan. */
  status: 'upcoming' | 'proposed' | 'approved' | 'rejected'
  version: number
  items: PlanItem[]
  diff?: { added: string[]; removed: string[]; changed: string[] }
  request?: string
}
/** Last bulk change, kept 10 s so it can be undone in one click. */
export type PubUndo = { label: string; posts: Post[]; handoffs: string[]; until: number; ideas?: Idea[]; hold?: { at: number } | 'none' }
/** What one Desk card changed in Publishing, so its Undo restores exactly that (posts and ideas as they were, posts it added, the plan). */
export type CardUndo = { posts: Post[]; added: string[]; ideas: Idea[]; plan?: PlanState; hold?: { at: number } | 'none' }
export type PublishingState = { posts: Post[]; plan: PlanState; undo?: PubUndo; ideas: Idea[]; learned: Record<string, number>; byCard: Record<string, CardUndo>; uploads: Media[]; queues: Queue[]; notes: DayNote[]; mediaTags: Record<string, string[]>; hold?: { at: number } }
const ATLAS_LEVELS = Object.fromEntries(AGENTS.find(a => a.id === 'atlas')!.actions.map(x => [x.id, x.autonomy]))
export const initialPublishing = (): PublishingState => ({
  posts: structuredClone(POSTS).map(p => withLabels(p)), plan: { status: 'proposed', version: 1, items: structuredClone(PLAN) },
  ideas: spotIdeas(DEMO_START, POSTS, ATLAS_LEVELS, RULES), learned: {}, byCard: {}, uploads: [], queues: structuredClone(QUEUES), notes: structuredClone(NOTES), mediaTags: {},
})

/** Monday 1 December, the plan's week. */
export const PLAN_MONDAY = T(0, 0, 6)

export type PublishingAction =
  | { type: 'publishing/upsert'; post: Post; verb?: string }
  | { type: 'publishing/move'; id: string; at: number }
  | { type: 'publishing/delete'; id: string }
  | { type: 'publishing/planToggle'; id: string }
  | { type: 'publishing/planApprove' }
  | { type: 'publishing/planReject' }
  | { type: 'publishing/planRequest'; text: string }
  | { type: 'publishing/planReset' }
  | { type: 'publishing/askFill'; day: number; network: Network }
  | { type: 'publishing/claire'; post: Post }
  | { type: 'publishing/addToPlan'; post: Post }
  | { type: 'publishing/bulk'; ids: string[]; op: BulkOp; shiftDays?: number; at?: number; network?: Network }
  | { type: 'publishing/restore' }
  | { type: 'publishing/ideaOpen'; id: string }
  | { type: 'publishing/ideaDraft'; id: string }
  | { type: 'publishing/ideaRedirect'; id: string; mode: 'angle'; angle: Angle }
  | { type: 'publishing/ideaRedirect'; id: string; mode: 'free'; text: string }
  | { type: 'publishing/ideaRedirect'; id: string; mode: 'variant' | 'edit'; network: Network; text: string; label: string }
  | { type: 'publishing/ideaRestoreVersion'; id: string; n: number }
  | { type: 'publishing/ideaSlot'; id: string; network: Network; at: number }
  | { type: 'publishing/ideaSchedule'; ids: string[] }
  | { type: 'publishing/ideaSnooze'; ids: string[] }
  | { type: 'publishing/ideaDismiss'; id: string; reason: string }
  | { type: 'publishing/ideaReopen'; id: string }
  | { type: 'publishing/ideaRule'; id: string; accept: boolean }
  | { type: 'publishing/ideaToPlan'; id: string }
  | { type: 'publishing/ideaToSage'; id: string }
  | { type: 'publishing/upload'; media: Media; post?: string }
  | { type: 'publishing/retry'; id: string; mode: Retry }
  | { type: 'publishing/resume'; ids: string[] }
  | { type: 'publishing/pauseAll' }
  | { type: 'publishing/resumeAll' }
  | { type: 'publishing/firstComment'; id: string; text: string }
  | { type: 'publishing/queueSlot'; queue: string; index: number; weekday?: number; time?: string }
  | { type: 'publishing/fillQueue'; queue?: string; days?: number; from?: number }
  | { type: 'publishing/recycle'; id: string }
  | { type: 'publishing/labels'; ids: string[]; add?: string[]; remove?: string[] }
  | { type: 'publishing/noteAdd'; day: number; text: string; quiet: boolean }
  | { type: 'publishing/noteRemove'; id: string }
  | { type: 'publishing/mediaTags'; id: string; tags: string[] }
  | { type: 'publishing/swapMedia'; from: string; to: string }

export type BulkOp = 'approve' | 'delete' | 'reschedule' | 'duplicate' | 'claire'

const plain = (p: Flagged[]) => p.map(x => (typeof x === 'string' ? x : x.text)).join('')
const setPosts = (s: State, posts: Post[]): State => ({ ...s, publishing: { ...s.publishing, posts } })
const patchPost = (s: State, id: string, p: Partial<Post>): State => setPosts(s, s.publishing.posts.map(x => (x.id === id ? { ...x, ...p } : x)))
const setPlan = (s: State, plan: Partial<PlanState>): State => ({ ...s, publishing: { ...s.publishing, plan: { ...s.publishing.plan, ...plan } } })

const planItemAt = (i: PlanItem) => { const [h, m] = i.time.split(':').map(Number); return PLAN_MONDAY + i.day * DAY + (h * 60 + m) * 60_000 }

/** Why a slot is good, in Atlas's words. */
export function slotComment(network: Network, at: number) {
  const d = new Date(at)
  const hour = d.getHours()
  const best = BEST_SLOT[network]
  const [bh] = best.time.split(':').map(Number)
  // The reason names the best day: only quote it as is on that day, or it reads as if Wednesday were a Friday.
  if (Math.abs(hour - bh) <= 1) return (d.getDay() + 6) % 7 === best.day ? `Good slot. ${best.reason}` : `Good slot: the right time of day. ${best.dayName}s at this hour do best, ${best.reason.replace(/ on \w+s,/, ',')}`
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' })
  return `${day} ${hhmm(at)} works, but ${best.time} would likely do better. ${best.reason}`
}

/** "Today, 18:30", "Thu 27, 18:00", "Tomorrow, 18:00" → app time. */
export function parseSlot(slot: string, base: number): number {
  const tm = slot.match(/(\d{1,2}):(\d{2})/)
  const [h, m] = tm ? [+tm[1], +tm[2]] : [18, 0]
  const b = new Date(base)
  let date = new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1)
  if (/today/i.test(slot)) date = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  else if (/tomorrow/i.test(slot)) date = new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1)
  else {
    const dm = slot.match(/\b(\d{1,2})\b(?!:)/)
    if (dm) for (let i = 0; i < 20; i++) { const c = new Date(b.getFullYear(), b.getMonth(), b.getDate() + i); if (c.getDate() === +dm[1]) { date = c; break } }
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m).getTime()
}

function approvePlan(s: State): State {
  const included = s.publishing.plan.items.filter(i => i.included)
  const posts: Post[] = []
  for (const i of included) posts.push(fitCap([...s.publishing.posts, ...posts], avoidQuiet(s.publishing.notes, withFormat({ id: uid('p'), network: i.network, at: planItemAt(i), text: i.text, media: i.media, status: 'scheduled', author: 'atlas', pillar: i.pillar, campaign: i.tag === 'Campaign' ? 'Trail Week' : undefined }))))
  let next = setPlan(setPosts(s, [...s.publishing.posts, ...posts]), { status: 'approved' })
  next = notify(next, 'publishing', `${posts.length} posts scheduled for the week of 1 December. Atlas takes it from here.`)
  return next
}

/** Atlas reworks the plan after a change request: removed posts get replacements, one caption follows your note. */
function reworkPlan(s: State, request: string): State {
  const p = s.publishing.plan
  const added: string[] = [], removed: string[] = [], changed: string[] = []
  let items = p.items.flatMap(i => {
    if (i.included) return [i]
    removed.push(i.text)
    const alt = PLAN_ALTERNATIVES[i.network]
    if (!alt) return []
    added.push(alt.text)
    return [{ ...i, id: uid('n'), text: alt.text, reason: alt.reason, pillar: alt.pillar, media: alt.media, tag: 'New' as const, included: true }]
  })
  const lower = request.toLowerCase()
  const target = items.find(i => lower.includes(i.network)) ?? items.find(i => /short|hook|caption/.test(lower) && i.network === 'tiktok') ?? items.find(i => i.tag === 'Recycled')
  if (target) {
    const before = target.text
    // Only rewrites Atlas knows how to do. Your note is never pasted into a caption that would be published.
    const after = /short|hook/.test(lower) ? before.split(/[.:]/)[0] + '.' : /emoji/.test(lower) ? before.replace(/\p{Extended_Pictographic}/gu, '').trim() : before
    if (after !== before) { items = items.map(i => (i.id === target.id ? { ...i, text: after } : i)); changed.push(`${before} → ${after}`) }
  }
  return setPlan(s, { items, version: p.version + 1, diff: { added, removed, changed }, request, status: 'proposed' })
}

export function reducePublishing(s: State, a: PublishingAction): State {
  switch (a.type) {
    case 'publishing/upsert': {
      const exists = s.publishing.posts.some(p => p.id === a.post.id)
      const next = setPosts(s, exists ? s.publishing.posts.map(p => (p.id === a.post.id ? a.post : p)) : [...s.publishing.posts, a.post])
      const verb = a.verb ?? (a.post.status === 'draft' ? 'Saved as draft' : a.post.status === 'scheduled' ? `Scheduled for ${new Date(a.post.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} ${hhmm(a.post.at)}` : 'Saved')
      return notify(next, 'publishing', `${verb}: ${a.post.text.slice(0, 60)}${a.post.text.length > 60 ? '…' : ''}`)
    }
    case 'publishing/move': {
      const p = s.publishing.posts.find(x => x.id === a.id)
      if (!p || p.at === a.at) return s
      if (overCap(s.publishing.posts, { ...p, at: a.at })) return notify(s, 'publishing', `${NET[p.network] ?? p.network} already has 3 posts on ${new Date(a.at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric' })}. Atlas keeps it at 3 a day: pick another day.`)
      const comment = slotComment(p.network, a.at)
      // Atlas's comment on the new slot stays on the post, not in a toast that vanishes.
      const next = pushLog(setPosts(s, s.publishing.posts.map(x => (x.id === a.id ? note({ ...x, at: a.at, note: comment }, now(s), `Moved from ${day(p.at)} to ${day(a.at)}`) : x))), { agent: 'atlas', text: `You moved “${p.text.slice(0, 48)}…” to ${new Date(a.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} ${hhmm(a.at)}`, status: 'done', reason: comment, link: '/publishing/calendar', detail: { before: new Date(p.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), after: new Date(a.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) } })
      return next
    }
    case 'publishing/delete': {
      const p = s.publishing.posts.find(x => x.id === a.id)
      if (!p) return s
      return notify(setPosts(s, s.publishing.posts.filter(x => x.id !== a.id)), 'publishing', `Deleted: ${p.text.slice(0, 60)}`)
    }
    case 'publishing/planToggle':
      return setPlan(s, { items: s.publishing.plan.items.map(i => (i.id === a.id ? { ...i, included: !i.included } : i)) })
    case 'publishing/planApprove': {
      const n = s.publishing.plan.items.filter(i => i.included).length
      let next = approvePlan(s)
      next = s.handoffs.some(h => h.id === 'h-plan') ? removeHandoff(next, 'h-plan') : next
      return pushLog(next, { agent: 'atlas', text: `Next week’s plan approved: ${n} of ${s.publishing.plan.items.length} posts`, status: n < s.publishing.plan.items.length ? 'edited' : 'approved', reason: 'Your call from Plan review', link: '/publishing/calendar' })
    }
    case 'publishing/planReject': {
      const next = setPlan(s.handoffs.some(h => h.id === 'h-plan') ? removeHandoff(s, 'h-plan') : s, { status: 'rejected' })
      return pushLog(next, { agent: 'atlas', text: 'Next week’s plan rejected. Atlas will propose posts one by one.', status: 'rejected', link: '/publishing/plan' })
    }
    case 'publishing/planReset': {
      // A new proposal after a rejection: Atlas swaps every post it chose itself. Sage's campaign posts stay.
      const p = s.publishing.plan
      const base = p.version % 2 ? PLAN_B : PLAN
      const items = base.map(i => ({ ...structuredClone(i), id: uid('n'), included: true }))
      const was = new Set(p.items.map(i => i.text)), will = new Set(items.map(i => i.text))
      const diff = { added: items.filter(i => !was.has(i.text)).map(i => i.text), removed: p.items.filter(i => !will.has(i.text)).map(i => i.text), changed: [] }
      const next = setPlan(s, { status: 'proposed', request: undefined, version: p.version + 1, items, diff })
      return pushLog(next, { agent: 'atlas', text: `Plan v${p.version + 1} ready: ${diff.added.length} new posts, the Trail Week posts kept`, status: 'done', reason: 'You rejected the previous plan', link: '/publishing/plan' })
    }
    case 'publishing/planRequest': {
      const next = reworkPlan(s, a.text)
      const v = next.publishing.plan.version
      return pushLog(next, { agent: 'atlas', text: `Plan v${v} ready after your note: “${a.text}”`, status: 'done', link: '/publishing/plan' })
    }
    case 'publishing/askFill': {
      const day = T(0, 0, a.day)
      const seed = gapSeed({ day, network: a.network }, s.publishing.posts, s.publishing.ideas, targetsOf(s))
      if (!seed) return notify(s, 'publishing', `Atlas already proposed every ${a.network === 'x' ? 'X' : a.network} post it has for this week. Write one yourself, or check Ideas.`, { link: { to: '/publishing', label: 'Open Ideas' } })
      const next = arriveIdeas(s, [seed], 'gap', 'atlas')
      const idea = next.publishing.ideas.find(i => i.key === seed.key)
      return idea ? notify(next, 'publishing', `Atlas wrote an idea for ${new Date(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric' })}.`, { link: { to: `/publishing/ideas/${idea.id}`, label: 'Review the idea' } }) : next
    }
    case 'publishing/claire':
      return notify(toClaire(s, a.post).s, 'publishing', 'Sent to Claire. The post is To approve until she answers.')
    case 'publishing/addToPlan': {
      const d = new Date(a.post.at)
      const day = Math.max(0, Math.min(6, Math.floor((a.post.at - PLAN_MONDAY) / DAY)))
      const landed = new Date(PLAN_MONDAY + day * DAY).toLocaleDateString('en-GB', { weekday: 'long' })
      const moved = landed !== d.toLocaleDateString('en-GB', { weekday: 'long' }) ? ` The plan covers Mon 1 to Sun 7 Dec, so it goes on ${landed}.` : ''
      // Plan already approved: schedule the post itself, don't reopen (and re-copy) the whole plan.
      if (s.publishing.plan.status === 'approved') {
        const at = new Date(PLAN_MONDAY + day * DAY).setHours(d.getHours(), d.getMinutes())
        return notify(setPosts(s, [...s.publishing.posts, { ...a.post, at, status: 'scheduled' }]), 'publishing', `Scheduled for ${landed} ${hhmm(at)}, in the approved plan.${moved}`)
      }
      const item: PlanItem = { id: uid('n'), day, time: hhmm(a.post.at), network: a.post.network, text: a.post.text, media: a.post.media, tag: 'New', reason: 'Added by you from the composer.', pillar: a.post.pillar, included: true }
      const next = setPlan(s, { items: [...s.publishing.plan.items, item], status: 'proposed' })
      return notify(next, 'publishing', `Added to next week’s plan (${landed}).${moved}`, { link: { to: '/publishing/plan', label: 'See the plan' } })
    }
    case 'publishing/bulk':
      return bulk(s, a)
    case 'publishing/ideaOpen': case 'publishing/ideaDraft': case 'publishing/ideaRedirect': case 'publishing/ideaRestoreVersion': case 'publishing/ideaSlot':
    case 'publishing/ideaSchedule': case 'publishing/ideaSnooze': case 'publishing/ideaDismiss': case 'publishing/ideaReopen':
    case 'publishing/ideaRule': case 'publishing/ideaToPlan': case 'publishing/ideaToSage':
      return reduceIdeas(s, a)
    case 'publishing/upload': {
      const p = a.post ? s.publishing.posts.find(x => x.id === a.post) : undefined
      // Atlas tags it on arrival: what the file name says, the pillar of the post it illustrates.
      const media = { ...a.media, tags: tagsFor(a.media.title, p) }
      let next: State = { ...s, publishing: { ...s.publishing, uploads: [media, ...(s.publishing.uploads ?? [])] } }
      if (!p) return notify(next, 'publishing', `Uploaded “${a.media.title}”. Atlas tagged it ${media.tags.join(', ')}.`)
      const card = visualCardOf(next, p)
      if (card) next = removeHandoff(next, card.id)
      next = patchPost(next, p.id, { media: a.media.name, status: 'scheduled', waiting: undefined, note: `Visual: your upload “${a.media.title}”.` })
      next = pushLog(next, { agent: 'atlas', text: `Scheduled “${p.text.slice(0, 48)}…” with your upload`, status: 'approved', reason: 'Your call from Media', link: '/publishing/calendar' })
      return notify(next, 'publishing', `Uploaded “${a.media.title}” and added it to the ${NET[p.network] ?? p.network} post for ${day(p.at)}. It’s scheduled.`)
    }
    case 'publishing/retry': {
      const p = s.publishing.posts.find(x => x.id === a.id)
      if (!p || p.status !== 'failed') return s
      const card = failureCardOf(s, p.id)
      const next = patchPost(card ? removeHandoff(s, card.id) : s, p.id, retried(p, a.mode, now(s), 'you'))
      const label = RETRY_OPTIONS.find(o => o.mode === a.mode)!.label
      return pushLog(next, { agent: 'atlas', text: `${label}: “${p.text.slice(0, 48)}…”`, status: 'approved', reason: 'Your call from the calendar', link: `/publishing/calendar?post=${p.id}` })
    }
    case 'publishing/firstComment': {
      const p = s.publishing.posts.find(x => x.id === a.id)
      if (!p) return s
      const next = patchPost(s, p.id, note({ ...p, firstComment: a.text }, now(s), `First comment ${p.firstComment ? 'changed' : 'added'}`))
      return pushLog(next, { agent: 'atlas', text: `First comment on the ${NET[p.network] ?? p.network} post for ${day(p.at)}: “${a.text}”`, status: 'done', reason: 'You asked Atlas', link: `/publishing/calendar?post=${p.id}` })
    }
    case 'publishing/queueSlot': {
      const queues = s.publishing.queues.map(q => (q.id !== a.queue ? q : { ...q, slots: q.slots.map((sl, i) => (i === a.index ? { weekday: a.weekday ?? sl.weekday, time: a.time ?? sl.time } : sl)) }))
      return { ...s, publishing: { ...s.publishing, queues } }
    }
    case 'publishing/fillQueue':
      return fillQueues(s, { queue: a.queue, days: a.days, from: a.from, why: 'You asked Atlas to fill the queue.' })
    case 'publishing/noteAdd': {
      const note: DayNote = { id: uid('note'), day: startOfDay(a.day), text: a.text.trim(), quiet: a.quiet }
      if (!note.text) return s
      let next: State = { ...s, publishing: { ...s.publishing, notes: [...(s.publishing.notes ?? []), note] } }
      const hit = note.quiet ? onQuietDays(next).filter(p => startOfDay(p.at) === note.day) : []
      if (!hit.length) return next
      // Posts already on a quiet day: Atlas moves them (Act) or asks (Draft, Suggest).
      const act = actionOf(next, 'atlas', 'atlas-slot')
      const t = quietCardText(hit, note.text)
      next = pushHandoff(next, { agent: 'atlas', kind: 'approval', urgency: 'today', topic: 'Quiet day', action: 'atlas-slot', ref: note.id, ...t,
        why: `You marked it a quiet day. Moving posts is set to ${act?.autonomy === 'act' ? 'Act' : act?.autonomy === 'suggest' ? 'Suggest' : 'Draft'}.`, confidence: 92, link: '/publishing/calendar',
        options: [{ label: 'Move them to the next day', recommended: true }, { label: 'Keep them' }] })
      return act?.autonomy === 'act' ? actOn(next, next.handoffs[0], `Moved ${hit.length} post${hit.length > 1 ? 's' : ''} off ${new Date(note.day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric' })}`, `You marked it a quiet day: “${note.text}”.`) : next
    }
    case 'publishing/mediaTags':
      return { ...s, publishing: { ...s.publishing, mediaTags: { ...(s.publishing.mediaTags ?? {}), [a.id]: [...new Set(a.tags.map(t => t.trim()).filter(Boolean))] } } }
    case 'publishing/swapMedia': {
      const card = s.handoffs.find(h => h.topic === 'Licence' && h.ref === a.from)
      return swapMedia(card ? removeHandoff(s, card.id) : s, a.from, a.to)
    }
    case 'publishing/noteRemove': {
      const card = s.handoffs.find(h => h.topic === 'Quiet day' && h.ref === a.id)
      const next = card ? removeHandoff(s, card.id) : s
      return { ...next, publishing: { ...next.publishing, notes: (next.publishing.notes ?? []).filter(n => n.id !== a.id) } }
    }
    case 'publishing/labels': {
      const next = setPosts(s, s.publishing.posts.map(p => (a.ids.includes(p.id) ? editLabels(p, a.add, a.remove) : p)))
      if (a.ids.length < 2) return next
      return pushLog(next, { agent: 'atlas', text: `Labelled ${a.ids.length} posts${a.add?.length ? ` “${a.add.join('”, “')}”` : ''}`, status: 'approved', reason: 'Your call from Publishing', link: '/publishing/calendar' })
    }
    case 'publishing/recycle': {
      const p = s.publishing.posts.find(x => x.id === a.id)
      const perf = p && perfOf(s, p)
      if (!p || !perf) return s
      const seed = recycleSeed(s, p, perf)
      const known = s.publishing.ideas.find(i => i.key === seed.key)
      if (known) return notify(s, 'publishing', 'Atlas already has this one in Ideas.', { link: { to: `/publishing/ideas/${known.id}`, label: 'Open the idea' } })
      const next = arriveIdeas(s, [seed], 'continuous', 'atlas')
      const idea = next.publishing.ideas.find(i => i.key === seed.key)
      return idea ? notify(next, 'publishing', `Atlas rewrote it as an idea for ${NET[perf.to] ?? perf.to}.`, { link: { to: `/publishing/ideas/${idea.id}`, label: 'Review the idea' } })
        : notify(next, 'publishing', 'Ideas already has 8 open ideas, Atlas’s limit. Settle one and ask again.', { link: { to: '/publishing/ideas', label: 'Open Ideas' } })
    }
    case 'publishing/resume':
      return resumeAll(s, 'You resumed it', a.ids)
    case 'publishing/pauseAll': case 'publishing/resumeAll': {
      // One brake for everything ahead; one Undo bar, like the bulk actions.
      const pausing = a.type === 'publishing/pauseAll'
      const next = pausing ? pauseAll(s) : resumeAll(s, 'You resumed publishing')
      const card = next.handoffs.find(h => h.topic === PAUSE_TOPIC && !s.handoffs.some(x => x.id === h.id))
      return { ...next, publishing: { ...next.publishing, undo: { label: pausing ? 'Paused all publishing' : 'Resumed publishing', posts: s.publishing.posts, handoffs: card ? [card.id] : [], until: now(s) + 10_000, hold: s.publishing.hold ?? 'none' } } }
    }
    case 'publishing/restore': {
      const u = s.publishing.undo
      if (!u) return s
      const hold = u.hold === 'none' ? undefined : u.hold ?? s.publishing.hold
      const next: State = { ...s, handoffs: s.handoffs.filter(h => !u.handoffs.includes(h.id)), publishing: { ...s.publishing, posts: u.posts, ideas: u.ideas ?? s.publishing.ideas, undo: undefined, hold } }
      return pushLog(next, { agent: 'atlas', text: `Undone: ${u.label}`, status: 'undone', link: '/publishing/calendar' })
    }
  }
}

const day = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${hhmm(t)}`
const note = (p: Post, at: number, text: string): Post => ({ ...p, history: [...(p.history ?? []), { at, text }] })

/** Send one post to Claire (To approve). */
const toClaire = (s: State, post: Post) => sendToClaire(s, post, 'You sent it to Claire.', 'you')

/** One bulk change = one journal line + a 10 s undo snapshot. */
function bulk(s: State, a: Extract<PublishingAction, { type: 'publishing/bulk' }>): State {
  const t = now(s)
  const picked = s.publishing.posts.filter(p => a.ids.includes(p.id))
  if (!picked.length) return s
  const snapshot = s.publishing.posts
  const n = picked.length
  const many = (w: string) => `${n} post${n > 1 ? 's' : ''} ${w}`
  let next = s
  let label = ''
  const handoffs: string[] = []
  switch (a.op) {
    case 'approve': {
      const ok = picked.filter(p => p.status === 'needs' || p.status === 'draft')
      next = setPosts(s, s.publishing.posts.map(p => (ok.includes(p) ? note({ ...p, status: 'scheduled', note: undefined }, t, 'Approved by you') : p)))
      label = `${ok.length} post${ok.length > 1 ? 's' : ''} approved and scheduled`
      break
    }
    case 'delete':
      next = setPosts(s, s.publishing.posts.filter(p => !a.ids.includes(p.id)))
      label = many('deleted')
      break
    case 'reschedule': {
      const move = (p: Post) => (a.at !== undefined ? a.at : p.at + (a.shiftDays ?? 0) * DAY)
      // One at a time, so the 3-a-day cap counts the posts already moved.
      let posts = s.publishing.posts
      let kept = 0
      for (const p of picked) {
        if (p.status === 'published') continue
        if (overCap(posts, { ...p, at: move(p) })) { kept++; continue }
        posts = posts.map(x => (x.id === p.id ? note({ ...x, at: move(p) }, t, `Moved from ${day(p.at)} to ${day(move(p))}`) : x))
      }
      next = setPosts(s, posts)
      label = (a.at !== undefined ? `${many('moved')} to ${day(a.at)}` : `${many('moved')} ${Math.abs(a.shiftDays ?? 0)} day${Math.abs(a.shiftDays ?? 0) > 1 ? 's' : ''} ${(a.shiftDays ?? 0) > 0 ? 'later' : 'earlier'}`)
        + (kept ? `; ${kept} kept in place (3 posts a day per network)` : '')
      break
    }
    case 'duplicate': {
      const net = a.network ?? 'instagram'
      const copies = picked.map(p => note({ ...p, id: uid('p'), network: net, status: 'draft', author: 'you', stats: undefined, handoff: undefined, history: [], note: `Copy of the ${NET[p.network] ?? p.network} post.` }, t, `Duplicated from ${NET[p.network] ?? p.network}`))
      next = setPosts(s, [...s.publishing.posts, ...copies])
      label = `${many('duplicated')} to ${NET[net] ?? net} as drafts`
      break
    }
    case 'claire':
      for (const p of picked) { const r = toClaire(next, p); next = r.s; handoffs.push(r.hid) }
      label = `${many('sent')} to Claire`
      break
  }
  next = { ...next, publishing: { ...next.publishing, undo: { label, posts: snapshot, handoffs, until: t + 10_000 } } }
  return pushLog(next, { agent: 'atlas', text: label, status: 'approved', reason: 'Your call from Publishing', link: '/publishing/calendar' })
}

const NET: Partial<Record<Network, string>> = { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', facebook: 'Facebook', youtube: 'YouTube', x: 'X' }


/** Desk decisions that touch the calendar or the plan. Whatever a card changed is kept so its Undo puts it back. */
export function onResolvePublishing(s: State, h: Handoff, d: Decision): State {
  const next = resolveCard(s, h, d)
  const a = s.publishing, b = next.publishing
  if (a === b || (a.posts === b.posts && a.ideas === b.ideas && a.plan === b.plan && a.hold === b.hold)) return next
  const after = new Map(b.posts.map(p => [p.id, p]))
  const before = new Set(a.posts.map(p => p.id))
  const ideasAfter = new Map(b.ideas.map(i => [i.id, i]))
  const u: CardUndo = {
    posts: a.posts.filter(p => after.get(p.id) !== p),
    added: b.posts.filter(p => !before.has(p.id)).map(p => p.id),
    ideas: a.ideas.filter(i => ideasAfter.get(i.id) !== i),
    plan: a.plan !== b.plan ? a.plan : undefined,
    ...(a.hold !== b.hold ? { hold: a.hold ?? 'none' } : {}),
  }
  // On Act, what Atlas scheduled alone waits in the send window (window.ts).
  const touched = new Set([...u.added, ...u.posts.map(p => p.id)])
  const posts = d.act ? markAlone(b.posts, touched, actionOf(s, 'atlas', h.action)?.label ?? 'set to Act') : b.posts
  return { ...next, publishing: { ...b, posts, byCard: { ...b.byCard, [h.id]: u } } }
}

/** Posts Atlas just scheduled alone open the send window. */
export const markAlone = (posts: Post[], ids: Set<string>, why: string) =>
  posts.map(p => (ids.has(p.id) && p.status === 'scheduled' && !p.alone ? { ...p, alone: { why: why.includes('Act') ? why : `${why}, on Act` } } : p))

/** On Act, Atlas picks a library photo for every post held for a visual, and says which. Without a photo that fits, the card stays. */
export function actVisuals(s: State): State {
  let next = s
  for (const p of waitingForVisual(s)) {
    const h = visualCardOf(next, p)
    const m = h && !h.lane && pickVisual(p, libraryOf(next), now(next))
    if (!h || !m) continue
    next = actOn(next, h, `Picked “${m.title}” for the ${NET[p.network] ?? p.network} post on ${day(p.at)} and scheduled it`, `Rights: ${m.rights}. Never a stock photo.`)
  }
  return next
}

/** Atlas settles one of its cards alone, on Act: its recommended option, one journal line, an Undo that puts everything back. */
export function actOn(s: State, h: Handoff, text: string, why: string): State {
  const i = Math.max(0, h.options?.findIndex(o => o.recommended) ?? 0)
  const next = onResolvePublishing(removeHandoff(s, h.id), h, h.options ? { kind: 'option', index: i, option: h.options[i].label, act: true } : { kind: 'approve', act: true })
  return pushLog(next, { agent: 'atlas', text, status: 'done', reason: `${actionOf(s, 'atlas', h.action)?.label ?? 'This action'}, set to Act. ${why}`, link: h.link, undoMinutes: 30, restore: [h] })
}
export const visualsDue = (s: State) =>
  agentOf(s, 'atlas').status === 'on' && actionOf(s, 'atlas', 'atlas-fill')?.autonomy === 'act' && waitingForVisual(s).some(p => { const h = visualCardOf(s, p); return !!h && !h.lane && !!pickVisual(p, libraryOf(s), now(s)) })

/** Heartbeat: a creator licence ends within 60 days and a post still uses the photo. Atlas proposes a swap (Act: does it). */
export function tickLicences(s: State): State {
  let next = s
  for (const e of licencesToRaise(s, now(s))) {
    const end = new Date(e.ends).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
    const p = e.posts[0]
    next = pushHandoff(next, {
      agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Licence', action: 'atlas-fill', ref: e.media.name, link: '/publishing/media',
      title: `The licence for “${e.media.title}” ends on ${end}`, context: `Used by ${e.posts.length} post${e.posts.length > 1 ? 's' : ''} still to go out. ${e.media.rights}.`,
      why: 'Atlas never publishes a photo without rights. It found one of yours to put instead.', confidence: 90,
      options: [{ label: `Swap for “${e.swap!.title}”`, recommended: true }, { label: 'Keep it: the posts go out before then' }],
      preview: { type: 'post', network: p.network, slot: `${new Date(p.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}, ${hhmm(p.at)}`, text: [p.text], media: e.swap!.name },
    })
    if (actionOf(next, 'atlas', 'atlas-fill')?.autonomy === 'act') next = actOn(next, next.handoffs[0], `Swapped “${e.media.title}” for “${e.swap!.title}” before the licence ends`, `${e.media.rights}.`)
  }
  return next
}
export const licencesDue = (s: State) => licencesToRaise(s, now(s)).length > 0

/** Undo of a Desk decision: every restored card takes back what it changed in Publishing. */
export function undoCards(s: State, cards: Handoff[]): State {
  let next = s
  for (const h of cards) {
    const u = next.publishing.byCard?.[h.id]
    if (!u) continue
    const P = next.publishing
    const back = new Map(u.posts.map(p => [p.id, p]))
    const kept = P.posts.filter(p => !u.added.includes(p.id)).map(p => back.get(p.id) ?? p)
    const posts = [...kept, ...u.posts.filter(p => !kept.some(k => k.id === p.id))]
    const ideasBack = new Map(u.ideas.map(i => [i.id, i]))
    const { [h.id]: _gone, ...byCard } = P.byCard
    const hold = u.hold === 'none' ? undefined : u.hold ?? P.hold
    next = { ...next, publishing: { ...P, posts, ideas: P.ideas.map(i => ideasBack.get(i.id) ?? i), plan: u.plan ?? P.plan, byCard, hold } }
  }
  return next
}

function resolveCard(s: State, h: Handoff, d: Decision): State {
  const ok = d.kind === 'approve' || d.kind === 'trial'
  if (h.id === 'h-plan') {
    if (ok || (d.kind === 'option' && d.index === 0)) return approvePlan(s)
    if (d.kind === 'reject') return setPlan(s, { status: 'rejected' })
    return s
  }
  if (h.id === 'h-cadence' && ok) {
    const moved = s.publishing.posts.filter(p => p.campaign === 'Trail Week' && p.network === 'instagram' && /kit list|Lac Blanc/i.test(p.text))
    return setPosts(s, s.publishing.posts.map(p => (moved.includes(p) ? { ...p, network: 'tiktok', note: 'Moved from Instagram by Sage.' } : p)))
  }

  if (h.topic === 'Idea' && h.ref) {
    const idea = s.publishing.ideas.find(i => i.id === h.ref)
    if (!idea || !isOpen(idea)) return s
    if (ok) return reduceIdeas(s, { type: 'publishing/ideaSchedule', ids: [idea.id] }, true)
    if (d.kind === 'reject') return reduceIdeas(s, { type: 'publishing/ideaDismiss', id: idea.id, reason: d.reason ?? 'Not timely' }, true)
    return s
  }
  if (h.topic === 'Licence' && h.ref && d.kind === 'option' && d.index === 0 && h.preview?.type === 'post' && h.preview.media) return swapMedia(s, h.ref, h.preview.media)
  if (h.topic === 'Quiet day') {
    if (!(d.kind === 'option' && d.index === 0) && !ok) return s
    const note = s.publishing.notes?.find(n => n.id === h.ref)
    const ids = new Set(onQuietDays(s).filter(p => !note || startOfDay(p.at) === note.day).map(p => p.id))
    return setPosts(s, s.publishing.posts.map(p => (ids.has(p.id) ? avoidQuiet(s.publishing.notes, p) : p)))
  }
  if (h.topic === WINDOW_TOPIC) return d.kind === 'option' ? resolveWindow(s, h, d.index) : s
  if (h.topic === PAUSE_TOPIC) return d.kind === 'option' && d.index === 1 ? resumeAll(s, 'You resumed them from the Desk') : s
  if (h.topic === 'Better slot' && h.ref && h.preview?.type === 'post') {
    const p = s.publishing.posts.find(x => x.id === h.ref)
    if (!p || !ok) return s
    const at = parseSlot(h.preview.slot, p.at - 86_400_000)
    const by = d.act ? 'Atlas' : 'you'
    return patchPost(s, p.id, note({ ...p, at, note: `Moved from ${hhmm(p.at)} to ${hhmm(at)} by ${by}. ${BEST_SLOT[p.network]?.reason ?? ''}`.trim() }, now(s), `Moved from ${day(p.at)} to ${day(at)} by ${by}`))
  }
  if (h.topic === 'Publishing failed' && h.ref && d.kind === 'option') {
    const p = s.publishing.posts.find(x => x.id === h.ref)
    const mode = RETRY_OPTIONS[d.index]?.mode
    return p && p.status === 'failed' && mode ? patchPost(s, p.id, retried(p, mode, now(s), d.act ? 'Atlas' : 'you')) : s
  }
  const linked = s.publishing.posts.find(p => p.handoff === h.id || p.id === h.ref)
  const preview = h.preview?.type === 'post' ? h.preview : undefined
  if (linked) {
    if (h.topic === 'Missing visual' && d.kind === 'option') {
      if (d.index === 0) {
        const m = pickVisual(linked, libraryOf(s), now(s))
        return m ? patchPost(s, linked.id, { media: m.name, status: 'scheduled', waiting: undefined, note: `Visual: ${m.title} (${m.rights}).` }) : patchPost(s, linked.id, { waiting: 'visual', note: 'No photo in Media fits. Upload one.' })
      }
      if (d.index === 1) return patchPost(s, linked.id, { waiting: 'visual', note: 'Waiting for your upload. Upload it in Media.' })
      return patchPost(s, linked.id, { at: linked.at + 7 * DAY, status: 'scheduled', waiting: undefined, note: 'Moved to next week, visual to find.' })
    }
    if (h.id === 'h-code' && d.kind === 'answer') return patchPost(s, linked.id, note({ ...linked, text: linked.text.replace('[code]', d.text.toUpperCase()), status: 'scheduled', note: `Code ${d.text.toUpperCase()} added.` }, now(s), `Code ${d.text.toUpperCase()} added by you`))
    // The post keeps who approved it (Claire answers from her lane), so its detail view can say so once the card is gone.
    const by = `Approved by ${d.act ? 'Atlas, on Act' : h.lane === 'claire' && h.thread?.at(-1)?.from === 'claire' ? 'Claire' : 'you'}`
    if (ok && linked.approval) return patchPost(s, linked.id, note(approved(linked, h, now(s), preview ? plain(preview.text) : undefined), now(s), by))
    if (ok) return patchPost(s, linked.id, note({ ...linked, status: 'scheduled', text: preview ? plain(preview.text) : linked.text, note: undefined }, now(s), by))
    if (d.kind === 'reject') return linked.handoff === 'h-trend' ? setPosts(s, s.publishing.posts.filter(p => p.id !== linked.id)) : patchPost(s, linked.id, { status: 'draft', note: `Rejected${d.reason ? `: ${d.reason.toLowerCase()}` : ''}.` })
    return s
  }

  // Generic rule: any approved post card (Atlas drafts, counter-posts, command bar briefs) lands in the calendar.
  if (ok && preview) {
    // The card's pillar and campaign follow the post. Trail stories stays the default for cards that don't say.
    const post = fitCap(s.publishing.posts, avoidQuiet(s.publishing.notes, withFormat({ id: uid('p'), network: preview.network, at: parseSlot(preview.slot, now(s)), text: plain(preview.text), media: preview.media, status: 'scheduled', author: 'atlas', pillar: h.pillar ?? 'Trail stories', campaign: h.campaign, campaignId: h.campaignId, handoff: h.id })))
    return setPosts(s, [...s.publishing.posts, post])
  }
  return s
}

/** Posts still to go out stop using a photo whose licence ends; they take the replacement. */
function swapMedia(s: State, from: string, to: string): State {
  const t = now(s)
  return setPosts(s, s.publishing.posts.map(p => (p.media === from && p.at > t && p.status !== 'published' ? note({ ...p, media: to, note: 'Visual swapped: the creator licence ends soon.' }, t, 'Visual swapped before the licence ends') : p)))
}

/* ---------- Contracts for the other agents (requests/atlas-from-*.md) ---------- */

/**
 * Sage: posts of an approved campaign enter the calendar. Adds or replaces by id, never touches a published post.
 * Atlas fills the format and first comment it would have written. No journal line: the caller writes it.
 */
export function receivePosts(s: State, posts: Post[], _from: Handoff['agent']): State {
  const byId = new Map(s.publishing.posts.map(p => [p.id, p]))
  for (const p of posts) { if (byId.get(p.id)?.status !== 'published') byId.set(p.id, withFormat(p)) }
  return setPosts(s, [...byId.values()])
}
/** Sage: takes these posts back out, unless they are already published. */
export const withdrawPosts = (s: State, ids: string[]): State =>
  setPosts(s, s.publishing.posts.filter(p => !ids.includes(p.id) || p.status === 'published'))

/** Echo: hold what goes out in the next 24 h (status Paused, with the reason). Idempotent; Atlas's guardrail does it too during a critical alert. */
export const holdToday = (s: State, reason: string): State => pauseFor(s, { key: 'echo', label: reason })
/** Echo: put back what was held. Their slot gone, they return to drafts. */
export const releaseToday = (s: State): State => resumeAll(s, 'Echo lifted the hold')

/** Juno and Iris: a scheduled post whose time has come is published. */
export const publishDue = (s: State, t: number): State => {
  if (!s.publishing.posts.some(p => p.status === 'scheduled' && p.at <= t)) return s
  return setPosts(s, s.publishing.posts.map(p => (p.status === 'scheduled' && p.at <= t ? { ...p, status: 'published', history: [...(p.history ?? []), { at: p.at, text: 'Published' }] } : p)))
}
export const publishingDue = (s: State, t: number) => s.publishing.posts.some(p => p.status === 'scheduled' && p.at <= t)

/* ---------- Ideas ---------- */

type IdeaAct = Extract<PublishingAction, { type: 'publishing/ideaOpen' | 'publishing/ideaDraft' | 'publishing/ideaRedirect' | 'publishing/ideaRestoreVersion' | 'publishing/ideaSlot' | 'publishing/ideaSchedule' | 'publishing/ideaSnooze' | 'publishing/ideaDismiss' | 'publishing/ideaReopen' | 'publishing/ideaRule' | 'publishing/ideaToPlan' | 'publishing/ideaToSage' }>
const setIdeas = (s: State, ideas: Idea[]): State => ({ ...s, publishing: { ...s.publishing, ideas } })
const patchIdea = (s: State, id: string, f: (i: Idea) => Idea): State => setIdeas(s, s.publishing.ideas.map(i => (i.id === id ? f(i) : i)))
const ctxOf = (s: State) => ({ now: now(s), posts: s.publishing.posts, rules: s.playbook.rules, competitors: s.listening?.watch?.map(w => w.name) ?? [] })
/** An idea settled in Ideas leaves the Desk too. */
const dropCard = (s: State, i: Idea) => (i.handoff && s.handoffs.some(h => h.id === i.handoff) ? removeHandoff(s, i.handoff) : s)
const decided = (s: State, i: Idea, outcome: string, reason?: string) =>
  track(s, 'ideas/decision', { idea: i.key, origin: i.origin, outcome, reason, ms: now(s) - (i.openedAt ?? i.at) })
const tomorrow8 = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 8, 0).getTime() }
const slotLabel = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}, ${hhmm(t)}`

export function reduceIdeas(s: State, a: IdeaAct, fromDesk = false): State {
  const t = now(s)
  const idea = 'id' in a ? s.publishing.ideas.find(i => i.id === a.id) : undefined
  const reason = fromDesk ? 'Your call from the Desk' : 'Your call from Ideas'
  switch (a.type) {
    case 'publishing/ideaOpen':
      return idea && !idea.openedAt ? patchIdea(s, a.id, i => ({ ...i, openedAt: t })) : s
    case 'publishing/ideaDraft': {
      if (!idea || idea.drafts || idea.kind === 'series') return s
      return pushLog(patchIdea(s, a.id, i => draftIdea(i, ctxOf(s))), { agent: 'atlas', text: `Drafted “${idea.title}”`, status: 'done', reason, link: `/publishing/ideas/${idea.id}` })
    }
    case 'publishing/ideaRedirect': {
      if (!idea) return s
      const ctx = ctxOf(s)
      const base = idea.drafts || idea.kind === 'series' ? idea : draftIdea(idea, ctx)
      if (a.mode === 'angle') {
        const r = applyAngle(base, a.angle, ctx)
        const l = r.changed ? learn(s.publishing.learned, `angle:${a.angle}`, s.playbook.rules) : { learned: s.publishing.learned, proposal: undefined }
        const label = r.idea.versions.at(-1)?.label ?? a.angle
        const next = patchIdea(s, a.id, () => ({ ...r.idea, said: { you: r.changed ? label : a.angle, atlas: r.note }, proposal: l.proposal ?? r.idea.proposal }))
        return { ...next, publishing: { ...next.publishing, learned: l.learned } }
      }
      if (a.mode === 'free') {
        const r = applyInstruction(base, a.text, ctx)
        return patchIdea(s, a.id, () => ({ ...r.idea, said: { you: a.text, atlas: r.reply } }))
      }
      return patchIdea(s, a.id, () => ({ ...setDraftText(base, a.network, a.text, { mode: a.mode, label: a.label }, t), said: undefined }))
    }
    case 'publishing/ideaRestoreVersion': {
      const v = idea?.versions.find(x => x.n === a.n)
      if (!idea || !v) return s
      return patchIdea(s, a.id, i => ({ ...withVersionOf(i, v.drafts, `Back to version ${a.n}`, t), said: undefined }))
    }
    case 'publishing/ideaSlot':
      return idea ? patchIdea(s, a.id, i => ({ ...i, drafts: i.drafts?.map(d => (d.network === a.network ? { ...d, at: a.at } : d)) })) : s
    case 'publishing/ideaSchedule': {
      const picked = s.publishing.ideas.filter(i => a.ids.includes(i.id) && isOpen(i))
      if (!picked.length) return s
      const before = { posts: s.publishing.posts, ideas: s.publishing.ideas }
      let next = s
      const made: Post[] = []
      for (const i0 of picked) {
        const i = i0.kind === 'post' && !i0.drafts ? draftIdea(i0, ctxOf(next)) : i0
        const posts = ideaPosts(i, () => uid('p'))
        made.push(...posts)
        next = setPosts(dropCard(next, i), [...next.publishing.posts, ...posts])
        next = patchIdea(next, i.id, () => ({ ...i, status: 'scheduled', posts: posts.map(p => p.id), proposal: undefined }))
        next = decided(next, i, outcomeOf(i))
      }
      const label = picked.length === 1
        ? `Scheduled “${picked[0].title}”${made.length === 1 ? ` for ${slotLabel(made[0].at)}` : `: ${made.length} posts`}`
        : `${picked.length} ideas scheduled: ${made.length} posts in the calendar`
      next = { ...next, publishing: { ...next.publishing, undo: { label, posts: before.posts, ideas: before.ideas, handoffs: [], until: t + 10_000 } } }
      return pushLog(next, { agent: 'atlas', text: label, status: 'approved', reason, link: '/publishing/calendar' })
    }
    case 'publishing/ideaSnooze': {
      const picked = s.publishing.ideas.filter(i => a.ids.includes(i.id) && isOpen(i))
      if (!picked.length) return s
      let next = s
      for (const i of picked) next = patchIdea(dropCard(next, i), i.id, x => ({ ...x, status: 'snoozed', snoozedUntil: tomorrow8(t), handoff: undefined }))
      return pushLog(next, { agent: 'atlas', text: `Not now: ${picked.length === 1 ? `“${picked[0].title}”` : `${picked.length} ideas`}. Back tomorrow at 08:00`, status: 'done', reason, link: '/publishing/ideas' })
    }
    case 'publishing/ideaDismiss': {
      if (!idea || !isOpen(idea)) return s
      const l = learn(s.publishing.learned, `dismiss:${a.reason}`, s.playbook.rules)
      let next = patchIdea(dropCard(s, idea), a.id, i => ({ ...i, status: 'dismissed', dismissReason: a.reason, handoff: undefined, proposal: l.proposal }))
      next = { ...next, publishing: { ...next.publishing, learned: l.learned } }
      next = decided(next, idea, 'rejected', a.reason)
      return pushLog(next, { agent: 'atlas', text: `Dismissed “${idea.title}” (${a.reason.toLowerCase()})`, status: 'rejected', reason, link: '/publishing/ideas' })
    }
    case 'publishing/ideaReopen': {
      if (!idea || (idea.status !== 'dismissed' && idea.status !== 'snoozed')) return s
      return patchIdea(s, a.id, i => ({ ...i, status: i.drafts ? 'ready' : 'new', dismissReason: undefined, snoozedUntil: undefined, proposal: undefined }))
    }
    case 'publishing/ideaRule': {
      const p = idea?.proposal
      if (!idea || !p) return s
      let next = patchIdea(s, a.id, i => ({ ...i, proposal: undefined }))
      if (!a.accept) return { ...next, publishing: { ...next.publishing, learned: { ...next.publishing.learned, [`no:${p.key}`]: 1 } } }
      next = addRule(next, { kind: 'do', text: p.text, agents: ['atlas'], origin: LEARNED_ORIGIN })
      return pushLog(next, { agent: 'atlas', text: `New Playbook rule: “${p.text}”`, status: 'approved', reason: 'You redirected two ideas the same way', rule: p.text, link: '/agents/atlas?tab=rules' })
    }
    case 'publishing/ideaToPlan': {
      if (!idea || !isOpen(idea)) return s
      const i = idea.drafts ? idea : draftIdea(idea, ctxOf(s))
      let next = dropCard(s, i)
      for (const post of ideaPosts(i, () => uid('p'))) next = reducePublishing(next, { type: 'publishing/addToPlan', post: { ...post, status: 'draft' } })
      next = patchIdea(next, i.id, () => ({ ...i, status: 'scheduled', inPlan: true, handoff: undefined }))
      return decided(next, i, outcomeOf(i))
    }
    case 'publishing/ideaToSage': {
      if (!idea || !isOpen(idea)) return s
      const steps = idea.steps?.map(x => `${x.step}: ${x.text}`).join(' ') ?? ''
      let next = briefSage(dropCard(s, idea), `${idea.title}. ${idea.why} ${steps}`.trim(), `Atlas’s series idea: ${idea.title}`, 'atlas')
      const cid = next.strategy.campaigns[0].id
      next = patchIdea(next, idea.id, i => ({ ...i, status: 'sent-to-sage', campaign: cid, handoff: undefined }))
      next = decided(next, idea, 'sent-to-sage')
      return notify(next, 'publishing', `Sent to Sage: “${idea.title}”. Sage is turning it into a campaign plan.`, { link: { to: `/strategy/campaigns/${cid}`, label: 'See the campaign' } })
    }
  }
}

const withVersionOf = (i: Idea, drafts: Idea['drafts'] & object, label: string, t: number): Idea =>
  ({ ...i, drafts: structuredClone(drafts), versions: [...i.versions, { n: i.versions.length + 1, at: t, mode: 'edit', label, note: 'You went back to an earlier version.', by: 'you', drafts: structuredClone(drafts) }] })

/** Ideas whose window closed leave, and Atlas says why; snoozed ones come back. Runs on the heartbeat. */
export function tickIdeas(s: State, t: number): State {
  const { ideas, expired } = expireIdeas(wakeIdeas(s.publishing.ideas, t), t)
  let next = ideas === s.publishing.ideas ? s : setIdeas(s, ideas)
  for (const i of expired) {
    next = dropCard(next, i)
    next = pushLog(next, { agent: 'atlas', text: `Retired “${i.title}”. Expired: ${i.expires?.reason}.`, status: 'done', reason: 'Ideas with a window leave when it closes', link: '/publishing/ideas' })
  }
  return next
}
export const ideasDue = (s: State, t: number) =>
  s.publishing.ideas.some(i => (isOpen(i) && !!i.expires && i.expires.at <= t) || (i.status === 'snoozed' && (i.snoozedUntil ?? Infinity) <= t))

/** New ideas arrive: rules and the cap of 8 apply, drafting follows Atlas's autonomy, urgent ones also go to the Desk. */
export function arriveIdeas(s: State, seeds: import('../../data/ideas').IdeaSeed[], origin: IdeaOrigin, agent: Handoff['agent']): State {
  let next = tickIdeas(s, now(s))
  const t = now(next)
  const fresh = seeds.filter(seed => !next.publishing.ideas.some(i => i.key === seed.key))
  if (!fresh.length) return next
  const { keep, held: byRule } = heldByRules(fresh, next.playbook.rules, next.publishing.posts, t, targetsOf(next))
  const { accepted, held, retired } = capIdeas(next.publishing.ideas, keep.map(seed => makeIdea(seed, origin, t)))
  for (const r of retired) {
    const by = accepted[retired.indexOf(r) + accepted.length - retired.length]
    next = patchIdea(next, r.id, i => ({ ...i, status: 'expired', expires: { at: t, reason: `Atlas made room for “${by?.title}”` } }))
    next = pushLog(next, { agent: 'atlas', text: `Retired “${r.title}” to make room for “${by?.title}”`, status: 'done', reason: `8 open ideas at most; it was the weakest (${r.confidence}% confident)`, link: '/publishing/ideas' })
  }
  const added: Idea[] = []
  for (const i0 of accepted) {
    const act = actionOf(next, 'atlas', i0.action)
    const alone = draftsAlone(i0, act?.autonomy)
    let i = alone || origin === 'urgent' ? draftIdea(i0, ctxOf(next)) : i0
    if (alone && act?.autonomy === 'act' && origin !== 'weekly') {
      const made = ideaPosts(i, () => uid('p'))
      const posts = markAlone(made, new Set(made.map(p => p.id)), `${act.label}, on Act`)
      i = { ...i, status: 'scheduled', posts: posts.map(p => p.id) }
      next = setPosts(next, [...next.publishing.posts, ...posts])
      next = pushLog(next, { agent: 'atlas', text: `Scheduled on its own: “${i.title}” for ${slotLabel(posts[0].at)}`, reason: `${act.label}, set to Act`, status: 'done', undoMinutes: 10, link: '/publishing/calendar', idea: i.id })
    } else if (origin === 'urgent') {
      const hid = uid('h')
      const d0 = i.drafts?.[0]
      next = pushHandoff(next, {
        id: hid, agent: 'atlas', chain: agent === 'atlas' ? ['atlas'] : [agent, 'atlas'], kind: 'approval', urgency: 'urgent', topic: 'Idea', action: i.action, ref: i.id,
        link: `/publishing/ideas/${i.id}`, title: i.title, context: i.why, confidence: i.confidence,
        why: `Short window: good until ${i.expires ? hhmm(i.expires.at) : 'tonight'}. Atlas wrote it so you only have to check it.`,
        sources: i.sources.map(x => ({ label: `${x.label}: ${x.proof}`, from: x.type === 'brand' ? 'Playbook' : x.type === 'calendar' ? 'Calendar' : x.type === 'analytics' ? 'Insights' : 'Listening' })),
        preview: d0 && { type: 'post', network: d0.network, slot: slotLabel(d0.at), text: [d0.text], media: d0.media },
      })
      i = { ...i, handoff: hid }
    }
    added.push(i)
  }
  next = setIdeas(next, [...added, ...next.publishing.ideas])
  const from = agent === 'atlas' ? '' : ` from ${agentName(agent)}’s signal`
  if (origin === 'weekly') {
    next = pushLog(next, { agent: 'atlas', text: `Ideas for next week: ${added.length} new${held.length ? `, ${held.length} held back (8 open ideas at most)` : ''}`, status: 'done', reason: 'Thursday: Atlas prepares next week', link: '/publishing/ideas' })
  } else {
    for (const i of added.filter(x => x.status !== 'scheduled')) next = pushLog(next, { agent: 'atlas', text: `New idea${from}: “${i.title}”`, status: 'done', reason: i.sources[0] ? `${i.sources[0].label}: ${i.sources[0].proof}` : undefined, link: `/publishing/ideas/${i.id}` })
    for (const i of held) next = pushLog(next, { agent: 'atlas', text: `Held back “${i.title}”: 8 ideas are already open`, status: 'done', reason: 'Atlas never keeps more than 8 ideas open', link: '/publishing/ideas' })
  }
  if (byRule.length) next = pushLog(next, { agent: 'atlas', text: `Following your rule, held back ${byRule.length} idea${byRule.length > 1 ? 's' : ''}: ${byRule.map(x => `“${x.seed.title}”`).join(', ')}`, rule: byRule[0].rule, status: 'done', link: '/agents/atlas?tab=rules' })
  return next
}

/** A scripted idea event: named seeds, or the next calendar gap. */
export function ideaEvent(s: State, ev: { seeds?: string[]; origin: IdeaOrigin; agent: Handoff['agent'] }): State {
  const seeds = ev.origin === 'gap'
    ? gapDays(s.publishing.posts, now(s), 14, targetsOf(s)).flatMap(g => { const seed = gapSeed(g, s.publishing.posts, s.publishing.ideas, targetsOf(s)); return seed && !s.publishing.ideas.some(i => i.key === seed.key) ? [seed] : [] }).slice(0, 1)
    : (ev.seeds ?? []).map(k => IDEA_SEEDS[k]).filter(Boolean)
  return arriveIdeas(s, seeds, ev.origin, ev.agent)
}

/** A script event that brings ideas to Publishing › Ideas. A paused agent spots nothing, unless the moderator triggers it. */
export const ideaScript = (ev: { seeds?: string[]; origin: IdeaOrigin; agent: Handoff['agent'] }) => ({
  tag: ev.origin === 'urgent' ? 'idea + Desk' : 'idea',
  run: (s: State, manual: boolean): State =>
    !manual && (agentOf(s, ev.agent).status !== 'on' || agentOf(s, 'atlas').status !== 'on') ? s : ideaEvent(s, ev),
})

/** Undo of an idea Atlas scheduled on its own: the posts leave the calendar, the idea is back in Ideas. */
export function unscheduleIdea(s: State, id: string): State {
  const i = s.publishing.ideas.find(x => x.id === id)
  if (!i || i.status !== 'scheduled') return s
  return patchIdea(setPosts(s, s.publishing.posts.filter(p => !i.posts?.includes(p.id))), id, x => ({ ...x, status: x.drafts ? 'ready' : 'new', posts: undefined }))
}
