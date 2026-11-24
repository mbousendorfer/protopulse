import { useMemo, useState, type DragEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight, FileText, ImageOff, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { DAY, T, hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { BEST_SLOT, CADENCE, MEDIA, PUBLISH_NETWORKS, type Media, type Post, type PostStatus } from '../../data/publishing'
import { Btn, Empty, Filters, Mark, Menu, Net, PageHead, Pill, Seg, Sheet, Tabs } from '../../ui'
import Photo from '../../ui/Photo'
import Composer from './Composer'
import PlanReview from './Plan'
import './publishing.css'

type Tab = 'calendar' | 'plan' | 'drafts' | 'media'
const STATUS: Record<PostStatus, { label: string; tone?: 'alert' | 'caution' | 'ok' | 'signal' }> = {
  scheduled: { label: 'Scheduled' }, published: { label: 'Published', tone: 'ok' }, draft: { label: 'Draft' }, needs: { label: 'Needs you', tone: 'caution' }, failed: { label: 'Failed', tone: 'alert' },
}
const MONDAY_THIS_WEEK = T(0, 0, -1)
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`)

export default function PublishingPage() {
  const { s } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const rest = (useParams()['*'] ?? '').split('/')
  const tab: Tab = rest[0] === 'plan' || rest[0] === 'drafts' || rest[0] === 'media' ? rest[0] : 'calendar'
  const editId = rest[0] === 'post' ? rest[1] : undefined
  const creating = rest[0] === 'new'
  const query = new URLSearchParams(loc.search)
  const editPost = s.publishing.posts.find(p => p.id === editId)
  const back = tab === 'calendar' ? '/publishing' : `/publishing/${tab}`
  const planPending = s.publishing.plan.status === 'proposed'
  const drafts = s.publishing.posts.filter(p => p.status === 'draft').length

  return (
    <div className="page pub-page">
      <PageHead agent="atlas" title="Publishing" lede="Atlas plans the week, writes the posts and picks the slots. You approve the plan, not each post.">
        <Btn variant="primary" onClick={() => nav('/publishing/new')}><Plus size={14} />New post</Btn>
      </PageHead>
      <Tabs value={tab} onChange={t => nav(t === 'calendar' ? '/publishing' : `/publishing/${t}`)} items={[
        { value: 'calendar', label: 'Calendar' },
        { value: 'plan', label: <>Plan review{planPending && <span className="dot" style={{ color: 'var(--caution)' }} aria-label="waiting for you" />}</> },
        { value: 'drafts', label: 'Drafts', count: drafts },
        { value: 'media', label: 'Media', count: MEDIA.length },
      ]} />
      {tab === 'calendar' && <Calendar />}
      {tab === 'plan' && <PlanReview />}
      {tab === 'drafts' && <Drafts />}
      {tab === 'media' && <MediaLibrary />}

      {(creating || editId) && (
        editId && !editPost ? (
          <Sheet open onOpenChange={() => nav(back)} title="Post not found"><Empty title="This post no longer exists" body="It may have been deleted or merged." action={<Btn onClick={() => nav('/publishing')}>Back to the calendar</Btn>} /></Sheet>
        ) : (
          <Composer key={editId ?? `new${loc.search}`} open post={editPost} onClose={() => nav(editId ? '/publishing' : back === '/publishing/plan' ? back : '/publishing')}
            initial={{ media: query.get('media') ?? undefined, text: query.get('text') ?? undefined, network: (query.get('network') as Network) ?? undefined, at: query.get('at') ? +query.get('at')! : undefined }} />
        )
      )}
    </div>
  )
}

/* ---------- Calendar ---------- */
function Calendar() {
  const { s, d } = useStore()
  const nav = useNavigate()
  const now = useNow(30000)
  const [view, setView] = useState<'week' | 'month'>('week')
  const [anchor, setAnchor] = useState(MONDAY_THIS_WEEK)
  const [network, setNetwork] = useState<Network | 'all'>('all')
  const [asked, setAsked] = useState<string[]>([])
  const [over, setOver] = useState<number | null>(null)
  const posts = s.publishing.posts.filter(p => network === 'all' || p.network === network).sort((a, b) => a.at - b.at)
  const todayStart = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime()

  const days = view === 'week' ? 7 : 35
  const start = view === 'week' ? anchor : (() => { const f = new Date(anchor); const first = new Date(f.getFullYear(), f.getMonth(), 1); const dow = (first.getDay() + 6) % 7; return first.getTime() - dow * DAY })()
  const cells = Array.from({ length: days }, (_, i) => start + i * DAY)
  const inDay = (t: number) => posts.filter(p => p.at >= t && p.at < t + DAY)
  const label = view === 'week'
    ? `${new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(start + 6 * DAY).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : new Date(anchor).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const shift = (dir: number) => setAnchor(a => (view === 'week' ? a + dir * 7 * DAY : new Date(new Date(a).getFullYear(), new Date(a).getMonth() + dir, 1).getTime()))

  /** For a future day with few posts, the network furthest below Sage's weekly cadence. */
  const recommend = (day: number): Network | null => {
    if (day < todayStart || inDay(day).length >= 2 || view !== 'week') return null
    const weekPosts = s.publishing.posts.filter(p => p.at >= start && p.at < start + 7 * DAY && p.status !== 'draft')
    const gaps = (Object.keys(CADENCE) as Network[]).map(n => ({ n, gap: (CADENCE[n] ?? 0) - weekPosts.filter(p => p.network === n).length })).filter(g => g.gap > 0).sort((a, b) => b.gap - a.gap)
    const taken = new Set(inDay(day).map(p => p.network))
    return gaps.find(g => !taken.has(g.n))?.n ?? null
  }

  const drop = (e: DragEvent, day: number) => {
    e.preventDefault(); setOver(null)
    const id = e.dataTransfer.getData('text/post')
    const p = s.publishing.posts.find(x => x.id === id)
    if (!p) return
    const t = new Date(p.at)
    const at = day + (t.getHours() * 60 + t.getMinutes()) * 60_000
    if (at < now) { d({ type: 'core/toast', toast: { agent: 'atlas', text: 'That slot is in the past. Pick today or later.' } }); return }
    d({ type: 'publishing/move', id, at })
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
          <Menu trigger={<button className="ib-select cmp-select">{network === 'all' ? 'All networks' : NETWORK_LABEL[network]}<ChevronDown size={14} /></button>}
            items={[{ label: 'All networks', onSelect: () => setNetwork('all') }, ...PUBLISH_NETWORKS.map(n => ({ label: NETWORK_LABEL[n], icon: <Net n={n} />, onSelect: () => setNetwork(n) }))]} />
          <Seg name="calview" label="Calendar view" size="sm" value={view} onChange={setView} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
        </div>
      </div>

      {view === 'week' ? (
        <div className="cal-week">
          {cells.map(day => {
            const items = inDay(day)
            const rec = recommend(day)
            const recKey = `${day}-${rec}`
            const past = day + DAY <= now
            return (
              <section key={day} className={`cal-day ${day === todayStart ? 'today' : ''} ${past ? 'past' : ''} ${over === day ? 'over' : ''}`} aria-label={new Date(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                onDragOver={e => { if (!past) { e.preventDefault(); setOver(day) } }} onDragLeave={() => setOver(o => (o === day ? null : o))} onDrop={e => drop(e, day)}>
                <h3><span>{new Date(day).toLocaleDateString('en-GB', { weekday: 'short' })}</span> <b className="num">{new Date(day).getDate()}</b>{items.length > 0 && <span className="faint num">{items.length}</span>}</h3>
                {items.map(p => <PostChip key={p.id} p={p} onOpen={() => nav(`/publishing/post/${p.id}`)} />)}
                {rec && !asked.includes(recKey) && (
                  <button className="cal-rec" onClick={() => { d({ type: 'publishing/askFill', day: Math.round((day - T(0, 0, 0)) / DAY), network: rec }); setAsked(a => [...a, recKey]) }}>
                    <span className="row tight"><Net n={rec} /><span className="mono">{BEST_SLOT[rec].time}</span><span className="faint">Recommended</span></span>
                    <span className="row tight"><Sparkles size={12} />Ask Atlas to fill</span>
                  </button>
                )}
                {!items.length && !rec && <div className="cal-empty">{past ? 'Nothing posted' : 'Nothing planned'}</div>}
              </section>
            )
          })}
        </div>
      ) : (
        <div className="cal-month">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => <div key={x} className="cal-dow faint">{x}</div>)}
          {cells.map(day => {
            const items = inDay(day)
            const other = new Date(day).getMonth() !== new Date(anchor).getMonth()
            return (
              <button key={day} className={`cal-cell ${other ? 'other' : ''} ${day === todayStart ? 'today' : ''}`}
                onClick={() => { const dow = (new Date(day).getDay() + 6) % 7; setAnchor(day - dow * DAY); setView('week') }} aria-label={`${new Date(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}, ${items.length} posts`}>
                <span className="num">{new Date(day).getDate()}</span>
                {items.slice(0, 3).map(p => <span key={p.id} className={`cal-mini ${p.status}`}><Net n={p.network} /><span className="mono">{hhmm(p.at)}</span></span>)}
                {items.length > 3 && <span className="faint cal-more">+{items.length - 3} more</span>}
              </button>
            )
          })}
        </div>
      )}
      <p className="faint cal-hint">Drag a post to another day to move it. Atlas tells you if the new slot is worse.</p>
    </div>
  )
}

function PostChip({ p, onOpen }: { p: Post; onOpen: () => void }) {
  const draggable = p.status !== 'published'
  return (
    <article className={`cal-post ${p.status}`} draggable={draggable} onDragStart={e => { e.dataTransfer.setData('text/post', p.id); e.dataTransfer.effectAllowed = 'move' }}>
      <button className="cal-post-btn" onClick={onOpen} aria-label={`${NETWORK_LABEL[p.network]} ${hhmm(p.at)}: ${p.text}`}>
        <div className="row nowrap tight"><Net n={p.network} /><span className="mono">{hhmm(p.at)}</span><span className="spacer" />{p.author === 'atlas' ? <Mark agent="atlas" /> : <span className="avatar" style={{ width: 18, height: 18, fontSize: 9 }}>SR</span>}</div>
        {p.media && <span className="cal-photo"><Photo name={p.media} /></span>}
        <p>{p.text}</p>
        {p.stats && <span className="faint cal-stats">{k(p.stats.reach)} reach · {p.stats.er}% engagement</span>}
        {(p.status === 'needs' || p.status === 'draft' || p.status === 'failed') && <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>}
        {p.campaign && <span className="chip">{p.campaign}</span>}
        {p.note && <span className="faint cal-note">{p.note}</span>}
      </button>
    </article>
  )
}

/* ---------- Drafts ---------- */
function Drafts() {
  const { s, d } = useStore()
  const nav = useNavigate()
  const [who, setWho] = useState<'all' | 'atlas' | 'you'>('all')
  const posts = s.publishing.posts.filter(p => p.status === 'draft' && (who === 'all' || p.author === who)).sort((a, b) => a.at - b.at)
  const onDesk = s.handoffs.filter(h => h.agent === 'atlas' && h.preview?.type === 'post' && (who === 'all' || who === 'atlas'))
  return (
    <div className="stack">
      <Filters label="Author" value={who} onChange={setWho} items={[{ value: 'all', label: 'Everyone' }, { value: 'atlas', label: 'Atlas' }, { value: 'you', label: 'You' }]} />
      {onDesk.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>Waiting for your approval</h2><Link to="/" className="btn sm ghost">Open the Desk</Link></div>
          <ul className="rows">{onDesk.map(h => h.preview?.type === 'post' && (
            <li key={h.id} className="draft-row">
              <span className="draft-thumb">{h.preview.media ? <Photo name={h.preview.media} /> : <FileText size={16} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="row tight"><Net n={h.preview.network} /><span className="mono faint">{h.preview.slot}</span>{h.lane === 'claire' && <Pill tone="signal">With Claire</Pill>}</div><p className="ellipsis">{h.title}</p></div>
              <Link to="/" className="btn sm">Review on Desk</Link>
            </li>
          ))}</ul>
        </section>
      )}
      {!posts.length ? <Empty icon={<FileText size={18} />} title="No drafts" body="Drafts you save and posts Atlas prepares without a slot show up here." action={<Btn onClick={() => nav('/publishing/new')}><Plus size={14} />New post</Btn>} /> : (
        <section className="card">
          <ul className="rows">{posts.map(p => (
            <li key={p.id} className="draft-row">
              <span className="draft-thumb">{p.media ? <Photo name={p.media} /> : <FileText size={16} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row tight"><Net n={p.network} /><span className="mono faint">{new Date(p.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {hhmm(p.at)}</span><span className="faint">· {p.pillar}</span></div>
                <p className="ellipsis">{p.text}</p>
                {p.note && <span className="faint" style={{ fontSize: 12 }}>{p.note}</span>}
              </div>
              {p.author === 'atlas' ? <Mark agent="atlas" /> : <span className="avatar" style={{ width: 22, height: 22, fontSize: 10 }}>SR</span>}
              <Btn size="sm" onClick={() => nav(`/publishing/post/${p.id}`)}>Open</Btn>
              <Btn size="sm" variant="ghost" icon aria-label="Delete draft" onClick={() => d({ type: 'publishing/delete', id: p.id })}><Trash2 size={14} /></Btn>
            </li>
          ))}</ul>
        </section>
      )}
    </div>
  )
}

/* ---------- Media ---------- */
function MediaLibrary() {
  const { s, d } = useStore()
  const nav = useNavigate()
  const [tag, setTag] = useState('All')
  const [open, setOpen] = useState<Media | null>(null)
  const tags = useMemo(() => ['All', ...Array.from(new Set(MEDIA.flatMap(m => m.tags)))], [])
  const list = MEDIA.filter(m => tag === 'All' || m.tags.includes(tag))
  const missing = s.handoffs.find(h => h.id === 'h-visual')
  const useCount = (m: Media) => m.used + s.publishing.posts.filter(p => p.media === m.name && p.status !== 'published').length

  return (
    <div className="stack">
      {missing && (
        <section className="media-missing card pad">
          <ImageOff size={18} />
          <div style={{ flex: 1 }}>
            <b>Atlas needs a visual for Wednesday’s LinkedIn post</b>
            <p className="muted">“Our repair programme in numbers.” No photo shows a repair, and Atlas never uses stock photos.</p>
          </div>
          <Btn variant="primary" onClick={() => d({ type: 'core/resolve', id: missing.id, decision: { kind: 'option', index: 0, option: missing.options?.[0]?.label ?? 'Use the workshop photo' } })}>Use the workshop photo</Btn>
          <Btn onClick={() => d({ type: 'core/resolve', id: missing.id, decision: { kind: 'option', index: 2, option: missing.options?.[2]?.label ?? 'Move the post to next week' } })}>Move the post</Btn>
        </section>
      )}
      <Filters label="Filter media" value={tag} onChange={setTag} items={tags.map(t => ({ value: t, label: t }))} />
      <ul className="media-grid">
        {list.map(m => (
          <li key={m.id}>
            <button className="media-tile" onClick={() => setOpen(m)}>
              <span className="media-photo"><Photo name={m.name} alt={m.title} /></span>
              <span className="media-meta"><b className="ellipsis">{m.title}</b><span className="faint">Used {useCount(m)} times · added {m.added}</span></span>
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
              <div><dt>Tags</dt><dd className="row tight">{open.tags.map(t => <span key={t} className="chip">{t}</span>)}</dd></div>
            </dl>
          </div>
        )}
      </Sheet>
    </div>
  )
}
