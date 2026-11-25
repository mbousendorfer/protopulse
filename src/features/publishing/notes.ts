// Calendar notes: one line on a day. A quiet day (holiday, strike, mourning) is a day Atlas schedules nothing on.
import type { State } from '../../app/state'
import { DAY, T, hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import type { Post } from '../../data/publishing'

export type DayNote = { id: string; day: number; text: string; quiet: boolean }
export const startOfDay = (t: number) => new Date(new Date(t).setHours(0, 0, 0, 0)).getTime()
/** Words that make a note a quiet day by default. */
export const QUIET_WORDS = /\b(holiday|bank holiday|quiet|strike|mourning|closed|day off|no posts?)\b/i

/** The note seeded for Trail Week's first day (Mon 1 Dec). */
export const NOTES: DayNote[] = [{ id: 'note-tw', day: T(0, 0, 6), text: 'Trail Week starts', quiet: false }]

export const notesOn = (notes: DayNote[], t: number) => notes.filter(n => n.day === startOfDay(t))
export const isQuiet = (notes: DayNote[], t: number) => notesOn(notes, t).some(n => n.quiet)

/** A post Atlas places on a quiet day goes to the same time on the next day that isn't quiet, and says why. */
export function avoidQuiet(notes: DayNote[] = [], p: Post): Post {
  if (!isQuiet(notes, p.at)) return p
  let at = p.at + DAY
  while (isQuiet(notes, at)) at += DAY
  const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
  const why = notesOn(notes, p.at).find(n => n.quiet)!.text
  return { ...p, at, note: `${day(p.at)} is a quiet day (“${why}”), so Atlas moved it to ${day(at)}, ${hhmm(at)}.` }
}

/** Posts still going out on a quiet day: Atlas's to move. */
export const onQuietDays = (s: State): Post[] =>
  s.publishing.posts.filter(p => ['scheduled', 'needs', 'unapproved'].includes(p.status) && isQuiet(s.publishing.notes ?? [], p.at))

export const quietCardText = (posts: Post[], text: string) => ({
  title: `${posts.length} post${posts.length > 1 ? 's are' : ' is'} on a quiet day: “${text}”`,
  context: posts.map(p => `${hhmm(p.at)} ${NETWORK_LABEL[p.network]}`).join(' · '),
})
