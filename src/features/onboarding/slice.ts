import type { State } from '../../app/state'
import type { AgentId } from '../../app/types'
import { MIN } from '../../app/time'
import { now, pushLog } from '../../app/core'
import { buildDay1, connectLate } from './day1'
import { PROPOSALS, defaultSetup, pageLabel, publishNet, type Brief, type PlaybookDraft, type Preset, type Setup } from './model'

export type SetupAction =
  | { type: 'setup/patch'; patch: Partial<Setup> }
  | { type: 'setup/pb'; patch: Partial<PlaybookDraft> }
  | { type: 'setup/brief'; patch: Partial<Brief> }
  | { type: 'setup/pick'; id: string; keep?: boolean; text?: string }
  | { type: 'setup/connect'; ids: string[] }
  | { type: 'setup/preset'; preset: Preset; agent?: AgentId }
  /** Start the team: build the Day 1 workspace from the setup. `defaults` takes every default (moderator). */
  | { type: 'setup/start'; defaults?: boolean }
  | { type: 'setup/seen'; path: string }
  /** Schedule one of Atlas's first drafts on the first connected network; `undo` takes it back. */
  | { type: 'setup/schedule'; id: string; undo?: boolean }

const set = (s: State, p: Partial<Setup>): State => ({ ...s, setup: { ...s.setup, ...p } })

export function reduceSetup(s: State, a: SetupAction, fresh: () => State): State {
  switch (a.type) {
    case 'setup/patch':
      return set(s, a.patch)
    case 'setup/pb':
      return set(s, { pb: { ...s.setup.pb, ...a.patch } })
    case 'setup/brief':
      return s.setup.pb.brief ? set(s, { pb: { ...s.setup.pb, brief: { ...s.setup.pb.brief, ...a.patch } } }) : s
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
      // Once the team runs, a late connection imports its history and is part of the record.
      if (s.phase !== 'day1') return next
      return pushLog(connectLate(next, ids, fresh(), now(s)), { agent: 'iris', text: `You connected ${ids.map(pageLabel).join(', ')}`, reason: 'Its history is importing now', status: 'done', link: '/settings' })
    }
    case 'setup/preset':
      return a.agent ? set(s, { custom: { ...s.setup.custom, [a.agent]: a.preset } }) : set(s, { preset: a.preset, custom: {} })
    case 'setup/start': {
      const base = { ...fresh(), clock: s.clock, tester: s.tester }
      return buildDay1(base, a.defaults ? { ...defaultSetup(), startedAt: undefined } : s.setup, now(s))
    }
    case 'setup/seen':
      return s.setup.seen.includes(a.path) ? s : set(s, { seen: [...s.setup.seen, a.path] })
    case 'setup/schedule': {
      const d = s.setup.drafts.find(x => x.id === a.id)
      const net = publishNet(s.setup.connected)
      if (!d) return s
      if (a.undo) {
        if (d.status !== 'scheduled') return s
        const next = set(s, { drafts: s.setup.drafts.map(x => (x.id === d.id ? { ...x, status: 'draft' as const, postId: undefined, undoUntil: undefined } : x)) })
        return { ...next, publishing: { ...next.publishing, posts: next.publishing.posts.filter(p => p.id !== d.postId) } }
      }
      // The real block: no account to publish on, nothing to schedule.
      if (!net || d.status === 'scheduled') return s
      const postId = `p-${d.id}`
      const t = now(s)
      const next = set(s, { drafts: s.setup.drafts.map(x => (x.id === d.id ? { ...x, status: 'scheduled' as const, postId, undoUntil: t + 10 * MIN } : x)) })
      const when = new Date(d.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      return pushLog({ ...next, publishing: { ...next.publishing, posts: [...next.publishing.posts, { id: postId, network: net, at: d.at, text: d.text, status: 'scheduled', author: 'atlas', pillar: d.pillar }] } },
        { agent: 'atlas', text: `You scheduled Atlas’s draft for ${when}`, reason: 'One of the 3 first drafts from your Playbook', status: 'done', link: '/publishing/calendar' })
    }
  }
}
