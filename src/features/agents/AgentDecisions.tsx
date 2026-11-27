import { useState } from 'react'
import { Check } from 'lucide-react'
import type { AgentId, Decision, Handoff } from '../../app/types'
import { useStore } from '../../app/store'
import { pronoun } from '../../app/reducer'
import { agentName } from '../../data/agents'
import { Btn, Mark } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import { DecisionRow } from '../../ui/Decisions'
import { autonomyRequests } from './needs'

type Decide = (h: Handoff, d: Decision, text: string) => void

/** The request set apart: a move up with the strongest case (matrix §15). Moves back down stay rows. */
const featuredOf = (requests: Handoff[]) =>
  [...requests].filter(h => h.promote!.to === 'act').sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0]

/**
 * Autonomy requests, decided on the spot (PROMPT §6.7): on Agents › Team for the whole team, on the profile for one agent.
 * The strongest request is a card with its proof in view; the others are rows. Nothing waiting: nothing shown.
 */
export function Requests({ agent }: { agent?: AgentId }) {
  const { s, d } = useStore()
  const [done, setDone] = useState<{ text: string; card: Handoff } | null>(null)
  const requests = autonomyRequests(s.handoffs, agent)
  if (!requests.length && !done) return null
  const decide: Decide = (h, decision, text) => { d({ type: 'core/resolve', id: h.id, decision }); setDone({ text, card: h }) }
  const top = featuredOf(requests)
  const rest = requests.filter(h => h !== top)
  return (
    <div className="stack">
      {done && <UndoBar onDismiss={() => setDone(null)} onUndo={() => { d({ type: 'core/restore', handoff: done.card }); setDone(null) }}>{done.text}</UndoBar>}
      {top && <FeaturedRequest h={top} decide={decide} />}
      {rest.length > 0 && (
        <section className="card" aria-label="Other requests">
          <ul className="rows">{rest.map(h => <RequestRow key={h.id} h={h} decide={decide} />)}</ul>
        </section>
      )}
    </div>
  )
}

function FeaturedRequest({ h, decide }: { h: Handoff; decide: Decide }) {
  const name = agentName(h.agent)
  const lines = h.preview?.type === 'evidence' ? h.preview.lines : []
  return (
    <section className="card req-feature" aria-labelledby={`req-${h.id}`} style={{ ['--tone' as string]: `var(--a-${h.agent})`, ['--tone-wash' as string]: `var(--a-${h.agent}-wash)`, ['--tone-ink' as string]: `var(--a-${h.agent}-ink)` }}>
      <div className="req-head">
        <Mark agent={h.agent} size="lg" />
        <div className="grow">
          <h2 id={`req-${h.id}`}>{h.title}</h2>
          <p>{h.context}</p>
        </div>
      </div>
      {lines.length > 0 && <ul className="req-proof" aria-label="The proof">{lines.map(l => <li key={l}><Check size={14} aria-hidden />{l}</li>)}</ul>}
      <div className="req-acts">
        <Btn variant="primary" onClick={() => decide(h, { kind: 'approve' }, `${name} now does it on ${pronoun(h.agent)} own.`)}>Allow</Btn>
        <Btn title="Goes back to Draft after 7 days, with a report" onClick={() => decide(h, { kind: 'trial' }, `${name} tries it for a week, then goes back to Draft with a report.`)}>Try for a week</Btn>
        <Btn variant="ghost" onClick={() => decide(h, { kind: 'reject', reason: 'Not yet' }, `Not yet. ${name} keeps drafting and will ask again.`)}>Not yet</Btn>
      </div>
    </section>
  )
}

function RequestRow({ h, decide }: { h: Handoff; decide: Decide }) {
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
