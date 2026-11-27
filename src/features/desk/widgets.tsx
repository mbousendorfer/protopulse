import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sunrise, Undo2 } from 'lucide-react'
import type { AgentId, Handoff } from '../../app/types'
import { groupOf } from '../../app/reducer'
import { Spark } from '../../ui/charts'
import { useNow, useStore } from '../../app/store'
import { ago, hhmm, left, MIN, DEMO_START } from '../../app/time'
import { agentName } from '../../data/agents'
import { Btn, Kbd, Mark, TopicIcon } from '../../ui'
import { BriefScene } from '../../ui/Illustrations'
import { visibleMentions } from '../listening/model'

/* ---------- Morning brief: one line, the team at a glance, three highlights ---------- */
const AGENT_LINE: Record<AgentId, (s: ReturnType<typeof useStore>['s'], need: number) => string> = {
  nova: (s, need) => `${(s.phase === 'day1' ? 0 : 142) + s.log.filter(l => l.agent === 'nova' && l.at > s.brief.since && l.status === 'done').length} conversations handled alone`,
  atlas: s => s.handoffs.some(h => h.id === 'h-plan') ? 'Next week’s plan is ready for you' : s.phase === 'day1' ? `${s.publishing.ideas.filter(i => i.status === 'new' || i.status === 'ready').length} post ideas in Publishing` : 'Next week is planned and scheduled',
  iris: s => { const n = s.handoffs.filter(h => h.agent === 'iris' && h.kind === 'alert' && !h.lane).length; return `${n || 'No'} ${n === 1 ? 'anomaly' : 'anomalies'}${s.phase === 'day1' ? '' : ' · weekly report written'}` },
  echo: s => { const n = s.handoffs.filter(h => h.topic === 'Competitor' && !h.lane).length; { const m = visibleMentions(s).filter(x => x.at > s.brief.since).length; return `${n || 'No'} competitor ${n === 1 ? 'move' : 'moves'}${s.phase === 'day1' ? '' : ` · ${m} new mention${m === 1 ? '' : 's'}`}` } },
  sage: s => (s.phase === 'day1' ? 'Pillars and cadence proposed' : 'Trail Week is at 128% of its trajectory'),
  juno: s => (s.phase === 'day1' ? 'Watching your YouTube channel for the next video' : s.handoffs.some(h => h.agent === 'juno' && !h.lane) ? 'New clips are ready for you' : 'No new video since yesterday'),
}

