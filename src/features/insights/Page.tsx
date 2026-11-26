import { useMemo, useState } from 'react'
import type { Network } from '../../app/types'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpDown, Check, Clock, Download, Eye, FileText, Heart, MessageCircle, MousePointerClick, RotateCcw, Send, Smile, Timer, Users } from 'lucide-react'
import { BulkBar, SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { downloadFile, toCSV } from './alerts'
import { useNow, useStore } from '../../app/store'
import { ago, dayLabel, hhmm, DAY } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import {
  DAILY_REACH, HEAT_COLS, HEAT_ROWS, NETWORKS_SOCIAL, NET_SHARE, PILLAR_PERF, POSTS, TIKTOK_VIEWS, dayLabels,
  type Cited, type Kpi, type NetFilter, type PostRow, type Report,
} from '../../data/insights'
import { Btn, Confidence, Empty, Filters, Mark, Net, PageHead, Pill, Seg, Sheet, Tabs, Tip } from '../../ui'
import { CountBadge, InlineConfirm } from '../../ui/Feedback'
import { HBars, Heatmap, LineChart, Spark } from '../../ui/charts'
import { bestTime, heat, rangeKpis, reachSeries, type Range } from './metrics'
import { targetsOf } from '../strategy/slice'
import { anomalyList, boostBudget } from './slice'
import { insightsNeeds } from './needs'
import type { Anomaly } from '../../data/insights'
import type { Handoff } from '../../app/types'
import { reportList } from './reports'
import Roi from './RoiTab'
import AudienceTab from './AudienceTab'
import { ReportOut, SaveTemplate, Schedules, SectionTools, StudioAsk, StudioEdit } from './StudioPanels'
import './insights.css'

type Tab = 'reports' | 'explore' | 'audience' | 'roi' | 'anomalies'

export default function InsightsPage() {
  const loc = useLocation()
  const nav = useNavigate()
  const { s } = useStore()
  const seg = loc.pathname.split('/')[2] ?? ''
  const tab: Tab = seg === 'explore' ? 'explore' : seg === 'roi' ? 'roi' : seg === 'audience' ? 'audience' : seg === 'anomalies' ? 'anomalies' : 'reports'
  const openAnomalies = anomalyList(s).filter(a => a.open).length

  return (
    <div className="page insights">
      <PageHead agent="iris" title="Insights" lede="Iris writes the story first. Dig into the numbers underneath whenever you want." />
      <Tabs value={tab} onChange={v => nav(v === 'reports' ? '/insights' : `/insights/${v}`)} items={[
        { value: 'reports', label: 'Reports', count: reportList(s).filter(r => r.draft).length || undefined },
        { value: 'explore', label: 'Explore' },
        { value: 'audience', label: 'Audience' },
        { value: 'roi', label: 'ROI' },
        { value: 'anomalies', label: 'Anomalies', count: openAnomalies },
      ]} />
      <Routes>
        <Route index element={<Reports />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports/:id" element={<ReportView />} />
        <Route path="explore" element={<Explore />} />
        <Route path="audience" element={<AudienceTab />} />
        <Route path="roi" element={<Roi />} />
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
const KIND_LABEL: Record<Report['kind'], string> = { brief: 'Brief', weekly: 'Weekly report', campaign: 'Campaign recap', custom: 'Asked by you' }
/** The title says what's in it; the type sits in the meta. Out of context (journal, file name) it gets its type back. */
const reportMeta = (r: Report) => (r.kind === 'weekly' ? KIND_LABEL.weekly : `${KIND_LABEL[r.kind]} · ${r.period}`)
const fullTitle = (r: Report) => (r.kind === 'brief' ? r.title : `${KIND_LABEL[r.kind]} · ${r.title}`)

function Reports() {
  const { s } = useStore()
  const now = useNow()
  return (
    <div className="reports">
      <IrisNeeds />
      <WeekKpis />
      {/* One list, one row per report: six reports fit the first screen instead of four cards. */}
      <section className="card">
        <div className="card-head"><h2>Written by Iris <span className="faint num">{reportList(s).length}</span></h2></div>
        <ul className="rows report-list">
          {reportList(s).map(r => {
            const shared = s.insights.shared[r.id]
            return (
              <li key={r.id}>
                <Link to={`/insights/reports/${r.id}`} className="report-row">
                  <span className="report-icon" aria-hidden><FileText size={16} /></span>
                  <div className="report-main">
                    <h3>{r.title}</h3>
                    <span className="faint report-kind">{reportMeta(r)}</span>
                    <p className="muted">{r.summary}</p>
                  </div>
                  <div className="report-meta">
                    <span className="mono faint">{ago(r.writtenAt, now)}</span>
                    {/* Only what differs gets a status: a draft waiting for you, or what Claire already has. */}
                    {r.draft ? <Pill tone="caution">Waits for you</Pill> : shared ? <Pill tone="ok"><Check size={12} />Shared with Claire</Pill> : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
      <StudioAsk />
      <Schedules />
    </div>
  )
}

/* ---------- What Iris waits on Sam for (PROMPT §3.9): first on the landing ---------- */

type Show = 'all' | 'anomalies' | 'cards'

function IrisNeeds() {
  const { s, d } = useStore()
  const now = useNow()
  const [show, setShow] = useState<Show>('all')
  const { anomalies, cards } = insightsNeeds(s)
  const on = (k: Show) => show === 'all' || show === k
  const count = (k: Show, n: number, label: string) => n > 0 && (
    <button type="button" className="dq-count" aria-pressed={show === k} onClick={() => setShow(show === k ? 'all' : k)}>{label}</button>
  )
  return (
    <div>
      <p className="dq-sum" aria-live="polite">
        <Mark agent="iris" />
        {anomalies.length + cards.length ? <>
          {count('anomalies', anomalies.length, `${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'} to decide`)}
          {anomalies.length > 0 && cards.length > 0 && <span aria-hidden>·</span>}
          {count('cards', cards.length, `${cards.length} to approve`)}
          <span className="dq-sum-note">I check every network every hour.</span>
        </> : <span>Nothing needs you here. I check every network every hour and write your brief at 07:00.</span>}
      </p>
      {on('anomalies') && anomalies.length > 0 && (
        <section className="dq" aria-labelledby="iq-anomalies">
          <header className="dq-head">
            <h3 id="iq-anomalies">Anomalies to decide</h3><CountBadge n={anomalies.length} />
            <span className="dq-hint">Outside the normal range. Pick what happens; the history is in Anomalies.</span>
          </header>
          <ul className="dq-rows">{anomalies.map(a => (
            <li key={a.id} className="dq-row in-dq-anomaly">
              <span className="dq-check"><Net n={a.network} /></span>
              <div className="dq-main">
                <p className="dq-title"><span className="dq-name">{a.title}</span><span className="dq-hook">{a.metric} <b className="num">{a.value}</b> <span className={`delta ${a.down ? 'down' : 'up'}`}>{a.delta}</span></span></p>
                <p className="dq-line in-dq-cause"><span>Likely cause: {a.cause}</span></p>
                <p className="dq-line"><span>{a.confidence}% confident</span><span>Detected {ago(a.detectedAt, now)}</span></p>
                <div className="in-dq-decide"><AnomalyActions a={a} /></div>
              </div>
              <div className="dq-acts in-dq-spark"><Spark data={a.series} w={120} h={32} tone={a.down ? 'alert' : 'ink'} color="var(--a-iris)" label={a.metric} /></div>
            </li>
          ))}</ul>
        </section>
      )}
      {on('cards') && cards.length > 0 && (
        <section className="dq" aria-labelledby="iq-cards">
          <header className="dq-head">
            <h3 id="iq-cards">To approve</h3><CountBadge n={cards.length} />
            <span className="dq-hint">Iris prepared these. Nothing goes out until you say so.</span>
          </header>
          <ul className="dq-rows">{cards.map(h => (
            <li key={h.id} className="dq-row in-dq-card">
              <span className="dq-check report-icon" aria-hidden><FileText size={16} /></span>
              <div className="dq-main">
                <p className="dq-title">{h.link ? <Link to={h.link} className="dq-name">{h.title}</Link> : <span className="dq-name">{h.title}</span>}</p>
                <p className="dq-line"><span className="dq-src">{h.context}</span></p>
                <p className="dq-line"><span className="dq-src">{h.why}</span></p>
              </div>
              <div className="dq-acts"><CardDecision h={h} onDecide={decision => d({ type: 'core/resolve', id: h.id, decision })} /></div>
            </li>
          ))}</ul>
        </section>
      )}
    </div>
  )
}

/** The quick decision on one of Iris's Desk cards, right here: its options, or approve. The Desk keeps the Undo. */
function CardDecision({ h, onDecide }: { h: Handoff; onDecide: (d: { kind: 'approve' } | { kind: 'option'; option: string; index: number }) => void }) {
  if (h.options?.length) return <>{h.options.map((o, i) => <Btn key={o.label} size="sm" variant={o.recommended ? undefined : 'ghost'} onClick={() => onDecide({ kind: 'option', option: o.label, index: i })}>{o.label}</Btn>)}</>
  return <>
    <Link to={`/?card=${h.id}`} className="btn sm ghost">Review on Desk</Link>
    <Btn size="sm" onClick={() => onDecide({ kind: 'approve' })}>{h.topic === 'Weekly report' ? <><Send size={14} />Share with Claire</> : 'Approve'}</Btn>
  </>
}

/** The week at a glance, after the decisions: the four audience numbers, each named, with the way into Explore. */
function WeekKpis() {
  return (
    <section className="stack in-week" aria-labelledby="iq-week">
      <div className="row"><h2 id="iq-week" className="section-title">Last 7 days</h2><span className="spacer" /><Link to="/insights/explore" className="link-btn t-sm">Explore the numbers</Link></div>
      <KpiTiles kpis={rangeKpis({ days: 7, offset: 0 }, 'all').slice(0, 4)} label="7 days" />
    </section>
  )
}

/** KPI tiles: the number, its trend, and the previous period, always named. */
function KpiTiles({ kpis, label }: { kpis: ReturnType<typeof rangeKpis>; label: string }) {
  return (
    <dl className="kpi-grid">
      {kpis.map(k => {
        const diff = k.fmt === 'pct' || k.fmt === 'min' ? k.value - k.prev : ((k.value - k.prev) / k.prev) * 100
        const good = k.lowerBetter ? diff < 0 : diff > 0
        const txt = k.fmt === 'pct' ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pt` : k.fmt === 'min' ? `${diff > 0 ? '+' : '−'}${Math.abs(diff)} min` : `${diff > 0 ? '+' : '−'}${Math.abs(Math.round(diff))}%`
        return (
          <div key={k.key} className="kpi">
            <dt><span className="kpi-icon" aria-hidden>{kpiIcon(k.label)}</span>{k.label}</dt>
            <dd><b className="num">{fmtKpi(k, k.value)}</b><span className={`delta ${good ? 'up' : 'down'}`}>{txt}</span></dd>
            <span className="faint kpi-prev">vs {fmtKpi(k, k.prev)} the previous {label}</span>
          </div>
        )
      })}
    </dl>
  )
}

const ASK_SUGGEST = ['Why did TikTok drop?', 'Best time to post on LinkedIn?', 'Reels or carousels?', 'How are we doing against Peakline?']

function ReportView() {
  const { id } = useParams()
  const { s, d } = useStore()
  const now = useNow(5000)
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [params] = useSearchParams()
  // The read-only link: the report alone, without tools or side panels.
  const readOnly = params.get('view') === 'read'
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
        {readOnly ? <p className="faint">Read-only view of a report by Iris for Fernway.</p> : <Btn variant="ghost" size="sm" onClick={() => nav('/insights')}><ArrowLeft size={14} />All reports</Btn>}
        <div className="row tight report-by"><Mark agent="iris" /><span className="mono faint">{reportMeta(r)} · written by Iris · {dayLabel(r.writtenAt, now)} {hhmm(r.writtenAt)}</span></div>
        <h1>{r.title}</h1>
        <p className="lede">{r.summary}</p>
        {r.sections.map((sec, i) => (
          <section key={sec.heading}>
            {r.recipe && !readOnly ? <div className="row nowrap in-sec-head"><h2>{sec.heading}</h2><span className="spacer" /><SectionTools r={r} i={i} sec={sec} /></div> : <h2>{sec.heading}</h2>}
            {sec.paras.map((p, i) => <p key={i}><CitedText parts={p} /></p>)}
            {sec.chart === 'reach' && (r.recipe ? <ReachChart days={r.recipe.days} networks={r.recipe.networks} />
              : <div className="report-chart"><LineChart label="Daily reach, last 14 days" labels={dayLabels(14)} series={[{ name: 'Reach (k)', data: DAILY_REACH.slice(-14), color: 'var(--a-iris)' }]} h={160} format={v => `${Math.round(v)}k`} /></div>)}
            {sec.chart === 'campaign' && <CampaignChart id={r.recipe?.campaign} />}
            {sec.chart === 'pillars' && <div className="report-chart"><HBars items={PILLAR_PERF.map(p => ({ label: p.pillar, value: p.er }))} format={v => `${v.toFixed(1)}%`} color="var(--a-iris)" /></div>}
            {sec.chart === 'tiktok' && <div className="report-chart"><LineChart label="TikTok views per video" labels={['#1', '#2', '#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10', '#11']} series={[{ name: 'Views per video (k)', data: TIKTOK_VIEWS, color: 'var(--a-iris)' }]} h={140} format={v => `${v.toFixed(1)}k`} /></div>}
          </section>
        ))}
        {r.recipe && !r.sections.length && <p className="muted">Every section is gone. Add one back, or undo.</p>}
        <p className="faint hint-cite">Point at an underlined number to see where it comes from.</p>
        {r.recipe && !readOnly && <StudioEdit r={r} />}
      </article>

      {!readOnly && <aside className="report-side">
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
          <ReportOut r={r} />
        </section>
        {r.recipe && <section className="card pad stack"><h2 className="side-title">Template</h2><SaveTemplate r={r} /></section>}
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
      </aside>}
    </div>
  )
}

/** A campaign's planned against actual progress, as Sage tracks it. */
function CampaignChart({ id }: { id?: string }) {
  const { s } = useStore()
  const c = s.strategy.campaigns.find(x => x.id === id)
  if (!c?.planned.length) return null
  const labels = c.planned.map((_, i) => `Day ${i + 1}`)
  return <div className="report-chart"><LineChart label={`${c.name}: ${c.goal.label}, planned and actual`} labels={labels} h={160}
    series={[{ name: 'Actual', data: c.actual, color: 'var(--a-iris)' }, { name: 'Planned', data: c.planned, dashed: true, tone: 'faint' }]} /></div>
}

/** A requested report's reach: its own window and networks. */
function ReachChart({ days, networks }: { days: number; networks: Network[] }) {
  const share = networks.length ? networks.reduce((t, n) => t + NET_SHARE[n].share, 0) : 1
  const data = reachSeries({ days, offset: 0 }).map(v => +(v * share).toFixed(1))
  return <div className="report-chart"><LineChart label={`Daily reach, last ${days} days`} labels={dayLabels(days)} series={[{ name: 'Reach (k)', data, color: 'var(--a-iris)' }]} h={160} format={v => `${Math.round(v)}k`} /></div>
}

/* ---------- Explore ---------- */
const fmtKpi = (k: Kpi, v: number) => k.fmt === 'k' ? (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : `${Math.round(v / 1000)}k`) : k.fmt === 'pct' ? `${v.toFixed(1)}%` : k.fmt === 'min' ? `${v} min` : Math.round(v).toLocaleString('en-GB')

type SortKey = 'date' | 'reach' | 'er' | 'clicks' | 'network' | 'pillar' | 'author'
type PeriodChoice = '7' | '30' | '90' | 'custom'

const iso = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const startOf = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
const fromIso = (v: string) => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d).getTime() }

function Explore() {
  const { s } = useStore()
  // Pillars: the top engagement rate is the one to read, against the share Sage targets for it.
  const targets = targetsOf(s).pillars
  const topPillar = PILLAR_PERF.reduce((a, b) => (b.er > a.er ? b : a))
  const topTarget = targets.find(t => t.name === topPillar.pillar)?.target
  const now = useNow()
  const today = startOf(now)
  const [choice, setChoice] = useState<PeriodChoice>('7')
  const [custom, setCustom] = useState({ from: iso(today - 13 * DAY), to: iso(today) })
  const [net, setNet] = useState<NetFilter>('all')
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'reach', desc: true })
  const [open, setOpen] = useState<PostRow | null>(null)

  // A custom range is clamped to the 90 days Iris keeps, and never ends in the future.
  const lo = today - 89 * DAY
  const fromT = choice === 'custom' ? Math.min(Math.max(fromIso(custom.from) || lo, lo), today) : today - (+choice - 1) * DAY
  const toT = choice === 'custom' ? Math.min(Math.max(fromIso(custom.to) || today, fromT), today) : today
  const range: Range = { days: Math.round((toT - fromT) / DAY) + 1, offset: Math.round((today - toT) / DAY) }
  const label = choice === 'custom' ? `${range.days} days` : `${choice} days`

  const kpis = rangeKpis(range, net)
  const share = net === 'all' ? 1 : NET_SHARE[net].share
  const cur = reachSeries(range).map(v => +(v * share).toFixed(1))
  const before = { days: range.days, offset: range.offset + range.days }
  const prev = before.offset + before.days <= 90 ? reachSeries(before).map(v => +(v * share * 0.93).toFixed(1)) : []
  const labels = cur.map((_, i) => new Date(fromT + i * DAY).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))
  const rows = useMemo(() => POSTS.filter(p => (net === 'all' || p.network === net) && p.date >= fromT && p.date < toT + DAY)
    .sort((a, b) => (sort.desc ? -1 : 1) * (typeof a[sort.key] === 'string' ? String(a[sort.key]).localeCompare(String(b[sort.key])) : (a[sort.key] as number) - (b[sort.key] as number))), [net, fromT, toT, sort])
  const best = bestTime(net)
  const ig = bestTime('instagram')

  const th = (key: SortKey, label: string) => (
    <th className={['date', 'network', 'pillar', 'author'].includes(key) ? '' : 'r'} aria-sort={sort.key === key ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
      <button onClick={() => setSort(s => ({ key, desc: s.key === key ? !s.desc : !['network', 'pillar', 'author'].includes(key) }))}>{label}<ArrowUpDown size={12} /></button>
    </th>
  )

  return (
    <div className="stack lg">
      <div className="row explore-bar">
        <Seg name="period" label="Period" value={choice} onChange={v => setChoice(v as PeriodChoice)}
          options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: 'custom', label: 'Custom' }]} />
        {choice === 'custom' && (
          <div className="row tight in-range">
            <label htmlFor="ex-from" className="sr-only">From</label>
            <input id="ex-from" type="date" className="input" min={iso(lo)} max={iso(today)} value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} />
            <span className="faint" aria-hidden>to</span>
            <label htmlFor="ex-to" className="sr-only">To</label>
            <input id="ex-to" type="date" className="input" min={custom.from} max={iso(today)} value={custom.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} />
          </div>
        )}
        <Filters label="Network" value={net} onChange={setNet} items={[{ value: 'all', label: 'All networks' }, ...NETWORKS_SOCIAL.map(n => ({ value: n as NetFilter, label: NETWORK_LABEL[n] }))]} />
      </div>

      <KpiTiles kpis={kpis} label={label} />

      <section className="card pad">
        <div className="section-title">Daily reach <span className="faint">· {net === 'all' ? 'all networks' : NETWORK_LABEL[net]}, thousands</span></div>
        <LineChart label="Daily reach" labels={labels} h={220} format={v => `${Math.round(v)}k`}
          series={[{ name: choice === 'custom' ? 'This range' : `Last ${label}`, data: cur, color: 'var(--a-iris)' }, ...(prev.length ? [{ name: `Previous ${label}`, data: prev, dashed: true, tone: 'faint' as const }] : [])]} />
      </section>

      <div className="grid-2">
        <section className="card pad">
          <div className="section-title">Best times to post <span className="faint">· reach by day and hour, 30 days</span></div>
          <Heatmap values={heat(net)} rows={HEAT_ROWS} cols={HEAT_COLS} label={`Reach by day and hour, ${net === 'all' ? 'all networks' : NETWORK_LABEL[net]}`} best={[best.day, best.col]} />
          <p className="muted heat-note">Best window{net === 'all' ? '' : ` on ${NETWORK_LABEL[net]}`}: <b>{best.dayName} {best.window}</b>, {best.lift}× the median reach. {net === 'all' ? `Instagram brings most of your reach; Atlas posts there at ${ig.time}.` : `Atlas posts at ${best.time}, inside it.`}</p>
        </section>
        <section className="card pad pillar-card">
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
          <Btn size="sm" disabled={!rows.length} onClick={() => downloadFile(`fernway-posts-${iso(fromT)}-${iso(toT)}.csv`, toCSV([['Date', 'Network', 'Post', 'Pillar', 'Author', 'Reach', 'Engagement rate %', 'Clicks'], ...rows.map(p => [iso(p.date), NETWORK_LABEL[p.network], p.title, p.pillar, p.author, p.reach, p.er, p.clicks])]))}><Download size={14} />Export CSV</Btn></div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="table in-posts">
              <thead><tr><th>Post</th>{th('network', 'Network')}{th('date', 'Date')}{th('pillar', 'Pillar')}{th('author', 'Author')}{th('reach', 'Reach')}{th('er', 'Engagement')}{th('clicks', 'Clicks')}</tr></thead>
              <tbody>{rows.map(p => <PostTr key={p.id} p={p} now={now} onOpen={() => setOpen(p)} />)}</tbody>
            </table>
          </div>
        ) : <Empty title="No posts in this period" body="Try a longer period or another network." />}
      </section>
      <PostSheet p={open} onClose={() => setOpen(null)} now={now} />
    </div>
  )
}

function PostTr({ p, now, onOpen }: { p: PostRow; now: number; onOpen: () => void }) {
  return (
    <tr onClick={onOpen}>
      <td><button type="button" className="in-post-open ellipsis mw-320" onClick={e => { e.stopPropagation(); onOpen() }}>{p.title}</button></td>
      <td><Net n={p.network} /></td>
      <td className="mono faint">{dayLabel(p.date, now)}</td>
      <td className="muted">{p.pillar}</td>
      <td className="muted">{p.author}</td>
      <td className="r">{p.reach.toLocaleString('en-GB')}</td>
      <td className="r">{p.er.toFixed(1)}%</td>
      <td className="r">{p.clicks.toLocaleString('en-GB')}</td>
    </tr>
  )
}

/** One post's numbers, against its network's average: what Iris would say about it. */
function PostSheet({ p, onClose, now }: { p: PostRow | null; onClose: () => void; now: number }) {
  const avg = p ? NET_SHARE[p.network].er : 0
  const x = p ? p.er / avg : 1
  return (
    <Sheet open={!!p} onOpenChange={o => !o && onClose()} title={p ? p.title : ''}>
      {p && (
        <div className="stack">
          <div className="row tight"><Net n={p.network} /><span className="faint">{dayLabel(p.date, now)} {hhmm(p.date)} · {p.pillar} · by {p.author}</span></div>
          <dl className="in-post-stats">
            <div><dt>Reach</dt><dd className="num">{p.reach.toLocaleString('en-GB')}</dd></div>
            <div><dt>Engagement rate</dt><dd className="num">{p.er.toFixed(1)}%</dd></div>
            <div><dt>Link clicks</dt><dd className="num">{p.clicks.toLocaleString('en-GB')}</dd></div>
            <div><dt>{NETWORK_LABEL[p.network]} average engagement</dt><dd className="num">{avg.toFixed(1)}%</dd></div>
          </dl>
          <div className="anomaly-cause"><Mark agent="iris" /><p>
            {x >= 1.5 ? `${x.toFixed(1)}× the ${NETWORK_LABEL[p.network]} average. Worth recycling: Atlas can bring it back in a few weeks.`
              : x <= 0.7 ? `${Math.round((1 - x) * 100)}% under the ${NETWORK_LABEL[p.network]} average.${p.network === 'tiktok' ? ' Like the other TikToks since Thursday, the hook is long.' : ''}`
              : `Close to the ${NETWORK_LABEL[p.network]} average.`}
          </p></div>
        </div>
      )}
    </Sheet>
  )
}

/* ---------- Anomalies ---------- */
function Anomalies() {
  const { s, d } = useStore()
  const now = useNow()
  const [view, setView] = useState<'open' | 'closed'>('open')
  const list = anomalyList(s)
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
            <AnomalyActions a={a} />
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

/** An open anomaly's decisions: Iris's proposed actions, a paid boost behind an inline confirmation, its Desk card. */
function AnomalyActions({ a }: { a: Anomaly }) {
  const { s, d } = useStore()
  const [confirm, setConfirm] = useState<string | null>(null)
  const budget = boostBudget(s)
  return (
    <div className="row">
      {confirm ? (
        // Paid spend never goes out on one click.
        <InlineConfirm confirm="Confirm boost" onCancel={() => setConfirm(null)} onConfirm={() => { d({ type: 'insights/anomaly', id: a.id, title: a.title, action: confirm }); setConfirm(null) }}>
          {confirm}? This is paid ad spend, billed to Fernway’s ad account. {budget.cap !== undefined && <>€{budget.left.toLocaleString('en-GB')} of the €{budget.cap.toLocaleString('en-GB')} monthly cap is left.</>}
        </InlineConfirm>
      ) : a.actions.map((x, i) => <Btn key={x} size="sm" variant={i === 0 ? undefined : 'ghost'} onClick={() => /€/.test(x) ? setConfirm(x) : d({ type: 'insights/anomaly', id: a.id, title: a.title, action: x })}>{x}</Btn>)}
      {a.handoff && s.handoffs.some(h => h.id === a.handoff) && <Link to={`/?card=${a.handoff}`} className="btn sm ghost">Review on Desk</Link>}
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
