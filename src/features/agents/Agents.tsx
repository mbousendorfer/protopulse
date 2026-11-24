import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Pause, Pencil, Play, ShieldCheck } from 'lucide-react'
import type { Agent, AgentAction, AgentId, Autonomy } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { ago, DAY } from '../../app/time'
import { AUTONOMY, AUTONOMY_COLUMN, AUTONOMY_LABEL } from '../../data/agents'
import { AutonomySeg, Btn, Empty, Mark, Menu, PageHead, Pill, Seg, Tabs, Tip } from '../../ui'
import { Bars, StackBar } from '../../ui/charts'
import './agents.css'
import { AgentScene } from '../../ui/Illustrations'

const RISK_LABEL = { safe: 'Low risk', risky: 'Medium risk', destructive: 'High risk' } as const

type Preset = 'cautious' | 'balanced' | 'autonomous' | 'custom'
function presetOf(a: Agent): Preset {
  const free = a.actions.filter(x => !x.locked)
  const is = (f: (x: AgentAction) => Autonomy) => free.every(x => x.autonomy === f(x))
  if (is(x => (x.risk === 'safe' ? 'draft' : 'suggest'))) return 'cautious'
  if (is(x => (x.risk === 'safe' ? 'act' : 'draft'))) return 'balanced'
  if (is(() => 'act')) return 'autonomous'
  return 'custom'
}

