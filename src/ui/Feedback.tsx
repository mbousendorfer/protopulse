import type { ReactNode } from 'react'
import { Check, TriangleAlert, Undo2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNow, useStore } from '../app/store'
import type { NoticeScope } from '../app/types'
import { left } from '../app/time'
import { Btn, Pill } from './index'

/**
 * The one confirmation of your own action: a line at the top of the list it acted on, with Undo while it lasts.
 * No toast anywhere: the feedback sits where the action happened.
 */
export function UndoBar({ children, onUndo, until, onDismiss, action, className = '' }: { children: ReactNode; onUndo?: () => void; until?: number; onDismiss?: () => void; action?: ReactNode; className?: string }) {
  const now = useNow(1000)
  if (until && until <= now) return null
  return (
    <div className={`undo-bar ${className}`} role="status">
      <Check size={14} aria-hidden />
      <p>{children}</p>
      {action}
      {onUndo && <Btn size="xs" onClick={onUndo}><Undo2 size={12} />Undo</Btn>}
      {onUndo && until && <span className="left">{left(until, now)}</span>}
      {onDismiss && <Btn size="xs" variant="ghost" icon aria-label="Dismiss" onClick={onDismiss}><X size={12} /></Btn>}
    </div>
  )
}

/** The store's confirmation of your last action, shown only at the top of the list it belongs to. */
export function Notice({ scope, className }: { scope: NoticeScope; className?: string }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const n = s.notice
  if (n?.scope !== scope) return null
  const drop = () => d({ type: 'core/dropNotice' })
  return (
    <UndoBar className={className} until={n.until} onDismiss={drop}
      onUndo={n.undo ? () => d({ type: 'core/undo', id: n.undo! }) : undefined}
      action={n.link && <Btn size="xs" variant="ghost" onClick={() => { nav(n.link!.to); drop() }}>{n.link.label}</Btn>}>
      {n.text}
    </UndoBar>
  )
}

/** Says what can't be taken back (a permanent deletion) before it happens. */
export function InlineConfirm({ children, confirm, onConfirm, onCancel, danger }: { children: ReactNode; confirm: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  return (
    <div className="inline-confirm" role="alertdialog" aria-label={confirm}>
      <TriangleAlert size={14} aria-hidden />
      <p>{children}</p>
      <Btn size="xs" variant="ghost" onClick={onCancel}>Cancel</Btn>
      <Btn size="xs" variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirm}</Btn>
    </div>
  )
}

/** A one-click dismissal that can be taken back: the state, then Undo to bring the buttons back. */
export const Reopen = ({ label = 'Dismissed', onUndo }: { label?: string; onUndo: () => void }) => (
  <span className="row tight nowrap"><Pill>{label}</Pill><button type="button" className="link-btn t-sm" onClick={onUndo}>Undo</button></span>
)

/** A number in a chip. Tinted only when it means "needs you". */
export const CountBadge = ({ n, needs, label }: { n: number; needs?: boolean; label?: string }) => (
  <span className={`count-badge ${needs ? 'needs' : ''}`} aria-label={label}>{n}</span>
)
