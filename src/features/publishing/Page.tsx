import { Fragment, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, CalendarX, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Lightbulb, ListOrdered, Pause, PenLine, Play, Plus, Sparkles, SquarePen, StickyNote, TriangleAlert, Upload, UserRound, X } from 'lucide-react'
import type { Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { DAY, T, hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { BEST_SLOT, PUBLISH_NETWORKS, type Media, type Post, type PostStatus } from '../../data/publishing'
import { Btn, Empty, Filters, Mark, Menu, Net, PageHead, Pill, Pop, Seg, Sheet, Tabs, Tip } from '../../ui'
import { SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { Ask, ObjectBody, Props } from '../../ui/ObjectPanel'
import { PostPreview, PostsBulk, useOpenPost } from './Bulk'
import Photo from '../../ui/Photo'
import Composer from './Composer'
import PlanReview from './Plan'
import Ideas from './Ideas'
import Queues from './QueuesTab'
import { isOpen, recommendNetwork } from './ideasModel'
import { targetsOf, themesOf } from '../strategy/slice'
import { uid } from '../../app/core'
import { libraryOf, readImage } from './visuals'
import { NO_LABEL, STATUS_LABEL, activeCount, knownLabels, passes, type CalFilters, type Facet } from './labels'
import { QUIET_WORDS, isQuiet, notesOn } from './notes'
import { expiring, search } from './media'
import { ACCOUNTS, accountById, accountLabel } from './accounts'
import { CountBadge } from '../../ui/Feedback'
import { atlasNeeds } from './Needs'
import { WINDOW_TOPIC } from './window'
import './publishing.css'

type Tab = 'ideas' | 'calendar' | 'media'
const STATUS: Record<PostStatus, { label: string; tone?: 'alert' | 'caution' | 'ok' | 'signal' }> = {
  scheduled: { label: 'Scheduled' }, published: { label: 'Published', tone: 'ok' }, draft: { label: 'Draft' }, needs: { label: 'Needs you', tone: 'caution' }, failed: { label: 'Failed', tone: 'alert' }, paused: { label: 'Paused', tone: 'caution' }, unapproved: { label: 'To approve' },
}
const MONDAY_THIS_WEEK = T(0, 0, -1)
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`)

/**
 * Publishing: Ideas (the landing list: Needs you, Ideas, Drafts), Calendar, Media. Next week's plan opens from its
 * Needs-you row (`/publishing/plan`); the queues are a sheet over the calendar (`/publishing/queues`).
 */
export default function PublishingPage() {
  const { s, d } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const rest = (useParams()['*'] ?? '').split('/')
  // /publishing lands on Ideas and the plan reads under it; the composer (new, post/:id) and the queues open over the calendar.
  const tab: Tab = !rest[0] || rest[0] === 'ideas' || rest[0] === 'plan' ? 'ideas' : rest[0] === 'media' ? 'media' : 'calendar'
  const editId = rest[0] === 'post' ? rest[1] : undefined
  const creating = rest[0] === 'new'
  const query = new URLSearchParams(loc.search)
  const editPost = s.publishing.posts.find(p => p.id === editId)
  const back = rest[0] === 'plan' ? '/publishing/plan' : `/publishing/${tab}`
  // The landing tab counts what the rail counts: Atlas's cards in Needs you.
  const needs = atlasNeeds(s.handoffs).length
  // Drafts was a tab: it is a filter of the landing list now.
  if (rest[0] === 'drafts') return <Navigate to="/publishing?show=drafts" replace />

  return (
    <div className="page pub-page">
      <PageHead agent="atlas" title="Publishing" lede="Atlas writes the week’s posts; you approve the plan, not each post.">
        {s.publishing.hold
          ? <Btn onClick={() => d({ type: 'publishing/resumeAll' })}><Play size={14} />Resume publishing</Btn>
          : <Btn onClick={() => d({ type: 'publishing/pauseAll' })}><Pause size={14} />Pause all publishing</Btn>}
        <Btn variant="primary" onClick={() => nav('/publishing/new')}><Plus size={14} />New post</Btn>
      </PageHead>
      <Tabs value={tab} onChange={t => nav(t === 'ideas' ? '/publishing' : `/publishing/${t}`)} items={[
        { value: 'ideas', label: <>Ideas{needs > 0 && <CountBadge n={needs} needs label={`${needs} need you`} />}</> },
        { value: 'calendar', label: 'Calendar' },
        { value: 'media', label: 'Media' },
      ]} />
      {tab === 'ideas' && (rest[0] === 'plan'
        ? <div className="stack"><Link to="/publishing" className="link-btn row tight self-start"><ChevronLeft size={14} />Back to Ideas</Link><PlanReview /></div>
        : <Ideas id={rest[1]} />)}
      {tab === 'calendar' && <Calendar />}
      {tab === 'media' && <MediaLibrary />}
      <PostPreview />
      <Sheet open={rest[0] === 'queues'} onOpenChange={o => !o && nav('/publishing/calendar')} title="Queues"><Queues /></Sheet>

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
/** Only these statuses are named on a card (they ask something of Sam); the rest is the post itself. */
const STATUS_ICON: Partial<Record<PostStatus, typeof Pause>> = { needs: CircleAlert, failed: TriangleAlert, paused: Pause, draft: PenLine, unapproved: UserRound }
const NAMED: PostStatus[] = ['needs', 'failed', 'paused', 'draft', 'unapproved']
const dayLong = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const mondayOf = (t: number) => t - ((new Date(t).getDay() + 6) % 7) * DAY

function Calendar() {
  const { s, d } = useStore()
  const now = useNow(30000)
  const [view, setView] = useState<'week' | 'month' | 'list'>('week')
  const open = useOpenPost()
  const [anchor, setAnchor] = useState(MONDAY_THIS_WEEK)
  const [network, setNetwork] = useState<Network | 'all'>('all')
  const [filters, setFilters] = useState<CalFilters>({})
  const [over, setOver] = useState<number | null>(null)
  const nav = useNavigate()
  const base = s.publishing.posts.filter(p => (network === 'all' || p.network === network) && passes(p, filters)).sort((a, b) => a.at - b.at)
  const todayStart = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime()

  const days = view === 'month' ? 35 : 7
  const start = view !== 'month' ? anchor : (() => { const f = new Date(anchor); const first = new Date(f.getFullYear(), f.getMonth(), 1); return mondayOf(first.getTime()) })()
  const cells = Array.from({ length: days }, (_, i) => start + i * DAY)
  const label = view !== 'month'
    ? `${new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(start + 6 * DAY).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : new Date(anchor).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const shift = (dir: number) => setAnchor(a => (view !== 'month' ? a + dir * 7 * DAY : new Date(new Date(a).getFullYear(), new Date(a).getMonth() + dir, 1).getTime()))
  const openWeek = (day: number) => { setAnchor(mondayOf(day)); setView('week') }

  /** For a future day with fewer than 2 posts: the network Atlas recommends (cadence first, then the pillar behind target). */
  const recommend = (day: number): Network | null => (view !== 'week' || isQuiet(s.publishing.notes ?? [], day) ? null : recommendNetwork(s.publishing.posts, day, now, targetsOf(s)))
  const gapIdea = (day: number) => s.publishing.ideas.find(i => isOpen(i) && i.origin === 'gap' && i.key.startsWith(`gap-${Math.round((day - T(0, 0, 0)) / DAY)}-`))

  // What needs Sam is on the landing (Needs you); here, a status filter is in Filters › Status.
  const f = activeCount(filters) > 0
  const inDay = (t: number) => base.filter(p => p.at >= t && p.at < t + DAY)
  const visible = base.filter(p => p.at >= start && p.at < start + days * DAY)
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
  const nowLine = <div className="cal-now"><span>Now <span className="mono">{hhmm(now)}</span></span></div>

  return (
    <div className={`cal cal-v-${view}`}>
      <div className="cal-bar">
        <div className="row tight">
          <Btn size="sm" icon aria-label={view === 'month' ? 'Previous month' : 'Previous week'} onClick={() => shift(-1)}><ChevronLeft size={16} /></Btn>
          <Btn size="sm" onClick={() => setAnchor(MONDAY_THIS_WEEK)}>Today</Btn>
          <Btn size="sm" icon aria-label={view === 'month' ? 'Next month' : 'Next week'} onClick={() => shift(1)}><ChevronRight size={16} /></Btn>
          <h2 className="cal-title">{label}</h2>
        </div>
        <div className="row cal-tools">
          <Menu trigger={<button className="select-btn">{network === 'all' ? 'All networks' : NETWORK_LABEL[network]}<ChevronDown size={14} /></button>}
            items={[{ label: 'All networks', onSelect: () => setNetwork('all') }, ...PUBLISH_NETWORKS.map(n => ({ label: NETWORK_LABEL[n], icon: <Net n={n} />, onSelect: () => setNetwork(n) }))]} />
          <CalendarFilters value={filters} onChange={setFilters} />
          <Seg name="calview" label="Calendar view" size="sm" value={view} onChange={setView} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'list', label: 'List' }]} />
          <Btn size="sm" variant="ghost" onClick={() => nav('/publishing/queues')}><ListOrdered size={14} />Queues</Btn>
        </div>
      </div>

      <PostsBulk sel={sel} posts={visible} />
      {view === 'week' ? (
        <div className="cal-week">
          {cells.map(day => {
            const items = inDay(day)
            const rec = !f ? recommend(day) : null
            const idea = !f ? gapIdea(day) : undefined
            const past = day + DAY <= now
            const today = day === todayStart
            const next = today ? items.findIndex(p => p.at > now) : -1
            return (
              <section key={day} className={`cal-day ${today ? 'today' : ''} ${past ? 'past' : ''} ${over === day ? 'over' : ''}`} aria-label={`${dayLong(day)}${today ? ', today' : ''}`}
                onDragOver={e => { if (!past) { e.preventDefault(); setOver(day) } }} onDragLeave={() => setOver(o => (o === day ? null : o))} onDrop={e => drop(e, day)}>
                <DayNotes day={day} past={past} head={
                  <h3><span>{new Date(day).toLocaleDateString('en-GB', { weekday: 'short' })}</span> <b className="num">{new Date(day).getDate()}</b>{today && <span className="sr-only">, today</span>}{items.length > 0 && <span className="sr-only">, {items.length} post{items.length > 1 ? 's' : ''}</span>}</h3>
                }>
                  <Themes day={day} />
                </DayNotes>
                {items.map((p, i) => (
                  <Fragment key={p.id}>
                    {i === next && nowLine}
                    <PostChip p={p} onOpen={() => open(p.id)} checked={sel.has(p.id)} anySelected={sel.count > 0} onToggle={sh => sel.toggle(p.id, sh)} />
                  </Fragment>
                ))}
                {today && items.length > 0 && next === -1 && nowLine}
                {idea ? (
                  <Link className="cal-rec" to={`/publishing/ideas/${idea.id}`}>
                    <span className="cal-post-top"><Net n={idea.networks[0]} /><span className="mono">{idea.drafts ? hhmm(idea.drafts[0].at) : BEST_SLOT[idea.networks[0]].time}</span><span className="spacer" /><Lightbulb size={12} aria-hidden /></span>
                    <span className="cal-rec-text">{idea.copy[idea.networks[0]]}</span>
                    <span className="cal-rec-act">Idea from Atlas · Review it</span>
                  </Link>
                ) : rec && !s.handoffs.some(h => h.topic === 'Empty slot' && h.preview?.type === 'post' && h.preview.network === rec) ? (
                  <button className="cal-rec" onClick={() => d({ type: 'publishing/askFill', day: Math.round((day - T(0, 0, 0)) / DAY), network: rec })} aria-label={`Ask Atlas for an idea: ${NETWORK_LABEL[rec]} at ${BEST_SLOT[rec].time}, a recommended slot`}>
                    <span className="cal-post-top"><Net n={rec} /><span className="mono">{BEST_SLOT[rec].time}</span><span className="spacer" /><Sparkles size={12} aria-hidden /></span>
                    <span className="cal-rec-act">Ask Atlas for an idea</span>
                  </button>
                ) : null}
                {!f && !items.length && !rec && !idea && <p className="cal-empty">{past ? 'Nothing posted' : 'Nothing planned'}</p>}
              </section>
            )
          })}
        </div>
      ) : view === 'month' ? (
        <div className="cal-month">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => <div key={x} className="cal-dow" aria-hidden>{x}</div>)}
          {cells.map((day, n) => {
            const items = inDay(day)
            const other = new Date(day).getMonth() !== new Date(anchor).getMonth()
            // A week with nothing in it takes one line, so the weeks that matter get the room.
            const week = cells.slice(n - (n % 7), n - (n % 7) + 7)
            const slim = week.every(x => x !== todayStart && !inDay(x).length)
            // Three lines fit: what needs you first, then by time.
            const shown = items.length <= 3 ? items : [...items].sort((a, b) => Number(NAMED.includes(b.status)) - Number(NAMED.includes(a.status)) || a.at - b.at).slice(0, 3).sort((a, b) => a.at - b.at)
            return (
              <div key={day} className={`cal-cell ${other ? 'other' : ''} ${day === todayStart ? 'today' : ''} ${slim ? 'slim' : ''}`}>
                <button className="pub-cell-day num" onClick={() => openWeek(day)}
                  aria-label={`Open the week of ${dayLong(day)}, ${items.length} post${items.length === 1 ? '' : 's'}`}>{new Date(day).getDate()}{n === 0 || new Date(day).getDate() === 1 ? <span className="cal-cell-m"> {new Date(day).toLocaleDateString('en-GB', { month: 'short' })}</span> : null}</button>
                <Themes day={day} compact />
                {shown.map(p => {
                  const I = STATUS_ICON[p.status]
                  return (
                    <button key={p.id} className={`cal-mini ${p.status}`} onClick={() => open(p.id)} aria-label={`Preview ${NETWORK_LABEL[p.network]} ${hhmm(p.at)}${NAMED.includes(p.status) ? `, ${STATUS_LABEL[p.status].toLowerCase()}` : ''}: ${p.text}`}>
                      <Net n={p.network} /><span className="mono">{hhmm(p.at)}</span><span className="cal-mini-text">{p.text}</span>{I && <I size={12} className="cal-mini-flag" aria-hidden />}
                    </button>
                  )
                })}
                {items.length > shown.length && <button className="link-btn cal-more" onClick={() => openWeek(day)} aria-label={`Open the week of ${dayLong(day)}: ${items.length - shown.length} more posts`}>+{items.length - shown.length} more</button>}
              </div>
            )
          })}
        </div>
      ) : <PostTable posts={visible} sel={sel} onOpen={open} now={now} filtered={f} />}
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
/** A reason cut to its first clause: « X refused it: the short link… » → « X refused it ». */
/** The head of a post's note, before its first colon or full stop (« X refused it »). */
const noteHead = (t: string) => t.split(/[:.](?:\s|$)/)[0]

