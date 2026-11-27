import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Check, ChevronDown, CircleHelp, Pause, Play, RotateCw, TriangleAlert } from 'lucide-react'
import type { Decision, Handoff } from '../../app/types'
import { useStore } from '../../app/store'
import { groupOf } from '../../app/reducer'
import { hhmm } from '../../app/time'
import { Btn, Mark, Menu, Net } from '../../ui'
import { CountBadge } from '../../ui/Feedback'
import { PAUSE_TOPIC } from './guards'
import { RETRY_OPTIONS } from './failures'
import { useOpenPost } from './Bulk'
import { sentences } from './ideasModel'

/*
 * Decisions first (PROMPT §3.9, matrix §12): Publishing opens on what waits for Sam. The block holds exactly Atlas's
 * Needs-you cards, the ones the rail badge counts, grouped by gesture: one primary per group, a quick decision per row.
 * ponytail: built from existing primitives; migrate to the agents lot's shared decision-group primitive once merged.
 */
type Gesture = 'fix' | 'paused' | 'approve' | 'answer' | 'plan'
const GROUPS: { id: Gesture; title: string; hint: string; Icon: typeof Pause; one: string; many: string }[] = [
  { id: 'fix', title: 'Failed to publish', hint: '', Icon: TriangleAlert, one: 'failed', many: 'failed' },
  { id: 'paused', title: 'Paused by Atlas', hint: '', Icon: Pause, one: 'paused', many: 'paused' },
  { id: 'approve', title: 'Ready to approve', hint: 'Approving schedules them.', Icon: Check, one: 'to approve', many: 'to approve' },
  { id: 'answer', title: 'Atlas asks you', hint: '', Icon: CircleHelp, one: 'question', many: 'questions' },
  { id: 'plan', title: 'Next week’s plan', hint: '', Icon: CalendarDays, one: 'plan', many: 'plans' },
]
export const gestureOf = (h: Handoff): Gesture =>
  h.topic === 'Publishing failed' ? 'fix' : h.topic === PAUSE_TOPIC ? 'paused' : h.preview?.type === 'plan' ? 'plan' : h.field || h.options?.length ? 'answer' : 'approve'

/** Atlas's cards in Needs you: the same filter as the rail badge (Shell), so both always count the same. */
export const atlasNeeds = (handoffs: Handoff[]) => handoffs.filter(h => h.agent === 'atlas' && !h.lane && groupOf(h) === 'need')

export function PublishingNeeds({ watching }: { watching: string }) {
  const { s, d } = useStore()
  const [only, setOnly] = useState<Gesture | null>(null)
  const cards = atlasNeeds(s.handoffs)
  const paused = s.publishing.posts.filter(p => p.status === 'paused').sort((a, b) => a.at - b.at)
  const rowsOf = (g: Gesture) => (g === 'paused' ? (cards.some(h => gestureOf(h) === 'paused') ? paused.length : 0) : cards.filter(h => gestureOf(h) === g).length)
  const shown = GROUPS.filter(g => rowsOf(g.id) > 0)
  const f = only && rowsOf(only) ? only : null
  const resolve = (h: Handoff, decision: Decision) => d({ type: 'core/resolve', id: h.id, decision })

  if (!cards.length) return (
    <section className="pub-needs-none" aria-labelledby="pub-needs-h">
      <p id="pub-needs-h"><Check size={14} aria-hidden /><b>Nothing needs you here.</b> Atlas is watching {watching}.</p>
    </section>
  )
  return (
    <section className="card pub-needs" aria-labelledby="pub-needs-h">
      <header className="pub-needs-head">
        <h2 id="pub-needs-h">Needs you</h2><CountBadge n={cards.length} needs label={`${cards.length} card${cards.length > 1 ? 's' : ''} need you`} />
        <div className="filters" role="group" aria-label="Show only">
          {shown.map(g => (
            <button key={g.id} className="filter" aria-pressed={f === g.id} onClick={() => setOnly(f === g.id ? null : g.id)}>
              <span className="num">{rowsOf(g.id)}</span>{rowsOf(g.id) > 1 ? g.many : g.one}
            </button>
          ))}
        </div>
      </header>
      {shown.filter(g => !f || f === g.id).map(g => {
        const list = cards.filter(h => gestureOf(h) === g.id)
        const pause = g.id === 'paused' ? list[0] : undefined
        let main: ReactNode = null
        if (g.id === 'approve' && list.length > 1) main = <Btn size="sm" variant="primary" onClick={() => list.forEach(h => resolve(h, { kind: 'approve' }))}><Check size={14} />Approve all {list.length}</Btn>
        if (g.id === 'fix' && list.length > 1) main = <Btn size="sm" variant="primary" onClick={() => list.forEach(h => resolve(h, { kind: 'option', index: 0, option: RETRY_OPTIONS[0].label }))}><RotateCw size={14} />Retry all {list.length}</Btn>
        // Keeping them paused is Atlas's recommendation; it never needs orange, the posts resume on their own.
        if (pause) main = <><Btn size="sm" variant="ghost" onClick={() => resolve(pause, { kind: 'option', index: 1, option: pause.options?.[1]?.label ?? 'Resume all now' })}><Play size={14} />Resume all {paused.length}</Btn><Btn size="sm" onClick={() => resolve(pause, { kind: 'option', index: 0, option: pause.options?.[0]?.label ?? 'Keep them paused' })}><Check size={14} />Keep them paused</Btn></>
        return (
          <section key={g.id} className={`pub-need-group pub-g-${g.id}`} aria-label={g.title}>
            <header className="pub-need-head">
              <span className="pub-need-icon" aria-hidden><g.Icon size={14} /></span>
              <h3>{g.title}</h3>
              {/* A reason shared by the whole group is said once, here. */}
              <span className="pub-need-hint">{pause ? `${pause.title.replace(/^Atlas paused \d+ posts? during /, 'During ')}. They go out on their own once it’s over.` : g.hint}</span>
              {main && <span className="pub-need-main">{main}</span>}
            </header>
            <ul>
              {pause ? paused.map(p => <PausedRow key={p.id} id={p.id} />) : list.map(h => <NeedRow key={h.id} h={h} g={g.id} />)}
            </ul>
          </section>
        )
      })}
    </section>
  )
}

