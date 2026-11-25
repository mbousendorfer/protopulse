import { expect, test } from 'vitest'
import { initialState, type State } from '../../app/state'
import { reducer } from '../../app/reducer'
import { mergeSaved } from '../../app/store'
import { SCRIPT } from '../../data/script'
import { AGENTS } from '../../data/agents'
import { T } from '../../app/time'
import { ALL_ACCOUNTS, FINDS, PHASES, READ_MS, deduce, defaultSetup, levelCounts, normalizeSite, readingAt, type Setup } from './model'
import { QUESTIONS, buildDay1, checklist, firstBriefAt } from './day1'

const NOW = T(8, 20)
const day1 = (patch: Partial<Setup> = {}): State => buildDay1(initialState(), { ...defaultSetup(), ...patch }, NOW)
const ids = (s: State) => s.handoffs.map(h => h.id)
const level = (s: State, agent: string, action: string) => s.agents.find(a => a.id === agent)!.actions.find(x => x.id === action)!.autonomy

test('the email gives the name and the website; a webmail gives no website', () => {
  expect(deduce('sam.rivera@fernway.co')).toEqual({ first: 'Sam', last: 'Rivera', site: 'fernway.co' })
  expect(deduce('Lea_Martin42@gmail.com')).toEqual({ first: 'Lea', last: 'Martin', site: '' })
  expect(normalizeSite(' https://www.Fernway.co/shop?x=1 ')).toBe('fernway.co')
  expect(normalizeSite('not a site')).toBe('')
})

test('the brand read shows findings over time, phase by phase, and ends in under 15 seconds', () => {
  expect(readingAt(0).shown).toHaveLength(0)
  let last = -1
  for (let ms = 0; ms <= READ_MS; ms += 400) {
    const r = readingAt(ms)
    expect(r.shown.length).toBeGreaterThanOrEqual(last)
    last = r.shown.length
  }
  const end = readingAt(READ_MS)
  expect(end.done).toBe(true)
  expect(end.current).toBe(PHASES.length)
  expect(end.shown).toHaveLength(FINDS.length)
  expect(READ_MS).toBeLessThan(15_000)
  for (const p of PHASES) expect(FINDS.some(f => f.phase === p.id)).toBe(true)
})

test('Cautious puts nothing on Act; locked actions stay on Suggest whatever the preset', () => {
  const s = defaultSetup()
  expect(levelCounts(AGENTS, s).act).toBe(0)
  const auto = levelCounts(AGENTS, { ...s, preset: 'autonomous' })
  expect(auto.suggest).toBe(AGENTS.flatMap(a => a.actions).filter(x => x.locked).length)
})

test('Day 1 with every default: the first results on the Desk, no 30-day history anywhere', () => {
  const s = day1()
  expect(s.phase).toBe('day1')
  expect(s.onboarded).toBe(true)
  expect(ids(s)).toEqual(expect.arrayContaining([...QUESTIONS.map(q => q.id), 'h-strap', 'h-press', 'h-peakline', 'd1-atlas', 'd1-iris', 'd1-sage']))
  expect(s.handoffs.some(h => h.kind === 'promotion')).toBe(false)
  expect(s.log.every(l => l.id.startsWith('l-d1-'))).toBe(true)
  expect(s.agents.every(a => a.record.handled === 0 && a.actions.every(x => x.autonomy !== 'act'))).toBe(true)
  expect(s.playbook.rules.every(r => r.origin.startsWith('Onboarding') && r.uses === 0)).toBe(true)
  expect(s.inbox.convs.some(c => c.status === 'auto')).toBe(false)
  expect(s.inbox.convs.find(c => c.id === 'c-size')).toMatchObject({ status: 'draft', handoff: 'd1-nova-size' })
  expect(s.chats.list).toHaveLength(0)
  expect(s.listening.watch).toHaveLength(4)
  expect(s.publishing.ideas.find(i => i.handoff === 'd1-atlas')).toBeTruthy()
  expect(s.publishing.posts.some(p => p.status === 'needs')).toBe(false)
  expect(firstBriefAt(NOW)).toBe(T(7, 0, 1))
})

