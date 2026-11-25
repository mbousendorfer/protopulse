import { expect, test } from 'vitest'
import { initialState, type State } from '../../app/state'
import { reducer, type Action } from '../../app/reducer'
import { now } from '../../app/core'
import { PHASES, PHASE_MS, SEEDS, TRANSCRIPT } from '../../data/video'

const later = (s: State, ms: number): State => ({ ...s, clock: { base: now(s) + ms, realAt: Date.now() } })
const run = (s: State, ...actions: Action[]) => actions.reduce(reducer, s)
const done = (s: State) => run(later(s, PHASES.length * PHASE_MS + 1000), { type: 'core/heartbeat' })
const clipPosts = (s: State, source: string) => s.publishing.posts.filter(p => p.media?.startsWith(`clip:clip-${source}-`) && p.status === 'scheduled')

test('a new upload is processed, its clips arrive with a Desk card; approving the card schedules them and Undo takes them back', () => {
  let s = run(initialState(), { type: 'core/fire', eventId: 'ev-video-gr20' })
  expect(s.video.sources.find(x => x.id === 'gr20')?.status).toBe('processing')
  s = done(s)
  const ready = s.video.clips.filter(c => c.source === 'gr20' && c.status === 'ready')
  expect(ready).toHaveLength(3)
  const card = s.handoffs.find(h => h.topic === 'Clips' && h.ref === 'gr20')!
  expect(card.title).toMatch(/^3 clips from/)
  expect(card.preview).toEqual({ type: 'clip', clip: ready[0].id })

  s = run(s, { type: 'core/resolve', id: card.id, decision: { kind: 'approve' } })
  expect(s.video.clips.filter(c => c.source === 'gr20').every(c => c.status === 'sent')).toBe(true)
  expect(clipPosts(s, 'gr20').length).toBeGreaterThanOrEqual(3)
  expect(s.tester.filter(e => e.kind === 'video/decision')).toHaveLength(3)

  s = run(s, { type: 'core/undo', id: s.log[0].id })
  expect(clipPosts(s, 'gr20')).toHaveLength(0)
  expect(s.video.clips.filter(c => c.source === 'gr20').every(c => c.status === 'ready')).toBe(true)
  expect(s.handoffs.some(h => h.id === card.id)).toBe(true)
})

test('sending from Video: one journal line with Undo, the Desk card count follows, and the last clip removes the card', () => {
  let s = initialState()
  const live = s.video.clips.filter(c => c.source === 'live' && c.status === 'ready')
  expect(s.handoffs.find(h => h.id === 'h-clips-live')?.title).toMatch(/^3 clips/)
  s = run(s, { type: 'video/send', ids: [live[0].id] })
  expect(s.log[0].clips).toEqual([live[0].id])
  expect(s.notice?.undo).toBe(s.log[0].id)
  expect(s.handoffs.find(h => h.id === 'h-clips-live')?.title).toMatch(/^2 clips/)
  s = run(s, { type: 'video/send', ids: live.slice(1).map(c => c.id) })
  expect(s.handoffs.some(h => h.id === 'h-clips-live')).toBe(false)
  s = run(s, { type: 'core/undo', id: s.log[0].id })
  expect(s.video.clips.filter(c => c.source === 'live' && c.status === 'ready')).toHaveLength(2)
})

test('on Suggest, Juno asks before cutting; approving starts the processing', () => {
  let s = run(initialState(), { type: 'core/autonomy', agent: 'juno', action: 'juno-clip', level: 'suggest' }, { type: 'core/fire', eventId: 'ev-video-gr20' })
  expect(s.video.sources.find(x => x.id === 'gr20')?.status).toBe('waiting')
  const card = s.handoffs.find(h => h.topic === 'New video')!
  s = run(s, { type: 'core/resolve', id: card.id, decision: { kind: 'approve' } })
  expect(s.video.sources.find(x => x.id === 'gr20')?.status).toBe('processing')
})

test('with sending on Act, Juno sends her 80+ clips herself, with Undo', () => {
  let s = run(initialState(), { type: 'core/autonomy', agent: 'juno', action: 'juno-handoff', level: 'act' }, { type: 'core/fire', eventId: 'ev-video-gr20' })
  s = done(s)
  const sent = s.video.clips.filter(c => c.source === 'gr20' && c.status === 'sent')
  expect(sent.length).toBeGreaterThan(0)
  expect(s.log.some(l => l.clips && l.undoUntil && l.reason === 'Sending her best clips is set to Act')).toBe(true)
})

