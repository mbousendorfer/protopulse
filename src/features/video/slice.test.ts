import { expect, test } from 'vitest'
import { initialState, type State } from '../../app/state'
import { reducer, type Action } from '../../app/reducer'
import { now } from '../../app/core'
import { PHASES, PHASE_MS, SEEDS, TRANSCRIPT } from '../../data/video'
import { clipLengthOf, clipPosts as clipPosts2, rescore } from './model'
import { clipPerf as irisClipPerf } from '../insights/metrics'

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
  // Hugo is on screen in the opening shot without a signed release: that clip stays.
  expect(s.video.clips.filter(c => c.source === 'gr20' && c.status === 'sent')).toHaveLength(2)
  expect(s.video.clips.find(c => c.id === 'clip-gr20-refuge')?.status).toBe('ready')
  expect(clipPosts(s, 'gr20').length).toBeGreaterThanOrEqual(2)
  expect(s.tester.filter(e => e.kind === 'video/decision')).toHaveLength(2)

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

const level = (s: State, action: string, lv: 'suggest' | 'draft' | 'act') => run(s, { type: 'core/autonomy', agent: 'juno', action, level: lv })
const clipOf = (s: State, id: string) => s.video.clips.find(c => c.id === id)!
const fireCaptions = (s: State) => run(s, { type: 'core/fire', eventId: 'ev-video-captions' })

test('caption fixes on Act: Juno fixes the misheard product names, Undo takes them off', () => {
  let s = fireCaptions(initialState())
  expect(clipOf(s, 'clip-repair-strap').fixes[38]).toBe('28L')
  expect(s.log[0].captionFixes?.['clip-repair-strap']).toEqual([38])
  expect(s.log[0].text).toMatch(/“28” → “28L”/)
  s = run(s, { type: 'core/undo', id: s.log[0].id })
  expect(clipOf(s, 'clip-repair-strap').fixes[38]).toBeUndefined()
})

test('caption fixes on Draft: one card, approving it fixes; moving to Act does it too', () => {
  let s = fireCaptions(level(initialState(), 'juno-captions', 'draft'))
  const card = s.handoffs.find(h => h.topic === 'Captions')!
  expect(card.fixes?.['clip-repair-strap']).toEqual([38])
  expect(clipOf(s, 'clip-repair-strap').fixes[38]).toBeUndefined()
  const approved = run(s, { type: 'core/resolve', id: card.id, decision: { kind: 'approve' } })
  expect(clipOf(approved, 'clip-repair-strap').fixes[38]).toBe('28L')
  s = level(s, 'juno-captions', 'act')
  expect(s.handoffs.some(h => h.topic === 'Captions')).toBe(false)
  expect(clipOf(s, 'clip-repair-strap').fixes[38]).toBe('28L')
})

test('caption fixes on Suggest: no card, nothing fixed, the words stay flagged', () => {
  const s = fireCaptions(level(initialState(), 'juno-captions', 'suggest'))
  expect(s.handoffs.some(h => h.topic === 'Captions')).toBe(false)
  expect(clipOf(s, 'clip-repair-strap').fixes[38]).toBeUndefined()
})

test('reframing follows its level on new clips: applied (Act), to check (Draft), suggested and not applied (Suggest)', () => {
  const cut = (lv: 'suggest' | 'draft' | 'act') => done(run(level(initialState(), 'juno-reframe', lv), { type: 'core/fire', eventId: 'ev-video-gr20' })).video.clips.filter(c => c.source === 'gr20')
  expect(cut('act').every(c => c.frame === 'track' && !c.framing && c.brand.logo)).toBe(true)
  expect(cut('draft').every(c => c.frame === 'track' && c.framing === 'check')).toBe(true)
  expect(cut('suggest').every(c => c.frame === 'fit' && c.framing === 'suggested' && !c.brand.logo)).toBe(true)
})

test('dubbing follows its level: to review (Draft), made with Undo (Act), only suggested (Suggest)', () => {
  const cut = (lv: 'suggest' | 'draft' | 'act') => done(run(level(initialState(), 'juno-dub', lv), { type: 'core/fire', eventId: 'ev-video-gr20' }))
  const draft = cut('draft')
  const c = draft.video.clips.find(x => x.source === 'gr20')!
  expect(c.audio).toMatchObject({ dubs: ['fr', 'de'], review: ['fr', 'de'] })
  const ok = run(draft, { type: 'video/approveDub', id: c.id, lang: 'fr' })
  expect(clipOf(ok, c.id).audio.review).toEqual(['de'])

  let act = cut('act')
  const line = act.log.find(l => l.dubs)!
  expect(act.video.clips.filter(x => x.source === 'gr20').every(x => x.audio.dubs.length === 2 && !x.audio.review?.length)).toBe(true)
  act = run(act, { type: 'core/undo', id: line.id })
  expect(act.video.clips.filter(x => x.source === 'gr20').every(x => x.audio.dubs.length === 0)).toBe(true)

  expect(cut('suggest').video.clips.filter(x => x.source === 'gr20').every(x => x.audio.dubs.length === 0)).toBe(true)
})

