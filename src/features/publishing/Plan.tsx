import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, Minus, Plus, RefreshCw } from 'lucide-react'
import type { Network } from '../../app/types'
import { useStore } from '../../app/store'
import { DAY } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { CADENCE, PILLARS, type PlanItem } from '../../data/publishing'
import { Btn, Empty, Mark, Modal, Net, Pill, Thinking } from '../../ui'
import { HBars } from '../../ui/charts'
import Photo from '../../ui/Photo'
import { PLAN_MONDAY } from './slice'

const TAG_TONE = { Campaign: 'signal', Trend: 'caution', Recycled: undefined, New: undefined } as const

export default function PlanReview() {
  const { s, d } = useStore()
  const plan = s.publishing.plan
  const [asking, setAsking] = useState(false)
  const [note, setNote] = useState('')
  const [thinking, setThinking] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const included = plan.items.filter(i => i.included)
  const nets = Object.keys(CADENCE) as Network[]
  const count = (n: Network, items: PlanItem[]) => items.filter(i => i.network === n).length
  const warnings = [
    ...nets.filter(n => count(n, included) < (CADENCE[n] ?? 0)).map(n => `${NETWORK_LABEL[n]} drops below Sage’s cadence: ${count(n, included)} of ${CADENCE[n]} posts`),
    ...PILLARS.filter(p => plan.items.some(i => i.pillar === p) && !included.some(i => i.pillar === p)).map(p => `No “${p}” post left this week`),
    ...(plan.items.some(i => i.tag === 'Campaign' && !i.included) ? [`Trail Week loses ${plan.items.filter(i => i.tag === 'Campaign' && !i.included).length} campaign post(s)`] : []),
  ]

  const request = () => {
    if (!note.trim()) return
    setThinking(true)
    setTimeout(() => { d({ type: 'publishing/planRequest', text: note.trim() }); setThinking(false); setAsking(false); setNote('') }, 1400)
  }

  if (plan.status === 'approved') return (
    <Empty icon={<Check size={18} />} title="Next week’s plan is approved" body={`${included.length} posts are scheduled for the week of 1 December. Atlas will tell you if a slot needs changing.`}
      action={<Link to="/publishing" className="btn">Open the calendar</Link>} />
  )
  if (plan.status === 'rejected') return (
    <Empty icon={<AlertTriangle size={18} />} title="You rejected next week’s plan" body="Atlas will propose posts one by one on your Desk instead, or can start a new plan now."
      action={<Btn variant="primary" onClick={() => d({ type: 'publishing/planReset' })}><RefreshCw size={14} />Ask Atlas for a new plan</Btn>} />
  )

  return (
    <div className="plan">
      <section className="card pad-lg plan-head">
        <div className="row between top">
          <div>
            <div className="row tight"><Mark agent="atlas" /><span className="mono faint">Atlas · plan v{plan.version} · built with Echo and Sage</span></div>
            <h2>Week of 1 December · Trail Week</h2>
            <p className="muted">{plan.items.length} posts on {new Set(plan.items.map(i => i.network)).size} networks. Uncheck what you don’t want, then approve the week in one go.</p>
          </div>
          <Pill tone="caution">Waiting for you</Pill>
        </div>
        <div className="plan-stats">
          <div>
            <div className="section-title">Cadence <span className="faint">· included vs Sage’s target</span></div>
            <ul className="cadence">
              {nets.map(n => {
                const c = count(n, included), t = CADENCE[n] ?? 0
                return <li key={n} className={c < t ? 'under' : ''}><Net n={n} /><span>{NETWORK_LABEL[n]}</span><b className="num">{c} of {t}</b>{c >= t ? <Check size={13} /> : <AlertTriangle size={13} />}</li>
              })}
            </ul>
          </div>
          <div>
            <div className="section-title">Pillars <span className="faint">· posts included</span></div>
            <HBars items={PILLARS.map(p => ({ label: p, value: included.filter(i => i.pillar === p).length }))} format={v => `${v} post${v === 1 ? '' : 's'}`} />
          </div>
          <div>
            <div className="section-title">Mix</div>
            <ul className="mix">{(['Campaign', 'Recycled', 'Trend', 'New'] as const).map(t => <li key={t}><span>{t}</span><b className="num">{included.filter(i => i.tag === t).length}</b></li>)}</ul>
          </div>
        </div>
        {warnings.length > 0 && (
          <div className="plan-warn" role="status">
            <b>What changes if you approve now</b>
            <ul>{warnings.map(w => <li key={w}><AlertTriangle size={13} />{w}</li>)}</ul>
          </div>
        )}
        {plan.diff && (
          <div className="plan-diff">
            <b>What changed in v{plan.version}</b>{plan.request && <span className="faint"> · after your note “{plan.request}”</span>}
            <ul>
              {plan.diff.added.map(x => <li key={`a${x}`} className="add"><Plus size={13} />{x}</li>)}
              {plan.diff.removed.map(x => <li key={`r${x}`} className="rem"><Minus size={13} />{x}</li>)}
              {plan.diff.changed.map(x => <li key={`c${x}`} className="chg"><RefreshCw size={13} />{x}</li>)}
              {!plan.diff.added.length && !plan.diff.removed.length && !plan.diff.changed.length && <li className="faint">Nothing to change: the plan already matched your note.</li>}
            </ul>
          </div>
        )}
      </section>

      <div className="plan-week">
        {Array.from({ length: 7 }, (_, day) => {
          const items = plan.items.filter(i => i.day === day).sort((a, b) => a.time.localeCompare(b.time))
          return (
            <section key={day} className="plan-day" aria-label={new Date(PLAN_MONDAY + day * DAY).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}>
              <h3>{new Date(PLAN_MONDAY + day * DAY).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</h3>
              {items.map(i => (
                <label key={i.id} className={`plan-item ${i.included ? '' : 'out'}`}>
                  <div className="row nowrap tight">
                    <input type="checkbox" className="check" checked={i.included} onChange={() => d({ type: 'publishing/planToggle', id: i.id })} aria-label={`Include: ${i.text}`} />
                    <span className="mono">{i.time}</span><Net n={i.network} />
                    <span className="spacer" />
                    <Pill tone={TAG_TONE[i.tag]}>{i.tag}</Pill>
                  </div>
                  {i.media && <span className="plan-photo"><Photo name={i.media} /></span>}
                  <p>{i.text}</p>
                  <span className="faint plan-reason">{i.reason}</span>
                </label>
              ))}
              {!items.length && <div className="aempty">No post</div>}
            </section>
          )
        })}
      </div>

      <div className="plan-foot card">
        {asking ? (
          thinking ? <Thinking label="Atlas is reworking the plan" /> : (
            <form className="row nowrap grow" onSubmit={e => { e.preventDefault(); request() }}>
              <label htmlFor="plan-note" className="sr-only">What should Atlas change?</label>
              <input id="plan-note" className="input" autoFocus placeholder="Shorter TikTok hooks, and swap the recycled posts I unchecked" value={note} onChange={e => setNote(e.target.value)} />
              <Btn type="submit" variant="primary" disabled={!note.trim()}>Send to Atlas</Btn>
              <Btn variant="ghost" onClick={() => setAsking(false)}>Cancel</Btn>
            </form>
          )
        ) : (
          <>
            <span className="muted">{included.length} of {plan.items.length} posts selected</span>
            <span className="spacer" />
            <Btn variant="ghost" className="danger" onClick={() => setConfirmReject(true)}>Reject</Btn>
            <Btn onClick={() => setAsking(true)}>Request changes</Btn>
            <Btn variant="primary" disabled={!included.length} onClick={() => d({ type: 'publishing/planApprove' })}>Approve plan ({included.length} of {plan.items.length})</Btn>
          </>
        )}
      </div>

      <Modal open={confirmReject} onOpenChange={setConfirmReject} title="Reject the whole plan?"
        footer={<><span className="spacer" /><Btn variant="ghost" onClick={() => setConfirmReject(false)}>Keep it</Btn><Btn variant="primary" onClick={() => { d({ type: 'publishing/planReject' }); setConfirmReject(false) }}>Reject the plan</Btn></>}>
        <p className="muted">Nothing gets scheduled for the week of 1 December. Atlas will propose posts one by one on your Desk instead. You can ask for a new plan at any time.</p>
      </Modal>
    </div>
  )
}
