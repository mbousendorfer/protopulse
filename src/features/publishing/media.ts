// The library's upkeep: tags (Atlas's at upload, yours after), search, and licences that end.
import type { State } from '../../app/state'
import { DAY } from '../../app/time'
import { MEDIA, pillarFamily, type Media, type Post } from '../../data/publishing'
import { libraryOf, usable } from './visuals'

const PILLAR_TAG: Record<Post['pillar'], string> = { 'Repair & care': 'Repair', 'Gear that lasts': 'Product', 'Trail stories': 'Trail', Community: 'UGC' }

/** Tags Atlas gives an upload: the library's tags its file name mentions, the pillar of the post it illustrates, and Upload. */
export function tagsFor(title: string, post?: Post): string[] {
  const words = title.toLowerCase()
  const known = [...new Set(MEDIA.flatMap(m => m.tags))].filter(t => words.includes(t.toLowerCase()) || words.includes(t.toLowerCase().replace(/s$/, '')))
  return [...new Set([...known, ...(post ? [PILLAR_TAG[pillarFamily(post.pillar)]] : []), 'Upload'])]
}

/** Media matching a search: title, tags or rights. */
export const search = (list: Media[], q: string) => {
  const t = q.trim().toLowerCase()
  return t ? list.filter(m => `${m.title} ${m.tags.join(' ')} ${m.rights}`.toLowerCase().includes(t)) : list
}

/** When a creator licence ends: the last day of the month it names. */
export function licenceEnds(m: Media): number | undefined {
  const u = m.rights.match(/until (\w{3}) (\d{4})/)
  if (!u) return
  const d = new Date(`1 ${u[1]} ${u[2]}`)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59).getTime()
}

export type Expiring = { media: Media; ends: number; posts: Post[]; swap?: Media }
const SOON = 60 * DAY

/** Licences ending within 60 days that a post still to go out uses, with the photo Atlas would put instead. */
export function expiring(s: State, now: number): Expiring[] {
  const lib = libraryOf(s)
  return lib.flatMap(m => {
    const ends = licenceEnds(m)
    if (!ends || ends - now > SOON || ends < now) return []
    const posts = s.publishing.posts.filter(p => p.media === m.name && p.at > now && ['scheduled', 'needs', 'unapproved', 'paused'].includes(p.status))
    if (!posts.length) return []
    const swap = lib.filter(x => x.name !== m.name && usable(x, now) && !licenceEnds(x)).map(x => ({ x, n: x.tags.filter(t => m.tags.includes(t)).length })).sort((a, b) => b.n - a.n || a.x.used - b.x.used)[0]?.x
    return [{ media: m, ends, posts, swap }]
  })
}

const handled = (s: State, name: string) =>
  s.handoffs.some(h => h.topic === 'Licence' && h.ref === name) || s.desk.done.some(x => x.h?.topic === 'Licence' && x.h.ref === name)
  || s.log.some(l => l.restore?.some(h => h.topic === 'Licence' && h.ref === name))

/** Licences Atlas hasn't raised yet. */
export const licencesToRaise = (s: State, now: number) => expiring(s, now).filter(e => e.swap && !handled(s, e.media.name))
