// First-run model, grounded in Agorapulse's sign-up, about-you and Connect screens and in Archie's Playbook onboarding.
// Labels and options are copied from ~/code/platform (sources in design-plans/onboarding-reality.md). Pure: no React, no store.
import type { Agent, AgentId, Autonomy, Network, Risk } from '../../app/types'
import { levelFor as presetLevel, type Preset } from '../../data/agents'
import type { BasePillar } from '../../data/publishing'

export type { Preset }
export const STEPS = ['signup', 'about', 'team-org', 'connect', 'playbook', 'team', 'results'] as const
export type Step = (typeof STEPS)[number]
/** What the progress bar shows: five stages, the account stage spans the three Agorapulse screens. */
export const STAGES: { label: string; steps: Step[] }[] = [
  { label: 'Account', steps: ['signup', 'about', 'team-org'] },
  { label: 'Profiles', steps: ['connect'] },
  { label: 'Playbook', steps: ['playbook'] },
  { label: 'Team', steps: ['team'] },
  { label: 'First results', steps: ['results'] },
]
export const isStep = (s: string): s is Step => (STEPS as readonly string[]).includes(s)

/* ---------- About you: the real qualification options ---------- */

/** qualification-team-size-options.ts: each range sends its lower bound. */
export const TEAM_SIZES = [{ label: '1-2', value: '1' }, { label: '3-5', value: '3' }, { label: '6+', value: '6' }] as const
export type TeamSize = (typeof TEAM_SIZES)[number]['value']

/** QualifiedSocialMediaTool, labels from manager-edit.qualified-social-media-tool.*. */
export const TOOLS = [
  { value: 'NONE', label: 'No / Native (Direct from Social Media Platform)' },
  { value: 'HOOTSUITE', label: 'Yes, Hootsuite' },
  { value: 'SPROUT', label: 'Yes, Sprout Social' },
  { value: 'MELTWATER', label: 'Yes, Meltwater' },
  { value: 'BRANDWATCH', label: 'Yes, Brandwatch' },
  { value: 'SPRINKLR', label: 'Yes, Sprinklr Social' },
  { value: 'OTHER', label: 'Yes, another tool' },
] as const

/** QualifiedOrganizationHearAboutUs. The product shuffles the channels (Other stays last); the test keeps one order. */
export const HEARD = [
  { value: 'SEARCH_ENGINE', label: 'Search engine (Google, Bing…)' },
  { value: 'AI_ASSISTANT', label: 'AI assistant (ChatGPT, Claude, Perplexity…)' },
  { value: 'SOCIAL_MEDIA', label: 'Social media' },
  { value: 'RECOMMENDATION', label: 'Recommendation from someone I know' },
  { value: 'CONTENT', label: 'Newsletter, podcast, article or webinar' },
  { value: 'OTHER', label: 'Other' },
] as const
export type Heard = (typeof HEARD)[number]['value']
export const HEARD_NETWORKS = ['LinkedIn', 'Instagram', 'Facebook', 'TikTok', 'YouTube', 'X', 'Reddit', 'Other'] as const

export type FollowUp = { kind: 'network'; label: string } | { kind: 'text'; label: string; placeholder: string; required: boolean; multiline: boolean }
/** qualification-hear-about-us.ts: what the answer reveals. */
export function heardFollowUp(h: Heard | null): FollowUp | null {
  if (h === 'SOCIAL_MEDIA') return { kind: 'network', label: 'Which network?' }
  if (h === 'CONTENT') return { kind: 'text', label: 'Which one?', placeholder: 'e.g. name of the podcast', required: false, multiline: false }
  if (h === 'OTHER') return { kind: 'text', label: 'How did you first hear about us?', placeholder: 'Tell us more', required: true, multiline: true }
  return null
}

export const PHONE_CODES = [
  { code: '+33', country: 'France' }, { code: '+1', country: 'United States' }, { code: '+44', country: 'United Kingdom' },
  { code: '+49', country: 'Germany' }, { code: '+34', country: 'Spain' }, { code: '+39', country: 'Italy' },
] as const

export type About = {
  first: string; last: string; phoneCode: string; phone: string
  org: string; teamSize: TeamSize | null; tool: string | null
  heard: Heard | null; heardNetwork: string | null; heardText: string; usa: 'yes' | 'no' | null
}

