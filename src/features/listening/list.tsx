// The standard list (matrix §14) as Listening, Strategy and Insights use it: rows are `DecisionRow`s in one card.
import type { MouseEvent, ReactNode } from 'react'
import { Pill } from '../../ui'
import { InfoPop } from '../../ui/More'
import './list.css'

/** A status that isn't the filter's own, and its reason one click away (matrix §13–14). */
export const Status = ({ label, tone, why }: { label: ReactNode; tone?: 'alert' | 'caution' | 'ok' | 'signal'; why?: ReactNode }) =>
  <><Pill tone={tone}>{label}</Pill>{why && <InfoPop label="Why?">{why}</InfoPop>}</>

/** Row buttons sit inside a clickable row: they act, the row doesn't open. */
export const stop = (f: () => void) => (e: MouseEvent) => { e.stopPropagation(); f() }

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
