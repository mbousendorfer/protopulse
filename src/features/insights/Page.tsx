import { useMemo, useState, type ReactNode } from 'react'
import type { Network } from '../../app/types'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpDown, CalendarClock, Check, ChevronDown, Download, Eye, FileText, Heart, MessageCircle, MousePointerClick, Pause, Play, RotateCcw, Send, Smile, Timer, Trash2, Users } from 'lucide-react'
import { BulkBar, SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { downloadFile, toCSV } from './alerts'
import { gist } from '../../ui/gist'
import { useNow, useStore } from '../../app/store'
import { ago, dayLabel, hhmm, DAY } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import {
  DAILY_REACH, HEAT_COLS, HEAT_ROWS, NETWORKS_SOCIAL, NET_SHARE, PILLAR_PERF, POSTS, TIKTOK_VIEWS, dayLabels,
  type Cited, type Kpi, type NetFilter, type PostRow, type Report,
} from '../../data/insights'
import { Btn, Confidence, Empty, Filters, Mark, Menu, Net, PageHead, Pill, Seg, Sheet, Tabs, Tip } from '../../ui'
import { DecisionRow } from '../../ui/Decisions'
import { Metrics, ObjectBody, Props, Section } from '../../ui/ObjectPanel'
import { actionOf } from '../../app/core'
import { nextRun } from './reports'
import type { Schedule } from './slice'
import '../listening/list.css'
import { MoreInfo } from '../../ui/More'
import { HBars, Heatmap, LineChart, Spark } from '../../ui/charts'
import { bestTime, heat, rangeKpis, reachSeries, type Range } from './metrics'
import { anomalyList } from './slice'
import { insightsNeeds } from './needs'
import type { Anomaly } from '../../data/insights'
import type { Handoff } from '../../app/types'
import { reportList } from './reports'
import { roiByNetwork, roiTotals } from './roi'
import type { State } from '../../app/state'
import Roi, { DataBar } from './RoiTab'
import { benchmarkRows } from './benchmark'
import AudienceTab from './AudienceTab'
import { ReportOut, SaveTemplate, SectionTools, StudioAsk, StudioEdit } from './StudioPanels'
import './insights.css'

type Tab = 'reports' | 'explore' | 'audience' | 'roi'

export default function InsightsPage() {
  const loc = useLocation()
  const nav = useNavigate()
  const { s } = useStore()
  const seg = loc.pathname.split('/')[2] ?? ''
  const tab: Tab = seg === 'explore' ? 'explore' : seg === 'roi' ? 'roi' : seg === 'audience' ? 'audience' : 'reports'

  return (
    <div className="page insights">
      <PageHead agent="iris" title="Insights" />
      <Tabs value={tab} onChange={v => nav(v === 'reports' ? '/insights' : `/insights/${v}`)} items={[
        { value: 'reports', label: 'Reports', count: insightsNeeds(s).count || undefined },
        { value: 'explore', label: 'Explore' },
        { value: 'audience', label: 'Audience' },
        { value: 'roi', label: 'ROI' },
      ]} />
      <Routes>
        <Route index element={<Reports />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports/:id" element={<ReportView />} />
        <Route path="explore" element={<Explore />} />
        <Route path="audience" element={<AudienceTab />} />
        <Route path="roi" element={<Roi />} />
        <Route path="anomalies" element={<Navigate to="/insights?show=closed" replace />} />
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

/* ---------- Insights landing: the week, what Iris needs, then the reports (matrix §15) ---------- */
const KIND_LABEL: Record<Report['kind'], string> = { brief: 'Brief', weekly: 'Weekly report', campaign: 'Campaign recap', custom: 'Asked by you' }
/** The title says what's in it; the type sits in the meta. Out of context (journal, file name) it gets its type back. */
const reportMeta = (r: Report) => (r.kind === 'weekly' ? KIND_LABEL.weekly : `${KIND_LABEL[r.kind]} · ${r.period}`)
const fullTitle = (r: Report) => (r.kind === 'brief' ? r.title : `${KIND_LABEL[r.kind]} · ${r.title}`)
const EVERY: Record<Schedule['every'], string> = { week: 'Every Monday', month: 'On the 1st of each month' }
const eur = (v: number) => `€${Math.round(v).toLocaleString('en-GB')}`

/** Change against the previous period, worded per format, and whether it's good news. */
function kpiDelta(k: Kpi) {
  const diff = k.fmt === 'pct' || k.fmt === 'min' ? k.value - k.prev : ((k.value - k.prev) / k.prev) * 100
  const txt = k.fmt === 'pct' ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pt` : k.fmt === 'min' ? `${diff > 0 ? '+' : '−'}${Math.abs(diff)} min` : `${diff > 0 ? '+' : '−'}${Math.abs(Math.round(diff))}%`
  return { diff, txt, good: k.lowerBetter ? diff < 0 : diff > 0 }
}

/** The week in one look: four named numbers with their change, four weeks of reach, and Iris's read in one sentence. */
function IrisOverview() {
  const { s } = useStore()
  const week = rangeKpis({ days: 7, offset: 0 }, 'all')
  const pick = (key: string) => week.find(k => k.key === key)!
  const sales = roiTotals(roiByNetwork(7)).revenue, salesBefore = roiTotals(roiByNetwork(7, undefined, true)).revenue
  const tiles: Kpi[] = [pick('reach'), pick('er'), pick('clicks'), { key: 'sales', label: 'Sales from social', value: sales, prev: salesBefore, fmt: 'int' }]
  // Iris names the biggest mover among the counts (a rate's points don't compare with a count's percent).
  const best = tiles.filter(k => k.fmt !== 'pct').reduce((a, b) => (kpiDelta(b).diff > kpiDelta(a).diff ? b : a))
  const weekly = reportList(s).find(r => r.kind === 'weekly')
  return (
    <section className="card ov" aria-label="This week">
      <p className="ov-read"><Mark agent="iris" /><span>{best.label}: the week’s biggest move, {kpiDelta(best).txt} on the week before.</span>
        {weekly && <Link to={`/insights/reports/${weekly.id}`} className="link-btn t-sm">Weekly report</Link>}</p>
      <div className="ov-body">
        <dl className="ov-kpis">
          {tiles.map(k => {
            const dl = kpiDelta(k)
            return <div key={k.key} className="ov-kpi"><dt>{k.label}</dt><dd><b className="num">{k.key === 'sales' ? eur(k.value) : fmtKpi(k, k.value)}</b><span className={`delta ${dl.good ? 'up' : 'down'}`}>{dl.txt}</span></dd></div>
          })}
        </dl>
        <figure className="ov-chart">
          <figcaption className="t-sm">Daily reach, last 4 weeks</figcaption>
          <Spark data={reachSeries({ days: 28, offset: 0 })} w={360} h={56} color="var(--a-iris)" label="Daily reach, last 4 weeks" />
        </figure>
      </div>
    </section>
  )
}

/** A drop is more urgent than a spike; then Iris's confidence. */
const urgency = (a: Anomaly) => (a.down ? 1000 : 0) + a.confidence

function Reports() {
  const { s, d } = useStore()
  const now = useNow()
  const [params] = useSearchParams()
  const { anomalies, cards } = insightsNeeds(s)
  const reports = reportList(s)
  const closed = anomalyList(s).filter(a => !a.open)
  const showClosed = params.get('show') === 'closed' && closed.length > 0
  const [lead, ...rest] = [...anomalies].sort((a, b) => urgency(b) - urgency(a))
  // Closed anomalies are the volume case: select them to reopen several at once.
  const ids = useMemo(() => closed.map(a => a.id), [closed.map(a => a.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(ids, 'closed')
  const lvl = actionOf(s, 'iris', 'iris-report')?.autonomy
  const does = (sc: Schedule) => (sc.to === 'sam' ? 'Iris writes it for you' : lvl === 'act' ? 'Iris sends it to Claire' : lvl === 'draft' ? 'Waits for you, then goes to Claire' : 'Iris writes it, you send it')
  const queue: ReactNode[] = [
    ...rest.map(a => <AnomalyRow key={a.id} a={a} now={now} />),
    ...cards.map(h => <DecisionRow key={h.id} lead={<span className="sl-lead-icon" aria-hidden><FileText size={14} /></span>}
      title={h.link ? <Link to={h.link}>{h.title}</Link> : h.title}
      line={<><span className="sl-gist">{h.context}</span>{h.why && <MoreInfo label="Why?" title={`Why Iris asks: ${h.title}`}><p>{h.why}</p><Confidence v={h.confidence} /></MoreInfo>}</>}
      acts={<CardDecision h={h} onDecide={decision => d({ type: 'core/resolve', id: h.id, decision })} />} />),
  ]

  return (
    <div className="reports">
      <IrisOverview />

      <section className="stack" aria-labelledby="in-needs">
        <div className="row in-sec">
          <h2 id="in-needs" className="section-title flush">{showClosed ? 'Closed anomalies' : 'Needs you'} <span className="faint num">{showClosed ? closed.length : anomalies.length + cards.length}</span></h2>
          <span className="spacer" />
          {showClosed ? <Link to="/insights" className="link-btn t-sm">Needs you</Link> : closed.length > 0 && <Link to="/insights?show=closed" className="link-btn t-sm">Closed anomalies</Link>}
          <Link to="/agents/iris?tab=alerts" className="link-btn t-sm">Alert rules</Link>
        </div>
        {showClosed ? (
          <section className="card sl-list" aria-label="Closed anomalies">
            {sel.count > 0
              ? <BulkBar count={sel.count} noun={sel.count > 1 ? 'anomalies selected' : 'anomaly selected'} onClear={sel.clear} actions={[{ label: 'Reopen', icon: <RotateCcw size={14} />, primary: true, onRun: () => { d({ type: 'insights/anomalies', ids: [...sel.selected], op: 'reopen' }); sel.clear() } }]} />
              : closed.length > 1 && <div className="sl-head"><SelectAll sel={sel} label="Select every closed anomaly" /></div>}
            <ul className="rows">{closed.map(a => <DecisionRow key={a.id}
              lead={<SelectBox checked={sel.has(a.id)} visible={sel.count > 0} onToggle={shift => sel.toggle(a.id, shift)} label={`Select: ${a.title}`} />}
              title={<><Net n={a.network} size={14} /> {a.title}</>}
              line={<><span className="sl-gist">{a.resolution}</span><span>{ago(a.detectedAt, now)}</span></>}
              acts={<Btn size="sm" variant="ghost" onClick={() => d({ type: 'insights/reopen', id: a.id })}>Reopen</Btn>} />)}</ul>
          </section>
        ) : lead || queue.length ? (
          <div className={`in-needs ${lead && queue.length ? 'split' : ''}`}>
            {lead && <AnomalyFeature a={lead} now={now} />}
            {queue.length > 0 && <section className="card sl-list" aria-label="More to decide"><ul className="rows">{queue}</ul></section>}
          </div>
        ) : <p className="muted">Nothing needs you here. Iris checks every network every hour.</p>}
      </section>

      <section className="stack" aria-labelledby="in-reports">
        <h2 id="in-reports" className="section-title flush">Reports <span className="faint num">{reports.length}</span></h2>
        <StudioAsk />
        {/* The report waiting for Sam first, then what's scheduled, then the rest, newest first. */}
        <ul className="in-report-grid">
          {reports.filter(r => r.draft).map(r => <li key={r.id} className="wide"><ReportCard r={r} now={now} /></li>)}
          {s.insights.schedules.map(sc => (
            <li key={sc.id} className="card in-report in-sched">
              <div className="row tight"><span className="kpi-icon" aria-hidden><CalendarClock size={14} /></span><span className="spacer" />{sc.paused ? <Pill>Paused</Pill> : <Pill tone="signal">Scheduled</Pill>}</div>
              <h3>{sc.name}</h3>
              <span className="t-sm">{EVERY[sc.every]} at 08:00 to {sc.to === 'claire' ? 'Claire' : 'you'}{!sc.paused && <> · next {dayLabel(nextRun(sc, now), now)}</>}</span>
              {!sc.paused && <span className="faint t-sm">{does(sc)}</span>}
              <div className="row tight in-sched-acts">
                <Btn size="sm" onClick={() => d({ type: 'insights/schedulePause', id: sc.id })}>{sc.paused ? <><Play size={14} />Resume</> : <><Pause size={14} />Pause</>}</Btn>
                <Btn size="sm" variant="ghost" icon aria-label={`Delete schedule ${sc.name}`} onClick={() => d({ type: 'insights/scheduleDelete', id: sc.id })}><Trash2 size={14} /></Btn>
              </div>
            </li>
          ))}
          {reports.filter(r => !r.draft).map(r => <li key={r.id}><ReportCard r={r} now={now} /></li>)}
        </ul>
      </section>
    </div>
  )
}

/** What a report's card draws: its own chart when it has one (TikTok, a campaign), else reach over its period. */
function reportTrend(s: State, r: Report, now: number): { label: string; data: number[] } {
  const chart = r.sections.find(x => x.chart)?.chart
  if (chart === 'tiktok') return { label: 'TikTok views per video', data: TIKTOK_VIEWS }
  const c = s.strategy.campaigns.find(x => x.reportId === r.id || x.id === r.recipe?.campaign)
  if (c?.actual.length && (chart === 'campaign' || r.kind === 'campaign')) return { label: c.goal.label.replace(' (€)', ''), data: c.actual }
  const days = r.recipe?.days ?? 7
  const offset = Math.min(90 - days, Math.max(0, Math.floor((now - r.writtenAt) / DAY)))
  return { label: 'Daily reach', data: reachSeries({ days, offset }) }
}

/** A report: what it charts, its period, and a status only when it differs (waits for you, sent to Claire). */
function ReportCard({ r, now }: { r: Report; now: number }) {
  const { s } = useStore()
  const shared = s.insights.shared[r.id]
  const trend = reportTrend(s, r, now)
  return (
    <Link to={`/insights/reports/${r.id}`} className={`card in-report ${r.draft ? 'draft' : ''}`}>
      <div className="row tight">
        <span className="t-sm">{KIND_LABEL[r.kind]}</span><span className="spacer" />
        {r.draft ? <Pill tone="caution">To approve</Pill> : shared ? <Pill tone="ok"><Check size={12} />Sent to Claire</Pill> : null}
      </div>
      <h3>{r.title}</h3>
      <Spark data={trend.data} w={480} h={r.draft ? 64 : 44} color="var(--a-iris)" label={`${trend.label}, ${r.period}`} />
      <span className="faint t-sm ellipsis">{trend.label} · {r.period}</span>
    </Link>
  )
}

/** The anomaly to decide first, set apart: its number named, its curve, Iris's reason and her options. */
function AnomalyFeature({ a, now }: { a: Anomaly; now: number }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const act = (x: string) => d({ type: 'insights/anomaly', id: a.id, title: a.title, action: x })
  const desk = a.handoff && s.handoffs.some(h => h.id === a.handoff)
  return (
    <article className="card in-feature" aria-label={a.title}>
      <div className="row tight"><Net n={a.network} /><span className="faint t-sm">{ago(a.detectedAt, now)}</span></div>
      <h3>{a.title}</h3>
      <div className="in-feature-fig">
        <dl className="in-feature-num"><dt className="t-sm">{a.metric}</dt><dd><b className="num">{a.value}</b><span className={`delta ${a.down ? 'down' : 'up'}`}>{a.delta}</span></dd></dl>
        <Spark data={a.series} w={420} h={64} tone={a.down ? 'alert' : 'ink'} color="var(--a-iris)" label={a.metric} />
      </div>
      <p className="in-feature-why"><Mark agent="iris" /><span>{gist(a.cause)} <span className="faint">{a.confidence}% confident</span>{' '}
        <MoreInfo label="Why?" title={`Why Iris raised “${a.title}”`}><AnomalyWhy a={a} now={now} /></MoreInfo></span></p>
      <div className="row tight">
        {a.actions[0] && <Btn variant="primary" size="sm" onClick={() => act(a.actions[0])}>{a.actions[0]}</Btn>}
        {a.actions.slice(1).map(x => <Btn key={x} size="sm" onClick={() => act(x)}>{x}</Btn>)}
        <Menu trigger={<Btn size="sm" variant="ghost" icon aria-label={`More for ${a.title}`}><ChevronDown size={14} /></Btn>} items={[
          ...(desk ? [{ label: 'Review on Desk', onSelect: () => nav(`/?card=${a.handoff}`) }, 'sep' as const] : []),
          { label: 'Mark handled', onSelect: () => d({ type: 'insights/anomalies', ids: [a.id], op: 'handle' }) },
          { label: 'Snooze a week', onSelect: () => d({ type: 'insights/anomalies', ids: [a.id], op: 'snooze' }) },
        ]} />
      </div>
    </article>
  )
}

/** The quick decision on one of Iris's Desk cards, right here: its options, or approve. The Desk keeps the Undo. */
function CardDecision({ h, onDecide }: { h: Handoff; onDecide: (d: { kind: 'approve' } | { kind: 'option'; option: string; index: number }) => void }) {
  if (h.options?.length) {
    const rec = Math.max(0, h.options.findIndex(o => o.recommended))
    return <>
      <Btn size="sm" onClick={() => onDecide({ kind: 'option', option: h.options![rec].label, index: rec })}>{h.options[rec].label}</Btn>
      {h.options.length > 1 && <Menu trigger={<Btn size="sm" variant="ghost" icon aria-label="Other options"><ChevronDown size={14} /></Btn>}
        items={h.options.map((o, i) => ({ label: o.label, onSelect: () => onDecide({ kind: 'option', option: o.label, index: i }) }))} />}
    </>
  }
  return <>
    <Btn size="sm" onClick={() => onDecide({ kind: 'approve' })}>{h.topic === 'Weekly report' ? <><Send size={14} />Share with Claire</> : 'Approve'}</Btn>
    <Link to={`/?card=${h.id}`} className="btn sm ghost">Review on Desk</Link>
  </>
}

/** KPI tiles: the number, its trend, and the previous period, always named. */
function KpiTiles({ kpis, label }: { kpis: ReturnType<typeof rangeKpis>; /** The period, when no heading around the tiles names it. */ label?: string }) {
  return (
    <dl className="kpi-grid">
      {kpis.map(k => {
        const { txt, good } = kpiDelta(k)
        return (
          <div key={k.key} className="kpi">
            <dt><span className="kpi-icon" aria-hidden>{kpiIcon(k.label)}</span>{k.label}</dt>
            <dd><b className="num">{fmtKpi(k, k.value)}</b><span className={`delta ${good ? 'up' : 'down'}`}>{txt}</span></dd>
            <span className="faint kpi-prev">vs {fmtKpi(k, k.prev)}{label ? ` the previous ${label}` : ''}</span>
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
            {sec.chart === 'benchmark' && <BenchTable />}
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

/** Fernway against the competitors Echo tracks, read now. */
function BenchTable() {
  const { s } = useStore()
  return (
    <div className="table-wrap report-chart"><table className="table">
      <thead><tr><th>Brand</th><th className="r">Followers</th><th className="r">Growth a week</th><th className="r">Engagement</th><th className="r">Posts a week</th><th className="r">Share of voice</th></tr></thead>
      <tbody>{benchmarkRows(s).map(r => <tr key={r.id}><td>{r.us ? <b>{r.name}</b> : r.name}</td><td className="r">{Math.round(r.followers / 1000)}k</td><td className="r">+{r.growth}%</td><td className="r">{r.er}%</td><td className="r">{r.cadence}</td><td className="r">{r.sov}%</td></tr>)}</tbody>
    </table></div>
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
  // Pillars: the top engagement rate is the one to read. Their targets live in Strategy.
  const topPillar = PILLAR_PERF.reduce((a, b) => (b.er > a.er ? b : a))
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
  const allReach = rangeKpis(range, 'all').find(k => k.key === 'reach')!.value
  const byNet = NETWORKS_SOCIAL.map(n => ({ label: NETWORK_LABEL[n], value: Math.round((allReach * NET_SHARE[n].share) / 1000) })).sort((a, b) => b.value - a.value)
  const topReach = Math.max(1, ...rows.map(p => p.reach))

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

      <div className="in-reach">
        <section className="card pad">
          <div className="section-title">Daily reach <span className="faint">· {net === 'all' ? 'all networks' : NETWORK_LABEL[net]}, thousands</span></div>
          <LineChart label="Daily reach" labels={labels} h={220} format={v => `${Math.round(v)}k`}
            series={[{ name: choice === 'custom' ? 'This range' : `Last ${label}`, data: cur, color: 'var(--a-iris)' }, ...(prev.length ? [{ name: `Previous ${label}`, data: prev, dashed: true, tone: 'faint' as const }] : [])]} />
        </section>
        <section className="card pad">
          <div className="section-title">Reach by network <span className="faint">· {label}</span></div>
          <HBars items={byNet} format={v => `${v}k`} highlight={net === 'all' ? undefined : NETWORK_LABEL[net]} color="var(--a-iris)" />
        </section>
      </div>

      <div className="grid-2">
        <section className="card pad">
          <div className="section-title">Best times to post <span className="faint">· reach by day and hour, 30 days</span></div>
          <Heatmap values={heat(net)} rows={HEAT_ROWS} cols={HEAT_COLS} label={`Reach by day and hour, ${net === 'all' ? 'all networks' : NETWORK_LABEL[net]}`} best={[best.day, best.col]} />
          <p className="muted heat-note">Best window{net === 'all' ? '' : ` on ${NETWORK_LABEL[net]}`}: <b>{best.dayName} {best.window}</b>, {best.lift}× the median reach. {net === 'all' ? `Instagram brings most of your reach; Atlas posts there at ${ig.time}.` : `Atlas posts at ${best.time}, inside it.`}</p>
        </section>
        <section className="card pad pillar-card">
          <div className="section-title">By pillar <span className="faint">· 30 days</span><Link to="/strategy/pillars" className="link-btn t-sm push-end">Targets in Strategy</Link></div>
          <table className="table pillar-table">
            <thead><tr><th>Pillar</th><th>Engagement rate</th><th className="r">Saves rate</th></tr></thead>
            <tbody>{PILLAR_PERF.map(p => {
              return (
                <tr key={p.pillar} className={p === topPillar ? 'best' : undefined}>
                  <td>{p.pillar}</td>
                  <td><span className="pillar-er"><span className="track"><i style={{ width: `${(p.er / topPillar.er) * 100}%` }} /></span><b className="num">{p.er.toFixed(1)}%</b></span></td>
                  <td className="r num">{p.saves}%</td>
                </tr>
              )
            })}</tbody>
          </table>
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h2>Posts <span className="faint num">{rows.length}</span></h2>
          <Btn size="sm" disabled={!rows.length} onClick={() => downloadFile(`fernway-posts-${iso(fromT)}-${iso(toT)}.csv`, toCSV([['Date', 'Network', 'Post', 'Pillar', 'Author', 'Reach', 'Engagement rate %', 'Clicks'], ...rows.map(p => [iso(p.date), NETWORK_LABEL[p.network], p.title, p.pillar, p.author, p.reach, p.er, p.clicks])]))}><Download size={14} />Export CSV</Btn></div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="table in-posts">
              <thead><tr><th>Post</th>{th('network', 'Network')}{th('date', 'Date')}{th('pillar', 'Pillar')}{th('author', 'Author')}{th('reach', 'Reach')}{th('er', 'Engagement')}{th('clicks', 'Clicks')}</tr></thead>
              <tbody>{rows.map(p => <PostTr key={p.id} p={p} now={now} top={topReach} onOpen={() => setOpen(p)} />)}</tbody>
            </table>
          </div>
        ) : <Empty title="No posts in this period" body="Try a longer period or another network." />}
      </section>
      <PostSheet p={open} rows={rows} onPick={setOpen} onClose={() => setOpen(null)} now={now} />
    </div>
  )
}

function PostTr({ p, now, top, onOpen }: { p: PostRow; now: number; top: number; onOpen: () => void }) {
  return (
    <tr onClick={onOpen}>
      <td><button type="button" className="in-post-open ellipsis mw-320" onClick={e => { e.stopPropagation(); onOpen() }}>{p.title}</button></td>
      <td><Net n={p.network} /></td>
      <td className="mono faint">{dayLabel(p.date, now)}</td>
      <td className="muted">{p.pillar}</td>
      <td className="muted">{p.author}</td>
      <td className="r"><DataBar value={p.reach} max={top}>{p.reach.toLocaleString('en-GB')}</DataBar></td>
      <td className="r">{p.er.toFixed(1)}%</td>
      <td className="r">{p.clicks.toLocaleString('en-GB')}</td>
    </tr>
  )
}

/** One post's numbers, against its network's average: what Iris would say about it (an object panel, matrix §16). */
function PostSheet({ p, rows, onPick, onClose, now }: { p: PostRow | null; rows: PostRow[]; onPick: (p: PostRow) => void; onClose: () => void; now: number }) {
  if (!p) return null
  const avg = NET_SHARE[p.network].er
  const x = p.er / avg
  const at = rows.findIndex(r => r.id === p.id)
  return (
    <Sheet open onOpenChange={o => !o && onClose()} head={<Net n={p.network} size={20} />} title={p.title}
      meta={[`${dayLabel(p.date, now)} ${hhmm(p.date)}`, NETWORK_LABEL[p.network], `${p.pillar} pillar`]}
      status={<Pill tone="ok">Published</Pill>}
      nav={at >= 0 ? { noun: 'post', prev: at > 0 ? () => onPick(rows[at - 1]) : undefined, next: at < rows.length - 1 ? () => onPick(rows[at + 1]) : undefined } : undefined}>
      <div className="obj-panel">
        <ObjectBody
          main={<Section title="Results">
            <Metrics items={[
              { label: 'Reach', value: p.reach.toLocaleString('en-GB') },
              { label: 'Engagement rate', value: `${p.er.toFixed(1)}%`, note: `${NETWORK_LABEL[p.network]} average: ${avg.toFixed(1)}%` },
              { label: 'Link clicks', value: p.clicks.toLocaleString('en-GB') },
            ]} />
            <p className="obj-note"><Mark agent="iris" /><span><b>Iris:</b> {x >= 1.5 ? `${x.toFixed(1)}× the ${NETWORK_LABEL[p.network]} average. Worth recycling: Atlas can bring it back in a few weeks.`
              : x <= 0.7 ? `${Math.round((1 - x) * 100)}% under the ${NETWORK_LABEL[p.network]} average.${p.network === 'tiktok' ? ' Like the other TikToks since Thursday, the hook is long.' : ''}`
              : `Close to the ${NETWORK_LABEL[p.network]} average.`}</span></p>
          </Section>}
          aside={<Props rows={[
            { label: 'Published', value: `${dayLabel(p.date, now)} ${hhmm(p.date)}` },
            { label: 'Network', value: <><Net n={p.network} />{NETWORK_LABEL[p.network]}</> },
            { label: 'Pillar', value: p.pillar },
            { label: 'Written by', value: p.author === 'Atlas' ? <><Mark agent="atlas" />Atlas</> : 'You' },
          ]} />}
        />
      </div>
    </Sheet>
  )
}

/** Behind « Why? » on an anomaly row: the full cause, how sure Iris is, when and by which rule it was raised. */
function AnomalyWhy({ a, now }: { a: Anomaly; now: number }) {
  return (
    <div className="stack">
      <div className="row tight"><Net n={a.network} /><span>{a.metric} <b className="num">{a.value}</b> <span className={`delta ${a.down ? 'down' : 'up'}`}>{a.delta}</span></span></div>
      <Spark data={a.series} w={320} h={56} tone={a.down ? 'alert' : 'ink'} color="var(--a-iris)" label={a.metric} />
      <div className="anomaly-cause"><Mark agent="iris" /><p><span className="faint">Likely cause:</span> {a.cause}</p></div>
      <Confidence v={a.confidence} />
      <p className="faint">Detected {ago(a.detectedAt, now)}{a.rule ? <> by your alert rule “{a.rule}”. <Link to="/agents/iris?tab=alerts">Edit</Link></> : '.'} The handled ones are in <Link to="/insights?show=closed">Closed anomalies</Link>.</p>
    </div>
  )
}

/** An open anomaly: Iris's first action on the row, the others in the menu. */
function AnomalyRow({ a, now }: { a: Anomaly; now: number }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const act = (x: string) => d({ type: 'insights/anomaly', id: a.id, title: a.title, action: x })
  const desk = a.handoff && s.handoffs.some(h => h.id === a.handoff)
  return (
    <DecisionRow lead={<span className="in-row-spark"><Spark data={a.series} w={32} h={20} fill={false} tone={a.down ? 'alert' : 'ink'} color="var(--a-iris)" label={a.metric} /></span>} title={<><Net n={a.network} size={14} /> {a.title}</>}
      line={<><span className="sl-gist">{gist(a.cause)}</span><span>{a.confidence}% confident</span>
        <MoreInfo label="Why?" title={`Why Iris raised “${a.title}”`}><AnomalyWhy a={a} now={now} /></MoreInfo></>}
      acts={<>
        {a.actions[0] && <Btn size="sm" onClick={() => act(a.actions[0])}>{a.actions[0]}</Btn>}
        <Menu trigger={<Btn size="sm" variant="ghost" icon aria-label={`More for ${a.title}`}><ChevronDown size={14} /></Btn>} items={[
          ...a.actions.slice(1).map(x => ({ label: x, onSelect: () => act(x) })),
          ...(desk ? [{ label: 'Review on Desk', onSelect: () => nav(`/?card=${a.handoff}`) }] : []),
          'sep',
          { label: 'Mark handled', onSelect: () => d({ type: 'insights/anomalies', ids: [a.id], op: 'handle' }) },
          { label: 'Snooze a week', onSelect: () => d({ type: 'insights/anomalies', ids: [a.id], op: 'snooze' }) },
        ]} />
      </>} />
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