export function Brief({ onPick }: { onPick: (key: string) => void }) {
  const { s, d } = useStore()
  const now = useNow()
  const open = s.handoffs.filter(h => !h.lane)
  const since = s.brief.since
  const handled = (s.phase === 'day1' ? 0 : 214) + s.log.filter(l => l.at > since && l.status === 'done').length
  const need = open.filter(h => groupOf(h) === 'need').length
  const hour = new Date(now).getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  // Up to three highlights, the most visual first.
  const preferred = ['h-tiktok', 'h-peakline', 'h-plan']
  const highlights = [
    ...preferred.map(id => open.find(h => h.id === id)).filter(Boolean),
    ...open.filter(h => !preferred.includes(h.id) && (h.preview?.type === 'metric' || h.topic === 'Competitor' || h.preview?.type === 'plan')),
  ].slice(0, 3) as Handoff[]

  if (s.brief.read) return (
    <button className="brief-folded" onClick={() => d({ type: 'core/briefRead', read: false })}>
      <Sunrise size={14} aria-hidden /> Brief from {hhmm(Math.max(since, DEMO_START - 72 * MIN))} · read <span className="faint">· {need} need you · show again</span>
    </button>
  )

  return (
    <section className="brief card" aria-labelledby="brief-title">
      <div className="brief-head">
        <div className="row tight"><Mark agent="iris" /><span className="faint"><b>Iris</b> wrote your brief · since {hhmm(since)} yesterday</span></div>
        <Btn size="sm" variant="ghost" onClick={() => d({ type: 'core/briefRead', read: true })}>Got it</Btn>
      </div>

      <div className="brief-top">
        <div>
          <h1 id="brief-title" className="hello">{hello}, Sam.</h1>
          {/* What needs you first: it's why you opened the Desk. What the agents did alone comes second. */}
          <p className="story"><b className="num">{need || 'Nothing'}</b> {need === 1 ? 'thing needs' : need ? 'things need' : 'needs'} you. Your agents handled <b className="num">{handled}</b> on their own.</p>
        </div>
        <div className="brief-scene"><BriefScene hour={hour} /></div>
      </div>

      <AgentTiles onPick={onPick} line={(id, n) => AGENT_LINE[id](s, n)} />

      {/* Up to three cards, each one target: it opens the card in Your day, where its actions are. */}
      {highlights.length > 0 && (
        <div className="highlights">
          {highlights.map(h => {
            const p = h.preview
            const plan = p?.type === 'plan' ? planCounts(p.lines) : null
            return (
              <button key={h.id} className="hl-card" onClick={() => onPick(`h:${h.id}`)}>
                <span className="row tight"><TopicIcon agent={h.agent} kind={h.kind} topic={h.topic} size={26} /><span className="faint">{agentName(h.agent)} · {h.topic}</span></span>
                {p?.type === 'metric' ? (
                  <span className="hl-metric">
                    <span><b className="num">{p.value}</b> <span className={`delta ${p.down ? 'down' : 'up'}`}>{p.delta}</span><br /><span className="faint">{p.label}</span></span>
                    <Spark data={p.series} w={110} h={40} color={p.down ? 'var(--alert)' : 'var(--ink-3)'} />
                  </span>
                ) : plan ? (
                  // The plan's own numbers, named: total posts, then posts per network.
                  <span className="hl-metric"><span><b className="num">{plan.total}</b> <span className="muted">posts next week</span><br /><span className="faint">{plan.line}</span></span></span>
                ) : null}
                <span className="hl-title">{h.title}</span>
                <span className="hl-go">Review<ArrowRight size={14} aria-hidden /></span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** "Instagram 5 · TikTok 4 · …" from a plan preview: the total and the line it came from. */
export function planCounts(lines: string[]) {
  const line = lines.find(l => /^(\p{L}+ \d+)( · \p{L}+ \d+)+$/u.test(l))
  if (!line) return null
  return { line, total: [...line.matchAll(/\d+/g)].reduce((n, m) => n + Number(m[0]), 0) }
}

/**
 * The team at a glance: one tile per agent, what it did, and where to go. The whole tile is the target;
 * agents with something for you say "Review N", the others only show the way in.
 */
export function AgentTiles({ onPick, line }: { onPick: (key: string) => void; line: (id: AgentId, need: number) => string }) {
  const { s } = useStore()
  const nav = useNavigate()
  const open = s.handoffs.filter(h => !h.lane)
  return (
    <ul className="agent-grid" aria-label="Your team">
      {s.agents.map(a => {
        const n = open.filter(h => h.agent === a.id && groupOf(h) === 'need').length
        const go = () => (n > 0 ? onPick(`agent:${a.id}`) : nav(a.route))
        return (
          <li key={a.id}>
            <button className="agent-tile" onClick={go}>
              <Mark agent={a.id} size="md" state={a.status === 'on' ? 'on' : 'paused'} />
              <span className="who"><b>{a.name}</b><span>{line(a.id, n)}</span></span>
              {n > 0 ? <span className="go">Review {n}<ArrowRight size={14} aria-hidden /></span> : <ArrowRight size={14} className="go-quiet" aria-hidden />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}


/* ---------- Shift board: 24 h of agent signals ---------- */
export function ShiftBoard() {
  const { s } = useStore()
  const nav = useNavigate()
  const now = useNow(30000)
  const from = now - 24 * 60 * MIN
  const W = 1000, rowH = 22, padL = 70
  const x = (t: number) => padL + ((t - from) / (now - from)) * (W - padL - 16)
  const rows = s.agents
  const hours = [0, 6, 12, 18, 24].map(i => from + i * 60 * MIN)
  const [hover, setHover] = useState<string | null>(null)
  const counts = useMemo(() => Object.fromEntries(rows.map(a => [a.id, s.log.filter(l => l.agent === a.id && l.at >= from).length])), [s.log, rows, from])

  return (
    <section className="shift card" aria-label="Shift board, last 24 hours">
      <div className="card-head">
        <h2>Shift board <span className="faint">· last 24 h</span></h2>
        <span className="legend m-0">
          <span><i className="legend-tick" />Acted alone, in each agent’s colour</span>
          <span><i className="legend-dot" />Raised to you</span>
        </span>
      </div>
      <div className="card-body">
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
      </div>
    </section>
  )
}

/* ---------- Live feed ---------- */
export function LiveFeed() {
  const { s, d } = useStore()
  const now = useNow(10000)
  const nav = useNavigate()
  const items = s.log.slice(0, 9)
  return (
    <section className="card">
      <div className="card-head"><h2 className="row tight"><span className="live-dot" aria-hidden />Live</h2><Btn size="xs" variant="ghost" onClick={() => nav('/agents/activity')}>See all activity</Btn></div>
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

export function Team() {
  const { s } = useStore()
  const nav = useNavigate()
  return (
    <section className="card">
      <div className="card-head"><h2>Team</h2><Btn size="xs" variant="ghost" onClick={() => nav('/agents')}>Manage</Btn></div>
      <ul className="team">
        {s.agents.map(a => (
          <li key={a.id}>
            <button onClick={() => nav(`/agents/${a.id}`)}>
              <Mark agent={a.id} state={a.status === 'on' ? 'on' : 'paused'} />
              <span><b>{a.name}</b> <span className="faint">{a.dept}</span><br /><span className="muted now">{a.status === 'on' ? a.now : 'Paused'}</span></span>
            </button>
          </li>
        ))}
      </ul>
      <div className="team-foot"><Kbd>?</Kbd><span className="faint">Keyboard shortcuts</span></div>
    </section>
  )
}
