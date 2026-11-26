// Day 1: the workspace a new trial lands in. Derived from the Day 30 seed: the history of the connected profiles is
// imported (posts, inbox), what agents did over 30 days goes, and what takes hours to compute arrives when it's due.
import type { State } from '../../app/state'
import type { AgentId, Flagged, Handoff, LogEntry, Network, PlaybookRule } from '../../app/types'
import { DAY, MIN, hhmm } from '../../app/time'
import { pushLog } from '../../app/core'
import { HANDOFFS } from '../../data/desk'
import { FACTS, RULES } from '../../data/playbook'
import { PILLAR_PERF } from '../../data/insights'
import type { Conversation, ConvStatus } from '../../data/inbox'
import type { Post } from '../../data/publishing'
import { PROPOSALS, andList, buildBrief, connectedNets, levelFor, pageLabel, pickOf, presetOf, publishNet, weakFields, type Draft, type Pending, type Setup } from './model'

/** The three questions waiting in the imported Inbox, which Nova answers first. Rewritten with the first name, as the learned rule asks. */
export const QUESTIONS: { id: string; conv: string; title: string; draft: string; fact: string; confidence: number }[] = [
  { id: 'd1-nova-size', conv: 'c-size', title: 'Which size for the Ember Fleece?', draft: 'Noé, go for M. It’s a regular fit with room for a base layer. If you like it loose, take L.', fact: 'Ember Fleece: €95, recycled polyester, sizes XS to XXL', confidence: 91 },
  { id: 'd1-nova-cover', conv: 'c-cover', title: 'Does the Ridge come with a rain cover?', draft: 'Lou, it does: it’s tucked in the bottom pocket. Most people never find it 👀', fact: 'Ridge 28L: €140, 55 × 30 × 20 cm, 1.1 kg, fits cabin rules', confidence: 88 },
  { id: 'd1-nova-return', conv: 'c-return', title: 'Can I return a jacket I wore once?', draft: 'Élodie, yes, within 30 days if it’s clean and has its tags. Start the return from your order page, the label is free.', fact: 'Returns: 30 days, free exchange, refund in 5 working days', confidence: 93 },
]
export const DAY1_IDS = { iris: 'd1-iris', sage: 'd1-sage' }

/** Echo's topic feed waits for the competitor backfill; Iris's first report for the history import. Both are real hours. */
export const BACKFILL_MS = 2 * 60 * MIN
export const IRIS_MS = 100 * MIN
/** A late connection: the Inbox import takes a few minutes before Nova can draft. */
export const INBOX_IMPORT_MS = 10 * MIN

/** Next 07:00 after the team started: when the first brief lands. */
export const firstBriefAt = (startedAt: number) => { const d = new Date(startedAt + DAY); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 7, 0).getTime() }

/** Atlas's first drafts, written from the website and the Playbook: the one thing Archie does without any history. */
export function atlasDrafts(t: number): Draft[] {
  const d = new Date(t)
  const at = (days: number, h: number, m: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, h, m).getTime()
  return [
    { id: 'd1-draft-snow', pillar: 'Trail stories', status: 'draft', at: at(1, 18, 30), text: 'First snow on the ridges above Annecy. The Storm Jacket is a 3-layer shell, made for exactly this. What’s your go-to layer when the weather turns?' },
    { id: 'd1-draft-repair', pillar: 'Repair & care', status: 'draft', at: at(2, 12, 0), text: 'Strap gave up on your Ridge 28L? Bags get 3 years of warranty, then our repair programme takes over. Start a repair at fernway.co/repair.' },
    { id: 'd1-draft-bottle', pillar: 'Gear that lasts', status: 'draft', at: at(3, 18, 30), text: 'The Summit Bottle has a lifetime warranty. Dent it on the trail, crack it in the car: we replace it. fernway.co/warranty' },
  ]
}

const WAITING: ConvStatus[] = ['draft', 'escalated', 'claire', 'takeover']
const flat = (f: Flagged) => (typeof f === 'string' ? f : f.text)

