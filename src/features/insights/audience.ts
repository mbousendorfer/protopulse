// Who follows Fernway: per network or all together, and where it doesn't match what Atlas posts.
import type { Network } from '../../app/types'
import { DAY } from '../../app/time'
import { AGE_BANDS, AUDIENCE, AUDIENCE_TIPS, NETWORKS_SOCIAL, type NetFilter } from '../../data/insights'
import { NETWORK_LABEL } from '../../data/agents'
import { kpi } from './metrics'

type Net = keyof typeof AUDIENCE
const netsOf = (n: NetFilter): Net[] => (n === 'all' ? (NETWORKS_SOCIAL as Net[]) : n in AUDIENCE ? [n as Net] : [])

/** One network's audience, or all of them weighted by followers. */
export function audienceOf(n: NetFilter) {
  const nets = netsOf(n)
  const total = nets.reduce((t, x) => t + AUDIENCE[x].followers, 0)
  const w = (f: (x: Net) => number) => Math.round(nets.reduce((t, x) => t + f(x) * AUDIENCE[x].followers, 0) / total)
  const age = AGE_BANDS.map((_, i) => w(x => AUDIENCE[x].age[i]))
  const countries = new Map<string, number>()
  for (const x of nets) for (const [c, p] of AUDIENCE[x].countries) countries.set(c, (countries.get(c) ?? 0) + p * AUDIENCE[x].followers / total)
  const cities = [...new Set(nets.flatMap(x => AUDIENCE[x].cities))].slice(0, 5)
  return {
    followers: total, age, under25: age[0] + age[1],
    peak: AGE_BANDS[age.indexOf(Math.max(...age))],
    gender: { women: w(x => AUDIENCE[x].gender.women), men: w(x => AUDIENCE[x].gender.men), other: w(x => AUDIENCE[x].gender.other) },
    countries: [...countries].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, p]) => [c, Math.round(p)] as [string, number]),
    cities,
  }
}

/** Followers over the last 30 days, ending today: today's count, minus Explore's new followers spread back day by day. */
export function followerSeries(n: NetFilter, now: number) {
  const a = audienceOf(n)
  const perDay = (n === 'all' ? kpi('followers', 30).value : kpi('followers', 30, n).value) / 30
  return Array.from({ length: 30 }, (_, i) => ({ at: now - (29 - i) * DAY, v: Math.round(a.followers - perDay * (29 - i) * (1 + ((i * 7) % 5 - 2) / 40)) }))
}

/** The networks where the audience and the content don't match, with what Iris would brief Atlas. */
export function audienceTips() {
  return (Object.keys(AUDIENCE_TIPS) as Network[]).map(network => {
    const a = audienceOf(network), tip = AUDIENCE_TIPS[network]!
    return { network, ...tip, under25: a.under25, finding: `${NETWORK_LABEL[network]} followers are ${a.under25}% under 25, but ${tip.posts}` }
  })
}
