import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Undo2 } from 'lucide-react'
import type { AgentId } from '../../app/types'
import { groupOf } from '../../app/reducer'
import { useNow, useStore } from '../../app/store'
import { ago, hhmm, left, MIN } from '../../app/time'
import { Btn, Delta, Mark } from '../../ui'
import { Spark } from '../../ui/charts'
import { MoreInfo } from '../../ui/More'
import { BriefScene } from '../../ui/Illustrations'
import { AGENTS } from '../../data/agents'
import { change, fmt, kpi, reachSeries } from '../insights/metrics'
import { shareOfVoice, sovTrend, visibleMentions } from '../listening/model'

type S = ReturnType<typeof useStore>['s']

/** What each agent did since the brief: one line each, in the « More info » panel of the Desk header. */
const AGENT_LINE: Record<AgentId, (s: S) => string> = {
  nova: s => `${(s.phase === 'day1' ? 0 : 142) + s.log.filter(l => l.agent === 'nova' && l.at > s.brief.since && l.status === 'done').length} conversations handled alone`,
  atlas: s => s.handoffs.some(h => h.id === 'h-plan') ? 'Next week’s plan is ready for you' : s.phase === 'day1' ? `${s.publishing.ideas.filter(i => i.status === 'new' || i.status === 'ready').length} post ideas in Publishing` : 'Next week is planned and scheduled',
  iris: s => { const n = s.handoffs.filter(h => h.agent === 'iris' && h.kind === 'alert' && !h.lane).length; return `${n || 'No'} ${n === 1 ? 'anomaly' : 'anomalies'}${s.phase === 'day1' ? '' : ' · weekly report written'}` },
  echo: s => { const n = s.handoffs.filter(h => h.topic === 'Competitor' && !h.lane).length; const m = visibleMentions(s).filter(x => x.at > s.brief.since).length; return `${n || 'No'} competitor ${n === 1 ? 'move' : 'moves'}${s.phase === 'day1' ? '' : ` · ${m} new mention${m === 1 ? '' : 's'}`}` },
  sage: s => (s.phase === 'day1' ? 'Pillars and cadence proposed' : 'Trail Week is at 128% of its trajectory'),
  juno: s => (s.phase === 'day1' ? 'Watching your YouTube channel for the next video' : s.handoffs.some(h => h.agent === 'juno' && !h.lane) ? 'New clips are ready for you' : 'No new video since yesterday'),
}

/** What needs you on the Desk, for one agent or all. */
export const needCount = (s: S, agent?: AgentId) => s.handoffs.filter(h => !h.lane && groupOf(h) === 'need' && (!agent || h.agent === agent)).length

/**
 * The morning in one band (matrix §15): hello and the moment's scene, two to four named numbers, then the six agents
 * with what each has for you. Their night in detail (each one's line, the 24 h Shift board, the last actions with
 * Undo) is one click away.
 */
export function Band({ title, children, panel, agentLine }: { title: string; children: ReactNode; panel: string; agentLine?: (id: AgentId) => string }) {
  const { s } = useStore()
  const now = useNow()
  const say = agentLine ?? ((id: AgentId) => AGENT_LINE[id](s))
  return (
    <section className="card desk-band" aria-label="Your morning">
      <div className="band-top">
        <div className="band-hello">
          <span className="band-scene"><BriefScene hour={new Date(now).getHours()} /></span>
          <h1 className="hello">{title}</h1>
        </div>
        {children}
      </div>
      <div className="band-agents">
        <ul aria-label="Your agents">
          {s.agents.map(a => {
            const n = needCount(s, a.id)
            return (
              <li key={a.id}>
                <Link to={AGENTS.find(x => x.id === a.id)?.route ?? `/agents/${a.id}`} title={a.status === 'on' ? say(a.id) : undefined}>
                  <Mark agent={a.id} size="md" state={a.status === 'on' ? 'on' : 'paused'} />
                  <span className="band-agent"><b>{a.name}</b><span className={n ? 'band-for' : ''}>{a.status !== 'on' ? 'Paused' : n ? `${n} for you` : 'On shift'}</span></span>
                </Link>
              </li>
            )
          })}
        </ul>
        <MoreInfo label="What they did" title={panel}><AgentsPanel line={say} /></MoreInfo>
      </div>
    </section>
  )
}