/** The history of the given networks, as the networks give it: you answered every conversation, nothing was made in Protopulse. */
export function importHistory(base: State, nets: Network[], t: number): { convs: Conversation[]; posts: Post[] } {
  const convs = base.inbox.convs.filter(c => nets.includes(c.network)).map(c => {
    if (c.status === 'hidden') return { ...c, note: c.note?.replace('by Nova', 'by you') }
    if (c.status !== 'auto' && !WAITING.includes(c.status)) return c
    const reply = c.status !== 'auto' && c.draft?.length ? [{ id: `${c.id}-you`, from: 'you' as const, text: c.draft.map(flat).join(' '), at: Math.min(c.at + 20 * MIN, t - MIN) }] : []
    return {
      ...c, status: 'you' as const, unread: false, handoff: undefined, note: undefined, draft: undefined, assignee: c.assignee === 'claire' ? undefined : c.assignee,
      messages: [...c.messages.map(m => (m.from === 'nova' ? { ...m, from: 'you' as const, auto: false, undoUntil: undefined } : m)), ...reply],
    }
  })
  const posts = base.publishing.posts.filter(p => p.status === 'published' && nets.includes(p.network))
  return { convs, posts }
}

/** Nova's first replies on the questions of these networks: drafts on Draft, sent with an Undo on Act. */
function novaFirst(convs: Conversation[], nets: Network[], faq: string, rule: string | undefined, t: number) {
  const questions = QUESTIONS.filter(q => nets.includes(convs.find(c => c.id === q.conv)?.network as Network))
  const cards: Handoff[] = []
  let out = convs
  for (const q of questions) {
    const c = out.find(x => x.id === q.conv)!
    const first = c.messages[0]
    if (faq === 'act') {
      out = out.map(x => (x.id === c.id ? { ...x, status: 'auto' as const, unread: false, messages: [first, { id: `${q.id}-m`, from: 'nova' as const, text: q.draft, at: t - 20_000, auto: true, undoUntil: t + 10 * MIN }] } : x))
      continue
    }
    out = out.map(x => (x.id === c.id ? { ...x, status: 'draft' as const, draft: [q.draft], handoff: q.id, unread: true, messages: [first] } : x))
    cards.push({
      id: q.id, agent: 'nova', kind: 'approval', urgency: 'today', topic: 'Question', action: 'nova-faq', ref: c.id, link: `/inbox/${c.id}`, at: t - 40_000,
      title: q.title, context: `${c.author} · waiting since ${hhmm(c.at)}`,
      why: 'Product and shipping questions are set to Draft. Nova wrote the answer from your Playbook facts.',
      confidence: q.confidence, rules: rule ? [rule] : undefined, sources: [{ label: q.fact, from: 'Playbook facts' }],
      preview: { type: 'reply', network: c.network, author: c.author, text: first.text, draft: [q.draft] },
    })
  }
  const log: Omit<LogEntry, 'id'> | undefined = !questions.length ? undefined : faq === 'act'
    ? { agent: 'nova', at: t - 20_000, text: `Answered ${questions.length} waiting questions on her own`, reason: 'Product and shipping questions are set to Act', status: 'done', undoUntil: t + 10 * MIN, link: '/inbox' }
    : { agent: 'nova', at: t - 40_000, text: `Drafted ${questions.length} replies to messages waiting in your Inbox`, reason: 'Product and shipping questions are set to Draft', status: 'done', link: '/inbox' }
  return { convs: out, cards, log, count: questions.length }
}

