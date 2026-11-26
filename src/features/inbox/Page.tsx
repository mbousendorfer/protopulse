import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowUpDown, AtSign, Check, CheckCheck, ChevronDown, CircleHelp, ListFilter, Lock, EyeOff, Eye, Frown, Hand, Inbox as InboxIcon, Mail, Megaphone, Meh, MessageSquare,
  Ban, Heart, ListChecks, MessageSquareText, OctagonAlert, Trash2, Users, Paperclip, Plus, Search, Sparkles, Send, ShoppingBag, Smile, StickyNote, Star, Tag, Undo2, UserRound, X,
} from 'lucide-react'
import type { Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { ago, hhmm, left } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { CONTACTS, ROSTER, TEAMMATES, withTeam, type Assignee, type ConvStatus, type ConvType, type Conversation, type Sentiment } from '../../data/inbox'
import { Btn, Empty, FlagText, Mark, Menu, Net, PageHead, Pill, Pop, Switch, Tabs, type MenuItem } from '../../ui'
import { CountBadge, InlineConfirm, UndoBar } from '../../ui/Feedback'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { canModerate, deleteWarning, dmId, dur, fanOf, NEEDS_YOU, PUBLIC, needsYou, type ModOp, virtualConvs, waitOf, waitSince, waitingOn, type BulkOp } from './slice'
import { RulesSheet } from './RulesSheet'
import { translate } from './translate'
import { ACCOUNTS, accountById, accountLabel } from '../publishing/accounts'
import { DATES, describe, fromSearch, isEmpty, matchFilters, postKey, toSearch, type Filters, type SavedView } from './filters'
import { SavedSheet } from './SavedSheet'
import { LabelsSheet } from './LabelsSheet'
import { fill, toTemplate } from './saved'
import { thenText, whenText } from './rules'
import './inbox.css'

type View = 'needs' | 'review' | 'leo' | 'yanis' | 'drafts' | 'handled' | 'hidden' | 'all' | 'claire' | 'mine' | 'negative'
/** Views that are one person's work. */
const PEOPLE: Partial<Record<View, Assignee>> = { mine: 'sam', claire: 'claire', leo: 'leo', yanis: 'yanis' }
const DAY_START = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
const VIEWS: { id: View; label: string; match: (c: Conversation, now: number) => boolean; count?: (c: Conversation) => boolean; saved?: boolean }[] = [
  // Needs you = what waits on Sam, then what waits on Claire at the bottom (not counted: it doesn't need him). A conversation Sam took over stays here until he replies.
  { id: 'needs', label: 'Needs you', match: c => NEEDS_YOU.includes(c.status) || c.status === 'claire', count: needsYou },
  // Agorapulse's core status: not looked at by anyone yet. Nova reviews what she settles alone.
  { id: 'review', label: 'To review', match: c => !c.reviewed },
  { id: 'drafts', label: 'Nova’s drafts', match: c => c.status === 'draft' },
  { id: 'handled', label: 'Handled by Nova', match: c => c.status === 'auto' },
  { id: 'hidden', label: 'Hidden', match: c => c.status === 'hidden' },
  { id: 'all', label: 'All', match: () => true },
  // The team: one view per person (listed under Team, not Saved views).
  { id: 'mine', label: 'You', match: c => c.assignee === 'sam' },
  { id: 'claire', label: 'Claire Dubois', match: c => c.assignee === 'claire' },
  { id: 'leo', label: 'Léo Marchand', match: c => c.assignee === 'leo' },
  { id: 'yanis', label: 'Yanis Haddad', match: c => c.assignee === 'yanis' },
  { id: 'negative', label: 'Negative today', match: (c, now) => c.sentiment === 'negative' && c.at >= DAY_START(now), saved: true },
]

type Sort = 'newest' | 'oldest' | 'urgent' | 'intent' | 'waiting'
const SORTS: { id: Sort; label: string }[] = [{ id: 'waiting', label: 'Waiting longest' }, { id: 'newest', label: 'Newest first' }, { id: 'oldest', label: 'Oldest first' }, { id: 'urgent', label: 'Most urgent' }, { id: 'intent', label: 'Buying intent' }]
const URGENCY: Record<ConvStatus, number> = { escalated: 0, draft: 1, claire: 2, takeover: 3, new: 4, you: 5, auto: 6, hidden: 7 }

const STATUS: Record<ConvStatus, { label: string; tone?: 'alert' | 'caution' | 'ok' | 'signal' }> = {
  auto: { label: 'Auto-replied', tone: 'ok' }, draft: { label: 'Draft ready', tone: 'caution' }, escalated: { label: 'Escalated', tone: 'alert' },
  hidden: { label: 'Hidden' }, new: { label: 'New' }, you: { label: 'You replied' }, claire: { label: 'Waiting on Claire', tone: 'signal' }, takeover: { label: 'You took over' },
}
const TYPE_LABEL: Record<ConvType, string> = { comment: 'Comment', dm: 'Message', mention: 'Mention', review: 'Review', ad: 'Ad comment' }
const SENT: Record<Sentiment, string> = { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' }
const TYPE_ICON: Record<ConvType, typeof Mail> = { comment: MessageSquare, dm: Mail, mention: AtSign, review: Star, ad: Megaphone }
const SENT_ICON: Record<Sentiment, typeof Smile> = { positive: Smile, neutral: Meh, negative: Frown }

/** What it is: a public comment, a private message, a review… */
export function TypeTag({ t }: { t: ConvType }) {
  const I = TYPE_ICON[t]
  return <span className={`ib-tag ib-type-${t}`}><I size={12} aria-hidden />{TYPE_LABEL[t]}</span>
}
/** How it feels, in colour and in words. */
export function SentimentTag({ s }: { s: Sentiment }) {
  const I = SENT_ICON[s]
  return <span className={`ib-tag ib-sent-${s}`}><I size={12} aria-hidden />{SENT[s]}</span>
}
function AssigneeFace({ who, size = 24 }: { who?: Assignee; size?: 16 | 24 }) {
  if (!who) return null
  return who === 'claire' ? <span title="Assigned to Claire"><Mark agent="claire" /></span> : <span title={who === 'sam' ? 'Assigned to you' : `Assigned to ${ROSTER[who].name}`}><SocialAvatar name={ROSTER[who].name} size={size === 16 ? 16 : 24} /></span>
}
/** The status, said with the right person: "Léo replied", "Yanis is replying". */
function statusOf(c: Conversation) {
  const by = [...c.messages].reverse().find(m => m.from === 'you')?.by
  if (c.status === 'you' && by && by !== 'sam') return { ...STATUS.you, label: `${ROSTER[by].short} replied` }
  if (c.status === 'takeover' && c.assignee && c.assignee !== 'sam') return { ...STATUS.takeover, label: `${ROSTER[c.assignee].short} is replying` }
  return STATUS[c.status]
}
const lastText = (c: Conversation) => c.messages.filter(m => m.from === 'them').slice(-1)[0]?.text ?? ''

export default function InboxPage() {
  const { s, d } = useStore()
  const params = useParams()
  const nav = useNavigate()
  const now = useNow(5000)
  const id = params['*'] || undefined
  const [params2] = useSearchParams()
  const asked = VIEWS.find(x => x.id === params2.get('view'))?.id
  const [view, setView] = useState<View>(asked ?? (params2.get('label') ? 'all' : 'needs'))
  // A link can open a view (the Desk's spam lane opens Hidden).
  useEffect(() => { if (asked) { setView(asked); setLabel(null) } }, [asked])
  const [label, setLabel] = useState<string | null>(params2.get('label'))
  // A link can open one label (Sage's campaign page opens its campaign label).
  const askedLabel = params2.get('label')
  useEffect(() => { if (askedLabel) { setLabel(askedLabel); setView('all') } }, [askedLabel])
  const [network, setNetwork] = useState<Network | 'all'>('all')
  const [type, setType] = useState<ConvType | 'all'>('all')
  const [sentiment, setSentiment] = useState<Sentiment | 'all'>('all')
  const [intent, setIntent] = useState(false)
  const [q, setQ] = useState('')
  const [date, setDate] = useState<Filters['date']>()
  const [post, setPost] = useState<string>()
  const [account, setAccount] = useState<string>()
  const [who, setWho] = useState<Filters['who']>()
  const [review, setReview] = useState<Filters['review']>()
  const f: Filters = { network: network === 'all' ? undefined : network, type: type === 'all' ? undefined : type, sentiment: sentiment === 'all' ? undefined : sentiment, intent, date, who, review, label: label ?? undefined, q, post, account }
  const apply = (x: Filters, to: View = 'all') => {
    setNetwork(x.network ?? 'all'); setType(x.type ?? 'all'); setSentiment(x.sentiment ?? 'all'); setIntent(!!x.intent)
    setDate(x.date); setWho(x.who); setReview(x.review); setPost(x.post); setAccount(x.account); setLabel(x.label ?? null); setQ(x.q ?? ''); setView(to)
  }
  // ⌘K opens the Inbox with filters in the URL ("negative Instagram DMs this week").
  const asking = params2.toString()
  useEffect(() => { const x = fromSearch(params2); if (x) apply(x) }, [asking]) // eslint-disable-line react-hooks/exhaustive-deps
  const askedSort = SORTS.find(x => x.id === params2.get('sort'))?.id
  const [sort, setSort] = useState<Sort>(askedSort ?? 'newest')
  useEffect(() => { if (askedSort) setSort(askedSort) }, [askedSort])

  const all = useMemo(() => [...virtualConvs(s), ...s.inbox.convs.map(withTeam)], [s])
  const v = VIEWS.find(x => x.id === view)!
  const list = useMemo(() => all
    .filter(c => v.match(c, now) && matchFilters(c, f, now))
    .sort((a, b) => sort === 'waiting' ? Number(waitingOn(b)) - Number(waitingOn(a)) || (waitingOn(a) ? waitSince(a) - waitSince(b) : b.at - a.at) : sort === 'oldest' ? a.at - b.at : sort === 'urgent' ? URGENCY[a.status] - URGENCY[b.status] || b.at - a.at : sort === 'intent' ? (b.intent ?? 0) - (a.intent ?? 0) || b.at - a.at : b.at - a.at),
  [all, v, now, label, network, type, sentiment, intent, q, sort, date, who, review, post, account]) // eslint-disable-line react-hooks/exhaustive-deps
  const ids = useMemo(() => list.map(c => c.id), [list])
  const sel = useSelection(ids, `${view}|${toSearch(f)}`)
  const current = all.find(c => c.id === id)

  // Deep link to a conversation the list doesn't show (other view, label or filter): drop what hides it so it stays visible.
  useEffect(() => { if (current && !list.some(x => x.id === current.id)) apply({}, v.match(current, now) ? view : 'all') }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ↑/↓ or J/K move between conversations while one is open; Esc closes it.
  useEffect(() => {
    if (!current) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof Element ? e.target : null
      if (t?.closest('input, textarea, [role="dialog"], [role="menu"]') || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      const i = ids.indexOf(current.id)
      if (k === 'arrowdown' || k === 'j') { e.preventDefault(); const n = ids[Math.min(ids.length - 1, i + 1)]; if (n) nav(`/inbox/${n}`) }
      if (k === 'arrowup' || k === 'k') { e.preventDefault(); const n = ids[Math.max(0, i - 1)]; if (n) nav(`/inbox/${n}`) }
      if (k === 'escape' && !sel.count) nav('/inbox')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, ids, nav, sel.count])

  // The Undo for the last group action stays 10 seconds.
  const undo = s.inbox.undo
  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => d({ type: 'inbox/dismissUndo' }), 10000)
    return () => clearTimeout(t)
  }, [undo, d])

  const filtersOn = !isEmpty(f)
  // Posts with comments, the ones with comments waiting on the team first.
  const posts = useMemo(() => {
    const by = new Map<string, { key: string; network: Network; n: number; waiting: number; at: number }>()
    for (const c of all) {
      const k = postKey(c)
      if (!k) continue
      const p = by.get(k) ?? { key: k, network: c.network, n: 0, waiting: 0, at: 0 }
      by.set(k, { ...p, n: p.n + 1, waiting: p.waiting + (waitingOn(c) ? 1 : 0), at: Math.max(p.at, c.at) })
    }
    return [...by.values()].sort((a, b) => b.waiting - a.waiting || b.n - a.n || b.at - a.at)
  }, [all])
  const clear = () => apply({}, view)
  // The filters behind the Filters button, each said as a chip that removes it.
  const FILTER_MENUS = <>
    <Menu align="start" trigger={<button className="select-btn">{network === 'all' ? 'All networks' : NETWORK_LABEL[network]}<ChevronDown size={14} /></button>}
      items={[{ label: 'All networks', onSelect: () => setNetwork('all') }, ...(Object.keys(NETWORK_LABEL) as Network[]).map(n => ({ label: NETWORK_LABEL[n], icon: <Net n={n} />, onSelect: () => setNetwork(n) }))]} />
    <Menu align="start" trigger={<button className="select-btn">{type === 'all' ? 'All types' : TYPE_LABEL[type]}<ChevronDown size={14} /></button>}
      items={[{ label: 'All types', onSelect: () => setType('all') }, ...(Object.keys(TYPE_LABEL) as ConvType[]).map(t => ({ label: TYPE_LABEL[t], onSelect: () => setType(t) }))]} />
    <Menu align="start" trigger={<button className="select-btn">{sentiment === 'all' ? 'Any sentiment' : SENT[sentiment]}<ChevronDown size={14} /></button>}
      items={[{ label: 'Any sentiment', onSelect: () => setSentiment('all') }, ...(Object.keys(SENT) as Sentiment[]).map(t => ({ label: SENT[t], onSelect: () => setSentiment(t) }))]} />
    <Menu align="start" trigger={<button className="select-btn">{account ? accountLabel(accountById(account)) : 'All profiles'}<ChevronDown size={14} /></button>}
      items={[{ label: 'All profiles', onSelect: () => setAccount(undefined) }, ...ACCOUNTS.filter(a => all.some(c => (c.account ?? c.network) === a.id)).map(a => ({ label: accountLabel(a), icon: <Net n={a.network} />, hint: a.handle, onSelect: () => setAccount(a.id) }))]} />
    <Menu align="start" trigger={<button className="select-btn">{date ? DATES[date] : 'Any date'}<ChevronDown size={14} /></button>}
      items={[{ label: 'Any date', onSelect: () => setDate(undefined) }, ...(Object.keys(DATES) as NonNullable<Filters['date']>[]).map(x => ({ label: DATES[x], onSelect: () => setDate(x) }))]} />
    <Menu align="start" trigger={<button className="select-btn">{who ? (who === 'none' ? 'Not assigned' : `Assigned to ${ROSTER[who].short}`) : 'Anyone'}<ChevronDown size={14} /></button>}
      items={[{ label: 'Anyone', onSelect: () => setWho(undefined) }, { label: 'Not assigned', onSelect: () => setWho('none') }, 'sep', ...(Object.keys(ROSTER) as Assignee[]).map(k => ({ label: ROSTER[k].name, onSelect: () => setWho(k) }))]} />
    <Menu align="start" trigger={<button className="select-btn">{review === 'todo' ? 'To review' : review === 'done' ? 'Reviewed' : 'Any review status'}<ChevronDown size={14} /></button>}
      items={[{ label: 'Any review status', onSelect: () => setReview(undefined) }, { label: 'To review', onSelect: () => setReview('todo') }, { label: 'Reviewed', onSelect: () => setReview('done') }]} />
  </>
  const chips = ([
    network !== 'all' && [NETWORK_LABEL[network], () => setNetwork('all')],
    type !== 'all' && [TYPE_LABEL[type], () => setType('all')],
    sentiment !== 'all' && [SENT[sentiment], () => setSentiment('all')],
    account && [accountLabel(accountById(account)), () => setAccount(undefined)],
    date && [DATES[date], () => setDate(undefined)],
    who && [who === 'none' ? 'Not assigned' : `Assigned to ${ROSTER[who].short}`, () => setWho(undefined)],
    review && [review === 'todo' ? 'To review' : 'Reviewed', () => setReview(undefined)],
    intent && ['Buying intent', () => setIntent(false)],
  ] as const).filter((x): x is [string, () => void] => !!x)
  const [naming, setNaming] = useState<string | null>(null)
  const [dropped, setDropped] = useState<{ view: SavedView; index: number } | null>(null)
  const labels = [...new Set([...s.inbox.labels, ...all.flatMap(c => c.labels ?? [])])]
  const labelsOpen = params2.get('labels') === '1'
  const rulesOpen = params2.get('rules') === '1'
  const setRules = (o: boolean) => nav({ search: o ? '?rules=1' : '' })
  const savedOpen = params2.get('saved') === '1'
  const [savedSeed, setSavedSeed] = useState<string>()
  const setSaved = (o: boolean) => { if (!o) setSavedSeed(undefined); nav({ search: o ? '?saved=1' : '' }) }

  const picked = list.filter(c => sel.has(c.id))
  const run = (op: BulkOp) => { d({ type: 'inbox/bulk', ids: picked.map(c => c.id), ...op }); sel.clear() }
  const mod = (op: ModOp) => { d({ type: 'inbox/moderate', ids: picked.map(c => c.id), op }); sel.clear(); setConfirmDelete(false) }
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deletable = picked.filter(canModerate).length
  const drafts = picked.filter(c => (c.status === 'draft' || c.status === 'escalated') && c.draft?.length).length
  const allHidden = picked.length > 0 && picked.every(c => c.status === 'hidden')
  const allReviewed = picked.length > 0 && picked.every(c => c.reviewed)

  return (
    <div className="page ib-page">
      <PageHead agent="nova" title="Inbox" lede="Every comment, message and review. Nova answers what she can and leaves the rest here for you.">
        <Btn variant="ghost" onClick={() => setSaved(true)}><MessageSquareText size={14} />Saved replies</Btn>
        <Btn variant="ghost" onClick={() => setRules(true)}><ListChecks size={14} />Rules<span className="num faint">{s.inbox.rules.filter(r => r.on).length}</span></Btn>
      </PageHead>
      <RulesSheet open={rulesOpen} onOpenChange={setRules} labels={labels} />
      <SavedSheet open={savedOpen} onOpenChange={setSaved} seed={savedSeed} />
      <LabelsSheet open={labelsOpen} onOpenChange={o => nav({ search: o ? '?labels=1' : '' })} />
      <div className={`ib-layout ${current ? 'has-current' : ''}`}>
        <nav className="ib-side" aria-label="Views">
          {VIEWS.filter(x => !x.saved && !PEOPLE[x.id]).map(x => <ViewBtn key={x.id} on={view === x.id && !label} label={x.label} n={all.filter(c => (x.count ?? (y => x.match(y, now)))(c)).length} onClick={() => { setView(x.id); setLabel(null) }} />)}
          <span className="ib-side-title">Team</span>
          {VIEWS.filter(x => PEOPLE[x.id]).map(x => {
            const who = PEOPLE[x.id]!
            const mine = all.filter(c => c.assignee === who && waitingOn(c))
            const over = mine.filter(c => waitOf(s, c, now)?.over).length
            return <ViewBtn key={x.id} on={view === x.id && !label} n={mine.length} onClick={() => { setView(x.id); setLabel(null) }}
              label={<><AssigneeFace who={who} size={16} /><span className="ellipsis">{x.label}</span>{over > 0 && <span className="ib-over">{over} over</span>}</>} />
          })}
          <span className="ib-side-title">Saved views</span>
          {s.inbox.views.map((x, i) => (
            <div key={x.id} className="ib-saved-view">
              <ViewBtn on={false} label={<span className="ellipsis">{x.name}</span>} n={all.filter(c => (VIEWS.find(y => y.id === x.view) ?? VIEWS[0]).match(c, now) && matchFilters(c, x.f, now)).length} onClick={() => apply(x.f, x.view as View)} />
              <Btn size="xs" variant="ghost" icon aria-label={`Delete the view ${x.name}`} onClick={() => { setDropped({ view: x, index: i }); d({ type: 'inbox/viewDelete', id: x.id }) }}><X size={12} /></Btn>
            </div>
          ))}
          {dropped && <UndoBar onUndo={() => { d({ type: 'inbox/viewRestore', ...dropped }); setDropped(null) }} onDismiss={() => setDropped(null)}>Deleted “{dropped.view.name}”</UndoBar>}
          {VIEWS.filter(x => x.saved).map(x => <ViewBtn key={x.id} on={view === x.id && !label} label={x.label} n={all.filter(c => x.match(c, now)).length} onClick={() => { setView(x.id); setLabel(null) }} />)}
          <span className="ib-side-title">By post</span>
          {posts.slice(0, 4).map(p => <ViewBtn key={p.key} on={post === p.key} n={p.n} onClick={() => apply(post === p.key ? {} : { post: p.key })}
            label={<><Net n={p.network} /><span className="ellipsis" title={p.key.replace(/^[^“]*“|”$/g, '')}>{p.key.replace(/^[^“]*“|”$/g, '')}</span>{p.waiting > 0 && <span className="ib-over">{p.waiting} waiting</span>}</>} />)}
          <span className="ib-side-title row between nowrap">Labels<button className="link-btn t-xs" onClick={() => nav({ search: '?labels=1' })}>Manage</button></span>
          {labels.map(l => <ViewBtn key={l} on={label === l} label={<><Tag size={14} aria-hidden />{l}</>} n={all.filter(c => c.labels?.includes(l)).length} onClick={() => { setLabel(label === l ? null : l); setView('all') }} />)}
        </nav>

        <section className="ib-list card" aria-label="Conversations">
          {sel.count > 0 ? (
            // While something is selected, the list header becomes the toolbar for the selection.
            <div className="ib-list-head ib-selecting" role="toolbar" aria-label="Actions on the selected conversations">
              <SelectAll sel={sel} label="Select every conversation in this view" />
              <b className="num ib-sel-count">{sel.count} selected</b>
              <Btn size="sm" variant="primary" disabled={!drafts} onClick={() => run({ op: 'approve' })}
                title={drafts < sel.count ? `${sel.count - drafts} of them have no draft to send` : undefined}>
                <Send size={14} />{drafts === sel.count ? `Send ${drafts}` : `Send ${drafts} of ${sel.count}`}
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => run({ op: 'reviewed', value: !allReviewed })}><CheckCheck size={14} />{allReviewed ? 'Mark not reviewed' : 'Mark reviewed'}</Btn>
              <Menu align="start" trigger={<Btn size="sm" variant="ghost"><UserRound size={14} />Assign<ChevronDown size={12} /></Btn>} items={assignItems(v2 => run({ op: 'assign', value: v2 }))} />
              <LabelMenu trigger={<Btn size="sm" variant="ghost"><Tag size={14} />Label<ChevronDown size={12} /></Btn>} labels={labels} onPick={l => run({ op: 'label', value: l })} />
              <Menu align="end" trigger={<Btn size="sm" variant="ghost" aria-label="More actions">More<ChevronDown size={12} /></Btn>} items={[
                { heading: 'Sentiment' }, ...(Object.keys(SENT) as Sentiment[]).map(x => ({ label: `Mark ${SENT[x].toLowerCase()}`, onSelect: () => run({ op: 'sentiment', value: x }) })), 'sep',
                { label: allHidden ? 'Unhide' : 'Hide', icon: allHidden ? <Eye size={14} /> : <EyeOff size={14} />, onSelect: () => run({ op: allHidden ? 'unhide' : 'hide' }) },
                { heading: 'Moderate' },
                { label: 'Like', icon: <Heart size={14} />, onSelect: () => mod('like') },
                { label: 'Report as spam', icon: <OctagonAlert size={14} />, onSelect: () => mod('spam') },
                { label: 'Ban the authors', icon: <Ban size={14} />, onSelect: () => mod('ban') },
                { label: 'Delete…', icon: <Trash2 size={14} />, onSelect: () => setConfirmDelete(true) },
              ]} />
              <span className="spacer" />
              <Btn size="sm" variant="ghost" onClick={sel.clear}>Cancel</Btn>
            </div>
          ) : (
            <div className="ib-list-head">
              <SelectAll sel={sel} label="Select every conversation in this view" />
              {/* When the side nav is folded away (narrow screen, or a conversation open), the views live in one menu. */}
              <Menu align="start" trigger={<button className="select-btn ib-view-pick" aria-label="Choose a view">
                <span className="ellipsis">{label ?? (post ? post.replace(/^[^“]*“|”$/g, '') : v.label)}</span><ChevronDown size={14} />
              </button>} items={[
                ...VIEWS.filter(x => !x.saved && !PEOPLE[x.id]).map(x => ({ label: x.label, hint: <span className="num">{all.filter(c => (x.count ?? (y => x.match(y, now)))(c)).length}</span>, onSelect: () => { setView(x.id); setLabel(null) } })),
                { heading: 'Team' },
                ...VIEWS.filter(x => PEOPLE[x.id]).map(x => ({ label: x.label, icon: <AssigneeFace who={PEOPLE[x.id]} size={16} />, hint: <span className="num">{all.filter(c => c.assignee === PEOPLE[x.id] && waitingOn(c)).length}</span>, onSelect: () => { setView(x.id); setLabel(null) } })),
                { heading: 'Saved views' },
                ...s.inbox.views.map(x => ({ label: x.name, onSelect: () => apply(x.f, x.view as View) })),
                ...VIEWS.filter(x => x.saved).map(x => ({ label: x.label, onSelect: () => { setView(x.id); setLabel(null) } })),
                { heading: 'By post' },
                ...posts.slice(0, 4).map(p => ({ label: <span className="ellipsis">{p.key.replace(/^[^“]*“|”$/g, '')}</span>, icon: <Net n={p.network} />, hint: <span className="num">{p.n}</span>, onSelect: () => apply({ post: p.key }) })),
                { heading: 'Labels' },
                ...labels.map(l => ({ label: l, icon: <Tag size={14} />, onSelect: () => { setLabel(l); setView('all') } })),
                { label: 'Manage labels…', onSelect: () => nav({ search: '?labels=1' }) },
              ]} />
              <div className="ib-search"><Search size={14} aria-hidden /><input className="input" placeholder="Search people and messages" value={q} onChange={e => setQ(e.target.value)} aria-label="Search conversations" /></div>
              <span className="faint num ib-count">{list.length}</span>
              {view === 'review' && list.length > 0 && <Btn size="sm" onClick={() => d({ type: 'inbox/bulk', ids, op: 'reviewed', value: true })}><CheckCheck size={14} />Review all {list.length}</Btn>}
              <Pop align="end" trigger={<Btn size="sm" variant="ghost" aria-label={chips.length ? `Filters, ${chips.length} on` : 'Filters'}><ListFilter size={14} />Filters{chips.length > 0 && <CountBadge n={chips.length} />}</Btn>}>
                <div className="ib-filter-pop" role="group" aria-label="Filters">
                  {FILTER_MENUS}
                  <Switch checked={intent} onChange={setIntent} label="Buying intent" />
                </div>
              </Pop>
              <Menu align="end" trigger={<Btn size="sm" variant="ghost" aria-label={`Sort: ${SORTS.find(x => x.id === sort)!.label}`}><ArrowUpDown size={14} /><span className="ib-sort-label">{SORTS.find(x => x.id === sort)!.label}</span></Btn>}
                items={SORTS.map(x => ({ label: x.label, hint: sort === x.id ? <Check size={14} aria-label="Current" /> : undefined, onSelect: () => setSort(x.id) }))} />
            </div>
          )}
          {/* What narrows the list, said once, each one removable; then keep it as a view. */}
          {filtersOn && !sel.count && (
            <div className="ib-active" role="group" aria-label="Filters on">
              {label && <button type="button" className="filter" aria-pressed="true" aria-label={`Remove the label ${label}`} onClick={() => setLabel(null)}><Tag size={12} aria-hidden />{label}<X size={12} aria-hidden /></button>}
              {chips.map(([t, off]) => <button key={t} type="button" className="filter" aria-pressed="true" aria-label={`Remove the filter ${t}`} onClick={off}>{t}<X size={12} aria-hidden /></button>)}
              {naming === null ? <>
                <button type="button" className="link-btn t-sm" onClick={clear}>Clear filters</button>
                <button type="button" className="link-btn t-sm" onClick={() => setNaming(cap(describe(f)))}>Save as view</button>
              </> : (
                <form className="row tight nowrap" onSubmit={e => { e.preventDefault(); d({ type: 'inbox/viewAdd', view: { name: naming, view, f } }); setNaming(null) }}>
                  <input className="input w-240" autoFocus value={naming} onChange={e => setNaming(e.target.value)} aria-label="Name of the view" maxLength={40} />
                  <Btn size="sm" variant="ghost" onClick={() => setNaming(null)}>Cancel</Btn>
                  <Btn size="sm" type="submit" disabled={!naming.trim()}>Save view</Btn>
                </form>
              )}
            </div>
          )}
          {post && !sel.count && <PostHead post={post} compact={!!current} convs={all.filter(c => postKey(c) === post)} onAll={() => setPost(undefined)} />}
          {sel.count > 0 && confirmDelete && (
            <div className="m-2"><InlineConfirm danger confirm={`Delete ${deletable}`} onCancel={() => setConfirmDelete(false)} onConfirm={() => mod('delete')}>
              Deleting removes {deletable === 1 ? 'it' : `these ${deletable}`} from the networks for good. Nova keeps a copy here.{deletable < sel.count ? ` ${sel.count - deletable} reviews can’t be deleted.` : ''}
            </InlineConfirm></div>
          )}
          {!sel.count && undo && (
            <UndoBar className="m-2" until={undo.at + 10_000} onUndo={() => d({ type: 'inbox/undo' })} onDismiss={() => d({ type: 'inbox/dismissUndo' })}>{undo.label}</UndoBar>
          )}

          {!list.length ? (
            view === 'needs' && !filtersOn ? <Empty icon={<Check size={18} />} title="Nothing needs you" body="Nova is handling every conversation right now." />
              : view === 'review' && !filtersOn ? <Empty icon={<CheckCheck size={18} />} title="Everything is reviewed" body="Nova reviews what she handles on her own. New conversations land here until someone looks at them." />
              : <Empty title="No conversations here" body="Try another view or clear the filters." action={filtersOn ? <Btn size="sm" onClick={clear}>Clear filters</Btn> : undefined} />
          ) : view === 'needs' && !label ? (
            <NeedsList list={list} sel={sel} currentId={id} onOpen={(cid, edit) => nav(`/inbox/${cid}`, { state: edit ? { edit: true } : undefined })} />
          ) : (
            <ul className="ib-rows">
              {list.map(c => (
                <li key={c.id} className={`ib-row ${c.id === id ? 'current' : ''} ${c.unread ? 'ib-unread' : ''} ${sel.has(c.id) ? 'picked' : ''} ${c.reviewed ? 'ib-reviewed' : ''}`}
                  onClick={e => (e.shiftKey || e.metaKey) ? sel.toggle(c.id, e.shiftKey) : nav(`/inbox/${c.id}`)}>
                  <SelectBox checked={sel.has(c.id)} visible={sel.count > 0} onToggle={shift => sel.toggle(c.id, shift)} label={`Select the conversation with ${c.author}`} />
                  <SocialAvatar name={c.author} network={c.network} size={32} />
                  <div className="ib-who">
                    <Link to={`/inbox/${c.id}`} className="ellipsis" onClick={e => e.stopPropagation()}>{c.author}</Link>
                    <p className="ellipsis">{lastText(c)}</p>
                  </div>
                  <div className="ib-cell-tags">{c.account && c.account !== c.network && <span className="ib-tag">{accountById(c.account).name}</span>}<TypeTag t={c.type} /><SentimentTag s={c.sentiment} />{(c.intent ?? 0) >= 0.6 && <span className="ib-tag ib-intent"><ShoppingBag size={12} aria-hidden />Wants to buy</span>}</div>
                  <div className="ib-cell-status"><Pill tone={statusOf(c).tone}>{statusOf(c).label}</Pill><WaitTag c={c} />{c.reviewed && <span className="ib-check" title={`Reviewed by ${c.reviewedBy === 'nova' ? 'Nova' : c.reviewedBy === 'claire' ? 'Claire' : 'you'}`}><CheckCheck size={14} aria-label="Reviewed" /></span>}</div>
                  <div className="ib-cell-labels">{(c.labels ?? []).map(l => <span key={l} className="ib-label">{l}</span>)}</div>
                  <div className="ib-cell-who"><AssigneeFace who={c.assignee} /></div>
                  <span className="mono faint ib-cell-time">{hhmm(c.at)}</span>
                </li>
              ))}
            </ul>
          )}

        </section>

        {current ? <ConversationPanel c={current} labels={labels} onClose={() => nav('/inbox')} onSaveReply={t => { setSavedSeed(t); setSaved(true) }} onPost={p => apply({ post: p })} /> : null}
      </div>
    </div>
  )
}

