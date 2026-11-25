// Tracked links: Atlas adds the UTM parameters and a short link, by one convention, per network.
import type { Network } from '../../app/types'
import type { Post } from '../../data/publishing'

export type TrackedLink = NonNullable<Post['link']>
/** Atlas's convention, shown in the composer: utm_source = network, utm_medium = social, utm_campaign = campaign, else pillar. */
export const UTM_CONVENTION = 'utm_source = network · utm_medium = social · utm_campaign = campaign, or the pillar'
const ABBR: Partial<Record<Network, string>> = { instagram: 'ig', tiktok: 'tt', linkedin: 'li', facebook: 'fb', youtube: 'yt', x: 'x' }
const slug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const initials = (t: string) => slug(t).split('-').map(w => w[0]).join('').slice(0, 4)
export const clean = (url: string) => url.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')

/** Networks that refuse or flag redirects keep the plain link (X refused fwy.link on 25 Nov). */
export const PLAIN_ONLY: Network[] = ['x']
/** Instagram captions don't make links clickable: the link goes in the first comment. */
export const LINK_IN_COMMENT: Network[] = ['instagram']

export function track(url: string, p: Pick<Post, 'network' | 'campaign' | 'pillar'>): TrackedLink | undefined {
  const u = clean(url)
  if (!u) return
  const utm = { utm_source: p.network, utm_medium: 'social', utm_campaign: slug(p.campaign ?? p.pillar) }
  return { url: u, utm, short: PLAIN_ONLY.includes(p.network) ? undefined : `fwy.link/${initials(p.campaign ?? p.pillar)}-${ABBR[p.network] ?? p.network}` }
}

/** What the audience sees: the short link, or the plain one. */
export const shown = (l: TrackedLink) => l.short ?? l.url
export const query = (l: TrackedLink) => Object.entries(l.utm ?? {}).map(([k, v]) => `${k}=${v}`).join('&')

/** The caption as published: the link at the end, except where it goes in the first comment. */
export const captionOf = (p: Pick<Post, 'text' | 'network' | 'link'>) =>
  p.link && !LINK_IN_COMMENT.includes(p.network) && !p.text.includes(shown(p.link)) ? `${p.text} ${shown(p.link)}` : p.text
export const commentOf = (p: Pick<Post, 'firstComment' | 'network' | 'link'>) =>
  p.link && LINK_IN_COMMENT.includes(p.network) ? [p.firstComment, shown(p.link)].filter(Boolean).join(' · ') : p.firstComment
