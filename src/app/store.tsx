import { createContext, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react'
import { initialState, STATE_VERSION, type State } from './state'
import { reducer, type Action } from './reducer'
import { appNow, DEMO_START } from './time'
import { hasDueFollowUps } from '../features/chats/slice'
import { ideasDue } from '../features/publishing/slice'

const KEY = 'protopulse:state'

const SLICES = ['inbox', 'publishing', 'insights', 'listening', 'strategy', 'playbook', 'chats'] as const

/** Saved state merged over a fresh one, slice by slice, so fields added since the save get their defaults. */
function load(): State {
  const fresh = initialState()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as State
      if (s.v === STATE_VERSION) {
        const merged = { ...fresh, ...s, notice: undefined } as State
        for (const k of SLICES) (merged as Record<string, unknown>)[k] = { ...fresh[k], ...(s[k] ?? {}) }
        return merged
      }
    }
  } catch { /* private mode or corrupted: start fresh */ }
  return fresh
}

export const clearSaved = () => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }

const Ctx = createContext<{ s: State; d: Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, d] = useReducer(reducer, undefined, load)
  const ref = useRef(s)
  ref.current = s

  // Persist, debounced.
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* quota: ignore */ } }, 400)
    return () => clearTimeout(t)
  }, [s])

  // Heartbeat: only dispatches when something is due, so the tree doesn't re-render every second.
  useEffect(() => {
    const id = setInterval(() => {
      const st = ref.current
      const t = appNow(st.clock)
      const due =
        (st.engine.live && t >= st.engine.nextAt) ||
        st.handoffs.some(h => (h.lane === 'claire' && h.claire && !h.claire.reply && h.claire.dueAt <= t) || (h.lane === 'snoozed' && (h.snoozedUntil ?? Infinity) <= t)) ||
        st.agents.some(a => a.actions.some(x => x.trialUntil && x.trialUntil <= t)) ||
        hasDueFollowUps(st, t) ||
        ideasDue(st, t)
      if (due) d({ type: 'core/heartbeat' })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return <Ctx.Provider value={{ s, d }}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used inside StoreProvider')
  return v
}

/** Current app time, refreshed every `every` ms. */
export function useNow(every = 15000) {
  const { s } = useStore()
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick(x => x + 1), every)
    return () => clearInterval(id)
  }, [every])
  return s.clock ? appNow(s.clock) : DEMO_START
}
