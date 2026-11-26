// Desk preview of a two-version test: both openings side by side, with their slot.
import { Net } from '../../ui'
import Photo from '../../ui/Photo'
import { NETWORK_LABEL } from '../../data/agents'
import type { PreviewOf } from '../../app/types'

export function PairPreview({ p }: { p: PreviewOf<'pair'> }) {
  return (
    <div className="well preview">
      <div className="by row tight"><Net n={p.network} /><span className="agent-label">Atlas’s two versions</span><span className="faint">· {NETWORK_LABEL[p.network]} · same photo, same hour</span></div>
      <ol className="pair-rows">
        {p.rows.map(r => (
          <li key={r.label} className="post-prev">
            <span className="post-photo post-thumb"><Photo name="pack" /></span>
            <div><div className="row tight"><b>{r.label}</b><span className="faint">{r.slot}</span></div><p>{r.text}</p></div>
          </li>
        ))}
      </ol>
    </div>
  )
}