export const REQUIRED = 'Required'
/** Errors per field, with the product's own messages. Screen 1 is the person, screen 2 the team and organization. */
export function aboutErrors(a: About, screen: 'about' | 'team-org'): Partial<Record<keyof About, string>> {
  const e: Partial<Record<keyof About, string>> = {}
  if (screen === 'about') {
    if (!a.first.trim()) e.first = REQUIRED
    if (!a.last.trim()) e.last = REQUIRED
    const digits = a.phone.replace(/\D/g, '')
    if (!digits) e.phone = REQUIRED
    else if (digits.length < 6 || digits.length > 14) e.phone = 'Invalid phone number'
    return e
  }
  if (!a.org.trim()) e.org = REQUIRED
  if (!a.teamSize) e.teamSize = REQUIRED
  if (!a.tool) e.tool = REQUIRED
  if (!a.heard) e.heard = REQUIRED
  const f = heardFollowUp(a.heard)
  if (f?.kind === 'network' && !a.heardNetwork) e.heardNetwork = REQUIRED
  if (f?.kind === 'text' && f.required && !a.heardText.trim()) e.heardText = REQUIRED
  if (!a.usa) e.usa = REQUIRED
  return e
}

/* ---------- Sign-up ---------- */

const WEBMAIL = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|proton|protonmail|gmx|orange|free|laposte|wanadoo)\./
const DISPOSABLE = /^(mailinator|yopmail|guerrillamail|10minutemail|tempmail|trashmail)\./
const cap = (w: string) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '')
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e.trim())
export const disposableEmail = (e: string) => DISPOSABLE.test(e.trim().toLowerCase().split('@')[1] ?? '')

/** "sam.rivera@fernway.co" → Sam Rivera, fernway.co. A webmail address gives no website: the welcome job has nothing to guess from. */
export function deduce(email: string): { first: string; last: string; site: string } {
  const [local = '', domain = ''] = email.trim().toLowerCase().split('@')
  const [first = '', ...rest] = local.replace(/[0-9+].*$/, '').split(/[._-]+/).filter(Boolean)
  return { first: cap(first), last: rest.map(cap).join(' '), site: domain && !WEBMAIL.test(domain) ? domain : '' }
}
/** "fernway.co" → "Fernway": the organization name the welcome job proposes. */
export const orgFromSite = (site: string) => cap(site.split('.')[0] ?? '')

/** "https://www.Fernway.co/shop" → "fernway.co". Empty when it can't be a domain. */
export function normalizeSite(input: string): string {
  const host = input.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#\s]/)[0]
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : ''
}
const SOCIAL_HOST = /^(instagram|facebook|linkedin|tiktok|x|twitter|youtube|threads\.net|pinterest|bsky)\b/
export const isSocialUrl = (site: string) => SOCIAL_HOST.test(site)

/** The account the mocked Google and Apple choosers offer. */
export const SSO_ACCOUNT = { first: 'Sam', last: 'Rivera', email: 'sam.rivera@fernway.co' }

/* ---------- Connect: the real network grid, OAuth, then "Select profiles to connect" ---------- */