/** What Nova needs from you, in three kinds: send what she is sure of, check the passage she doubts, decide what she never answers. */
type Need = 'ready' | 'check' | 'call' | 'yours' | 'claire' | 'team'
const flagsOf = (c: Conversation) => (c.draft ?? []).filter((x): x is Exclude<typeof x, string> => typeof x !== 'string')
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const needOf = (c: Conversation): Need => c.assignee && TEAMMATES.includes(c.assignee) && c.status !== 'claire' ? 'team' : c.status === 'claire' ? 'claire' : c.status === 'takeover' ? 'yours' : c.status === 'escalated' ? 'call' : flagsOf(c).length ? 'check' : 'ready'
const NEEDS: { id: Need; title: string; hint: string }[] = [
  { id: 'ready', title: 'Ready to send', hint: 'Nova is sure of the facts and the tone.' },
  { id: 'check', title: 'One passage to check', hint: 'Nova marked what she is unsure about.' },
  { id: 'call', title: 'Your call', hint: 'Locked topics Nova never answers herself.' },
  { id: 'yours', title: 'You’re replying', hint: 'You took these over. Nova stays out.' },
  { id: 'claire', title: 'Waiting on Claire', hint: 'You asked her. Nothing to do until she answers.' },
  { id: 'team', title: 'With your team', hint: 'Assigned to Léo or Yanis. They answer; you don’t have to.' },
]

