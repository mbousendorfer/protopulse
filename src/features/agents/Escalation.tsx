import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, Trash2 } from 'lucide-react'
import type { AgentId } from '../../app/types'
import { useStore } from '../../app/store'
import { AGENTS, agentName } from '../../data/agents'
import { Btn, Empty, Mark, Menu, Seg, Switch } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import './rules.css'

/** Ready-made escalation conditions. "N" is replaced by the number the user types. */
const CONDITIONS: { id: string; label: string; n?: string; agents: AgentId[] }[] = [
  { id: 'injury', label: 'Injury, safety or product recall', agents: ['nova', 'echo'] },
  { id: 'press', label: 'Journalists and press', agents: ['nova', 'echo'] },
  { id: 'legal', label: 'Lawyers and legal threats', agents: ['nova'] },
  { id: 'creator', label: 'Creators above N followers', n: '50k', agents: ['nova', 'echo'] },
  { id: 'refund', label: 'Refunds above €N', n: '150', agents: ['nova'] },
  { id: 'spike', label: 'More than N negative mentions in an hour', n: '20', agents: ['echo'] },
  { id: 'competitor', label: 'Anything that names a competitor', agents: ['atlas', 'echo'] },
  { id: 'drop', label: 'A metric dropping more than N% in a week', n: '30', agents: ['iris'] },
]
type Cond = (typeof CONDITIONS)[number]
const labelOf = (c: Cond, v = c.n) => (c.n ? c.label.replace('N', v || c.n) : c.label)

/** Agents › Escalation: the one place to edit escalation. Agent profiles and Settings › Approver show it and link here. */
export default function Escalation() {
  const { s, d } = useStore()
  const [params, setParams] = useSearchParams()
  const q = params.get('agent') as AgentId
  const agent: 'all' | AgentId = AGENTS.some(a => a.id === q) ? q : 'all'
  const conditions = agent === 'all' ? CONDITIONS : CONDITIONS.filter(c => c.agents.includes(agent))
  const [cond, setCond] = useState<Cond | undefined>(() => conditions.find(c => !s.playbook.escalate.some(r => r.label === labelOf(c))) ?? conditions[0])
  const [n, setN] = useState(cond?.n ?? '')
  const [to, setTo] = useState<'sam' | 'claire'>('sam')
  const [removed, setRemoved] = useState<(typeof s.playbook.escalate)[number] | null>(null)
  const pick = (c: Cond | undefined) => { setCond(c); setN(c?.n ?? '') }
  const shown = s.playbook.escalate.filter(e => agent === 'all' || e.agents.includes(agent))
  const label = cond ? labelOf(cond, n) : ''
  const exists = s.playbook.escalate.some(r => r.label === label)
  const filterBy = (v: 'all' | AgentId) => { setParams(v === 'all' ? {} : { agent: v }, { replace: true }); pick(CONDITIONS.find(c => v === 'all' || c.agents.includes(v))) }
  return (
    <section className="card">
      <div className="card-head">
        <h2>Always raised to a person, whatever the autonomy</h2>
        <Menu align="end" trigger={<Btn size="sm" variant="ghost">{agent !== 'all' && <Mark agent={agent} />}{agent === 'all' ? 'All agents' : agentName(agent)}<ChevronDown size={12} /></Btn>}
          items={[{ label: 'All agents', onSelect: () => filterBy('all') }, ...AGENTS.map(a => ({ label: a.name, icon: <Mark agent={a.id} />, onSelect: () => filterBy(a.id) }))]} />
      </div>
      <ul className="rows">
        {!shown.length && <li><Empty title={`Nothing is raised by ${agent === 'all' ? 'any agent' : agentName(agent)} yet`} /></li>}
        {shown.map(e => (
          <li key={e.id} className={`pb-esc ${e.on ? '' : 'off'}`}>
            <Switch checked={e.on} onChange={on => d({ type: 'playbook/escalate', id: e.id, on })} label={e.label} hideLabel />
            <div className="grow">
              <b>{e.label}</b>
              <div className="faint t-xs">Watched by {e.agents.map(agentName).join(' and ')}</div>
            </div>
            <Seg name={`esc-${e.id}`} label={`Who decides: ${e.label}`} size="sm" value={e.to} onChange={to => d({ type: 'playbook/escalate', id: e.id, to })}
              options={[{ value: 'sam', label: 'You' }, { value: 'claire', label: 'Claire' }]} />
            <Btn size="xs" variant="ghost" icon aria-label={`Delete ${e.label}`} onClick={() => { setRemoved(e); d({ type: 'playbook/escalateDelete', id: e.id }) }}><Trash2 size={12} /></Btn>
          </li>
        ))}
      </ul>
      <div className="card-body">
        {removed && (
          <UndoBar className="mb-3" onUndo={() => { d({ type: 'playbook/escalateAdd', rule: removed }); setRemoved(null) }} onDismiss={() => setRemoved(null)}>Deleted “{removed.label}”</UndoBar>
        )}
        <div className="section-title">Add a rule</div>
        {cond ? (
          <div className="row">
            <Menu align="start" trigger={<Btn size="sm">{cond.label.replace('N', '…')}<ChevronDown size={14} /></Btn>}
              items={conditions.map(c => ({ label: c.label.replace('N', '…'), hint: c.agents.map(agentName).join(', '), onSelect: () => pick(c) }))} />
            {cond.n && <input className="input pb-n" inputMode="numeric" value={n} onChange={e => setN(e.target.value)} aria-label="Threshold" />}
            <span className="faint">goes to</span>
            <Seg name="new-esc" label="Who decides" size="sm" value={to} onChange={setTo} options={[{ value: 'sam', label: 'You' }, { value: 'claire', label: 'Claire' }]} />
            <Btn size="sm" variant="primary" disabled={exists} title={exists ? 'This rule already exists' : undefined} onClick={() => d({ type: 'playbook/escalateAdd', rule: { id: `e-${Date.now().toString(36)}`, label, to, on: true, agents: cond.agents } })}>Add</Btn>
            {exists && <span className="caption">Already in the list.</span>}
          </div>
        ) : <p className="faint">No ready-made condition for {agent === 'all' ? 'this agent' : agentName(agent)} yet.</p>}
      </div>
    </section>
  )
}