test('a dub you ask for waits for review on Draft, and is ready on Act', () => {
  const id = 'clip-live-second'
  const draft = run(initialState(), { type: 'video/dub', id, lang: 'it' })
  expect(clipOf(draft, id).audio).toMatchObject({ lang: 'it', dubs: ['it'], review: ['it'] })
  const act = run(level(initialState(), 'juno-dub', 'act'), { type: 'video/dub', id, lang: 'it' })
  expect(clipOf(act, id).audio.review ?? []).toEqual([])
})

test('a guest without a signed release holds the clip, with the reason; recording the release lets it go', () => {
  let s = done(run(initialState(), { type: 'core/fire', eventId: 'ev-video-gr20' }))
  s = run(s, { type: 'video/send', ids: ['clip-gr20-refuge'] })
  expect(s.video.clips.find(c => c.id === 'clip-gr20-refuge')?.status).toBe('ready')
  expect(s.notice?.text).toMatch(/Hugo is on screen without a signed release/)
  s = run(s, { type: 'video/release', person: 'hugo', signed: true }, { type: 'video/send', ids: ['clip-gr20-refuge'] })
  expect(s.video.clips.find(c => c.id === 'clip-gr20-refuge')?.status).toBe('sent')
})

test('five clips per video per week: Juno sends the best and says why the others wait', () => {
  // repair already has 2 out this week; 4 more found clips + 3 ready = 7 candidates for 3 places.
  let s = run(initialState(), { type: 'video/find', source: 'repair', query: 'stitches webbing bin carbon', len: 20, count: 4 })
  const ready = s.video.clips.filter(c => c.source === 'repair' && c.status === 'ready')
  expect(ready.length).toBeGreaterThan(3)
  s = run(s, { type: 'video/send', ids: ready.map(c => c.id) })
  expect(s.video.clips.filter(c => c.source === 'repair' && (c.status === 'sent' || c.status === 'published'))).toHaveLength(5)
  expect(s.log[0].text).toMatch(/5 clips from this video already go out this week/)
})

test('length per network: a 70 s clip goes to LinkedIn only, and loses Flow points only for the networks that cut it', () => {
  const s0 = initialState()
  const c = s0.video.clips.find(x => x.id === 'clip-repair-twenty')!
  const t = TRANSCRIPT.repair
  const long = { ...c, end: t.sentences[27].e }
  const dur = clipLengthOf(long, t)
  expect(dur).toBeGreaterThan(60)
  expect(dur).toBeLessThan(90)
  expect(clipPosts2(long, s0.publishing.posts, now(s0), () => 'x', dur).map(p => p.network)).toEqual(['linkedin'])
  expect(rescore({ ...long, post: { ...long.post, networks: ['linkedin'] } }, t).reasons.flow).not.toMatch(/longer than/)
  expect(rescore(long, t).reasons.flow).toMatch(/longer than 60 s, TikTok and Reels cut it off/)
})

test('a sent clip becomes Published at its posts’ time, with numbers, and good news when it beats its network', () => {
  let s = run(initialState(), { type: 'video/send', ids: ['clip-live-zips'] })
  const last = Math.min(...s.publishing.posts.filter(p => p.media === 'clip:clip-live-zips').map(p => p.at))
  s = run(s, { type: 'core/heartbeat' })
  expect(s.video.clips.find(c => c.id === 'clip-live-zips')?.status).toBe('sent')
  s = run(later(s, last - now(s) + 1000), { type: 'core/heartbeat' })
  const c = s.video.clips.find(x => x.id === 'clip-live-zips')!
  expect(c.status).toBe('published')
  expect(c.stats!.views).toBeGreaterThan(0)
  // Iris's numbers: the same as Insights, Chat and ⌘K read.
  expect(c.stats).toEqual(irisClipPerf(s, c.id, rescore(c, TRANSCRIPT.live).total))
  expect(s.log.some(l => l.text.startsWith('“Zips break, not fabric” is out:'))).toBe(true)
  const news = s.handoffs.find(h => h.ref === 'clip-live-zips')
  expect(news?.kind).toBe('news')
  expect(news?.title).toContain(`${(c.stats!.views / 1000).toFixed(1)}k views`)
})

