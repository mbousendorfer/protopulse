import { useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, CalendarX, ChevronDown, ChevronLeft, ChevronRight, FileText, ImageOff, Lightbulb, Plus, Sparkles, StickyNote, Upload, X } from 'lucide-react'
import type { Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { DAY, T, hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { BEST_SLOT, PUBLISH_NETWORKS, type Media, type Post, type PostStatus } from '../../data/publishing'
import { Btn, Empty, Filters, Mark, Menu, Net, PageHead, Pill, Pop, Seg, Sheet, Tabs } from '../../ui'
import { SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { PostPreview, PostsBulk, useOpenPost } from './Bulk'
import Photo from '../../ui/Photo'
import Composer from './Composer'
import PlanReview from './Plan'
import Ideas from './Ideas'
import Queues from './QueuesTab'
import { isOpen, recommendNetwork } from './ideasModel'
import { targetsOf, themesOf } from '../strategy/slice'
import { uid } from '../../app/core'
import { libraryOf, pickVisual, readImage, visualCardOf, waitingForVisual } from './visuals'
import { NO_LABEL, STATUS_LABEL, activeCount, knownLabels, passes, type CalFilters, type Facet } from './labels'
import { QUIET_WORDS, isQuiet, notesOn } from './notes'
import { expiring, search } from './media'
import { ACCOUNTS, accountById, accountLabel } from './accounts'
import { CountBadge } from '../../ui/Feedback'
import './publishing.css'

type Tab = 'ideas' | 'calendar' | 'plan' | 'drafts' | 'queues' | 'media'
const STATUS: Record<PostStatus, { label: string; tone?: 'alert' | 'caution' | 'ok' | 'signal' }> = {
  scheduled: { label: 'Scheduled' }, published: { label: 'Published', tone: 'ok' }, draft: { label: 'Draft' }, needs: { label: 'Needs you', tone: 'caution' }, failed: { label: 'Failed', tone: 'alert' }, paused: { label: 'Paused', tone: 'caution' }, unapproved: { label: 'To approve' },
}
const MONDAY_THIS_WEEK = T(0, 0, -1)
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`)

export default function PublishingPage() {
  const { s } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const rest = (useParams()['*'] ?? '').split('/')
  // /publishing lands on Ideas; the composer (new, post/:id) opens over the calendar.
  const tab: Tab = !rest[0] ? 'ideas' : rest[0] === 'ideas' || rest[0] === 'plan' || rest[0] === 'drafts' || rest[0] === 'queues' || rest[0] === 'media' ? rest[0] : 'calendar'
  const editId = rest[0] === 'post' ? rest[1] : undefined
  const creating = rest[0] === 'new'
  const query = new URLSearchParams(loc.search)
  const editPost = s.publishing.posts.find(p => p.id === editId)
  const back = `/publishing/${tab}`
  const planPending = s.publishing.plan.status === 'proposed'
  const drafts = s.publishing.posts.filter(p => p.status === 'draft').length
  // The badge means "needs you": ideas ready to review, not every idea.
  const readyIdeas = s.publishing.ideas.filter(i => isOpen(i) && i.status === 'ready').length
  const failed = s.publishing.posts.filter(p => p.status === 'failed').length

  return (
    <div className="page pub-page">
      <PageHead agent="atlas" title="Publishing" lede="Atlas plans the week, writes the posts and picks the slots. You approve the plan, not each post.">
        <Btn variant="primary" onClick={() => nav('/publishing/new')}><Plus size={14} />New post</Btn>
      </PageHead>
      <Tabs value={tab} onChange={t => nav(t === 'ideas' ? '/publishing' : `/publishing/${t}`)} items={[
        { value: 'ideas', label: <>Ideas{readyIdeas > 0 && <CountBadge n={readyIdeas} needs label={`${readyIdeas} ready to review`} />}</> },
        { value: 'calendar', label: <>Calendar{failed > 0 && <CountBadge n={failed} needs label={`${failed} failed post${failed > 1 ? 's' : ''}`} />}</> },
        { value: 'plan', label: <>Plan review{planPending && <span className="dot pub-tab-dot" aria-label="waiting for you" />}</> },
        { value: 'drafts', label: 'Drafts', count: drafts },
        { value: 'queues', label: 'Queues' },
        { value: 'media', label: 'Media', count: libraryOf(s).length },
      ]} />
      {tab === 'ideas' && <Ideas id={rest[1]} />}
      {tab === 'calendar' && <Calendar />}
      {tab === 'plan' && <PlanReview />}
      {tab === 'drafts' && <Drafts />}
      {tab === 'queues' && <Queues />}
      {tab === 'media' && <MediaLibrary />}
      <PostPreview />

      {(creating || editId) && (
        editId && !editPost ? (
          <Sheet open onOpenChange={() => nav(back)} title="Post not found"><Empty title="This post no longer exists" body="It may have been deleted or merged." action={<Btn onClick={() => nav('/publishing/calendar')}>Back to the calendar</Btn>} /></Sheet>
        ) : (
          <Composer key={editId ?? `new${loc.search}`} open post={editPost} onClose={() => nav(editId || back !== '/publishing/plan' ? '/publishing/calendar' : back)}
            initial={{ media: query.get('media') ?? undefined, text: query.get('text') ?? undefined, network: (query.get('network') as Network) ?? undefined, at: query.get('at') ? +query.get('at')! : undefined }} />
        )
      )}
    </div>
  )
}

/* ---------- Calendar ---------- */
function Calendar() {
  const { s, d } = useStore()
  const now = useNow(30000)
  const [view, setView] = useState<'week' | 'month' | 'list'>('week')
  const open = useOpenPost()
  const [anchor, setAnchor] = useState(MONDAY_THIS_WEEK)
  const [network, setNetwork] = useState<Network | 'all'>('all')
  const [filters, setFilters] = useState<CalFilters>({})
  const [over, setOver] = useState<number | null>(null)
  const posts = s.publishing.posts.filter(p => (network === 'all' || p.network === network) && passes(p, filters)).sort((a, b) => a.at - b.at)
  const todayStart = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime()

  const days = view === 'month' ? 35 : 7
  const start = view !== 'month' ? anchor : (() => { const f = new Date(anchor); const first = new Date(f.getFullYear(), f.getMonth(), 1); const dow = (first.getDay() + 6) % 7; return first.getTime() - dow * DAY })()
  const cells = Array.from({ length: days }, (_, i) => start + i * DAY)
  const inDay = (t: number) => posts.filter(p => p.at >= t && p.at < t + DAY)
  const label = view !== 'month'
    ? `${new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(start + 6 * DAY).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : new Date(anchor).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const shift = (dir: number) => setAnchor(a => (view !== 'month' ? a + dir * 7 * DAY : new Date(new Date(a).getFullYear(), new Date(a).getMonth() + dir, 1).getTime()))

  /** For a future day with fewer than 2 posts: the network Atlas recommends (cadence first, then the pillar behind target). */
  const recommend = (day: number): Network | null => (view !== 'week' || isQuiet(s.publishing.notes ?? [], day) ? null : recommendNetwork(s.publishing.posts, day, now, targetsOf(s)))
  const gapIdea = (day: number) => s.publishing.ideas.find(i => isOpen(i) && i.origin === 'gap' && i.key.startsWith(`gap-${Math.round((day - T(0, 0, 0)) / DAY)}-`))

  const visible = posts.filter(p => p.at >= start && p.at < start + days * DAY)
  const ids = useMemo(() => visible.map(p => p.id), [visible.map(p => p.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(ids, `${view}-${start}-${network}-${JSON.stringify(filters)}`)

  const drop = (e: DragEvent, day: number) => {
    e.preventDefault(); setOver(null)
    const id = e.dataTransfer.getData('text/post')
    const p = s.publishing.posts.find(x => x.id === id)
    if (!p) return
    const t = new Date(p.at)
    const at = day + (t.getHours() * 60 + t.getMinutes()) * 60_000
    // Dropped on today at an hour already gone: take the next half hour instead of refusing.
    const HALF = 30 * 60_000
    d({ type: 'publishing/move', id, at: at < now ? Math.ceil(now / HALF) * HALF : at })
  }

  return (
    <div className="cal">
      <div className="cal-bar">
        <div className="row tight">
          <Btn size="sm" icon aria-label={view === 'week' ? 'Previous week' : 'Previous month'} onClick={() => shift(-1)}><ChevronLeft size={16} /></Btn>
          <Btn size="sm" onClick={() => setAnchor(MONDAY_THIS_WEEK)}>Today</Btn>
          <Btn size="sm" icon aria-label={view === 'week' ? 'Next week' : 'Next month'} onClick={() => shift(1)}><ChevronRight size={16} /></Btn>
          <h2 className="cal-title">{label}</h2>
        </div>
        <div className="row">
          <Menu trigger={<button className="select-btn">{network === 'all' ? 'All networks' : NETWORK_LABEL[network]}<ChevronDown size={14} /></button>}
            items={[{ label: 'All networks', onSelect: () => setNetwork('all') }, ...PUBLISH_NETWORKS.map(n => ({ label: NETWORK_LABEL[n], icon: <Net n={n} />, onSelect: () => setNetwork(n) }))]} />
          <CalendarFilters value={filters} onChange={setFilters} />
          {view === 'week' && <span className="row tight faint pub-selall"><SelectAll sel={sel} label="Select every post shown" />Select all</span>}
          <Seg name="calview" label="Calendar view" size="sm" value={view} onChange={setView} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'list', label: 'List' }]} />
        </div>
      </div>

      <PostsBulk sel={sel} posts={visible} />
      {view === 'week' ? (
        <div className="cal-week">
          {cells.map(day => {
            const items = inDay(day)
            const rec = recommend(day)
            const past = day + DAY <= now
            return (
              <section key={day} className={`cal-day ${day === todayStart ? 'today' : ''} ${past ? 'past' : ''} ${over === day ? 'over' : ''}`} aria-label={new Date(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                onDragOver={e => { if (!past) { e.preventDefault(); setOver(day) } }} onDragLeave={() => setOver(o => (o === day ? null : o))} onDrop={e => drop(e, day)}>
                <DayNotes day={day} past={past} head={
                  <h3><span>{new Date(day).toLocaleDateString('en-GB', { weekday: 'short' })}</span> <b className="num">{new Date(day).getDate()}</b>{day === todayStart && <span className="sr-only">, today</span>}{items.length > 0 && <span className="cal-day-n">{items.length} post{items.length > 1 ? 's' : ''}</span>}</h3>
                }>
                  <Themes day={day} />
                </DayNotes>
                {items.map(p => <PostChip key={p.id} p={p} onOpen={() => open(p.id)} checked={sel.has(p.id)} anySelected={sel.count > 0} onToggle={shift => sel.toggle(p.id, shift)} />)}
                {(() => {
                  const idea = view === 'week' ? gapIdea(day) : undefined
                  if (idea) return (
                    <Link className="cal-rec" to={`/publishing/ideas/${idea.id}`}>
                      <span className="row tight"><Net n={idea.networks[0]} /><span className="mono">{idea.drafts ? hhmm(idea.drafts[0].at) : BEST_SLOT[idea.networks[0]].time}</span><span className="faint">Idea from Atlas</span></span>
                      <span className="cal-rec-text">{idea.copy[idea.networks[0]]}</span>
                      <span className="row tight"><Lightbulb size={12} />Review the idea</span>
                    </Link>
                  )
                  if (!rec || s.handoffs.some(h => h.topic === 'Empty slot' && h.preview?.type === 'post' && h.preview.network === rec)) return null
                  return (
                    <button className="cal-rec" onClick={() => d({ type: 'publishing/askFill', day: Math.round((day - T(0, 0, 0)) / DAY), network: rec })}>
                      <span className="row tight"><Net n={rec} /><span className="mono">{BEST_SLOT[rec].time}</span><span className="faint">Recommended</span></span>
                      <span className="row tight"><Sparkles size={12} />Ask Atlas for an idea</span>
                    </button>
                  )
                })()}
                {!items.length && !rec && <div className="cal-empty">{past ? 'Nothing posted' : 'Nothing planned'}</div>}
              </section>
            )
          })}
        </div>
      ) : (
        view === 'month' ? (
        <div className="cal-month">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => <div key={x} className="cal-dow faint">{x}</div>)}
          {cells.map(day => {
            const items = inDay(day)
            const other = new Date(day).getMonth() !== new Date(anchor).getMonth()
            return (
              <div key={day} className={`cal-cell ${other ? 'other' : ''} ${day === todayStart ? 'today' : ''}`}>
                <button className="pub-cell-day num" onClick={() => { const dow = (new Date(day).getDay() + 6) % 7; setAnchor(day - dow * DAY); setView('week') }}
                  aria-label={`Open the week of ${new Date(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}, ${items.length} posts`}>{new Date(day).getDate()}</button>
                <Themes day={day} compact />
                {items.slice(0, 3).map(p => {
                  const flag = p.status === 'needs' || p.status === 'failed' ? STATUS[p.status] : undefined
                  return (
                    <button key={p.id} className={`cal-mini ${p.status}`} onClick={() => open(p.id)} aria-label={`Preview${flag ? `, ${flag.label.toLowerCase()}` : ''}: ${p.text}`} title={flag?.label}>
                      <Net n={p.network} /><span className="mono">{hhmm(p.at)}</span><span className="cal-mini-text">{p.text}</span>{flag && <span className={`dot ${flag.tone}`} aria-hidden />}
                    </button>
                  )
                })}
                {items.length > 3 && <button className="link-btn cal-more" onClick={() => { const dow = (new Date(day).getDay() + 6) % 7; setAnchor(day - dow * DAY); setView('week') }}>{items.length - 3} more</button>}
              </div>
            )
          })}
        </div>
        ) : <PostTable posts={visible} sel={sel} onOpen={open} />
      )}
      {view === 'week' && <p className="cal-hint">Drag a post to another day to move it. Atlas tells you if the new slot is worse.</p>}
    </div>
  )
}

/** Sage's moments on this day (Strategy › Moments ahead), read through her `themesOf`. */
function Themes({ day, compact }: { day: number; compact?: boolean }) {
  const { s } = useStore()
  const on = themesOf(s).filter(m => m.start < day + DAY && m.end >= day)
  return <>{on.map(m => (
    <Link key={m.id} to="/strategy" className={`cal-theme ${compact ? 'compact' : ''}`} title={m.why}><Mark agent="sage" />{compact ? m.name : <>{m.name} <span className="faint">· Sage</span></>}</Link>
  ))}</>
}

/** A day's header and its notes (what's on, or a quiet day Atlas keeps empty). "Add a note" sits in the header, so it never pushes the posts down. */
function DayNotes({ day, past, head, children }: { day: number; past: boolean; head: ReactNode; children?: ReactNode }) {
  const { s, d } = useStore()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [quiet, setQuiet] = useState(false)
  const notes = notesOn(s.publishing.notes ?? [], day)
  const add = () => { d({ type: 'publishing/noteAdd', day, text, quiet }); setText(''); setQuiet(false); setOpen(false) }
  const label = new Date(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <>
      <div className="cal-day-h">
        {head}
        {!past && !open && <Btn size="xs" variant="ghost" icon className="cal-addnote" aria-label={`Add a note to ${label}`} title="Add a note" onClick={() => setOpen(true)}><StickyNote size={12} /></Btn>}
      </div>
      {children}
      {(notes.length > 0 || open) && (
        <div className="cal-notes">
          {notes.map(n => (
            <div key={n.id} className={`cal-daynote ${n.quiet ? 'quiet' : ''}`}>
              <StickyNote size={12} aria-hidden /><span className="grow">{n.quiet ? <><b>Quiet day:</b> {n.text}. Atlas keeps it empty.</> : n.text}</span>
              <Btn size="xs" variant="ghost" icon aria-label={`Remove the note “${n.text}”`} onClick={() => d({ type: 'publishing/noteRemove', id: n.id })}><X size={12} /></Btn>
            </div>
          ))}
          {open && (
            <form className="cal-noteform" onSubmit={e => { e.preventDefault(); add() }}>
              <input autoFocus className="input" aria-label={`Note for ${label}`} placeholder="Bank holiday" value={text} onChange={e => { setText(e.target.value); setQuiet(QUIET_WORDS.test(e.target.value)) }} />
              <label className="row tight t-xs"><input type="checkbox" className="check" checked={quiet} onChange={e => setQuiet(e.target.checked)} />Quiet day: no posts</label>
              <span className="row tight"><Btn size="xs" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn><Btn size="xs" type="submit" disabled={!text.trim()}>Add note</Btn></span>
            </form>
          )}
        </div>
      )}
    </>
  )
}

/** The calendar's Filters popover: status, label, campaign, pillar, author. Several choices in a facet = any of them. */
function CalendarFilters({ value, onChange }: { value: CalFilters; onChange: (f: CalFilters) => void }) {
  const { s } = useStore()
  const n = activeCount(value)
  const campaigns = [...new Set(s.publishing.posts.map(p => p.campaign).filter((c): c is string => !!c))]
  const facets: { key: Facet; label: string; options: { value: string; label: string }[] }[] = [
    { key: 'status', label: 'Status', options: (Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map(k => ({ value: k, label: STATUS_LABEL[k] })) },
    { key: 'label', label: 'Label', options: [...knownLabels(s).map(l => ({ value: l, label: l })), { value: NO_LABEL, label: 'No label' }] },
    { key: 'campaign', label: 'Campaign', options: campaigns.map(c => ({ value: c, label: c })) },
    { key: 'pillar', label: 'Pillar', options: s.strategy.pillars.map(p => ({ value: p.name, label: p.name })) },
    { key: 'author', label: 'Author', options: [{ value: 'atlas', label: 'Atlas' }, { value: 'you', label: 'You' }] },
    { key: 'account', label: 'Profile', options: ACCOUNTS.map(a => ({ value: a.id, label: accountLabel(a) })) },
  ]
  const toggle = (k: Facet, v: string) => { const cur = value[k] ?? []; onChange({ ...value, [k]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }) }
  return (
    <Pop align="end" trigger={<button className="select-btn" aria-label={n ? `Filters, ${n} on` : 'Filters'}>Filters{n > 0 && <span className="num pub-filter-n">{n}</span>}<ChevronDown size={14} /></button>}>
      <div className="pub-filters">
        {facets.filter(f => f.options.length).map(f => (
          <fieldset key={f.key}>
            <legend className="label">{f.label}</legend>
            {f.options.map(o => (
              <label key={o.value} className="row tight pub-filter-opt">
                <input type="checkbox" className="check" checked={!!value[f.key]?.includes(o.value)} onChange={() => toggle(f.key, o.value)} />{o.label}
              </label>
            ))}
          </fieldset>
        ))}
        <div className="row"><span className="spacer" /><Btn size="sm" variant="ghost" disabled={!n} onClick={() => onChange({})}>Clear</Btn></div>
      </div>
    </Pop>
  )
}

function PostChip({ p, onOpen, checked, anySelected, onToggle }: { p: Post; onOpen: () => void; checked: boolean; anySelected: boolean; onToggle: (shift: boolean) => void }) {
  const draggable = p.status !== 'published'
  return (
    <article className={`cal-post ${p.status} ${checked ? 'pub-picked' : ''}`} draggable={draggable} onDragStart={e => { e.dataTransfer.setData('text/post', p.id); e.dataTransfer.effectAllowed = 'move' }}>
      <span className="pub-chip-check"><SelectBox checked={checked} visible={anySelected} onToggle={onToggle} label={`Select the ${NETWORK_LABEL[p.network]} post at ${hhmm(p.at)}`} /></span>
      <button className="cal-post-btn" onClick={e => (e.shiftKey || anySelected ? onToggle(e.shiftKey) : onOpen())} aria-label={`Preview ${NETWORK_LABEL[p.network]} ${hhmm(p.at)}: ${p.text}`}>
        <span className="cal-post-top"><Net n={p.network} /><span className="mono">{hhmm(p.at)}</span>{p.author === 'atlas' ? <Mark agent="atlas" /> : <SocialAvatar name="Sam Rivera" size={16} />}{p.account && <span className="cal-acc">{accountById(p.account).name.replace(/^Fernway /, '')}</span>}<span className="spacer" />{p.media && <span className="cal-photo"><Photo name={p.media} /></span>}</span>
        <p className="cal-post-text">{p.text}</p>
        {(p.status === 'needs' || p.status === 'draft' || p.status === 'failed' || p.status === 'paused' || p.status === 'unapproved') && <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>}
        {p.stats && <span className="cal-stats">{k(p.stats.reach)} reach · {p.stats.er}% engagement</span>}
        {p.note && <span className="cal-note">{p.note}</span>}
        {p.campaign && <span className="chip">{p.campaign}</span>}
      </button>
    </article>
  )
}

/* ---------- List ---------- */
type SortKey = 'at' | 'network' | 'status' | 'pillar' | 'author'
function PostTable({ posts, sel, onOpen }: { posts: Post[]; sel: ReturnType<typeof useSelection>; onOpen: (id: string) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'at', dir: 1 })
  const rows = [...posts].sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : a[sort.key] < b[sort.key] ? -1 : 0) * sort.dir)
  const head = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => setSort(x => ({ key, dir: x.key === key ? (-x.dir as 1 | -1) : 1 }))}>{label}{sort.key === key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</button>
    </th>
  )
  if (!posts.length) return <Empty title="No posts this week" body="Move to another week, or ask Atlas to fill the recommended slots." />
  return (
    <div className="card pub-table-wrap">
      <table className="table pub-table">
        <thead><tr><th className="w-40"><SelectAll sel={sel} label="Select every post in the list" /></th>{head('at', 'When')}{head('network', 'Network')}<th>Post</th>{head('status', 'Status')}{head('pillar', 'Pillar')}{head('author', 'Author')}</tr></thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id} className={sel.has(p.id) ? 'pub-picked' : ''} onClick={e => (e.shiftKey ? sel.toggle(p.id, true) : onOpen(p.id))}>
              <td onClick={e => e.stopPropagation()}><SelectBox checked={sel.has(p.id)} visible onToggle={shift => sel.toggle(p.id, shift)} label={`Select: ${p.text}`} /></td>
              <td className="mono">{new Date(p.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} {hhmm(p.at)}</td>
              <td><Net n={p.network} size={20} /></td>
              <td className="pub-table-text"><span className="ellipsis">{p.text}</span></td>
              <td><Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill></td>
              <td>{p.pillar}</td>
              <td><span className="row tight nowrap">{p.author === 'atlas' ? <><Mark agent="atlas" />Atlas</> : <><SocialAvatar name="Sam Rivera" size={16} />You</>}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- Drafts ---------- */
function Drafts() {
  const { s } = useStore()
  const nav = useNavigate()
  const [who, setWho] = useState<'all' | 'atlas' | 'you'>('all')
  const posts = s.publishing.posts.filter(p => p.status === 'draft' && (who === 'all' || p.author === who)).sort((a, b) => a.at - b.at)
  const open = useOpenPost()
  const ids = useMemo(() => posts.map(p => p.id), [posts.map(p => p.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(ids, who)
  // Only posts waiting for an approval: the Desk's other Atlas cards (licences, good news) aren't drafts.
  const onDesk = s.handoffs.filter(h => h.agent === 'atlas' && h.kind === 'approval' && h.preview?.type === 'post' && (who === 'all' || who === 'atlas'))
  return (
    <div className="stack">
      <Filters label="Author" value={who} onChange={setWho} items={[{ value: 'all', label: 'Everyone' }, { value: 'atlas', label: 'Atlas' }, { value: 'you', label: 'You' }]} />
      {onDesk.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>Waiting for your approval <span className="faint num">{onDesk.length}</span></h2></div>
          <ul className="rows">{onDesk.map(h => h.preview?.type === 'post' && (
            <li key={h.id} className="draft-row">
              <span className="draft-thumb">{h.preview.media ? <Photo name={h.preview.media} /> : <FileText size={16} />}</span>
              <div className="grow"><div className="row tight t-sm muted"><Net n={h.preview.network} /><span>{h.preview.slot}</span>{h.lane === 'claire' && <Pill tone="signal">With Claire</Pill>}</div><p className="ellipsis">{h.title}</p></div>
              <Link to={`/?card=${h.id}`} className="btn sm">Review on Desk</Link>
            </li>
          ))}</ul>
        </section>
      )}
      {!posts.length ? <Empty icon={<FileText size={18} />} title="No drafts" body="Drafts you save and posts Atlas prepares without a slot show up here." action={<Btn onClick={() => nav('/publishing/new')}><Plus size={14} />New post</Btn>} /> : (
        <div>
        <PostsBulk sel={sel} posts={posts} />
        <section className="card">
          <div className="card-head"><span className="row tight"><SelectAll sel={sel} label="Select every draft" /><h2>Drafts</h2><span className="faint num">{posts.length}</span></span></div>
          <ul className="rows">{posts.map(p => (
            <li key={p.id} className={`draft-row ${sel.has(p.id) ? 'pub-picked' : ''}`}>
              <SelectBox checked={sel.has(p.id)} visible={sel.count > 0} onToggle={shift => sel.toggle(p.id, shift)} label={`Select: ${p.text}`} />
              <button className="pub-draft-open" onClick={e => (e.shiftKey || sel.count ? sel.toggle(p.id, e.shiftKey) : open(p.id))}>
                <span className="draft-thumb">{p.media ? <Photo name={p.media} /> : <FileText size={16} />}</span>
                <span className="grow pub-draft-main">
                  <span className="row tight t-sm muted"><Net n={p.network} /><span>{new Date(p.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, {hhmm(p.at)}</span><span>· {p.pillar}</span><span>· {p.author === 'atlas' ? 'by Atlas' : 'by you'}</span></span>
                  <span className="ellipsis pub-draft-text">{p.text}</span>
                  {p.note && <span className="faint t-xs">{p.note}</span>}
                </span>
              </button>
              <Btn size="sm" onClick={() => nav(`/publishing/post/${p.id}`)}>Edit</Btn>
            </li>
          ))}</ul>
        </section>
        </div>
      )}
    </div>
  )
}

/* ---------- Media ---------- */
function MediaLibrary() {
  const { s, d } = useStore()
  const nav = useNavigate()
  const now = useNow(60000)
  const [tag, setTag] = useState('All')
  const [open, setOpen] = useState<Media | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [newTag, setNewTag] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const forPost = useRef<string | undefined>(undefined)
  const library = libraryOf(s)
  const tags = useMemo(() => ['All', ...Array.from(new Set(library.flatMap(m => m.tags)))], [library])
  const list = search(library.filter(m => tag === 'All' || m.tags.includes(tag)), q)
  const ending = expiring(s, now)
  const shownOpen = open && (library.find(m => m.id === open.id) ?? open)
  const waiting = waitingForVisual(s)
  const endsOf = (m: Media) => { const e = ending.find(x => x.media.id === m.id); return e && new Date(e.ends).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
  const useCount = (m: Media) => m.used + s.publishing.posts.filter(p => p.media === m.name && p.status !== 'published').length
  const upload = (post?: string) => { forPost.current = post; setError(null); file.current?.click() }
  const picked = async (f?: File) => {
    if (!f) return
    try {
      const name = await readImage(f)
      const title = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Your upload'
      d({ type: 'publishing/upload', post: forPost.current, media: { id: uid('md'), name, title, tags: ['Upload'], rights: 'Fernway · uploaded by you', used: 0, added: new Date(now).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } })
    } catch { setError(`“${f.name}” isn’t an image Atlas can read. Try a JPG or a PNG.`) }
  }

  return (
    <div className="stack">
      <input ref={file} type="file" accept="image/*" hidden onChange={e => { picked(e.target.files?.[0]); e.target.value = '' }} />
      {(waiting.length > 0 || ending.length > 0) && (
        <section className="card media-needs" aria-labelledby="media-needs-h">
          <div className="card-head"><h2 id="media-needs-h">Atlas needs you on {waiting.length + ending.length === 1 ? 'one visual' : `${waiting.length + ending.length} visuals`}</h2></div>
          <ul className="rows">
            {waiting.map(p => {
              const card = visualCardOf(s, p)
              const m = card && pickVisual(p, library, now)
              const when = new Date(p.at).toLocaleDateString('en-GB', { weekday: 'long' })
              return (
                <li key={p.id} className="media-missing">
                  <ImageOff size={16} aria-hidden />
                  <div className="grow">
                    <b>A visual for {when}’s {NETWORK_LABEL[p.network]} post</b>
                    <p className="muted t-sm">“{p.text}” {m ? `Atlas would use “${m.title}”. It never uses stock photos.` : 'No photo in Media fits, and Atlas never uses stock photos.'}</p>
                  </div>
                  <span className="media-missing-acts">
                    {card && m && <Btn size="sm" onClick={() => d({ type: 'core/resolve', id: card.id, decision: { kind: 'option', index: 0, option: card.options?.[0]?.label ?? `Use ${m.title}` } })}>Use “{m.title}”</Btn>}
                    <Btn size="sm" onClick={() => upload(p.id)}><Upload size={14} />Upload one</Btn>
                    {card && <Btn size="sm" variant="ghost" onClick={() => d({ type: 'core/resolve', id: card.id, decision: { kind: 'option', index: 2, option: card.options?.[2]?.label ?? 'Move the post to next week' } })}>Move the post</Btn>}
                  </span>
                </li>
              )
            })}
            {ending.map(e => {
              const card = s.handoffs.find(h => h.topic === 'Licence' && h.ref === e.media.name)
              return (
                <li key={e.media.id} className="media-missing">
                  <CalendarX size={16} aria-hidden />
                  <div className="grow">
                    <b>The licence for “{e.media.title}” ends on {new Date(e.ends).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</b>
                    <p className="muted t-sm">{e.media.rights}. Used by {e.posts.map(p => `${new Date(p.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} ${NETWORK_LABEL[p.network]}`).join(', ')}.{e.swap ? ` Atlas would put “${e.swap.title}” instead.` : ''}</p>
                  </div>
                  {e.swap && <span className="media-missing-acts"><Btn size="sm" onClick={() => (card ? d({ type: 'core/resolve', id: card.id, decision: { kind: 'option', index: 0, option: card.options?.[0]?.label ?? 'Swap' } }) : d({ type: 'publishing/swapMedia', from: e.media.name, to: e.swap!.name }))}>Swap for “{e.swap.title}”</Btn></span>}
                </li>
              )
            })}
          </ul>
        </section>
      )}
      <div className="media-bar">
        <input className="input media-search" type="search" aria-label="Search media" placeholder="Search media" value={q} onChange={e => setQ(e.target.value)} />
        <div className="grow"><Filters label="Filter media" value={tag} onChange={setTag} items={tags.map(t => ({ value: t, label: t }))} /></div>
        {error && <span className="cmp-error" role="alert">{error}</span>}
        <Btn onClick={() => upload()}><Upload size={14} />Upload</Btn>
      </div>
      <ul className="media-grid">
        {list.map(m => (
          <li key={m.id}>
            <button className="media-tile" onClick={() => setOpen(m)}>
              <span className="media-photo"><Photo name={m.name} alt={m.title} /></span>
              <span className="media-meta"><b className="ellipsis">{m.title}</b><span><span className="nowrap">Used {useCount(m)} time{useCount(m) === 1 ? '' : 's'}</span> · <span className="nowrap">added {m.added}</span></span>{endsOf(m) && <span className="media-ends"><CalendarX size={12} aria-hidden />Licence ends {endsOf(m)}</span>}</span>
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={!!open} onOpenChange={o => !o && setOpen(null)} title={open?.title ?? ''}
        footer={open && <><span className="spacer" /><Btn onClick={() => setOpen(null)}>Close</Btn><Btn variant="primary" onClick={() => { nav(`/publishing/new?media=${open.name}`); setOpen(null) }}><Plus size={14} />Use in a new post</Btn></>}>
        {open && (
          <div className="stack">
            <span className="media-big"><Photo name={open.name} alt={open.title} /></span>
            <dl className="media-dl">
              <div><dt>Rights</dt><dd>{open.rights}</dd></div>
              <div><dt>Used in posts</dt><dd className="num">{useCount(open)}</dd></div>
              <div><dt>Added</dt><dd>{open.added}</dd></div>
              <div><dt>Tags</dt><dd className="pub-labels">
                {shownOpen!.tags.map(t => <span key={t} className="chip">{t}<Btn size="xs" variant="ghost" icon aria-label={`Remove the tag ${t}`} onClick={() => d({ type: 'publishing/mediaTags', id: open.id, tags: shownOpen!.tags.filter(x => x !== t) })}><X size={12} /></Btn></span>)}
                <form onSubmit={e => { e.preventDefault(); if (newTag.trim()) d({ type: 'publishing/mediaTags', id: open.id, tags: [...shownOpen!.tags, newTag] }); setNewTag('') }}>
                  <input className="input" aria-label="Add a tag" placeholder="Add a tag" value={newTag} onChange={e => setNewTag(e.target.value)} />
                </form>
              </dd></div>
            </dl>
          </div>
        )}
      </Sheet>
    </div>
  )
}
