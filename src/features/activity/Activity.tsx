import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, Redo2, Undo2 } from 'lucide-react'
import type { AgentId, LogEntry, LogStatus } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { dayLabel, hhmm, left } from '../../app/time'
import { AGENTS, agentName } from '../../data/agents'
import { Btn, Empty, Filters, Mark, Menu, Pill } from '../../ui'
import './activity.css'

const STATUS: Record<LogStatus, { label: string; tone?: 'ok' | 'caution' | 'alert' }> = {
  done: { label: 'Done' }, approved: { label: 'Approved by you', tone: 'ok' }, edited: { label: 'Edited by you' },
  rejected: { label: 'Rejected', tone: 'alert' }, undone: { label: 'Undone', tone: 'caution' }, redone: { label: 'Redone' }, dismissed: { label: 'Dismissed' },
}

type StatusFilter = 'all' | 'undo' | 'alone' | 'you' | 'undone'
const FILTER_LABEL: Record<StatusFilter, string> = { all: 'Everything', undo: 'Can undo', alone: 'Done alone', you: 'Your decisions', undone: 'Undone' }
const FILTERS = Object.keys(FILTER_LABEL) as StatusFilter[]

/** Which state filter an entry falls in. */
export function inFilter(l: LogEntry, f: StatusFilter, now: number) {
  if (f === 'all') return true
  if (f === 'undo') return !!l.undoUntil && l.undoUntil > now && l.status !== 'undone'
  if (f === 'alone') return l.status === 'done' || l.status === 'redone'
  if (f === 'you') return ['approved', 'edited', 'rejected', 'dismissed'].includes(l.status)
  return l.status === 'undone'
}

/** A day shows its latest entries; the rest wait behind “Show N more”, like the Inbox groups. */
export const DAY_CAP = 8
export const visibleRows = <T,>(rows: T[], open: boolean) => (open || rows.length <= DAY_CAP + 2 ? rows : rows.slice(0, DAY_CAP))

/** Agents › Activity: the journal of every agent action (PROMPT §6.8). State filters with counts, the agent in a menu. */
export default function Activity() {
  const { s, d } = useStore()
  const now = useNow(10000)
  const [params, setParams] = useSearchParams()
  const qa = params.get('agent') as AgentId
  const agent: 'all' | AgentId = AGENTS.some(a => a.id === qa) ? qa : 'all'
  const qs = params.get('status') as StatusFilter
  const status: StatusFilter = FILTERS.includes(qs) ? qs : 'all'
  const set = (k: string, v: string) => { const next = new URLSearchParams(params); if (v === 'all') next.delete(k); else next.set(k, v); setParams(next, { replace: true }) }
  const [open, setOpen] = useState<string | null>(null)
  const [full, setFull] = useState<string[]>([])

  const canUndo = (l: LogEntry) => inFilter(l, 'undo', now)
  const mine = s.log.filter(l => agent === 'all' || l.agent === agent)
  const counts = Object.fromEntries(FILTERS.map(f => [f, mine.filter(l => inFilter(l, f, now)).length])) as Record<StatusFilter, number>
  const items = mine.filter(l => inFilter(l, status, now)).sort((a, b) => b.at - a.at)

  const groups = useMemo(() => {
    const m = new Map<string, LogEntry[]>()
    for (const l of items) { const k = dayLabel(l.at, now); m.set(k, [...(m.get(k) ?? []), l]) }
    return [...m.entries()]
  }, [items, now])

  return (
    <div>
      <div className="act-filters">
        <Filters label="Show" value={status} onChange={v => set('status', v)}
          items={FILTERS.filter(f => f === 'all' || f === status || counts[f] > 0).map(f => ({ value: f, label: FILTER_LABEL[f], count: f === 'all' ? undefined : counts[f] }))} />
        <Menu align="end" trigger={<Btn size="sm" variant="ghost">{agent !== 'all' && <Mark agent={agent} />}{agent === 'all' ? 'All agents' : agentName(agent)}<ChevronDown size={12} /></Btn>}
          items={[{ label: 'All agents', onSelect: () => set('agent', 'all') }, ...AGENTS.map(a => ({ label: a.name, icon: <Mark agent={a.id} />, hint: a.dept, onSelect: () => set('agent', a.id) }))]} />
      </div>

      {!items.length && <Empty title="Nothing matches" action={<Btn onClick={() => setParams({}, { replace: true })}>Clear filters</Btn>} />}

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
