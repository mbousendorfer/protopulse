import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sunrise, Undo2 } from 'lucide-react'
import type { AgentId, Handoff } from '../../app/types'
import { groupOf } from '../../app/reducer'
import { Spark } from '../../ui/charts'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { useHandoffActions } from './parts'
import { useNow, useStore } from '../../app/store'
import { ago, hhmm, MIN, DEMO_START } from '../../app/time'
import { agentName } from '../../data/agents'
import { Btn, Kbd, Mark, TopicIcon } from '../../ui'
import { BriefScene } from '../../ui/Illustrations'

/* ---------- Morning brief: one line, the team at a glance, three highlights ---------- */
const AGENT_LINE: Record<AgentId, (s: ReturnType<typeof useStore>['s'], need: number) => string> = {
  nova: (s, need) => `${142 + s.log.filter(l => l.agent === 'nova' && l.at > s.brief.since && l.status === 'done').length} conversations handled alone${need ? ` · ${need} drafts to check` : ''}`,
  atlas: s => s.handoffs.some(h => h.id === 'h-plan') ? 'Next week’s plan is ready for you' : 'Next week is planned and scheduled',
  iris: s => { const n = s.handoffs.filter(h => h.agent === 'iris' && h.kind === 'alert' && !h.lane).length; return `${n || 'No'} ${n === 1 ? 'anomaly' : 'anomalies'} · weekly report written` },
  echo: s => { const n = s.handoffs.filter(h => h.topic === 'Competitor' && !h.lane).length; return `${n || 'No'} competitor ${n === 1 ? 'move' : 'moves'} · 23 new mentions` },
  sage: () => 'Trail Week is at 128% of its trajectory',
}

