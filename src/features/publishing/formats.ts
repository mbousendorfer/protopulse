// Per network: the post's format and its first comment, both pre-filled by Atlas.
import type { Network } from '../../app/types'
import type { Pillar, Post } from '../../data/publishing'
import { withLabels } from './labels'
import { routeAccount } from './accounts'

export type Format = NonNullable<Post['format']>
export const FORMATS: Partial<Record<Network, Format[]>> = {
  instagram: ['post', 'carousel', 'reel', 'story'], facebook: ['post', 'reel'], linkedin: ['post', 'document'],
  tiktok: ['video'], youtube: ['short', 'video'], x: ['post'],
}
export const FORMAT_LABEL: Record<Format, string> = { post: 'Post', carousel: 'Carousel', reel: 'Reel', story: 'Story', short: 'Short', video: 'Video', document: 'Document' }
/** Networks where a first comment can be published with the post. */
export const FIRST_COMMENT: Network[] = ['instagram', 'facebook', 'linkedin']
export const SIZE_GUIDE = 'fernway.co/size-guide'

/** The format Atlas picks: its planning label first ("Reel: …"), then what the caption describes, then the network's default. */
export function formatFor(network: Network, text: string): Format {
  const allowed = FORMATS[network] ?? ['post']
  const label = text.match(/^(carousel|reel|short|story)\s*:/i)?.[1].toLowerCase() as Format | undefined
  if (label && allowed.includes(label)) return label
  if (network === 'instagram' && /\b(story|poll)\b/i.test(text)) return 'story'
  if ((network === 'instagram' || network === 'facebook') && /\b(test|in \d+ seconds|watch|timed)\b/i.test(text)) return 'reel'
  if (network === 'instagram' && /\b\d+ (things|tips|ways|photos|steps)\b/i.test(text)) return 'carousel'
  return allowed[0]
}

const PRODUCT = /\b(ridge|bottle|storm jacket|jacket|fleece|summit)\b/i
/** A first comment Atlas suggests: the size guide on a product post, where the network allows a first comment. */
export function firstCommentFor(network: Network, text: string, pillar: Pillar): string | undefined {
  if (!FIRST_COMMENT.includes(network)) return
  if (PRODUCT.test(text) || pillar === 'Gear that lasts') return `Sizes, weights and specs: ${SIZE_GUIDE}`
}

/** Atlas fills what a post it writes doesn't say yet. */
export const withFormat = (p: Post): Post => withLabels({ ...p, account: routeAccount(p), format: p.format ?? formatFor(p.network, p.text), firstComment: p.firstComment ?? firstCommentFor(p.network, p.text, p.pillar) })
