import { ChevronDown, Sparkles } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { Btn, Mark, Menu, Net, Pill } from '../../ui'
import { useOpenPost } from './Bulk'
import { upcoming } from './queues'
import { notesOn } from './notes'
import { STATUS_LABEL } from './labels'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

/** Publishing › Queues: recurring slots Atlas keeps filled two weeks ahead. */
export default function Queues() {
  const { s, d } = useStore()
  useNow(60_000)
  const open = useOpenPost()
  const level = s.agents.find(a => a.id === 'atlas')!.actions.find(x => x.id === 'atlas-fill')?.autonomy
  return (
    <div className="stack">
      <p className="muted">Each queue is one kind of post on recurring slots. Atlas keeps the next two weeks filled{level === 'act' ? ' and schedules them' : ', and asks you to approve what it writes'}.</p>
      {s.publishing.queues.map(q => {
        const slots = upcoming(s, q)
        const empty = slots.filter(x => !x.post).length
        return (
          <section key={q.id} className="card q-card" aria-label={q.name}>
            <div className="card-head">
              <span className="row tight"><Net n={q.network} /><h2>{q.name} <span className="faint">· {NETWORK_LABEL[q.network]} · {q.pillar}</span></h2></span>
              <span className="row tight q-slots">
                {q.slots.map((sl, i) => (
                  <span key={i} className="row tight q-slot">
                    <span className="t-sm muted">Every</span>
                    <Menu align="start" trigger={<button className="select-btn">{WEEKDAYS[sl.weekday]}<ChevronDown size={14} /></button>}
                      items={WEEKDAYS.map((w, k) => ({ label: w, onSelect: () => d({ type: 'publishing/queueSlot', queue: q.id, index: i, weekday: k }) }))} />
                    <span className="t-sm muted">at</span>
                    <input type="time" className="input q-time" aria-label={`${q.name} time`} value={sl.time} onChange={e => e.target.value && d({ type: 'publishing/queueSlot', queue: q.id, index: i, time: e.target.value })} />
                  </span>
                ))}
              </span>
            </div>
            <ul className="rows">
              {slots.map(x => (
                <li key={x.at} className="q-row">
                  <span className="mono q-when">{day(x.at)} · {hhmm(x.at)}</span>
                  {x.post ? (
                    <button className="q-post" onClick={() => open(x.post!.id)}>
                      <span className="ellipsis">{x.post.text}</span>
                      {x.post.status === 'needs' ? <Pill tone="caution">Needs you</Pill> : <Pill>{STATUS_LABEL[x.post.status]}</Pill>}
                      {x.post.author === 'atlas' && <Mark agent="atlas" />}
                    </button>
                  ) : <span className="faint q-post">{notesOn(s.publishing.notes ?? [], x.at).find(n => n.quiet) ? `Quiet day: ${notesOn(s.publishing.notes ?? [], x.at).find(n => n.quiet)!.text}. Atlas leaves it empty.` : 'Empty'}</span>}
                </li>
              ))}
            </ul>
            <div className="q-foot">
              {empty > 0
                ? <Btn onClick={() => d({ type: 'publishing/fillQueue', queue: q.id })}><Sparkles size={14} />Ask Atlas to fill {empty} slot{empty > 1 ? 's' : ''}</Btn>
                : <span className="faint">The next two weeks are filled.</span>}
            </div>
          </section>
        )
      })}
    </div>
  )
}
