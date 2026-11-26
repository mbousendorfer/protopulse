import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, Check, ChevronDown, ShoppingBag } from 'lucide-react'
import { Btn, Menu, Net } from '../../ui'
import { NETWORKS, appNet, type NetId } from './model'

/** Title block every screen starts with. The h1 takes the focus when the screen opens. */
export function Head({ title, lede }: { title: ReactNode; lede?: ReactNode }) {
  return (
    <div className="onb-head">
      <h1 tabIndex={-1}>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
    </div>
  )
}

/** Back on the left, the one decision on the right. */
export function Foot({ onBack, note, children }: { onBack?: () => void; note?: ReactNode; children: ReactNode }) {
  return (
    <footer className="onb-foot">
      {onBack && <Btn variant="ghost" onClick={onBack}><ArrowLeft size={14} />Back</Btn>}
      <span className="spacer" />
      {note && <span className="onb-foot-note">{note}</span>}
      {children}
    </footer>
  )
}

/** A labelled form field with its error. */
export function Field({ id, label, error, hint, children }: { id: string; label: ReactNode; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p id={`${id}-err`} className="onb-error" role="alert">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  )
}

/** The repo's dropdown used as a select: a button that says the value, a menu of options. Never a bare native select. */
export function Pick<T extends string>({ id, label, value, options, onChange, error, placeholder = 'Select an answer' }: {
  id: string; label: ReactNode; value: T | null; options: readonly { value: T; label: string }[]; onChange: (v: T) => void; error?: string; placeholder?: string
}) {
  const current = options.find(o => o.value === value)
  return (
    <div className="field">
      <span className="label" id={`${id}-label`}>{label}</span>
      <Menu align="start" trigger={
        <button type="button" id={id} className={`input onb-pick ${error ? 'invalid' : ''}`} aria-labelledby={`${id}-label ${id}`} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}>
          <span className={current ? '' : 'onb-ph'}>{current?.label ?? placeholder}</span><ChevronDown size={14} aria-hidden />
        </button>
      } items={options.map(o => ({ label: o.label, onSelect: () => onChange(o.value), icon: <span className="onb-tick" aria-hidden>{o.value === value && <Check size={14} />}</span> }))} />
      {error && <p id={`${id}-err`} className="onb-error" role="alert">{error}</p>}
    </div>
  )
}

/** A network of the Connect grid. Threads, Pinterest and Bluesky get their own small glyph: the rest of the app doesn't use them. */
export function NetIcon({ id, size = 22 }: { id: NetId; size?: number }) {
  const app = appNet(id)
  if (app) return <Net n={app} size={size} />
  const name = NETWORKS.find(n => n.id === id)!.name
  const glyph = id === 'threads' ? '@' : id === 'pinterest' ? 'P' : 'b'
  return (
    <span className="net" role="img" title={name} aria-label={name} style={{ width: size, height: size, borderRadius: '24%' }}>
      <svg viewBox="0 0 16 16"><rect width="16" height="16" fill={`var(--n-${id})`} /><text x="8" y="11.6" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--panel)">{glyph}</text></svg>
    </span>
  )
}

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
export const narrowScreen = () => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 767px)').matches

/** Milliseconds since the screen opened, ticking until `until`. With reduced motion it runs three times faster. */
export function useElapsed(until: number, skip = false) {
  const [ms, setMs] = useState(skip ? until : 0)
  useEffect(() => {
    if (skip) { setMs(until); return }
    const start = performance.now(), speed = reducedMotion() ? 3 : 1
    const id = setInterval(() => {
      const t = (performance.now() - start) * speed
      setMs(Math.min(until, t))
      if (t >= until) clearInterval(id)
    }, 100)
    return () => clearInterval(id)
  }, [until, skip])
  return ms
}

export const ShopifyMark = () => <span className="onb-shop" role="img" aria-label="Shopify" title="Shopify"><ShoppingBag size={14} /></span>
