import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Check, MessageSquare } from 'lucide-react'
import type { Handoff } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { ago } from '../../app/time'
import { agentName } from '../../data/agents'
import { Btn, Kbd, Pill, Thinking } from '../../ui'
import { ClaireNote, PreviewBlock, REJECT_REASONS, SNOOZE, Slip, Sources, UrgencyPill, WhyLine, WontGuess, draftText, editable, useHandoffActions } from './parts'
import { useDecisionKeys, type Mode, type Outcome } from './keys'

/**
 * One Desk card, full width, driven by the keyboard. Used by the Desk detail pane and by Focus.
 * `onSettled` fires once the decision is applied, so the caller can move to the next item.
 */
export default function Detail({ h, position, keys = true, onSettled, onDiscuss, big }: {
  h: Handoff
  position?: string
  keys?: boolean
  onSettled?: (outcome: Outcome, ms: number) => void
  onDiscuss?: (id: string) => void
  big?: boolean
}) {
  const act = useHandoffActions()
  const { d } = useStore()
  const nav = useNavigate()
  const now = useNow()
  const [mode, setMode] = useState<Mode>('idle')
  const [draft, setDraft] = useState('')
  const [answer, setAnswer] = useState('')
  const [stamp, setStamp] = useState<string | null>(null)
  const started = useRef(Date.now())

  useEffect(() => { started.current = Date.now(); setMode('idle'); setStamp(null); setAnswer('') }, [h.id])

  const finish = useCallback((outcome: Outcome, label: string, fn: () => void) => {
    const ms = Date.now() - started.current
    d({ type: 'core/track', kind: big ? 'focus/decision' : 'desk/decision', detail: { id: h.id, outcome, ms } })
    setStamp(label)
    setTimeout(() => { fn(); onSettled?.(outcome, ms) }, 280)
  }, [d, h.id, onSettled, big])

  const startEdit = useCallback(() => { setDraft(draftText(h)); setMode('edit') }, [h])
  const waiting = h.lane === 'claire'
  useDecisionKeys({ h, enabled: keys && !waiting && !stamp, mode, setMode, draft, startEdit, finish })

  const hasFlags = h.preview && (h.preview.type === 'reply' ? h.preview.draft : h.preview.type === 'post' ? h.preview.text : []).some(x => typeof x !== 'string')

  return (
    <article className={`detail ${big ? 'big' : ''} ${stamp ? 'leaving' : ''}`} aria-label={h.title}>
      {stamp && <div className="detail-stamp" role="status"><Check size={16} />{stamp}</div>}
      <div className="handoff-top"><Slip h={h} /><span className="row tight">{position && <span className="mono faint">{position}</span>}<UrgencyPill h={h} /></span></div>
      <h2 className="detail-title">{h.title}</h2>
      <p className="handoff-ctx">{h.context}</p>
      <ClaireNote h={h} />
      <PreviewBlock h={h} editing={mode === 'edit'} draft={draft} setDraft={setDraft} />
      {h.proposal && <div className="well preview"><div className="faint" style={{ fontSize: 12 }}>Proposed rule</div><p style={{ fontWeight: 500 }}>“{h.proposal.text}”</p></div>}
      <Sources h={h} />
      <WhyLine h={h} />
      <WontGuess h={h} />
      {hasFlags && keys && <p className="faint flags-hint">Marked passages are where {agentName(h.agent)} is unsure. Hover them, or press <Kbd>Tab</Kbd> to reach each note.</p>}

      <div className="detail-acts">
        {waiting ? (
          <Thinking label={`Waiting on Claire · asked ${ago(h.claire!.askedAt, now)}`} />
        ) : mode === 'edit' ? (
          <div className="row">
            <Btn variant="primary" onClick={() => finish('edited', 'Approved with your edits', () => act.approve(h, draft))} kbd="⌘↵">Approve edit</Btn>
            <Btn variant="ghost" onClick={() => setMode('idle')} kbd="Esc">Cancel</Btn>
          </div>
        ) : mode === 'reject' ? (
          <div className="row">
            <span className="faint">Why?</span>
            {REJECT_REASONS.map((r, i) => <Btn key={r} onClick={() => finish('rejected', `Rejected · ${r}`, () => act.reject(h, r))} kbd={`${i + 1}`}>{r}</Btn>)}
            <Btn variant="ghost" onClick={() => setMode('idle')} kbd="Esc">Back</Btn>
          </div>
        ) : mode === 'snooze' ? (
          <div className="row">
            <span className="faint">Until</span>
            {SNOOZE(act.now()).map((o, i) => <Btn key={o.label} onClick={() => finish('snoozed', `Snoozed until ${o.label}`, () => act.snooze(h, o.until, o.label))} kbd={`${i + 1}`}>{o.label}</Btn>)}
            <Btn variant="ghost" onClick={() => setMode('idle')} kbd="Esc">Back</Btn>
          </div>
        ) : h.kind === 'news' ? (
          <div className="row">
            <Btn variant="primary" kbd="A" onClick={() => finish('approved', h.cta?.label ?? 'Done', () => { act.approve(h); if (h.cta?.to) nav(h.cta.to) })}>{h.cta?.label ?? 'Got it'}</Btn>
            <Btn variant="ghost" kbd="R" onClick={() => finish('rejected', 'Noted', () => act.reject(h, 'Noted'))}>Noted</Btn>
          </div>
        ) : h.kind === 'promotion' ? (
          <div className="row">
            <Btn variant="primary" onClick={() => finish('approved', 'Allowed', () => act.approve(h))} kbd="A">{h.promote?.to === 'act' ? 'Allow' : 'OK'}</Btn>
            {h.promote?.to === 'act' && <Btn onClick={() => finish('approved', 'Trial for a week', () => act.trial(h))} kbd="T">Try for a week</Btn>}
            <Btn variant="ghost" onClick={() => finish('rejected', 'Not yet', () => act.reject(h, 'Not yet'))} kbd="N">{h.promote?.to === 'act' ? 'Not yet' : 'Keep on Act'}</Btn>
          </div>
        ) : h.options ? (
          <ol className="options">
            {h.options.map((o, i) => (
              <li key={o.label}><button className={`option ${o.recommended ? 'rec' : ''}`} onClick={() => finish('decided', o.label, () => act.option(h, i))}>
                <span className="kbd">{i + 1}</span><span className="ellipsis">{o.label}</span>{o.recommended && <Pill tone="signal">Recommended · A</Pill>}
              </button></li>
            ))}
          </ol>
        ) : h.field ? (
          <form className="row nowrap" onSubmit={e => { e.preventDefault(); if (answer.trim()) finish('decided', 'Answered', () => act.answer(h, answer.trim())) }}>
            <label className="sr-only" htmlFor={`ans-${h.id}`}>{h.field.label}</label>
            <input id={`ans-${h.id}`} className="input" placeholder={h.field.placeholder} value={answer} onChange={e => setAnswer(e.target.value)} style={{ maxWidth: 260 }} />
            <Btn variant="primary" type="submit" disabled={!answer.trim()} kbd="↵">Send to {agentName(h.agent)}</Btn>
          </form>
        ) : (
          <div className="row">
            <Btn variant="primary" onClick={() => finish('approved', h.proposal ? 'Rule added' : 'Approved', () => act.approve(h))} kbd="A">{h.proposal ? 'Add to Playbook' : h.preview?.type === 'reply' ? 'Approve and send' : h.preview?.type === 'post' ? 'Approve and schedule' : 'Approve'}</Btn>
            {editable(h) && <Btn onClick={startEdit} kbd="E">Edit</Btn>}
            <Btn variant="ghost" onClick={() => setMode('reject')} kbd="R">Reject</Btn>
          </div>
        )}
      </div>

      <footer className="detail-foot">
        <span className="faint">{h.kind === 'news' ? 'Nothing to approve here.' : 'Nothing goes out until you confirm.'}</span>
        <span className="spacer" />
        {!waiting && h.kind !== 'news' && mode === 'idle' && <>
          <Btn size="sm" variant="ghost" onClick={() => setMode('snooze')} kbd="S">Snooze</Btn>
          <Btn size="sm" variant="ghost" onClick={() => finish('claire', 'Sent to Claire', () => act.claire(h))} kbd="C">Ask Claire</Btn>
        </>}
        {h.link && <Btn size="sm" variant="ghost" onClick={() => nav(h.link!)}><ArrowUpRight size={14} />Open</Btn>}
        {onDiscuss && <Btn size="sm" variant="ghost" onClick={() => onDiscuss(h.id)}><MessageSquare size={14} />Discuss{h.thread?.length ? <span className="faint num">{h.thread.length}</span> : null}</Btn>}
      </footer>
    </article>
  )
}