const NEED_ICON: Record<Need, typeof Send> = { ready: Send, check: CircleHelp, call: Lock, yours: Hand, claire: UserRound, team: Users }
const SHOWN = 3

function NeedsList({ list, sel, currentId, onOpen }: { list: Conversation[]; sel: ReturnType<typeof useSelection>; currentId?: string; onOpen: (id: string, edit?: boolean) => void }) {
  const { d } = useStore()
  const [more, setMore] = useState<Need[]>([])
  return (
    <div className="ib-needs">
      {NEEDS.map(g => {
        const rows = list.filter(c => needOf(c) === g.id)
        if (!rows.length) return null
        const I = NEED_ICON[g.id]
        // Keep the open conversation visible even when its group is folded.
        const open = more.includes(g.id)
        const shown = open ? rows : rows.filter((c, i) => i < SHOWN || c.id === currentId)
        return (
          <section key={g.id} className={`ib-need-group ib-g-${g.id}`} aria-label={g.title}>
            <header className="ib-need-head">
              <span className="ib-need-icon" aria-hidden><I size={14} /></span>
              <h3>{g.title}</h3>
              {g.id === 'claire' || g.id === 'team' ? <span className="num faint">{rows.length}</span> : <CountBadge n={rows.length} />}
              <span className="faint">{g.hint}</span>
              <span className="spacer" />
              {g.id === 'ready' && rows.length > 1 && <Btn size="sm" variant="primary" onClick={() => d({ type: 'inbox/bulk', ids: rows.map(c => c.id), op: 'approve' })}><Send size={14} />Send all {rows.length}</Btn>}
            </header>
            <ul>{shown.map(c => <NeedRow key={c.id} c={c} need={g.id} sel={sel} current={c.id === currentId} onOpen={edit => onOpen(c.id, edit)} />)}</ul>
            {rows.length > shown.length && <button className="ib-need-more" onClick={() => setMore(m => [...m, g.id])}>Show {rows.length - shown.length} more<ChevronDown size={14} /></button>}
            {open && rows.length > SHOWN && <button className="ib-need-more" onClick={() => setMore(m => m.filter(x => x !== g.id))}>Show less</button>}
          </section>
        )
      })}
    </div>
  )
}

