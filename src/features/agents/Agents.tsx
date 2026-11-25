import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Pause, Pencil, Play, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import type { Agent, AgentId, Autonomy } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { groupOf } from '../../app/reducer'
import { ago } from '../../app/time'
import { AUTONOMY_LABEL, PRESET_LABEL } from '../../data/agents'
import { Btn, Empty, Mark, Menu, PageHead, Pill, Seg, Tabs } from '../../ui'
import { AutonomyList, AutonomySummary, PRESET_SAYS, presetDelta, presetOf } from './autonomy'
import { Notice, UndoBar } from '../../ui/Feedback'
import { Bars, StackBar } from '../../ui/charts'
import './agents.css'
import { AlertsTable } from '../insights/alerts'
import { AgentScene } from '../../ui/Illustrations'

/* ---------- Team ---------- */
export function Team() {
  const { s, d } = useStore()
  return (
    <div className="page">
      <PageHead title="Agents" lede="Your team. Each agent works within the autonomy and guardrails you set, and asks for more when it has earned it." />
      <div className="team-grid">
        {s.agents.map(a => {
          const lv = (l: Autonomy) => a.actions.filter(x => x.autonomy === l).length
          const pending = s.handoffs.filter(h => h.agent === a.id && !h.lane && groupOf(h) === 'need').length
          const promo = s.handoffs.some(h => h.agent === a.id && h.kind === 'promotion')
          return (
            <article key={a.id} className="card agent-card">
              <div className="row nowrap items-start">
                <Mark agent={a.id} size="lg" state={a.status === 'on' ? 'on' : 'paused'} />
                <div className="grow">
                  <h2><Link to={`/agents/${a.id}`} className="agent-link">{a.name}</Link></h2>
                  <div className="faint">{a.dept}</div>
                </div>
                {a.status === 'on' ? <Pill tone="ok" dot>On shift</Pill> : <Pill tone="caution" dot>Paused</Pill>}
              </div>
              <p className="muted">{a.role}</p>
              <div className="now-line"><span className="faint">Now</span> {a.status === 'on' ? a.now : `Paused${a.pausedUntil ? ` until ${a.pausedUntil}` : ''}`}</div>
              <div>
                <div className="faint caption">Autonomy · {presetOf(a) === 'custom' ? 'Custom' : presetOf(a)[0].toUpperCase() + presetOf(a).slice(1)}</div>
                <StackBar h={6} parts={[
                  { label: 'Suggest', value: lv('suggest'), color: 'var(--lift-2)' },
                  { label: 'Draft', value: lv('draft'), color: `color-mix(in srgb, var(--a-${a.id}) 40%, transparent)` },
                  { label: 'Act', value: lv('act'), color: `var(--a-${a.id})` },
                ]} />
              </div>
              <dl className="agent-stats">
                <div><dt>Handled alone · 30 days</dt><dd className="num">{a.record.handled.toLocaleString('en-GB')}</dd></div>
                <div><dt>Raised to you</dt><dd className="num">{a.record.escalated}</dd></div>
                <div><dt>Approved unchanged</dt><dd className="num">{a.record.approvedUnchanged}%</dd></div>
                <div><dt>Undone by you</dt><dd className="num">{a.record.undone}</dd></div>
              </dl>
              <div className="row">
                <Link to={`/agents/${a.id}`} className="btn sm">Open profile</Link>
                {pending > 0 && <Link to="/" className="btn sm ghost">{pending} need you</Link>}
                {promo && <Pill tone="signal">Asks for more autonomy</Pill>}
                <span className="spacer" />
                {a.status === 'on' ? <PauseMenu id={a.id} />
                  : <Btn size="sm" variant="ghost" onClick={() => d({ type: 'core/agentStatus', agent: a.id, status: 'on' })}><Play size={14} />Resume</Btn>}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Profile ---------- */
type Tab = 'autonomy' | 'guardrails' | 'escalation' | 'alerts' | 'record' | 'activity'

const HISTORY: Record<AgentId, { at: number; text: string; kind: 'up' | 'down' | 'declined' }[]> = {
  nova: [
    { at: Date.UTC(2025, 10, 12), text: 'Shipping refunds up to €15 moved to Act (trial week, then kept)', kind: 'up' },
    { at: Date.UTC(2025, 10, 5), text: 'Asked to answer reviews alone. You said not yet.', kind: 'declined' },
    { at: Date.UTC(2025, 9, 29), text: 'Product and shipping questions moved to Act', kind: 'up' },
  ],
  atlas: [
    { at: Date.UTC(2025, 10, 14), text: 'Slot moves moved to Act', kind: 'up' },
    { at: Date.UTC(2025, 10, 7), text: 'Recycling went back to Draft after a post you undid', kind: 'down' },
  ],
  iris: [{ at: Date.UTC(2025, 9, 30), text: 'Anomaly alerts moved to Act', kind: 'up' }],
  echo: [{ at: Date.UTC(2025, 10, 3), text: 'Mention filing moved to Act', kind: 'up' }],
  sage: [],
}

export function AgentProfile() {
  const { id } = useParams()
  const { s, d } = useStore()
  const nav = useNavigate()
  const a = s.agents.find(x => x.id === id)
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'autonomy')
  const [undoPreset, setUndoPreset] = useState<{ label: string; delta: string; levels: [string, Autonomy][] } | null>(null)
  // Same component for every agent: going from Echo's Alerts to Nova must not keep Echo's tab.
  useEffect(() => { setTab((params.get('tab') as Tab) || 'autonomy'); setUndoPreset(null) }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return <div className="page"><Empty title="This agent doesn’t exist" action={<Link to="/agents" className="btn">Back to the team</Link>} /></div>
  const preset = presetOf(a)

  return (
    <div className="page">
      <Btn className="mb-3" variant="ghost" size="sm" onClick={() => nav('/agents')}><ArrowLeft size={14} />Team</Btn>
      <div className="profile-top">
      <div className="profile-scene"><AgentScene agent={a.id} /></div>
      <div className="grow">
      <PageHead title={a.name} lede={<>{a.dept} · {a.role}</>}>
        {a.status === 'on' ? <Pill tone="ok" dot>On shift · {a.shift}</Pill> : <Pill tone="caution" dot>Paused{a.pausedUntil ? ` until ${a.pausedUntil}` : ''}</Pill>}
        {a.status === 'on' ? <PauseMenu id={a.id} big /> : <Btn variant="primary" onClick={() => d({ type: 'core/agentStatus', agent: a.id, status: 'on' })}><Play size={14} />Resume</Btn>}
      </PageHead>
      </div>
      </div>

      <Tabs value={tab} onChange={setTab} items={[
        { value: 'autonomy', label: 'Autonomy' }, { value: 'guardrails', label: 'Guardrails', count: a.guardrails.length }, { value: 'escalation', label: 'Escalation', count: s.playbook.escalate.filter(e => e.agents.includes(a.id) && e.on).length },
        ...(a.id === 'iris' || a.id === 'echo' ? [{ value: 'alerts' as Tab, label: 'Alerts', count: (a.id === 'iris' ? s.insights.alerts : s.listening.alerts).filter(x => x.on).length }] : []),
        { value: 'record', label: 'Track record' }, { value: 'activity', label: 'Activity' },
      ]} />

      {tab === 'autonomy' && (
        <div className="stack lg">
          <section className="card pad-lg">
            <div className="row between items-start">
              <div>
                <h2 className="h2">How much can {a.name} do alone?</h2>
                <p className="preset-says">{PRESET_SAYS[preset]}</p>
                <p className="muted mw-62ch">Pick a preset, or set each action below.</p>
              </div>
              <Seg name="preset" label="Autonomy preset" value={preset} onChange={p => { if (p === 'custom') return; setUndoPreset({ label: PRESET_LABEL[p], delta: presetDelta(a, p), levels: a.actions.map(x => [x.id, x.autonomy] as [string, Autonomy]) }); d({ type: 'core/preset', agent: a.id, preset: p }) }}
                options={[{ value: 'cautious', label: 'Cautious' }, { value: 'balanced', label: 'Balanced' }, { value: 'autonomous', label: 'Autonomous' }, { value: 'custom', label: 'Custom', disabled: preset !== 'custom' }]} />
            </div>
            {undoPreset && (
              <UndoBar className="mt-3" onUndo={() => { for (const [action, level] of undoPreset.levels) d({ type: 'core/autonomy', agent: a.id, action, level }); setUndoPreset(null) }} onDismiss={() => setUndoPreset(null)}>{a.name} is now {undoPreset.label}. {undoPreset.delta}</UndoBar>
            )}
            <Notice scope="agents" className="mt-3" />
            <AutonomySummary agent={a} />
            <AutonomyList key={a.id} agent={a} onChange={(x, level) => d({ type: 'core/autonomy', agent: a.id, action: x.id, level })} />
          </section>
          <Promotions agent={a} />
        </div>
      )}
      {tab === 'guardrails' && <Guardrails agent={a} />}
      {tab === 'escalation' && <Escalation agent={a} />}
      {tab === 'alerts' && <AgentAlerts agent={a.id} />}
      {tab === 'record' && <Record agent={a} />}
      {tab === 'activity' && <AgentActivity agent={a.id} />}
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
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [removed, setRemoved] = useState<{ label: string; value: string } | null>(null)
  return (
    <section className="card">
      <div className="card-head"><h2>Guardrails</h2><span className="faint">Limits {agent.name} never crosses, whatever its autonomy.</span></div>
      <ul className="rows">
        {agent.guardrails.map(g => (
          <li key={g.id} className="guard">
            <span className="muted">{g.label}</span>
            {editing === g.id ? (
              <form className="row nowrap" onSubmit={e => { e.preventDefault(); if (!v.trim()) return; d({ type: 'core/guardrail', agent: agent.id, id: g.id, value: v.trim() }); setEditing(null) }}>
                <input className="input w-260" autoFocus value={v} onChange={e => setV(e.target.value)} aria-label={g.label} />
                <Btn type="submit" size="sm" variant="primary" disabled={!v.trim()}>Save</Btn><Btn size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
              </form>
            ) : (
              <>
                <b>{g.value}</b>
                <Btn size="xs" variant="ghost" onClick={() => { setEditing(g.id); setV(g.value) }} aria-label={`Edit ${g.label}`}><Pencil size={12} />Edit</Btn>
                <Btn size="xs" variant="ghost" onClick={() => { setRemoved({ label: g.label, value: g.value }); d({ type: 'core/guardrailDelete', agent: agent.id, id: g.id }) }} aria-label={`Remove ${g.label}`}><Trash2 size={12} /></Btn>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="card-body stack">
        {removed && (
          <UndoBar onUndo={() => { d({ type: 'core/guardrailAdd', agent: agent.id, ...removed }); setRemoved(null) }} onDismiss={() => setRemoved(null)}>Removed “{removed.label}: {removed.value}”</UndoBar>
        )}
        {adding ? (
          <form className="row" onSubmit={e => { e.preventDefault(); if (!label.trim() || !value.trim()) return; d({ type: 'core/guardrailAdd', agent: agent.id, label: label.trim(), value: value.trim() }); setAdding(false); setLabel(''); setValue('') }}>
            <input className="input w-280" autoFocus placeholder="What it limits (e.g. Replies per hour)" value={label} onChange={e => setLabel(e.target.value)} aria-label="Guardrail" />
            <input className="input w-180" placeholder="The limit (e.g. 30 max)" value={value} onChange={e => setValue(e.target.value)} aria-label="Limit" />
            <Btn type="submit" size="sm" variant="primary" disabled={!label.trim() || !value.trim()}>Add</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn>
          </form>
        ) : <Btn size="sm" className="self-start" onClick={() => setAdding(true)}><Plus size={14} />Add a guardrail</Btn>}
      </div>
    </section>
  )
}

/** Read-only here: escalation is edited in the Playbook, one place for every agent. */
function Escalation({ agent }: { agent: Agent }) {
  const { s } = useStore()
  const rules = s.playbook.escalate.filter(e => e.agents.includes(agent.id))
  return (
    <section className="card">
      <div className="card-head">
        <div><h2>Escalation</h2><span className="faint">What {agent.name} always hands to a person, whatever its autonomy.</span></div>
        <Link to="/playbook?tab=escalation" className="btn sm ghost">Edit in the Playbook</Link>
      </div>
      <ul className="rows">
        {rules.map(e => (
          <li key={e.id} className="guard">
            <span className="grow">{e.label}</span>
            <span className="faint">{!e.on ? 'Off' : e.to === 'claire' ? 'Goes to Claire' : 'Goes to you'}</span>
          </li>
        ))}
        {!rules.length && <li className="guard faint">No escalation rule yet. {agent.name} decides within its autonomy and guardrails.</li>}
      </ul>
    </section>
  )
}

/** Iris's and Echo's alert rules: when they raise something on the Desk, and to whom. */
function AgentAlerts({ agent }: { agent: AgentId }) {
  const { s, d } = useStore()
  if (agent === 'iris') return (
    <AlertsTable agent="Iris" alerts={s.insights.alerts} intro="Iris raises an anomaly on your Desk when a rule fires, and copies Claire when you ask."
      subjects={[{ value: 'views', label: 'Views per video' }, { value: 'reach', label: 'Daily reach' }, { value: 'er', label: 'Engagement rate of a post' }, { value: 'followers', label: 'New followers' }, { value: 'clicks', label: 'Link clicks' }, { value: 'reply', label: 'Reply time' }, { value: 'sentiment', label: 'Negative sentiment' }]}
      conditions={['drops by more than', 'rises above', 'falls below']} units={['%', '% over 3 posts', '× the account average', '× usual daily growth', ' min median']}
      onSave={alert => d({ type: 'insights/alertSave', alert })} onToggle={id => d({ type: 'insights/alertToggle', id })} onDelete={id => d({ type: 'insights/alertDelete', id })} />
  )
  return (
    <AlertsTable agent="Echo" alerts={s.listening.alerts} intro="Echo raises these on your Desk as soon as they happen, and copies Claire when you ask."
      subjects={[{ value: 'brand', label: 'Fernway mentions' }, { value: 'competitors', label: 'Competitor mentions' }, ...s.listening.searches.map(x => ({ value: x.id, label: `“${x.name}”` }))]}
      conditions={['gets more than', 'grows faster than']} units={[' negative mentions in 1 h', ' mentions in 1 h', ' mention from press', '% in a day']}
      onSave={alert => d({ type: 'listening/alertSave', alert })} onToggle={id => d({ type: 'listening/alertToggle', id })} onDelete={id => d({ type: 'listening/alertDelete', id })} />
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
        <div className="card pad stat"><dd><b className="num">{agent.record.approvedUnchanged}%</b></dd><dt className="label">Approved unchanged</dt></div>
        <div className="card pad stat"><dd><b className="num">{agent.record.undone}</b></dd><dt className="label">Undone by you</dt></div>
      </dl>
      <section className="card pad">
        <div className="section-title">Actions handled alone per day <span className="faint">· last 30 days</span></div>
        <Bars data={agent.record.series} labels={days} label={`${agent.name} actions per day`} h={140} color={`var(--a-${agent.id})`} />
      </section>
      <section className="card">
        <div className="card-head"><h2>By action</h2></div>
        <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Action</th><th>Level</th><th className="r">Reviewed by you</th><th className="r">Approved unchanged</th></tr></thead>
          <tbody>
            {agent.actions.map(x => (
              <tr key={x.id}><td>{x.label}</td><td>{AUTONOMY_LABEL[x.autonomy]}{x.locked ? ' · locked' : ''}</td><td className="r">{x.reviewed ?? '–'}</td><td className="r">{x.approvedUnchanged !== undefined ? `${x.approvedUnchanged}%` : '–'}</td></tr>
            ))}
          </tbody>
        </table>
        </div>
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
      <div className="card-head"><h2>Last 20 actions</h2><Link to={`/activity?agent=${agent}`} className="btn sm ghost">Full journal for this agent</Link></div>
      <ul className="rows hist">
        {!items.length && <li className="faint">No activity yet.</li>}
        {items.map(l => <li key={l.id}><span style={{ textDecoration: l.status === 'undone' ? 'line-through' : undefined }}>{l.text}{l.reason && <span className="faint"> · {l.reason}</span>}</span><span className="mono faint">{ago(l.at, now)}</span></li>)}
      </ul>
    </section>
  )
}

/** Same pause choices on the team card and the profile. */
function PauseMenu({ id, big }: { id: AgentId; big?: boolean }) {
  const { d } = useStore()
  const pause = (until?: string) => d({ type: 'core/agentStatus', agent: id, status: 'paused', until })
  return (
    <Menu align="end" trigger={<Btn size={big ? undefined : 'sm'} variant={big ? undefined : 'ghost'}><Pause size={14} />Pause<ChevronDown size={12} /></Btn>} items={[
      { label: 'Pause for 1 hour', onSelect: () => pause('in 1 hour') },
      { label: 'Pause until tomorrow', onSelect: () => pause('tomorrow 08:00') },
      { label: 'Pause until Monday', onSelect: () => pause('Monday') },
      { label: 'Pause until I resume', onSelect: () => pause() },
    ]} />
  )
}
