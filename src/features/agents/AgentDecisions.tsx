import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, LayoutList, ShieldCheck } from 'lucide-react'
import type { Agent, Decision, Handoff } from '../../app/types'
import { useStore } from '../../app/store'
import { groupOf, pronoun } from '../../app/reducer'
import { agentName } from '../../data/agents'
import { Btn, Mark } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import { DecisionBlock, DecisionGroup, DecisionRow } from '../../ui/Decisions'
import { autonomyRequests, departmentNeeds, departmentOf, ruleProposals } from './needs'

type Filter = 'autonomy' | 'rules' | 'departments'
const RANK = { urgent: 0, today: 1, week: 2 }
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/**
 * What waits for Sam at his agents (PROMPT §3.9): autonomy requests and rule proposals, decided on the row,
 * then what waits in each department, one row per agent that opens the department's own Needs you.
 * Without `agent`: the whole team (Agents › Team). With it: that agent only (first tab of its profile).
 */
export function AgentDecisions({ agent }: { agent?: Agent }) {
  const { s, d } = useStore()
  const [filter, setFilter] = useState<Filter | 'all'>('all')
  const [done, setDone] = useState<{ text: string; cards: Handoff[] } | null>(null)

  const requests = autonomyRequests(s.handoffs, agent?.id)
  const proposals = ruleProposals(s.handoffs, agent?.id)
  const depts = (agent ? [agent] : s.agents).map(a => ({ a, n: departmentNeeds(s, a.id) })).filter(x => x.n > 0).sort((x, y) => y.n - x.n)
  const deptTotal = depts.reduce((n, x) => n + x.n, 0)

  const decide = (cards: Handoff[], decision: Decision, text: string) => {
    for (const h of cards) d({ type: 'core/resolve', id: h.id, decision })
    setDone({ text, cards })
  }
  const show = (f: Filter) => filter === 'all' || filter === f

  const onShift = s.agents.filter(a => a.status === 'on').length
  return (
    <DecisionBlock<Filter>
      filter={filter} onFilter={setFilter}
      counts={[
        { value: 'autonomy', n: requests.length, label: plural(requests.length, 'autonomy request') },
        { value: 'rules', n: proposals.length, label: plural(proposals.length, 'rule proposal') },
        { value: 'departments', n: deptTotal, label: `${deptTotal} waiting in ${agent ? departmentOf(agent) : 'departments'}` },
      ]}
      feedback={done && (
        <UndoBar onDismiss={() => setDone(null)} onUndo={() => { for (const h of done.cards) d({ type: 'core/restore', handoff: h }); setDone(null) }}>{done.text}</UndoBar>
      )}
      empty={agent ? (
        <><p>Nothing needs you here.</p><p>{agent.status === 'on'
          ? `${agent.name} keeps watching and raises anything that crosses ${pronoun(agent.id)} ${plural(agent.guardrails.length, 'guardrail')} or an escalation rule.`
          : `${agent.name} is paused${agent.pausedUntil ? ` until ${agent.pausedUntil}` : ''}. Nothing new comes in until you resume.`}</p></>
      ) : (
        <><p>Nothing needs you here.</p><p>{onShift} of {s.agents.length} agents on shift. {s.agents.filter(a => a.status === 'on').map(a => `${a.name}: ${a.now.charAt(0).toLowerCase()}${a.now.slice(1)}`).join(' · ')}.</p></>
      )}>

      {show('autonomy') && (
        <DecisionGroup title="Autonomy requests" icon={<ShieldCheck />} n={requests.length}
          hint="Each one comes with its proof. A trial week goes back on its own, with a report.">
          {requests.map(h => <RequestRow key={h.id} h={h} decide={decide} />)}
        </DecisionGroup>
      )}

      {show('rules') && (
        <DecisionGroup title="Rule proposals" icon={<BookOpen />} n={proposals.length}
          hint="Spotted in your edits. An added rule applies to the next draft."
          action={proposals.length > 1 && <Btn size="sm" variant="primary" onClick={() => decide(proposals, { kind: 'approve' }, `${plural(proposals.length, 'rule')} added to the Playbook.`)}>Add all {proposals.length} to Playbook</Btn>}>
          {proposals.map(h => (
            <DecisionRow key={h.id} lead={<Mark agent={h.agent} size="md" />}
              title={<>“{h.proposal!.text}”</>}
              line={<>{h.context} · for {h.proposal!.agents.map(agentName).join(' and ')}</>}
              acts={<>
                <Btn size="sm" variant="ghost" onClick={() => decide([h], { kind: 'reject', reason: 'Not a rule' }, `Dismissed “${h.proposal!.text}”.`)}>Dismiss</Btn>
                <Btn size="sm" onClick={() => decide([h], { kind: 'approve' }, `Added to the Playbook: “${h.proposal!.text}”.`)}>Add to Playbook</Btn>
              </>} />
          ))}
        </DecisionGroup>
      )}

      {show('departments') && (
        <DecisionGroup title={agent ? `Waiting in ${departmentOf(agent)}` : 'Waiting in departments'} icon={<LayoutList />} n={deptTotal}
          hint="Decided where they live, with the agent’s draft and its reason.">
          {depts.map(({ a, n }) => {
            const top = s.handoffs.filter(h => h.agent === a.id && !h.lane && groupOf(h) === 'need' && h.kind !== 'promotion' && !h.proposal)
              .sort((x, y) => RANK[x.urgency] - RANK[y.urgency] || x.at - y.at)[0]
            const first = top ? <>{top.urgency === 'urgent' ? 'Urgent' : 'First up'}: {top.title}</> : a.status === 'on' ? a.now : `Paused${a.pausedUntil ? ` until ${a.pausedUntil}` : ''}`
            // On the profile the group already names the agent and the count: the row leads with the first item.
            return (
              <DecisionRow key={a.id} lead={<Mark agent={a.id} size="md" state={a.status === 'on' ? 'on' : 'paused'} />}
                title={agent ? first : `${a.name} · ${n} in ${departmentOf(a)}`}
                line={agent ? `${n} waiting in ${departmentOf(a)}, urgent first` : first}
                acts={<Link to={a.route} className="btn sm">Review in {departmentOf(a)}</Link>} />
            )
          })}
        </DecisionGroup>
      )}
    </DecisionBlock>
  )
}

