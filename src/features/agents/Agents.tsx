import { Fragment, useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronDown, MoreHorizontal, Pause, Pencil, Play, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import type { Agent, AgentId, Autonomy } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { ago, DAY } from '../../app/time'
import { PRESET_LABEL, weeklyLoad } from '../../data/agents'
import { Btn, Empty, Mark, Menu, PageHead, Pill, Seg, Tabs, type MenuItem } from '../../ui'
import { AutonomyList, AutonomySummary, PRESET_SAYS, presetDelta, presetOf } from './autonomy'
import { profileTab, proposalsFor, rulesFor } from './rules'
import { CountBadge, Notice, UndoBar } from '../../ui/Feedback'
import { Bars } from '../../ui/charts'
import { Requests } from './AgentDecisions'
import { autonomyRequests, ruleProposals, trustOf } from './needs'
import './agents.css'
import { registry } from '../../app/agents-registry'
import { AgentScene } from '../../ui/Illustrations'

/* ---------- Agents: Team · Shared rules · Escalation · Activity ---------- */
type Section = 'team' | 'rules' | 'escalation' | 'activity'
const SECTION_PATH: Record<Section, string> = { team: '/agents', rules: '/agents/rules', escalation: '/agents/escalation', activity: '/agents/activity' }

export function AgentsLayout() {
  const { s } = useStore()
  const nav = useNavigate()
  const seg = useLocation().pathname.split('/')[2]
  const section: Section = seg === 'rules' || seg === 'escalation' || seg === 'activity' ? seg : 'team'
  // A count on a tab means "needs you": autonomy requests on Team, rule proposals on Shared rules.
  const requests = autonomyRequests(s.handoffs).length
  const proposals = ruleProposals(s.handoffs).length
  return (
    <div className="page">
      <PageHead title="Agents" />
      <Tabs value={section} onChange={v => nav(SECTION_PATH[v])} items={[
        { value: 'team', label: <>Team{requests > 0 && <CountBadge n={requests} needs label={`${requests} autonomy request${requests > 1 ? 's' : ''} need you`} />}</> },
        { value: 'rules', label: <>Shared rules{proposals > 0 && <CountBadge n={proposals} needs label={`${proposals} rule proposal${proposals > 1 ? 's' : ''} need you`} />}</> },
        { value: 'escalation', label: 'Escalation' },
        { value: 'activity', label: 'Activity' },
      ]} />
      <Outlet />
    </div>
  )
}

/** The roster, with the autonomy requests above it. What waits in each department badges its own rail entry. */
export function Team() {
  const { s } = useStore()
  return (
    <div className="stack lg">
      <Requests />
      <section className="card team-card" aria-label="Your team">
        {/* One line per agent, columns aligned: who, what now, how free, how trusted. */}
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
  const a = s.agents.find(x => x.id === id)
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(profileTab(params.get('tab')))
  // Same component for every agent: going from Echo's Alerts to Nova must not keep Echo's tab.
  // A link to another tab of the same agent (a Desk card to ?tab=record) moves the tab too.
  useEffect(() => { setTab(profileTab(params.get('tab'))) }, [id, params.get('tab')]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return <div className="page"><Empty title="This agent doesn’t exist" action={<Link to="/agents" className="btn">Back to the team</Link>} /></div>
  if (tab === 'rules') return <Navigate to={`/agents/rules?agent=${a.id}`} replace />
  const requests = autonomyRequests(s.handoffs, a.id).length
  const extra = registry().find(m => m.id === a.id)?.profileTabs ?? []

  return (
    <div className="page">
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
        { value: 'how', label: <>How it works{requests > 0 && <CountBadge n={requests} needs label={`${requests} autonomy request${requests > 1 ? 's' : ''} need you`} />}</> },
        { value: 'record', label: 'Track record' },
        ...extra.map(t => ({ value: t.id, label: t.label, count: t.count?.(s) })),
      ]} />

      {tab === 'how' && <HowItWorks agent={a} />}
      {extra.map(t => tab === t.id && <Fragment key={t.id}>{t.render()}</Fragment>)}
      {tab === 'record' && <Record agent={a} />}
    </div>
  )
}

/** Everything that decides what the agent does alone: its requests, its autonomy, its limits, the rules it follows. */
function HowItWorks({ agent: a }: { agent: Agent }) {
  const { s, d } = useStore()
  const [undoPreset, setUndoPreset] = useState<{ label: string; delta: string; levels: [string, Autonomy][] } | null>(null)
  useEffect(() => setUndoPreset(null), [a.id])
  const preset = presetOf(a)
  const mine = rulesFor(s.playbook.rules, a.id)
  const proposals = proposalsFor(s.handoffs, a.id).length
  return (
    <div className="stack lg">
      <Requests agent={a.id} />
      <section className="card pad-lg">
        <div className="row between items-start">
          <div>
            <h2 className="h2">Autonomy</h2>
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
      <Guardrails agent={a} />
      <Escalation agent={a} />
      <section className="card">
        <div className="card-head">
          <h2>Playbook</h2>
          <Link to={`/agents/rules?agent=${a.id}`} className="btn sm ghost">See in Shared rules</Link>
        </div>
        <p className="card-body">
          Follows {mine.rules.length} rule{mine.rules.length === 1 ? '' : 's'} and cites {mine.facts.length} fact{mine.facts.length === 1 ? '' : 's'}, with the brand voice and words.
          {proposals > 0 && <> <Link to={`/agents/rules?agent=${a.id}`}>{proposals} proposed rule{proposals > 1 ? 's' : ''} need{proposals > 1 ? '' : 's'} you</Link>.</>}
        </p>
      </section>
    </div>
  )
}

function Promotions({ agent }: { agent: Agent }) {
  const { s } = useStore()
  const now = useNow()
  const fromLog = s.log.filter(l => l.agent === agent.id && /moved .* to |trial for a week|Autonomy request|wants to/i.test(l.text)).slice(0, 5)
  const hist = HISTORY[agent.id]
  return (
    <section className="card">
      <div className="card-head"><h2>Autonomy history</h2></div>
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

/** How far the agent is trusted: the numbers, the last 30 days, what it did lately, how its autonomy changed. */
function Record({ agent }: { agent: Agent }) {
  const { s } = useStore()
  const now = useNow(60_000)
  // Dated ticks every 5 days, ending today: a bare “25” didn't say whether it was a date or days ago.
  const n = agent.record.series.length
  const days = agent.record.series.map((_, i) => ((n - 1 - i) % 5 === 0 ? (i === n - 1 ? 'Today' : new Date(now - (n - 1 - i) * DAY).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) : ''))
  const items = s.log.filter(l => l.agent === agent.id).slice(0, 20)
  return (
    <div className="stack lg">
      <dl className="grid-4 record-kpis">
        <div className="card pad stat"><dd><b className="num">{agent.record.handled.toLocaleString('en-GB')}</b></dd><dt className="label">Handled alone · 30 days</dt></div>
        <div className="card pad stat"><dd><b className="num">{agent.record.escalated}</b></dd><dt className="label">Raised to you</dt></div>
        <div className="card pad stat"><dd><b className="num">{agent.record.handled ? `${agent.record.approvedUnchanged}%` : '–'}</b></dd><dt className="label">Approved unchanged</dt></div>
        <div className="card pad stat"><dd><b className="num">{agent.record.undone}</b></dd><dt className="label">Undone by you</dt></div>
      </dl>
      <section className="card pad">
        <div className="section-title">Actions handled alone per day <span className="faint">· last 30 days</span></div>
        <Bars data={agent.record.series} labels={days} label={`${agent.name} actions per day`} h={140} color={`var(--a-${agent.id})`} />
      </section>
      <section className="card">
        <div className="card-head">
          <div><h2>Last 20 actions</h2><p className="ov-now">{agent.status === 'on' ? `Now: ${agent.now}` : `Paused${agent.pausedUntil ? ` until ${agent.pausedUntil}` : ''}. Nothing new starts until you resume.`}</p></div>
          <Link to={`/agents/activity?agent=${agent.id}`} className="btn sm ghost">Full journal</Link>
        </div>
        <ul className="rows hist">
          {!items.length && <li className="faint">No activity yet.</li>}
          {items.map(l => <li key={l.id}><span className={l.status === 'undone' ? 'struck' : undefined}>{l.text}{l.reason && <span className="faint"> · {l.reason}</span>}</span>{l.status === 'undone' && <Pill tone="caution">Undone</Pill>}<span className="mono faint">{ago(l.at, now)}</span></li>)}
        </ul>
      </section>
      <Promotions agent={agent} />
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