/** One named number of the band. */
export function Stat({ k, v, sub, tone }: { k: ReactNode; v: ReactNode; sub?: ReactNode; tone?: 'alert' }) {
  return (
    <div className="band-stat">
      <span className="band-k">{k}</span>
      <b className="num band-v">{v}</b>
      {sub && <span className={`band-sub ${tone ?? ''}`}>{sub}</span>}
    </div>
  )
}

/** One fact from an agent's module, as a small card: who, the named number, its change and its trend. */
function Fact({ agent, to, k, v, delta, down, series }: { agent: AgentId; to: string; k: string; v: string; delta: string; down?: boolean; series: number[] }) {
  return (
    <Link className="band-fact" to={to}>
      <span className="band-k"><Mark agent={agent} />{k}</span>
      <span className="band-fact-v"><b className="num">{v}</b><Delta v={delta} down={down} /></span>
      <Spark data={series} w={150} h={30} color={`var(--a-${agent})`} label={`${k}, trend`} />
    </Link>
  )
}

/** Day 30: the morning brief as a band. */
export function Brief() {
  const { s } = useStore()
  const now = useNow()
  const since = s.brief.since
  const handled = (s.phase === 'day1' ? 0 : 214) + s.log.filter(l => l.at > since && l.status === 'done').length
  const need = needCount(s)
  const urgent = s.handoffs.filter(h => !h.lane && groupOf(h) === 'need' && h.urgency === 'urgent').length
  const hour = new Date(now).getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  // Iris's reach and Echo's share of voice: the facts the Insights and Listening bands lead with.
  const reach = kpi('reach'), dReach = change(reach)
  const trend = sovTrend(s).fernway, dSov = trend[trend.length - 1] - trend[0]
  return (
    <Band title={`${hello}, Sam.`} panel={`What your agents did since ${hhmm(since)} yesterday`}>
      <Stat k="Need you" v={need || 'None'} sub={urgent ? `${urgent} urgent` : undefined} tone="alert" />
      <Stat k="Handled alone" v={handled} sub={`since ${hhmm(since)} yesterday`} />
      <Fact agent="iris" to="/insights" k="Reach · 7 days" v={fmt.k(reach.value)} delta={fmt.signed(dReach)} down={dReach < 0} series={reachSeries({ days: 28, offset: 0 })} />
      <Fact agent="echo" to="/listening" k="Share of voice" v={`${shareOfVoice(s).fernway}%`} delta={`${dSov > 0 ? '+' : ''}${dSov} pts`} down={dSov < 0} series={trend} />
    </Band>
  )
}

function AgentsPanel({ line }: { line: (id: AgentId) => string }) {
  const { s } = useStore()
  return (
    <div className="stack lg">
      <ul className="team" aria-label="Your team">
        {s.agents.map(a => (
          <li key={a.id}>
            <Link to={`/agents/${a.id}`}>
              <Mark agent={a.id} state={a.status === 'on' ? 'on' : 'paused'} />
              <span><b>{a.name}</b><br /><span className="muted now">{a.status === 'on' ? line(a.id) : 'Paused'}</span></span>
            </Link>
          </li>
        ))}
      </ul>
      <ShiftBoard />
      <LiveFeed />
    </div>
  )
}