export type NetId = 'facebook' | 'instagram' | 'threads' | 'x' | 'linkedin' | 'tiktok' | 'youtube' | 'google' | 'pinterest' | 'bluesky'
export type Page = { id: string; name: string; size: string; issue?: 'permissions' }
export type NetworkDef = { id: NetId; name: string; via: string; reads: string; note?: string; pages: Page[] }
export const NETWORKS: NetworkDef[] = [
  { id: 'facebook', name: 'Facebook', via: 'Facebook', reads: 'Facebook Pages', pages: [{ id: 'fb', name: 'Fernway Outdoor', size: '22k followers' }, { id: 'fb-repair', name: 'Fernway Repair Club', size: '1.2k followers' }] },
  { id: 'instagram', name: 'Instagram', via: 'Facebook', reads: 'Instagram Business profiles', pages: [{ id: 'ig', name: '@fernway', size: '48k followers' }, { id: 'ig-repair', name: '@fernway.repair', size: '3.1k followers', issue: 'permissions' }] },
  { id: 'threads', name: 'Threads', via: 'Threads', reads: 'Threads profile', pages: [{ id: 'th', name: '@fernway', size: '12k followers' }] },
  { id: 'x', name: 'X (Twitter)', via: 'X', reads: 'X profile', note: 'Trial: 1 X Lite + 1 X Plus', pages: [{ id: 'x', name: '@fernwayco', size: '4k followers' }] },
  { id: 'linkedin', name: 'LinkedIn', via: 'LinkedIn', reads: 'LinkedIn Company page', pages: [{ id: 'li', name: 'Fernway', size: '9k followers' }] },
  { id: 'tiktok', name: 'TikTok', via: 'TikTok', reads: 'TikTok profile', pages: [{ id: 'tt', name: '@fernway.co', size: '31k followers' }] },
  { id: 'youtube', name: 'YouTube', via: 'Google', reads: 'YouTube channel', pages: [{ id: 'yt', name: 'Fernway', size: '6k subscribers' }] },
  { id: 'google', name: 'Google Business', via: 'Google', reads: 'Google Business location', pages: [{ id: 'gr', name: 'Fernway Annecy', size: '4.6 stars · 312 reviews' }] },
  { id: 'pinterest', name: 'Pinterest', via: 'Pinterest', reads: 'Pinterest profile', pages: [{ id: 'pin', name: 'Fernway', size: '2k followers' }] },
  { id: 'bluesky', name: 'Bluesky', via: 'Bluesky', reads: 'Bluesky profile', pages: [{ id: 'bsky', name: '@fernway.co', size: '900 followers' }] },
]
export const ALL_PAGES = NETWORKS.flatMap(n => n.pages.map(p => ({ ...p, net: n.id })))
export const pageOf = (id: string) => ALL_PAGES.find(p => p.id === id)
/** The networks the rest of the prototype knows (Inbox, Publishing, Insights). Threads, Pinterest and Bluesky stay in the grid only. */
const APP_NET: Partial<Record<NetId, Network>> = { facebook: 'facebook', instagram: 'instagram', x: 'x', linkedin: 'linkedin', tiktok: 'tiktok', youtube: 'youtube', google: 'google' }
export const appNet = (id: NetId): Network | undefined => APP_NET[id]
export const netOf = (pageId: string): Network | undefined => { const p = pageOf(pageId); return p && APP_NET[p.net] }
export const connectedNets = (connected: string[]) => [...new Set(connected.map(netOf).filter((n): n is Network => !!n))]
/** Where Atlas's drafts can be scheduled: the first connected network that publishes posts. */
export const publishNet = (connected: string[]): Network | undefined => connectedNets(connected).find(n => n !== 'google')
export const pageLabel = (id: string) => { const p = pageOf(id); return p ? `${p.name} (${NETWORKS.find(n => n.id === p.net)!.name})` : id }

/** archie-skip-connect-modal: the reasons, the ones that wait on a text, and the reassurance each one gets. */
export const SKIP_REASONS = [
  { value: 'SOMEONE_ELSE', label: 'Someone else manages our accounts, or I don’t have access', followUp: 'If you add their email, we’ll send them a link to connect your accounts. They won’t see your drafts, and nothing is published without your approval.' },
  { value: 'TRY_FIRST', label: 'I want to see what the agents do first', followUp: 'Go ahead and try it. Connecting never publishes anything on its own: agents only draft, and you approve every post. We’ll ask again once your first draft is ready.' },
  { value: 'TRUST', label: 'I’m not comfortable giving a new tool access to our accounts', followUp: 'We never see your password, nothing is published without your approval, and you can disconnect anytime.' },
  { value: 'NETWORK_MISSING', label: 'The network we publish on isn’t available', followUp: 'We use these answers to decide which networks to add next. Until then, agents can still write drafts you post yourself.' },
  { value: 'OTHER', label: 'Something else', followUp: 'You can connect an account later from your Desk.' },
] as const
export type SkipReason = (typeof SKIP_REASONS)[number]['value']
const TEXT_REASONS: SkipReason[] = ['NETWORK_MISSING', 'OTHER']
export const needsReasonText = (r: SkipReason | null) => !!r && TEXT_REASONS.includes(r)
/** Skip waits on a reason, its text when it has one, and a valid email if one was typed. */
export function skipBlocked(reason: SkipReason | null, text: string, email: string): boolean {
  if (!reason) return true
  if (needsReasonText(reason) && !text.trim()) return true
  return reason === 'SOMEONE_ELSE' && !!email.trim() && !validEmail(email)
}

