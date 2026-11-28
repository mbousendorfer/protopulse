import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import type { Decision, Handoff } from '../app/types'
import { useStore } from '../app/store'
import { Btn, Menu, type MenuItem } from './index'
import './decisions.css'

/** One decision: who, what, why in one line, and the decision itself on the right. `detail` folds under the line (proof). */
export function DecisionRow({ lead, title, line, acts, detail }: { lead: ReactNode; title: ReactNode; line?: ReactNode; acts: ReactNode; detail?: ReactNode }) {
  return (
    <li className="dec-row">
      <span className="dec-lead">{lead}</span>
      <div className="dec-main">
        <p className="dec-title">{title}</p>
        {line && <p className="dec-line">{line}</p>}
        {detail}
      </div>
      <div className="dec-acts">{acts}</div>
    </li>
  )
}

/**
 * The decision on one Desk card, on a department row (matrix §14): the agent's recommended answer is the one visible
 * button; the other answers, Reject and « Review on Desk » sit in one « More » menu. Same verbs as the Desk, same
 * `core/resolve`, so a card decides the same way wherever it shows. `primary` renames the approve button.
 */
export function CardActs({ h, primary }: { h: Handoff; primary?: ReactNode }) {
  const { d } = useStore()
  const nav = useNavigate()
  const [answer, setAnswer] = useState('')
  const resolve = (decision: Decision) => d({ type: 'core/resolve', id: h.id, decision })
  const opts = h.options ?? []
  const rec = Math.max(0, opts.findIndex(o => o.recommended))
  const more: MenuItem[] = [
    ...opts.map((o, i) => ({ o, i })).filter(x => x.i !== rec).map(({ o, i }) => ({ label: o.label, onSelect: () => resolve({ kind: 'option', index: i, option: o.label }) })),
    ...(!opts.length && !h.field ? [{ label: 'Reject', onSelect: () => resolve({ kind: 'reject', reason: 'Not now' }) }] : []),
    { label: 'Review on Desk', onSelect: () => nav(`/?card=${h.id}`) },
  ]
  const menu = <Menu align="end" trigger={<Btn size="sm" variant="ghost" aria-label={`More for ${h.title}`}>More<ChevronDown size={12} /></Btn>} items={more} />
  if (h.field && !opts.length) return <>
    <form className="dec-answer" onSubmit={e => { e.preventDefault(); if (answer.trim()) resolve({ kind: 'answer', text: answer.trim() }) }}>
      <input className="input" aria-label={h.field.label} placeholder={h.field.placeholder} value={answer} onChange={e => setAnswer(e.target.value)} />
      <Btn size="sm" type="submit" disabled={!answer.trim()}>Send</Btn>
    </form>
    {menu}
  </>
  return <>
    {opts.length
      ? <Btn size="sm" onClick={() => resolve({ kind: 'option', index: rec, option: opts[rec].label })}>{opts[rec].label}</Btn>
      : <Btn size="sm" onClick={() => resolve({ kind: 'approve' })}>{primary ?? 'Approve'}</Btn>}
    {menu}
  </>
}