function NeedRow({ c, need, sel, current, onOpen }: { c: Conversation; need: Need; sel: ReturnType<typeof useSelection>; current: boolean; onOpen: (edit?: boolean) => void }) {
  const { d } = useStore()
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn() }
  const flags = flagsOf(c)
  const draft = (c.draft ?? []).map(x => (typeof x === 'string' ? x : x.text)).join('')
  // A single send goes through the group action so it gets the same 10-second Undo strip as Send all.
  const send = () => d({ type: 'inbox/bulk', ids: [c.id], op: 'approve' })
  const extras = (c.attachments ?? []).filter(a => !a.removed).map(a => a.label.split(':')[0]).join(' · ')
  return (
    <li className={`ib-need ${current ? 'current' : ''} ${sel.has(c.id) ? 'picked' : ''}`} onClick={e => (e.shiftKey || e.metaKey) ? sel.toggle(c.id, e.shiftKey) : onOpen()}>
      <SelectBox checked={sel.has(c.id)} visible={sel.count > 0} onToggle={shift => sel.toggle(c.id, shift)} label={`Select the conversation with ${c.author}`} />
      <SocialAvatar name={c.author} network={c.network} size={32} />
      <div className="ib-need-main">
        <p className="ib-need-them"><Link to={`/inbox/${c.id}`} className="ib-need-who" onClick={e => e.stopPropagation()}>{c.author}</Link><span className="ib-need-quote">“{c.messages.find(m => m.from === 'them')?.text ?? lastText(c)}”{translate(c.messages.find(m => m.from === 'them')?.text ?? '') && <span className="faint"> · {translate(c.messages.find(m => m.from === 'them')!.text)!.lang}</span>}</span></p>
        {need === 'ready' && <p className="ib-need-line"><span className="ib-need-by">Nova</span>{draft}{extras && <span className="faint"> · with {extras}</span>}</p>}
        {need === 'check' && <>
          <p className="ib-need-line"><span className="ib-need-by">Check “{flags[0].text}”</span>{flags[0].note}</p>
          {/* "Send as is" sends this whole text, so it is on the row. */}
          <p className="ib-need-line ib-need-draft"><span className="ib-need-by">Nova</span>{draft}</p>
        </>}
        {need === 'call' && (() => {
          const [by, ...rest] = (c.note ?? 'Locked topic').split(' · ')
          const why = rest.join(' · ')
          // An escalation quotes its Playbook rule before the holding reply.
          return <p className="ib-need-line"><span className="ib-need-by">{by}</span>{why.startsWith('rule') && <>{cap(why)}. </>}{c.draft ? <>Holding reply: {draft}</> : cap(why)}</p>
        })()}
        {need === 'yours' && <p className="ib-need-line">You took this over. Nova stays out until you reply.</p>}
        {need === 'claire' && <ClaireLine c={c} />}
        {need === 'team' && <p className="ib-need-line"><span className="ib-need-by">{ROSTER[c.assignee!].short}</span>{c.draft?.length ? 'Has Nova’s draft and will send it.' : `Is replying. ${ROSTER[c.assignee!].role.split(' · ')[0]}.`}</p>}
      </div>
      <div className="ib-need-acts" onClick={e => e.stopPropagation()}>
        <WaitTag c={c} fallback />
        {need === 'ready' && <><Btn size="sm" variant="ghost" onClick={stop(() => onOpen(true))}>Edit</Btn><Btn size="sm" onClick={stop(send)}><Send size={14} />Send</Btn></>}
        {need === 'check' && <><Btn size="sm" variant="ghost" onClick={stop(() => onOpen(true))}>Edit</Btn><Btn size="sm" onClick={stop(send)}><Send size={14} />Send as is</Btn></>}
        {need === 'yours' && <Btn size="sm" onClick={stop(() => onOpen())}><MessageSquare size={14} />Reply</Btn>}
        {(need === 'claire' || need === 'team') && <Btn size="sm" variant="ghost" onClick={stop(() => onOpen())}>Open</Btn>}
        {need === 'call' && <>
          <Menu align="end" trigger={<Btn size="sm" variant="ghost" onClick={e => e.stopPropagation()}>More<ChevronDown size={12} /></Btn>} items={[
            { label: 'Take over', icon: <Hand size={14} />, onSelect: () => { d({ type: 'inbox/takeover', id: c.id }); onOpen() } },
            { label: 'Ask Claire', icon: <UserRound size={14} />, onSelect: () => d({ type: 'inbox/claire', id: c.id }) },
          ]} />
          {c.draft ? <Btn size="sm" onClick={stop(send)}><Send size={14} />Send holding reply</Btn>
            : <Btn size="sm" onClick={stop(() => { d({ type: 'inbox/takeover', id: c.id }); onOpen() })}><Hand size={14} />Take over</Btn>}
        </>}
      </div>
    </li>
  )
}