export function Brief({ onPick }: { onPick: (key: string) => void }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const act = useHandoffActions()
  const now = useNow()
  const open = s.handoffs.filter(h => !h.lane)
  const since = s.brief.since
  const handled = 214 + s.log.filter(l => l.at > since && l.status === 'done').length
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
        <div className="row tight"><Mark agent="iris" /><span className="faint"><b style={{ color: 'var(--a-iris-ink)', fontWeight: 600 }}>Iris</b> wrote your brief · since {hhmm(since)} yesterday</span></div>
        <Btn size="sm" variant="ghost" onClick={() => d({ type: 'core/briefRead', read: true })}>Got it</Btn>
      </div>

      <div className="brief-top">
        <div>
          <h1 id="brief-title" className="hello">{hello}, Sam.</h1>
          <p className="story">Your agents handled <b className="num">{handled}</b> things while you were away. <b className="num">{need}</b> need you.</p>
        </div>
        <div className="brief-scene"><BriefScene hour={hour} /></div>
      </div>

      <ul className="agent-band">
        {s.agents.map(a => {
          const n = open.filter(h => h.agent === a.id && groupOf(h) === 'need').length
          const series = Array.from({ length: 12 }, (_, i) => s.log.filter(l => l.agent === a.id && l.at > now - (12 - i) * 70 * MIN && l.at <= now - (11 - i) * 70 * MIN).length)
          return (
            <li key={a.id} className="agent-line">
              <Mark agent={a.id} size="md" state={a.status === 'on' ? 'on' : 'paused'} />
              <div className="who"><b>{a.name}</b><span className="faint">{AGENT_LINE[a.id](s, n)}</span></div>
              <span className="spark-cell" aria-hidden><Spark data={series} w={84} h={22} color={`var(--a-${a.id})`} fill={false} /></span>
              {n > 0 ? <Btn size="sm" onClick={() => onPick(`agent:${a.id}`)}>Review {n}</Btn> : <Btn size="sm" variant="ghost" onClick={() => nav(a.id === 'atlas' && s.handoffs.some(h => h.id === 'h-plan') ? '/publishing/plan' : a.route)}>Open</Btn>}
            </li>
          )
        })}
      </ul>

      {highlights.length > 0 && (
        <div className="highlights">
          {highlights.map(h => {
            const rec = h.options ? Math.max(0, h.options.findIndex(o => o.recommended)) : -1
            const p = h.preview
            return (
              <article key={h.id} className="hl-card" style={{ ['--tint' as string]: `var(--a-${h.agent}-wash)` }}>
                <button className="hl-body" onClick={() => onPick(`h:${h.id}`)}>
                  <span className="row tight"><TopicIcon agent={h.agent} kind={h.kind} topic={h.topic} size={26} /><span className="faint">{agentName(h.agent)} · {h.topic}</span></span>
                  {p?.type === 'metric' ? (
                    <span className="hl-metric">
                      <span><b className="num">{p.value}</b> <span className={`delta ${p.down ? 'down' : 'up'}`}>{p.delta}</span><br /><span className="faint">{p.label}</span></span>
                      <Spark data={p.series} w={110} h={40} color={p.down ? 'var(--alert)' : 'var(--ink-3)'} />
                    </span>
                  ) : p?.type === 'plan' ? (
                    <span className="hl-plan" aria-label="Posts per day next week">
                      {[2, 2, 2, 2, 2, 2, 2].map((n, i) => <span key={i}><i style={{ height: 8 + ((i * 7 + 3) % 5) * 5 }} /><small>{'MTWTFSS'[i]}</small></span>)}
                    </span>
                  ) : h.topic === 'Competitor' ? (
                    <span className="hl-comp"><SocialAvatar name={h.title.split(' ')[0]} org size={32} /><span className="faint">{h.context}</span></span>
                  ) : null}
                  <span className="hl-title">{h.title}</span>
                </button>
                <div className="hl-act">
                  {rec >= 0 ? <Btn size="sm" onClick={() => act.option(h, rec)}>{shortLabel(h.options![rec].label)}</Btn>
                    : h.link ? <Btn size="sm" onClick={() => nav(h.link!)}>{p?.type === 'plan' ? 'Review the plan' : 'Open'}</Btn>
                    : <Btn size="sm" onClick={() => onPick(`h:${h.id}`)}>Open</Btn>}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** Keep button labels short: "Counter-post by Atlas: “Built to last…”" → "Counter-post by Atlas". */
const shortLabel = (l: string) => l.split(/[:(]/)[0].replace(/ this week$/, '').trim()

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
        <h2>Shift board <span className="faint" style={{ fontWeight: 400 }}>· last 24 h</span></h2>
        <span className="legend" style={{ margin: 0 }}>
          <span><i style={{ height: 10, width: 3, borderRadius: 2, background: 'var(--a-nova)' }} />Acted alone, in each agent’s colour</span>
          <span><i style={{ height: 8, width: 8, borderRadius: 4, background: 'var(--alert)' }} />Raised to you</span>
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
                  <line key={l.id} x1={x(l.at)} x2={x(l.at)} y1={y - 6} y2={y + 6} stroke={hover === l.id ? 'var(--ink)' : l.status === 'undone' ? 'var(--ink-off)' : `var(--a-${a.id})`} strokeWidth={3} strokeLinecap="round"
                    style={{ cursor: 'pointer' }} onMouseEnter={() => setHover(l.id)} onMouseLeave={() => setHover(null)} onClick={() => nav('/activity')}>
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
      <div className="card-head"><h2 className="row tight"><span className="live-dot" aria-hidden />Live</h2><Btn size="xs" variant="ghost" onClick={() => nav('/activity')}>All activity</Btn></div>
      <ul className="feed">
        {items.map(l => {
          const canUndo = l.undoUntil && l.undoUntil > now && l.status !== 'undone'
          return (
            <li key={l.id} className={l.status === 'undone' ? 'undone' : ''}>
              <Mark agent={l.agent} />
              <div>
                <p>{l.text}</p>
                <span className="mono faint">{ago(l.at, now)}{l.status === 'undone' ? ' · undone' : canUndo ? ` · undo ${Math.ceil((l.undoUntil! - now) / MIN)} min left` : ''}</span>
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
