import { expect, test } from 'vitest'
import { initialState, type State } from '../../app/state'
import { reducer } from '../../app/reducer'
import { mergeSaved } from '../../app/store'
import { scriptEvents } from '../../app/agents-registry'
import { AGENTS } from '../../data/agents'
import { T } from '../../app/time'
import {
  aboutErrors, buildBrief, deduce, defaultSetup, disposableEmail, heardFollowUp, initialDraft, initialSetup, levelCounts, missingFields, normalizeSite, orgFromSite, skipBlocked, weakFields,
  type About, type Brief, type Setup,
} from './model'
import { BACKFILL_MS, DAY1_IDS, IRIS_MS, QUESTIONS, buildDay1, checklist, deliverDue, firstBriefAt } from './day1'

const NOW = T(8, 20)
const day1 = (patch: Partial<Setup> = {}): State => buildDay1(initialState(), { ...defaultSetup(), ...patch }, NOW)
const started = (patch: Partial<Setup> = {}): State => reducer({ ...initialState(), setup: { ...defaultSetup(), ...patch } }, { type: 'setup/start' })
const ids = (s: State) => s.handoffs.map(h => h.id)
const level = (s: State, agent: string, action: string) => s.agents.find(a => a.id === agent)!.actions.find(x => x.id === action)!.autonomy
const item = (s: State, id: string, t = NOW) => checklist(s, t).find(c => c.id === id)!

/* ---------- Sign-up and about-you ---------- */

test('the email gives the name and the website; a webmail gives no website; disposable emails are refused', () => {
  expect(deduce('sam.rivera@fernway.co')).toEqual({ first: 'Sam', last: 'Rivera', site: 'fernway.co' })
  expect(deduce('Lea_Martin42@gmail.com')).toEqual({ first: 'Lea', last: 'Martin', site: '' })
  expect(orgFromSite('fernway.co')).toBe('Fernway')
  expect(normalizeSite(' https://www.Fernway.co/shop?x=1 ')).toBe('fernway.co')
  expect(normalizeSite('not a site')).toBe('')
  expect(disposableEmail('x@yopmail.com')).toBe(true)
  expect(disposableEmail('sam@fernway.co')).toBe(false)
})

test('about-you asks the real questions: phone is required, “Where did you hear” reveals its follow-up', () => {
  const a: About = { ...initialSetup(), first: 'Sam', last: 'Rivera', phone: '', org: 'Fernway' }
  expect(aboutErrors(a, 'about')).toEqual({ phone: 'Required' })
  expect(aboutErrors({ ...a, phone: '12' }, 'about').phone).toBe('Invalid phone number')
  expect(Object.keys(aboutErrors(a, 'team-org'))).toEqual(['teamSize', 'tool', 'heard', 'usa'])
  expect(heardFollowUp('SOCIAL_MEDIA')).toEqual({ kind: 'network', label: 'Which network?' })
  expect(heardFollowUp('CONTENT')).toMatchObject({ kind: 'text', required: false })
  expect(heardFollowUp('SEARCH_ENGINE')).toBeNull()
  const full: About = { ...a, phone: '6 12 34 56 78', teamSize: '3', tool: 'NONE', heard: 'SOCIAL_MEDIA', usa: 'no' }
  expect(aboutErrors(full, 'team-org')).toEqual({ heardNetwork: 'Required' })
  expect(aboutErrors({ ...full, heardNetwork: 'LinkedIn' }, 'team-org')).toEqual({})
  expect(aboutErrors({ ...full, heard: 'OTHER' }, 'team-org')).toEqual({ heardText: 'Required' })
})

test('skip waits on a reason, its text when it has one, and a valid email if one is typed', () => {
  expect(skipBlocked(null, '', '')).toBe(true)
  expect(skipBlocked('TRY_FIRST', '', '')).toBe(false)
  expect(skipBlocked('NETWORK_MISSING', '', '')).toBe(true)
  expect(skipBlocked('NETWORK_MISSING', 'Snapchat', '')).toBe(false)
  expect(skipBlocked('SOMEONE_ELSE', '', 'leo@')).toBe(true)
  expect(skipBlocked('SOMEONE_ELSE', '', 'leo@fernway.co')).toBe(false)
})

/* ---------- Playbook: computeBriefMissingFields ---------- */

const fromSite = (patch: Partial<Brief> = {}): Brief => ({ ...buildBrief({ ...initialDraft(), website: 'fernway.co', voiceSource: 'website' }, 'Fernway', []), ...patch })

