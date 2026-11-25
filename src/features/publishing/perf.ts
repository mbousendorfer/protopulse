// A published post's results against its network's median, and Atlas's reading of them.
import type { State } from '../../app/state'
import { NETWORK_LABEL } from '../../data/agents'
import type { Post } from '../../data/publishing'
import type { IdeaSeed } from '../../data/ideas'
import type { Network } from '../../app/types'
import { variantsOf } from './copilot'

const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); const m = a.length >> 1; return a.length ? (a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2) : 0 }
const round1 = (x: number) => Math.round(x * 10) / 10

export type Perf = { reach: number; er: number; medianReach: number; medianEr: number; ratio: number; worth: boolean; reading: string; to: Network }

/** Where a winner goes next: short video travels between TikTok and Instagram; the rest stays on its network. */
const RECYCLE_TO: Partial<Record<Network, Network>> = { tiktok: 'instagram', instagram: 'tiktok', youtube: 'tiktok' }

/** Numbers are Iris's (on the post). The median is over the other published posts of the same network. */
export function perfOf(s: State, p: Post): Perf | undefined {
  if (p.status !== 'published' || !p.stats) return
  const peers = s.publishing.posts.filter(x => x.id !== p.id && x.network === p.network && x.status === 'published' && x.stats)
  if (!peers.length) return
  const medianReach = median(peers.map(x => x.stats!.reach)), medianEr = round1(median(peers.map(x => x.stats!.er)))
  const ratio = round1(p.stats.reach / medianReach)
  const net = NETWORK_LABEL[p.network]
  const to = RECYCLE_TO[p.network] ?? p.network
  const worth = ratio >= 1.5 && p.stats.er >= medianEr
  const reading = worth ? `${ratio}× your ${net} median reach, with engagement above median. Worth recycling${to !== p.network ? ` on ${NETWORK_LABEL[to]}` : ''}.`
    : ratio >= 0.7 ? `In line with your ${net} median. Atlas won’t recycle it.`
    : `Below your ${net} median. Atlas takes note for the next ${p.pillar} post.`
  return { reach: p.stats.reach, er: p.stats.er, medianReach, medianEr, ratio, worth, reading, to }
}

/** The idea Atlas writes when you ask to recycle a post: rewritten, on the network where it should travel next. */
export function recycleSeed(s: State, p: Post, perf: Perf): IdeaSeed {
  const text = variantsOf(p.text, { pillar: p.pillar, network: perf.to, words: [], rules: s.playbook.rules })[0]?.text ?? p.text
  return {
    key: `recycle-${p.id}`, kind: 'post', title: `Recycle: ${p.text.length > 48 ? `${p.text.slice(0, 46)}…` : p.text}`,
    why: `${perf.ratio}× the median reach on ${NETWORK_LABEL[p.network]}${perf.to !== p.network ? `, and ${NETWORK_LABEL[perf.to]} never saw it` : ''}.`,
    sources: [{ type: 'analytics', agent: 'iris', label: `${NETWORK_LABEL[p.network]} reach`, proof: `${p.stats!.reach.toLocaleString('en-GB')} vs a median of ${Math.round(perf.medianReach).toLocaleString('en-GB')}`, link: '/insights', value: `${perf.ratio}×`, measure: 'reach vs your median' }],
    confidence: 82, pillar: p.pillar, networks: [perf.to], action: 'atlas-recycle', copy: { [perf.to]: text }, media: p.media, day: 7, topic: p.pillar.split(' ')[0].toLowerCase(),
  }
}
