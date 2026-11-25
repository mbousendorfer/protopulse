import type { State } from '../../app/state'
import type { AgentId } from '../../app/types'
import { now, pushLog } from '../../app/core'
import { buildDay1 } from './day1'
import { INTEGRATIONS, PROPOSALS, defaultSetup, type Preset, type Setup } from './model'

export type SetupAction =
  | { type: 'setup/patch'; patch: Partial<Setup> }
  | { type: 'setup/pick'; id: string; keep?: boolean; text?: string }
  | { type: 'setup/connect'; ids: string[] }
  | { type: 'setup/preset'; preset: Preset; agent?: AgentId }
  /** Start the team: build the Day 1 workspace from the setup. `defaults` takes every default (moderator). */
  | { type: 'setup/start'; defaults?: boolean }
  | { type: 'setup/seen'; path: string }

const set = (s: State, p: Partial<Setup>): State => ({ ...s, setup: { ...s.setup, ...p } })

export function reduceSetup(s: State, a: SetupAction, fresh: () => State): State {
  switch (a.type) {
    case 'setup/patch':
      return set(s, a.patch)
    case 'setup/pick': {
      const p = PROPOSALS.find(x => x.id === a.id)
      if (!p) return s
      const cur = s.setup.picks[a.id] ?? { keep: true, text: p.text }
      const text = a.text?.trim() || cur.text
      return set(s, { picks: { ...s.setup.picks, [a.id]: { keep: a.keep ?? cur.keep, text } } })
    }
    case 'setup/connect': {
      const ids = a.ids.filter(id => !s.setup.connected.includes(id))
      if (!ids.length) return s
      const next = set(s, { connected: [...s.setup.connected, ...ids] })
      // Once the team runs, a late connection is part of the record.
      if (s.phase !== 'day1') return next
      const names = ids.map(id => INTEGRATIONS.find(i => i.id === id)?.name ?? id)
      return pushLog(next, { agent: 'nova', text: `You connected ${names.join(', ')}`, reason: 'From your getting-started list', status: 'done', link: '/settings' })
    }
    case 'setup/preset':
      return a.agent ? set(s, { custom: { ...s.setup.custom, [a.agent]: a.preset } }) : set(s, { preset: a.preset, custom: {} })
    case 'setup/start': {
      const base = { ...fresh(), clock: s.clock, tester: s.tester }
      return buildDay1(base, a.defaults ? { ...defaultSetup(), startedAt: undefined } : s.setup, now(s))
    }
    case 'setup/seen':
      return s.setup.seen.includes(a.path) ? s : set(s, { seen: [...s.setup.seen, a.path] })
  }
}