test('the Playbook from the website is complete; each required field blocks Continue with Archie’s label', () => {
  expect(missingFields(fromSite(), 'fernway.co')).toEqual([])
  expect(missingFields(fromSite({ name: ' ', summary: '' }), 'fernway.co')).toEqual(['Playbook name', 'Business summary'])
  expect(missingFields(fromSite({ primary: null }), 'fernway.co')).toEqual(['Primary audience selection'])
  expect(missingFields(fromSite({ audiences: [], primary: null }), 'fernway.co')).toEqual(['Audience options'])
  const off = fromSite()
  expect(missingFields({ ...off, styles: off.styles.map(o => ({ ...o, on: false })), objectives: off.objectives.map(o => ({ ...o, on: false })), actions: off.actions.map(o => ({ ...o, on: false })) }, 'fernway.co'))
    .toEqual(['Content style', 'Objective', 'Content action'])
  expect(missingFields(fromSite({ ctaUrls: [] }), 'fernway.co')).toEqual(['At least one CTA URL'])
  expect(missingFields(fromSite({ ctaUrls: ['fernway.co/shop'] }), 'fernway.co')).toEqual(['Valid CTA URLs (full URL required)'])
  // Tones are required only when the voice comes from the website; a pasted voice must not be empty.
  expect(missingFields({ ...off, tones: off.tones.map(o => ({ ...o, on: false })) }, 'fernway.co')).toEqual(['Tone of voice'])
  expect(missingFields({ ...off, voiceSource: 'profile', tones: off.tones.map(o => ({ ...o, on: false })) }, 'fernway.co')).toEqual([])
  expect(missingFields({ ...off, voiceSource: 'custom', voice: ' ' }, 'fernway.co')).toEqual(['Your voice description'])
})

test('without a website the interview drafts the Playbook: no CTA link is needed, a pasted voice is kept verbatim', () => {
  const pb = { ...initialDraft(), noWebsite: true, answers: ['We make trail gear.', 'Packs and bottles.', 'Weekend hikers', 'Grow the community'], voiceSource: 'custom' as const, pasted: 'Short, warm, no jargon.' }
  const b = buildBrief(pb, 'Fernway', [])
  expect(b).toMatchObject({ summary: 'We make trail gear. Packs and bottles.', primary: 'Weekend hikers', ctaUrls: [], voice: 'Short, warm, no jargon.', voiceFrom: 'Written by you', competitors: [] })
  expect(missingFields(b, '')).toEqual([])
  expect(weakFields(b)).toEqual(['no link for readers yet', 'no competitors for Echo'])
  expect(buildBrief({ ...pb, answers: [] }, 'Fernway', [])).toMatchObject({ summary: '', audiences: [] })
})

test('Cautious puts nothing on Act; locked actions stay on Suggest whatever the preset', () => {
  const s = defaultSetup()
  expect(levelCounts(AGENTS, s).act).toBe(0)
  const auto = levelCounts(AGENTS, { ...s, preset: 'autonomous' })
  expect(auto.suggest).toBe(AGENTS.flatMap(a => a.actions).filter(x => x.locked).length)
})

/* ---------- Day 1 seed ---------- */

test('Day 1 with every default: replies ready, 3 drafts, Echo and Iris announced for later, no 30-day history', () => {
  const s = day1()
  expect(s.phase).toBe('day1')
  expect(ids(s)).toEqual(expect.arrayContaining([...QUESTIONS.map(q => q.id), 'h-strap', 'h-press']))
  // Nothing that takes hours is there yet.
  expect(ids(s)).not.toContain('h-peakline')
  expect(ids(s)).not.toContain(DAY1_IDS.iris)
  expect(s.setup.pending.map(p => [p.id, p.at - NOW])).toEqual([['echo', BACKFILL_MS], ['iris', IRIS_MS]])
  expect(s.setup.drafts).toHaveLength(3)
  expect(s.handoffs.some(h => h.kind === 'promotion')).toBe(false)
  expect(s.agents.every(a => a.record.handled === 0 && a.actions.every(x => x.autonomy !== 'act'))).toBe(true)
  expect(s.playbook.rules.every(r => r.origin.startsWith('Onboarding') && r.uses === 0)).toBe(true)
  expect(s.inbox.convs.find(c => c.id === 'c-size')).toMatchObject({ status: 'draft', handoff: 'd1-nova-size' })
  const onDesk = new Set(ids(s))
  expect(s.inbox.convs.filter(c => ['draft', 'escalated', 'claire', 'takeover'].includes(c.status)).every(c => c.handoff && onDesk.has(c.handoff))).toBe(true)
  expect(s.publishing.posts.every(p => p.status === 'published')).toBe(true)
  expect(s.publishing.ideas).toHaveLength(0)
  expect(s.listening.watch).toHaveLength(4)
  expect(firstBriefAt(NOW)).toBe(T(7, 0, 1))
})