/** Where the question to Claire stands: asked how long ago, or what she answered. */
function ClaireLine({ c }: { c: Conversation }) {
  const { s } = useStore()
  const now = useNow(10000)
  const card = c.handoff ? s.handoffs.find(h => h.id === c.handoff) : undefined
  const reply = card?.claire?.reply
  return <p className="ib-need-line"><span className="ib-need-by">Claire</span>{reply ? `“${reply}”` : card?.claire ? `Asked ${ago(card.claire.askedAt, now)}. She usually answers within a minute.` : c.note ?? 'Asked. She usually answers within a minute.'}</p>
}

/** How long the customer has waited on the team, named in words, and whether it is past the target for its type. */
function WaitTag({ c, fallback }: { c: Conversation; fallback?: boolean }) {
  const { s } = useStore()
  const now = useNow(30_000)
  const w = waitOf(s, c, now)
  if (!w) return fallback ? <span className="mono faint">{hhmm(c.at)}</span> : null
  return <span className={`ib-wait ${w.over ? 'over' : ''}`} title={`Waiting since ${hhmm(w.since)} · ${dur(w.target)} target`}>Waiting {dur(w.waited)}{w.over ? ` · over ${dur(w.target)}` : ''}</span>
}

/** The post a filtered list is about, and what Nova did with its comments. */
function PostHead({ post, convs, onAll, compact }: { post: string; convs: Conversation[]; onAll: () => void; compact?: boolean }) {
  const alone = convs.filter(c => c.status === 'auto' || (c.status === 'hidden' && c.reviewedBy === 'nova')).length
  const waiting = convs.filter(waitingOn)
  const net = convs[0]?.network
  return (
    <div className="ib-post-head">
      {net && <Net n={net} />}
      <div className="grow">
        <p className="ellipsis"><b>{compact ? post.replace(/^[^“]*“|”$/g, '') : post}</b><span className="faint"> · {convs.length} comment{convs.length === 1 ? '' : 's'}</span></p>
        {!compact && <p className="muted">Nova answered or hid {alone} on her own{waiting.length ? `. ${waiting.length} ${waiting.length === 1 ? 'waits' : 'wait'} on the team: ${waiting.map(c => c.author).join(', ')}` : '. Nothing waits on you'}.</p>}
      </div>
      <Btn size="sm" variant="ghost" onClick={onAll}>{compact ? 'All' : 'All posts'}</Btn>
    </div>
  )
}