/** What Echo and Iris deliver once the backfill and the import are done. Built when they're due, from the seed. */
function deferredCards(s: State, id: Pending['id']): { cards: Handoff[]; log: string; link: string } {
  if (id === 'echo') {
    const watched = s.listening.watch.map(w => w.name)
    const cards = s.listening.watch.some(w => w.id === 'peakline') ? [structuredClone(HANDOFFS.find(h => h.id === 'h-peakline')!)] : []
    return { cards, log: `Found the first topics on ${andList(watched)} after the backfill`, link: '/listening' }
  }
  if (id === 'nova') return { cards: [], log: '', link: '/inbox' }
  const best = [...PILLAR_PERF].sort((a, b) => b.er - a.er)[0]
  const most = [...PILLAR_PERF].sort((a, b) => b.share - a.share)[0]
  return {
    log: 'Wrote your first report from 90 days of imported history', link: '/insights',
    cards: [
      {
        id: DAY1_IDS.iris, agent: 'iris', kind: 'news', group: 'good', urgency: 'week', topic: 'First finding', at: 0, link: '/insights/explore',
        title: `${best.pillar} posts get your best engagement: ${best.er}%`,
        context: `Yet they are only ${best.share}% of what you post. ${most.pillar} is ${most.share}%, at ${most.er}%.`,
        why: 'Your history finished importing. Iris read 90 days of posts and compared the four themes you post about.', confidence: 86,
        preview: { type: 'metric', label: `Engagement rate on ${best.pillar} posts`, value: `${best.er}%`, delta: '+1.3 pts vs your 3.1% average', series: [3.1, 3.4, 3.9, 4.1, 4.4] },
      },
      {
        id: DAY1_IDS.sage, agent: 'sage', kind: 'approval', urgency: 'week', topic: 'Pillars', action: 'sage-pillars', at: 0, link: '/strategy/pillars',
        title: '4 editorial pillars and a cadence, from your last 90 days',
        context: 'What you already post about, with a target share for each and 17 posts a week across your networks.',
        why: 'Your history finished importing. Sage proposes pillars once, at the start. Pillars are locked: Sage suggests, you decide.', confidence: 81,
        preview: { type: 'plan', title: 'Pillars and cadence', lines: ['Gear that lasts 35% · Trail stories 25% · Repair & care 20% · Community 20%', 'Instagram 5 · TikTok 4 · Facebook 3 · LinkedIn 3 · YouTube 1 · X 1 a week', 'Community grows from 9% to 20%: it’s your best engagement'] },
      },
    ],
  }
}

/** Deliver what is due: its cards land on the Desk, its line in the journal. */
export function deliverDue(s: State, t: number): State {
  const due = s.setup.pending.filter(p => p.at <= t)
  if (!due.length) return s
  let next: State = { ...s, setup: { ...s.setup, pending: s.setup.pending.filter(p => p.at > t) } }
  for (const p of due.sort((a, b) => a.at - b.at)) {
    if (p.id === 'nova') { next = novaLate(next, p.at); continue }
    const { cards, log, link } = deferredCards(next, p.id)
    next = { ...next, handoffs: [...cards.map(h => ({ ...h, at: p.at, fresh: true })), ...next.handoffs.filter(h => !cards.some(c => c.id === h.id))] }
    next = pushLog(next, { agent: p.agent, at: p.at, text: log, reason: p.id === 'echo' ? 'Competitor backfill finished' : 'History import finished', status: 'done', link })
    if (p.id === 'iris') next = pushLog(next, { agent: 'sage', at: p.at, text: 'Proposed 4 pillars and a cadence of 17 posts a week', reason: 'From your Playbook and your imported history', status: 'done', link: '/strategy/pillars' })
  }
  return next
}
export const hasDue = (s: State, t: number) => s.setup.pending.some(p => p.at <= t)

function novaLate(s: State, t: number): State {
  const faq = s.agents.find(a => a.id === 'nova')!.actions.find(x => x.id === 'nova-faq')!.autonomy
  const nets = connectedNets(s.setup.connected)
  const asked = new Set([...s.handoffs.map(h => h.id), ...s.desk.done.map(x => x.id)])
  const open = s.inbox.convs.filter(c => !QUESTIONS.some(q => q.conv === c.id && asked.has(q.id)))
  const r = novaFirst(open, nets, faq, s.playbook.rules.find(x => x.id === 'r-name')?.text, t)
  const convs = s.inbox.convs.map(c => r.convs.find(x => x.id === c.id) ?? c)
  let next: State = { ...s, inbox: { ...s.inbox, convs }, handoffs: [...r.cards.map(h => ({ ...h, at: t, fresh: true })), ...s.handoffs] }
  if (r.log) next = pushLog(next, { ...r.log, at: t, reason: `Your Inbox finished importing. ${r.log.reason}` })
  return next
}

