// First-run model: who signed up, what Protopulse found on the site, what the user kept. Pure: no React, no store.
import type { Agent, AgentId, Autonomy, Network, Risk } from '../../app/types'

export type Preset = 'cautious' | 'balanced' | 'autonomous'
export const STEPS = ['signup', 'site', 'reading', 'accounts', 'playbook', 'team', 'results'] as const
export type Step = (typeof STEPS)[number]
/** What the progress bar shows: four stages, the brand stage spans four screens. */
export const STAGES: { label: string; steps: Step[] }[] = [
  { label: 'Account', steps: ['signup'] },
  { label: 'Your brand', steps: ['site', 'reading', 'accounts', 'playbook'] },
  { label: 'Your team', steps: ['team'] },
  { label: 'First results', steps: ['results'] },
]
export const isStep = (s: string): s is Step => (STEPS as readonly string[]).includes(s)

export type Choice = { keep: boolean; text: string }
export type Setup = {
  step: Step
  first: string
  last: string
  email: string
  site: string
  /** The brand analysis played to the end once: coming back shows the result, not the wait. */
  read: boolean
  connected: string[]
  /** Only what the user changed. A proposal without a pick is kept as proposed. */
  picks: Record<string, Choice>
  preset: Preset
  custom: Partial<Record<AgentId, Preset>>
  /** App time the team started (Day 1). */
  startedAt?: number
  /** Pages the checklist sends you to, once visited. */
  seen: string[]
  checklistOpen: boolean
}

export const initialSetup = (): Setup => ({
  step: 'signup', first: '', last: '', email: '', site: '', read: false, connected: [], picks: {}, preset: 'cautious', custom: {}, seen: [], checklistOpen: true,
})

/** "a, b and c" */
export const andList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)

/* ---------- Account: everything comes from the email ---------- */

const WEBMAIL = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|proton|protonmail|gmx|orange|free|laposte|wanadoo)\./
const cap = (w: string) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '')
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e.trim())

/** "sam.rivera@fernway.co" → Sam Rivera, fernway.co. A webmail address gives no website. */
export function deduce(email: string): { first: string; last: string; site: string } {
  const [local = '', domain = ''] = email.trim().toLowerCase().split('@')
  const [first = '', ...rest] = local.replace(/[0-9+].*$/, '').split(/[._-]+/).filter(Boolean)
  return { first: cap(first), last: rest.map(cap).join(' '), site: domain && !WEBMAIL.test(domain) ? domain : '' }
}

/** "https://www.Fernway.co/shop" → "fernway.co". Empty when it can't be a domain. */
export function normalizeSite(input: string): string {
  const host = input.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#\s]/)[0]
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : ''
}

/** The Google account the mocked chooser offers. */
export const GOOGLE_ACCOUNT = { first: 'Sam', last: 'Rivera', email: 'sam.rivera@fernway.co' }

/* ---------- What Protopulse finds on fernway.co ---------- */

export type Integration = { id: string; name: string; net?: Network; handle: string; size?: string; group: 'Social' | 'Reviews' | 'Store'; foundIn: string }
export const INTEGRATIONS: Integration[] = [
  { id: 'ig', name: 'Instagram', net: 'instagram', handle: '@fernway', size: '48k followers', group: 'Social', foundIn: 'Linked in your site footer' },
  { id: 'tt', name: 'TikTok', net: 'tiktok', handle: '@fernway.co', size: '31k followers', group: 'Social', foundIn: 'Linked in your site footer' },
  { id: 'fb', name: 'Facebook', net: 'facebook', handle: 'Fernway Outdoor', size: '22k followers', group: 'Social', foundIn: 'Linked in your site footer' },
  { id: 'li', name: 'LinkedIn', net: 'linkedin', handle: 'Fernway', size: '9k followers', group: 'Social', foundIn: 'Your careers page' },
  { id: 'yt', name: 'YouTube', net: 'youtube', handle: 'Fernway', size: '6k subscribers', group: 'Social', foundIn: 'Embedded on your product pages' },
  { id: 'x', name: 'X', net: 'x', handle: '@fernwayco', size: '4k followers', group: 'Social', foundIn: 'Your Instagram bio' },
  { id: 'gr', name: 'Google Reviews', net: 'google', handle: 'Fernway Annecy', size: '4.6 stars · 312 reviews', group: 'Reviews', foundIn: 'Your Google Business profile' },
  { id: 'tp', name: 'Trustpilot', net: 'trustpilot', handle: 'fernway.co', size: '4.4 stars · 1,180 reviews', group: 'Reviews', foundIn: 'The badge on your checkout page' },
  { id: 'shop', name: 'Shopify', handle: 'fernway.myshopify.com', size: '18,400 orders', group: 'Store', foundIn: 'Your checkout runs on Shopify' },
]
export const ALL_ACCOUNTS = INTEGRATIONS.map(i => i.id)
export const netOf = (id: string) => INTEGRATIONS.find(i => i.id === id)?.net

