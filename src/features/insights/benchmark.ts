// Fernway against the competitors Echo watches. Echo owns the competitors' numbers; Iris owns Fernway's.
import type { State } from '../../app/state'
import { FERNWAY_ROW } from '../../data/listening'
import { competitorsOf, shareOfVoice } from '../listening/model'
import { fernwayRow } from './metrics'

export type BenchRow = { id: string; name: string; followers: number; growth: number; er: number; cadence: number; sov: number; us: boolean }

/** Fernway first, then every competitor Echo still tracks (a paused or removed one leaves, as in Listening). */
export function benchmarkRows(s: State): BenchRow[] {
  const sov = shareOfVoice(s)
  const watched = new Set(s.listening.watch.filter(w => w.tracking).map(w => w.id))
  const us = fernwayRow()
  return [
    { id: 'fernway', ...us, cadence: FERNWAY_ROW.cadence, sov: sov.fernway ?? 0, us: true },
    ...competitorsOf(s).filter(c => watched.has(c.id)).map(c => ({ id: c.id, name: c.name, followers: c.followers, growth: c.growth, er: c.er, cadence: c.cadence, sov: sov[c.id] ?? 0, us: false })),
  ]
}

/** One line Iris would say about it: who grows fastest, and against whom Fernway leads on share of voice. */
export function benchmarkRead(rows: BenchRow[]) {
  const others = rows.filter(r => !r.us), us = rows.find(r => r.us)!
  if (!others.length) return 'Echo isn’t tracking any competitor right now.'
  const fastest = [...rows].sort((a, b) => b.growth - a.growth)[0]
  const loud = [...others].sort((a, b) => b.sov - a.sov)[0]
  return `${fastest.us ? 'Fernway grows fastest' : `${fastest.name} grows fastest (+${fastest.growth}% a week)`}. Fernway’s share of voice is ${us.sov}%, ${us.sov >= loud.sov ? `ahead of ${loud.name} (${loud.sov}%)` : `behind ${loud.name} (${loud.sov}%)`}.`
}
