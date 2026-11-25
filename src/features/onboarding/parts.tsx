import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { Btn } from '../../ui'

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

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

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
