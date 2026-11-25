// Day 1: the workspace a new user lands in. Derived from the Day 30 seed: the imported history stays (posts, inbox,
// analytics come from the networks), what agents did over 30 days goes, and the Desk holds only today's first results.
import type { State } from '../../app/state'
import type { AgentId, Flagged, Handoff, LogEntry, Network, PlaybookRule } from '../../app/types'
import { DAY, MIN } from '../../app/time'
import { HANDOFFS } from '../../data/desk'
import { FACTS, RULES } from '../../data/playbook'
import { PILLAR_PERF } from '../../data/insights'
import { spotIdeas } from '../publishing/ideasModel'
import type { Conversation, ConvStatus } from '../../data/inbox'
import { ALL_ACCOUNTS, INTEGRATIONS, andList, PROPOSALS, levelFor, netOf, pickOf, presetOf, type Setup } from './model'

/** The three questions from last night Nova answers first. Rewritten with the first name, as the kept rule asks. */
export const QUESTIONS: { id: string; conv: string; title: string; draft: string; fact: string; confidence: number }[] = [
  { id: 'd1-nova-size', conv: 'c-size', title: 'Which size for the Ember Fleece?', draft: 'Noé, go for M. It’s a regular fit with room for a base layer. If you like it loose, take L.', fact: 'Ember Fleece: €95, recycled polyester, sizes XS to XXL', confidence: 91 },
  { id: 'd1-nova-cover', conv: 'c-cover', title: 'Does the Ridge come with a rain cover?', draft: 'Lou, it does: it’s tucked in the bottom pocket. Most people never find it 👀', fact: 'Ridge 28L: €140, 55 × 30 × 20 cm, 1.1 kg, fits cabin rules', confidence: 88 },
  { id: 'd1-nova-return', conv: 'c-return', title: 'Can I return a jacket I wore once?', draft: 'Élodie, yes, within 30 days if it’s clean and has its tags. Start the return from your order page, the label is free.', fact: 'Returns: 30 days, free exchange, refund in 5 working days', confidence: 93 },
]
export const DAY1_IDS = { atlas: 'd1-atlas', iris: 'd1-iris', sage: 'd1-sage' }
const COMPETITOR_NAMES: Record<string, string> = { peakline: 'Peakline', norro: 'Norrø', trailkind: 'Trailkind', basecamp: 'Basecamp Co.' }

/** Next 07:00 after the team started: when the first brief lands. */
export const firstBriefAt = (startedAt: number) => { const d = new Date(startedAt + DAY); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 7, 0).getTime() }

const list = andList
const WAITING: ConvStatus[] = ['draft', 'escalated', 'claire', 'takeover']

