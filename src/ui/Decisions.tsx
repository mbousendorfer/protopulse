import { Children, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { CountBadge } from './Feedback'
import './decisions.css'

/**
 * Decisions first (PROMPT §3.9, consistency matrix §12). A landing view opens on this block:
 * a summary line that names each count (each count filters the block), then one group per gesture,
 * one row per decision with its quick decision on the row. Empty: one line and what the agents watch.
 *
 * <DecisionBlock counts={[{ value: 'autonomy', n: 1, label: '1 autonomy request' }]} filter={f} onFilter={setF} empty={…}>
 *   {f !== 'rules' && <DecisionGroup title="Autonomy requests" icon={<ShieldCheck />} n={1} hint="Shared reason, said once">
 *     <DecisionRow lead={<Mark agent="nova" />} title="…" line="…" acts={<Btn size="sm">Allow</Btn>} />
 *   </DecisionGroup>}
 * </DecisionBlock>
 */
export function DecisionBlock<T extends string>({ title = 'Needs you', counts, filter, onFilter, feedback, empty, children }: {
  title?: string
  counts: { value: T; n: number; label: string }[]
  filter: T | 'all'
  onFilter: (v: T | 'all') => void
  /** The UndoBar of the last decision taken here. */
  feedback?: ReactNode
  /** Shown when every count is zero: “Nothing needs you here” and what the agents watch. */
  empty: ReactNode
  children: ReactNode
}) {
  const shown = counts.filter(c => c.n > 0)
  return (
    <section className="card decisions" aria-label={title}>
      <header className="dec-head">
        <h2>{title}</h2>
        {shown.length > 0 && (
          <p className="dec-summary" role="group" aria-label="Show only">
            {shown.map((c, i) => (
              <span key={c.value} className="dec-item">
                <button type="button" className="dec-count" aria-pressed={filter === c.value} onClick={() => onFilter(filter === c.value ? 'all' : c.value)}>{c.label}</button>
                {i < shown.length - 1 && <span className="dec-sep" aria-hidden>·</span>}
              </span>
            ))}
            {filter !== 'all' && <button type="button" className="link-btn dec-all" onClick={() => onFilter('all')}>Show all</button>}
          </p>
        )}
      </header>
      {feedback}
      {shown.length ? children : <div className="dec-empty">{empty}</div>}
    </section>
  )
}

/** One kind of gesture. `hint` is the reason the rows share, said once. `action`: the group's one primary action. */
export function DecisionGroup({ title, icon, n, hint, action, limit = 3, children }: {
  title: string; icon: ReactNode; n: number; hint?: ReactNode; action?: ReactNode; limit?: number; children: ReactNode
}) {
  const [all, setAll] = useState(false)
  const rows = Children.toArray(children)
  if (!rows.length) return null
  const shown = all ? rows : rows.slice(0, limit)
  return (
    <section className="dec-group" aria-label={title}>
      <header className="dec-group-head">
        <span className="dec-icon" aria-hidden>{icon}</span>
        <h3>{title}</h3>
        <CountBadge n={n} needs label={`${n} need you`} />
        {hint && <span className="dec-hint">{hint}</span>}
        {action && <span className="dec-action">{action}</span>}
      </header>
      <ul>{shown}</ul>
      {rows.length > limit && (
        <button type="button" className="dec-more" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? 'Show less' : `Show ${rows.length - limit} more`}<ChevronDown size={14} aria-hidden />
        </button>
      )}
    </section>
  )
}

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
