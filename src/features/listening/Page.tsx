import { useMemo, useState } from 'react'
import ManageCompetitors from './Manage'
import NeedsYou, { IMPACT_TONE } from './Needs'
import { CompetitorCards, MoodBar } from './Overview'
import { LineChart } from '../../ui/charts'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Download, Eye, EyeOff, Frown, Meh, MessageSquareReply, Smile, Pause, Pencil, Play, Plus, Send, Settings2, Star, Tag, Trash2, TriangleAlert } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import type { Network } from '../../app/types'
import { ago, dayLabel } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { FERNWAY_ROW, LESSONS, TOP_POSTS, type Mention, type Search, type Sentiment } from '../../data/listening'
import { MENTION_NET, type MentionOp } from './slice'
import { RULE_LABEL, ruleText, type TagDef, type TagRule } from './tags'
import { eventState, listeningNeedsCount, seenOf, unseenNeeds, benchNetworks, networkRead, networkRows, ourTop, theirTop, inSearch, searchLive, searchMentions, searchRead, moodCount, share, BACKFILL_MS, competitorName, competitorOf, competitorReady, competitorsOf, eventsOf, shareOfVoice, activeSearches, allMentions, searchCap, searchVolume, sentimentOf, sovTrend, competitorMood } from './model'
import { BulkBar, SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { downloadFile, toCSV } from '../insights/alerts'
import { Btn, Empty, Filters, Mark, Menu, Modal, Net, PageHead, Pill, Sheet, Tabs } from '../../ui'
import { Notice, Reopen, UndoBar } from '../../ui/Feedback'
import './listening.css'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { InfoPop } from '../../ui/More'
import { plural } from './list'

type Tab = 'needs' | 'mentions' | 'competitors'

/** Old addresses (Desk cards, the journal, other agents) land on their new place: a dead route is a dead button. */
function Moved({ to }: { to: (p: URLSearchParams, id?: string) => string }) {
  const [params] = useSearchParams()
  const { sid } = useParams()
  return <Navigate to={to(params, sid)} replace />
}

export default function ListeningPage() {
  const loc = useLocation()
  const nav = useNavigate()
  const { s } = useStore()
  const seg = loc.pathname.split('/')[2] ?? ''
  // The landing is Needs you (PROMPT §3.9). Creators and trends are kinds of it; searches are a setting of Mentions.
  const tab: Tab = seg === 'mentions' || seg === 'competitors' ? seg : 'needs'
  return (
    <div className="page listening">
      <PageHead agent="echo" title="Listening" />
      <Tabs value={tab} onChange={v => nav(v === 'needs' ? '/listening' : `/listening/${v}`)} items={[
        { value: 'needs', label: 'Needs you', count: listeningNeedsCount(s) },
        { value: 'mentions', label: 'Mentions' },
        { value: 'competitors', label: 'Competitors' },
      ]} />
      <Notice scope="listening" className="mb-3" />
      <Routes>
        <Route index element={<NeedsYou />} />
        <Route path="competitors" element={<Benchmark />} />
        <Route path="competitors/benchmark" element={<Moved to={p => `/listening/competitors${p.get('net') ? `?net=${p.get('net')}` : ''}`} />} />
        <Route path="competitors/manage" element={<ManageCompetitors />} />
        <Route path="competitors/profile/:cid" element={<Profile />} />
        <Route path="competitors/:id" element={<EventView />} />
        <Route path="mentions" element={<Mentions />} />
        <Route path="creators" element={<Moved to={p => `/listening?kind=creators${p.get('c') ? `&c=${encodeURIComponent(p.get('c')!)}` : ''}`} />} />
        <Route path="trends" element={<Navigate to="/listening?kind=trends" replace />} />
        <Route path="searches" element={<Navigate to="/listening/mentions?searches=manage" replace />} />
        <Route path="searches/:sid" element={<Moved to={(_, sid) => `/listening/mentions?search=${sid}`} />} />
        <Route path="*" element={<NeedsYou />} />
      </Routes>
    </div>
  )
}

/* ---------- Competitors ---------- */
function EventView() {
  const { id } = useParams()
  const { s, d } = useStore()
  const now = useNow()
  const nav = useNavigate()
  const e = eventsOf(s).find(x => x.id === id)
  if (!e) return <Empty title="This event doesn’t exist" action={<Btn onClick={() => nav('/listening?kind=events')}>Competitor moves</Btn>} />
  const st = eventState(s, e)
  const c = competitorOf(s, e.competitor) ?? { id: e.competitor, name: competitorName(s, e.competitor), handle: competitorName(s, e.competitor) }
  return (
    <div className="event-layout">
      <div className="stack">
        <Btn variant="ghost" size="sm" onClick={() => nav('/listening?kind=events')} className="self-start"><ArrowLeft size={14} />Competitor moves</Btn>
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
      <div className="sl-bar flush">
        <Filters label="Network" value={net} onChange={v => setParams(v === 'all' ? {} : { net: v })} items={[{ value: 'all', label: 'All networks' }, ...nets.map(n => ({ value: n, label: NETWORK_LABEL[n] }))]} />
        <Link to="/listening/competitors/manage" className="btn sm ghost"><Settings2 size={14} />Manage competitors</Link>
      </div>
      {net !== 'all' ? <NetworkBench n={net} /> : <>
      <CompetitorCards />
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
        {backfilling.length > 0 && <div className="card-body">
          {backfilling.map(w => <p key={w.id} className="row tight muted"><Mark agent="echo" />Echo is reading {w.name}’s last 30 days. Their row appears in about {Math.max(1, Math.ceil((w.since + BACKFILL_MS - now) / 60_000))} min.</p>)}
        </div>}
      </section>
      </>}

      <section className="card">
        <div className="card-head"><h2 className="row tight"><Mark agent="echo" />Lessons</h2></div>
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
  const waiting = events.find(e => !eventState(s, e))
  const trend = sovTrend(s)
  const mood = competitorMood(c.id)
  const weeks = (trend.fernway ?? []).map((_, i, a) => (i === a.length - 1 ? 'This week' : `${a.length - 1 - i} wk ago`))
  const VS = [
    { k: 'Followers', them: `${(c.followers / 1000).toFixed(0)}k`, you: `${(FERNWAY_ROW.followers / 1000).toFixed(0)}k` },
    { k: 'Engagement rate', them: `${c.er}%`, you: `${FERNWAY_ROW.er}%` },
    { k: 'Posts per week', them: `${c.cadence}`, you: `${FERNWAY_ROW.cadence}` },
    { k: 'Share of voice', them: `${sov[c.id] ?? 0}%`, you: `${sov.fernway}%` },
  ]
  return (
    <div className="stack lg">
      <Btn variant="ghost" size="sm" onClick={() => nav('/listening/competitors')} className="self-start"><ArrowLeft size={14} />Competitors</Btn>
      <header className="comp-hero">
        <SocialAvatar name={c.name} org size={48} />
        <div className="grow">
          <h1 className="event-title">{c.name}</h1>
          <p className="muted">{c.handle} · {c.price}</p>
        </div>
        {waiting && <Link to={`/listening/competitors/${waiting.id}`} className="btn primary">Answer their {waiting.type.toLowerCase()}</Link>}
      </header>
      <p className="muted mw-70ch">{c.positioning}</p>
      <section className="card">
        <div className="card-head"><h2>Against you <span className="faint">· last 30 days</span></h2></div>
        <dl className="comp-vs">
          {VS.map(v => <div key={v.k}><dt>{v.k}</dt><dd><b className="num">{v.them}</b><span>you {v.you}</span></dd></div>)}
        </dl>
        <div className="comp-charts">
          <div>
            <div className="section-title">Share of voice <span className="faint">· 6 weeks</span></div>
            <LineChart h={160} labels={weeks} format={v => `${Math.round(v)}%`} label={`Share of voice, ${c.name} and Fernway, last 6 weeks`}
              series={[{ name: c.name, data: trend[c.id] ?? [], tone: 'faint', dashed: true }, { name: 'Fernway', data: trend.fernway ?? [] }]} />
          </div>
          <div>
            <div className="section-title">How people talk about them <span className="faint">· 30 days</span></div>
            <MoodBar positive={mood.positive} negative={mood.negative} label={`How people talk about ${c.name}`} />
          </div>
        </div>
      </section>
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
const MOOD_ICON = { positive: Smile, neutral: Meh, negative: Frown } as const
type MShow = 'all' | Sentiment | 'risk' | 'hidden'
const MSHOW_LABEL: Record<MShow, string> = { all: 'All', negative: 'Negative', neutral: 'Neutral', positive: 'Positive', risk: 'At risk', hidden: 'Hidden' }

/** The mention feed as a standard list (matrix §14): sentiment and state are filters, the search and product or tag
 *  are menus, searches are managed from the search menu. */
function Mentions() {
  const { s, d } = useStore()
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const [show, setShow] = useState<MShow>(() => (params.get('sentiment') as Sentiment) || 'all')
  const [product, setProduct] = useState(() => params.get('product') || 'all')
  const [tag, setTag] = useState('all')
  const [managing, setManaging] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const setParam = (k: string, v?: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }) }
  const search = s.listening.searches.find(x => x.id === params.get('search'))
  const TAGS = s.listening.tagDefs.map(t => t.name)
  const mood = (m: Mention) => sentimentOf(s, m)
  const feed = search ? allMentions(s).filter(m => inSearch(search, m)) : allMentions(s)
  const visible = feed.filter(m => s.listening.mentions[m.id] !== 'hidden')
  const narrowed = (ms: Mention[]) => ms.filter(m => (product === 'all' || m.product === product) && (tag === 'all' || (s.listening.tags[m.id] ?? []).includes(tag)))
  const of = (k: MShow) => narrowed(k === 'hidden' ? feed.filter(m => s.listening.mentions[m.id] === 'hidden') : k === 'all' ? visible : k === 'risk' ? visible.filter(m => m.risk) : visible.filter(m => mood(m) === k))
  const counts = Object.fromEntries((Object.keys(MSHOW_LABEL) as MShow[]).map(k => [k, of(k).length])) as Record<MShow, number>
  const shownFilters = (Object.keys(MSHOW_LABEL) as MShow[]).filter(k => k === 'all' || counts[k] > 0 || k === show)
  const list = of(show).sort((a, b) => b.at - a.at)
  const hidden = show === 'hidden'
  const products = [...new Set(feed.map(m => m.product).filter(Boolean))] as string[]
  // A page of rows: the feed reads like a list, not a wall. Select all takes what's shown.
  const [page, setPage] = useState(PAGE)
  const shown = list.slice(0, page)
  const ids = useMemo(() => shown.map(m => m.id), [shown.map(m => m.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(ids, `${show}-${product}-${tag}-${search?.id}`)
  const run = (op: MentionOp, extra: { tag?: string; sentiment?: Sentiment } = {}, which = [...sel.selected]) => { d({ type: 'listening/mentions', ids: which, op, ...extra }); sel.clear() }
  const exportCSV = () => downloadFile(`fernway-mentions-${new Date(now).toISOString().slice(0, 10)}.csv`, toCSV([
    ['Date', 'Author', 'Network', 'Sentiment', 'Reach', 'Product', 'At risk', 'Tags', 'Text'],
    ...list.map(m => [new Date(m.at).toISOString(), m.author, m.network, mood(m), m.reach, m.product ?? '', m.risk ? 'yes' : '', (s.listening.tags[m.id] ?? []).join('; '), m.text]),
  ]))
  const open = feed.find(m => m.id === openId)
  const unseen = unseenNeeds(s, list)
  const narrowLabel = product !== 'all' ? product : tag !== 'all' ? tag : 'Product or tag'
  const sv = search && searchVolume(search, now, searchLive(s, search))
  const sc = search && moodCount(s, searchMentions(s, search))

  return (
    <div>
      <div className="sl-bar">
        <Filters label="Show" value={show} onChange={v => { setShow(v); setPage(PAGE) }} items={shownFilters.map(k => ({ value: k, label: MSHOW_LABEL[k], count: counts[k] }))} />
        <div className="sl-menus">
          <Menu align="end" trigger={<Btn size="sm" variant="ghost">{search?.name ?? 'All searches'}<ChevronDown size={12} /></Btn>} items={[
            { label: 'All searches', onSelect: () => setParam('search') },
            ...s.listening.searches.filter(x => !x.paused).map(x => ({ label: x.name, hint: search?.id === x.id ? <Check size={14} aria-label="Current" /> : undefined, onSelect: () => setParam('search', x.id) })),
            'sep', { label: 'Manage searches…', onSelect: () => setParam('searches', 'manage') },
          ]} />
          <Menu align="end" trigger={<Btn size="sm" variant="ghost">{narrowLabel}<ChevronDown size={12} /></Btn>} items={[
            { label: 'Every product and tag', onSelect: () => { setProduct('all'); setTag('all') } },
            ...(products.length ? [{ heading: 'Product' } as const, ...products.map(p => ({ label: p, hint: product === p ? <Check size={14} aria-label="Current" /> : undefined, onSelect: () => { setProduct(p); setTag('all') } }))] : []),
            { heading: 'Tag' }, ...TAGS.map(t => ({ label: t, hint: tag === t ? <Check size={14} aria-label="Current" /> : undefined, onSelect: () => { setTag(t); setProduct('all') } })),
            'sep', { label: 'Manage tags…', onSelect: () => setManaging(true) },
          ]} />
        </div>
      </div>
      {search && sv && sc && (
        <p className="sl-scope">
          {search.keywords}{search.exclude && <> · excluding {search.exclude}</>} · <span className="num">{sv.volume.toLocaleString('en-GB')}</span> mentions in 7 days{sv.collecting ? `, collecting ${Math.round(sv.progress * 100)}%` : ''} · {share(sc.negative, sc.total)} negative{' '}
          <InfoPop label="Echo’s read">{searchRead(s, search)}</InfoPop>
        </p>
      )}
      {!list.length ? <Empty title={sv?.collecting ? 'Echo is still collecting' : hidden ? 'Nothing hidden' : 'No mentions match'} body={sv?.collecting ? 'Mentions show up here as Echo reads the last 7 days.' : undefined}
        action={product !== 'all' || tag !== 'all' || show !== 'all' ? <Btn onClick={() => { setShow('all'); setProduct('all'); setTag('all') }}>Clear filters</Btn> : undefined} /> : (
        <section className="card sl-list" aria-label="Mentions">
          {sel.count > 0 ? (
            <BulkBar count={sel.count} noun={sel.count > 1 ? 'mentions selected' : 'mention selected'} onClear={sel.clear} actions={[
              { label: 'Ask Nova to reply', icon: <MessageSquareReply size={14} />, primary: true, onRun: () => run('nova') },
              hidden ? { label: 'Unhide', icon: <Eye size={14} />, onRun: () => run('unhide') } : { label: 'Hide', icon: <EyeOff size={14} />, onRun: () => run('hide') },
              { label: 'Hand to Atlas', icon: <Send size={14} />, onRun: () => run('atlas') },
            ]}>
              <Menu align="center" trigger={<Btn size="sm" variant="ghost"><Tag size={14} />Tag<ChevronDown size={12} /></Btn>} items={TAGS.map(t => ({ label: t, onSelect: () => run('tag', { tag: t }) }))} />
              <Menu align="center" trigger={<Btn size="sm" variant="ghost">Sentiment<ChevronDown size={12} /></Btn>} items={(['positive', 'neutral', 'negative'] as Sentiment[]).map(x => ({ label: `Mark ${SENT_LABEL[x].toLowerCase()}`, onSelect: () => run('sentiment', { sentiment: x }) }))} />
            </BulkBar>
          ) : (
            <div className="sl-head">
              <SelectAll sel={sel} label="Select every mention shown" />
              <span className="spacer" />
              {unseen.length > 0 && <Btn size="sm" variant="ghost" onClick={() => d({ type: 'listening/seen', ids: unseen.map(m => m.id) })}><Check size={14} />Mark {unseen.length} as seen</Btn>}
              <Btn size="sm" variant="ghost" onClick={exportCSV}><Download size={14} />Export CSV</Btn>
            </div>
          )}
          {/* A feed (matrix §15): who said it, where, how it sounds, what they said, how far it went. */}
          <ul className="ls-feed">
            {shown.map(m => {
              const st = s.listening.mentions[m.id]
              const tags = s.listening.tags[m.id] ?? []
              const pending = s.listening.pendingTags[m.id] ?? []
              const md = mood(m)
              const MoodIcon = MOOD_ICON[md]
              const openIt = () => { setOpenId(m.id); d({ type: 'listening/seen', ids: [m.id] }) }
              return (
                <li key={m.id} className={`ls-item ${sel.has(m.id) ? 'picked' : ''}`}>
                  <SelectBox checked={sel.has(m.id)} visible={sel.count > 0} onToggle={shift => sel.toggle(m.id, shift)} label={`Select ${m.author}’s mention`} />
                  <SocialAvatar name={m.author} network={MENTION_NET[m.network]} org={!m.author.startsWith('@')} size={40} />
                  <div className="ls-item-main">
                    <p className="ls-item-head">
                      <button type="button" className={`link-title ${seenOf(s, m) ? '' : 'new'}`} onClick={openIt}>{m.author}</button>
                      <span className="ls-item-where">{m.network} · {ago(m.at, now)}</span>
                      <span className={`ls-mood ${md}`}><MoodIcon size={12} aria-hidden />{SENT_LABEL[md]}{s.listening.sentiment[m.id] ? ' · corrected' : ''}</span>
                      {m.risk && <Pill tone="alert"><TriangleAlert size={12} />At risk</Pill>}
                    </p>
                    <p className="ls-item-text">{m.text}</p>
                    <p className="ls-item-meta">
                      <span>Reach <b className="num">{m.reach.toLocaleString('en-GB')}</b></span>
                      {m.product && <span>{m.product}</span>}
                      {tags.map(t => <span key={t} className="chip ls-tag">{t}</span>)}
                      {pending.map(t => <Btn key={t} size="xs" variant="ghost" aria-label={`Add Echo’s suggested tag ${t}`} onClick={() => d({ type: 'listening/tagAccept', id: m.id, tag: t })}><Plus size={12} />{t}</Btn>)}
                    </p>
                  </div>
                  <div className="ls-item-acts">
                    {st === 'replied' ? <Pill tone="ok"><Check size={12} />Reply on your Desk</Pill> : st === 'handed' ? <Pill tone="signal">With Atlas</Pill>
                      : <Btn size="sm" onClick={() => run('nova', {}, [m.id])} aria-label={`Ask Nova to reply to ${m.author}`}><Mark agent="nova" />Reply</Btn>}
                    <Menu trigger={<Btn size="sm" variant="ghost" icon aria-label={`More for ${m.author}’s mention`}><ChevronDown size={14} /></Btn>} items={[
                      { label: 'Open', onSelect: openIt },
                      { label: hidden ? 'Unhide' : 'Hide', onSelect: () => run(hidden ? 'unhide' : 'hide', {}, [m.id]) },
                      ...(st ? [] : [{ label: 'Hand to Atlas', onSelect: () => run('atlas', {}, [m.id]) }]),
                    ]} />
                  </div>
                </li>
              )
            })}
          </ul>
          {list.length > page && <div className="sl-more"><Btn size="sm" variant="ghost" onClick={() => setPage(p => p + PAGE)}>Show {Math.min(PAGE, list.length - page)} more of {list.length - page}<ChevronDown size={14} aria-hidden /></Btn></div>}
        </section>
      )}

      {managing && <ManageTags onClose={() => setManaging(false)} />}
      <ManageSearches open={params.get('searches') === 'manage'} onClose={() => setParam('searches')} onPick={id => { const p = new URLSearchParams(params); p.delete('searches'); p.set('search', id); setParams(p, { replace: true }) }} />
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
            {open.risk && <p className="ls-risk"><TriangleAlert size={14} />Echo flags this one as a reputation risk. A reply within the hour keeps it from spreading.</p>}
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
          </div>
        )}
      </Sheet>
    </div>
  )
}

/* ---------- Searches: a setting of Mentions ---------- */
function ManageSearches({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const { s, d } = useStore()
  const now = useNow()
  const [edit, setEdit] = useState<Search | null>(null)
  const [removed, setRemoved] = useState<Search | null>(null)
  const blank: Search = { id: '', name: '', keywords: '', exclude: '', volume: 0 }
  const full = activeSearches(s) >= searchCap(s)
  return (
    <>
      <Sheet open={open && !edit} onOpenChange={o => !o && onClose()} title="Searches"
        footer={<><Link to="/agents/echo?tab=alerts" className="link-btn t-sm">Echo’s alert rules</Link><span className="spacer" /><Btn variant="primary" onClick={() => setEdit(blank)} disabled={full}><Plus size={14} />New search</Btn></>}>
        <div className="stack">
          <p className="muted"><span className="num">{activeSearches(s)} of {searchCap(s)}</span> search slots in use <InfoPop label="How Echo searches">Echo checks every search every 15 minutes across social networks, news, blogs and forums.</InfoPop></p>
          {removed && <UndoBar onUndo={() => { d({ type: 'listening/searchSave', search: removed }); setRemoved(null) }} onDismiss={() => setRemoved(null)}>Deleted “{removed.name}”. Echo stopped tracking it.</UndoBar>}
          {s.listening.searches.length ? (
            <ul className="rows ls-searches">
              {s.listening.searches.map(x => {
                const v = searchVolume(x, now, searchLive(s, x))
                return (
                  <li key={x.id}>
                    <div className="grow">
                      <button type="button" className="link-btn ls-search-name" disabled={x.paused} onClick={() => onPick(x.id)}>{x.name}</button>
                      <p className="faint t-sm">{x.keywords}{x.exclude && ` · excluding ${x.exclude}`}</p>
                      <p className="t-sm">{x.paused ? <Pill>Paused</Pill> : v.collecting ? <Pill tone="caution" dot>Collecting · {Math.round(v.progress * 100)}%</Pill> : <>{plural(v.volume, 'mention')} in 7 days</>}</p>
                    </div>
                    <Btn size="xs" variant="ghost" icon aria-label={`Edit ${x.name}`} onClick={() => setEdit(x)}><Pencil size={12} /></Btn>
                    <Btn size="xs" variant="ghost" icon aria-label={x.paused ? `Resume ${x.name}` : `Pause ${x.name}`} onClick={() => d({ type: 'listening/searchToggle', id: x.id })}>{x.paused ? <Play size={12} /> : <Pause size={12} />}</Btn>
                    <Btn size="xs" variant="ghost" icon aria-label={`Delete ${x.name}`} onClick={() => { setRemoved(x); d({ type: 'listening/searchDelete', id: x.id }) }}><Trash2 size={12} /></Btn>
                  </li>
                )
              })}
            </ul>
          ) : <Empty title="No searches" body="Add one to start tracking a brand, product or topic." />}
        </div>
      </Sheet>
      {edit && <SearchForm search={edit} onClose={() => setEdit(null)} />}
    </>
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