/** What's scheduled once accounts exist: Echo after the backfill, Iris after the import, never twice. */
function schedule(setup: Setup, t: number, watched: boolean, delivered: (id: string) => boolean, late: boolean): Pending[] {
  const has = (id: Pending['id']) => setup.pending.some(p => p.id === id)
  const out: Pending[] = []
  if (late && !has('nova')) out.push({ id: 'nova', agent: 'nova', at: t + INBOX_IMPORT_MS, label: 'Replies to the messages your Inbox imports' })
  if (watched && !has('echo') && !delivered('h-peakline')) out.push({ id: 'echo', agent: 'echo', at: t + BACKFILL_MS, label: 'First competitor topics' })
  if (!has('iris') && !delivered(DAY1_IDS.iris)) out.push({ id: 'iris', agent: 'iris', at: t + IRIS_MS, label: 'Your first report' })
  return out
}

export function buildDay1(base: State, setup: Setup, t: number): State {
  const nets = connectedNets(setup.connected)
  // "Finish later" before the Playbook: like Archie's fallback, the team starts from the site alone.
  const brief = setup.pb.brief ?? (setup.site ? buildBrief({ ...setup.pb, website: setup.site, noWebsite: false, voiceSource: 'website' }, setup.org, setup.connected) : undefined)

  // Autonomy from the chosen preset; track records start empty.
  const NOW_DAY1: Record<AgentId, string> = { nova: nets.length ? 'Watching your Inbox' : 'Needs an account', atlas: 'Writing from your Playbook', iris: nets.length ? 'Importing your history' : 'Writing tomorrow’s first brief', echo: nets.length ? 'Backfilling your competitors' : 'Needs an account', sage: 'Reading your Playbook', juno: nets.includes('youtube') ? 'Watching your YouTube channel' : 'Waiting for YouTube' }
  const agents = base.agents.map(a => ({
    ...a, now: NOW_DAY1[a.id],
    record: { handled: 0, escalated: 0, approvedUnchanged: 0, undone: 0, series: Array(30).fill(0) },
    actions: a.actions.map(x => ({ ...x, autonomy: levelFor(x.risk, presetOf(setup, a.id), x.locked), reviewed: 0, approvedUnchanged: undefined, trialUntil: undefined, trialFrom: undefined })),
  }))
  const level = (agent: AgentId, action: string) => agents.find(a => a.id === agent)!.actions.find(x => x.id === action)!.autonomy

  // Playbook: what Nova learned from the replies (with an account), the facts read on the website (with a site).
  const learned = (id: string) => { const p = PROPOSALS.find(x => x.id === id); return p && nets.length ? pickOf(setup.picks, p) : undefined }
  const asRule = (r: PlaybookRule, origin: string): PlaybookRule => ({ ...r, text: learned(r.id)?.text ?? r.text, uses: 0, addedAt: t, origin })
  const site = !!brief?.ctaUrls.length || (!setup.pb.noWebsite && !!setup.pb.website)
  const rules = [
    ...RULES.filter(r => learned(r.id)?.keep).map(r => asRule(r, 'Onboarding · learned from your public replies')),
    ...(site ? FACTS.filter(f => /Shopify catalog|Help centre|Onboarding/.test(f.origin)).map(f => asRule(f, 'Onboarding · from your website')) : []),
  ]
  const press = learned('e-press')
  const watched = brief?.competitors.filter(c => c.on).map(c => c.id) ?? []

  // The imported history, then Nova's first replies on it.
  const hist = importHistory(base, nets, t)
  const nova = novaFirst(hist.convs, nets, level('nova', 'nova-faq'), learned('r-name')?.keep ? learned('r-name')!.text : undefined, t)
  const log: Omit<LogEntry, 'id'>[] = nova.log ? [nova.log] : []
  const cards: Handoff[] = [...nova.cards]
  // This morning's two real escalations, if their network is connected: they arrived during the import.
  const strap = HANDOFFS.find(h => h.id === 'h-strap')!
  const keep = (r: string) => learned(r === 'Apologise once, then fix' ? 'r-apologise' : 'r-dm')?.keep
  if (nets.includes('instagram') && level('nova', 'nova-complaint') !== 'act') cards.push({ ...structuredClone(strap), why: `Complaint with public traction. Complaints are set to ${level('nova', 'nova-complaint') === 'draft' ? 'Draft' : 'Suggest: Nova proposes, you send'}.`, rules: strap.rules?.filter(keep) })
  if (nets.includes('linkedin')) cards.push(structuredClone(HANDOFFS.find(h => h.id === 'h-press')!))
  // A waiting conversation keeps its status only if its card is on the Desk.
  const onDesk = new Set(cards.map(h => h.id))
  const convs = nova.convs.map(c => {
    const b = base.inbox.convs.find(x => x.id === c.id)!
    return b.handoff && onDesk.has(b.handoff) && !QUESTIONS.some(q => q.conv === c.id) ? b : c
  })

  // Atlas writes 3 drafts from the Playbook right away. Without a profile they're a preview: nothing to schedule on.
  const drafts = atlasDrafts(t)
  log.push({ agent: 'atlas', at: t - 30_000, text: 'Wrote 3 first drafts from your website and your Playbook', reason: 'Your first setup', status: 'done', link: '/onboarding/results' })
  if (watched.length && nets.length) log.push({ agent: 'echo', at: t - 45_000, text: `Started the backfill on ${andList(brief!.competitors.filter(c => c.on).map(c => c.label))}`, reason: 'First topics in about 2 hours', status: 'done', link: '/listening' })
  if (nets.length) log.push({ agent: 'iris', at: t - 50_000, text: `Started importing the history of ${andList(setup.connected.map(pageLabel))}`, reason: 'Your first report comes later today', status: 'done', link: '/insights' })

  const pending = nets.length ? schedule({ ...setup, pending: [] }, t, watched.length > 0, () => false, false) : []

  return {
    ...base,
    phase: 'day1',
    onboarded: true,
    setup: { ...setup, pb: { ...setup.pb, brief }, startedAt: t, step: 'results', drafts, pending },
    agents,
    handoffs: cards.map(h => ({ ...h, fresh: false })),
    log: log.sort((a, b) => b.at - a.at).map((e, i) => ({ ...e, id: `l-d1-${i}` })),
    desk: { done: [] },
    brief: { read: false, since: t },
    engine: { ...base.engine, live: true, cursor: 0, nextAt: t + 60_000 },
    inbox: { ...base.inbox, convs },
    // No plan, no idea yet: Atlas proposes the first ones once it has read the imported posts.
    publishing: { ...base.publishing, ideas: [], posts: hist.posts, plan: { status: 'upcoming', version: 0, items: [] } },
    strategy: { ...base.strategy, campaigns: [], proposals: base.strategy.proposals.map(p => ({ ...p, status: 'proposed' as const })) },
    playbook: { ...base.playbook, rules, escalate: base.playbook.escalate.map(e => (e.id === 'e-press' ? { ...e, on: press?.keep ?? e.on, label: press?.text ?? e.label } : e)) },
    listening: { ...base.listening, watch: nets.length ? base.listening.watch.filter(w => watched.includes(w.id)).map(w => ({ ...w, since: t })) : [] },
    chats: { list: [] },
    video: { ...base.video, sources: [], clips: [], opened: {} },
  }
}