test('Day 1 without an account: no Inbox, no Echo, no report; Atlas’s drafts are a preview that can’t be scheduled', () => {
  const s = started({ connected: [] })
  expect(s.inbox.convs).toHaveLength(0)
  expect(s.publishing.posts).toHaveLength(0)
  expect(s.listening.watch).toHaveLength(0)
  expect(s.handoffs).toHaveLength(0)
  expect(s.setup.pending).toHaveLength(0)
  expect(s.playbook.rules.some(r => r.origin.includes('replies'))).toBe(false)
  expect(s.agents.find(a => a.id === 'nova')!.now).toBe('Needs an account')
  expect(s.setup.drafts).toHaveLength(3)
  const tried = reducer(s, { type: 'setup/schedule', id: s.setup.drafts[0].id })
  expect(tried.publishing.posts).toHaveLength(0)
  expect(item(s, 'connect').done).toBe(false)
  expect(item(s, 'schedule').unlocks).toMatch(/connected profile/)
  expect(item(s, 'reply').detail).toBe('Needs a connected profile')
})

test('what you unticked or edited in “What Nova learned” is what the agents get; competitors you dropped aren’t watched', () => {
  const base = defaultSetup()
  const brief = { ...base.pb.brief!, competitors: base.pb.brief!.competitors.map(c => (c.id === 'peakline' ? { ...c, on: false } : c)) }
  const s = day1({ connected: ['ig'], pb: { ...base.pb, brief }, picks: { 'r-emoji': { keep: false, text: 'One emoji max' }, 'r-dm': { keep: true, text: 'Take order details to DMs' } } })
  expect(ids(s)).not.toContain('h-press') // LinkedIn not connected
  expect(s.listening.watch.map(w => w.id)).not.toContain('peakline')
  expect(s.playbook.rules.map(r => r.text)).toContain('Take order details to DMs')
  expect(s.playbook.rules.map(r => r.text)).not.toContain('One emoji max')
  expect(ids(s).filter(id => id.startsWith('d1-nova'))).toEqual(['d1-nova-size']) // the only Instagram question
  expect(s.inbox.convs.every(c => c.network === 'instagram')).toBe(true)
})

test('on Balanced Nova answers the questions herself, with an Undo, and the Desk only gets what is left', () => {
  const s = day1({ preset: 'balanced' })
  expect(level(s, 'nova', 'nova-faq')).toBe('act')
  expect(ids(s).some(id => id.startsWith('d1-nova'))).toBe(false)
  expect(s.log.find(l => /on her own/.test(l.text))?.undoUntil).toBeGreaterThan(NOW)
  expect(level(day1({ preset: 'balanced', custom: { nova: 'cautious' } }), 'nova', 'nova-faq')).toBe('draft')
})

/* ---------- Delayed delivery ---------- */

test('Echo’s topics and Iris’s report land when the clock gets there, once, and Skip 2 hours delivers both', () => {
  const s = day1()
  expect(deliverDue(s, NOW + 60 * 60_000)).toBe(s)
  const iris = deliverDue(s, NOW + IRIS_MS)
  expect(ids(iris)).toEqual(expect.arrayContaining([DAY1_IDS.iris, DAY1_IDS.sage]))
  expect(ids(iris)).not.toContain('h-peakline')
  const both = deliverDue(iris, NOW + BACKFILL_MS)
  expect(ids(both)).toContain('h-peakline')
  expect(both.setup.pending).toHaveLength(0)
  expect(both.log.slice(0, 3).map(l => l.agent)).toEqual(['echo', 'sage', 'iris'])
  expect(deliverDue(both, NOW + BACKFILL_MS * 3)).toBe(both)
  // The moderator's button is a 2-hour jump of the app clock.
  const skipped = reducer(started(), { type: 'core/advance', minutes: 120 })
  expect(ids(skipped)).toEqual(expect.arrayContaining(['h-peakline', DAY1_IDS.iris]))
})

/* ---------- Activation milestones ---------- */

