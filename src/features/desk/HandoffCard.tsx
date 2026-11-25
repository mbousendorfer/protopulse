import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, ChevronDown, Clock, MessageSquare, Star, UserRound } from 'lucide-react'
import type { Handoff } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { ago, hhmm } from '../../app/time'
import { Btn, Menu, Thinking } from '../../ui'
import { ClaireNote, PreviewBlock, REJECT_REASONS, SNOOZE, Slip, UrgencyPill, WhyLine, draftText, editable, useHandoffActions } from './parts'

export default function HandoffCard({ h, onDiscuss }: { h: Handoff; onDiscuss: (id: string) => void }) {
  const act = useHandoffActions()
  const { d } = useStore()
  const nav = useNavigate()
  const now = useNow()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [answer, setAnswer] = useState('')
  const [stamp, setStamp] = useState<string | null>(null)

  const settle = (label: string, fn: () => void) => {
    setStamp(`${label} · ${hhmm(act.now())}`)
    setTimeout(fn, 520)
  }

  if (stamp) return <div className="handoff stamped" role="status"><span className="mono">{stamp}</span><span className="faint">{h.title}</span></div>

  const waiting = h.lane === 'claire'
  const isRule = !!h.proposal

  return (
    <article className={`handoff card ${h.fresh ? 'fresh' : ''} ${h.urgency === 'urgent' && !h.lane ? 'urgent' : ''}`} aria-label={h.title} onAnimationEnd={() => h.fresh && d({ type: 'core/unfresh' })}>
      <div className="handoff-top">
        <Slip h={h} />
        <UrgencyPill h={h} />
      </div>
      <h3 className="handoff-title">{h.title}</h3>
      <p className="handoff-ctx">{h.context}</p>

      <ClaireNote h={h} />
      <PreviewBlock h={h} editing={editing} draft={draft} setDraft={setDraft} />
      {isRule && <div className="well preview"><div className="faint t-xs">Proposed rule for {h.proposal!.agents.map(a => a[0].toUpperCase() + a.slice(1)).join(' and ')}</div><p className="strong">“{h.proposal!.text}”</p></div>}
      <WhyLine h={h} />

      {waiting ? (
        <div className="acts row">
          <Thinking label={`Waiting on Claire · asked ${ago(h.claire!.askedAt, now)}`} />
          <span className="spacer" />
          <Btn size="sm" variant="ghost" onClick={() => d({ type: 'core/takeBack', id: h.id })}>Take it back</Btn>
          <Btn size="sm" variant="ghost" onClick={() => onDiscuss(h.id)}><MessageSquare size={14} />Discuss</Btn>
        </div>
      ) : (
        <div className="acts">
          {h.kind === 'promotion' ? (
            <div className="row">
              <Btn variant="primary" onClick={() => settle('Allowed', () => act.approve(h))}>{h.promote!.to === 'act' ? 'Allow' : `Move to ${h.promote!.to === 'draft' ? 'Draft' : 'Suggest'}`}</Btn>
              {h.promote!.to === 'act' && <Btn onClick={() => settle('Trial for a week', () => act.trial(h))}>Try for a week</Btn>}
              <Btn variant="ghost" onClick={() => settle(h.promote!.to === 'act' ? 'Not yet' : 'Kept on Act', () => act.reject(h, h.promote!.to === 'act' ? 'Not yet' : 'Keep on Act'))}>{h.promote!.to === 'act' ? 'Not yet' : 'Keep on Act'}</Btn>
              <span className="spacer" />
              <Btn size="sm" variant="ghost" onClick={() => onDiscuss(h.id)}><MessageSquare size={14} />Discuss</Btn>
            </div>
          ) : h.options ? (
            <>
              <ol className="options">
                {h.options.map((o, i) => (
                  <li key={o.label}>
                    <button className={`choice ${o.recommended ? 'rec' : ''}`} onClick={() => settle(o.label, () => act.option(h, i))}>
                      <span className="kbd">{i + 1}</span><span className="ellipsis">{o.label}</span>{o.recommended && <span className="rec-tag"><Star size={12} aria-hidden />Recommended</span>}<ArrowRight size={16} className="go" aria-hidden />
                    </button>
                  </li>
                ))}
              </ol>
              <Secondary h={h} onDiscuss={onDiscuss} settle={settle} nav={nav} />
            </>
          ) : h.field ? (
            <>
              <form className="row nowrap" onSubmit={e => { e.preventDefault(); if (answer.trim()) settle('Answered', () => act.answer(h, answer.trim())) }}>
                <label className="sr-only" htmlFor={`f-${h.id}`}>{h.field.label}</label>
                <input id={`f-${h.id}`} className="input mw-260" placeholder={h.field.placeholder} value={answer} onChange={e => setAnswer(e.target.value)} />
                <Btn variant="primary" type="submit" disabled={!answer.trim()}>Send to {h.agent[0].toUpperCase() + h.agent.slice(1)}</Btn>
              </form>
              <Secondary h={h} onDiscuss={onDiscuss} settle={settle} nav={nav} />
            </>
          ) : (
            <div className="row">
              {editing ? (
                <>
                  <Btn variant="primary" onClick={() => settle('Approved with your edits', () => act.approve(h, draft))}>Approve edit</Btn>
                  <Btn variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
                </>
              ) : (
                <>
                  <Btn variant="primary" onClick={() => settle(isRule ? 'Rule added' : 'Approved', () => act.approve(h))}>{isRule ? 'Add to Playbook' : 'Approve'}</Btn>
                  {editable(h) && <Btn onClick={() => { setDraft(draftText(h)); setEditing(true) }}>Edit</Btn>}
                </>
              )}
              <Secondary h={h} onDiscuss={onDiscuss} settle={settle} nav={nav} inline />
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function Secondary({ h, onDiscuss, settle, nav, inline }: { h: Handoff; onDiscuss: (id: string) => void; settle: (l: string, fn: () => void) => void; nav: (p: string) => void; inline?: boolean }) {
  const act = useHandoffActions()
  const now = act.now()
  const content = (
    <>
      {h.kind !== 'alert' && !h.options && (
        <Menu trigger={<Btn variant="ghost">Reject<ChevronDown size={14} /></Btn>} align="start"
          items={[{ heading: 'Why?' }, ...REJECT_REASONS.map((r, i) => ({ label: r, hint: `${i + 1}`, onSelect: () => settle(`Rejected · ${r}`, () => act.reject(h, r)) }))]} />
      )}
      {(h.options || h.kind === 'alert') && <Btn variant="ghost" onClick={() => settle('Dismissed', () => act.reject(h, 'Dismissed'))}>Dismiss</Btn>}
      <Menu trigger={<Btn variant="ghost"><Clock size={14} />Snooze</Btn>} align="start"
        items={SNOOZE(now).map(x => ({ label: `Until ${x.label}`, onSelect: () => settle(`Snoozed until ${x.label}`, () => act.snooze(h, x.until, x.label)) }))} />
      <Btn variant="ghost" onClick={() => act.claire(h)}><UserRound size={14} />Ask Claire</Btn>
      <span className="spacer" />
      {h.link && <Btn size="sm" variant="ghost" onClick={() => nav(h.link!)} aria-label="Open in its module"><ArrowUpRight size={14} />Open</Btn>}
      <Btn size="sm" variant="ghost" onClick={() => onDiscuss(h.id)}><MessageSquare size={14} />Discuss{h.thread?.length ? <span className="faint num">{h.thread.length}</span> : null}</Btn>
    </>
  )
  return inline ? content : <div className="row mt-2">{content}</div>
}
