import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, Redo2, Undo2 } from 'lucide-react'
import type { AgentId, LogEntry, LogStatus } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { dayLabel, hhmm, left } from '../../app/time'
import { AGENTS } from '../../data/agents'
import { Btn, Empty, Filters, Mark, PageHead, Pill, Switch } from '../../ui'
import './activity.css'

const STATUS: Record<LogStatus, { label: string; tone?: 'ok' | 'caution' | 'alert' }> = {
  done: { label: 'Done' }, approved: { label: 'Approved by you', tone: 'ok' }, edited: { label: 'Edited by you' },
  rejected: { label: 'Rejected', tone: 'alert' }, undone: { label: 'Undone', tone: 'caution' }, redone: { label: 'Redone' }, dismissed: { label: 'Dismissed' },
}

type StatusFilter = 'all' | 'alone' | 'you' | 'undone'

/** A day shows its latest entries; the rest wait behind “Show N more”, like the Inbox groups. */
export const DAY_CAP = 12
export const visibleRows = <T,>(rows: T[], open: boolean) => (open || rows.length <= DAY_CAP + 2 ? rows : rows.slice(0, DAY_CAP))

export default function Activity() {
  const { s, d } = useStore()
  const now = useNow(10000)
  const [params] = useSearchParams()
  const [agent, setAgent] = useState<'all' | AgentId>((params.get('agent') as AgentId) || 'all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [reversible, setReversible] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [full, setFull] = useState<string[]>([])

  const canUndo = (l: LogEntry) => !!l.undoUntil && l.undoUntil > now && l.status !== 'undone'
  const items = s.log.filter(l =>
    (agent === 'all' || l.agent === agent) &&
    (status === 'all' || (status === 'alone' && (l.status === 'done' || l.status === 'redone')) || (status === 'you' && ['approved', 'edited', 'rejected', 'dismissed'].includes(l.status)) || (status === 'undone' && l.status === 'undone')) &&
    (!reversible || canUndo(l)),
  ).sort((a, b) => b.at - a.at)

  const groups = useMemo(() => {
    const m = new Map<string, LogEntry[]>()
    for (const l of items) { const k = dayLabel(l.at, now); m.set(k, [...(m.get(k) ?? []), l]) }
    return [...m.entries()]
  }, [items, now])

  return (
    <div className="page narrow">
      <PageHead title="Activity" lede="Everything your agents did, why, and the rule they applied. Undo anything still reversible." />
      <div className="act-filters">
        <Filters label="Agent" value={agent} onChange={setAgent} items={[{ value: 'all', label: 'All agents' }, ...AGENTS.map(a => ({ value: a.id as AgentId, label: <><Mark agent={a.id} />{a.name}</> }))]} />
        <div className="row">
          <Filters label="Status" value={status} onChange={setStatus} items={[
            { value: 'all', label: 'Everything' }, { value: 'alone', label: 'Done alone' }, { value: 'you', label: 'Your decisions' }, { value: 'undone', label: 'Undone' },
          ]} />
          <span className="spacer" />
          <Switch checked={reversible} onChange={setReversible} label="Reversible only" />
        </div>
      </div>

      {!items.length && <Empty title="Nothing matches" body="Try another agent or status." action={<Btn onClick={() => { setAgent('all'); setStatus('all'); setReversible(false) }}>Clear filters</Btn>} />}

      {groups.map(([day, rows]) => (
        <section key={day} className="act-day">
          <h2>{day} <span className="faint num">{rows.length}</span></h2>
          <ul className="card ledger">
            {visibleRows(rows, full.includes(day)).map(l => {
              const isOpen = open === l.id
              const st = STATUS[l.status]
              return (
                <li key={l.id} className={`${l.status === 'undone' ? 'undone' : ''}`}>
                  <div className="lrow">
                    <span className="mono faint">{hhmm(l.at)}</span>
                    <Mark agent={l.agent} size="md" />
                    <button className="ltext" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : l.id)}>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>{l.text}</span>
                    </button>
                    {/* Done is what agents do all day: only what differs (your decisions, undos) gets a status. */}
                    {l.status === 'done' ? <span aria-hidden /> : <Pill tone={st.tone}>{st.label}</Pill>}
                    <span className="lact">
                      {canUndo(l) && <Btn size="xs" onClick={() => d({ type: 'core/undo', id: l.id })}><Undo2 size={12} />Undo · {left(l.undoUntil!, now)}</Btn>}
                      {l.status === 'undone' && <Btn size="xs" variant="ghost" onClick={() => d({ type: 'core/redo', id: l.id })}><Redo2 size={12} />Redo</Btn>}
                    </span>
                  </div>
                  {isOpen && (
                    <div className="ldetail">
                      {l.reason && <p><span className="faint">Why:</span> {l.reason}</p>}
                      {l.rule && <p><span className="faint">Playbook rule:</span> <span className="chip">{l.rule}</span></p>}
                      {l.detail && <div className="beforeafter"><div><span className="faint">Before</span><p>{l.detail.before}</p></div><div><span className="faint">After</span><p>{l.detail.after}</p></div></div>}
                      <p className="faint">{l.undoUntil ? (canUndo(l) ? `Reversible for ${left(l.undoUntil, now)}.` : 'The undo window has closed.') : 'This action can’t be undone.'}</p>
                      {l.link && <Link to={l.link} className="btn sm">Open</Link>}
                    </div>
                  )}
                </li>
              )
            })}
            {visibleRows(rows, full.includes(day)).length < rows.length && (
              <li className="act-more"><Btn size="sm" variant="ghost" onClick={() => setFull(f => [...f, day])}>Show {rows.length - DAY_CAP} more</Btn></li>
            )}
          </ul>
        </section>
      ))}
    </div>
  )
}
