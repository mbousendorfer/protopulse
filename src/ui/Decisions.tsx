import type { ReactNode } from 'react'
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