/** The one line under a post's words: why it needs a look, how it did, or what Atlas changed. Never all three. */
function postLine(p: Post): { text: string; kind: 'reason' | 'stats' | 'atlas' } | undefined {
  // The gist only (« X refused it », « Missing visual »): the whole reason is in the post's panel, one click away.
  if (p.note && (p.status === 'needs' || p.status === 'failed' || p.status === 'unapproved' || p.status === 'paused')) return { text: noteHead(p.status === 'paused' ? p.note.replace(/^Paused:\s*/, 'During ') : p.note), kind: 'reason' }
  if (p.stats) return { text: `${k(p.stats.reach)} reach · ${p.stats.er}% engagement`, kind: 'stats' }
  const moved = p.note?.match(/^Moved from (\S+) to \S+ by Atlas/)
  if (moved) return { text: `Moved by Atlas from ${moved[1]}`, kind: 'atlas' }
}

/** A post in the week: when and where, the words, then one line only if there's something to know. */
function PostChip({ p, onOpen, checked, anySelected, onToggle }: { p: Post; onOpen: () => void; checked: boolean; anySelected: boolean; onToggle: (shift: boolean) => void }) {
  const { s } = useStore()
  const going = s.handoffs.find(h => h.topic === WINDOW_TOPIC && h.ref === p.id)
  const draggable = p.status !== 'published'
  const line = postLine(p)
  const named = NAMED.includes(p.status)
  return (
    <article className={`cal-post ${p.status} ${checked ? 'pub-picked' : ''}`} draggable={draggable} title={draggable ? 'Drag it to another day to move it' : undefined}
      onDragStart={e => { e.dataTransfer.setData('text/post', p.id); e.dataTransfer.effectAllowed = 'move' }}>
      <span className="pub-chip-check"><SelectBox checked={checked} visible={anySelected} onToggle={onToggle} label={`Select the ${NETWORK_LABEL[p.network]} post at ${hhmm(p.at)}`} /></span>
      <button className="cal-post-btn" onClick={e => (e.shiftKey || anySelected ? onToggle(e.shiftKey) : onOpen())} aria-label={`Preview ${NETWORK_LABEL[p.network]} ${hhmm(p.at)}, ${STATUS_LABEL[p.status].toLowerCase()}: ${p.text}`}>
        <span className="cal-post-top">
          <Net n={p.network} /><span className="mono">{hhmm(p.at)}</span>
          {p.account && <span className="cal-acc">{accountById(p.account).name.replace(/^Fernway /, '')}</span>}
        </span>
        <span className="cal-post-text">{p.text}</span>
        {/* The status is named only when it asks something of Sam; its reason follows on the same line. */}
        {(named || going) && <span className="cal-post-state">{named && <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>}{going && <Pill tone="caution">{going.title.split(':')[0]}</Pill>}</span>}
        {line && <span className={`cal-post-line ${line.kind}`}>{line.kind === 'atlas' && <Mark agent="atlas" />}{line.text}</span>}
      </button>
    </article>
  )
}