/* ---------- Shift board: 24 h of agent signals ---------- */
function ShiftBoard() {
  const { s } = useStore()
  const nav = useNavigate()
  const now = useNow(30000)
  const from = now - 24 * 60 * MIN
  const W = 460, rowH = 22, padL = 64
  const x = (t: number) => padL + ((t - from) / (now - from)) * (W - padL - 16)
  const rows = s.agents
  const hours = [0, 6, 12, 18, 24].map(i => from + i * 60 * MIN)
  const [hover, setHover] = useState<string | null>(null)
  const counts = useMemo(() => Object.fromEntries(rows.map(a => [a.id, s.log.filter(l => l.agent === a.id && l.at >= from).length])), [s.log, rows, from])

  return (
    <section className="shift" aria-label="Shift board, last 24 hours">
      <h3 className="section-title">Shift board <span className="faint">· last 24 h</span></h3>
      <span className="legend m-0">
        <span><i className="legend-tick" />Acted alone</span>
        <span><i className="legend-dot" />Raised to you</span>
      </span>
      <svg viewBox={`0 0 ${W} ${rows.length * rowH + 22}`} width="100%" role="img" aria-label="Agent activity over the last 24 hours">
        {rows.map((a, i) => {
          const y = i * rowH + 11
          return (
            <g key={a.id}>
              <text x={0} y={y + 4} fontSize="12" fill={`var(--a-${a.id}-ink)`} fontWeight="600" fontFamily="var(--font)">{a.name}</text>
              <text x={padL - 10} y={y + 4} fontSize="10" fill="var(--ink-3)" fontFamily="var(--mono)" textAnchor="end">{counts[a.id]}</text>
              <line x1={padL} x2={W - 16} y1={y} y2={y} stroke="var(--line)" />
              {s.log.filter(l => l.agent === a.id && l.at >= from && l.at <= now).map(l => (
                <line className="pointer" key={l.id} x1={x(l.at)} x2={x(l.at)} y1={y - 6} y2={y + 6} stroke={hover === l.id ? 'var(--ink)' : l.status === 'undone' ? 'var(--ink-off)' : `var(--a-${a.id})`} strokeWidth={3} strokeLinecap="round"
                  onMouseEnter={() => setHover(l.id)} onMouseLeave={() => setHover(null)} onClick={() => nav('/agents/activity')}>
                  <title>{`${hhmm(l.at)} · ${l.text}`}</title>
                </line>
              ))}
              {s.handoffs.filter(h => h.agent === a.id && h.at >= from).map(h => (
                <circle key={h.id} cx={x(h.at)} cy={y} r={4} fill={h.urgency === 'urgent' ? 'var(--alert)' : h.urgency === 'today' ? 'var(--caution)' : 'var(--ink-3)'} stroke="var(--panel)" strokeWidth={2}>
                  <title>{`${hhmm(h.at)} · raised: ${h.title}`}</title>
                </circle>
              ))}
            </g>
          )
        })}
        <line x1={x(now)} x2={x(now)} y1={0} y2={rows.length * rowH} stroke="var(--signal)" />
        {hours.map((t, i) => <text key={i} x={x(t)} y={rows.length * rowH + 16} fontSize="10" fill="var(--ink-3)" fontFamily="var(--mono)" textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>{i === 4 ? 'now' : hhmm(t)}</text>)}
      </svg>
    </section>
  )
}

/* ---------- The last actions, with Undo ---------- */
function LiveFeed() {
  const { s, d } = useStore()
  const now = useNow(10000)
  const items = s.log.slice(0, 9)
  return (
    <section aria-label="Latest actions">
      <h3 className="section-title row between">Latest actions<Link className="link-btn t-sm" to="/agents/activity">See all activity</Link></h3>
      <ul className="feed">
        {items.map(l => {
          const canUndo = l.undoUntil && l.undoUntil > now && l.status !== 'undone'
          return (
            <li key={l.id} className={l.status === 'undone' ? 'undone' : ''}>
              <Mark agent={l.agent} />
              <div>
                <p title={l.text}>{l.text}</p>
                <span className="mono faint">{ago(l.at, now)}{l.status === 'undone' ? ' · undone' : canUndo ? ` · undo · ${left(l.undoUntil!, now)}` : ''}</span>
              </div>
              {canUndo && <Btn size="xs" variant="ghost" icon aria-label={`Undo: ${l.text}`} onClick={() => d({ type: 'core/undo', id: l.id })}><Undo2 size={13} /></Btn>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