function PausedRow({ id }: { id: string }) {
  const { s, d } = useStore()
  const open = useOpenPost()
  const p = s.publishing.posts.find(x => x.id === id)!
  return (
    <li className="pub-need">
      <Net n={p.network} />
      <div className="pub-need-text">
        <button className="pub-need-title" onClick={() => open(p.id)}>{p.text}</button>
        <p className="pub-need-why"><span className="mono">{new Date(p.at).toLocaleDateString('en-GB', { weekday: 'short' })} {hhmm(p.at)}</span></p>
      </div>
      <span className="pub-need-acts"><Btn size="sm" variant="ghost" onClick={() => d({ type: 'publishing/resume', ids: [p.id] })}><Play size={14} />Resume</Btn></span>
    </li>
  )
}

/** One card: what, the reason in one line, and the decision on the spot. Opening it (Desk detail or the post) is never required. */
function NeedRow({ h, g }: { h: Handoff; g: Gesture }) {
  const { d } = useStore()
  const open = useOpenPost()
  const [answer, setAnswer] = useState('')
  const resolve = (decision: Decision) => d({ type: 'core/resolve', id: h.id, decision })
  const post = h.preview?.type === 'post' ? h.preview : undefined
  let acts: ReactNode
  if (g === 'fix') acts = <>
    <Btn size="sm" onClick={() => resolve({ kind: 'option', index: 0, option: RETRY_OPTIONS[0].label })}><RotateCw size={14} />{RETRY_OPTIONS[0].label}</Btn>
    <Menu align="end" trigger={<Btn size="sm" variant="ghost">Other ways<ChevronDown size={12} /></Btn>} items={RETRY_OPTIONS.slice(1).map((o, i) => ({ label: o.label, onSelect: () => resolve({ kind: 'option', index: i + 1, option: o.label }) }))} />
  </>
  else if (g === 'plan') acts = <>
    <Link className="btn sm ghost" to="/publishing/plan">Review it</Link>
    <Btn size="sm" onClick={() => resolve({ kind: 'approve' })}><Check size={14} />Approve the plan</Btn>
  </>
  else if (h.field) acts = (
    <form className="pub-need-answer" onSubmit={e => { e.preventDefault(); if (answer.trim()) resolve({ kind: 'answer', text: answer.trim() }) }}>
      <input className="input" aria-label={h.field.label} placeholder={h.field.placeholder} value={answer} onChange={e => setAnswer(e.target.value)} />
      <Btn size="sm" type="submit" disabled={!answer.trim()}>Add</Btn>
    </form>
  )
  else if (h.options?.length) {
    const best = Math.max(0, h.options.findIndex(o => o.recommended))
    const rest = h.options.map((o, i) => ({ o, i })).filter(x => x.i !== best)
    acts = <>
      <Btn size="sm" onClick={() => resolve({ kind: 'option', index: best, option: h.options![best].label })}>{h.options[best].label}</Btn>
      {rest.length > 0 && <Menu align="end" trigger={<Btn size="sm" variant="ghost">Other answers<ChevronDown size={12} /></Btn>} items={rest.map(({ o, i }) => ({ label: o.label, onSelect: () => resolve({ kind: 'option', index: i, option: o.label }) }))} />}
    </>
  }
  else acts = <>
    <Link className="btn sm ghost" to={`/?card=${h.id}`}>Review on Desk</Link>
    <Btn size="sm" onClick={() => resolve({ kind: 'approve' })}><Check size={14} />Approve</Btn>
  </>
  return (
    <li className="pub-need">
      {post ? <Net n={post.network} /> : <Mark agent="atlas" />}
      <div className="pub-need-text">
        {h.ref && g === 'fix'
          ? <button className="pub-need-title" onClick={() => open(h.ref!)}>{h.title}</button>
          : <Link className="pub-need-title" to={`/?card=${h.id}`}>{h.title}</Link>}
        {/* One line of reason, its first sentence; the title opens the whole card (or the failed post). */}
        <p className="pub-need-why">{post && !h.title.includes(post.slot) && <><span className="mono">{post.slot}</span> · </>}{h.context && sentences(h.context)[0]}</p>
      </div>
      <span className="pub-need-acts">{acts}</span>
    </li>
  )
}