/** A profile connected once the team runs: its history imports, and what needed an account gets scheduled. */
export function connectLate(s: State, ids: string[], fresh: State, t: number): State {
  const before = connectedNets(s.setup.connected.filter(id => !ids.includes(id)))
  const added = connectedNets(s.setup.connected).filter(n => !before.includes(n))
  const hist = importHistory(fresh, added, t)
  const delivered = (id: string) => s.handoffs.some(h => h.id === id) || s.desk.done.some(x => x.id === id)
  const watchedIds = s.setup.pb.brief?.competitors.filter(c => c.on).map(c => c.id) ?? []
  const watch = s.listening.watch.length ? s.listening.watch : fresh.listening.watch.filter(w => watchedIds.includes(w.id)).map(w => ({ ...w, since: t }))
  const pending = [...s.setup.pending, ...schedule(s.setup, t, watch.length > 0, delivered, added.length > 0)]
  return {
    ...s,
    setup: { ...s.setup, pending },
    inbox: { ...s.inbox, convs: [...s.inbox.convs, ...hist.convs.filter(c => !s.inbox.convs.some(x => x.id === c.id))] },
    publishing: { ...s.publishing, posts: [...s.publishing.posts, ...hist.posts.filter(p => !s.publishing.posts.some(x => x.id === p.id))] },
    listening: { ...s.listening, watch },
  }
}

