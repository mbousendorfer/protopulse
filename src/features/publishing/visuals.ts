// Visuals: which posts wait for one, and which library photo Atlas would use. Atlas never uses stock photos.
import type { State } from '../../app/state'
import type { Handoff } from '../../app/types'
import { MEDIA, type Media, type Pillar, type Post, pillarFamily } from '../../data/publishing'

/** The library: what you uploaded first, then the seeded photos. */
export const libraryOf = (s: State): Media[] =>
  [...(s.publishing.uploads ?? []), ...MEDIA].map(m => (s.publishing.mediaTags?.[m.id] ? { ...m, tags: s.publishing.mediaTags[m.id] } : m))

/** The Desk card asking for this post's visual, if one is open. */
export const visualCardOf = (s: State, p: Post): Handoff | undefined =>
  s.handoffs.find(h => h.agent === 'atlas' && h.topic === 'Missing visual' && (h.id === p.handoff || h.ref === p.id))

/** Posts held for a visual: an open "Missing visual" card, or you said you'd upload one. */
export const waitingForVisual = (s: State): Post[] =>
  s.publishing.posts.filter(p => p.status === 'needs' && !p.media && (p.waiting === 'visual' || !!visualCardOf(s, p)))

const PILLAR_TAGS: Record<Pillar, string[]> = {
  'Repair & care': ['Repair', 'Behind the scenes'], 'Gear that lasts': ['Product'], 'Trail stories': ['Trail', 'Landscape'], Community: ['UGC'],
}
/** Rights Atlas can publish: ours, or a creator/UGC permission. A licence that ended before `now` is out. */
export function usable(m: Media, now: number) {
  if (/stock/i.test(m.rights)) return false
  const until = m.rights.match(/until (\w{3}) (\d{4})/)
  return !until || new Date(`1 ${until[1]} ${until[2]}`).getTime() + 31 * 86_400_000 > now
}
const words = (t: string) => new Set(t.toLowerCase().match(/[a-z]{4,}/g) ?? [])

/** The photo Atlas would pick for a post: same pillar tags, then shared words, least used first. Undefined if nothing fits. */
export function pickVisual(p: Post, library: Media[], now: number): Media | undefined {
  const tags = PILLAR_TAGS[pillarFamily(p.pillar)]
  const w = words(p.text)
  const score = (m: Media) => m.tags.filter(t => tags.includes(t)).length * 2 + [...words(`${m.title} ${m.tags.join(' ')}`)].filter(x => w.has(x) || w.has(`${x}s`) || w.has(x.replace(/s$/, ''))).length * 3
  const ranked = library.filter(m => usable(m, now)).map(m => ({ m, n: score(m) })).filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n || a.m.used - b.m.used)
  return ranked[0]?.m
}
