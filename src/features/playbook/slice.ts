import type { State } from '../../app/state'
import type { AgentId, Decision, Handoff, Network, PlaybookRule, RuleKind } from '../../app/types'
import { addRule, pushHandoff } from '../../app/core'
import { BANNED, ESCALATIONS, FACTS, PREFERRED, RULES, VOICE, type Escalation, type Voice } from '../../data/playbook'

export type PlaybookState = {
  rules: PlaybookRule[]
  voice: Voice
  banned: string[]
  preferred: { use: string; instead: string }[]
  escalate: Escalation[]
}

export const initialPlaybook = (): PlaybookState => ({
  rules: structuredClone([...RULES, ...FACTS]),
  voice: { ...VOICE },
  banned: [...BANNED],
  preferred: structuredClone(PREFERRED),
  escalate: structuredClone(ESCALATIONS),
})

export type PlaybookAction =
  | { type: 'playbook/voice'; key: keyof Voice; value: number }
  | { type: 'playbook/addRule'; kind: RuleKind; text: string; agents: AgentId[]; origin: string; quiet?: boolean }
  | { type: 'playbook/editRule'; id: string; text: string }
  | { type: 'playbook/toggleRule'; id: string }
  | { type: 'playbook/deleteRule'; id: string }
  | { type: 'playbook/restoreRule'; rule: PlaybookRule; index: number }
  | { type: 'playbook/banned'; word: string; add: boolean }
  | { type: 'playbook/preferred'; use: string; instead?: string; add: boolean }
  | { type: 'playbook/escalate'; id: string; on?: boolean; to?: 'sam' | 'claire'; label?: string }
  | { type: 'playbook/escalateAdd'; rule: Escalation }
  | { type: 'playbook/escalateDelete'; id: string }
  // ponytail: the command bar owns no slice, so its one write (a brief to Atlas) rides on this prefix. Move to a `command/` slice if it grows.
  | { type: 'playbook/briefAtlas'; title: string; network: Network; slot: string; text: string; brief: string }

const set = (s: State, p: Partial<PlaybookState>): State => ({ ...s, playbook: { ...s.playbook, ...p } })

export function reducePlaybook(s: State, a: PlaybookAction): State {
  const pb = s.playbook
  switch (a.type) {
    case 'playbook/voice':
      return set(s, { voice: { ...pb.voice, [a.key]: a.value } })
    case 'playbook/addRule': {
      // The add form says so before you submit; a duplicate never lands twice.
      if (pb.rules.some(r => r.text.toLowerCase() === a.text.toLowerCase())) return s
      return addRule(s, { kind: a.kind, text: a.text, agents: a.agents, origin: a.origin })
    }
    case 'playbook/editRule':
      return set(s, { rules: pb.rules.map(r => (r.id === a.id ? { ...r, text: a.text, origin: 'Edited by you' } : r)) })
    case 'playbook/toggleRule':
      return set(s, { rules: pb.rules.map(r => (r.id === a.id ? { ...r, paused: !r.paused } : r)) })
    case 'playbook/deleteRule':
      return set(s, { rules: pb.rules.filter(r => r.id !== a.id) })
    case 'playbook/restoreRule': {
      const rules = pb.rules.filter(r => r.id !== a.rule.id)
      rules.splice(Math.min(a.index, rules.length), 0, a.rule)
      return set(s, { rules })
    }
    case 'playbook/banned': {
      const w = a.word.trim()
      if (!w) return s
      return set(s, { banned: a.add ? (pb.banned.includes(w) ? pb.banned : [...pb.banned, w]) : pb.banned.filter(x => x !== w) })
    }
    case 'playbook/preferred':
      return set(s, { preferred: a.add ? [...pb.preferred.filter(p => p.use !== a.use), { use: a.use, instead: a.instead ?? '' }] : pb.preferred.filter(p => p.use !== a.use) })
    case 'playbook/escalate':
      return set(s, { escalate: pb.escalate.map(e => (e.id === a.id ? { ...e, on: a.on ?? e.on, to: a.to ?? e.to, label: a.label ?? e.label } : e)) })
    case 'playbook/escalateAdd':
      return set(s, { escalate: [...pb.escalate, a.rule] })
    case 'playbook/escalateDelete':
      return set(s, { escalate: pb.escalate.filter(e => e.id !== a.id) })
    case 'playbook/briefAtlas':
      return pushHandoff(s, {
        agent: 'atlas', kind: 'approval', urgency: 'today', topic: 'Draft from your brief', action: 'atlas-fill',
        title: a.title, context: `Your brief: “${a.brief}”`,
        why: 'You asked for it from the command bar. Posts you brief always come back for approval.',
        confidence: 80, link: '/publishing', rules: ['One call to action per post', 'One emoji max'],
        preview: { type: 'post', network: a.network, slot: a.slot, text: [a.text] },
      })
  }
}

/** Rule proposals are applied by core (h.proposal). Nothing extra here. */
export function onResolvePlaybook(s: State, _h: Handoff, _d: Decision): State { return s }
