import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, MoreHorizontal, Pause, Pencil, Play, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import type { Agent, AgentId, Autonomy } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { ago, DAY } from '../../app/time'
import { AUTONOMY_LABEL, PRESET_LABEL, weeklyLoad } from '../../data/agents'
import { Btn, Empty, Mark, Menu, PageHead, Pill, Seg, Tabs, type MenuItem } from '../../ui'
import { AutonomyList, AutonomySummary, PRESET_SAYS, presetDelta, presetOf } from './autonomy'
import { AgentRules } from './SharedRules'
import { proposalsFor } from './rules'
import { CountBadge, Notice, UndoBar } from '../../ui/Feedback'
import { Bars } from '../../ui/charts'
import { AgentDecisions } from './AgentDecisions'
import { autonomyRequests, trustOf } from './needs'
import './agents.css'
import { registry } from '../../app/agents-registry'
import { AgentScene } from '../../ui/Illustrations'

/* ---------- Agents: Team · Shared rules · Escalation ---------- */
type Section = 'team' | 'rules' | 'escalation'
const SECTION_PATH: Record<Section, string> = { team: '/agents', rules: '/agents/rules', escalation: '/agents/escalation' }

export function AgentsLayout() {
  const { s } = useStore()
  const nav = useNavigate()
  const seg = useLocation().pathname.split('/')[2]
  const section: Section = seg === 'rules' || seg === 'escalation' ? seg : 'team'
  // A count on a tab means "needs you": rule proposals only.
  const proposals = s.handoffs.filter(h => h.proposal && !h.lane).length
  return (
    <div className="page">
      <PageHead title="Agents" lede="Your agents, the rules they share and what they always escalate." />
      <Tabs value={section} onChange={v => nav(SECTION_PATH[v])} items={[
        { value: 'team', label: 'Team' },
        { value: 'rules', label: <>Shared rules{proposals > 0 && <CountBadge n={proposals} needs label={`${proposals} rule proposal${proposals > 1 ? 's' : ''} need you`} />}</> },
        { value: 'escalation', label: 'Escalation' },
      ]} />
      <Outlet />
    </div>
  )
}

export function Team() {
  const { s } = useStore()
  return (
    <div className="stack lg">
      <AgentDecisions />
      <section className="card team-card" aria-labelledby="team-h">
        <div className="card-head"><h2 id="team-h">Your team</h2><span className="faint">{s.agents.filter(a => a.status === 'on').length} of {s.agents.length} on shift</span></div>
        {/* One line per agent, columns aligned: who, what now, how free, how trusted, what waits. */}
        <div className="team-cols" aria-hidden><span>Agent</span><span>Now</span><span>Autonomy</span><span>Track record · 30 days</span></div>
        <ul className="team-list">
          {s.agents.map(a => <TeamRow key={a.id} a={a} />)}
        </ul>
      </section>
    </div>
  )
}

function TeamRow({ a }: { a: Agent }) {
  const nav = useNavigate()
  const preset = presetOf(a)
  const load = weeklyLoad(a.actions, x => x.autonomy)
  const trust = trustOf(a)
  const pause = usePauseItems(a)
  return (
    <li className="team-row">
      <div className="team-who">
        <Mark agent={a.id} size="md" state={a.status === 'on' ? 'on' : 'paused'} />
        <div><Link to={`/agents/${a.id}`} className="agent-link">{a.name}</Link><span className="team-sub">{a.dept}</span></div>
      </div>
      <div className="team-cell">
        <span className="team-k">Now</span>
        {a.status === 'on' ? <span>{a.now}</span> : <span className="team-paused"><Pause size={14} aria-hidden />Paused{a.pausedUntil ? ` until ${a.pausedUntil}` : ''}</span>}
      </div>
      <div className="team-cell" title={PRESET_SAYS[preset]}>
        <span className="team-k">Autonomy</span>
        <span>{preset === 'custom' ? 'Custom' : PRESET_LABEL[preset]}</span>
        <span className="team-sub">{load.act.toLocaleString('en-GB')} of {(load.act + load.draft + load.suggest).toLocaleString('en-GB')} {a.unit} a week on its own</span>
      </div>
      <div className="team-cell">
        <span className="team-k">Track record · 30 days</span>
        <span>{trust.head}</span>
        <span className="team-sub">{trust.sub}</span>
      </div>
      <Menu align="end" trigger={<Btn size="sm" variant="ghost" icon aria-label={`${a.name}: more`}><MoreHorizontal size={16} /></Btn>} items={[
        { label: 'Open profile', onSelect: () => nav(`/agents/${a.id}`) },
        { label: 'Change autonomy', onSelect: () => nav(`/agents/${a.id}?tab=autonomy`) },
        { label: 'See track record', onSelect: () => nav(`/agents/${a.id}?tab=record`) },
        'sep',
        ...pause,
      ]} />
    </li>
  )
}

