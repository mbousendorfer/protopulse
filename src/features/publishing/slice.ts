import type { State } from '../../app/state'
import type { Decision, Flagged, Handoff, Network } from '../../app/types'
import { DAY, T, hhmm } from '../../app/time'
import { now, pushHandoff, notify, pushLog, removeHandoff, uid, updateHandoff } from '../../app/core'
import { BEST_SLOT, PLAN, PLAN_ALTERNATIVES, POSTS, type PlanItem, type Post } from '../../data/publishing'

export type PlanState = {
  status: 'proposed' | 'approved' | 'rejected'
  version: number
  items: PlanItem[]
  diff?: { added: string[]; removed: string[]; changed: string[] }
  request?: string
}
/** Last bulk change, kept 10 s so it can be undone in one click. */
export type PubUndo = { label: string; posts: Post[]; handoffs: string[]; until: number }
export type PublishingState = { posts: Post[]; plan: PlanState; undo?: PubUndo }
export const initialPublishing = (): PublishingState => ({ posts: structuredClone(POSTS), plan: { status: 'proposed', version: 1, items: structuredClone(PLAN) } })

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
  if (Math.abs(hour - bh) <= 1) return `Good slot. ${best.reason}`
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
  const posts: Post[] = included.map(i => ({ id: uid('p'), network: i.network, at: planItemAt(i), text: i.text, media: i.media, status: 'scheduled', author: 'atlas', pillar: i.pillar, campaign: i.tag === 'Campaign' ? 'Trail Week' : undefined }))
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
      const comment = slotComment(p.network, a.at)
      // Atlas's comment on the new slot stays on the post, not in a toast that vanishes.
      const next = pushLog(setPosts(s, s.publishing.posts.map(x => (x.id === a.id ? note({ ...x, at: a.at, note: comment }, now(s), `Moved from ${day(p.at)} to ${day(a.at)}`) : x))), { agent: 'atlas', text: `You moved “${p.text.slice(0, 48)}…” to ${new Date(a.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} ${hhmm(a.at)}`, status: 'done', reason: comment, link: '/publishing', detail: { before: new Date(p.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), after: new Date(a.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) } })
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
      return pushLog(next, { agent: 'atlas', text: `Next week’s plan approved: ${n} of ${s.publishing.plan.items.length} posts`, status: n < s.publishing.plan.items.length ? 'edited' : 'approved', reason: 'Your call from Plan review', link: '/publishing' })
    }
    case 'publishing/planReject': {
      const next = setPlan(s.handoffs.some(h => h.id === 'h-plan') ? removeHandoff(s, 'h-plan') : s, { status: 'rejected' })
      return pushLog(next, { agent: 'atlas', text: 'Next week’s plan rejected. Atlas will propose posts one by one.', status: 'rejected', link: '/publishing/plan' })
    }
    case 'publishing/planReset':
      // A fresh proposal after a rejection: no fake note, no diff.
      return setPlan(s, { status: 'proposed', request: undefined, diff: undefined, items: s.publishing.plan.items.map(i => ({ ...i, included: true })) })
    case 'publishing/planRequest': {
      const next = reworkPlan(s, a.text)
      const v = next.publishing.plan.version
      return pushLog(next, { agent: 'atlas', text: `Plan v${v} ready after your note: “${a.text}”`, status: 'done', link: '/publishing/plan' })
    }
    case 'publishing/askFill': {
      const at = T(...(BEST_SLOT[a.network].time.split(':').map(Number) as [number, number]), 0) + (a.day) * DAY
      const date = new Date(at)
      const slot = `${date.toLocaleDateString('en-GB', { weekday: 'short' })} ${date.getDate()}, ${BEST_SLOT[a.network].time}`
      const ideas: Record<string, string> = {
        instagram: 'Carousel: 4 ways to layer the Ember Fleece under the Storm Jacket.',
        tiktok: 'POV: you forgot the rain cover is in the bottom pocket.',
        linkedin: 'How we test a bag before it reaches you: 40 hours, 3 climates.',
        facebook: 'Show us your oldest Fernway bag. The most worn one gets a free repair kit.',
        youtube: 'Short: how to pack a sleeping bag in 15 seconds.',
        x: 'Rain tomorrow in the Alps. Good day to test a jacket.',
      }
      const next = pushHandoff(s, {
        agent: 'atlas', kind: 'approval', urgency: 'today', topic: 'Empty slot', action: 'atlas-fill', link: '/publishing',
        title: `Fill ${slot} on ${a.network === 'x' ? 'X' : a.network[0].toUpperCase() + a.network.slice(1)}`, context: 'You asked Atlas to fill a recommended empty slot from the calendar.',
        why: 'Filling empty slots is set to Draft.', confidence: 78,
        preview: { type: 'post', network: a.network, slot, text: [ideas[a.network]], media: a.network === 'linkedin' ? 'workshop' : a.network === 'facebook' ? 'pack' : 'fleece' },
      })
      return notify(next, 'publishing', 'Atlas drafted a post for that slot.', { link: { to: '/', label: 'Review on Desk' } })
    }
    case 'publishing/claire':
      return notify(toClaire(s, a.post).s, 'publishing', 'Asked Claire. The post stays on hold until she answers.')
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
    case 'publishing/restore': {
      const u = s.publishing.undo
      if (!u) return s
      const next: State = { ...s, handoffs: s.handoffs.filter(h => !u.handoffs.includes(h.id)), publishing: { ...s.publishing, posts: u.posts, undo: undefined } }
      return pushLog(next, { agent: 'atlas', text: `Undone: ${u.label}`, status: 'undone', link: '/publishing' })
    }
  }
}