/* ---------- Playbook: Archie's "Let's understand your brand." ---------- */

export type VoiceSource = 'profile' | 'document' | 'custom' | 'website'
export type Opt = { label: string; on: boolean }
/** The fields of Archie's recap. Competitors keep an id: Echo watches them. */
export type Brief = {
  name: string; summary: string
  audiences: string[]; primary: string | null
  styles: Opt[]; objectives: Opt[]; actions: Opt[]; ctaUrls: string[]; tones: Opt[]
  voiceSource: VoiceSource; voice: string; voiceFrom: string
  competitors: (Opt & { id: string })[]
}
export type PlaybookSub = 'source' | 'interview' | 'voice' | 'loading' | 'recap'
export type PlaybookDraft = {
  sub: PlaybookSub; website: string; noWebsite: boolean; answers: string[]
  voiceSource: VoiceSource | null; voicePage?: string; docName?: string; pasted: string
  brief?: Brief
}

/** The no-website interview. The first question is Archie's own; the others follow its topics. */
export const INTERVIEW = [
  'Who are you, and what do you do? It can be a business or just you.',
  'What do you sell or offer?',
  'Who do you want to reach?',
  'What should social media do for you?',
]

/** How many recent posts a connected profile gives the voice analysis. */
export const POSTS_READ = 200

/** playbook-brief.util.ts › computeBriefMissingFields, with the labels of pages.playbookEdit.missing.*. */
export function missingFields(b: Brief, website: string): string[] {
  const m: string[] = []
  if (!b.name.trim()) m.push('Playbook name')
  if (!b.summary.trim()) m.push('Business summary')
  if (!b.audiences.length) m.push('Audience options')
  else if (!b.primary) m.push('Primary audience selection')
  if (!b.styles.some(o => o.on)) m.push('Content style')
  if (!b.objectives.some(o => o.on)) m.push('Objective')
  if (!b.actions.some(o => o.on)) m.push('Content action')
  const urls = b.ctaUrls.map(u => u.trim())
  if (urls.every(u => !u)) { if (website.trim()) m.push('At least one CTA URL') }
  else if (urls.some(u => u && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(u))) m.push('Valid CTA URLs (full URL required)')
  if (b.voiceSource === 'website' && !b.tones.some(o => o.on)) m.push('Tone of voice')
  if (b.voiceSource === 'custom' && !b.voice.trim()) m.push('Your voice description')
  return m
}

/** What still makes the Playbook thin once saved: the Desk asks to finish it, like the real "Finish your voices". */
export function weakFields(b: Brief | undefined): string[] {
  if (!b) return ['your Playbook isn’t set up yet']
  const w: string[] = []
  if (b.voiceSource === 'website') w.push('your voice comes from your website only')
  if (!b.ctaUrls.some(u => u.trim())) w.push('no link for readers yet')
  if (!b.competitors.some(c => c.on)) w.push('no competitors for Echo')
  return w
}

const opts = (labels: string[], on: number) => labels.map((label, i) => ({ label, on: i < on }))
const VOICES: Record<VoiceSource, string> = {
  profile: 'Warm, direct, a bit playful. Short sentences and first names. One emoji at most. Opens on the trail, ends with a question.',
  website: 'Friendly and practical. Talks about trails, repairs and how long things last more than about products.',
  document: 'Calm and expert, never salesy. Explains why a detail matters before naming the product.',
  custom: '',
}

