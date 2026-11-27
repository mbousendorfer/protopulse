import { useState } from 'react'
import type { AgentId, Decision, Handoff } from '../../app/types'
import { useStore } from '../../app/store'
import { pronoun } from '../../app/reducer'
import { agentName } from '../../data/agents'
import { Btn, Mark } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import { DecisionRow } from '../../ui/Decisions'
import { autonomyRequests } from './needs'

/**
 * Autonomy requests, decided on the row (PROMPT §6.7): on Agents › Team for the whole team, on the profile for one agent.
 * Nothing waiting: nothing shown. Rule proposals are decided in Shared rules, department items in their department.
 */
export function Requests({ agent }: { agent?: AgentId }) {
  const { s, d } = useStore()
  const [done, setDone] = useState<{ text: string; card: Handoff } | null>(null)
  const requests = autonomyRequests(s.handoffs, agent)
  if (!requests.length && !done) return null
  const decide = (h: Handoff, decision: Decision, text: string) => { d({ type: 'core/resolve', id: h.id, decision }); setDone({ text, card: h }) }
  return (
    <section className="card" aria-labelledby="req-h">
      <div className="card-head"><h2 id="req-h">Needs you</h2></div>
      {done && <div className="card-body"><UndoBar onDismiss={() => setDone(null)} onUndo={() => { d({ type: 'core/restore', handoff: done.card }); setDone(null) }}>{done.text}</UndoBar></div>}
      <ul className="rows">{requests.map(h => <RequestRow key={h.id} h={h} decide={decide} />)}</ul>
    </section>
  )
}

function RequestRow({ h, decide }: { h: Handoff; decide: (h: Handoff, d: Decision, text: string) => void }) {
  const [proof, setProof] = useState(false)
  const up = h.promote!.to === 'act'
  const name = agentName(h.agent)
  const lines = h.preview?.type === 'evidence' ? h.preview.lines : []
  return (
    <DecisionRow lead={<Mark agent={h.agent} size="md" />} title={h.title}
      line={<>{h.context}{lines.length > 0 && <> <button type="button" className="link-btn" aria-expanded={proof} onClick={() => setProof(!proof)}>{proof ? 'Hide the proof' : 'See the proof'}</button></>}</>}
      detail={proof && <ul className="dec-proof">{lines.map(l => <li key={l}>{l}</li>)}</ul>}
      acts={up ? <>
        <Btn size="sm" variant="ghost" onClick={() => decide(h, { kind: 'reject', reason: 'Not yet' }, `Not yet. ${name} keeps drafting and will ask again.`)}>Not yet</Btn>
        <Btn size="sm" variant="ghost" title="Goes back to Draft after 7 days, with a report" onClick={() => decide(h, { kind: 'trial' }, `${name} tries it for a week, then goes back to Draft with a report.`)}>Try for a week</Btn>
        <Btn size="sm" onClick={() => decide(h, { kind: 'approve' }, `${name} now does it on ${pronoun(h.agent)} own.`)}>Allow</Btn>
      </> : <>
        <Btn size="sm" variant="ghost" onClick={() => decide(h, { kind: 'reject', reason: 'Keep on Act' }, `${name} stays on Act.`)}>Keep on Act</Btn>
        <Btn size="sm" onClick={() => decide(h, { kind: 'approve' }, `${name} goes back to ${h.promote!.to === 'draft' ? 'Draft' : 'Suggest'}.`)}>Move to {h.promote!.to === 'draft' ? 'Draft' : 'Suggest'}</Btn>
      </>} />
  )
}