/** Nova shows Sam the English of a foreign-language message or reply. */
function English({ text, from }: { text: string; from?: boolean }) {
  const tr = translate(text)
  if (!tr) return null
  return <p className="ib-tr"><span className="faint">{from ? `Translated from ${tr.lang}:` : `In English (sent in ${tr.lang}):`}</span> “{tr.en}”</p>
}

function ViewBtn({ on, label, n, onClick }: { on: boolean; label: ReactNode; n: number; onClick: () => void }) {
  return <button className={`ib-view ${on ? 'active' : ''}`} onClick={onClick} aria-pressed={on}><span className="row tight nowrap">{label}</span><span className="num">{n}</span></button>
}

const assignItems = (go: (v?: Assignee) => void): MenuItem[] => [
  { label: 'Me', icon: <SocialAvatar name="Sam Rivera" size={16} />, onSelect: () => go('sam') },
  { label: 'Claire', icon: <Mark agent="claire" />, hint: 'Approves', onSelect: () => go('claire') },
  ...TEAMMATES.map(k => ({ label: ROSTER[k].short, icon: <SocialAvatar name={ROSTER[k].name} size={16} />, hint: ROSTER[k].role.split(' · ')[0], onSelect: () => go(k) })),
  'sep',
  { label: 'Nobody', onSelect: () => go(undefined) },
]
/** Existing labels, then a field to name a new one: no browser prompt. A popover, since a menu can't hold a text field. */
function LabelMenu({ trigger, labels, onPick }: { trigger: ReactNode; labels: string[]; onPick: (l: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const pick = (l: string) => { onPick(l); setOpen(false); setName('') }
  return (
    <Pop align="start" open={open} onOpenChange={setOpen} trigger={trigger}>
      {labels.map(l => <button key={l} type="button" className="menu-item" onClick={() => pick(l)}><Tag size={14} />{l}</button>)}
      {labels.length > 0 && <div className="menu-sep" />}
      <form className="row tight nowrap" onSubmit={e => { e.preventDefault(); if (name.trim()) pick(name.trim()) }}>
        <input className="input grow" value={name} onChange={e => setName(e.target.value)} placeholder="New label" aria-label="New label" autoFocus={!labels.length} />
        <Btn size="sm" type="submit" disabled={!name.trim()}>Add</Btn>
      </form>
    </Pop>
  )
}

type PanelTab = 'conversation' | 'contact'

function ConversationPanel({ c, labels, onClose, onSaveReply, onPost }: { c: Conversation; labels: string[]; onClose: () => void; onSaveReply: (text: string) => void; onPost: (post: string) => void }) {
  const { s, d } = useStore()
  const now = useNow(10000)
  const [tab, setTab] = useState<PanelTab>('conversation')
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [dmText, setDmText] = useState('')
  const [mode, setMode] = useState<'reply' | 'note'>('reply')
  const [reply, setReply] = useState('')
  const [picked, setPicked] = useState<string>()
  const savedFrom = s.inbox.saved.find(r => r.id === c.savedFrom)
  const others = s.inbox.convs.filter(x => x.contact && x.contact === c.contact && x.id !== c.id)
  const card = c.handoff ? s.handoffs.find(h => h.id === c.handoff) : undefined
  const draftPlain = (c.draft ?? []).map(x => (typeof x === 'string' ? x : x.text)).join('')
  const one = (op: BulkOp) => d({ type: 'inbox/bulk', ids: [c.id], ...op })
  const modOne = (op: ModOp) => d({ type: 'inbox/moderate', ids: [c.id], op })
  const nav = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const banned = !!s.inbox.banned?.includes(c.author)

  const loc = useLocation()
  const wantsEdit = !!(loc.state as { edit?: boolean } | null)?.edit
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setEditing(wantsEdit && !!c.draft?.length); setText(draftPlain); setDmText(c.dm ?? ''); setReply(''); setPicked(undefined); setTab('conversation'); setNoting(false)
    if (c.unread && s.inbox.convs.some(x => x.id === c.id)) d({ type: 'inbox/read', id: c.id })
  }, [c.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // While Nova's draft waits on a decision, the note field folds to one button so it never covers Send.
  const pending = c.status === 'draft' || (c.status === 'escalated' && !!c.draft)
  const [noting, setNoting] = useState(false)
  // Open on the latest message, like any conversation, and follow it when a message or a draft arrives:
  // the draft and its Send sit right under it. The docked panel is as tall as the window, so its foot is brought into view too.
  useEffect(() => {
    const toFoot = () => {
      if (!body.current) return
      body.current.scrollTop = body.current.scrollHeight
      const panel = body.current.closest('.ib-panel')
      if (panel && panel.getBoundingClientRect().bottom > window.innerHeight) panel.scrollIntoView({ block: 'end' })
    }
    // Once now, once after the panel's slide-in (on a fresh load the layout settles only then).
    const f = requestAnimationFrame(toFoot)
    const t = setTimeout(toFoot, 300)
    return () => { cancelAnimationFrame(f); clearTimeout(t) }
  }, [c.id, pending, c.messages.length, tab])

  const canReply = ['you', 'takeover', 'auto', 'escalated'].includes(c.status) && !(c.status === 'escalated' && c.draft)
  // Messages and internal notes, in time order.
  const thread = [...c.messages.map(m => ({ kind: 'msg' as const, at: m.at, m })), ...(c.notes ?? []).map(n => ({ kind: 'note' as const, at: n.at, n }))].sort((a, b) => a.at - b.at)
  const submit = () => {
    if (!reply.trim()) return
    d(mode === 'note' ? { type: 'inbox/note', id: c.id, text: reply } : { type: 'inbox/send', id: c.id, text: reply.trim(), saved: picked })
    setReply('')
    setPicked(undefined)
  }

  return (
    <aside className="ib-panel card" aria-label={`Conversation with ${c.author}`}>
      <header className="ib-panel-head">
        <SocialAvatar name={c.author} network={c.network} size={40} />
        <div className="ib-panel-title">
          <h2 className="ellipsis">{c.author}</h2>
          <div className="row tight"><TypeTag t={c.type} /><SentimentTag s={c.sentiment} /><span className="faint">on {NETWORK_LABEL[c.network]}{c.account && c.account !== c.network ? ` · ${accountById(c.account).name}` : ''} · {ago(c.at, now)}</span></div>
        </div>
        <Pill tone={statusOf(c).tone}>{statusOf(c).label}</Pill>
        <Btn variant="ghost" icon size="sm" aria-label="Close the conversation" title="Close (Esc)" onClick={onClose}><X size={16} /></Btn>
      </header>

      <div className="ib-panel-tools">
        <Menu align="start" trigger={<Btn size="sm" variant="ghost">{c.assignee ? <><AssigneeFace who={c.assignee} size={16} />{ROSTER[c.assignee].short}</> : <><UserRound size={14} />Assign</>}<ChevronDown size={12} /></Btn>}
          items={assignItems(v => one({ op: 'assign', value: v }))} />
        <Menu align="start" trigger={<Btn size="sm" variant="ghost">{SENT[c.sentiment]}<ChevronDown size={12} /></Btn>}
          items={(Object.keys(SENT) as Sentiment[]).map(x => ({ label: SENT[x], onSelect: () => one({ op: 'sentiment', value: x }) }))} />
        <Btn size="sm" variant="ghost" onClick={() => one({ op: 'reviewed', value: !c.reviewed })}><CheckCheck size={14} />{c.reviewed ? 'Mark not reviewed' : 'Mark reviewed'}</Btn>
        <Btn size="sm" variant="ghost" aria-pressed={!!c.liked} onClick={() => modOne(c.liked ? 'unlike' : 'like')}><Heart size={14} fill={c.liked ? 'currentColor' : 'none'} />{c.liked ? 'Liked' : 'Like'}</Btn>
        <Menu align="start" trigger={<Btn size="sm" variant="ghost">Moderate<ChevronDown size={12} /></Btn>} items={[
          ...(c.type !== 'dm' && c.type !== 'review' ? [{ label: 'Reply in private', hint: 'Nova drafts the DM', icon: <Mail size={14} />, onSelect: () => { d({ type: 'inbox/private', id: c.id }); nav(`/inbox/${c.id}-dm`) } }] : []),
          ...(canModerate(c) ? [
            { label: 'Report as spam', hint: 'Hides it, Nova learns', icon: <OctagonAlert size={14} />, onSelect: () => modOne('spam') },
            { label: banned ? `Unban ${c.author}` : `Ban ${c.author}`, hint: banned ? undefined : 'Hides all, now and later', icon: <Ban size={14} />, onSelect: () => modOne(banned ? 'unban' : 'ban') },
            ...(!c.removed ? [{ label: 'Delete…', hint: 'Can’t be undone', icon: <Trash2 size={14} />, onSelect: () => setDeleting(true) }] : []),
          ] : [{ label: 'Reviews can’t be hidden, reported or deleted', disabled: true, onSelect: () => {} }]),
        ]} />
        {(c.labels ?? []).map(l => (
          <span key={l} className="ib-label">{l}<button aria-label={`Remove the label ${l}`} onClick={() => one({ op: 'unlabel', value: l })}><X size={12} /></button></span>
        ))}
        <LabelMenu trigger={<Btn size="xs" variant="ghost" aria-label="Add a label"><Plus size={12} />Label</Btn>} labels={labels.filter(l => !c.labels?.includes(l))} onPick={l => one({ op: 'label', value: l })} />
      </div>

      {(c.suggested ?? []).map(id => s.inbox.rules.find(r => r.id === id && r.on)).filter(r => !!r).map(r => (
        <div key={r.id} className="ib-suggest" role="status">
          <Sparkles size={14} aria-hidden /><span className="grow"><b>Nova suggests: {thenText(r.then)}</b><span className="faint"> · rule: {whenText(r)}</span></span>
          <Btn size="xs" onClick={() => d({ type: 'inbox/ruleApply', id: c.id, rule: r.id })}>Apply</Btn>
          <Btn size="xs" variant="ghost" onClick={() => d({ type: 'inbox/ruleDismiss', id: c.id, rule: r.id })}>Dismiss</Btn>
        </div>
      ))}
      {deleting && (
        <InlineConfirm danger confirm="Delete" onCancel={() => setDeleting(false)} onConfirm={() => { modOne('delete'); setDeleting(false) }}>{deleteWarning(c)}</InlineConfirm>
      )}
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'conversation', label: 'Conversation', count: c.messages.length },
        { value: 'contact', label: 'Contact' },
      ]} />

      {tab === 'contact' ? <ContactTab c={c} others={others} /> : (
        <div className="ib-panel-body" ref={body}>
          <div className="ib-thread">
            {c.post && <div className="ib-post"><span className="faint">On</span> <button className="link-btn" onClick={() => onPost(postKey(c)!)} title="See every comment on this post">{c.post}</button></div>}
            {c.stars && <div className="ib-stars" aria-label={`${c.stars} out of 5 stars`}>{'★'.repeat(c.stars)}<span>{'★'.repeat(5 - c.stars)}</span></div>}
            {thread.map(x => x.kind === 'note' ? (
              <div key={x.n.id} className="ib-msg ib-note-msg">
                {x.n.by === 'claire' ? <Mark agent="claire" /> : <SocialAvatar name="Sam Rivera" size={24} />}
                <div className="bubble">
                  <div className="meta"><b><StickyNote size={12} aria-hidden /> {x.n.by === 'claire' ? 'Claire' : 'You'} · internal note</b><span className="mono faint">{hhmm(x.n.at)}</span></div>
                  <p>{x.n.text}</p>
                </div>
              </div>
            ) : (
              <div key={x.m.id} className={`ib-msg ${x.m.from} ${x.m.undone ? 'undone' : ''}`}>
                {x.m.from === 'nova' ? <Mark agent="nova" /> : x.m.from === 'you' ? <SocialAvatar name={ROSTER[x.m.by ?? 'sam'].name} size={24} /> : <SocialAvatar name={c.author} network={c.network} size={24} />}
                <div className="bubble">
                  <div className="meta">
                    <b>{x.m.from === 'them' ? c.author : x.m.from === 'you' ? (x.m.by && x.m.by !== 'sam' ? ROSTER[x.m.by].name : 'You') : x.m.auto ? 'Nova · auto' : 'Nova · approved by you'}</b>
                    <span className="mono faint">{hhmm(x.m.at)}</span>
                  </div>
                  <p>{x.m.from === 'them' && c.trigger ? <Trigger text={x.m.text} words={c.trigger} /> : x.m.text}</p>
                  <English text={x.m.text} from={x.m.from === 'them'} />
                  {x.m.undone && <span className="faint ib-meta">Deleted by you</span>}
                  {x.m.from !== 'them' && !x.m.undone && <button className="link-btn t-xs" onClick={() => onSaveReply(toTemplate(x.m.text, c))}>Save as reply</button>}
                  {x.m.auto && x.m.undoUntil && x.m.undoUntil > now && !x.m.undone && (
                    <Btn size="xs" variant="ghost" onClick={() => d({ type: 'inbox/undoAuto', id: c.id, msg: x.m.id })}><Undo2 size={12} />Undo · {left(x.m.undoUntil, now)}</Btn>
                  )}
                </div>
              </div>
            ))}
            {c.note && <p className="ib-note faint">{c.note}{PUBLIC.includes(c.type) && s.inbox.convs.some(x => x.id === dmId(c.id)) && <> · <Link className="link-btn" to={`/inbox/${dmId(c.id)}`}>Open the DM</Link></>}</p>}
            {card?.claire?.reply && (
              <div className="ib-claire"><Mark agent="claire" /><div><b>Claire {card.claire.verdict === 'changes' ? 'asked for changes' : 'declined'}</b><p>“{card.claire.reply}”</p></div></div>
            )}
          </div>

          {(c.status === 'draft' || (c.status === 'escalated' && c.draft)) && (
            <div className="ib-draft">
              <div className="row tight ib-draft-by">
                <Mark agent="nova" />{c.status === 'escalated' ? 'Nova never answers this topic. Suggested holding reply:' : 'Nova’s draft'}
                {card && <Link to={`/?card=${card.id}`} className="link-btn t-xs push-end">Review on Desk</Link>}
              </div>
              {c.status === 'escalated' && <WhyEscalated c={c} fan={fanOf(s, c)} />}
              {c.product && <ProductFound d={c.product} />}
              {c.dm && <div className="ib-half">In public</div>}
              {editing ? <textarea className="textarea" rows={c.dm ? 2 : 4} value={text} onChange={e => setText(e.target.value)} aria-label={c.dm ? 'Edit the public reply' : 'Edit Nova’s draft'} autoFocus />
                : <p className="ib-draft-text"><FlagText parts={c.draft ?? []} /></p>}
              {!editing && <English text={draftPlain} />}
              {c.dm && <>
                <div className="ib-half">Then by DM</div>
                {editing ? <textarea className="textarea" rows={3} value={dmText} onChange={e => setDmText(e.target.value)} aria-label="Edit the DM" />
                  : <p className="ib-draft-text">{c.dm}</p>}
              </>}
              {!!c.attachments?.length && (
                <ul className="ib-attach">
                  {c.attachments.map(a => (
                    <li key={a.id} className={a.removed ? 'removed' : ''}>
                      {a.kind === 'exchange' ? <ShoppingBag size={14} /> : <Paperclip size={14} />}
                      <span>{a.label}</span><span className="faint">· {a.limit}</span>
                      <button className="link-btn" onClick={() => d({ type: 'inbox/attach', id: c.id, att: a.id })} aria-label={a.removed ? `Add back ${a.label}` : `Remove ${a.label}`}>{a.removed ? 'Add back' : <X size={14} />}</button>
                    </li>
                  ))}
                </ul>
              )}
              {savedFrom && <div className="row tight"><span className="faint t-xs">Saved reply:</span><span className="chip">{savedFrom.name} · adapted by Nova</span></div>}
              {!!c.rules?.length && <div className="row tight"><span className="faint t-xs">Playbook:</span>{c.rules.map(r => <span key={r} className="chip">{r}</span>)}</div>}
              <div className="row">
                {editing ? (
                  <>
                    <Btn variant="primary" onClick={() => { d({ type: 'inbox/approve', id: c.id, text, dm: c.dm ? dmText : undefined }); setEditing(false) }}><Send size={14} />Send edited reply</Btn>
                    <Btn variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
                  </>
                ) : (
                  <>
                    <Btn variant="primary" onClick={() => one({ op: 'approve' })}><Send size={14} />{c.status === 'escalated' ? 'Send holding reply' : 'Send'}</Btn>
                    <Btn onClick={() => { setText(draftPlain); setDmText(c.dm ?? ''); setEditing(true) }}>Edit</Btn>
                  </>
                )}
                <Btn variant="ghost" onClick={() => d({ type: 'inbox/takeover', id: c.id })}><Hand size={14} />Take over</Btn>
                <Btn variant="ghost" onClick={() => d({ type: 'inbox/claire', id: c.id })}><UserRound size={14} />Ask Claire</Btn>
                <Btn variant="ghost" onClick={() => d({ type: 'inbox/hide', id: c.id, hidden: true })}><EyeOff size={14} />Hide</Btn>
              </div>
            </div>
          )}

          {c.status === 'hidden' && (
            <div className="ib-draft row"><span className="muted grow">Hidden from your public page. Nobody else sees it.</span><Btn onClick={() => d({ type: 'inbox/hide', id: c.id, hidden: false })}>Unhide</Btn></div>
          )}
          {c.status === 'claire' && (c.trigger || !card?.claire?.reply) && (
            <div className="ib-draft">
              {c.trigger && <>
                <WhyEscalated c={c} fan={fanOf(s, c)} />
                {c.dm && <div className="ib-half">In public</div>}
                {!!c.draft?.length && <p className="ib-draft-text"><FlagText parts={c.draft} /></p>}
                {c.dm && <><div className="ib-half">Then by DM</div><p className="ib-draft-text">{c.dm}</p></>}
              </>}
              <span className="muted">{card?.claire?.reply ? 'Claire answered: send it from the Desk.' : 'Waiting on Claire. She usually replies in about a minute.'}</span>
              {card?.claire?.reply && <Link to={`/?card=${card.id}`} className="link-btn t-xs">Review on Desk</Link>}
            </div>
          )}

          {pending && !noting && !reply ? (
            <div className="ib-reply ib-reply-folded">
              <Btn size="sm" variant="ghost" onClick={() => { setMode('note'); setNoting(true) }}><StickyNote size={14} />Note for the team</Btn>
            </div>
          ) : (
          <form className={`ib-reply ${mode === 'note' ? 'ib-noting' : ''}`} onSubmit={e => { e.preventDefault(); submit() }}>
            <div className="row tight">
              {canReply && <button type="button" className={`ib-mode ${mode === 'reply' ? 'on' : ''}`} onClick={() => setMode('reply')} aria-pressed={mode === 'reply'}><Send size={14} />Reply</button>}
              <button type="button" className={`ib-mode ${mode === 'note' || !canReply ? 'on' : ''}`} onClick={() => setMode('note')} aria-pressed={mode === 'note' || !canReply}><StickyNote size={14} />Note for the team</button>
            </div>
            <label htmlFor="ib-reply" className="sr-only">{mode === 'note' || !canReply ? 'Internal note' : `Reply to ${c.author}`}</label>
            <textarea id="ib-reply" className="textarea" rows={2} autoFocus={noting}
              placeholder={mode === 'note' || !canReply ? 'Note for the team — Claire sees it, the customer doesn’t' : `Reply to ${c.author} as Fernway…`}
              value={reply} onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (!canReply) setMode('note'); submit() } }} />
            <div className="row">
              {canReply && mode === 'reply' && (
                <Menu align="start" trigger={<Btn size="sm" variant="ghost"><MessageSquareText size={14} />Saved replies<ChevronDown size={12} /></Btn>}
                  items={s.inbox.saved.map(r => ({ label: r.name, hint: <span className="num faint">{r.uses}</span>, onSelect: () => { setReply(fill(r, c)); setPicked(r.id) } }))} />
              )}
              <span className="faint t-xs">{mode === 'note' || !canReply ? 'Only your team sees notes.' : c.status === 'takeover' ? 'Nova won’t reply in this conversation.' : c.status === 'auto' ? 'Nova answered. You can add to it.' : ''}</span>
              <span className="spacer" />
              {/* A note is never the panel's main action: only a reply to the customer is orange. */}
              <Btn variant={mode === 'note' || !canReply ? undefined : 'primary'} size="sm" type="submit" disabled={!reply.trim()} onClick={() => { if (!canReply) setMode('note') }}>
                {mode === 'note' || !canReply ? <><StickyNote size={14} />Add note</> : <><Send size={14} />Send</>}
              </Btn>
            </div>
          </form>
          )}
        </div>
      )}
    </aside>
  )
}