/* ---------- Profile ---------- */
/** Core tabs, plus the ones an agent adds from its registry module (`profileTabs`). */
type Tab = string

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
  juno: [{ at: Date.UTC(2025, 10, 10), text: 'Caption fixes moved to Act', kind: 'up' }],
}

export function AgentProfile() {
  const { id } = useParams()
  const { s, d } = useStore()
  const nav = useNavigate()
  const a = s.agents.find(x => x.id === id)
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'overview')
  const [undoPreset, setUndoPreset] = useState<{ label: string; delta: string; levels: [string, Autonomy][] } | null>(null)
  // Same component for every agent: going from Echo's Alerts to Nova must not keep Echo's tab.
  // A link to another tab of the same agent (a Desk card to ?tab=rules) moves the tab too.
  useEffect(() => { setTab((params.get('tab') as Tab) || 'overview'); setUndoPreset(null) }, [id, params.get('tab')]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return <div className="page"><Empty title="This agent doesn’t exist" action={<Link to="/agents" className="btn">Back to the team</Link>} /></div>
  const preset = presetOf(a)
  const proposals = proposalsFor(s.handoffs, a.id).length
  // Decided on Overview: autonomy requests and rule proposals (department items badge their own rail entry).
  const decisions = autonomyRequests(s.handoffs, a.id).length + proposals
  const extra = registry().find(m => m.id === a.id)?.profileTabs ?? []

  return (
    <div className="page">
      <Btn className="mb-3" variant="ghost" size="sm" onClick={() => nav('/agents')}><ArrowLeft size={14} />Team</Btn>
      <div className="profile-top">
      <div className="profile-scene"><AgentScene agent={a.id} /></div>
      <div className="grow">
      <PageHead title={a.name} lede={<>{a.dept} · {a.role}</>}>
        {a.status === 'on' ? <Pill tone="ok" dot>On shift · {a.shift}</Pill> : <Pill tone="caution" dot>Paused{a.pausedUntil ? ` until ${a.pausedUntil}` : ''}</Pill>}
        {a.status === 'on' ? <PauseMenu a={a} /> : <Btn variant="primary" onClick={() => d({ type: 'core/agentStatus', agent: a.id, status: 'on' })}><Play size={14} />Resume</Btn>}
      </PageHead>
      </div>
      </div>

      <Tabs value={tab} onChange={setTab} items={[
        { value: 'overview', label: <>Overview{decisions > 0 && <CountBadge n={decisions} needs label={`${decisions} need you`} />}</> },
        { value: 'autonomy', label: 'Autonomy' }, { value: 'guardrails', label: 'Guardrails', count: a.guardrails.length },
        { value: 'rules', label: <>Rules{proposals > 0 && <CountBadge n={proposals} needs label={`${proposals} rule proposal${proposals > 1 ? 's' : ''} need you`} />}</> },
        { value: 'escalation', label: 'Escalation' },
        ...extra.map(t => ({ value: t.id, label: t.label, count: t.count?.(s) })),
        { value: 'record', label: 'Track record' }, { value: 'activity', label: 'Activity' },
      ]} />

      {tab === 'overview' && <Overview agent={a} onTab={setTab} />}
      {tab === 'autonomy' && (
        <div className="stack lg">
          <section className="card pad-lg">
            <div className="row between items-start">
              <div>
                <h2 className="h2">How much can {a.name} do alone?</h2>
                <p className="preset-says">{PRESET_SAYS[preset]}</p>
                <AutonomySummary agent={a} />
              </div>
              <Seg name="preset" label="Autonomy preset" value={preset} onChange={p => { if (p === 'custom') return; setUndoPreset({ label: PRESET_LABEL[p], delta: presetDelta(a, p), levels: a.actions.map(x => [x.id, x.autonomy] as [string, Autonomy]) }); d({ type: 'core/preset', agent: a.id, preset: p }) }}
                options={[{ value: 'cautious', label: 'Cautious' }, { value: 'balanced', label: 'Balanced' }, { value: 'autonomous', label: 'Autonomous' }, { value: 'custom', label: 'Custom', disabled: preset !== 'custom' }]} />
            </div>
            {undoPreset && (
              <UndoBar className="mt-3" onUndo={() => { for (const [action, level] of undoPreset.levels) d({ type: 'core/autonomy', agent: a.id, action, level }); setUndoPreset(null) }} onDismiss={() => setUndoPreset(null)}>{a.name} is now {undoPreset.label}. {undoPreset.delta}</UndoBar>
            )}
            <Notice scope="agents" className="mt-3" />
            <AutonomyList key={a.id} agent={a} onChange={(x, level) => d({ type: 'core/autonomy', agent: a.id, action: x.id, level })} />
          </section>
          <Promotions agent={a} onDecide={() => setTab('overview')} />
        </div>
      )}
      {tab === 'guardrails' && <Guardrails agent={a} />}
      {tab === 'rules' && <AgentRules agent={a} />}
      {tab === 'escalation' && <Escalation agent={a} />}
      {extra.map(t => tab === t.id && <Fragment key={t.id}>{t.render()}</Fragment>)}
      {tab === 'record' && <Record agent={a} />}
      {tab === 'activity' && <AgentActivity agent={a.id} />}
    </div>
  )
}

