// Product discovery: "which jacket is that?" → Nova finds the product, answers in public and sends the link in DM.
import type { State } from '../../app/state'
import type { Handoff } from '../../app/types'
import type { Network } from '../../app/types'
import { shown, track } from '../publishing/links'

/** The catalog Nova matches against: same names and prices as the Playbook facts (Shopify catalog). */
export const CATALOG = [
  { name: 'Storm Jacket', price: 220, url: 'fernway.co/storm-jacket', what: 'a waterproof shell', re: /storm|jacket|shell|rain/i, pitch: 'fully waterproof and PFC-free' },
  { name: 'Ember Fleece', price: 95, url: 'fernway.co/ember-fleece', what: 'a fleece, not a rain shell', re: /fleece|ember|jacket|layer|warm/i, pitch: 'recycled fleece, sizes XS to XXL' },
  { name: 'Ridge 28L', price: 140, url: 'fernway.co/ridge-28l', what: 'a 28-litre bag', re: /ridge|bag|pack|backpack/i, pitch: 'cabin-size and repairable for life' },
  { name: 'Summit Bottle', price: 35, url: 'fernway.co/summit-bottle', what: 'a steel bottle', re: /bottle|summit|flask/i, pitch: 'stainless steel, BPA-free lid' },
] as const
export type Product = (typeof CATALOG)[number]

/** Every Nova DM link carries the same UTM, by Atlas's convention: Iris counts them under "nova-dms". */
export const DM_PILLAR = 'Nova DMs'

export type Discovery = { name: string; price: number; match: number; link: string; utm: string; other?: { name: string; why: string }; offer?: string }

/**
 * The product a question is about: named in the post it's under (sure), or only in the question (less sure).
 * The runner-up is the next product the question's words also fit, with why it isn't that one.
 */
export function productFor(text: string, post: string | undefined, network: Network): Discovery | undefined {
  const inPost = post ? CATALOG.find(p => post.includes(p.name)) : undefined
  const fits = CATALOG.filter(p => p.re.test(text))
  const best = inPost ?? fits[0]
  if (!best) return
  const other = fits.find(p => p.name !== best.name)
  const l = track(best.url, { network, pillar: DM_PILLAR })!
  return {
    name: best.name, price: best.price, match: inPost ? 92 : 64, link: shown(l), utm: l.utm?.utm_campaign ?? '',
    other: other && { name: other.name, why: `${other.what}` },
  }
}

/** The live campaign's offer, if Sage set one (`offer` on the campaign). Nova never makes one up. */
export function liveOffer(s: State): { campaign: string; offer: string } | undefined {
  const c = s.strategy.campaigns.find(x => x.status === 'live' && (x as { offer?: string }).offer) as { name: string; offer?: string } | undefined
  return c?.offer ? { campaign: c.name, offer: c.offer } : undefined
}

/** A "which product is it?" card, filled at arrival: product, link, offer, public line and DM. */
export function discover(s: State, h: Omit<Handoff, 'id' | 'at'>): Omit<Handoff, 'id' | 'at'> {
  const p = h.preview?.type === 'reply' ? h.preview : undefined
  if (!p || !h.conv) return h
  const d = productFor(p.text, h.conv.post, p.network)
  if (!d) return h
  const first = p.author.replace(/^@/, '').split(/[\s._·]/)[0]
  const name = first.charAt(0).toUpperCase() + first.slice(1)
  const pitch = CATALOG.find(x => x.name === d.name)!.pitch
  const offer = liveOffer(s)
  const pub = `It’s the ${d.name}, ${name}! I’ve sent you the link in DM.`
  const dm = `Here it is, ${name}: ${d.link}. The ${d.name} is €${d.price}, ${pitch}.${offer ? ` ${offer.campaign}: ${offer.offer}.` : ''}`
  return {
    ...h,
    sources: [
      { label: `${d.name} · €${d.price} · ${d.match}% match`, from: 'Shopify catalog' },
      ...(d.other ? [{ label: `Not the ${d.other.name}: ${d.other.why}`, from: 'Other candidate' }] : []),
      ...(offer ? [{ label: `${offer.offer}`, from: `${offer.campaign} (Sage)` }] : []),
    ],
    conv: { ...h.conv, reply: pub, dm, product: { ...d, offer: offer?.offer } },
    preview: { ...p, draft: [pub] },
  }
}