export type ProposalKind = 'voice' | 'do' | 'dont' | 'fact' | 'competitor' | 'escalate'
export type Proposal = { id: string; kind: ProposalKind; text: string; evidence: string; agents: AgentId[] }
/** Ids match the Playbook's own entries, so a kept proposal becomes that entry and an edit replaces its text. */
export const PROPOSALS: Proposal[] = [
  { id: 'v-voice', kind: 'voice', text: 'Warm, direct, a bit playful. Short sentences. First names.', evidence: 'Seen in 168 of your last 200 replies', agents: ['nova', 'atlas'] },
  { id: 'r-apologise', kind: 'do', text: 'Apologise once, then fix', evidence: 'Your 63 complaint replies never apologise twice', agents: ['nova'] },
  { id: 'r-name', kind: 'do', text: 'Use the person’s first name in the first sentence', evidence: 'In 181 of your last 200 replies', agents: ['nova'] },
  { id: 'r-dm', kind: 'do', text: 'Move order details to DM', evidence: '41 public complaints moved to DM this year', agents: ['nova'] },
  { id: 'r-emoji', kind: 'dont', text: 'One emoji max', evidence: '94% of your posts use one emoji or none', agents: ['nova', 'atlas'] },
  { id: 'r-competitor', kind: 'dont', text: 'Never name a competitor in a reply', evidence: 'You never did, in 200 replies', agents: ['nova', 'atlas'] },
  { id: 'f-returns', kind: 'fact', text: 'Returns: 30 days, free exchange, refund in 5 working days', evidence: 'fernway.co/returns and 63 of your replies', agents: ['nova'] },
  { id: 'f-warranty', kind: 'fact', text: 'Lifetime warranty on Summit Bottles only', evidence: 'fernway.co/warranty', agents: ['nova'] },
  { id: 'f-bag-warranty', kind: 'fact', text: 'Bags: 3-year warranty, then the repair programme', evidence: 'fernway.co/repair', agents: ['nova'] },
  { id: 'f-shipping', kind: 'fact', text: 'Shipping: free over €60 in the EU, usually within 2 working days', evidence: 'Your Shopify shipping settings', agents: ['nova'] },
  { id: 'peakline', kind: 'competitor', text: 'Peakline', evidence: 'Tagged next to you in 312 posts this year', agents: ['echo'] },
  { id: 'norro', kind: 'competitor', text: 'Norrø', evidence: '22% of your followers also follow them', agents: ['echo'] },
  { id: 'trailkind', kind: 'competitor', text: 'Trailkind', evidence: 'Named in 48 comments under your TikToks', agents: ['echo'] },
  { id: 'basecamp', kind: 'competitor', text: 'Basecamp Co.', evidence: 'Bids on “Ridge 28L” on Google Shopping', agents: ['echo'] },
  { id: 'e-press', kind: 'escalate', text: 'Journalists and press always go to a person', evidence: 'Your 3 press replies this year were signed by Claire Dubois', agents: ['nova', 'echo'] },
]
export const SECTIONS: { kind: ProposalKind[]; title: string; note: string }[] = [
  { kind: ['voice'], title: 'Voice', note: 'How every agent writes for you.' },
  { kind: ['do', 'dont'], title: 'Rules', note: 'Habits in your replies and posts.' },
  { kind: ['fact'], title: 'Facts', note: 'What Nova quotes. 10 more from your catalog and help centre are already in.' },
  { kind: ['competitor'], title: 'Competitors', note: 'Who Echo watches.' },
  { kind: ['escalate'], title: 'Always a person', note: 'Never answered by an agent.' },
]

export const pickOf = (setup: Setup, p: Proposal): Choice => setup.picks[p.id] ?? { keep: true, text: p.text }
export const keptCount = (setup: Setup) => PROPOSALS.filter(p => pickOf(setup, p).keep).length

/* ---------- The live read: what appears, and when ---------- */