function Promotions({ agent, onDecide }: { agent: Agent; onDecide: () => void }) {
  const { s } = useStore()
  const now = useNow()
  const pending = s.handoffs.filter(h => h.agent === agent.id && h.kind === 'promotion')
  const fromLog = s.log.filter(l => l.agent === agent.id && /moved .* to |trial for a week|Autonomy request|wants to/i.test(l.text)).slice(0, 5)
  const hist = HISTORY[agent.id]
  return (
    <section className="card">
      <div className="card-head"><h2>Autonomy history</h2>{pending.length > 0 && <Btn size="sm" onClick={onDecide}>{pending.length} request{pending.length > 1 ? 's' : ''} to decide</Btn>}</div>
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

/** Read-only here: escalation is edited in Agents › Escalation, one place for every agent. */
function Escalation({ agent }: { agent: Agent }) {
  const { s } = useStore()
  const rules = s.playbook.escalate.filter(e => e.agents.includes(agent.id))
  return (
    <section className="card">
      <div className="card-head">
        <div><h2>Escalation</h2><span className="faint">What {agent.name} always hands to a person, whatever its autonomy.</span></div>
        <Link to={`/agents/escalation?agent=${agent.id}`} className="btn sm ghost">Edit in Escalation</Link>
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

function Record({ agent }: { agent: Agent }) {
  const { s } = useStore()
  const now = useNow(60_000)
  // Dated ticks every 5 days, ending today: a bare “25” didn't say whether it was a date or days ago.
  const n = agent.record.series.length
  const days = agent.record.series.map((_, i) => ((n - 1 - i) % 5 === 0 ? (i === n - 1 ? 'Today' : new Date(now - (n - 1 - i) * DAY).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) : ''))
  const undos = s.log.filter(l => l.agent === agent.id && l.status === 'undone').slice(0, 5)
  return (
    <div className="stack lg">
      <dl className="grid-4 record-kpis">
        <div className="card pad stat"><dd><b className="num">{agent.record.handled.toLocaleString('en-GB')}</b></dd><dt className="label">Handled alone · 30 days</dt></div>
        <div className="card pad stat"><dd><b className="num">{agent.record.escalated}</b></dd><dt className="label">Raised to you</dt></div>
        <div className="card pad stat"><dd><b className="num">{agent.record.handled ? `${agent.record.approvedUnchanged}%` : "–"}</b></dd><dt className="label">Approved unchanged</dt></div>
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

function AgentActivity({ agent, limit = 20, onMore, lead }: { agent: AgentId; limit?: number; onMore?: () => void; lead?: ReactNode }) {
  const { s } = useStore()
  const now = useNow()
  const items = s.log.filter(l => l.agent === agent).slice(0, limit)
  return (
    <section className="card">
      <div className="card-head">
        <div><h2>Last {limit} actions</h2>{lead}</div>
        {onMore ? <Btn size="sm" variant="ghost" onClick={onMore}>See the last 20</Btn> : <Link to={`/activity?agent=${agent}`} className="btn sm ghost">Full journal for this agent</Link>}
      </div>
      <ul className="rows hist">
        {!items.length && <li className="faint">No activity yet.</li>}
        {items.map(l => <li key={l.id}><span className={l.status === 'undone' ? 'struck' : undefined}>{l.text}{l.reason && <span className="faint"> · {l.reason}</span>}</span><span className="mono faint">{ago(l.at, now)}</span></li>)}
      </ul>
    </section>
  )
}

/** First tab of a profile: what waits for Sam from this agent, then what it does, how it's trusted, how free it is. */
function Overview({ agent, onTab }: { agent: Agent; onTab: (t: Tab) => void }) {
  const { s } = useStore()
  const preset = presetOf(agent)
  const trust = trustOf(agent)
  const undos = s.log.filter(l => l.agent === agent.id && l.status === 'undone').slice(0, 2)
  return (
    <div className="stack lg">
      <AgentDecisions agent={agent} />
      <AgentActivity agent={agent.id} limit={5} onMore={() => onTab('activity')}
        lead={agent.status === 'on' ? <p className="ov-now">Now: {agent.now}</p> : <p className="ov-now team-paused"><Pause size={14} aria-hidden />Paused{agent.pausedUntil ? ` until ${agent.pausedUntil}` : ''}. Nothing new starts until you resume.</p>} />
      <div className="grid-2 ov-cards">
        <section className="card pad ov">
          <h2>Track record · 30 days</h2>
          <p className="ov-big">{trust.head}</p>
          <p className="muted">{trust.sub}</p>
          {undos.length > 0 && <ul className="ov-undos" aria-label="Last undone">{undos.map(l => <li key={l.id}>Undone: {l.text}</li>)}</ul>}
          <button type="button" className="link-btn ov-link" onClick={() => onTab('record')}>See track record</button>
        </section>
        <section className="card pad ov">
          <h2>Autonomy</h2>
          <p className="ov-big">{preset === 'custom' ? 'Custom' : PRESET_LABEL[preset]}</p>
          <p className="muted">{PRESET_SAYS[preset].replace(/^\w+: (\w)/, (_, c: string) => c.toUpperCase())}</p>
          <AutonomySummary agent={agent} />
          <button type="button" className="link-btn ov-link" onClick={() => onTab('autonomy')}>Change autonomy</button>
        </section>
      </div>
    </div>
  )
}

/** Same pause choices on the team list and the profile. A paused agent has one: Resume. */
function usePauseItems(a: Agent): MenuItem[] {
  const { d } = useStore()
  if (a.status !== 'on') return [{ label: 'Resume', icon: <Play size={14} />, onSelect: () => d({ type: 'core/agentStatus', agent: a.id, status: 'on' }) }]
  const pause = (until?: string) => d({ type: 'core/agentStatus', agent: a.id, status: 'paused', until })
  return [
    { heading: 'Pause' },
    { label: 'For 1 hour', onSelect: () => pause('in 1 hour') },
    { label: 'Until tomorrow 08:00', onSelect: () => pause('tomorrow 08:00') },
    { label: 'Until Monday', onSelect: () => pause('Monday') },
    { label: 'Until I resume', onSelect: () => pause() },
  ]
}

function PauseMenu({ a }: { a: Agent }) {
  const items = usePauseItems(a)
  return <Menu align="end" trigger={<Btn><Pause size={14} />Pause<ChevronDown size={12} /></Btn>} items={items} />
}
