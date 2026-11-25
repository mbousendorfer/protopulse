import { expect, test } from 'vitest'
import type { AgentId, Handoff, PlaybookRule } from '../../app/types'
import { AGENTS, agentName } from '../../data/agents'
import { FACTS, RULES } from '../../data/playbook'
import { appliesTo, playbookTarget, proposalsFor, rulesFor, scopeLabel, scopeOf } from './rules'

const TEAM = AGENTS.map(a => a.id)
const rule = (id: string, agents: AgentId[], kind: PlaybookRule['kind'] = 'do'): PlaybookRule => ({ id, kind, text: id, agents, origin: 'Added by you', uses: 0, addedAt: 0 })

test('agent ids never collide with the Agents tab routes', () => {
  expect((TEAM as string[]).filter(id => id === 'rules' || id === 'escalation')).toEqual([])
})

test('scope: all agents, this agent only, or shared with named others', () => {
  expect(scopeOf(rule('a', TEAM), 'nova', TEAM)).toEqual({ kind: 'all' })
  expect(scopeOf(rule('b', ['nova']), 'nova', TEAM)).toEqual({ kind: 'only' })
  expect(scopeOf(rule('c', ['nova', 'atlas']), 'nova', TEAM)).toEqual({ kind: 'some', others: ['atlas'] })
  expect(scopeLabel({ kind: 'all' }, 'Nova', agentName)).toBe('Shared · all agents')
  expect(scopeLabel({ kind: 'only' }, 'Nova', agentName)).toBe('Nova only')
  expect(scopeLabel({ kind: 'some', others: ['atlas', 'echo'] }, 'Nova', agentName)).toBe('Shared with Atlas and Echo')
})

test('rulesFor keeps only what the agent applies, splits rules from facts, keeps paused ones', () => {
  const all = [rule('r1', ['nova']), { ...rule('r2', ['nova', 'atlas'], 'dont'), paused: true }, rule('r3', ['atlas']), rule('f1', ['nova'], 'fact'), rule('w', ['nova'], 'word')]
  const got = rulesFor(all, 'nova', TEAM)
  expect(got.rules.map(x => x.rule.id)).toEqual(['r1', 'r2'])
  expect(got.facts.map(x => x.rule.id)).toEqual(['f1'])
})

test('on the demo data every agent with rules gets them, and Sage gets none', () => {
  const pb = [...RULES, ...FACTS]
  const nova = rulesFor(pb, 'nova', TEAM)
  expect(nova.rules.length).toBe(RULES.filter(r => r.agents.includes('nova')).length)
  expect(nova.facts.every(x => x.rule.kind === 'fact' && x.rule.agents.includes('nova'))).toBe(true)
  expect(rulesFor(pb, 'sage', TEAM)).toEqual({ rules: [], facts: [] })
})

test('proposalsFor: open proposals raised by or applying to the agent', () => {
  const h = (id: string, agent: AgentId, agents: AgentId[], lane?: Handoff['lane']) => ({ id, agent, lane, proposal: { text: id, agents } }) as unknown as Handoff
  const hs = [h('p1', 'nova', ['nova']), h('p2', 'atlas', ['atlas', 'nova']), h('p3', 'atlas', ['atlas']), h('p4', 'nova', ['nova'], 'snoozed'), { id: 'x', agent: 'nova' } as Handoff]
  expect(proposalsFor(hs, 'nova').map(x => x.id)).toEqual(['p1', 'p2'])
})

test('appliesTo names who follows a rule in Shared rules', () => {
  expect(appliesTo(TEAM, TEAM, agentName)).toBe('All agents')
  expect(appliesTo(['nova'], TEAM, agentName)).toBe('Nova only')
  expect(appliesTo(['nova', 'atlas'], TEAM, agentName)).toBe('Nova and Atlas')
})

test('every old /playbook address lands in the right place', () => {
  expect(playbookTarget('')).toBe('/agents/rules')
  expect(playbookTarget('?tab=rules')).toBe('/agents/rules')
  expect(playbookTarget('?tab=words')).toBe('/agents/rules?section=words')
  expect(playbookTarget('?tab=facts')).toBe('/agents/rules?section=facts')
  expect(playbookTarget('?tab=voice')).toBe('/agents/rules?section=voice')
  expect(playbookTarget('?tab=escalation')).toBe('/agents/escalation')
  expect(playbookTarget('?tab=pillars')).toBe('/strategy/pillars')
  expect(playbookTarget('?tab=nonsense')).toBe('/agents/rules')
})