test('the checklist is the four activation milestones, each ticked by doing it', () => {
  let s = started()
  const t = s.setup.startedAt!
  expect(checklist(s, t).map(c => c.id)).toEqual(['connect', 'schedule', 'reply', 'report'])
  expect(item(s, 'connect', t).done).toBe(true)
  // Schedule: one of Atlas's drafts goes to the calendar, with an Undo.
  expect(item(s, 'schedule', t).done).toBe(false)
  s = reducer(s, { type: 'setup/schedule', id: 'd1-draft-snow' })
  expect(s.publishing.posts.find(p => p.id === 'p-d1-draft-snow')).toMatchObject({ status: 'scheduled', author: 'atlas' })
  expect(item(s, 'schedule', t).done).toBe(true)
  expect(item(reducer(s, { type: 'setup/schedule', id: 'd1-draft-snow', undo: true }), 'schedule', t).done).toBe(false)
  // Reply: send Nova's drafts.
  expect(item(s, 'reply', t).done).toBe(false)
  s = reducer(s, { type: 'core/bulk', ids: QUESTIONS.map(q => q.id), decision: { kind: 'approve' }, summary: 'Sent 3 replies Nova drafted', agent: 'nova' })
  expect(item(s, 'reply', t).done).toBe(true)
  // Report: waits for the import, then ticks once you've looked.
  expect(item(s, 'report', t)).toMatchObject({ done: false, at: t + IRIS_MS })
  s = reducer(s, { type: 'core/advance', minutes: 120 })
  expect(item(s, 'report', t).action?.to).toBe('/insights')
  s = reducer(s, { type: 'core/track', kind: 'nav', detail: { path: '/insights' } })
  expect(item(s, 'report', t).done).toBe(true)
})

test('a thin Playbook adds “Finish your Playbook”, ticked once Shared rules is opened', () => {
  const base = defaultSetup()
  let s = started({ pb: { ...base.pb, brief: { ...base.pb.brief!, voiceSource: 'website', ctaUrls: [] } } })
  const finish = checklist(s, NOW).find(c => c.id === 'playbook')!
  expect(finish.detail).toBe('Your voice comes from your website only and no link for readers yet')
  s = reducer(s, { type: 'core/track', kind: 'nav', detail: { path: '/agents/rules' } })
  expect(checklist(s, NOW).find(c => c.id === 'playbook')!.done).toBe(true)
  expect(checklist(started(), NOW).some(c => c.id === 'playbook')).toBe(false)
})

test('connecting after skipping imports that history, makes the drafts schedulable and announces Nova, Echo and Iris', () => {
  let s = started({ connected: [] })
  s = reducer(s, { type: 'setup/connect', ids: ['ig'] })
  expect(s.inbox.convs.length).toBeGreaterThan(0)
  expect(s.inbox.convs.every(c => c.network === 'instagram')).toBe(true)
  expect(s.setup.pending.map(p => p.id).sort()).toEqual(['echo', 'iris', 'nova'])
  expect(s.log[0].text).toMatch(/You connected @fernway/)
  s = reducer(s, { type: 'setup/schedule', id: 'd1-draft-bottle' })
  expect(s.publishing.posts.find(p => p.id === 'p-d1-draft-bottle')?.network).toBe('instagram')
  s = reducer(s, { type: 'core/advance', minutes: 11 })
  expect(ids(s)).toContain('d1-nova-size')
  expect(s.inbox.convs.find(c => c.id === 'c-size')).toMatchObject({ status: 'draft', handoff: 'd1-nova-size' })
  // Connecting a second profile doesn't announce the same work twice.
  const again = reducer(s, { type: 'setup/connect', ids: ['fb'] })
  expect(again.setup.pending.filter(p => p.id === 'echo')).toHaveLength(1)
})

test('Day 1 has no history: the feed skips promotions, step-backs, learned rules and campaign news', () => {
  const s = day1()
  const SCRIPT = scriptEvents()
  for (const ev of SCRIPT.filter(e => e.history)) {
    const at = SCRIPT.indexOf(ev)
    const next = reducer({ ...s, engine: { ...s.engine, cursor: at } }, { type: 'core/fire' })
    expect(next.handoffs.length).toBe(s.handoffs.length)
  }
  expect(reducer(s, { type: 'core/fire', eventId: 'ev-promo-exchange' }).handoffs.length).toBe(s.handoffs.length + 1)
})

test('a save from an older version loads as a fresh Day 30 with an empty setup', () => {
  const old = { ...initialState(), v: 3, setup: { step: 'reading' } }
  const s = mergeSaved(JSON.stringify(old), initialState())
  expect(s.phase).toBe('day30')
  expect(s.setup.step).toBe('signup')
  expect(s.setup.pb.sub).toBe('source')
})
