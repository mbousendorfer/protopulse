import { Fragment, useMemo, useState } from 'react'
import ManageCompetitors from './Manage'
import NeedsYou, { EventNeedRow, IMPACT_TONE } from './Needs'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Download, Eye, EyeOff, MessageSquareReply, Pause, Pencil, Play, Plus, Send, Settings2, Star, Tag, Trash2, TriangleAlert } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import type { Network } from '../../app/types'
import { ago, dayLabel } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import {
  FERNWAY_ROW, LESSONS, TOP_POSTS, TRENDS,
  type CompEvent, type Mention, type Search, type Sentiment,
} from '../../data/listening'
import { MENTION_NET, type MentionOp } from './slice'
import { RULE_LABEL, ruleText, type TagDef, type TagRule } from './tags'
import { runsOf, eventState, listeningNeedsCount, openEvents, seenOf, unseenNeeds, benchNetworks, networkRead, networkRows, ourTop, theirTop, COLLAB_MIN_REACH, CREATOR_MIN_REACH, creatorsOf, type Creator, inSearch, searchLive, searchMentions, searchRead, moodCount, share, BACKFILL_MS, competitorName, competitorOf, competitorReady, competitorsOf, eventsOf, shareOfVoice, activeSearches, allMentions, searchCap, searchVolume, sentimentOf } from './model'
import { BulkBar, SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { downloadFile, toCSV } from '../insights/alerts'
import { Btn, Empty, Filters, Mark, Menu, Modal, Net, PageHead, Pill, Sheet, Switch, Tabs } from '../../ui'
import { CountBadge, Notice, Reopen, UndoBar } from '../../ui/Feedback'
import { StackBar } from '../../ui/charts'
import './listening.css'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { InfoPop } from '../../ui/More'


type Tab = 'needs' | 'competitors' | 'mentions' | 'creators' | 'trends' | 'searches'

export default function ListeningPage() {
  const loc = useLocation()
  const nav = useNavigate()
  const { s } = useStore()
  const seg = loc.pathname.split('/')[2] ?? ''
  // The landing is Needs you (PROMPT §3.9): what waits for Sam across Listening, before the feeds.
  const tab: Tab = (['competitors', 'mentions', 'creators', 'trends', 'searches'] as Tab[]).includes(seg as Tab) ? (seg as Tab) : 'needs'
  return (
    <div className="page listening">
      <PageHead agent="echo" title="Listening" lede="Echo turns what she hears into moves." />
      <Tabs value={tab} onChange={v => nav(v === 'needs' ? '/listening' : `/listening/${v}`)} items={[
        { value: 'needs', label: 'Needs you', count: listeningNeedsCount(s) },
        { value: 'competitors', label: 'Competitors', count: eventsOf(s).filter(e => s.listening.watch.some(w => w.tracking && w.id === e.competitor)).length },
        { value: 'mentions', label: 'Mentions', count: allMentions(s).filter(m => s.listening.mentions[m.id] !== 'hidden').length },
        { value: 'creators', label: 'Creators', count: creatorsOf(s).length },
        { value: 'trends', label: 'Trends', count: TRENDS.length },
        { value: 'searches', label: 'Searches', count: s.listening.searches.length },
      ]} />
      <Notice scope="listening" className="mb-3" />
      <Routes>
        <Route index element={<NeedsYou />} />
        <Route path="competitors" element={<Competitors view="events" />} />
        <Route path="competitors/benchmark" element={<Competitors view="benchmark" />} />
        <Route path="competitors/manage" element={<ManageCompetitors />} />
        <Route path="competitors/profile/:cid" element={<Profile />} />
        <Route path="competitors/:id" element={<EventView />} />
        <Route path="mentions" element={<Mentions />} />
        <Route path="creators" element={<Creators />} />
        <Route path="trends" element={<Trends />} />
        <Route path="searches" element={<Searches />} />
        <Route path="searches/:sid" element={<SearchView />} />
        <Route path="*" element={<NeedsYou />} />
      </Routes>
    </div>
  )
}

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

/** Events: the ones that need a move first, decided in place as on Needs you; then what was done about the others. */
function Events() {
  const { s, d } = useStore()
  const now = useNow()
  const [comp, setComp] = useState<string>('all')
  const [undo, setUndo] = useState<{ text: string; run: () => void } | null>(null)
  const watched = s.listening.watch.filter(w => w.tracking)
  const mine = (e: CompEvent) => comp === 'all' || e.competitor === comp
  const open = openEvents(s).filter(mine)
  const handled = eventsOf(s).filter(e => watched.some(w => w.id === e.competitor) && mine(e) && eventState(s, e)).sort((a, b) => b.at - a.at)
  const who = watched.find(w => w.id === comp)?.name
  return (
    <div className="stack">
      <Menu align="start" trigger={<Btn size="sm" className="self-start">{who ?? 'All competitors'}<ChevronDown size={14} /></Btn>}
        items={[{ label: 'All competitors', onSelect: () => setComp('all') }, ...watched.map(w => ({ label: w.name, hint: comp === w.id ? <Check size={14} aria-label="Current" /> : undefined, onSelect: () => setComp(w.id) }))]} />
      {undo && <UndoBar onUndo={() => { undo.run(); setUndo(null) }} onDismiss={() => setUndo(null)}>{undo.text}</UndoBar>}
      <section className="card needs" aria-label="Needs a move">
        <header className="need-head"><h2>Needs a move</h2><CountBadge n={open.length} /><span className="faint need-why">Anything public stays yours to publish</span></header>
        {open.length ? <ul>{open.map(e => <EventNeedRow key={e.id} e={e} onUndo={setUndo} />)}</ul>
          : <p className="need-empty">Nothing needs a move{who ? ` from ${who}` : ''}. Echo watches for launches, price cuts, campaigns and viral posts.</p>}
      </section>
      {handled.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>Handled <span className="faint num">{handled.length}</span></h2></div>
          <ul className="rows">
            {handled.map(e => {
              const st = eventState(s, e)!
              return (
                <li key={e.id} className="ev-done">
                  <SocialAvatar name={competitorName(s, e.competitor)} network={e.proof.network} org size={24} />
                  <div className="need-main">
                    <p className="need-title"><Link to={`/listening/competitors/${e.id}`}>{e.title}</Link></p>
                    <p className="need-line"><span className={`ev-status ${st.status}`}><Check size={14} aria-hidden />{st.result}</span></p>
                  </div>
                  <span className="mono faint">{ago(e.at, now)}</span>
                  {s.listening.events[e.id]?.status === 'dismissed' && <button type="button" className="link-btn t-sm" onClick={() => d({ type: 'listening/reopen', kind: 'events', id: e.id })}>Undo</button>}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function EventView() {
  const { id } = useParams()
  const { s, d } = useStore()
  const now = useNow()
  const nav = useNavigate()
  const e = eventsOf(s).find(x => x.id === id)
  if (!e) return <Empty title="This event doesn’t exist" action={<Btn onClick={() => nav('/listening/competitors')}>All events</Btn>} />
  const st = eventState(s, e)
  const c = competitorOf(s, e.competitor) ?? { id: e.competitor, name: competitorName(s, e.competitor), handle: competitorName(s, e.competitor) }
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
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const nets = benchNetworks(s)
  const net = nets.find(n => n === params.get('net')) ?? 'all'
  const [comp, setComp] = useState<string>('all')
  // Only competitors Echo still watches: a removed or paused one leaves the benchmark, as the Manage page promises.
  const watched = new Set(s.listening.watch.filter(w => w.tracking).map(w => w.id))
  const tracked = competitorsOf(s).filter(c => watched.has(c.id))
  const sov = shareOfVoice(s)
  const rows = [{ id: 'fernway', ...FERNWAY_ROW, us: true }, ...tracked.map(c => ({ ...c, us: false }))].map(r => ({ ...r, sov: sov[r.id] ?? 0 }))
  const backfilling = s.listening.watch.filter(w => w.tracking && !competitorReady(s, w))
  const posts = TOP_POSTS.filter(p => watched.has(p.competitor) && (comp === 'all' || p.competitor === comp) && (net === 'all' || p.network === net))
  return (
    <div className="stack lg">
      <Filters label="Network" value={net} onChange={v => setParams(v === 'all' ? {} : { net: v })} items={[{ value: 'all', label: 'All networks' }, ...nets.map(n => ({ value: n, label: NETWORK_LABEL[n] }))]} />
      {net !== 'all' ? <NetworkBench n={net} /> : <>
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
          {backfilling.map(w => <p key={w.id} className="row tight muted mb-2"><Mark agent="echo" />Echo is reading {w.name}’s last 30 days. Their row appears in about {Math.max(1, Math.ceil((w.since + BACKFILL_MS - now) / 60_000))} min.</p>)}
          <div className="faint caption">Share of voice · mentions in the last 30 days</div>
          <StackBar h={10} parts={rows.map((r, i) => ({ label: r.name, value: r.sov, color: r.us ? 'var(--chart)' : `color-mix(in srgb, var(--ink-3) ${Math.round((0.7 - i * 0.12) * 100)}%, transparent)` }))} />
        </div>
      </section>
      </>}

      <section className="card">
        <div className="card-head"><h2 className="row tight"><Mark agent="echo" />Lessons</h2><span className="faint">What Echo would test, from what works for them</span></div>
        <ul className="rows">
          {LESSONS.map(l => {
            const st = s.listening.lessons[l.id]
            return (
              <li key={l.id} className={`lesson ${st ?? ''}`}>
                <div>
                  <b>{l.text}</b>
                  <p className="muted">Idea: {l.idea} <InfoPop label="Proof">{l.evidence}</InfoPop></p>
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
          <Filters label="Competitor" value={comp} onChange={setComp} items={[{ value: 'all', label: 'All' }, ...tracked.map(c => ({ value: c.id, label: c.name }))]} />
        </div>
        <ul className="top-posts">
          {posts.map(p => (
            <li key={p.id}>
              <div className="row tight"><SocialAvatar name={competitorName(s, p.competitor)} network={p.network} org size={24} /><b>{competitorName(s, p.competitor)}</b><span className="faint">· {p.format}</span></div>
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
  const c = cid ? competitorOf(s, cid) : undefined
  const sov = shareOfVoice(s)
  if (!c) return <Empty title="Unknown competitor" action={<Btn onClick={() => nav('/listening/competitors')}>Competitors</Btn>} />
  const events = eventsOf(s).filter(e => e.competitor === c.id).sort((a, b) => b.at - a.at)
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
        <div className="card pad stat"><dd><b className="num">{sov[c.id] ?? 0}%</b></dd><dt className="label">Share of voice · you {sov.fernway}%</dt></div>
      </dl>
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Recent events</h2></div>
          <ul className="rows">
            {events.map(e => {
              const st = eventState(s, e)
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
            {!TOP_POSTS.some(p => p.competitor === c.id) && <li className="faint">Echo ranks their top posts once she has 30 days of them.</li>}
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
const PAGE = 20
const SENT_LABEL: Record<Sentiment, string> = { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' }

/** The mention feed. `scope` narrows it to one search (search page). */
function Mentions({ scope }: { scope?: (m: Mention) => boolean } = {}) {
  const { s, d } = useStore()
  const now = useNow()
  const [params] = useSearchParams()
  const [sent, setSent] = useState<'all' | Sentiment>(() => (params.get('sentiment') as Sentiment) || 'all')
  const [product, setProduct] = useState(() => params.get('product') || 'all')
  const [risk, setRisk] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [tag, setTag] = useState('all')
  const [managing, setManaging] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const TAGS = s.listening.tagDefs.map(t => t.name)
  const mood = (m: Mention) => sentimentOf(s, m)
  const feed = scope ? allMentions(s).filter(scope) : allMentions(s)
  const all = feed.filter(m => (s.listening.mentions[m.id] === 'hidden') === hidden)
  const list = all.filter(m => (sent === 'all' || mood(m) === sent) && (product === 'all' || m.product === product) && (!risk || m.risk) && (tag === 'all' || (s.listening.tags[m.id] ?? []).includes(tag))).sort((a, b) => b.at - a.at)
  const count = (x: Sentiment) => all.filter(m => mood(m) === x).length
  const products = [...new Set(feed.map(m => m.product).filter(Boolean))] as string[]
  // A page of rows: the feed reads like a list, not a wall. The rest is one click away; Select all takes what's shown.
  const [page, setPage] = useState(PAGE)
  const shown = list.slice(0, page)
  const sig = (m: Mention) => [mood(m), s.listening.sentiment[m.id] ? 1 : 0, m.product, m.risk ? 1 : 0, (s.listening.tags[m.id] ?? []).join()].join('|')
  const runs = runsOf(shown.map(sig))
  const ids = useMemo(() => shown.map(m => m.id), [shown.map(m => m.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(ids, `${sent}-${product}-${risk}-${hidden}`)
  const run = (op: MentionOp, extra: { tag?: string; sentiment?: Sentiment } = {}, which = [...sel.selected]) => { d({ type: 'listening/mentions', ids: which, op, ...extra }); sel.clear() }
  const exportCSV = () => downloadFile(`fernway-mentions-${new Date(now).toISOString().slice(0, 10)}.csv`, toCSV([
    ['Date', 'Author', 'Network', 'Sentiment', 'Reach', 'Product', 'At risk', 'Tags', 'Text'],
    ...list.map(m => [new Date(m.at).toISOString(), m.author, m.network, mood(m), m.reach, m.product ?? '', m.risk ? 'yes' : '', (s.listening.tags[m.id] ?? []).join('; '), m.text]),
  ]))
  const open = feed.find(m => m.id === openId)
  const unseen = unseenNeeds(s, list)

  return (
    <div className="stack">
      <section className="card pad">
        <div className="faint caption">Sentiment of the last {all.length} mentions</div>
        <StackBar h={10} format={all.length < 10 ? v => `${v}` : undefined} parts={[
          { label: 'Positive', value: count('positive'), color: 'var(--ok)' },
          { label: 'Neutral', value: count('neutral'), color: 'var(--ink-3)' },
          { label: 'Negative', value: count('negative'), color: 'var(--alert)' },
        ]} />
      </section>
      <div className="row">
        <Filters label="Sentiment" value={sent} onChange={setSent} items={[{ value: 'all', label: 'All' }, { value: 'positive', label: 'Positive', count: count('positive') }, { value: 'neutral', label: 'Neutral', count: count('neutral') }, { value: 'negative', label: 'Negative', count: count('negative') }]} />
        {products.length > 0 && <Menu align="start" trigger={<Btn size="sm">{product === 'all' ? 'All products' : product}<ChevronDown size={14} /></Btn>}
          items={[{ label: 'All products', onSelect: () => setProduct('all') }, ...products.map(p => ({ label: p, hint: product === p ? <Check size={14} aria-label="Current" /> : undefined, onSelect: () => setProduct(p) }))]} />}
        <Menu align="start" trigger={<Btn size="sm"><Tag size={14} />{tag === 'all' ? 'All tags' : tag}<ChevronDown size={14} /></Btn>}
          items={[{ label: 'All tags', onSelect: () => setTag('all') }, ...TAGS.map(t => ({ label: t, onSelect: () => setTag(t) })), 'sep', { label: 'Manage tags…', onSelect: () => setManaging(true) }]} />
        <span className="spacer" />
        <Switch checked={risk} onChange={setRisk} label="At risk only" />
        <Switch checked={hidden} onChange={setHidden} label="Hidden" />
      </div>
      <BulkBar count={sel.count} noun={sel.count > 1 ? 'mentions selected' : 'mention selected'} onClear={sel.clear} actions={[
        { label: 'Ask Nova to reply', icon: <MessageSquareReply size={14} />, primary: true, onRun: () => run('nova') },
        hidden ? { label: 'Unhide', icon: <Eye size={14} />, onRun: () => run('unhide') } : { label: 'Hide', icon: <EyeOff size={14} />, onRun: () => run('hide') },
        { label: 'Hand to Atlas', icon: <Send size={14} />, onRun: () => run('atlas') },
      ]}>
        <Menu align="center" trigger={<Btn size="sm" variant="ghost"><Tag size={14} />Tag<ChevronDown size={12} /></Btn>} items={TAGS.map(t => ({ label: t, onSelect: () => run('tag', { tag: t }) }))} />
        <Menu align="center" trigger={<Btn size="sm" variant="ghost">Sentiment<ChevronDown size={12} /></Btn>} items={(['positive', 'neutral', 'negative'] as Sentiment[]).map(x => ({ label: `Mark ${SENT_LABEL[x].toLowerCase()}`, onSelect: () => run('sentiment', { sentiment: x }) }))} />
      </BulkBar>
      {!list.length ? <Empty title={hidden ? 'Nothing hidden' : 'No mentions match'} body={hidden ? 'Mentions you hide land here, and you can unhide them.' : 'Try another sentiment or product.'} action={!hidden ? <Btn onClick={() => { setSent('all'); setProduct('all'); setRisk(false) }}>Clear filters</Btn> : undefined} /> : (
        <section className="card">
          <div className="card-head">
            <span className="row tight"><SelectAll sel={sel} label="Select every mention shown" /><h2>{list.length} mention{list.length > 1 ? 's' : ''}{unseen.length > 0 && <span className="faint"> · {unseen.length} new</span>}</h2></span>
            <span className="row tight">
              {unseen.length > 0 && <Btn size="sm" variant="ghost" onClick={() => d({ type: 'listening/seen', ids: unseen.map(m => m.id) })}><Check size={14} />Mark {unseen.length} as seen</Btn>}
              <Btn size="sm" onClick={exportCSV}><Download size={14} />Export CSV</Btn>
            </span>
          </div>
          <ul className="ls-mentions">
            {shown.map((m, i) => {
              const st = s.listening.mentions[m.id]
              const tags = s.listening.tags[m.id] ?? []
              const md = mood(m)
              // What a run of rows shares (sentiment, product, risk, tags) is said once, above the run (matrix §13).
              const grp = runs[i]
              const chips = <>
                <span className={`ls-mood ${md}`}>{SENT_LABEL[md]}{s.listening.sentiment[m.id] ? ' · corrected' : ''}</span>
                {m.product && <span className="chip">{m.product}</span>}{m.risk && <Pill tone="alert"><TriangleAlert size={12} />At risk</Pill>}
                {tags.map(t => <span key={t} className="chip ls-tag">{t}</span>)}
              </>
              return (
                <Fragment key={m.id}>
                {grp.start && <li className="ls-run"><span aria-hidden /><span className="row tight">{chips}<span className="faint">· {grp.n} mentions</span></span></li>}
                <li className={`${sel.has(m.id) ? 'ls-picked' : ''} ${seenOf(s, m) ? '' : 'ls-unseen'}`}>
                  <SelectBox checked={sel.has(m.id)} visible={sel.count > 0} onToggle={shift => sel.toggle(m.id, shift)} label={`Select ${m.author}’s mention`} />
                  <button className="mention-main ls-open" onClick={e => (e.shiftKey || sel.count ? sel.toggle(m.id, e.shiftKey) : (setOpenId(m.id), d({ type: 'listening/seen', ids: [m.id] })))}>
                    <span className="row tight"><SocialAvatar name={m.author} network={MENTION_NET[m.network]} org={!m.author.startsWith('@')} size={24} /><b>{m.author}</b><span className="faint">{m.network}</span>
                      {!grp.inside && chips}</span>
                    <span className="ls-text">{m.text}</span>
                    <span className="mono faint">{ago(m.at, now)} · reach {m.reach.toLocaleString('en-GB')}</span>
                  </button>
                  <div className="row nowrap">
                    {(s.listening.pendingTags[m.id] ?? []).map(t => <Btn key={t} size="xs" variant="ghost" aria-label={`Add Echo’s suggested tag ${t}`} onClick={() => d({ type: 'listening/tagAccept', id: m.id, tag: t })}><Plus size={12} />{t}</Btn>)}
                    {st === 'replied' ? <Pill tone="ok"><Check size={12} />Reply on your Desk</Pill> : st === 'handed' ? <Pill tone="signal">With Atlas</Pill> : (
                      <Btn size="xs" onClick={() => run('nova', {}, [m.id])} aria-label={`Ask Nova to reply to ${m.author}`}><Mark agent="nova" />Reply</Btn>
                    )}
                    <Btn size="xs" variant="ghost" icon aria-label={hidden ? `Unhide ${m.author}’s mention` : `Hide ${m.author}’s mention`} onClick={() => run(hidden ? 'unhide' : 'hide', {}, [m.id])}>{hidden ? <Eye size={12} /> : <EyeOff size={12} />}</Btn>
                  </div>
                </li>
                </Fragment>
              )
            })}
          </ul>
          {list.length > page && <button type="button" className="need-more" onClick={() => setPage(p => p + PAGE)}>Show {Math.min(PAGE, list.length - page)} more of {list.length - page}<ChevronDown size={14} /></button>}
        </section>
      )}

      {managing && <ManageTags onClose={() => setManaging(false)} />}
      <Sheet open={!!open} onOpenChange={o => !o && setOpenId(null)} title={open ? `${open.author} on ${open.network}` : ''}
        footer={open && <>
          <Btn variant="ghost" onClick={() => { run(s.listening.mentions[open.id] === 'hidden' ? 'unhide' : 'hide', {}, [open.id]); setOpenId(null) }}>{s.listening.mentions[open.id] === 'hidden' ? <><Eye size={14} />Unhide</> : <><EyeOff size={14} />Hide</>}</Btn>
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
                <Menu align="start" trigger={<Btn size="xs" variant="ghost"><Tag size={12} />Add tag</Btn>} items={TAGS.map(t => ({ label: t, onSelect: () => d({ type: 'listening/mentions', ids: [open.id], op: 'tag', tag: t }) }))} /></dd></div>
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
              <InfoPop label={`${t.examples.length} examples`}><ul className="stack gap-2">{t.examples.map(x => <li key={x}>{x}</li>)}</ul></InfoPop>
              <div className="row">
                {st === 'handed' ? <Pill tone="signal"><Check size={12} />With Atlas · draft on your Desk</Pill>
                  : st === 'dismissed' ? <Reopen onUndo={() => d({ type: 'listening/reopen', kind: 'trends', id: t.id })} /> : (
                    <>
                      {/* Orange only where Echo recommends it: a grid of eight orange buttons says nothing. */}
                      <Btn size="sm" variant={t.fit === 'High' ? 'primary' : undefined} onClick={() => d({ type: 'listening/trend', id: t.id, hand: true })}><Mark agent="atlas" />Hand to Atlas</Btn>
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
  const now = useNow()
  const [edit, setEdit] = useState<Search | null>(null)
  const [removed, setRemoved] = useState<Search | null>(null)
  const blank: Search = { id: '', name: '', keywords: '', exclude: '', volume: 0 }
  return (
    <div className="stack">
      <div className="row between">
        <p className="muted"><span className="num">{activeSearches(s)} of {searchCap(s)}</span> search slots in use <InfoPop label="How Echo searches">Echo checks every search every 15 minutes across social networks, news, blogs and forums.</InfoPop></p>
        <Btn variant="primary" onClick={() => setEdit(blank)} disabled={activeSearches(s) >= searchCap(s)}><Plus size={14} />New search</Btn>
      </div>
      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Search</th><th>Keywords</th><th>Excluded</th><th className="r">Mentions, 7 days</th><th>Status</th><th /></tr></thead>
            <tbody>
              {s.listening.searches.map(x => (
                <tr key={x.id} className={x.paused ? 'paused' : ''}>
                  <td><Link to={`/listening/searches/${x.id}`}><b>{x.name}</b></Link></td>
                  <td className="muted kw">{x.keywords}</td>
                  <td className="faint kw">{x.exclude || '–'}</td>
                  {(() => { const v = searchVolume(x, now, searchLive(s, x)); return <>
                    <td className="r num">{v.volume.toLocaleString('en-GB')}{v.collecting && <span className="faint"> so far</span>}</td>
                    <td>{x.paused ? <Pill>Paused</Pill> : v.collecting ? <Pill tone="caution" dot>Collecting · {Math.round(v.progress * 100)}%</Pill> : <Pill tone="ok" dot>Active</Pill>}</td>
                  </> })()}
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
        <div className="field"><label htmlFor="sk">Keywords</label><input id="sk" className="input" value={v.keywords} onChange={e => setV({ ...v, keywords: e.target.value })} placeholder="Storm Jacket, #fernwaywinter" /><span className="hint">Separate with commas. Echo matches any of them; every word of a keyword must be there.</span></div>
        <div className="field"><label htmlFor="se">Exclude</label><input id="se" className="input" value={v.exclude} onChange={e => setV({ ...v, exclude: e.target.value })} placeholder="storm warning" /></div>
      </form>
    </Modal>
  )
}

/* ---------- One search ---------- */
function SearchView() {
  const { sid } = useParams()
  const { s } = useStore()
  const now = useNow()
  const nav = useNavigate()
  const x = s.listening.searches.find(y => y.id === sid)
  if (!x) return <Empty title="This search doesn’t exist" body="It may have been deleted." action={<Btn onClick={() => nav('/listening/searches')}>All searches</Btn>} />
  const v = searchVolume(x, now, searchLive(s, x))
  const ms = searchMentions(s, x)
  const c = moodCount(s, ms)
  const authors = new Set(ms.map(m => m.author)).size
  const reach = ms.reduce((n, m) => n + m.reach, 0)
  return (
    <div className="stack lg">
      <Btn variant="ghost" size="sm" onClick={() => nav('/listening/searches')} className="self-start"><ArrowLeft size={14} />All searches</Btn>
      <header>
        <h1 className="event-title">{x.name}</h1>
        <p className="muted">{x.keywords}{x.exclude && <span className="faint"> · excluding {x.exclude}</span>}{x.paused && <> · <Pill>Paused</Pill></>}</p>
      </header>
      <section className="card pad echo-read">
        <Mark agent="echo" />
        <div><div className="section-title mb-1">Echo’s read</div><p>{searchRead(s, x)}</p></div>
      </section>
      <dl className="grid-4 comp-stats">
        <div className="card pad stat"><dd><b className="num">{v.volume.toLocaleString('en-GB')}</b></dd><dt className="label">Mentions, 7 days{v.collecting ? ` · collecting ${Math.round(v.progress * 100)}%` : ''}</dt></div>
        <div className="card pad stat"><dd><b className="num">{share(c.negative, c.total)}</b></dd><dt className="label">Negative · latest {c.total} filed</dt></div>
        <div className="card pad stat"><dd><b className="num">{authors}</b></dd><dt className="label">Unique authors · latest {c.total}</dt></div>
        <div className="card pad stat"><dd><b className="num">{reach >= 1000 ? `${Math.round(reach / 1000)}k` : reach}</b></dd><dt className="label">Reach · latest {c.total}</dt></div>
      </dl>
      {ms.length ? <Mentions scope={m => inSearch(x, m)} /> : <Empty title={v.collecting ? 'Echo is still collecting' : 'Nothing caught yet'} body={v.collecting ? 'Mentions show up here as Echo reads the last 7 days.' : 'Echo files every new match here, at most 15 minutes after it’s posted.'} />}
    </div>
  )
}

/* ---------- Creators ---------- */
const CREATOR_STATUS = { listed: 'Shortlisted', proposed: 'DM on your Desk', contacted: 'Contacted' } as const

function Creators() {
  const { s, d } = useStore()
  const [params, setParams] = useSearchParams()
  const list = creatorsOf(s)
  const fits = list.filter(c => c.fit && !s.listening.creators[c.handle])
  const open = list.find(c => c.handle === params.get('c'))
  const pick = (c?: Creator) => setParams(c ? { c: c.handle } : {})
  return (
    <div className="stack">
      <section className="card pad echo-read">
        <Mark agent="echo" />
        <div><div className="section-title mb-1">Echo’s read</div>
          <p>{fits.length ? `${fits.length} creator${fits.length > 1 ? 's' : ''} worth a collab: ${fits.map(c => c.handle).join(' and ')}.` : 'No new creator worth a collab. Echo tells you when one shows up.'} <InfoPop label="Who counts">Positive about Fernway, not paid by a brand, and reaching {COLLAB_MIN_REACH.toLocaleString('en-GB')} people or more.</InfoPop></p></div>
      </section>
      <section className="card">
        <div className="card-head"><h2>{list.length} creators talk about Fernway</h2><span className="faint">{CREATOR_MIN_REACH.toLocaleString('en-GB')}+ people reached</span></div>
        <ul className="rows">
          {list.map(c => {
            const st = s.listening.creators[c.handle]
            return (
              <li key={c.handle} className="ls-creator">
                <button type="button" className="ls-creator-main" onClick={() => pick(c)}>
                  <SocialAvatar name={c.handle} network={MENTION_NET[c.network]} size={32} />
                  <span className="ls-creator-text">
                    <span className="row tight"><b>{c.handle}</b><span className="faint">{c.name}</span></span>
                    <span className="faint t-sm">{c.followers.toLocaleString('en-GB')} followers · {c.mentions.length} mention{c.mentions.length > 1 ? 's' : ''} · <span className={`ls-mood ${c.mood}`}>{SENT_LABEL[c.mood]}</span>{c.also.length ? ` · also mentions ${c.also.map(a => a.competitor).join(', ')}` : ''}</span>
                    <span className="t-sm">{c.fitWhy}</span>
                  </span>
                </button>
                {/* The status or Shortlist always ends the row, so they line up from one creator to the next. */}
                <div className="row nowrap ls-creator-acts">
                  {c.fit && st !== 'proposed' && st !== 'contacted' && <Btn size="xs" onClick={() => d({ type: 'listening/creator', handle: c.handle, op: 'propose' })}><Mark agent="nova" />Propose a collab</Btn>}
                  {st ? <Pill tone={st === 'contacted' ? 'ok' : 'signal'}>{CREATOR_STATUS[st]}</Pill> : !c.signed && <Btn size="xs" variant="ghost" onClick={() => d({ type: 'listening/creator', handle: c.handle, op: 'list' })}>Shortlist</Btn>}
                </div>
              </li>
            )
          })}
        </ul>
      </section>
      <Sheet open={!!open} onOpenChange={o => !o && pick()} title={open ? `${open.handle} · ${open.name}` : ''}
        footer={open && <>
          {s.listening.creators[open.handle] === 'listed' && <Btn variant="ghost" onClick={() => d({ type: 'listening/creator', handle: open.handle, op: 'unlist' })}>Remove from shortlist</Btn>}
          <span className="spacer" />
          {open.fit && !['proposed', 'contacted'].includes(s.listening.creators[open.handle] ?? '') && <Btn variant="primary" onClick={() => d({ type: 'listening/creator', handle: open.handle, op: 'propose' })}><MessageSquareReply size={14} />Propose a collab</Btn>}
        </>}>
        {open && (
          <div className="stack">
            <dl className="ls-facts">
              <div><dt>Audience</dt><dd className="num">{open.followers.toLocaleString('en-GB')} followers on {open.network}</dd></div>
              <div><dt>Sentiment</dt><dd><span className={`ls-mood ${open.mood}`}>{SENT_LABEL[open.mood]}</span></dd></div>
              <div><dt>Also mentions</dt><dd>{open.also.length ? open.also.map(a => `${a.competitor} (${a.n})`).join(', ') : 'No competitor'}</dd></div>
              <div><dt>Echo’s call</dt><dd>{open.fitWhy}</dd></div>
            </dl>
            {open.history.length > 0 && <><div className="section-title">History</div><ul className="stack">{open.history.map(h => <li key={h} className="muted">{h}</li>)}</ul></>}
            <div className="section-title">Their mentions of Fernway</div>
            {open.mentions.map(m => <blockquote key={m.id} className="ls-quote">{m.text}</blockquote>)}
          </div>
        )}
      </Sheet>
    </div>
  )
}

/** One network side by side: Iris's numbers for Fernway, Echo's for the rivals, and Echo's reading. */
function NetworkBench({ n }: { n: Network }) {
  const { s, d } = useStore()
  const rows = networkRows(s, n)
  const read = networkRead(s, n)
  const mine = ourTop(n)
  const theirs = read.them && theirTop(n, read.them.id)
  return (
    <>
      <section className="card pad echo-read">
        <Mark agent="echo" />
        <div className="stack">
          <div><div className="section-title mb-1">Echo’s read · {NETWORK_LABEL[n]}</div><p>{read.text}</p></div>
          {read.them && read.them.er > (rows.find(r => r.us)?.er ?? 0) && <Btn size="sm" className="self-start" onClick={() => d({ type: 'listening/testFormat', network: n, competitor: read.them!.id })}><Mark agent="atlas" />Atlas tests their format</Btn>}
        </div>
      </section>
      <section className="card">
        <div className="card-head"><h2 className="row tight"><Net n={n} />{NETWORK_LABEL[n]} <span className="faint">· last 30 days</span></h2><span className="faint">Ranked by engagement rate</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Brand</th><th className="r">Followers</th><th className="r">Posts per week</th><th className="r">Engagement rate</th><th className="r">Rank</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className={r.us ? 'us' : ''}>
                  <td>{r.us ? <b>{r.name}</b> : <Link to={`/listening/competitors/profile/${r.id}`}>{r.name}</Link>}</td>
                  <td className="r">{(r.followers / 1000).toFixed(r.followers < 10000 ? 1 : 0)}k</td>
                  <td className="r">{r.perWeek}</td>
                  <td className="r">{r.er}%</td>
                  <td className="r">{r.rank} of {rows.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {(mine || theirs) && (
        <section className="card">
          <div className="card-head"><h2>Best post · yours and {read.them?.name ?? 'theirs'}</h2></div>
          <ul className="top-posts">
            {mine && <li><div className="row tight"><b>Fernway</b><span className="faint">· {mine.author}</span></div><p className="tp-title">{mine.title}</p><p className="mono faint">{mine.reach.toLocaleString('en-GB')} reach · {mine.er}% engagement</p></li>}
            {theirs && <li><div className="row tight"><b>{competitorName(s, theirs.competitor)}</b><span className="faint">· {theirs.format}</span></div><p className="tp-title">{theirs.title}</p><p className="mono faint">{theirs.views} views · {theirs.er}% engagement</p><p className="tp-take"><Mark agent="echo" /><span>{theirs.takeaway}</span></p></li>}
          </ul>
        </section>
      )}
    </>
  )
}

/* ---------- Tags ---------- */
function ManageTags({ onClose }: { onClose: () => void }) {
  const { s, d } = useStore()
  const used = (name: string) => Object.values(s.listening.tags).filter(ts => ts.includes(name)).length
  const save = (def: TagDef) => d({ type: 'listening/tagSave', def })
  const kinds: (TagRule['kind'] | 'none')[] = ['none', 'product', 'press', 'creator', 'competitor', 'word']
  return (
    <Modal open onOpenChange={o => !o && onClose()} title="Mention tags"
      footer={<><Btn variant="ghost" onClick={() => save({ id: '', name: `Tag ${s.listening.tagDefs.length + 1}` })}><Plus size={14} />New tag</Btn><span className="spacer" /><Btn variant="primary" onClick={onClose}>Done</Btn></>}>
      <p className="muted mb-3">Echo applies a tag’s rule to every mention she files. Changing a rule tags the matching mentions at once; Undo is in the journal.</p>
      <ul className="rows ls-tagdefs">
        {s.listening.tagDefs.map(t => (
          <li key={t.id}>
            <input className="input" defaultValue={t.name} aria-label={`Name of the tag ${t.name}`} onBlur={e => { const v = e.target.value.trim(); if (v && v !== t.name) save({ ...t, name: v }) }} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
            <Menu align="start" trigger={<Btn size="sm">{t.rule ? RULE_LABEL[t.rule.kind] : 'No rule'}<ChevronDown size={14} /></Btn>}
              items={kinds.map(k => ({ label: k === 'none' ? 'No rule' : RULE_LABEL[k], onSelect: () => save({ ...t, rule: k === 'none' ? undefined : { kind: k, value: k === 'word' ? t.rule?.value ?? '' : undefined } }) }))} />
            {t.rule?.kind === 'word' && <input className="input" defaultValue={t.rule.value} placeholder="repair, fix" aria-label={`Words for ${t.name}`} onBlur={e => { const v = e.target.value.trim(); if (v !== t.rule?.value) save({ ...t, rule: { kind: 'word', value: v } }) }} />}
            <span className="faint num ls-tag-used" title={ruleText(t.rule)}>{used(t.name)} mentions</span>
            <Btn size="xs" variant="ghost" icon aria-label={`Delete the tag ${t.name}`} onClick={() => d({ type: 'listening/tagDelete', id: t.id })}><Trash2 size={12} /></Btn>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