export function buildDay1(base: State, setup: Setup, t: number): State {
  const onNet = (n?: Network) => !!n && setup.connected.some(id => netOf(id) === n)
  const social = setup.connected.some(id => INTEGRATIONS.find(i => i.id === id)?.group === 'Social')

  // Autonomy from the chosen preset; track records start empty.
  const NOW_DAY1: Record<AgentId, string> = { nova: 'Watching your inboxes', atlas: 'Reading your best posts', iris: 'Writing tomorrow’s first brief', echo: 'Watching your competitors', sage: 'Waiting for your OK on the pillars', juno: 'Watching your YouTube channel' }
  const agents = base.agents.map(a => ({
    ...a, now: NOW_DAY1[a.id],
    record: { handled: 0, escalated: 0, approvedUnchanged: 0, undone: 0, series: Array(30).fill(0) },
    actions: a.actions.map(x => ({ ...x, autonomy: levelFor(x.risk, presetOf(setup, a.id), x.locked), reviewed: 0, approvedUnchanged: undefined, trialUntil: undefined, trialFrom: undefined })),
  }))
  const level = (agent: AgentId, action: string) => agents.find(a => a.id === agent)!.actions.find(x => x.id === action)!.autonomy

  // Playbook: kept proposals, plus the facts read from the catalog and the help centre.
  const kept = (id: string) => { const p = PROPOSALS.find(x => x.id === id); return p ? pickOf(setup, p) : undefined }
  const asRule = (r: PlaybookRule, origin: string): PlaybookRule => ({ ...r, text: kept(r.id)?.text ?? r.text, uses: 0, addedAt: t, origin })
  const rules = [
    ...RULES.filter(r => kept(r.id)?.keep).map(r => asRule(r, 'Onboarding · from your last 200 replies')),
    ...FACTS.filter(f => /Shopify catalog|Help centre|Onboarding/.test(f.origin) && kept(f.id)?.keep !== false).map(f => asRule(f, f.origin === 'Onboarding' ? 'Onboarding · from your site' : `Onboarding · ${f.origin.toLowerCase()}`)),
  ]
  const press = kept('e-press')!
  const watched = PROPOSALS.filter(p => p.kind === 'competitor' && pickOf(setup, p).keep).map(p => p.id)

  // Nova's first replies: drafts on Draft, sent with an Undo on Act.
  const faq = level('nova', 'nova-faq')
  const questions = QUESTIONS.filter(q => onNet(base.inbox.convs.find(c => c.id === q.conv)?.network))
  const log: Omit<LogEntry, 'id'>[] = []
  const at = (s: number) => t - s * 1000
  let convs: Conversation[] = base.inbox.convs.map(c => c.status !== 'auto' ? c : {
    // Before Protopulse, you answered these yourself.
    ...c, status: 'you' as const, messages: c.messages.map(m => (m.from === 'nova' ? { ...m, from: 'you' as const, auto: false, undoUntil: undefined } : m)),
  })
  const cards: Handoff[] = []
  for (const q of questions) {
    const c = convs.find(x => x.id === q.conv)!
    if (faq === 'act') {
      convs = convs.map(x => (x.id === c.id ? { ...x, status: 'auto' as const, messages: [x.messages[0], { id: `${q.id}-m`, from: 'nova' as const, text: q.draft, at: at(20), auto: true, undoUntil: t + 10 * MIN }] } : x))
      continue
    }
    convs = convs.map(x => (x.id === c.id ? { ...x, status: 'draft' as const, draft: [q.draft], handoff: q.id, unread: true, messages: x.messages.slice(0, 1) } : x))
    cards.push({
      id: q.id, agent: 'nova', kind: 'approval', urgency: 'today', topic: 'Question', action: 'nova-faq', ref: c.id, link: `/inbox/${c.id}`,
      title: q.title, context: `${c.author} · waiting since ${new Date(c.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
      why: 'Product and shipping questions are set to Draft. Nova wrote the answer from your Playbook facts.',
      confidence: q.confidence, at: at(40), rules: kept('r-name')?.keep ? [kept('r-name')!.text] : undefined,
      sources: [{ label: q.fact, from: 'Playbook facts' }],
      preview: { type: 'reply', network: c.network, author: c.author, text: c.messages[0].text, draft: [q.draft] },
    })
  }
  if (questions.length) log.push(faq === 'act'
    ? { agent: 'nova', at: at(20), text: `Answered ${questions.length} questions from last night on her own`, reason: 'Product and shipping questions are set to Act', status: 'done', undoUntil: t + 10 * MIN, link: '/inbox' }
    : { agent: 'nova', at: at(40), text: `Drafted ${questions.length} replies to questions from last night`, reason: 'Product and shipping questions are set to Draft', status: 'done', link: '/inbox' })

  // This morning's two real escalations, if their network is connected.
  const strap = HANDOFFS.find(h => h.id === 'h-strap')!
  if (onNet('instagram') && level('nova', 'nova-complaint') !== 'act') cards.push({ ...structuredClone(strap), why: `Complaint with public traction. Complaints are set to ${level('nova', 'nova-complaint') === 'draft' ? 'Draft' : 'Suggest: Nova proposes, you send'}.`, rules: strap.rules?.filter(r => kept(r === 'Apologise once, then fix' ? 'r-apologise' : 'r-dm')?.keep) })
  if (onNet('linkedin')) cards.push(structuredClone(HANDOFFS.find(h => h.id === 'h-press')!))
  if (watched.includes('peakline')) cards.push(structuredClone(HANDOFFS.find(h => h.id === 'h-peakline')!))

  // Atlas: ideas from the imported posts, at the levels just chosen. The strongest one comes to the Desk.
  const atlasLevels = Object.fromEntries(agents.find(a => a.id === 'atlas')!.actions.map(x => [x.id, x.autonomy]))
  // Only what went out on the networks is imported: drafts and scheduled posts were made in Protopulse.
  const posts = base.publishing.posts.filter(p => p.status === 'published')
  let ideas = social ? spotIdeas(t, posts, atlasLevels, rules) : []
  const top = ideas.find(i => i.key === 'storm-snow') ?? ideas[0]
  if (top) {
    ideas = ideas.map(i => (i.id === top.id ? { ...i, handoff: DAY1_IDS.atlas } : i))
    const src = top.sources[0]
    cards.push({
      id: DAY1_IDS.atlas, agent: 'atlas', kind: 'approval', urgency: 'week', topic: 'Idea', ref: top.id, link: `/publishing/ideas/${top.id}`, at: at(30),
      title: top.title, context: `${src.value ? `${src.value} · ${src.measure}` : src.proof}. ${top.why}`,
      why: `Built from your best post this month. Atlas is on ${atlasLevels['atlas-recycle'] === 'suggest' ? 'Suggest: it proposes, you decide' : 'Draft for this action'}.`,
      confidence: top.confidence, sources: top.sources.slice(0, 2).map(s => ({ label: s.proof, from: s.label })),
    })
    log.push({ agent: 'atlas', at: at(30), text: `Found ${ideas.length} post ideas in your best posts`, reason: 'Read 90 days of posts', status: 'done', link: '/publishing' })
  }

  // Iris and Sage need posts to read.
  if (social) {
    const best = [...PILLAR_PERF].sort((a, b) => b.er - a.er)[0]
    const most = [...PILLAR_PERF].sort((a, b) => b.share - a.share)[0]
    cards.push({
      id: DAY1_IDS.iris, agent: 'iris', kind: 'news', group: 'good', urgency: 'week', topic: 'First finding', at: at(25), link: '/insights/explore',
      title: `${best.pillar} posts get your best engagement: ${best.er}%`,
      context: `Yet they are only ${best.share}% of what you post. ${most.pillar} is ${most.share}%, at ${most.er}%.`,
      why: 'Iris read 90 days of posts on your networks and compared the four themes you post about.', confidence: 86,
      preview: { type: 'metric', label: `Engagement rate on ${best.pillar} posts`, value: `${best.er}%`, delta: '+1.3 pts vs your 3.1% average', series: [3.6, 3.9, 4.1, 3.8, 4.4, 4.6, 4.2, 4.5, 4.7, 4.4] },
      cta: { label: 'See it in Insights', to: '/insights/explore' },
    })
    cards.push({
      id: DAY1_IDS.sage, agent: 'sage', kind: 'approval', urgency: 'week', topic: 'Pillars', action: 'sage-pillars', at: at(15), link: '/strategy/pillars',
      title: '4 editorial pillars and a cadence, from your last 90 days',
      context: 'What you already post about, with a target share for each and 17 posts a week across your networks.',
      why: 'Sage proposes pillars once, at the start. Pillars are locked: Sage suggests, you decide.', confidence: 81,
      preview: { type: 'plan', title: 'Pillars and cadence', lines: ['Gear that lasts 35% · Trail stories 25% · Repair & care 20% · Community 20%', 'Instagram 5 · TikTok 4 · Facebook 3 · LinkedIn 3 · YouTube 1 · X 1 a week', 'Community grows from 9% to 20%: it’s your best engagement'] },
    })
    log.push({ agent: 'iris', at: at(50), text: 'Read 90 days of posts on your networks', reason: 'Your first setup', status: 'done', link: '/insights' })
    log.push({ agent: 'sage', at: at(15), text: 'Proposed 4 pillars and a cadence of 17 posts a week', reason: 'Your first setup', status: 'done', link: '/strategy/pillars' })
  }
  if (watched.length) log.push({ agent: 'echo', at: at(45), text: `Started watching ${list(watched.map(id => COMPETITOR_NAMES[id]))}`, reason: 'Competitors you kept', status: 'done', link: '/listening' })

  // Conversations no Day 1 card is about: before Protopulse, you answered them yourself.
  const onDesk = new Set(cards.map(h => h.id))
  const flat = (f: Flagged) => (typeof f === 'string' ? f : f.text)
  convs = convs.map(c => {
    if (c.status === 'hidden') return { ...c, note: c.note?.replace('by Nova', 'by you') }
    if (!WAITING.includes(c.status) || (c.handoff && onDesk.has(c.handoff))) return c
    const reply = c.draft?.length ? [{ id: `${c.id}-you`, from: 'you' as const, text: c.draft.map(flat).join(' '), at: Math.min(c.at + 20 * MIN, t - MIN) }] : []
    return {
      ...c, status: 'you' as const, unread: false, handoff: undefined, note: undefined, draft: undefined, assignee: c.assignee === 'claire' ? undefined : c.assignee,
      messages: [...c.messages.map(m => (m.from === 'nova' ? { ...m, from: 'you' as const, auto: false, undoUntil: undefined } : m)), ...reply],
    }
  })

  return {
    ...base,
    phase: 'day1',
    onboarded: true,
    setup: { ...setup, startedAt: t, step: 'results' },
    agents,
    handoffs: cards.map(h => ({ ...h, fresh: false })),
    log: log.sort((a, b) => b.at - a.at).map((e, i) => ({ ...e, id: `l-d1-${i}` })),
    desk: { done: [] },
    brief: { read: false, since: t },
    engine: { ...base.engine, live: true, cursor: 0, nextAt: t + 60_000 },
    inbox: { ...base.inbox, convs },
    // No plan yet: Atlas proposes the first one on Thursday.
    publishing: { ...base.publishing, ideas, posts, plan: { status: 'upcoming', version: 0, items: [] } },
    // Sage has run no campaign yet; its standing proposals are all still open.
    strategy: { ...base.strategy, campaigns: [], proposals: base.strategy.proposals.map(p => ({ ...p, status: 'proposed' as const })) },
    playbook: { ...base.playbook, rules, escalate: base.playbook.escalate.map(e => (e.id === 'e-press' ? { ...e, on: press.keep, label: press.text } : e)) },
    listening: { ...base.listening, watch: base.listening.watch.filter(w => watched.includes(w.id)).map(w => ({ ...w, since: t })) },
    chats: { list: [] },
    // Juno has cut nothing yet: the next upload on the channel is her first job.
    video: { ...base.video, sources: [], clips: [], opened: {} },
  }
}

/* ---------- Getting-started checklist ---------- */

export type CheckItem = { id: string; label: string; detail: string; done: boolean; unlocks?: string; action?: { label: string; to?: string; connect?: string[] }; at?: number }

export function checklist(s: State, now: number): CheckItem[] {
  const st = s.setup
  const open = (id: string) => s.handoffs.some(h => h.id === id && !h.lane)
  const novaLeft = QUESTIONS.filter(q => open(q.id))
  const asked = QUESTIONS.some(q => s.handoffs.some(h => h.id === q.id) || s.desk.done.some(d => d.id === q.id))
  const missing = ALL_ACCOUNTS.filter(id => !st.connected.includes(id))
  const briefAt = firstBriefAt(st.startedAt ?? now)
  const items: CheckItem[] = []
  if (asked || novaLeft.length) items.push({
    id: 'replies', label: 'Send Nova’s first replies', done: !novaLeft.length,
    detail: novaLeft.length ? `${novaLeft.length} answer${novaLeft.length > 1 ? 's' : ''} ready, from your Playbook facts` : 'Sent. Nova learns from every one you approve or edit.',
    unlocks: 'After 20 approvals in a row, Nova can ask to answer on her own.',
    action: novaLeft.length ? { label: 'Review', to: `/?card=${novaLeft[0].id}` } : undefined,
  })
  const atlasCard = s.handoffs.some(h => h.id === DAY1_IDS.atlas) || s.desk.done.some(d => d.id === DAY1_IDS.atlas) || s.publishing.ideas.some(i => i.handoff === DAY1_IDS.atlas)
  if (atlasCard) items.push({
    id: 'atlas', label: 'Decide on Atlas’s first idea', done: !open(DAY1_IDS.atlas),
    detail: open(DAY1_IDS.atlas) ? 'Built from your best post this month' : 'Done. Atlas proposes more as it learns what you keep.',
    action: open(DAY1_IDS.atlas) ? { label: 'Review', to: `/?card=${DAY1_IDS.atlas}` } : undefined,
  })
  items.push({
    id: 'accounts', label: missing.length ? 'Connect the rest of your accounts' : 'Connect your accounts', done: !missing.length,
    detail: missing.length ? `${list(missing.map(id => INTEGRATIONS.find(i => i.id === id)!.name))} ${missing.length > 1 ? 'aren’t' : 'isn’t'} connected yet` : `All ${ALL_ACCOUNTS.length} connected`,
    unlocks: missing.includes('shop') ? 'Shopify lets Nova check orders and prepare exchanges.' : undefined,
    action: missing.length ? { label: `Connect ${missing.length}`, connect: missing } : undefined,
  })
  items.push({
    id: 'playbook', label: 'Check what Protopulse learned', done: st.seen.includes('/playbook'),
    detail: `${s.playbook.rules.filter(r => r.kind !== 'fact').length} rules and ${s.playbook.rules.filter(r => r.kind === 'fact').length} facts every agent follows`,
    action: { label: 'Open Shared rules', to: '/agents/rules' },
  })
  items.push({
    id: 'agents', label: 'See what each agent can do alone', done: st.seen.includes('/agents'),
    detail: 'Move any action between Suggest, Draft and Act',
    action: { label: 'Open Agents', to: '/agents' },
  })
  items.push({
    id: 'brief', label: 'Read your first morning brief', done: now >= briefAt && s.brief.read,
    detail: now >= briefAt ? 'Iris wrote it at 07:00. It’s at the top of your Desk.' : `Iris writes it tomorrow at 07:00`, at: briefAt,
  })
  return items
}
