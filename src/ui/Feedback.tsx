import type { ReactNode } from 'react'
import { Check, TriangleAlert, Undo2, X } from 'lucide-react'
import { useNow } from '../app/store'
import { left } from '../app/time'
import { Btn } from './index'

/**
 * The one confirmation of your own action: a line at the top of the list it acted on, with Undo while it lasts.
 * No toast anywhere: the feedback sits where the action happened.
 */
export function UndoBar({ children, onUndo, until, onDismiss, className = '' }: { children: ReactNode; onUndo?: () => void; until?: number; onDismiss?: () => void; className?: string }) {
  const now = useNow(1000)
  if (until && until <= now) return null
  return (
    <div className={`undo-bar ${className}`} role="status">
      <Check size={14} aria-hidden />
      <p>{children}</p>
      {onUndo && <Btn size="xs" onClick={onUndo}><Undo2 size={12} />Undo</Btn>}
      {onUndo && until && <span className="left">{left(until, now)}</span>}
      {onDismiss && <Btn size="xs" variant="ghost" icon aria-label="Dismiss" onClick={onDismiss}><X size={12} /></Btn>}
    </div>
  )
}

/** Says what can't be taken back (paid spend, permanent deletion) before it happens. */
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

/** A number in a chip. Tinted only when it means "needs you". */
export const CountBadge = ({ n, needs, label }: { n: number; needs?: boolean; label?: string }) => (
  <span className={`count-badge ${needs ? 'needs' : ''}`} aria-label={label}>{n}</span>
)