/** The recap Archie pre-fills. From the website when there is one, from the interview answers otherwise. */
export function buildBrief(pb: PlaybookDraft, org: string, connected: string[]): Brief {
  const site = pb.noWebsite ? '' : normalizeSite(pb.website)
  const said = (i: number) => pb.answers[i]?.trim()
  const fromSite = !!site
  const source: VoiceSource = pb.voiceSource ?? (fromSite ? 'website' : 'custom')
  const profile = source === 'profile' ? pageOf(pb.voicePage ?? connected[0] ?? '') : undefined
  return {
    name: org || orgFromSite(site) || 'My Playbook',
    summary: fromSite
      ? 'Fernway makes outdoor gear in Annecy, France: the Ridge 28L pack, the Summit Bottle, the Storm Jacket and the Ember Fleece. Sold online across Europe, with free exchanges, a lifetime warranty on bottles and a repair programme for bags.'
      : [said(0), said(1)].filter(Boolean).join(' ') || '',
    audiences: fromSite ? ['Weekend hikers in Europe', 'Commuters who want gear that lasts', 'Outdoor clubs and guides'] : said(2) ? [said(2)!] : [],
    primary: fromSite ? 'Weekend hikers in Europe' : said(2) ?? null,
    styles: opts(fromSite ? ['How-to and gear care', 'Behind the scenes', 'Customer stories', 'Product drops'] : ['How-to and tips', 'Behind the scenes', 'Customer stories', 'New products'], 2),
    objectives: opts(fromSite ? ['Grow community engagement', 'Drive online sales', 'Build brand awareness'] : [said(3) || 'Build brand awareness', 'Grow community engagement'], 1),
    actions: opts(fromSite ? ['Shop the product', 'Join the repair programme', 'Follow for trail tips'] : ['Visit or buy', 'Follow for more', 'Get in touch'], 1),
    ctaUrls: fromSite ? [`https://${site}/shop`] : [],
    tones: opts(['Warm', 'Direct', 'Playful', 'Expert'], 3),
    voiceSource: source,
    voice: source === 'custom' ? pb.pasted.trim() : VOICES[source],
    voiceFrom: source === 'profile' ? `From ${profile?.name ?? 'your connected profile'} · its last ${POSTS_READ} posts`
      : source === 'document' ? `From ${pb.docName ?? 'your document'}` : source === 'custom' ? 'Written by you' : 'From your website · less accurate than your posts',
    competitors: fromSite ? [
      { id: 'peakline', label: 'Peakline', on: true }, { id: 'norro', label: 'Norrø', on: true },
      { id: 'trailkind', label: 'Trailkind', on: true }, { id: 'basecamp', label: 'Basecamp Co.', on: true },
    ] : [],
  }
}

/** How long the Playbook takes to build. The site was read in the background since "Start my trial": a few seconds then. */
export const loadingMs = (prerunReady: boolean) => (prerunReady ? 3600 : 10_000)
export const LOADER = {
  site: [
    { title: 'Reading your website', sub: 'Scanning your pages, copy, and brand cues.' },
    { title: 'Capturing your brand', sub: 'Pulling colors, fonts, and your visual identity.' },
    { title: 'Building your Playbook', sub: 'Distilling your voice and turning it into a brief every post draws from.' },
  ],
  interview: [
    { title: 'Reading your answers', sub: 'Turning what you told me into a strategy brief.' },
    { title: 'Setting up your brand', sub: 'You can add your logo and colors to the Playbook later.' },
    { title: 'Drafting your Playbook', sub: 'Audience, goals and voice, from your own words.' },
  ],
}

/* ---------- What Nova learned from your public replies (only with an account) ---------- */

export type Choice = { keep: boolean; text: string }
export type ProposalKind = 'do' | 'dont' | 'escalate'
export type Proposal = { id: string; kind: ProposalKind; text: string; evidence: string; agents: AgentId[] }
/** Ids match the Playbook's own entries, so a kept line becomes that entry and an edit replaces its text. */
export const PROPOSALS: Proposal[] = [
  { id: 'r-name', kind: 'do', text: 'Use the person’s first name in the first sentence', evidence: 'You did in 181 of your last 200 replies', agents: ['nova'] },
  { id: 'r-apologise', kind: 'do', text: 'Apologise once, then fix', evidence: 'Your 63 replies to complaints never apologise twice', agents: ['nova'] },
  { id: 'r-dm', kind: 'do', text: 'Move order details to DM', evidence: 'You moved 41 public complaints to DM this year', agents: ['nova'] },
  { id: 'r-emoji', kind: 'dont', text: 'One emoji max', evidence: '94% of your replies use one emoji or none', agents: ['nova', 'atlas'] },
  { id: 'r-competitor', kind: 'dont', text: 'Never name a competitor in a reply', evidence: 'You never did, in 200 replies', agents: ['nova', 'atlas'] },
  { id: 'e-press', kind: 'escalate', text: 'Journalists and press always go to a person', evidence: 'Your 3 replies to press this year were signed by Claire Dubois', agents: ['nova', 'echo'] },
]
export const pickOf = (picks: Record<string, Choice>, p: Proposal): Choice => picks[p.id] ?? { keep: true, text: p.text }

