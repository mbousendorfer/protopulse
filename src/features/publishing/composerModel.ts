// The composer's rules that don't need React: threads, visuals per network, per-network options, hashtags, mentions.
import type { Network } from '../../app/types'
import { pillarFamily, type Pillar, type Post } from '../../data/publishing'
import { CONTACTS } from '../../data/inbox'
import type { Format } from './formats'

export type Asset = NonNullable<Post['assets']>[number]
export type Options = NonNullable<Post['options']>

/** `media` stays the first visual, so the calendar, previews and older code keep reading one image. */
export const mediaOf = (assets: Asset[]) => assets[0]?.src
export const assetsOf = (p: Pick<Post, 'assets' | 'media'>): Asset[] => p.assets ?? (p.media ? [{ src: p.media }] : [])

/** How many visuals each network takes in one post. */
export const MAX_VISUALS: Record<Network, number> = { instagram: 10, facebook: 10, linkedin: 10, x: 4, tiktok: 1, youtube: 1 } as Record<Network, number>
export const maxVisuals = (n: Network) => MAX_VISUALS[n] ?? 1

/** The crop each network and format applies to a visual, said in a hint. Undefined: shown as it is. */
export function cropOf(n: Network, f: Format): string | undefined {
  if (f === 'reel' || f === 'story' || f === 'short' || n === 'tiktok') return '9:16'
  if (n === 'instagram') return '4:5'
  if (n === 'youtube') return '16:9'
}

/** Splits a caption into posts of `max` characters, at sentence then word boundaries. Numbered "1/3" when more than one. */
export function splitThread(text: string, max = 280): string[] {
  const t = text.trim()
  if (!t) return []
  if (t.length <= max) return [t]
  const room = max - 6 // " 10/10"
  const words = t.split(/\s+/)
  const parts: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length <= room) { cur = next; continue }
    // End the post at the last sentence break if there is one past half the room.
    const cut = Math.max(cur.lastIndexOf('. '), cur.lastIndexOf('! '), cur.lastIndexOf('? '))
    if (cut > room / 2) { parts.push(cur.slice(0, cut + 1)); cur = `${cur.slice(cut + 2)} ${w}`.trim() }
    else { if (cur) parts.push(cur); cur = w.slice(0, room) }
  }
  if (cur) parts.push(cur)
  return parts.map((p, i) => `${p} ${i + 1}/${parts.length}`)
}

/* ---------- Per-network options ---------- */

type Field = { key: string; label: string; kind: 'text' | 'switch' | 'choice'; choices?: string[]; required?: boolean; hint?: string; max?: number; when?: (f: Format) => boolean }

/** What each network asks beyond the caption, in Agorapulse's words. */
export const OPTION_FIELDS: Partial<Record<Network, Field[]>> = {
  instagram: [
    { key: 'collaborators', label: 'Collaborators', kind: 'text', hint: 'Up to 3 handles, they accept in the app' },
    { key: 'location', label: 'Location', kind: 'text' },
    { key: 'people', label: 'Tag people', kind: 'text', hint: 'Handles, separated by commas' },
    { key: 'shareToFeed', label: 'Also share to feed', kind: 'switch', when: f => f === 'reel' },
  ],
  tiktok: [
    { key: 'privacy', label: 'Who can view', kind: 'choice', choices: ['Public', 'Friends', 'Only me'] },
    { key: 'comments', label: 'Allow comments', kind: 'switch' },
    { key: 'duet', label: 'Allow Duet', kind: 'switch' },
    { key: 'stitch', label: 'Allow Stitch', kind: 'switch' },
    { key: 'branded', label: 'Branded content', kind: 'switch', hint: 'TikTok labels it “Paid partnership”' },
  ],
  youtube: [
    { key: 'title', label: 'Title', kind: 'text', required: true, max: 100 },
    { key: 'privacy', label: 'Visibility', kind: 'choice', choices: ['Public', 'Unlisted', 'Private'] },
    { key: 'category', label: 'Category', kind: 'choice', choices: ['Travel & Events', 'Sports', 'Howto & Style', 'People & Blogs'] },
    { key: 'tags', label: 'Tags', kind: 'text', hint: 'Separated by commas' },
    { key: 'playlist', label: 'Playlist', kind: 'choice', choices: ['None', 'Trail stories', 'Repair how-tos', 'Gear reviews'] },
    { key: 'kids', label: 'Made for kids', kind: 'switch' },
  ],
  linkedin: [{ key: 'docTitle', label: 'Document title', kind: 'text', required: true, when: f => f === 'document' }],
  facebook: [{ key: 'location', label: 'Location', kind: 'text' }],
}

/** Defaults the network applies when you don't touch them. */
export const OPTION_DEFAULTS: Partial<Record<Network, Options>> = {
  tiktok: { privacy: 'Public', comments: true, duet: true, stitch: true, branded: false },
  youtube: { privacy: 'Public', category: 'Travel & Events', playlist: 'None', kids: false },
  instagram: { shareToFeed: true },
}

export const fieldsFor = (n: Network, f: Format) => (OPTION_FIELDS[n] ?? []).filter(x => !x.when || x.when(f))
export const optionsWith = (n: Network, o: Options = {}): Options => ({ ...OPTION_DEFAULTS[n], ...o })

/** Required fields left empty: "YouTube title". */
export const missingOptions = (n: Network, f: Format, o: Options = {}) =>
  fieldsFor(n, f).filter(x => x.required && !String(o[x.key] ?? '').trim()).map(x => x.label.toLowerCase())

/* ---------- Toolbar ---------- */

export const EMOJIS = ['🏔️', '🥾', '🎒', '⛺', '🌲', '🌄', '🧭', '🔥', '💧', '🧵', '🔧', '♻️', '✨', '👏', '🙌', '💚', '📍', '📸', '👉', '✅']

/** Saved hashtag sets, one per pillar family; Atlas adds the running campaign's. */
export const HASHTAGS: Record<string, string[]> = {
  'Trail stories': ['#TourDuMontBlanc', '#Hiking', '#TrailLife'],
  'Gear that lasts': ['#BuyItForLife', '#Backpacking', '#Fernway'],
  'Repair & care': ['#RepairNotReplace', '#GearCare', '#Fernway'],
  Community: ['#FernwayCommunity', '#HikeWithUs', '#Outdoors'],
}
export const hashtagsFor = (p: Pillar) => HASHTAGS[pillarFamily(p)]

/** People you can @mention: Inbox contacts, each with the networks where the handle exists. */
export const MENTIONS = CONTACTS.flatMap(c => c.handles.map(h => ({ name: c.name, handle: h.handle, network: h.network })))

/** Networks where a mention stays plain text (the handle doesn't exist there). */
export const plainOn = (handle: string, networks: Network[]) =>
  networks.filter(n => !MENTIONS.some(m => m.handle === handle && m.network === n))

/** Inserts `add` at the caret of `value`, with a space before when needed. Returns the new value and caret. */
export function insertAt(value: string, start: number, end: number, add: string) {
  const before = value.slice(0, start)
  const pre = before && !/\s$/.test(before) ? ' ' : ''
  const next = `${before}${pre}${add}${value.slice(end)}`
  return { value: next, caret: start + pre.length + add.length }
}