/* ---------- List ---------- */
type SortKey = 'at' | 'network' | 'status' | 'pillar' | 'author'
function PostTable({ posts, sel, onOpen, now, filtered }: { posts: Post[]; sel: ReturnType<typeof useSelection>; onOpen: (id: string) => void; now: number; filtered: boolean }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'at', dir: 1 })
  const rows = [...posts].sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : a[sort.key] < b[sort.key] ? -1 : 0) * sort.dir)
  // Sorted by time, the list reads like an agenda: one heading per day.
  const byDay = sort.key === 'at'
  const dayOf = (t: number) => new Date(t).setHours(0, 0, 0, 0)
  const today = dayOf(now)
  const head = (key: SortKey, label: string, cls = '') => (
    <th className={cls} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => setSort(x => ({ key, dir: x.key === key ? (-x.dir as 1 | -1) : 1 }))}>{label}{sort.key === key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</button>
    </th>
  )
  if (!posts.length) return <Empty title={filtered ? 'Nothing left here this week' : 'No posts this week'} body={filtered ? 'Clear the filters, or move to another week.' : 'Move to another week, or ask Atlas to fill the recommended slots.'} />
  return (
    <div className="card pub-table-wrap">
      <table className="table pub-table">
        <thead><tr><th className="w-40"><SelectAll sel={sel} label="Select every post in the list" /></th>{head('at', 'When')}{head('network', 'Network', 'pub-col-net')}<th>Post</th>{head('status', 'Status')}{head('pillar', 'Pillar', 'pub-col-pillar')}{head('author', 'Author', 'pub-col-author')}</tr></thead>
        <tbody>
          {rows.map((p, i) => {
            const line = postLine(p)
            const newDay = byDay && (i === 0 || dayOf(rows[i - 1].at) !== dayOf(p.at))
            return (
              <Fragment key={p.id}>
                {newDay && <tr className="pub-day-row"><th colSpan={7} scope="colgroup">{dayLong(p.at)}{dayOf(p.at) === today && <span className="cal-today">Today</span>}</th></tr>}
                <tr className={sel.has(p.id) ? 'pub-picked' : ''} onClick={e => (e.shiftKey ? sel.toggle(p.id, true) : onOpen(p.id))}>
                  <td onClick={e => e.stopPropagation()}><SelectBox checked={sel.has(p.id)} visible onToggle={sh => sel.toggle(p.id, sh)} label={`Select: ${p.text}`} /></td>
                  <td className="mono nowrap pub-col-when">{!byDay && `${new Date(p.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} `}{hhmm(p.at)}</td>
                  <td className="pub-col-net"><Net n={p.network} size={20} /></td>
                  <td className="pub-table-text">
                    <span className="ellipsis">{p.text}</span>
                    {line && <span className={`cal-post-line ${line.kind}`}>{line.kind === 'atlas' && <Mark agent="atlas" />}{line.text}</span>}
                  </td>
                  <td className="pub-col-status"><Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill></td>
                  <td className="pub-col-pillar">{p.pillar}</td>
                  <td className="pub-col-author"><span className="row tight nowrap">{p.author === 'atlas' ? <><Mark agent="atlas" />Atlas</> : <><SocialAvatar name="Sam Rivera" size={16} />You</>}</span></td>
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}


/* ---------- Media ---------- */
function MediaLibrary() {
  const { s, d } = useStore()
  const nav = useNavigate()
  const now = useNow(60000)
  // « Upload it in Media » from a post waiting for a visual: the upload goes to that post.
  const forPost = new URLSearchParams(useLocation().search).get('for') ?? undefined
  const [tag, setTag] = useState('All')
  const [open, setOpen] = useState<Media | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [newTag, setNewTag] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const library = libraryOf(s)
  const tags = useMemo(() => ['All', ...Array.from(new Set(library.flatMap(m => m.tags)))], [library])
  const list = search(library.filter(m => tag === 'All' || m.tags.includes(tag)), q)
  const ending = expiring(s, now)
  const shownOpen = open && (library.find(m => m.id === open.id) ?? open)
  const endsOf = (m: Media) => { const e = ending.find(x => x.media.id === m.id); return e && new Date(e.ends).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
  const useCount = (m: Media) => m.used + s.publishing.posts.filter(p => p.media === m.name && p.status !== 'published').length
  const upload = () => { setError(null); file.current?.click() }
  const picked = async (f?: File) => {
    if (!f) return
    try {
      const name = await readImage(f)
      const title = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Your upload'
      d({ type: 'publishing/upload', post: forPost, media: { id: uid('md'), name, title, tags: ['Upload'], rights: 'Fernway · uploaded by you', used: 0, added: new Date(now).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } })
    } catch { setError(`“${f.name}” isn’t an image Atlas can read. Try a JPG or a PNG.`) }
  }

  return (
    <div className="stack">
      <input ref={file} type="file" accept="image/*" hidden onChange={e => { picked(e.target.files?.[0]); e.target.value = '' }} />
      <div className="media-bar">
        <input className="input media-search" type="search" aria-label="Search media" placeholder="Search media" value={q} onChange={e => setQ(e.target.value)} />
        <div className="grow"><Filters label="Filter media" value={tag} onChange={setTag} items={tags.map(t => ({ value: t, label: t }))} /></div>
        {error && <span className="cmp-error" role="alert">{error}</span>}
        <Btn variant={forPost ? 'primary' : undefined} onClick={upload}><Upload size={14} />{forPost ? 'Upload the post’s visual' : 'Upload'}</Btn>
      </div>
      <ul className="media-grid">
        {list.map(m => (
          <li key={m.id}>
            <button className="media-tile" onClick={() => setOpen(m)}>
              <span className="media-photo"><Photo name={m.name} alt={m.title} /></span>
              <span className="media-meta"><b className="ellipsis">{m.title}</b><span className="nowrap">Used {useCount(m)} time{useCount(m) === 1 ? '' : 's'}</span>{endsOf(m) && <span className="media-ends"><CalendarX size={12} aria-hidden />Licence ends {endsOf(m)}</span>}</span>
            </button>
          </li>
        ))}
      </ul>
      {open && shownOpen && (() => {
        const ends = ending.find(x => x.media.id === open.id)
        const at = list.findIndex(m => m.id === open.id)
        const addTag = (
          <form onSubmit={e => { e.preventDefault(); if (newTag.trim()) d({ type: 'publishing/mediaTags', id: open.id, tags: [...shownOpen.tags, newTag] }); setNewTag('') }}>
            <input className="input" aria-label="Add a tag" placeholder="Add a tag" value={newTag} onChange={e => setNewTag(e.target.value)} />
          </form>
        )
        return (
          <Sheet open onOpenChange={o => !o && setOpen(null)}
            head={<span className="obj-thumb"><Photo name={open.name} alt="" /></span>}
            title={open.title} meta={[`Added ${open.added}`, `Used ${useCount(open)} time${useCount(open) === 1 ? '' : 's'}`]}
            status={ends ? <Pill tone="caution">Licence ends {endsOf(open)}</Pill> : undefined}
            nav={at >= 0 ? { noun: 'photo', prev: at > 0 ? () => setOpen(list[at - 1]) : undefined, next: at < list.length - 1 ? () => setOpen(list[at + 1]) : undefined } : undefined}
            tools={<Tip label="Use in a new post"><Btn variant="ghost" icon size="sm" aria-label="Use in a new post" onClick={() => { nav(`/publishing/new?media=${open.name}`); setOpen(null) }}><SquarePen size={16} /></Btn></Tip>}>
            <div className="obj-panel">
              {ends && (
                <Ask agents={['atlas']} title={`Its licence ends ${endsOf(open)}`} actions={ends.swap && (
                  <Btn variant="primary" onClick={() => d({ type: 'publishing/swapMedia', from: open.name, to: ends.swap!.name })}>Use “{ends.swap.title}” instead</Btn>
                )}>
                  <p>{ends.posts.length} scheduled post{ends.posts.length === 1 ? '' : 's'} still use{ends.posts.length === 1 ? 's' : ''} it after that date.</p>
                </Ask>
              )}
              <ObjectBody
                main={<span className="media-big"><Photo name={open.name} alt={open.title} /></span>}
                aside={<Props rows={[
                  { label: 'Rights', value: open.rights },
                  { label: 'Used in posts', value: <span className="num">{useCount(open)}</span> },
                  { label: 'Added', value: open.added },
                  { label: 'Tags', value: shownOpen.tags.length ? <>{shownOpen.tags.map(t => <span key={t} className="chip">{t}<Btn size="xs" variant="ghost" icon aria-label={`Remove the tag ${t}`} onClick={() => d({ type: 'publishing/mediaTags', id: open.id, tags: shownOpen.tags.filter(x => x !== t) })}><X size={12} /></Btn></span>)}{addTag}</> : undefined, empty: addTag },
                ]} />}
              />
            </div>
          </Sheet>
        )
      })()}
    </div>
  )
}