function ContactTab({ c, others }: { c: Conversation; others: Conversation[] }) {
  const contact = CONTACTS.find(k => k.id === c.contact)
  if (!contact) return (
    <div className="ib-panel-body ib-contact">
      <div className="row nowrap"><SocialAvatar name={c.author} network={c.network} size={40} /><div><h3>{c.author}</h3><div className="faint">{NETWORK_LABEL[c.network]}</div></div></div>
      <Empty icon={<InboxIcon size={18} />} title="No customer record" body="Nova matches profiles by handle and order email. Nothing matched this person yet." />
    </div>
  )
  return (
    <div className="ib-panel-body ib-contact">
      <div className="row nowrap"><SocialAvatar name={contact.name} network={contact.handles[0]?.network} size={40} /><div><h3>{contact.name}</h3><div className="faint">{contact.location}</div></div></div>
      <ul className="ib-handles">{contact.handles.map(h => <li key={h.handle + h.network}><Net n={h.network} />{h.handle}</li>)}</ul>
      <dl className="ib-facts">
        {contact.followers && <div><dt>Followers</dt><dd className="num">{contact.followers}</dd></div>}
        <div><dt>Customer since</dt><dd>{contact.since ?? 'Not a customer'}</dd></div>
        <div><dt>Lifetime value</dt><dd className="num">€{contact.orders.reduce((a, o) => a + o.total, 0)}</dd></div>
        <div><dt>Orders</dt><dd className="num">{contact.orders.length}</dd></div>
      </dl>
      {!!contact.tags.length && <div className="row tight">{contact.tags.map(t => <Pill key={t} tone={t === 'At risk' ? 'caution' : t === 'VIP' || t === 'Creator' ? 'signal' : undefined}>{t}</Pill>)}</div>}
      <div>
        <div className="section-title">Orders <span className="faint">· Shopify</span></div>
        {contact.orders.length ? (
          <ul className="ib-orders">
            {contact.orders.map(o => (
              <li key={o.id}>
                <div className="row nowrap"><b className="mono">{o.id}</b><span className="faint">{o.date}</span><span className="spacer" /><b className="num">€{o.total}</b></div>
                <div className="row nowrap"><span className="muted ellipsis grow">{o.items}</span><Pill tone={o.status === 'Late' ? 'alert' : o.status === 'Returned' || o.status === 'Processing' ? 'caution' : o.status === 'Delivered' ? 'ok' : undefined}>{o.status}</Pill></div>
              </li>
            ))}
          </ul>
        ) : <p className="faint">No orders yet.</p>}
      </div>
      {contact.notes && <div><div className="section-title">About</div><p className="muted">{contact.notes}</p></div>}
      {!!others.length && (
        <div>
          <div className="section-title">Other conversations</div>
          <ul className="rows">{others.map(o => <li className="py-6" key={o.id}><Link to={`/inbox/${o.id}`} className="row nowrap tight"><Net n={o.network} /><span className="ellipsis">{o.messages[0]?.text}</span></Link></li>)}</ul>
        </div>
      )}
    </div>
  )
}

