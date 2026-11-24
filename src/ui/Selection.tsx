import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Btn } from './index'

/**
 * Multi-select for any list. Shift-click selects a range, X toggles the focused row, Esc clears.
 * The selection drops ids that leave the list, and resets when `resetKey` changes (view, filters).
 */
export function useSelection(ids: string[], resetKey?: string) {
  const [sel, setSel] = useState<Set<string>>(new Set())
  const anchor = useRef<string | null>(null)
  useEffect(() => { setSel(new Set()); anchor.current = null }, [resetKey])
  useEffect(() => { setSel(prev => { const keep = new Set([...prev].filter(id => ids.includes(id))); return keep.size === prev.size ? prev : keep }) }, [ids])

  const toggle = useCallback((id: string, shift?: boolean) => {
    setSel(prev => {
      const next = new Set(prev)
      if (shift && anchor.current && ids.includes(anchor.current)) {
        const [a, b] = [ids.indexOf(anchor.current), ids.indexOf(id)].sort((x, y) => x - y)
        ids.slice(a, b + 1).forEach(x => next.add(x))
      } else if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    anchor.current = id
  }, [ids])

  const all = ids.length > 0 && ids.every(id => sel.has(id))
  const api = useMemo(() => ({
    selected: sel,
    count: sel.size,
    has: (id: string) => sel.has(id),
    toggle,
    toggleAll: () => setSel(all ? new Set() : new Set(ids)),
    all,
    some: sel.size > 0 && !all,
    clear: () => setSel(new Set()),
    set: (xs: string[]) => setSel(new Set(xs)),
  }), [sel, toggle, all, ids])

  useEffect(() => {
    if (!sel.size) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !(e.target instanceof Element && e.target.closest('[role="dialog"]'))) setSel(new Set()) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel.size])
  return api
}

export type Selection = ReturnType<typeof useSelection>

/** A row checkbox: visible on hover, always visible once anything is selected. */
export function SelectBox({ checked, onToggle, label, visible }: { checked: boolean; onToggle: (shift: boolean) => void; label: string; visible?: boolean }) {
  return (
    <label className={`select-box ${checked || visible ? 'on' : ''}`} onClick={e => e.stopPropagation()}>
      <input type="checkbox" className="check" checked={checked} aria-label={label}
        onChange={() => undefined} onClick={e => { e.stopPropagation(); onToggle(e.shiftKey) }} />
    </label>
  )
}

/** "Select all" for a list header, with the mixed state. */
export function SelectAll({ sel, label = 'Select all' }: { sel: Selection; label?: string }) {
  return (
    <label className="select-box on" title={label}>
      <input type="checkbox" className="check" aria-label={label} checked={sel.all} ref={el => { if (el) el.indeterminate = sel.some }} onChange={sel.toggleAll} />
    </label>
  )
}

export type BulkAction = { label: ReactNode; onRun: () => void; primary?: boolean; note?: string; disabled?: boolean; icon?: ReactNode }

/** Floating bar at the bottom of a list while something is selected. */
export function BulkBar({ count, noun = 'selected', actions, onClear }: { count: number; noun?: string; actions: BulkAction[]; onClear: () => void }) {
  if (!count) return null
  return (
    <div className="bulk-bar" role="toolbar" aria-label="Actions on the selection">
      <b className="num">{count} {noun}</b>
      <span className="sep" aria-hidden />
      {actions.map((a, i) => (
        <Btn key={i} size="sm" variant={a.primary ? 'primary' : 'secondary'} disabled={a.disabled} onClick={a.onRun} title={a.note}>
          {a.icon}{a.label}
        </Btn>
      ))}
      <span className="spacer" />
      <Btn size="sm" variant="ghost" icon aria-label="Clear the selection" onClick={onClear}><X size={14} /></Btn>
      {actions.find(a => a.note) && <span className="bulk-note">{actions.find(a => a.note)!.note}</span>}
    </div>
  )
}
