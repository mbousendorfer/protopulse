import { useRef, useState, type ReactNode } from 'react'
import { Pop, Sheet } from './index'

/**
 * Text levels (PROMPT §10, matrix §13): what isn't needed to understand or decide leaves the screen and stays one click away.
 * `MoreInfo`: a link at the end of the visible line opens a side panel with the full reasoning, proof, rule or history.
 * `InfoPop`: a link opens a small popover with a definition, a source or the breakdown of a number.
 */
export function MoreInfo({ label = 'More info', title, children, footer }: { label?: ReactNode; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  // The Sheet is controlled, so focus goes back to the link by hand when it closes.
  const change = (o: boolean) => { setOpen(o); if (!o) setTimeout(() => trigger.current?.focus()) }
  return (
    <>
      <button ref={trigger} type="button" className="link-btn t-sm" aria-haspopup="dialog" onClick={e => { e.stopPropagation(); setOpen(true) }}>{label}</button>
      <Sheet open={open} onOpenChange={change} title={title} footer={footer}>{children}</Sheet>
    </>
  )
}

export function InfoPop({ label, children, align = 'start' }: { label: ReactNode; children: ReactNode; align?: 'start' | 'end' | 'center' }) {
  return (
    <Pop align={align} trigger={<button type="button" className="link-btn t-sm" onClick={e => e.stopPropagation()}>{label}</button>}>
      <div className="t-sm">{children}</div>
    </Pop>
  )
}