/* ---------- Team ---------- */
export function Team() {
  const { s, d } = useStore()
  return (
    <div className="page">
      <PageHead title="Agents" lede="Your team. Each agent works within the autonomy and guardrails you set, and asks for more when it has earned it." />
      <div className="team-grid">
        {s.agents.map(a => {
          const lv = (l: Autonomy) => a.actions.filter(x => x.autonomy === l).length
          const pending = s.handoffs.filter(h => h.agent === a.id && !h.lane).length
          const promo = s.handoffs.some(h => h.agent === a.id && h.kind === 'promotion')
          return (
            <article key={a.id} className="card agent-card">
              <div className="row nowrap" style={{ alignItems: 'flex-start' }}>
                <Mark agent={a.id} size="lg" state={a.status === 'on' ? 'on' : 'paused'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2><Link to={`/agents/${a.id}`} className="agent-link">{a.name}</Link></h2>
                  <div className="faint">{a.dept}</div>
                </div>
                {a.status === 'on' ? <Pill tone="ok" dot>On shift</Pill> : <Pill tone="caution" dot>Paused</Pill>}
              </div>
              <p className="muted">{a.role}</p>
              <div className="now-line"><span className="faint">Now</span> {a.status === 'on' ? a.now : `Paused${a.pausedUntil ? ` until ${a.pausedUntil}` : ''}`}</div>
              <div>
                <div className="faint" style={{ fontSize: 12, marginBottom: 6 }}>Autonomy · {presetOf(a) === 'custom' ? 'Custom' : presetOf(a)[0].toUpperCase() + presetOf(a).slice(1)}</div>
                <StackBar h={6} parts={[
                  { label: 'Acts alone', value: lv('act'), color: `var(--a-${a.id})` },
                  { label: 'Drafts', value: lv('draft'), color: `color-mix(in srgb, var(--a-${a.id}) 40%, transparent)` },
                  { label: 'Suggests', value: lv('suggest'), color: 'var(--lift-2)' },
                ]} />
              </div>
              <dl className="agent-stats">
                <div><dt>Handled alone</dt><dd className="num">{a.record.handled.toLocaleString('en-GB')}</dd></div>
                <div><dt>Raised to you</dt><dd className="num">{a.record.escalated}</dd></div>
                <div><dt>Approved unchanged</dt><dd className="num">{a.record.approvedUnchanged}%</dd></div>
                <div><dt>Undone</dt><dd className="num">{a.record.undone}</dd></div>
              </dl>
              <div className="row">
                <Link to={`/agents/${a.id}`} className="btn sm">Open profile</Link>
                {pending > 0 && <Link to="/" className="btn sm ghost">{pending} on your Desk</Link>}
                {promo && <Pill tone="signal">Asks for more autonomy</Pill>}
                <span className="spacer" />
                <Btn size="sm" variant="ghost" onClick={() => d({ type: 'core/agentStatus', agent: a.id, status: a.status === 'on' ? 'paused' : 'on' })}>
                  {a.status === 'on' ? <><Pause size={14} />Pause</> : <><Play size={14} />Resume</>}
                </Btn>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Profile ---------- */
type Tab = 'autonomy' | 'guardrails' | 'record' | 'activity'

const HISTORY: Record<AgentId, { at: number; text: string; kind: 'up' | 'down' | 'declined' }[]> = {
  nova: [
    { at: Date.UTC(2026, 10, 12), text: 'Shipping refunds up to €15 moved to Act (trial week, then kept)', kind: 'up' },
    { at: Date.UTC(2026, 10, 5), text: 'Asked to answer reviews alone. You said not yet.', kind: 'declined' },
    { at: Date.UTC(2026, 9, 29), text: 'Product and shipping questions moved to Act', kind: 'up' },
  ],
  atlas: [
    { at: Date.UTC(2026, 10, 14), text: 'Slot moves moved to Act', kind: 'up' },
    { at: Date.UTC(2026, 10, 7), text: 'Recycling went back to Draft after a post you undid', kind: 'down' },
  ],
  iris: [{ at: Date.UTC(2026, 9, 30), text: 'Anomaly alerts moved to Act', kind: 'up' }],
  echo: [{ at: Date.UTC(2026, 10, 3), text: 'Mention filing moved to Act', kind: 'up' }],
  sage: [],
}

export function AgentProfile() {
  const { id } = useParams()
  const { s, d } = useStore()
  const nav = useNavigate()
  const a = s.agents.find(x => x.id === id)
  const [tab, setTab] = useState<Tab>('autonomy')
  if (!a) return <div className="page"><Empty title="This agent doesn’t exist" action={<Link to="/agents" className="btn">Back to the team</Link>} /></div>
  const preset = presetOf(a)

  return (
    <div className="page">
      <Btn variant="ghost" size="sm" onClick={() => nav('/agents')} style={{ marginBottom: 12 }}><ArrowLeft size={14} />Team</Btn>
      <div className="profile-top">
      <div className="profile-scene"><AgentScene agent={a.id} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
      <PageHead title={a.name} lede={<>{a.dept} · {a.role}</>}>
        {a.status === 'on' ? <Pill tone="ok" dot>On shift · {a.shift}</Pill> : <Pill tone="caution" dot>Paused{a.pausedUntil ? ` until ${a.pausedUntil}` : ''}</Pill>}
        {a.status === 'on' ? (
          <Menu trigger={<Btn><Pause size={14} />Pause</Btn>} items={[
            { label: 'Pause for 1 hour', onSelect: () => d({ type: 'core/agentStatus', agent: a.id, status: 'paused', until: 'in 1 hour' }) },
            { label: 'Pause until tomorrow', onSelect: () => d({ type: 'core/agentStatus', agent: a.id, status: 'paused', until: 'tomorrow 08:00' }) },
            { label: 'Pause until Monday', onSelect: () => d({ type: 'core/agentStatus', agent: a.id, status: 'paused', until: 'Monday' }) },
            { label: 'Pause until I resume', onSelect: () => d({ type: 'core/agentStatus', agent: a.id, status: 'paused' }) },
          ]} />
        ) : <Btn variant="primary" onClick={() => d({ type: 'core/agentStatus', agent: a.id, status: 'on' })}><Play size={14} />Resume</Btn>}
      </PageHead>
      </div>
      </div>

      <Tabs value={tab} onChange={setTab} items={[
        { value: 'autonomy', label: 'Autonomy' }, { value: 'guardrails', label: 'Guardrails', count: a.guardrails.length },
        { value: 'record', label: 'Track record' }, { value: 'activity', label: 'Activity' },
      ]} />

      {tab === 'autonomy' && (
        <div className="stack lg">
          <section className="card pad-lg">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="h2">How much can {a.name} do alone?</h2>
                <p className="muted" style={{ maxWidth: '62ch' }}>A preset moves every unlocked action by its risk. You can still move each action on its own. Locked actions always ask.</p>
              </div>
              <Seg name="preset" label="Autonomy preset" value={preset} onChange={p => p !== 'custom' && d({ type: 'core/preset', agent: a.id, preset: p })}
                options={[{ value: 'cautious', label: 'Cautious' }, { value: 'balanced', label: 'Balanced' }, { value: 'autonomous', label: 'Autonomous' }, { value: 'custom', label: 'Custom', disabled: preset !== 'custom' }]} />
            </div>
            <AutonomyBoard agent={a} />
          </section>
          <Promotions agent={a} />
        </div>
      )}
      {tab === 'guardrails' && <Guardrails agent={a} />}
      {tab === 'record' && <Record agent={a} />}
      {tab === 'activity' && <AgentActivity agent={a.id} />}
    </div>
  )
}

/** Three columns; action cards glide between them when their level changes (FLIP). */
function AutonomyBoard({ agent }: { agent: Agent }) {
  const { d } = useStore()
  const now = useNow()
  const ref = useRef<HTMLDivElement>(null)
  const rects = useRef(new Map<string, DOMRect>())
  const key = agent.actions.map(x => x.autonomy).join()

  useLayoutEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>('[data-flip]') ?? []
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    els.forEach(el => {
      const id = el.dataset.flip!
      const prev = rects.current.get(id)
      const next = el.getBoundingClientRect()
      if (prev && !reduce && (prev.left !== next.left || prev.top !== next.top)) {
        el.animate([{ transform: `translate(${prev.left - next.left}px, ${prev.top - next.top}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.77, 0, 0.175, 1)' })
      }
      rects.current.set(id, next)
    })
  }, [key])

  return (
    <div className="aboard" ref={ref}>
      {AUTONOMY.map(level => (
        <section key={level} className="acol" aria-label={AUTONOMY_COLUMN[level]}>
          <h3>{AUTONOMY_COLUMN[level]} <span className="faint num">{agent.actions.filter(x => x.autonomy === level).length}</span></h3>
          <p className="faint acol-sub">{level === 'act' ? 'Runs on its own. You can undo.' : level === 'draft' ? 'Prepares it, waits for your approval.' : 'Points it out. You do it.'}</p>
          {agent.actions.filter(x => x.autonomy === level).map(x => (
            <article key={x.id} data-flip={x.id} className="aitem">
              <div className="row nowrap" style={{ alignItems: 'flex-start' }}>
                <h4>{x.label}</h4>
                {x.locked && <Tip label={x.lockReason}><span className="lock" tabIndex={0} aria-label={`Locked: ${x.lockReason}`}><Lock size={13} /></span></Tip>}
              </div>
              <div className="row tight">
                <span className="chip">{RISK_LABEL[x.risk]}</span>
                {x.reviewed ? <span className="chip">{x.approvedUnchanged}% approved unchanged · {x.reviewed}</span> : null}
                {x.trialUntil && x.trialUntil > now && <Pill tone="signal">Trial · {Math.ceil((x.trialUntil - now) / DAY)} days left</Pill>}
              </div>
              <AutonomySeg size="sm" name={`${agent.id}-${x.id}`} value={x.autonomy} locked={x.locked} onChange={v => d({ type: 'core/autonomy', agent: agent.id, action: x.id, level: v })} />
              <p className="says">{x.says[x.autonomy]}</p>
            </article>
          ))}
          {!agent.actions.some(x => x.autonomy === level) && <div className="aempty">No action here</div>}
        </section>
      ))}
    </div>
  )
}

function Promotions({ agent }: { agent: Agent }) {
  const { s } = useStore()
  const now = useNow()
  const pending = s.handoffs.filter(h => h.agent === agent.id && h.kind === 'promotion')
  const fromLog = s.log.filter(l => l.agent === agent.id && /moved .* to |trial for a week|Autonomy request|wants to/i.test(l.text)).slice(0, 5)
  const hist = HISTORY[agent.id]
  return (
    <section className="card">
      <div className="card-head"><h2>Autonomy history</h2>{pending.length > 0 && <Link to="/" className="btn sm primary">{pending.length} request{pending.length > 1 ? 's' : ''} on your Desk</Link>}</div>
      <ul className="rows hist">
        {fromLog.map(l => <li key={l.id}><ShieldCheck size={14} /><span>{l.text}</span><span className="mono faint">{ago(l.at, now)}</span></li>)}
        {hist.map(h => (
          <li key={h.text}><ShieldCheck size={14} className={h.kind} /><span>{h.text}</span><span className="mono faint">{new Date(h.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></li>
        ))}
        {!fromLog.length && !hist.length && <li className="faint">No change yet. {agent.name} will ask when its approval rate earns it.</li>}
      </ul>
    </section>
  )
}

function Guardrails({ agent }: { agent: Agent }) {
  const { d } = useStore()
  const [editing, setEditing] = useState<string | null>(null)
  const [v, setV] = useState('')
  return (
    <section className="card">
      <div className="card-head"><h2>Guardrails</h2><span className="faint">Limits {agent.name} never crosses, whatever its autonomy.</span></div>
      <ul className="rows">
        {agent.guardrails.map(g => (
          <li key={g.id} className="guard">
            <span className="muted">{g.label}</span>
            {editing === g.id ? (
              <form className="row nowrap" onSubmit={e => { e.preventDefault(); d({ type: 'core/guardrail', agent: agent.id, id: g.id, value: v }); setEditing(null) }}>
                <input className="input" autoFocus value={v} onChange={e => setV(e.target.value)} aria-label={g.label} style={{ width: 260 }} />
                <Btn type="submit" size="sm" variant="primary">Save</Btn><Btn size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
              </form>
            ) : (
              <>
                <b>{g.value}</b>
                <Btn size="xs" variant="ghost" onClick={() => { setEditing(g.id); setV(g.value) }} aria-label={`Edit ${g.label}`}><Pencil size={12} />Edit</Btn>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Record({ agent }: { agent: Agent }) {
  const { s } = useStore()
  const days = agent.record.series.map((_, i) => `${i % 5 === 0 ? 30 - i : ''}`)
  const undos = s.log.filter(l => l.agent === agent.id && l.status === 'undone').slice(0, 5)
  return (
    <div className="stack lg">
      <dl className="grid-4 record-kpis">
        <div className="card pad stat"><dd><b className="num">{agent.record.handled.toLocaleString('en-GB')}</b></dd><dt className="label">Handled alone · 30 days</dt></div>
        <div className="card pad stat"><dd><b className="num">{agent.record.escalated}</b></dd><dt className="label">Raised to you</dt></div>
        <div className="card pad stat"><dd><b className="num">{agent.record.approvedUnchanged}%</b></dd><dt className="label">Approved without changes</dt></div>
        <div className="card pad stat"><dd><b className="num">{agent.record.undone}</b></dd><dt className="label">Undone by you</dt></div>
      </dl>
      <section className="card pad">
        <div className="section-title">Actions handled alone per day <span className="faint">· last 30 days</span></div>
        <Bars data={agent.record.series} labels={days} label={`${agent.name} actions per day`} h={140} color={`var(--a-${agent.id})`} />
      </section>
      <section className="card">
        <div className="card-head"><h2>By action</h2></div>
        <table className="table">
          <thead><tr><th>Action</th><th>Level</th><th className="r">Reviewed by you</th><th className="r">Approved unchanged</th></tr></thead>
          <tbody>
            {agent.actions.map(x => (
              <tr key={x.id}><td>{x.label}</td><td>{AUTONOMY_LABEL[x.autonomy]}{x.locked ? ' · locked' : ''}</td><td className="r">{x.reviewed ?? '–'}</td><td className="r">{x.approvedUnchanged !== undefined ? `${x.approvedUnchanged}%` : '–'}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card">
        <div className="card-head"><h2>Last undos</h2></div>
        {undos.length ? <ul className="rows hist">{undos.map(l => <li key={l.id}><span>{l.text}</span></li>)}</ul> : <p className="card-body faint">Nothing undone recently.</p>}
      </section>
    </div>
  )
}

function AgentActivity({ agent }: { agent: AgentId }) {
  const { s } = useStore()
  const now = useNow()
  const items = s.log.filter(l => l.agent === agent).slice(0, 20)
  return (
    <section className="card">
      <div className="card-head"><h2>Last 20 actions</h2><Link to="/activity" className="btn sm ghost">Full journal</Link></div>
      <ul className="rows hist">
        {items.map(l => <li key={l.id}><span style={{ textDecoration: l.status === 'undone' ? 'line-through' : undefined }}>{l.text}{l.reason && <span className="faint"> · {l.reason}</span>}</span><span className="mono faint">{ago(l.at, now)}</span></li>)}
      </ul>
    </section>
  )
}
