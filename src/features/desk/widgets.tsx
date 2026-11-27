import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Undo2 } from 'lucide-react'
import type { AgentId } from '../../app/types'
import { groupOf } from '../../app/reducer'
import { useNow, useStore } from '../../app/store'
import { ago, hhmm, left, MIN } from '../../app/time'
import { Btn, Mark } from '../../ui'
import { MoreInfo } from '../../ui/More'
import { BriefScene } from '../../ui/Illustrations'
import { visibleMentions } from '../listening/model'

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

/**
 * The Desk's one block above the list: hello, what needs you, what the agents did alone. The agents' detail (each one's
 * line, the 24 h Shift board, the last actions with Undo) is one click away in a panel.
 */
export function Hello({ title, line, extra, panel, agentLine }: { title: string; line: ReactNode; extra?: ReactNode; panel: string; agentLine?: (id: AgentId) => string }) {
  const { s } = useStore()
  const now = useNow()
  const say = agentLine ?? ((id: AgentId) => AGENT_LINE[id](s))
  return (
    <header className="brief-top desk-hello">
      <div>
        <h1 className="hello">{title}</h1>
        <p className="story">{line} <MoreInfo title={panel}><AgentsPanel line={say} /></MoreInfo></p>
        {extra}
      </div>
      <div className="brief-scene"><BriefScene hour={new Date(now).getHours()} /></div>
    </header>
  )
}

/** Day 30: the morning brief, in one line. */
export function Brief() {
  const { s } = useStore()
  const now = useNow()
  const since = s.brief.since
  const handled = (s.phase === 'day1' ? 0 : 214) + s.log.filter(l => l.at > since && l.status === 'done').length
  const need = s.handoffs.filter(h => !h.lane && groupOf(h) === 'need').length
  const hour = new Date(now).getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return (
    <Hello title={`${hello}, Sam.`} panel={`What your agents did since ${hhmm(since)} yesterday`}
      line={<><b className="num">{need || 'Nothing'}</b> {need ? 'need' : 'needs'} you. Your agents handled <b className="num">{handled}</b> on their own.</>} />
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