/** The words that made Nova escalate, marked in the customer's message. */
function Trigger({ text, words }: { text: string; words: string }) {
  const i = text.toLowerCase().indexOf(words.toLowerCase())
  if (i < 0) return <>{text}</>
  return <>{text.slice(0, i)}<mark className="ib-trigger">{text.slice(i, i + words.length)}</mark>{text.slice(i + words.length)}</>
}

/** Why Nova escalated: the rule, what matched and where, who the fan is, what she won't do. */
function WhyEscalated({ c, fan }: { c: Conversation; fan?: string }) {
  const rule = c.rules?.[0]
  const open = PUBLIC.includes(c.type)
  return (
    <ul className="ib-why" aria-label="Why Nova escalated">
      {rule && <li><b>Rule</b><span>{rule}</span></li>}
      {c.trigger && <li><b>Why</b><span>“{c.trigger}” in {open ? `a public ${c.type}` : c.type === 'dm' ? 'a DM' : `a ${c.type}`}</span></li>}
      {fan && <li><b>Who</b><span>{fan}</span></li>}
      {open && <li><b>Never</b><span>Refunds or liability in public. The answer goes by DM.</span></li>}
    </ul>
  )
}

/** What Nova found for "which one is it?": the product, the runner-up she ruled out, the tracked link, the campaign offer. */
function ProductFound({ d }: { d: NonNullable<Conversation['product']> }) {
  return (
    <ul className="ib-why" aria-label="The product Nova found">
      <li><b>Product</b><span>{d.name} · €{d.price} · {d.match}% match</span></li>
      {d.other && <li><b>Not</b><span>{d.other.name}: {d.other.why}</span></li>}
      <li><b>Link</b><span>{d.link} · tracked as utm_campaign={d.utm}</span></li>
      {d.offer && <li><b>Offer</b><span>{d.offer}</span></li>}
    </ul>
  )
}
