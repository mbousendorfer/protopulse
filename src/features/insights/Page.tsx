import { useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpDown, Check, Clock, Download, Eye, FileText, Heart, MessageCircle, MousePointerClick, RotateCcw, Send, Smile, Timer, Users } from 'lucide-react'
import { BulkBar, SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { downloadFile, toCSV } from './alerts'
import { useNow, useStore } from '../../app/store'
import { ago, dayLabel, hhmm, DAY } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import {
  DAILY_REACH, HEAT_COLS, HEAT_ROWS, NETWORKS_SOCIAL, NET_SHARE, PILLAR_PERF, POSTS, TIKTOK_VIEWS, dayLabels,
  type Cited, type Kpi, type NetFilter, type Period, type PostRow, type Report,
} from '../../data/insights'
import { Btn, Confidence, Empty, Filters, Mark, Net, PageHead, Pill, Seg, Tabs, Tip } from '../../ui'
import { InlineConfirm } from '../../ui/Feedback'
import { Heatmap, LineChart, Spark } from '../../ui/charts'
import { bestTime, heat, kpis as kpisOf } from './metrics'
import { targetsOf } from '../strategy/slice'
import { anomalyList, boostBudget } from './slice'
import { reportList } from './reports'
import './insights.css'

type Tab = 'reports' | 'explore' | 'anomalies'

export default function InsightsPage() {
  const loc = useLocation()
  const nav = useNavigate()
  const { s } = useStore()
  const seg = loc.pathname.split('/')[2] ?? ''
  const tab: Tab = seg === 'explore' ? 'explore' : seg === 'anomalies' ? 'anomalies' : 'reports'
  const openAnomalies = anomalyList(s).filter(a => a.open).length

  return (
    <div className="page insights">
      <PageHead agent="iris" title="Insights" lede="Iris writes the story first. Dig into the numbers underneath whenever you want." />
      <Tabs value={tab} onChange={v => nav(v === 'reports' ? '/insights' : `/insights/${v}`)} items={[
        { value: 'reports', label: 'Reports', count: reportList(s).filter(r => r.draft).length || undefined },
        { value: 'explore', label: 'Explore' },
        { value: 'anomalies', label: 'Anomalies', count: openAnomalies },
      ]} />
      <Routes>
        <Route index element={<Reports />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports/:id" element={<ReportView />} />
        <Route path="explore" element={<Explore />} />
        <Route path="anomalies" element={<Anomalies />} />
        <Route path="*" element={<Reports />} />
      </Routes>
    </div>
  )
}

/* ---------- Sourced numbers ---------- */
export function CitedText({ parts }: { parts: Cited[] }) {
  return <>{parts.map((p, i) => typeof p === 'string' ? <span key={i}>{p}</span> : (
    <Tip key={i} label={<><b>Source</b><br />{p.source}</>}><span className="cite" tabIndex={0}>{p.n}</span></Tip>
  ))}</>
}

/* ---------- Reports ---------- */
const KIND_LABEL: Record<Report['kind'], string> = { brief: 'Brief', weekly: 'Weekly report', campaign: 'Campaign recap' }
/** The title says what's in it; the type sits in the meta. Out of context (journal, file name) it gets its type back. */
const reportMeta = (r: Report) => (r.kind === 'weekly' ? KIND_LABEL.weekly : `${KIND_LABEL[r.kind]} · ${r.period}`)
const fullTitle = (r: Report) => (r.kind === 'brief' ? r.title : `${KIND_LABEL[r.kind]} · ${r.title}`)

function Reports() {
  const { s } = useStore()
  const now = useNow()
  return (
    <div className="reports">
      {reportList(s).map(r => {
        const shared = s.insights.shared[r.id]
        return (
          <Link key={r.id} to={`/insights/reports/${r.id}`} className="card report-row">
            <span className="report-icon" aria-hidden><FileText size={16} /></span>
            <div className="report-main">
              <span className="faint">{reportMeta(r)}</span>
              <h2>{r.title}</h2>
              <p className="muted">{r.summary}</p>
            </div>
            <div className="report-meta">
              <span className="mono faint">Written {ago(r.writtenAt, now)}</span>
              {r.draft ? <Pill tone="caution">Waits for you</Pill> : shared ? <Pill tone="ok"><Check size={11} />Shared with Claire</Pill> : r.kind !== 'brief' ? <Pill>Not shared</Pill> : null}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

const ASK_SUGGEST = ['Why did TikTok drop?', 'Best time to post on LinkedIn?', 'Reels or carousels?', 'How are we doing against Peakline?']

function ReportView() {
  const { id } = useParams()
  const { s, d } = useStore()
  const now = useNow(5000)
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const r = reportList(s).find(x => x.id === id)
  if (!r) return <Empty title="This report doesn’t exist" action={<Btn onClick={() => nav('/insights')}>All reports</Btn>} />
  const shared = s.insights.shared[r.id]
  // A card in Claire's lane means she hasn't read it yet; her engine answers on the Desk.
  const reading = s.handoffs.find(h => h.agent === 'iris' && h.lane === 'claire' && (h.ref === r.id || (h.id === 'h-report' && r.id === 'w47')))
  const deskCard = s.handoffs.find(h => h.agent === 'iris' && !h.lane && h.ref === r.id)
  const follow = s.insights.followUps.filter(f => f.report === r.id)
  const ask = (text: string) => { if (text.trim()) { d({ type: 'insights/ask', report: r.id, q: text.trim() }); setQ('') } }

  return (
    <div className="report-layout">
      <article className="card report">
        <Btn variant="ghost" size="sm" onClick={() => nav('/insights')}><ArrowLeft size={14} />All reports</Btn>
        <div className="row tight report-by"><Mark agent="iris" /><span className="mono faint">{reportMeta(r)} · written by Iris · {dayLabel(r.writtenAt, now)} {hhmm(r.writtenAt)}</span></div>
        <h1>{r.title}</h1>
        <p className="lede">{r.summary}</p>
        {r.sections.map(sec => (
          <section key={sec.heading}>
            <h2>{sec.heading}</h2>
            {sec.paras.map((p, i) => <p key={i}><CitedText parts={p} /></p>)}
            {sec.chart === 'reach' && <div className="report-chart"><LineChart label="Daily reach, last 14 days" labels={dayLabels(14)} series={[{ name: 'Reach (k)', data: DAILY_REACH.slice(-14), color: 'var(--a-iris)' }]} h={160} format={v => `${Math.round(v)}k`} /></div>}
            {sec.chart === 'pillars' && <div className="report-chart"><HBars items={PILLAR_PERF.map(p => ({ label: p.pillar, value: p.er }))} format={v => `${v.toFixed(1)}%`} color="var(--a-iris)" /></div>}
            {sec.chart === 'tiktok' && <div className="report-chart"><LineChart label="TikTok views per video" labels={['#1', '#2', '#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10', '#11']} series={[{ name: 'Views per video (k)', data: TIKTOK_VIEWS, color: 'var(--a-iris)' }]} h={140} format={v => `${v.toFixed(1)}k`} /></div>}
          </section>
        ))}
        <p className="faint hint-cite">Point at an underlined number to see where it comes from.</p>
      </article>

      <aside className="report-side">
        <section className="card pad stack">
          <h2 className="side-title">Share</h2>
          {r.draft && deskCard ? (
            <>
              <p className="muted">Iris wrote this on Draft. It waits for you on the Desk.</p>
              <Link to={`/?card=${deskCard.id}`} className="btn sm self-start">Review on Desk</Link>
            </>
          ) : shared || reading ? (
            <>
              <div className="row tight"><Check size={14} className="ok" /><span>Shared with Claire{shared ? ` ${dayLabel(shared.at, now)} at ${hhmm(shared.at)}` : ''}</span></div>
              {shared?.reply ? <div className="claire-seen"><Mark agent="claire" /><p>“{shared.reply}”</p></div>
                : reading ? <span className="faint">Claire hasn’t read it yet. Her answer will show here and on your Desk.</span> : null}
            </>
          ) : (
            <>
              <p className="muted">Claire hasn’t seen this one.</p>
              <Btn variant="primary" onClick={() => d({ type: 'insights/share', id: r.id, title: fullTitle(r) })}><Send size={14} />Share with Claire</Btn>
            </>
          )}
          <Btn variant="ghost" onClick={() => { downloadFile(`${r.id}-${fullTitle(r).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`, reportMarkdown(r), 'text/markdown'); d({ type: 'insights/export', title: fullTitle(r) }) }}><Download size={14} />Download (.md)</Btn>
        </section>
        <section className="card pad stack">
          <h2 className="side-title">Ask Iris a follow-up</h2>
          {follow.map(f => (
            <div key={f.id} className="qa">
              <p className="q">{f.q}</p>
              <div className="a"><Mark agent="iris" /><p>{f.a}</p></div>
            </div>
          ))}
          <form onSubmit={e => { e.preventDefault(); ask(q) }} className="stack gap-2">
            <label htmlFor="ask-iris" className="sr-only">Question for Iris</label>
            <input id="ask-iris" className="input" placeholder="Why did TikTok drop?" value={q} onChange={e => setQ(e.target.value)} />
            <div className="row tight">{ASK_SUGGEST.map(x => <button key={x} type="button" className="filter" onClick={() => ask(x)}>{x}</button>)}</div>
          </form>
        </section>
      </aside>
    </div>
  )
}

/* ---------- Explore ---------- */
const fmtKpi = (k: Kpi, v: number) => k.fmt === 'k' ? (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : `${Math.round(v / 1000)}k`) : k.fmt === 'pct' ? `${v.toFixed(1)}%` : k.fmt === 'min' ? `${v} min` : Math.round(v).toLocaleString('en-GB')

type SortKey = 'date' | 'reach' | 'er' | 'clicks'

function Explore() {
  const { s } = useStore()
  // Pillars: the top engagement rate is the one to read, against the share Sage targets for it.
  const targets = targetsOf(s).pillars
  const topPillar = PILLAR_PERF.reduce((a, b) => (b.er > a.er ? b : a))
  const topTarget = targets.find(t => t.name === topPillar.pillar)?.target
  const now = useNow()
  const [period, setPeriod] = useState<Period>(7)
  const [net, setNet] = useState<NetFilter>('all')
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'reach', desc: true })

  const kpis = kpisOf(period, net)
  const share = net === 'all' ? 1 : NET_SHARE[net].share
  const cur = DAILY_REACH.slice(-period).map(v => +(v * share).toFixed(1))
  const prev = period < 90 ? DAILY_REACH.slice(-period * 2, -period).map(v => +(v * share * 0.93).toFixed(1)) : []
  const rows = useMemo(() => POSTS.filter(p => (net === 'all' || p.network === net) && p.date >= now - period * DAY)
    .sort((a, b) => (sort.desc ? -1 : 1) * ((a[sort.key] as number) - (b[sort.key] as number))), [net, period, sort, now])
  const best = bestTime(net)
  const ig = bestTime('instagram')

  const th = (key: SortKey, label: string) => (
    <th className={key === 'date' ? '' : 'r'} aria-sort={sort.key === key ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
      <button onClick={() => setSort(s => ({ key, desc: s.key === key ? !s.desc : true }))}>{label}<ArrowUpDown size={11} /></button>
    </th>
  )

  return (
    <div className="stack lg">
      <div className="row explore-bar">
        <Seg name="period" label="Period" value={String(period) as '7' | '30' | '90'} onChange={v => setPeriod(+v as Period)}
          options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
        <Filters label="Network" value={net} onChange={setNet} items={[{ value: 'all', label: 'All networks' }, ...NETWORKS_SOCIAL.map(n => ({ value: n as NetFilter, label: NETWORK_LABEL[n] }))]} />
      </div>

      <dl className="kpi-grid">
        {kpis.map(k => {
          const diff = k.fmt === 'pct' || k.fmt === 'min' ? k.value - k.prev : ((k.value - k.prev) / k.prev) * 100
          const good = k.lowerBetter ? diff < 0 : diff > 0
          const txt = k.fmt === 'pct' ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pt` : k.fmt === 'min' ? `${diff > 0 ? '+' : '−'}${Math.abs(diff)} min` : `${diff > 0 ? '+' : '−'}${Math.abs(Math.round(diff))}%`
          return (
            <div key={k.key} className="kpi">
              <dt><span className="kpi-icon" aria-hidden>{kpiIcon(k.label)}</span>{k.label}</dt>
              <dd><b className="num">{fmtKpi(k, k.value)}</b><span className={`delta ${good ? 'up' : 'down'}`}>{txt}</span></dd>
              <span className="faint kpi-prev">vs {fmtKpi(k, k.prev)} the previous {period} days</span>
            </div>
          )
        })}
      </dl>

      <section className="card pad">
        <div className="section-title">Daily reach <span className="faint">· {net === 'all' ? 'all networks' : NETWORK_LABEL[net]}, thousands</span></div>
        <LineChart label="Daily reach" labels={dayLabels(period)} h={220} format={v => `${Math.round(v)}k`}
          series={[{ name: `Last ${period} days`, data: cur, color: 'var(--a-iris)' }, ...(prev.length ? [{ name: `Previous ${period} days`, data: prev, dashed: true, tone: 'faint' as const }] : [])]} />
      </section>

      <div className="grid-2">
        <section className="card pad">
          <div className="section-title">Best times to post <span className="faint">· reach by day and hour, 30 days</span></div>
          <Heatmap values={heat(net)} rows={HEAT_ROWS} cols={HEAT_COLS} label={`Reach by day and hour, ${net === 'all' ? 'all networks' : NETWORK_LABEL[net]}`} best={[best.day, best.col]} />
          <p className="muted heat-note">Best window{net === 'all' ? '' : ` on ${NETWORK_LABEL[net]}`}: <b>{best.dayName} {best.window}</b>, {best.lift}× the median reach. {net === 'all' ? `Instagram brings most of your reach; Atlas posts there at ${ig.time}.` : `Atlas posts at ${best.time}, inside it.`}</p>
        </section>
        <section className="card pad">
          <div className="section-title">By pillar <span className="faint">· 30 days</span></div>
          <table className="table pillar-table">
            <thead><tr><th>Pillar</th><th>Engagement rate</th><th className="r">Share · target</th><th className="r">Saves rate</th></tr></thead>
            <tbody>{PILLAR_PERF.map(p => {
              const t = targets.find(x => x.name === p.pillar)?.target
              return (
                <tr key={p.pillar} className={p === topPillar ? 'best' : undefined}>
                  <td>{p.pillar}</td>
                  <td><span className="pillar-er"><span className="track"><i style={{ width: `${(p.er / topPillar.er) * 100}%` }} /></span><b className="num">{p.er.toFixed(1)}%</b></span></td>
                  <td className="r num">{p.share}%{t !== undefined && <span className="faint"> · {t}%</span>}</td>
                  <td className="r num">{p.saves}%</td>
                </tr>
              )
            })}</tbody>
          </table>
          <p className="muted heat-note"><b>{topPillar.pillar}</b> engages best ({topPillar.er.toFixed(1)}%){topTarget !== undefined && topPillar.share < topTarget ? `, yet makes ${topPillar.share}% of posts for a ${topTarget}% target.` : '.'}</p>
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h2>Posts <span className="faint num">{rows.length}</span></h2>
          <Btn size="sm" disabled={!rows.length} onClick={() => downloadFile(`fernway-posts-${period}d.csv`, toCSV([['Date', 'Network', 'Post', 'Pillar', 'Author', 'Reach', 'Engagement rate %', 'Clicks'], ...rows.map(p => [new Date(p.date).toISOString().slice(0, 10), NETWORK_LABEL[p.network], p.title, p.pillar, p.author, p.reach, p.er, p.clicks])]))}><Download size={14} />Export CSV</Btn></div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Post</th>{th('date', 'Date')}<th>Pillar</th><th>Author</th>{th('reach', 'Reach')}{th('er', 'Engagement')}{th('clicks', 'Clicks')}</tr></thead>
              <tbody>{rows.map(p => <PostTr key={p.id} p={p} now={now} />)}</tbody>
            </table>
          </div>
        ) : <Empty title="No posts in this period" body="Try a longer period or another network." />}
      </section>
    </div>
  )
}

function PostTr({ p, now }: { p: PostRow; now: number }) {
  return (
    <tr>
      <td><span className="row nowrap"><Net n={p.network} /><span className="ellipsis mw-320">{p.title}</span></span></td>
      <td className="mono faint">{dayLabel(p.date, now)}</td>
      <td className="muted">{p.pillar}</td>
      <td className="muted">{p.author}</td>
      <td className="r">{p.reach.toLocaleString('en-GB')}</td>
      <td className="r">{p.er.toFixed(1)}%</td>
      <td className="r">{p.clicks.toLocaleString('en-GB')}</td>
    </tr>
  )
}

/* ---------- Anomalies ---------- */
function Anomalies() {
  const { s, d } = useStore()
  const now = useNow()
  const [view, setView] = useState<'open' | 'closed'>('open')
  const [confirm, setConfirm] = useState<{ id: string; action: string } | null>(null)
  const list = anomalyList(s)
  const budget = boostBudget(s)
  const shown = list.filter(a => (view === 'open') === a.open)
  const ids = useMemo(() => shown.map(a => a.id), [shown.map(a => a.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(ids, view)
  const bulk = (op: 'handle' | 'snooze' | 'reopen') => { d({ type: 'insights/anomalies', ids: [...sel.selected], op }); sel.clear() }
  return (
    <div className="stack">
      <div className="row">
        {shown.length > 0 && <span className="row tight faint in-selall"><SelectAll sel={sel} label="Select every anomaly shown" />Select all</span>}
        <Filters label="Status" value={view} onChange={setView} items={[
          { value: 'open', label: 'Open', count: list.filter(a => a.open).length },
          { value: 'closed', label: 'Closed', count: list.filter(a => !a.open).length },
        ]} />
      </div>
      <BulkBar count={sel.count} noun={sel.count > 1 ? 'anomalies selected' : 'anomaly selected'} onClear={sel.clear} actions={view === 'open' ? [
        { label: 'Mark handled', icon: <Check size={14} />, primary: true, onRun: () => bulk('handle') },
        { label: 'Snooze a week', icon: <Clock size={14} />, onRun: () => bulk('snooze') },
      ] : [{ label: 'Reopen', icon: <RotateCcw size={14} />, primary: true, onRun: () => bulk('reopen') }]} />
      {!shown.length && <Empty icon={<Check size={18} />} title={view === 'open' ? 'No open anomalies' : 'Nothing closed yet'} body={view === 'open' ? 'Iris checks every network every hour. She’ll raise anything outside the normal range.' : undefined} />}
      {shown.map(a => (
        <article key={a.id} className={`card anomaly ${sel.has(a.id) ? 'in-picked' : ''}`}>
          <SelectBox checked={sel.has(a.id)} visible={sel.count > 0} onToggle={shift => sel.toggle(a.id, shift)} label={`Select: ${a.title}`} />
          <div className="anomaly-body">
          <div className="anomaly-head">
            <div>
              <div className="row tight"><Net n={a.network} /><span className="faint">Detected {ago(a.detectedAt, now)}</span></div>
              <h2>{a.title}</h2>
            </div>
            <div className="anomaly-metric">
              <span className="faint">{a.metric}</span>
              <span className="row tight"><b className="num">{a.value}</b><span className={`delta ${a.down ? 'down' : 'up'}`}>{a.delta}</span></span>
              <Spark data={a.series} w={160} h={36} tone={a.down ? 'alert' : 'ink'} color="var(--a-iris)" label={a.metric} />
            </div>
          </div>
          <div className="anomaly-cause"><Mark agent="iris" /><p><span className="faint">Likely cause:</span> {a.cause}</p></div>
          {a.rule && <p className="faint">Raised by your alert rule “{a.rule}”. <Link to="/agents/iris?tab=alerts">Edit</Link></p>}
          <div className="row"><Confidence v={a.confidence} /></div>
          {a.open ? (
            <div className="row">
              {confirm?.id === a.id ? (
                // Paid spend never goes out on one click.
                <InlineConfirm confirm="Confirm boost" onCancel={() => setConfirm(null)} onConfirm={() => { d({ type: 'insights/anomaly', id: a.id, title: a.title, action: confirm.action }); setConfirm(null) }}>
                  {confirm.action}? This is paid ad spend, billed to Fernway’s ad account. {budget.cap !== undefined && <>€{budget.left.toLocaleString('en-GB')} of the €{budget.cap.toLocaleString('en-GB')} monthly cap is left.</>}
                </InlineConfirm>
              ) : a.actions.map(x => <Btn key={x} size="sm" onClick={() => /€/.test(x) ? setConfirm({ id: a.id, action: x }) : d({ type: 'insights/anomaly', id: a.id, title: a.title, action: x })}>{x}</Btn>)}
              {a.handoff && s.handoffs.some(h => h.id === a.handoff) && <Link to={`/?card=${a.handoff}`} className="btn sm ghost">Review on Desk</Link>}
            </div>
          ) : (
            <div className="resolution row nowrap"><Check size={14} className="ok" /><span>{a.resolution}</span><span className="spacer" /><Btn size="xs" variant="ghost" onClick={() => d({ type: 'insights/reopen', id: a.id })}>Reopen</Btn></div>
          )}
          </div>
        </article>
      ))}
      <p className="faint in-rules-link">Iris raises anomalies from her alert rules. <Link to="/agents/iris?tab=alerts">Edit Iris’s alert rules</Link></p>
    </div>
  )
}

const plainCited = (parts: Cited[]) => parts.map(x => (typeof x === 'string' ? x : x.n)).join('')

/** The report as Markdown, for a real download. */
function reportMarkdown(r: Report) {
  return [`# ${fullTitle(r)}`, '', `_${r.period} · written by Iris_`, '', r.summary, '', ...r.sections.flatMap(sec => [`## ${sec.heading}`, '', ...sec.paras.map(plainCited), ''])].join('\n')
}

/** A small icon per metric, in Iris’s colour. The label stays in text next to it. */
function kpiIcon(label: string) {
  const l = label.toLowerCase()
  const I = /reach|views/.test(l) ? Eye : /engagement/.test(l) ? Heart : /follower/.test(l) ? Users : /click/.test(l) ? MousePointerClick
    : /time/.test(l) ? Timer : /repl/.test(l) ? MessageCircle : /sentiment/.test(l) ? Smile : Eye
  return <I size={14} />
}
