import { expect, test } from 'vitest'
import { T } from '../../app/time'
import {
  applyAsk, captionAt, captionLines, clipPosts, duration, extend, fillers, findMoments, keptSegments, playableAt, removeFillers, rescore,
  silences, toClipTime, toSourceTime, toSRT, type Clip, type Transcript, type Word,
} from './model'

/** A small transcript: each word lasts 0.3 s with 0.1 s between words; `pause` is the silence before a sentence. */
function make(spec: { text: string; pause?: number; filler?: number[]; fr?: string }[]): Transcript {
  const words: Word[] = []
  const sentences: Transcript['sentences'] = []
  let at = 0
  spec.forEach((sp, si) => {
    at += sp.pause ?? 0.1
    const s = at
    sp.text.split(' ').forEach((w, k) => { words.push({ i: words.length, w, s: at, e: at + 0.3, sent: si, ...(sp.filler?.includes(k) ? { filler: true } : {}) }); at += 0.4 })
    sentences.push({ i: si, s, e: at - 0.1, text: sp.text, tr: sp.fr ? { fr: sp.fr } : {} })
  })
  return { duration: at, sentences, words, shots: [{ s: 0, e: at, label: 'Workshop', focus: 0.5 }] }
}

const t = make([
  { text: 'Um, so this strap tore after 3 years.', filler: [0] },
  { text: 'We fixed it in twenty minutes.', pause: 1.2, fr: 'On l’a réparée en vingt minutes.' },
  { text: 'Every Ridge comes with a lifetime repair.' },
  { text: 'Send it to Annecy and we stitch it back.', pause: 0.8 },
])

const clip = (over: Partial<Clip> = {}): Clip => ({
  id: 'c1', source: 's1', title: 'The strap', hook: 'It tore. We fixed it.', hooks: [], start: 0, end: t.duration, cut: [], trimGaps: false, fixes: {}, overdub: {},
  base: { hook: 80, flow: 80, value: 80, trend: 60 }, why: '', evidence: [], aspect: '9:16', frame: 'track',
  captions: { template: 'highlight', font: 'sans', size: 7, y: 70, perLine: 3, color: 'sun', emoji: false, upper: false },
  broll: [], brand: { logo: true, progress: true, intro: false, outro: false, musicVol: 20, duck: true }, audio: { studio: false, lang: 'en', dubs: [] },
  post: { networks: ['tiktok', 'instagram'], text: {} }, pillar: 'Repair & care', status: 'ready', arrivedAt: 0, ...over,
})

test('cutting a word splits the playback; the removed range is skipped and the clip gets shorter', () => {
  const whole = keptSegments(clip(), t)
  const cutOne = keptSegments(clip({ cut: [3] }), t)
  expect(cutOne.length).toBe(whole.length + 1)
  expect(duration(cutOne)).toBeLessThan(duration(whole))
  const w3 = t.words[3]
  const jump = playableAt(cutOne, (w3.s + w3.e) / 2)!
  expect(jump).toBeGreaterThanOrEqual(w3.e)
  expect(playableAt(cutOne, t.duration + 1)).toBeNull()
})

test('clip time and source time round-trip inside what plays', () => {
  const segs = keptSegments(clip({ cut: [3, 4] }), t)
  for (const x of [0.5, 2, 4.2, 7]) expect(toClipTime(segs, toSourceTime(segs, x))).toBeCloseTo(x, 5)
})

test('remove fillers cuts the um, remove silences tightens the long pause, and the score goes up', () => {
  const c = clip()
  expect(fillers(c, t).map(w => w.w)).toEqual(['Um,'])
  expect(silences(c, t).length).toBe(2)
  const clean = { ...removeFillers(c, t), trimGaps: true }
  expect(fillers(clean, t)).toEqual([])
  expect(silences(clean, t)).toEqual([])
  expect(duration(keptSegments(clean, t))).toBeLessThan(duration(keptSegments(c, t)) - 1.5)
  const before = rescore(c, t), after = rescore(clean, t)
  expect(before.reasons.hook).toMatch(/filler/)
  expect(after.total).toBeGreaterThan(before.total)
})

test('captions: lines of N words, never across sentences, with caption-only fixes and the active word', () => {
  const lines = captionLines(clip({ fixes: { 6: '3-year-old' } }), t)
  expect(lines.every(l => l.words.length <= 3)).toBe(true)
  expect(lines.map(l => l.words.map(w => w.text).join(' ')).join(' / ')).toContain('3-year-old')
  const second = lines[1]
  const { line, active } = captionAt(lines, second.words[1].s + 0.05)
  expect(line).toBe(second)
  expect(active).toBe(1)
  expect(toSRT(lines.slice(0, 1))).toMatch(/^1\n00:00:00,\d{3} --> 00:00:01,\d{3}\nUm, so this\n$/)
})

test('a dub shows the translated sentence over the time of the original sentence', () => {
  const c = clip({ audio: { studio: false, lang: 'fr', dubs: ['fr'] } })
  const lines = captionLines(c, t)
  expect(lines.map(l => l.words.map(w => w.text).join(' ')).join(' ')).toBe('On l’a réparée en vingt minutes.')
  const segs = keptSegments(c, t)
  expect(lines[0].s).toBeCloseTo(toClipTime(segs, t.sentences[1].s), 5)
})

test('extend moves an edge to the neighbouring sentence', () => {
  const mid = clip({ start: t.sentences[1].s, end: t.sentences[2].e })
  expect(extend(mid, t, 'start', -1).start).toBe(t.sentences[0].s)
  expect(extend(mid, t, 'end', 1).end).toBe(t.sentences[3].e)
  expect(extend(mid, t, 'end', -1).end).toBe(t.sentences[1].e)
})

test('find clips about a topic: the sentence that says it, widened to the length asked', () => {
  const [m] = findMoments(t, 'moments about lifetime repair', 6, 2)
  expect(m.sentence).toBe(2)
  expect(m.start).toBeLessThanOrEqual(t.sentences[2].s)
  expect(m.end - m.start).toBeGreaterThan(4)
  expect(findMoments(t, 'snowboard', 20, 3)).toEqual([])
})

test('Ask Juno: shorter, start on a moment, French, and a frank refusal to change words', () => {
  const c = clip()
  const short = applyAsk(c, t, 'a 10 s version')
  expect(short.changed).toBe(true)
  expect(short.clip.end).toBeLessThan(c.end)
  const open = applyAsk(clip({ start: t.sentences[1].s }), t, 'Start with the strap')
  expect(open.clip.start).toBe(t.sentences[0].s)
  const fr = applyAsk(c, t, 'Make the French version')
  expect(fr.clip.audio).toMatchObject({ lang: 'fr', dubs: ['fr'] })
  const no = applyAsk(c, t, 'make her say forty instead of twenty')
  expect(no.changed).toBe(false)
  expect(no.reply).toMatch(/won’t change what someone says/)
})

test('a clip becomes one scheduled post per network at a future slot, pointing back at the clip', () => {
  const now = T(8, 12)
  const posts = clipPosts(clip(), [], now, (() => { let n = 0; return () => `p${n++}` })())
  expect(posts.map(p => p.network)).toEqual(['tiktok', 'instagram'])
  expect(posts.every(p => p.at > now && p.media === 'clip:c1' && p.status === 'scheduled')).toBe(true)
})