/* ---------- Getting started: the four activation milestones, and the Playbook if it's thin ---------- */

export type CheckItem = { id: string; label: string; detail: string; done: boolean; unlocks?: string; action?: { label: string; to?: string; connect?: boolean }; at?: number }

export function checklist(s: State, now: number): CheckItem[] {
  const st = s.setup
  const started = st.startedAt ?? now
  const connected = st.connected.length > 0
  const open = (id: string) => s.handoffs.some(h => h.id === id && !h.lane)
  const novaOpen = QUESTIONS.filter(q => open(q.id))
  const pendingOf = (id: Pending['id']) => st.pending.find(p => p.id === id)
  const irisIn = s.handoffs.some(h => h.id === DAY1_IDS.iris) || s.desk.done.some(x => x.id === DAY1_IDS.iris)
  const replied = s.inbox.convs.some(c => c.messages.some(m => m.from === 'you' && m.at >= started - MIN && !m.id.endsWith('-you')))
    || s.desk.done.some(x => x.h.agent === 'nova' && x.h.preview?.type === 'reply' && !/^(Rejected|Dismissed)/.test(x.text))
  const items: CheckItem[] = [
    {
      id: 'connect', label: 'Connect a profile', done: connected,
      detail: connected ? `${andList(st.connected.map(pageLabel))} connected` : 'Your agents read and reply through it. Nothing is published without you.',
      action: connected ? undefined : { label: 'Connect', connect: true },
    },
    {
      id: 'schedule', label: 'Schedule your first post', done: s.publishing.posts.some(p => p.status === 'scheduled'),
      detail: st.drafts.some(d => d.status === 'draft') ? `Atlas wrote ${st.drafts.filter(d => d.status === 'draft').length} drafts from your Playbook` : 'Write one, or ask Atlas for drafts',
      unlocks: publishNet(st.connected) ? undefined : 'Needs a connected profile to publish on.',
      action: { label: 'Review drafts', to: '/onboarding/results' },
    },
    {
      id: 'reply', label: 'Reply to your first Inbox message', done: replied,
      detail: novaOpen.length ? `Nova drafted ${novaOpen.length} ${novaOpen.length > 1 ? 'replies' : 'reply'} from your Playbook`
        : pendingOf('nova') ? `Your Inbox is importing. Nova drafts replies at ${hhmm(pendingOf('nova')!.at)}.`
        : connected ? 'Your imported messages are in the Inbox' : 'Needs a connected profile',
      unlocks: novaOpen.length ? 'After 20 approvals in a row, Nova can ask to answer on her own.' : undefined,
      action: novaOpen.length ? { label: 'Review', to: `/?card=${novaOpen[0].id}` } : connected ? { label: 'Open the Inbox', to: '/inbox' } : undefined,
      at: pendingOf('nova')?.at,
    },
    {
      id: 'report', label: 'Look at your first report', done: irisIn && (st.seen.includes('/insights') || st.seen.includes('/insights/explore')),
      detail: irisIn ? 'Iris wrote it from your imported history' : pendingOf('iris') ? `Iris writes it later today, once your history is imported (about ${hhmm(pendingOf('iris')!.at)})` : 'Needs a connected profile: there is nothing to report on yet',
      action: irisIn ? { label: 'Open Insights', to: '/insights' } : undefined, at: irisIn ? undefined : pendingOf('iris')?.at,
    },
  ]
  const weak = weakFields(st.pb.brief)
  if (weak.length) items.push({
    id: 'playbook', label: 'Finish your Playbook', done: st.seen.includes('/agents/rules') || st.seen.includes('/playbook'),
    detail: `${weak[0][0].toUpperCase()}${andList(weak).slice(1)}`, action: { label: 'Open Shared rules', to: '/agents/rules' },
  })
  return items
}