const day = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${hhmm(t)}`
const note = (p: Post, at: number, text: string): Post => ({ ...p, history: [...(p.history ?? []), { at, text }] })

/** Send one post to Claire: on hold, plus a card in Claire's lane. */
function toClaire(s: State, post: Post): { s: State; hid: string } {
  const t = now(s)
  const held = note({ ...post, status: 'needs', note: 'Waiting on Claire.' }, t, 'Sent to Claire')
  let next = setPosts(s, s.publishing.posts.some(p => p.id === post.id) ? s.publishing.posts.map(p => (p.id === post.id ? held : p)) : [...s.publishing.posts, held])
  const hid = uid('h')
  next = pushHandoff(next, {
    id: hid, agent: 'atlas', kind: 'approval', urgency: 'today', topic: 'Post', action: 'atlas-fill', ref: post.id, link: `/publishing?post=${post.id}`,
    title: `Post for ${day(post.at)}`, context: post.text, why: 'You sent this post to Claire.', confidence: 85,
    preview: { type: 'post', network: post.network, slot: `${new Date(post.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}, ${hhmm(post.at)}`, text: [post.text], media: post.media },
  })
  next = updateHandoff(next, hid, { lane: 'claire', claire: { askedAt: t, dueAt: t + (30 + Math.round(Math.random() * 30)) * 1000 } })
  return { s: next, hid }
}

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
      next = setPosts(s, s.publishing.posts.map(p => (a.ids.includes(p.id) && p.status !== 'published' ? note({ ...p, at: move(p) }, t, `Moved from ${day(p.at)} to ${day(move(p))}`) : p)))
      label = a.at !== undefined ? `${many('moved')} to ${day(a.at)}` : `${many('moved')} ${Math.abs(a.shiftDays ?? 0)} day${Math.abs(a.shiftDays ?? 0) > 1 ? 's' : ''} ${(a.shiftDays ?? 0) > 0 ? 'later' : 'earlier'}`
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
  return pushLog(next, { agent: 'atlas', text: label, status: 'approved', reason: 'Your call from Publishing', link: '/publishing' })
}

const NET: Partial<Record<Network, string>> = { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', facebook: 'Facebook', youtube: 'YouTube', x: 'X' }


/** Desk decisions that touch the calendar or the plan. */
export function onResolvePublishing(s: State, h: Handoff, d: Decision): State {
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

  const linked = s.publishing.posts.find(p => p.handoff === h.id || p.id === h.ref)
  const preview = h.preview?.type === 'post' ? h.preview : undefined
  if (linked) {
    if (h.id === 'h-visual' && d.kind === 'option') {
      if (d.index === 0) return patchPost(s, linked.id, { media: 'workshop', status: 'scheduled', note: 'Visual: Annecy workshop photo (October).' })
      if (d.index === 1) return patchPost(s, linked.id, { note: 'Waiting for your upload. Drop it in Media.' })
      return patchPost(s, linked.id, { at: linked.at + 7 * DAY, status: 'scheduled', note: 'Moved to next week, visual to find.' })
    }
    if (h.id === 'h-code' && d.kind === 'answer') return patchPost(s, linked.id, { text: linked.text.replace('[code]', d.text.toUpperCase()), status: 'scheduled', note: `Code ${d.text.toUpperCase()} added.` })
    if (ok) return patchPost(s, linked.id, { status: 'scheduled', text: preview ? plain(preview.text) : linked.text, note: undefined })
    if (d.kind === 'reject') return linked.handoff === 'h-trend' ? setPosts(s, s.publishing.posts.filter(p => p.id !== linked.id)) : patchPost(s, linked.id, { status: 'draft', note: `Rejected${d.reason ? `: ${d.reason.toLowerCase()}` : ''}.` })
    return s
  }

  // Generic rule: any approved post card (Atlas drafts, counter-posts, command bar briefs) lands in the calendar.
  if (ok && preview) {
    const post: Post = { id: uid('p'), network: preview.network, at: parseSlot(preview.slot, now(s)), text: plain(preview.text), media: preview.media, status: 'scheduled', author: 'atlas', pillar: 'Trail stories', handoff: h.id }
    return setPosts(s, [...s.publishing.posts, post])
  }
  return s
}