export type PhaseId = 'site' | 'policies' | 'accounts' | 'voice' | 'rivals'
export const PHASES: { id: PhaseId; label: string; done: string }[] = [
  { id: 'site', label: 'Reading your site', done: '4 products in 4 colours' },
  { id: 'policies', label: 'Reading your help centre', done: 'Returns, warranty, repairs, shipping' },
  { id: 'accounts', label: 'Looking for your accounts', done: '6 networks, 2 review sites, 1 store' },
  { id: 'voice', label: 'Reading your last 200 posts and replies', done: 'Your voice and 5 habits' },
  { id: 'rivals', label: 'Finding who you compete with', done: '4 likely competitors' },
]
export type Find = { at: number; phase: PhaseId; key: string; label: string; detail?: string }
export const FINDS: Find[] = [
  { at: 500, phase: 'site', key: 'brand', label: 'Fernway', detail: 'Outdoor gear · Annecy, France' },
  { at: 1300, phase: 'site', key: 'pack', label: 'Ridge 28L', detail: '€140' },
  { at: 1800, phase: 'site', key: 'bottle', label: 'Summit Bottle', detail: '€35' },
  { at: 2300, phase: 'site', key: 'jacket', label: 'Storm Jacket', detail: '€220' },
  { at: 2800, phase: 'site', key: 'fleece', label: 'Ember Fleece', detail: '€95' },
  { at: 3800, phase: 'policies', key: 'returns', label: '30-day returns, free exchange' },
  { at: 4400, phase: 'policies', key: 'warranty', label: 'Lifetime warranty on bottles' },
  { at: 5000, phase: 'policies', key: 'repair', label: 'Repair programme for bags' },
  ...INTEGRATIONS.map((i, n): Find => ({ at: 6000 + n * 260, phase: 'accounts', key: i.id, label: i.name, detail: i.size })),
  { at: 9000, phase: 'voice', key: 'voice', label: 'Warm, direct, a bit playful', detail: 'Seen in 168 of your last 200 replies' },
  { at: 10000, phase: 'voice', key: 'habits', label: 'First names, one emoji max, order details in DM' },
  { at: 11200, phase: 'rivals', key: 'peakline', label: 'Peakline' },
  { at: 11600, phase: 'rivals', key: 'norro', label: 'Norrø' },
  { at: 12000, phase: 'rivals', key: 'trailkind', label: 'Trailkind' },
  { at: 12400, phase: 'rivals', key: 'basecamp', label: 'Basecamp Co.' },
]
export const READ_MS = 13200

/** Where the read is after `ms`: what's on screen, the phase running, whether it's over. */
export function readingAt(ms: number) {
  const shown = FINDS.filter(f => f.at <= ms)
  const current = PHASES.findIndex(p => FINDS.some(f => f.phase === p.id && f.at > ms))
  return { shown, current: current < 0 ? PHASES.length : current, done: ms >= READ_MS }
}

/* ---------- Autonomy ---------- */

export const PRESETS: { value: Preset; label: string; says: string }[] = [
  { value: 'cautious', label: 'Cautious', says: 'Agents draft and suggest. Nothing goes out until you approve it. Best for the first week.' },
  { value: 'balanced', label: 'Balanced', says: 'Agents handle routine work alone, like product questions and spam. Anything risky waits for you.' },
  { value: 'autonomous', label: 'Autonomous', says: 'Agents act alone within their limits. You can undo anything for 10 minutes.' },
]
/** Cautious: safe drafts, risky suggests. Balanced: safe acts, risky drafts. Autonomous: everything acts. Locked actions always suggest. */
export const levelFor = (risk: Risk, p: Preset, locked?: boolean): Autonomy =>
  locked ? 'suggest' : p === 'cautious' ? (risk === 'safe' ? 'draft' : 'suggest') : p === 'balanced' ? (risk === 'safe' ? 'act' : 'draft') : 'act'

export const presetOf = (setup: Setup, agent: AgentId): Preset => setup.custom[agent] ?? setup.preset

/** How many actions land on each level, across the team. */
export function levelCounts(agents: Agent[], setup: Setup): Record<Autonomy, number> {
  const out: Record<Autonomy, number> = { suggest: 0, draft: 0, act: 0 }
  for (const a of agents) for (const x of a.actions) out[levelFor(x.risk, presetOf(setup, a.id), x.locked)]++
  return out
}

/** A finished setup with every default taken: Sam, all accounts, all proposals, Cautious. */
export const defaultSetup = (): Setup => ({ ...initialSetup(), ...GOOGLE_ACCOUNT, site: 'fernway.co', read: true, connected: [...ALL_ACCOUNTS], step: 'results' })