test('a private link fails with a reason; a valid link becomes a source; an invalid one is ignored', () => {
  let s = run(initialState(), { type: 'video/addLink', url: 'https://youtube.com/watch?v=private123' }, { type: 'video/addLink', url: 'not a link' })
  expect(s.video.sources.filter(x => x.kind === 'link')).toHaveLength(1)
  s = run(later(s, PHASE_MS + 500), { type: 'core/heartbeat' })
  const src = s.video.sources.find(x => x.kind === 'link')!
  expect(src.status).toBe('failed')
  expect(src.error).toMatch(/private/)
  s = run(s, { type: 'video/retry', id: src.id })
  expect(s.video.sources.find(x => x.id === src.id)?.status).toBe('processing')
})

test('editor: edits stack up, undo and redo walk through them', () => {
  const id = initialState().video.clips.find(c => c.status === 'ready')!.id
  let s = run(initialState(), { type: 'video/open', id }, { type: 'video/edit', id, patch: { aspect: '1:1' } }, { type: 'video/edit', id, patch: { trimGaps: true } })
  const clip = () => s.video.clips.find(c => c.id === id)!
  expect(clip()).toMatchObject({ aspect: '1:1', trimGaps: true, edited: true })
  s = run(s, { type: 'video/undo' })
  expect(clip()).toMatchObject({ aspect: '1:1', trimGaps: false })
  s = run(s, { type: 'video/undo' })
  expect(clip().aspect).toBe('9:16')
  s = run(s, { type: 'video/redo' })
  expect(clip().aspect).toBe('1:1')
})

test('find clips about a topic adds new clips; dismissing one can be undone', () => {
  let s = run(initialState(), { type: 'video/find', source: 'live', query: 'second-hand bags', len: 15, count: 2 })
  const found = s.video.clips.filter(c => c.id.startsWith('clip-live-find'))
  expect(found.length).toBeGreaterThan(0)
  expect(found[0].why).toMatch(/second-hand/)
  expect(found[0].evidence[0]).toMatchObject({ from: 'This video', to: '/video/sources/live' })
  expect(found[0].evidence[0].label).toMatch(/^Camille says “Can I send a bag/)
  s = run(s, { type: 'video/dismiss', id: found[0].id, reason: 'Off-brand' })
  expect(s.video.clips.find(c => c.id === found[0].id)?.status).toBe('dismissed')
  s = run(s, { type: 'core/undo', id: s.log[0].id })
  expect(s.video.clips.find(c => c.id === found[0].id)?.status).toBe('ready')
})

test('a clip found on request cites the moment, the matching Listening trend and the pillar’s best published clip', () => {
  const s = run(initialState(), { type: 'video/find', source: 'repair', query: 'repair', len: 20, count: 1 })
  const c = s.video.clips.find(x => x.id.startsWith('clip-repair-find'))!
  expect(c.evidence.map(e => e.from)).toEqual(['This video', 'Listening', 'Video'])
  expect(c.evidence[1].label).toMatch(/Repair over replace/)
  expect(c.evidence[2]).toMatchObject({ value: '48.2k', to: '/video/clips/clip-repair-brands' })
  expect(c.base.trend).toBeGreaterThanOrEqual(70)
})

test('a pasted link says it plays a sample video', () => {
  const s = run(initialState(), { type: 'video/addLink', url: 'https://vimeo.com/123' })
  expect(s.video.sources[0]).toMatchObject({ kind: 'link', sampleTranscript: true })
  expect(s.notice?.text).toMatch(/sample video/)
})

test('every seed clip finds its phrases in the real narration and lands between 8 and 65 seconds', () => {
  const found = Object.entries(SEEDS).flatMap(([id, seeds]) => seeds.map(sd => {
    const t = TRANSCRIPT[id]
    const a = t.sentences.find(x => x.text.toLowerCase().includes(sd.from.toLowerCase()))
    const b = a && t.sentences.find(x => x.i >= a.i && x.text.toLowerCase().includes(sd.to.toLowerCase()))
    return `${id}/${sd.key}: ${a ? '' : `missing “${sd.from}”`}${a && !b ? `missing “${sd.to}”` : ''}${a && b && (b.e - a.s < 8 || b.e - a.s > 65) ? `${Math.round(b.e - a.s)} s` : ''}`
  }))
  expect(found.filter(x => !x.endsWith(': '))).toEqual([])
})