/* ---------- Setup: everything the first run keeps ---------- */

export type Draft = { id: string; text: string; at: number; pillar: BasePillar; status: 'draft' | 'scheduled'; postId?: string; undoUntil?: number }
/** Work announced with its real delay, delivered when the clock gets there. */
export type Pending = { id: 'echo' | 'iris' | 'nova'; agent: AgentId; at: number; label: string }

export type Setup = About & {
  step: Step
  email: string
  how: 'google' | 'apple' | 'email' | null
  /** Guessed from the email domain, like the real welcome job. */
  site: string
  /** App time "Start my trial" was clicked: the site analysis starts then. */
  analysisAt?: number
  connected: string[]
  /** Pages whose missing permission was granted again. */
  fixed: string[]
  invites: string[]
  skip?: { reason: SkipReason; text: string }
  pb: PlaybookDraft
  /** Only what the user changed in "What Nova learned". */
  picks: Record<string, Choice>
  preset: Preset
  custom: Partial<Record<AgentId, Preset>>
  validator?: string
  /** App time the team started (Day 1). */
  startedAt?: number
  drafts: Draft[]
  pending: Pending[]
  seen: string[]
  checklistOpen: boolean
}

export const initialDraft = (): PlaybookDraft => ({ sub: 'source', website: '', noWebsite: false, answers: [], voiceSource: null, pasted: '' })
export const initialSetup = (): Setup => ({
  step: 'signup', first: '', last: '', email: '', how: null, phoneCode: '+33', phone: '',
  org: '', teamSize: null, tool: null, heard: null, heardNetwork: null, heardText: '', usa: null,
  site: '', connected: [], fixed: [], invites: [], pb: initialDraft(), picks: {}, preset: 'cautious', custom: {},
  drafts: [], pending: [], seen: [], checklistOpen: true,
})

/** "a, b and c" */
export const andList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)

/* ---------- Autonomy ---------- */

export const PRESETS: { value: Preset; label: string; says: string }[] = [
  { value: 'cautious', label: 'Cautious', says: 'Recommended to start. Agents draft and suggest; nothing goes out until you approve it.' },
  { value: 'balanced', label: 'Balanced', says: 'Agents handle routine work alone, like product questions and spam. Anything risky waits for you.' },
  { value: 'autonomous', label: 'Autonomous', says: 'Agents act alone within their limits. You can undo anything for 10 minutes.' },
]
/** The preset rule from data/agents, with locked actions always on Suggest. */
export const levelFor = (risk: Risk, p: Preset, locked?: boolean): Autonomy => (locked ? 'suggest' : presetLevel(risk, p))
export const presetOf = (setup: Setup, agent: AgentId): Preset => setup.custom[agent] ?? setup.preset

/** How many actions land on each level, across the team. */
export function levelCounts(agents: Agent[], setup: Setup): Record<Autonomy, number> {
  const out: Record<Autonomy, number> = { suggest: 0, draft: 0, act: 0 }
  for (const a of agents) for (const x of a.actions) out[levelFor(x.risk, presetOf(setup, a.id), x.locked)]++
  return out
}

/** A finished setup with every default taken: Sam, Facebook and Instagram, the Playbook from the site and @fernway, Cautious. */
export function defaultSetup(): Setup {
  const connected = ['fb', 'ig', 'tt', 'li', 'yt']
  const pb: PlaybookDraft = { ...initialDraft(), sub: 'recap', website: 'fernway.co', voiceSource: 'profile', voicePage: 'ig' }
  return {
    ...initialSetup(), ...SSO_ACCOUNT, how: 'google', phone: '6 12 34 56 78', org: 'Fernway', teamSize: '3', tool: 'NONE', heard: 'SEARCH_ENGINE', usa: 'no',
    site: 'fernway.co', connected, pb: { ...pb, brief: buildBrief(pb, 'Fernway', connected) }, step: 'results',
  }
}