test('what you unchecked or edited is what the agents get', () => {
  const s = day1({ connected: ['ig'], picks: { peakline: { keep: false, text: 'Peakline' }, 'r-emoji': { keep: false, text: 'One emoji max' }, 'r-dm': { keep: true, text: 'Take order details to DMs' } } })
  expect(ids(s)).not.toContain('h-press') // LinkedIn not connected
  expect(ids(s)).not.toContain('h-peakline')
  expect(s.listening.watch.map(w => w.id)).not.toContain('peakline')
  expect(s.playbook.rules.map(r => r.text)).toContain('Take order details to DMs')
  expect(s.playbook.rules.map(r => r.text)).not.toContain('One emoji max')
  expect(ids(s).filter(id => id.startsWith('d1-nova'))).toEqual(['d1-nova-size']) // the only Instagram question
  const none = day1({ connected: [] })
  expect(ids(none)).toEqual(['h-peakline'])
})

test('on Balanced Nova answers the questions herself, with an Undo, and the Desk only gets what is left', () => {
  const s = day1({ preset: 'balanced' })
  expect(level(s, 'nova', 'nova-faq')).toBe('act')
  expect(ids(s).some(id => id.startsWith('d1-nova'))).toBe(false)
  expect(s.log.find(l => /on her own/.test(l.text))?.undoUntil).toBeGreaterThan(NOW)
  expect(s.inbox.convs.find(c => c.id === 'c-size')!.status).toBe('auto')
  // A per-agent choice wins over the global one.
  expect(level(day1({ preset: 'balanced', custom: { nova: 'cautious' } }), 'nova', 'nova-faq')).toBe('draft')
})

test('sending Nova’s first replies in one go settles the cards, sends in the Inbox, ticks the list, and undoes in one click', () => {
  let s = reducer({ ...initialState(), setup: defaultSetup() }, { type: 'setup/start' })
  const nova = QUESTIONS.map(q => q.id)
  expect(checklist(s, NOW).find(c => c.id === 'replies')!.done).toBe(false)
  s = reducer(s, { type: 'core/bulk', ids: nova, decision: { kind: 'approve' }, summary: 'Sent 3 replies Nova drafted', agent: 'nova' })
  expect(ids(s).some(id => nova.includes(id))).toBe(false)
  expect(s.inbox.convs.find(c => c.id === 'c-cover')!.status).toBe('you')
  expect(checklist(s, NOW).find(c => c.id === 'replies')!.done).toBe(true)
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(ids(s)).toEqual(expect.arrayContaining(nova))
})

test('the checklist: connect what is missing, pages tick off once visited, the brief waits for tomorrow 07:00', () => {
  let s = reducer({ ...initialState(), setup: { ...defaultSetup(), connected: ['ig', 'tt'] } }, { type: 'setup/start' })
  const acc = checklist(s, NOW).find(c => c.id === 'accounts')!
  expect(acc.done).toBe(false)
  expect(acc.action?.connect).toHaveLength(ALL_ACCOUNTS.length - 2)
  s = reducer(s, { type: 'setup/connect', ids: acc.action!.connect! })
  expect(checklist(s, NOW).find(c => c.id === 'accounts')!.done).toBe(true)
  expect(s.log[0].text).toMatch(/You connected/)
  s = reducer(s, { type: 'core/track', kind: 'nav', detail: { path: '/playbook' } })
  expect(checklist(s, NOW).find(c => c.id === 'playbook')!.done).toBe(true)
  expect(checklist(s, NOW).find(c => c.id === 'brief')!.done).toBe(false)
})

test('Day 1 has no history: the feed skips promotions, step-backs, learned rules and campaign news', () => {
  const s = day1()
  for (const ev of SCRIPT.filter(e => e.history)) {
    const at = SCRIPT.indexOf(ev)
    const next = reducer({ ...s, engine: { ...s.engine, cursor: at } }, { type: 'core/fire' })
    expect(next.handoffs.length).toBe(s.handoffs.length)
  }
  // The moderator can still force one.
  expect(reducer(s, { type: 'core/fire', eventId: 'ev-promo-exchange' }).handoffs.length).toBe(s.handoffs.length + 1)
})

test('a save from before Day 1 existed loads as Day 30 with an empty setup', () => {
  const fresh = initialState()
  const { phase: _p, setup: _s, ...old } = fresh
  const s = mergeSaved(JSON.stringify(old), initialState())
  expect(s.phase).toBe('day30')
  expect(s.setup.step).toBe('signup')
  expect(s.handoffs.length).toBe(fresh.handoffs.length)
})
