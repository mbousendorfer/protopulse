import { useMemo, useState } from 'react'
import ManageCompetitors from './Manage'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Download, Eye, EyeOff, MessageSquareReply, Pause, Pencil, Play, Plus, Send, Settings2, Star, Tag, Trash2, TriangleAlert } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { ago, dayLabel } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import {
  COMPETITORS, EVENTS, FERNWAY_ROW, LESSONS, TOP_POSTS, TRENDS,
  type CompEvent, type CompetitorId, type Mention, type Search, type Sentiment,
} from '../../data/listening'
import { MENTION_NET, MENTION_TAGS, type EventState, type MentionOp } from './slice'
import { allMentions, sentimentOf, visibleMentions } from './model'
import { BulkBar, SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { downloadFile, toCSV } from '../insights/alerts'
import { Btn, Empty, Filters, Mark, Menu, Modal, Net, PageHead, Pill, Sheet, Switch, Tabs } from '../../ui'
import { Notice, Reopen, UndoBar } from '../../ui/Feedback'
import { StackBar } from '../../ui/charts'
import './listening.css'
import { SocialAvatar } from '../../ui/SocialAvatar'


type Tab = 'competitors' | 'mentions' | 'trends' | 'searches'
const compName = (id: CompetitorId) => COMPETITORS.find(c => c.id === id)!.name

export default function ListeningPage() {
  const loc = useLocation()
  const nav = useNavigate()
  const { s } = useStore()
  const seg = loc.pathname.split('/')[2] ?? ''
  const tab: Tab = (['mentions', 'trends', 'searches'] as Tab[]).includes(seg as Tab) ? (seg as Tab) : 'competitors'
  const watched = new Set(s.listening.watch.filter(w => w.tracking).map(w => w.id))
  const openEvents = EVENTS.filter(e => watched.has(e.competitor) && eventState(s.listening.events[e.id], e) === null).length
  return (
    <div className="page listening">
      <PageHead agent="echo" title="Listening" lede={`Echo watches ${s.listening.watch.filter(w => w.tracking).length} competitors, your mentions and the trends around you, and turns each signal into a move.`} />
      <Tabs value={tab} onChange={v => nav(`/listening/${v}`)} items={[
        { value: 'competitors', label: 'Competitors', count: openEvents },
        { value: 'mentions', label: 'Mentions', count: visibleMentions(s).length },
        { value: 'trends', label: 'Trends', count: TRENDS.length },
        { value: 'searches', label: 'Searches', count: s.listening.searches.length },
      ]} />
      <Notice scope="listening" className="mb-3" />
      <Routes>
        <Route index element={<Competitors view="events" />} />
        <Route path="competitors" element={<Competitors view="events" />} />
        <Route path="competitors/benchmark" element={<Competitors view="benchmark" />} />
        <Route path="competitors/manage" element={<ManageCompetitors />} />
        <Route path="competitors/profile/:cid" element={<Profile />} />
        <Route path="competitors/:id" element={<EventView />} />
        <Route path="mentions" element={<Mentions />} />
        <Route path="trends" element={<Trends />} />
        <Route path="searches" element={<Searches />} />
        <Route path="*" element={<Competitors view="events" />} />
      </Routes>
    </div>
  )
}

/** Current status of an event: from the slice, else seeded as already handled, else open (null). */
function eventState(st: EventState | undefined, e: CompEvent): Omit<EventState, 'at'> | null {
  if (st) return st
  if (e.done) return { status: 'done', move: e.done.move, result: e.done.result }
  return null
}

const IMPACT_TONE = { High: 'alert', Medium: 'caution', Low: undefined } as const

/* ---------- Competitors ---------- */
function Competitors({ view }: { view: 'events' | 'benchmark' }) {
  const nav = useNavigate()
  const { s } = useStore()
  return (
    <div className="stack lg">
      <div className="row between">
        <Filters label="View" value={view} onChange={v => nav(v === 'events' ? '/listening/competitors' : '/listening/competitors/benchmark')}
          items={[{ value: 'events', label: 'Events' }, { value: 'benchmark', label: 'Benchmark' }]} />
        <Link to="/listening/competitors/manage" className="btn sm"><Settings2 size={14} />Manage competitors<span className="faint num">{s.listening.watch.filter(w => w.tracking).length}</span></Link>
      </div>
      {view === 'events' ? <Events /> : <Benchmark />}
    </div>
  )
}

function Events() {
  const { s } = useStore()
  const now = useNow()
  const [comp, setComp] = useState<'all' | CompetitorId>('all')
  const [status, setStatus] = useState<'open' | 'handled' | 'all'>('open')
  const watched = new Set(s.listening.watch.filter(w => w.tracking).map(w => w.id))
  const list = EVENTS.filter(e => watched.has(e.competitor) && (comp === 'all' || e.competitor === comp))
    .filter(e => { const st = eventState(s.listening.events[e.id], e); return status === 'all' || (status === 'open' ? !st : !!st) })
    .sort((a, b) => b.at - a.at)
  return (
    <div className="stack">
      <div className="row">
        <Filters label="Status" value={status} onChange={setStatus} items={[{ value: 'open', label: 'Needs a move' }, { value: 'handled', label: 'Handled' }, { value: 'all', label: 'All' }]} />
        <span className="spacer" />
        <Filters label="Competitor" value={comp} onChange={setComp} items={[{ value: 'all', label: 'All competitors' }, ...COMPETITORS.filter(c => watched.has(c.id)).map(c => ({ value: c.id as 'all' | CompetitorId, label: c.name }))]} />
      </div>
      {!list.length && <Empty icon={<Check size={18} />} title={status === 'open' ? 'Every competitor move has an answer' : 'Nothing here'} body="Echo raises launches, price changes, campaigns and viral posts as they happen." />}
      <ul className="events">
        {list.map(e => {
          const st = eventState(s.listening.events[e.id], e)
          return (
            <li key={e.id}>
              <Link to={`/listening/competitors/${e.id}`} className="card event-row">
                <div className="event-top">
                  <span className="row tight"><SocialAvatar name={compName(e.competitor)} network={e.proof.network} org size={24} /><b>{compName(e.competitor)}</b><span className="chip">{e.type}</span></span>
                  <span className="mono faint">{ago(e.at, now)}</span>
                </div>
                <h3>{e.title}</h3>
                <p className="muted ellipsis">{e.read}</p>
                <div className="row">
                  <Pill tone={IMPACT_TONE[e.impact]}>{e.impact} impact</Pill>
                  {st ? <span className={`ev-status ${st.status}`}><Check size={13} />{st.result}</span> : <span className="ev-status open">{e.moves.length} counter-moves ready</span>}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function EventView() {
  const { id } = useParams()
  const { s, d } = useStore()
  const now = useNow()
  const nav = useNavigate()
  const e = EVENTS.find(x => x.id === id)
  if (!e) return <Empty title="This event doesn’t exist" action={<Btn onClick={() => nav('/listening/competitors')}>All events</Btn>} />
  const st = eventState(s.listening.events[e.id], e)
  const c = COMPETITORS.find(x => x.id === e.competitor)!
  return (
    <div className="event-layout">
      <div className="stack">
        <Btn variant="ghost" size="sm" onClick={() => nav('/listening/competitors')} className="self-start"><ArrowLeft size={14} />All events</Btn>
        <div className="row tight"><Link to={`/listening/competitors/profile/${c.id}`}><b>{c.name}</b></Link><span className="chip">{e.type}</span><span className="mono faint">{dayLabel(e.at, now)} · {ago(e.at, now)}</span></div>
        <h1 className="event-title">{e.title}</h1>
        <section className="card pad proof">
          <div className="faint proof-label row tight"><SocialAvatar name={c.handle} network={e.proof.network} org size={24} />Proof · {NETWORK_LABEL[e.proof.network]} · {c.handle}</div>
          <blockquote>{e.proof.text}</blockquote>
          <span className="mono">{e.proof.metric}</span>
        </section>
        <section className="card pad">
          <div className="section-title">Estimated impact <Pill tone={IMPACT_TONE[e.impact]}>{e.impact}</Pill></div>
          <p className="muted">{e.impactWhy}</p>
        </section>
        <section className="card pad echo-read">
          <Mark agent="echo" />
          <div><div className="section-title mb-1">Echo’s read</div><p>{e.read}</p></div>
        </section>
      </div>
      <aside className="card pad stack moves">
        <h2 className="side-title">Counter-moves</h2>
        {st ? (
          <div className={`move-done ${st.status}`}>
            <Check size={16} />
            <div><b>{st.move}</b><p>{st.result}</p>
              {st.status === 'handed' && <Link to="/" className="btn sm">Review on Desk</Link>}
              {s.listening.events[e.id]?.status === 'dismissed' && <button type="button" className="link-btn t-sm" onClick={() => d({ type: 'listening/reopen', kind: 'events', id: e.id })}>Undo</button>}
            </div>
          </div>
        ) : (
          <ol className="move-list">
            {e.moves.map((m, i) => (
              <li key={m.label}>
                <button className={`choice ${i === 0 && m.kind !== 'none' ? 'rec' : ''}`} onClick={() => d({ type: 'listening/move', event: e.id, index: i })}>
                  {m.kind !== 'none' && <Mark agent={m.agent} />}
                  <span className="move-label">{m.label}</span>
                  {i === 0 && m.kind !== 'none' && <span className="rec-tag"><Star size={12} aria-hidden />Recommended</span>}
                  <ArrowRight size={16} className="go" aria-hidden />
                </button>
              </li>
            ))}
          </ol>
        )}
        <p className="faint t-xs">Anything that answers a competitor in public stays locked to Suggest: you publish it yourself.</p>
      </aside>
    </div>
  )
}

function Benchmark() {
  const { s, d } = useStore()
  const [comp, setComp] = useState<'all' | CompetitorId>('all')
  // Only competitors Echo still watches: a removed or paused one leaves the benchmark, as the Manage page promises.
  const watched = new Set(s.listening.watch.filter(w => w.tracking).map(w => w.id))
  const tracked = COMPETITORS.filter(c => watched.has(c.id))
  const rows = [{ id: 'fernway', ...FERNWAY_ROW, us: true }, ...tracked.map(c => ({ ...c, us: false }))]
  const posts = TOP_POSTS.filter(p => watched.has(p.competitor) && (comp === 'all' || p.competitor === comp))
  return (
    <div className="stack lg">
      <section className="card">
        <div className="card-head"><h2>Side by side <span className="faint">· last 30 days</span></h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Brand</th><th className="r">Followers</th><th className="r">Growth per month</th><th className="r">Posts per week</th><th className="r">Engagement rate</th><th>Main formats</th><th className="r">Share of voice</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.name} className={r.us ? 'us' : ''}>
                  <td>{r.us ? <b>{r.name}</b> : <Link to={`/listening/competitors/profile/${r.id}`}>{r.name}</Link>}</td>
                  <td className="r">{(r.followers / 1000).toFixed(0)}k</td>
                  <td className="r">+{r.growth}%</td>
                  <td className="r">{r.cadence}</td>
                  <td className="r">{r.er}%</td>
                  <td className="muted">{r.formats}</td>
                  <td className="r">{r.sov}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-body">
          <div className="faint caption">Share of voice · mentions in the last 30 days</div>
          <StackBar h={10} parts={rows.map((r, i) => ({ label: r.name, value: r.sov, color: r.us ? 'var(--chart)' : `color-mix(in srgb, var(--ink-3) ${Math.round((0.7 - i * 0.12) * 100)}%, transparent)` }))} />
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2 className="row tight"><Mark agent="echo" />Lessons</h2><span className="faint">What Echo would test, from what works for them</span></div>
        <ul className="rows">
          {LESSONS.map(l => {
            const st = s.listening.lessons[l.id]
            return (
              <li key={l.id} className={`lesson ${st ?? ''}`}>
                <div>
                  <b>{l.text}</b>
                  <p className="muted">{l.evidence}</p>
                  <p className="faint">Idea: {l.idea}</p>
                </div>
                {st === 'tested' ? <Pill tone="signal">Test on your Desk</Pill> : st === 'dismissed' ? <Reopen onUndo={() => d({ type: 'listening/reopen', kind: 'lessons', id: l.id })} /> : (
                  <div className="row nowrap">
                    <Btn size="sm" variant="primary" onClick={() => d({ type: 'listening/lesson', id: l.id, test: true })}>Test it</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => d({ type: 'listening/lesson', id: l.id, test: false })}>Dismiss</Btn>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Their top posts <span className="faint">· 30 days</span></h2>
          <Filters label="Competitor" value={comp} onChange={setComp} items={[{ value: 'all', label: 'All' }, ...tracked.map(c => ({ value: c.id as 'all' | CompetitorId, label: c.name }))]} />
        </div>
        <ul className="top-posts">
          {posts.map(p => (
            <li key={p.id}>
              <div className="row tight"><SocialAvatar name={compName(p.competitor)} network={p.network} org size={24} /><b>{compName(p.competitor)}</b><span className="faint">· {p.format}</span></div>
              <p className="tp-title">{p.title}</p>
              <p className="mono faint">{p.views} views · {p.er}% engagement</p>
              <p className="tp-take"><Mark agent="echo" /><span>{p.takeaway}</span></p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Profile() {
  const { cid } = useParams()
  const { s } = useStore()
  const now = useNow()
  const nav = useNavigate()
  const c = COMPETITORS.find(x => x.id === cid)
  if (!c) return <Empty title="Unknown competitor" action={<Btn onClick={() => nav('/listening/competitors')}>Competitors</Btn>} />
  const events = EVENTS.filter(e => e.competitor === c.id).sort((a, b) => b.at - a.at)
  return (
    <div className="stack lg">
      <Btn variant="ghost" size="sm" onClick={() => nav('/listening/competitors/benchmark')} className="self-start"><ArrowLeft size={14} />Benchmark</Btn>
      <header>
        <h1 className="event-title">{c.name} <span className="faint mono t-md">{c.handle}</span></h1>
        <p className="muted mw-70ch">{c.positioning}</p>
      </header>
      <dl className="grid-4 comp-stats">
        <div className="card pad stat"><dd><b className="num">{(c.followers / 1000).toFixed(0)}k</b></dd><dt className="label">Followers · you have {(FERNWAY_ROW.followers / 1000).toFixed(0)}k</dt></div>
        <div className="card pad stat"><dd><b className="num">{c.er}%</b></dd><dt className="label">Engagement rate · you {FERNWAY_ROW.er}%</dt></div>
        <div className="card pad stat"><dd><b className="num">{c.cadence}</b></dd><dt className="label">Posts per week · you {FERNWAY_ROW.cadence}</dt></div>
        <div className="card pad stat"><dd><b className="num">{c.sov}%</b></dd><dt className="label">Share of voice · you {FERNWAY_ROW.sov}%</dt></div>
      </dl>
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Recent events</h2></div>
          <ul className="rows">
            {events.map(e => {
              const st = eventState(s.listening.events[e.id], e)
              return (
                <li key={e.id} className="prof-ev">
                  <Link to={`/listening/competitors/${e.id}`}>{e.title}</Link>
                  <span className="row tight"><span className="chip">{e.type}</span><span className="mono faint">{ago(e.at, now)}</span>{st ? <span className="faint">· {st.status === 'dismissed' ? 'Dismissed' : 'Handled'}</span> : <Pill tone="caution">Needs a move</Pill>}</span>
                </li>
              )
            })}
          </ul>
        </section>
        <section className="card">
          <div className="card-head"><h2>Their top posts</h2><span className="faint">Hero product: {c.hero} · {c.price}</span></div>
          <ul className="rows">
            {TOP_POSTS.filter(p => p.competitor === c.id).map(p => (
              <li key={p.id} className="prof-ev">
                <span className="row tight"><Net n={p.network} />{p.title}</span>
                <span className="faint">{p.views} views · {p.er}% · {p.takeaway}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

/* ---------- Mentions ---------- */
const SENT_LABEL: Record<Sentiment, string> = { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' }

function Mentions() {
  const { s, d } = useStore()
  const now = useNow()
  const [params] = useSearchParams()
  const [sent, setSent] = useState<'all' | Sentiment>(() => (params.get('sentiment') as Sentiment) || 'all')
  const [product, setProduct] = useState(() => params.get('product') || 'all')
  const [risk, setRisk] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const mood = (m: Mention) => sentimentOf(s, m)
  const feed = allMentions(s)
  const all = feed.filter(m => (s.listening.mentions[m.id] === 'hidden') === hidden)
  const list = all.filter(m => (sent === 'all' || mood(m) === sent) && (product === 'all' || m.product === product) && (!risk || m.risk)).sort((a, b) => b.at - a.at)
  const count = (x: Sentiment) => all.filter(m => mood(m) === x).length
  const products = [...new Set(feed.map(m => m.product).filter(Boolean))] as string[]
  const ids = useMemo(() => list.map(m => m.id), [list.map(m => m.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(ids, `${sent}-${product}-${risk}-${hidden}`)
  const run = (op: MentionOp, extra: { tag?: string; sentiment?: Sentiment } = {}, which = [...sel.selected]) => { d({ type: 'listening/mentions', ids: which, op, ...extra }); sel.clear() }
  const exportCSV = () => downloadFile(`fernway-mentions-${new Date(now).toISOString().slice(0, 10)}.csv`, toCSV([
    ['Date', 'Author', 'Network', 'Sentiment', 'Reach', 'Product', 'At risk', 'Tags', 'Text'],
    ...list.map(m => [new Date(m.at).toISOString(), m.author, m.network, mood(m), m.reach, m.product ?? '', m.risk ? 'yes' : '', (s.listening.tags[m.id] ?? []).join('; '), m.text]),
  ]))
  const open = feed.find(m => m.id === openId)

  return (
    <div className="stack">
      <section className="card pad">
        <div className="faint caption">Sentiment of the last {all.length} mentions</div>
        <StackBar h={10} parts={[
          { label: 'Positive', value: count('positive'), color: 'var(--ok)' },
          { label: 'Neutral', value: count('neutral'), color: 'var(--ink-3)' },
          { label: 'Negative', value: count('negative'), color: 'var(--alert)' },
        ]} />
      </section>
      <div className="row">
        <Filters label="Sentiment" value={sent} onChange={setSent} items={[{ value: 'all', label: 'All' }, { value: 'positive', label: 'Positive', count: count('positive') }, { value: 'neutral', label: 'Neutral', count: count('neutral') }, { value: 'negative', label: 'Negative', count: count('negative') }]} />
        <Filters label="Product" value={product} onChange={setProduct} items={[{ value: 'all', label: 'All products' }, ...products.map(p => ({ value: p, label: p }))]} />
        <span className="spacer" />
        <Switch checked={risk} onChange={setRisk} label="At risk only" />
        <Switch checked={hidden} onChange={setHidden} label="Hidden" />
        <Btn size="sm" onClick={exportCSV} disabled={!list.length}><Download size={14} />Export CSV</Btn>
      </div>
      <BulkBar count={sel.count} noun={sel.count > 1 ? 'mentions selected' : 'mention selected'} onClear={sel.clear} actions={[
        { label: 'Ask Nova to reply', icon: <MessageSquareReply size={14} />, primary: true, onRun: () => run('nova') },
        hidden ? { label: 'Bring back', icon: <Eye size={14} />, onRun: () => run('unhide') } : { label: 'Hide', icon: <EyeOff size={14} />, onRun: () => run('hide') },
        { label: 'Hand to Atlas', icon: <Send size={14} />, onRun: () => run('atlas') },
      ]} />
      {!list.length ? <Empty title={hidden ? 'Nothing hidden' : 'No mentions match'} body={hidden ? 'Mentions you hide land here, and you can bring them back.' : 'Try another sentiment or product.'} action={!hidden ? <Btn onClick={() => { setSent('all'); setProduct('all'); setRisk(false) }}>Clear filters</Btn> : undefined} /> : (
        <section className="card">
          <div className="card-head"><span className="row tight"><SelectAll sel={sel} label="Select every mention shown" /><h2>{list.length} mention{list.length > 1 ? 's' : ''}</h2></span></div>
          <ul className="ls-mentions">
            {list.map(m => {
              const st = s.listening.mentions[m.id]
              const tags = s.listening.tags[m.id] ?? []
              const md = mood(m)
              return (
                <li key={m.id} className={sel.has(m.id) ? 'ls-picked' : ''}>
                  <SelectBox checked={sel.has(m.id)} visible={sel.count > 0} onToggle={shift => sel.toggle(m.id, shift)} label={`Select ${m.author}’s mention`} />
                  <button className="mention-main ls-open" onClick={e => (e.shiftKey || sel.count ? sel.toggle(m.id, e.shiftKey) : setOpenId(m.id))}>
                    <span className="row tight"><SocialAvatar name={m.author} network={MENTION_NET[m.network]} org={!m.author.startsWith('@')} size={24} /><b>{m.author}</b><span className="faint">{m.network}</span>
                      <span className={`ls-mood ${md}`}>{SENT_LABEL[md]}{s.listening.sentiment[m.id] ? ' · corrected' : ''}</span>
                      {m.product && <span className="chip">{m.product}</span>}{m.risk && <Pill tone="alert"><TriangleAlert size={11} />At risk</Pill>}
                      {tags.map(t => <span key={t} className="chip ls-tag">{t}</span>)}</span>
                    <span className="ls-text">{m.text}</span>
                    <span className="mono faint">{ago(m.at, now)} · reach {m.reach.toLocaleString('en-GB')}</span>
                  </button>
                  <div className="row nowrap">
                    {st === 'replied' ? <Pill tone="ok"><Check size={11} />Reply on your Desk</Pill> : st === 'handed' ? <Pill tone="signal">With Atlas</Pill> : (
                      <Btn size="xs" onClick={() => run('nova', {}, [m.id])}><MessageSquareReply size={12} />Ask Nova to reply</Btn>
                    )}
                    <Btn size="xs" variant="ghost" icon aria-label={hidden ? `Bring back ${m.author}’s mention` : `Hide ${m.author}’s mention`} onClick={() => run(hidden ? 'unhide' : 'hide', {}, [m.id])}>{hidden ? <Eye size={12} /> : <EyeOff size={12} />}</Btn>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {sel.count > 0 && (
        <div className="row ls-bulk-more">
          <Menu align="center" trigger={<Btn size="sm"><Tag size={14} />Tag<ChevronDown size={14} /></Btn>} items={MENTION_TAGS.map(t => ({ label: t, onSelect: () => run('tag', { tag: t }) }))} />
          <Menu align="center" trigger={<Btn size="sm">Correct sentiment<ChevronDown size={14} /></Btn>} items={(['positive', 'neutral', 'negative'] as Sentiment[]).map(x => ({ label: SENT_LABEL[x], onSelect: () => run('sentiment', { sentiment: x }) }))} />
        </div>
      )}

      <Sheet open={!!open} onOpenChange={o => !o && setOpenId(null)} title={open ? `${open.author} on ${open.network}` : ''}
        footer={open && <>
          <Btn variant="ghost" onClick={() => { run(s.listening.mentions[open.id] === 'hidden' ? 'unhide' : 'hide', {}, [open.id]); setOpenId(null) }}>{s.listening.mentions[open.id] === 'hidden' ? <><Eye size={14} />Bring back</> : <><EyeOff size={14} />Hide</>}</Btn>
          <span className="spacer" />
          {s.handoffs.some(h => h.ref === `mention-post:${open.id}`) || s.listening.mentions[open.id] === 'handed'
            ? <Btn disabled><Check size={14} />With Atlas</Btn>
            : <Btn onClick={() => run('atlas', {}, [open.id])}><Send size={14} />Hand to Atlas</Btn>}
          <Btn variant="primary" disabled={s.listening.mentions[open.id] === 'replied'} onClick={() => run('nova', {}, [open.id])}><MessageSquareReply size={14} />{s.listening.mentions[open.id] === 'replied' ? 'Reply on your Desk' : 'Ask Nova to reply'}</Btn>
        </>}>
        {open && (
          <div className="stack">
            <div className="row nowrap"><SocialAvatar name={open.author} network={MENTION_NET[open.network]} org={!open.author.startsWith('@')} size={40} /><div><b>{open.author}</b><div className="faint">{open.network} · {ago(open.at, now)}</div></div></div>
            <blockquote className="ls-quote">{open.text}</blockquote>
            <dl className="ls-facts">
              <div><dt>Reach</dt><dd className="num">{open.reach.toLocaleString('en-GB')} people</dd></div>
              <div><dt>Sentiment</dt><dd><span className={`ls-mood ${mood(open)}`}>{SENT_LABEL[mood(open)]}</span>{s.listening.sentiment[open.id] && <span className="faint"> · you corrected Echo</span>}</dd></div>
              {open.product && <div><dt>Product</dt><dd>{open.product}</dd></div>}
              <div><dt>Tags</dt><dd className="row tight">{(s.listening.tags[open.id] ?? []).map(t => <span key={t} className="chip ls-tag">{t}</span>)}
                <Menu align="start" trigger={<Btn size="xs" variant="ghost"><Tag size={12} />Add tag</Btn>} items={MENTION_TAGS.map(t => ({ label: t, onSelect: () => d({ type: 'listening/mentions', ids: [open.id], op: 'tag', tag: t }) }))} /></dd></div>
            </dl>
            <div className="row tight"><span className="faint">Correct the sentiment:</span>{(['positive', 'neutral', 'negative'] as Sentiment[]).map(x => (
              <button key={x} className="filter" aria-pressed={mood(open) === x} onClick={() => d({ type: 'listening/mentions', ids: [open.id], op: 'sentiment', sentiment: x })}>{SENT_LABEL[x]}</button>
            ))}</div>
            {open.risk && <p className="ls-risk"><TriangleAlert size={14} />Echo flags this one as a reputation risk. A reply within the hour keeps it from spreading.</p>}
          </div>
        )}
      </Sheet>
    </div>
  )
}

/* ---------- Trends ---------- */
function Trends() {
  const { s, d } = useStore()
  const [fit, setFit] = useState<'all' | 'High' | 'Medium' | 'Low'>('all')
  const list = TRENDS.filter(t => fit === 'all' || t.fit === fit)
  return (
    <div className="stack">
      <Filters label="Fit" value={fit} onChange={setFit} items={[{ value: 'all', label: 'All trends' }, { value: 'High', label: 'High fit' }, { value: 'Medium', label: 'Medium fit' }, { value: 'Low', label: 'Low fit' }]} />
      <div className="trend-grid">
        {list.map(t => {
          const st = s.listening.trends[t.id]
          return (
            <article key={t.id} className="card pad trend">
              <div className="row between">
                <h3>{t.name}</h3>
                <Pill tone={t.fit === 'High' ? 'ok' : t.fit === 'Medium' ? 'caution' : undefined}>{t.fit} fit</Pill>
              </div>
              <p className="mono faint">{t.networks} · {t.growth}</p>
              <p className="muted">{t.fitWhy}</p>
              <ul className="examples">{t.examples.map(x => <li key={x} className="faint">{x}</li>)}</ul>
              <div className="row">
                {st === 'handed' ? <Pill tone="signal"><Check size={11} />With Atlas · draft on your Desk</Pill>
                  : st === 'dismissed' ? <Reopen onUndo={() => d({ type: 'listening/reopen', kind: 'trends', id: t.id })} /> : (
                    <>
                      <Btn size="sm" variant="primary" onClick={() => d({ type: 'listening/trend', id: t.id, hand: true })}><Mark agent="atlas" />Hand to Atlas</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => d({ type: 'listening/trend', id: t.id, hand: false })}>Dismiss</Btn>
                    </>
                  )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Searches ---------- */
function Searches() {
  const { s, d } = useStore()
  const [edit, setEdit] = useState<Search | null>(null)
  const [removed, setRemoved] = useState<Search | null>(null)
  const blank: Search = { id: '', name: '', keywords: '', exclude: '', volume: 0 }
  return (
    <div className="stack">
      <div className="row between">
        <p className="muted">Echo checks every search every 15 minutes across social networks, news, blogs and forums.</p>
        <Btn variant="primary" onClick={() => setEdit(blank)}><Plus size={14} />New search</Btn>
      </div>
      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Search</th><th>Keywords</th><th>Excluded</th><th className="r">Mentions, 7 days</th><th>Status</th><th /></tr></thead>
            <tbody>
              {s.listening.searches.map(x => (
                <tr key={x.id} className={x.paused ? 'paused' : ''}>
                  <td><b>{x.name}</b></td>
                  <td className="muted kw">{x.keywords}</td>
                  <td className="faint kw">{x.exclude || '–'}</td>
                  <td className="r">{x.volume ? x.volume.toLocaleString('en-GB') : 'Collecting'}</td>
                  <td>{x.paused ? <Pill>Paused</Pill> : <Pill tone="ok" dot>Active</Pill>}</td>
                  <td>
                    <span className="row nowrap tight end">
                      <Btn size="xs" variant="ghost" icon aria-label={`Edit ${x.name}`} onClick={() => setEdit(x)}><Pencil size={12} /></Btn>
                      <Btn size="xs" variant="ghost" icon aria-label={x.paused ? `Resume ${x.name}` : `Pause ${x.name}`} onClick={() => d({ type: 'listening/searchToggle', id: x.id })}>{x.paused ? <Play size={12} /> : <Pause size={12} />}</Btn>
                      <Btn size="xs" variant="ghost" icon aria-label={`Delete ${x.name}`} onClick={() => { setRemoved(x); d({ type: 'listening/searchDelete', id: x.id }) }}><Trash2 size={12} /></Btn>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {removed && (
          <UndoBar className="m-3" onUndo={() => { d({ type: 'listening/searchSave', search: removed }); setRemoved(null) }} onDismiss={() => setRemoved(null)}>Deleted “{removed.name}”. Echo stopped tracking it.</UndoBar>
        )}
        {!s.listening.searches.length && <Empty title="No searches" body="Add one to start tracking a brand, product or topic." />}
      </section>
      <p className="faint t-sm">Echo raises spikes from her alert rules. <Link to="/agents/echo?tab=alerts">Edit Echo’s alert rules</Link></p>
      {edit && <SearchForm search={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function SearchForm({ search, onClose }: { search: Search; onClose: () => void }) {
  const { d } = useStore()
  const [v, setV] = useState(search)
  const valid = v.name.trim() && v.keywords.trim()
  const save = () => { if (valid) { d({ type: 'listening/searchSave', search: { ...v, name: v.name.trim() } }); onClose() } }
  return (
    <Modal open onOpenChange={o => !o && onClose()} title={search.id ? `Edit “${search.name}”` : 'New search'}
      footer={<><span className="spacer" /><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={save} disabled={!valid}>{search.id ? 'Save' : 'Start tracking'}</Btn></>}>
      <form className="stack" onSubmit={e => { e.preventDefault(); save() }}>
        <div className="field"><label htmlFor="sn">Name</label><input id="sn" className="input" autoFocus value={v.name} onChange={e => setV({ ...v, name: e.target.value })} placeholder="Winter campaign" /></div>
        <div className="field"><label htmlFor="sk">Keywords</label><input id="sk" className="input" value={v.keywords} onChange={e => setV({ ...v, keywords: e.target.value })} placeholder="Storm Jacket, #fernwaywinter" /><span className="hint">Separate with commas. Echo matches any of them.</span></div>
        <div className="field"><label htmlFor="se">Exclude</label><input id="se" className="input" value={v.exclude} onChange={e => setV({ ...v, exclude: e.target.value })} placeholder="storm warning" /></div>
      </form>
    </Modal>
  )
}