test('the score learns: published clips of the same pillar move the total, and the closest one is cited', () => {
  let s = initialState()
  const strap = () => s.video.clips.find(c => c.id === 'clip-repair-strap')!
  // “Most brands…” (Repair & care, published, 48.2k) against TikTok's usual reach.
  expect(strap().track?.like?.id).toBe('clip-repair-brands')
  const before = rescore(strap(), TRANSCRIPT.repair).total
  expect(before - rescore({ ...strap(), track: undefined }, TRANSCRIPT.repair).total).toBe(strap().track!.delta)
  // A Gear that lasts clip going out big lifts the other Gear that lasts clips once it's published.
  s = run(s, { type: 'video/send', ids: ['clip-live-zips'] })
  const first = Math.min(...s.publishing.posts.filter(p => p.media === 'clip:clip-live-zips').map(p => p.at))
  s = run(later(s, first - now(s) + 1000), { type: 'core/heartbeat' })
  expect(s.video.clips.find(c => c.id === 'clip-live-bottle')?.track?.like?.id).toBe('clip-live-zips')
})

test('covers follow the reframe level: Juno picks one (Act, Draft), only suggests (Suggest); never a frame with Hugo', () => {
  const cut = (lv: 'suggest' | 'draft' | 'act') => done(run(level(initialState(), 'juno-reframe', lv), { type: 'core/fire', eventId: 'ev-video-gr20' })).video.clips.filter(c => c.source === 'gr20')
  const act = cut('act')
  expect(act.every(c => c.cover?.by === 'juno')).toBe(true)
  expect(act.every(c => c.cover!.at >= 6)).toBe(true)
  expect(act.find(c => c.post.networks.includes('youtube'))?.ytTitle).toMatch(/#Shorts$/)
  expect(cut('suggest').every(c => !c.cover)).toBe(true)
  expect(initialState().video.clips.find(c => c.id === 'clip-repair-strap')?.cover?.by).toBe('juno')
})

test('versions follow the reframe level: built on Act and Draft, not on Suggest', () => {
  const cut = (lv: 'suggest' | 'draft' | 'act') => done(run(level(initialState(), 'juno-reframe', lv), { type: 'core/fire', eventId: 'ev-video-gr20' })).video.clips.filter(c => c.source === 'gr20')
  expect(cut('act').find(c => c.post.networks.includes('linkedin'))?.versions?.linkedin?.aspect).toBe('1:1')
  expect(cut('draft').every(c => c.versions)).toBe(true)
  expect(cut('suggest').every(c => !c.versions)).toBe(true)
})

test('posts carry the pillar label, and Sage’s running campaign when it already has posts of that pillar', () => {
  let s = run(initialState(), { type: 'video/send', ids: ['clip-live-zips', 'clip-repair-strap'] })
  const zips = s.publishing.posts.filter(p => p.media === 'clip:clip-live-zips')
  expect(zips.every(p => p.labels?.[0] === 'Gear that lasts' && p.campaign === 'Trail Week' && p.campaignId === 'trail-week')).toBe(true)
  const strap = s.publishing.posts.filter(p => p.media === 'clip:clip-repair-strap')
  expect(strap.every(p => p.labels?.[0] === 'Repair & care' && !p.campaign)).toBe(true)
  s = run(s, { type: 'core/undo', id: s.log[0].id })
  expect(s.publishing.posts.some(p => p.media === 'clip:clip-live-zips')).toBe(false)
})

test('language versions go out as their own posts: approved ones on Draft, all on Act; Undo takes them back', () => {
  const id = 'clip-live-zips'
  // Draft: French approved, German still to review.
  let s = run(initialState(), { type: 'video/dub', id, lang: 'fr' }, { type: 'video/dub', id, lang: 'de' }, { type: 'video/approveDub', id, lang: 'fr' }, { type: 'video/send', ids: [id] })
  const posts = s.publishing.posts.filter(p => p.media === `clip:${id}`)
  const fr = posts.filter(p => p.labels?.includes('French'))
  expect(fr.length).toBe(posts.length / 2)
  expect(posts.some(p => p.labels?.includes('German'))).toBe(false)
  expect(fr[0].text).not.toBe(posts.find(p => !p.labels?.includes('French'))!.text)
  expect(s.log[0].text).toMatch(/French version included\. German waits for your review\./)
  s = run(s, { type: 'core/undo', id: s.log[0].id })
  expect(s.publishing.posts.some(p => p.media === `clip:${id}`)).toBe(false)
  // Act: every language made goes.
  const act = run(level(initialState(), 'juno-dub', 'act'), { type: 'video/dub', id, lang: 'de' }, { type: 'video/send', ids: [id] })
  expect(act.publishing.posts.some(p => p.media === `clip:${id}` && p.labels?.includes('German'))).toBe(true)
})

test('the moderator can replay the GR20 upload once the feed played it, as long as none of its clips went out', () => {
  let s = done(run(initialState(), { type: 'core/fire', eventId: 'ev-video-gr20' }))
  expect(s.video.clips.filter(c => c.source === 'gr20' && c.status === 'ready')).toHaveLength(3)
  s = run(s, { type: 'core/fire', eventId: 'ev-video-gr20' })
  expect(s.video.sources.find(x => x.id === 'gr20')?.status).toBe('processing')
  expect(s.video.clips.some(c => c.source === 'gr20')).toBe(false)
  expect(s.handoffs.some(h => h.ref === 'gr20')).toBe(false)
  s = done(s)
  expect(s.video.clips.filter(c => c.source === 'gr20')).toHaveLength(3)
  // Once a clip went out, the upload is history.
  s = run(s, { type: 'video/send', ids: ['clip-gr20-dry'] }, { type: 'core/fire', eventId: 'ev-video-gr20' })
  expect(s.video.sources.find(x => x.id === 'gr20')?.status).toBe('ready')
})

test('“4 more moments” sets up the weekly quota: sending them all keeps 3 and says why', () => {
  let s = run(initialState(), { type: 'core/fire', eventId: 'ev-video-more' })
  const ready = s.video.clips.filter(c => c.source === 'repair' && c.status === 'ready').map(c => c.id)
  expect(ready.length).toBeGreaterThan(3)
  s = run(s, { type: 'video/send', ids: ready })
  expect(s.log[0].text).toMatch(/5 clips from this video already go out this week/)
})

/* ---------- Hook trials ---------- */

const DAY_MS = 24 * 3600_000

test('a hook trial: the clip leaves review for a day, the results raise a Draft card, approving uses the winner and sends it', () => {
  let s = run(initialState(), { type: 'video/trial', id: 'clip-repair-twenty' })
  expect(clipOf(s, 'clip-repair-twenty').status).toBe('trial')
  expect(clipOf(s, 'clip-repair-twenty').trial?.hooks).toEqual(['42 stitches. 20 minutes. €0.', 'This repair cost the owner nothing.'])
  s = run(later(s, DAY_MS + 1000), { type: 'core/heartbeat' })
  const c = clipOf(s, 'clip-repair-twenty')
  expect(c.status).toBe('ready')
  expect(c.trial?.held?.[0]).toBeGreaterThan(c.trial!.held![1])
  expect(s.video.trials).toHaveLength(3)
  const card = s.handoffs.find(h => h.topic === 'Hook trial')!
  expect(card.title).toMatch(/won the hook trial/)
  s = run(s, { type: 'core/resolve', id: card.id, decision: { kind: 'approve' } })
  expect(clipOf(s, 'clip-repair-twenty').status).toBe('sent')
  expect(clipOf(s, 'clip-repair-twenty').hook).toBe('42 stitches. 20 minutes. €0.')
})

test('the third win of a hook with a number proposes a Playbook rule once; adding it feeds the score, Undo takes it out', () => {
  let s = run(initialState(), { type: 'core/fire', eventId: 'ev-video-trial' })
  const card = s.handoffs.find(h => h.topic === 'Hook rule')!
  expect(card.context).toMatch(/won 3 of 3/)
  const before = rescore(clipOf(s, 'clip-live-zips'), TRANSCRIPT.live).total
  s = run(s, { type: 'core/resolve', id: card.id, decision: { kind: 'approve' } })
  expect(s.playbook.rules.some(r => r.text === 'Open clip hooks on a number')).toBe(true)
  // “Zips break, not fabric” opens on a question: the rule says so, and a numbered hook scores higher.
  const zips = clipOf(s, 'clip-live-zips')
  expect(rescore(zips, TRANSCRIPT.live).track?.why).toMatch(/Playbook says to open on a number/)
  expect(rescore({ ...zips, hook: '1,200 repairs taught us this.' }, TRANSCRIPT.live).total).toBe(rescore(zips, TRANSCRIPT.live).total + 3)
  expect(rescore(zips, TRANSCRIPT.live).total).toBe(before)
  s = run(s, { type: 'core/undo', id: s.log[0].id })
  expect(s.playbook.rules.some(r => r.text === 'Open clip hooks on a number')).toBe(false)
  // Juno doesn't ask twice.
  s = run(s, { type: 'core/fire', eventId: 'ev-video-trial' })
  expect(s.handoffs.filter(h => h.topic === 'Hook rule')).toHaveLength(1)
})

test('on Act, Juno trials her best new clips alone (Undo stops them) and puts the winner on; on Suggest the result is only logged', () => {
  let s = level(initialState(), 'juno-trial', 'act')
  s = done(run(s, { type: 'core/fire', eventId: 'ev-video-gr20' }))
  const trialled = s.video.clips.filter(c => c.status === 'trial')
  expect(trialled.length).toBeGreaterThan(0)
  const line = s.log.find(l => l.trials)!
  const undone = run(s, { type: 'core/undo', id: line.id })
  expect(undone.video.clips.filter(c => c.status === 'trial')).toHaveLength(0)
  s = run(later(s, DAY_MS + 1000), { type: 'core/heartbeat' })
  const won = clipOf(s, trialled[0].id)
  expect(won.hook).toBe(won.trial!.hooks[won.trial!.held![1] > won.trial!.held![0] ? 1 : 0])
  expect(s.handoffs.some(h => h.topic === 'Hook trial')).toBe(false)

  let q = level(initialState(), 'juno-trial', 'suggest')
  q = run(q, { type: 'core/fire', eventId: 'ev-video-trial' })
  expect(q.handoffs.some(h => h.topic === 'Hook trial')).toBe(false)
  expect(q.log[0].text).toMatch(/Pick the hook in the editor|Hook trial on/)
})

test('only a clip waiting for review, going to Instagram, can be trialled', () => {
  const s = run(initialState(), { type: 'video/trial', id: 'clip-live-bottle' })
  expect(clipOf(s, 'clip-live-bottle').status).toBe('trial')
  // Already sent, TikTok only: no trial.
  const t = run(initialState(), { type: 'video/trial', id: 'clip-repair-unpick' })
  expect(clipOf(t, 'clip-repair-unpick').status).toBe('sent')
})

/* ---------- Recut ---------- */

test('a published clip under half its network’s average: on Draft Juno recuts it, product first, and asks before Atlas posts it', () => {
  let s = run(initialState(), { type: 'core/fire', eventId: 'ev-video-recut' })
  const r = clipOf(s, 'clip-live-fabric-recut')
  expect(r.status).toBe('ready')
  expect(r.recutOf).toBe('clip-live-fabric')
  expect(r.broll[0]).toMatchObject({ at: clipOf(s, 'clip-live-fabric').start, dur: 2 })
  expect(r.hook).toBe('The bag outlives the small parts.')
  const card = s.handoffs.find(h => h.topic === 'Recut')!
  expect(card.context).toMatch(/8\.4k views on TikTok/)
  // Only once.
  expect(run(s, { type: 'core/fire', eventId: 'ev-video-recut' }).handoffs.filter(h => h.topic === 'Recut')).toHaveLength(1)
  s = run(s, { type: 'core/resolve', id: card.id, decision: { kind: 'approve' } })
  expect(clipOf(s, 'clip-live-fabric-recut').status).toBe('sent')
  s = run(s, { type: 'core/undo', id: s.log[0].id })
  expect(clipOf(s, 'clip-live-fabric-recut').status).toBe('ready')
  // Rejecting the card drops the new cut.
  const t = run(initialState(), { type: 'core/fire', eventId: 'ev-video-recut' })
  const no = run(t, { type: 'core/resolve', id: t.handoffs.find(h => h.topic === 'Recut')!.id, decision: { kind: 'reject' } })
  expect(no.video.clips.some(c => c.id === 'clip-live-fabric-recut')).toBe(false)
})

test('recut on Act: made and sent alone, Undo takes it out; on Suggest only a journal line, you recut it', () => {
  let s = run(level(initialState(), 'juno-recut', 'act'), { type: 'core/fire', eventId: 'ev-video-recut' })
  expect(clipOf(s, 'clip-live-fabric-recut').status).toBe('sent')
  const line = s.log.find(l => l.recuts)!
  s = run(s, { type: 'core/undo', id: line.id })
  expect(s.video.clips.some(c => c.id === 'clip-live-fabric-recut')).toBe(false)
  expect(s.publishing.posts.some(p => p.media === 'clip:clip-live-fabric-recut')).toBe(false)

  let q = run(level(initialState(), 'juno-recut', 'suggest'), { type: 'core/fire', eventId: 'ev-video-recut' })
  expect(q.video.clips.some(c => c.recutOf)).toBe(false)
  q = run(q, { type: 'video/recut', id: 'clip-live-fabric' })
  expect(clipOf(q, 'clip-live-fabric-recut').status).toBe('ready')
})