function RequestRow({ h, decide }: { h: Handoff; decide: (cards: Handoff[], d: Decision, text: string) => void }) {
  const [proof, setProof] = useState(false)
  const up = h.promote!.to === 'act'
  const name = agentName(h.agent)
  const lines = h.preview?.type === 'evidence' ? h.preview.lines : []
  return (
    <DecisionRow lead={<Mark agent={h.agent} size="md" />} title={h.title}
      line={<>{h.context}{lines.length > 0 && <> <button type="button" className="link-btn" aria-expanded={proof} onClick={() => setProof(!proof)}>{proof ? 'Hide the proof' : 'See the proof'}</button></>}</>}
      detail={proof && <ul className="dec-proof">{lines.map(l => <li key={l}>{l}</li>)}</ul>}
      acts={up ? <>
        <Btn size="sm" variant="ghost" onClick={() => decide([h], { kind: 'reject', reason: 'Not yet' }, `Not yet. ${name} keeps drafting and will ask again.`)}>Not yet</Btn>
        <Btn size="sm" variant="ghost" onClick={() => decide([h], { kind: 'trial' }, `${name} tries it for a week, then goes back to Draft with a report.`)}>Try for a week</Btn>
        <Btn size="sm" onClick={() => decide([h], { kind: 'approve' }, `${name} now does it on ${pronoun(h.agent)} own.`)}>Allow</Btn>
      </> : <>
        <Btn size="sm" variant="ghost" onClick={() => decide([h], { kind: 'reject', reason: 'Keep on Act' }, `${name} stays on Act.`)}>Keep on Act</Btn>
        <Btn size="sm" onClick={() => decide([h], { kind: 'approve' }, `${name} goes back to ${h.promote!.to === 'draft' ? 'Draft' : 'Suggest'}.`)}>Move to {h.promote!.to === 'draft' ? 'Draft' : 'Suggest'}</Btn>
      </>} />
  )
}
