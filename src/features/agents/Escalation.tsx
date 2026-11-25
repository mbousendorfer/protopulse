import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { AgentId } from '../../app/types'
import { useStore } from '../../app/store'
import { AGENTS, agentName } from '../../data/agents'
import { Btn, Empty, Filters, Menu, Seg, Switch } from '../../ui'
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
  { id: 'budget', label: 'Spending above €N', n: '100', agents: ['iris', 'sage'] },
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
  return (
    <section className="card">
      <div className="card-head"><div><h2>Always raised to a person</h2><span className="faint">Whatever the autonomy, these topics never go out without a human.</span></div></div>
      <div className="card-body pb-0">
        <Filters label="Watched by" value={agent} onChange={v => { setParams(v === 'all' ? {} : { agent: v }, { replace: true }); pick(CONDITIONS.find(c => v === 'all' || c.agents.includes(v))) }}
          items={[{ value: 'all' as const, label: 'All agents' }, ...AGENTS.map(a => ({ value: a.id, label: a.name }))]} />
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
            <Btn size="sm" variant="primary" disabled={exists} title={exists ? 'This rule already exists' : undefined} onClick={() => d({ type: 'playbook/escalateAdd', rule: { id: `e-${Date.now().toString(36)}`, label, to, on: true, agents: cond.agents } })}><Plus size={14} />Add “{label}”</Btn>
            {exists && <span className="caption">Already in the list.</span>}
          </div>
        ) : <p className="faint">No ready-made condition for {agent === 'all' ? 'this agent' : agentName(agent)} yet.</p>}
      </div>
    </section>
  )
}
