import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import type { Decision, Handoff } from '../../app/types'
import { useStore } from '../../app/store'
import { groupOf } from '../../app/reducer'
import { Btn, Mark, Menu, Net, Pill } from '../../ui'
import { InfoPop } from '../../ui/More'
import { gist } from '../../ui/gist'
import { PAUSE_TOPIC } from './guards'
import { RETRY_OPTIONS } from './failures'
import { useOpenPost } from './Bulk'

/*
 * Needs you, the first filter of Publishing's landing list (matrix §14): one row per Atlas card the rail badge counts.
 * A row is the card's title, one line of reason, a status only when it's Failed or Paused, and one decision.
 */
type Gesture = 'fix' | 'paused' | 'approve' | 'answer' | 'plan'
export const gestureOf = (h: Handoff): Gesture =>
  h.topic === 'Publishing failed' ? 'fix' : h.topic === PAUSE_TOPIC ? 'paused' : h.preview?.type === 'plan' ? 'plan' : h.field || h.options?.length ? 'answer' : 'approve'

/** Atlas's cards in Needs you: the same filter as the rail badge (Shell), so both always count the same. */
export const atlasNeeds = (handoffs: Handoff[]) => handoffs.filter(h => h.agent === 'atlas' && !h.lane && groupOf(h) === 'need')

/** One card, one row: what, the reason in one line, the decision on the spot. Opening it is never required. */
export function NeedRow({ h, check }: { h: Handoff; check?: ReactNode }) {
  const { d } = useStore()
  const open = useOpenPost()
  const [answer, setAnswer] = useState('')
  const resolve = (decision: Decision) => d({ type: 'core/resolve', id: h.id, decision })
  const g = gestureOf(h)
  const post = h.preview?.type === 'post' ? h.preview : undefined
  // « Why? » only when it adds something to the visible line: the rest of the context, or the agent's reasoning.
  const more = [h.context && gist(h.context) !== h.context.trim() ? h.context : '', h.why ?? ''].filter(Boolean).join(' ')
  const options = (h.options ?? []).map((o, i) => ({ o, i }))
  const best = Math.max(0, options.findIndex(x => x.o.recommended))
  const others = (list: { o: { label: string }; i: number }[], label: string) => list.length > 0 && (
    <Menu align="end" trigger={<Btn size="sm" variant="ghost">{label}<ChevronDown size={12} /></Btn>}
      items={list.map(({ o, i }) => ({ label: o.label, onSelect: () => resolve({ kind: 'option', index: i, option: o.label }) }))} />
  )

  let acts: ReactNode
  if (g === 'fix') acts = <>
    <Btn size="sm" onClick={() => resolve({ kind: 'option', index: 0, option: RETRY_OPTIONS[0].label })}>{RETRY_OPTIONS[0].label}</Btn>
    {others(RETRY_OPTIONS.slice(1).map((o, i) => ({ o, i: i + 1 })), 'Other ways')}
  </>
  else if (g === 'plan') acts = <Btn size="sm" onClick={() => resolve({ kind: 'approve' })}>Approve the plan</Btn>
  else if (h.field) acts = (
    <form className="pub-need-answer" onSubmit={e => { e.preventDefault(); if (answer.trim()) resolve({ kind: 'answer', text: answer.trim() }) }}>
      <input className="input" aria-label={h.field.label} placeholder={h.field.placeholder} value={answer} onChange={e => setAnswer(e.target.value)} />
      <Btn size="sm" type="submit" disabled={!answer.trim()}>Add</Btn>
    </form>
  )
  else if (options.length) acts = <>
    <Btn size="sm" onClick={() => resolve({ kind: 'option', index: best, option: options[best].o.label })}>{options[best].o.label}</Btn>
    {others(options.filter(x => x.i !== best), 'Other answers')}
  </>
  else acts = <Btn size="sm" onClick={() => resolve({ kind: 'approve' })}>Approve</Btn>

  // The title opens what the decision is about: the failed post, the plan, or the card on the Desk.
  const title = g === 'fix' && h.ref ? <button className="dq-name" onClick={() => open(h.ref!)}>{h.title}</button>
    : g === 'plan' ? <Link className="dq-name" to="/publishing/plan">{h.title}</Link>
    : <Link className="dq-name" to={`/?card=${h.id}`}>{h.title}</Link>
  const status = g === 'fix' ? 'Failed' : g === 'paused' ? 'Paused' : undefined
  return (
    <li className="dq-row pub-need-row">
      <span className="dq-check">{check}</span>
      <span className="pub-need-lead">{post ? <Net n={post.network} /> : <Mark agent="atlas" />}</span>
      <div className="dq-main">
        <p className="dq-title">{title}</p>
        <p className="dq-line">
          {status && <Pill tone={g === 'fix' ? 'alert' : 'caution'}>{status}</Pill>}
          {post && !h.title.includes(post.slot) && <span className="mono">{post.slot}</span>}
          {h.context && <span className="dq-src">{gist(h.context)}</span>}
          {more && <InfoPop label="Why?">{more}</InfoPop>}
        </p>
      </div>
      <div className="dq-acts">{acts}</div>
    </li>
  )
}
