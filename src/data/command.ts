import type { AgentId, Network } from '../app/types'

/** What the command bar understood. Mocked: keyword intents, no model behind it. */
export type Intent =
  | { kind: 'post'; network: Network; topic: string; slot: string }
  | { kind: 'tiktok' }
  | { kind: 'besttime'; network: 'instagram' | 'linkedin' | 'tiktok' }
  | { kind: 'compare' }
  | { kind: 'performance' }
  | { kind: 'competitor'; name: string }
  | { kind: 'pause'; agent: AgentId; until?: string }
  | { kind: 'resume'; agent: AgentId }
  | { kind: 'rule'; rule: string; agent: AgentId }
  | { kind: 'campaign'; brief: string }
  | { kind: 'needs' }
  | { kind: 'overnight'; agent: AgentId }
  | { kind: 'reply'; name: string; convo?: string }
  | { kind: 'mentions' }
  | { kind: 'clip'; url?: string }
  | { kind: 'unknown' }

export const OWNER: Record<Intent['kind'], AgentId> = {
  post: 'atlas', tiktok: 'iris', besttime: 'iris', compare: 'iris', performance: 'iris', competitor: 'echo', pause: 'sage', resume: 'sage',
  rule: 'nova', campaign: 'sage', needs: 'iris', overnight: 'iris', reply: 'nova', mentions: 'echo', clip: 'juno', unknown: 'iris',
}

const NAMES: AgentId[] = ['nova', 'atlas', 'iris', 'echo', 'sage', 'juno']
const NETS: [RegExp, Network][] = [[/linkedin/, 'linkedin'], [/tiktok/, 'tiktok'], [/instagram|insta\b|\big\b|reel|carousel/, 'instagram'], [/facebook|\bfb\b/, 'facebook'], [/youtube|short\b/, 'youtube'], [/\bx\b|twitter|tweet/, 'x']]
const BEST_SLOT: Record<Network, string> = { instagram: 'Fri 28, 18:30', linkedin: 'Tue 2, 08:30', tiktok: 'Thu 27, 18:00', facebook: 'Sat 29, 10:00', youtube: 'Sun 30, 11:00', x: 'Today, 12:00', google: '', trustpilot: '' }
const DAYS: [RegExp, string][] = [[/monday/, 'Mon 1'], [/tuesday/, 'Tue 2'], [/wednesday/, 'Wed 26'], [/thursday/, 'Thu 27'], [/friday/, 'Fri 28'], [/saturday/, 'Sat 29'], [/sunday/, 'Sun 30'], [/tomorrow/, 'Wed 26'], [/today|tonight/, 'Today']]
const CONVOS: Record<string, string> = { lea: 'c-lea', 'léa': 'c-lea', thomas: 'c-thomas', marc: 'c-marc', tom: 'c-tom', ines: 'c-ines', 'inès': 'c-ines' }

const net = (t: string): Network | undefined => NETS.find(([re]) => re.test(t))?.[1]

export function parse(raw: string): { intent: Intent; forced?: AgentId } {
  let t = raw.toLowerCase().trim().replace(/[?!.]+$/, '')
  const lead = t.match(/^(nova|atlas|iris|echo|sage|juno)\b[,:]?\s*/)
  const forced = lead ? (lead[1] as AgentId) : undefined
  if (lead) t = t.slice(lead[0].length)
  const named = NAMES.find(n => new RegExp(`\\b${n}\\b`).test(t))

  if (/^(pause|stop)\s+(nova|atlas|iris|echo|sage|juno)/.test(t)) {
    const m = t.match(/^(?:pause|stop)\s+(\w+)(?:\s+(?:until|till)\s+(.+))?/)!
    return { intent: { kind: 'pause', agent: m[1] as AgentId, until: m[2] }, forced }
  }
  if (/^(resume|restart|unpause|wake)\s+(nova|atlas|iris|echo|sage|juno)/.test(t)) return { intent: { kind: 'resume', agent: t.split(/\s+/)[1] as AgentId }, forced }
  const never = t.match(/^(?:please\s+)?(never|don['’]?t|do not|stop|no more)\s+(.+)/)
  if (never) {
    const body = never[2].replace(/\byou\b/g, 'we')
    return { intent: { kind: 'rule', rule: `Never ${body.replace(/^(ever\s+)/, '')}`, agent: forced ?? named ?? (/post|caption|publish|hashtag/.test(body) ? 'atlas' : 'nova') }, forced }
  }
  const url = raw.match(/https?:\/\/\S+/)?.[0]
  if (url || /\bclips?\b|latest video|\bshorts? from\b/.test(t)) return { intent: { kind: 'clip', url }, forced }
  if (/^brief\b|campaign|launch/.test(t)) return { intent: { kind: 'campaign', brief: raw.replace(/^\s*(sage[,:]?\s*)?(brief:?\s*)?/i, '').trim() }, forced }
  if (/reply to\s+(\S+)/.test(t)) {
    const name = t.match(/reply to\s+(\S+)/)![1].replace(/^@/, '')
    return { intent: { kind: 'reply', name, convo: CONVOS[name] }, forced }
  }
  if (/what needs me|needs me|on my desk|what('?s| is) waiting/.test(t)) return { intent: { kind: 'needs' }, forced }
  if (/(did|has)\s+(nova|atlas|iris|echo|sage|juno)\s+(do|done)|overnight|while i was/.test(t)) {
    const who = (t.match(/\b(nova|atlas|iris|echo|sage|juno)\b/)?.[1] ?? 'nova') as AgentId
    return { intent: { kind: 'overnight', agent: who }, forced }
  }
  if (/negative|complain(t|ts)? about us|mentions/.test(t) && !/post/.test(t)) return { intent: { kind: 'mentions' }, forced }
  if (/peakline|norr[øo]|trailkind|basecamp|competitor|rival/.test(t)) {
    const name = t.match(/peakline|norr[øo]|trailkind|basecamp/)?.[0] ?? 'competitors'
    return { intent: { kind: 'competitor', name }, forced }
  }
  if (/best (time|slot|hour|day)|when should (i|we) post/.test(t)) {
    const n = net(t)
    return { intent: { kind: 'besttime', network: n === 'linkedin' || n === 'tiktok' ? n : 'instagram' }, forced }
  }
  if (/tiktok/.test(t) && /how|did|perform|doing|last week|views|reach/.test(t)) return { intent: { kind: 'tiktok' }, forced }
  if (/reels? (vs|versus|or|against) carousels?|carousels? (vs|versus|or|against) reels?|compare/.test(t)) return { intent: { kind: 'compare' }, forced }
  if (/(post|reel|carousel|tweet|caption|story)\b/.test(t) && /(write|draft|create|make|post about|a post|an? (reel|carousel|tweet))/.test(t) || (forced === 'atlas' && /about|sale|post/.test(t))) {
    const n = net(t) ?? 'instagram'
    const day = DAYS.find(([re]) => re.test(t))
    const topic = (t.match(/(?:about|on|for)\s+(?:the\s+|our\s+)?(.+?)(?:\s+(?:on|for|this|next)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|linkedin|instagram|tiktok|facebook|youtube|x)\b.*)?$/)?.[1]
      ?? t.replace(/^(?:write|draft|create|make)\s+(?:me\s+)?(?:an?\s+)?(?:\w+\s+)?(?:post|reel|carousel|tweet)\s*/, '')).trim() || 'our latest news'
    return { intent: { kind: 'post', network: n, topic, slot: day ? `${day[1]}, ${BEST_SLOT[n].split(', ')[1] ?? '18:00'}` : BEST_SLOT[n] }, forced }
  }
  if (/reach|engagement|how are we doing|how('?s| is) it going|performance|numbers|followers/.test(t)) return { intent: { kind: 'performance' }, forced }
  return { intent: { kind: 'unknown' }, forced }
}

/** Post copy Atlas drafts from a topic, per network. */
export function draftPost(topic: string, network: Network) {
  const T = topic.charAt(0).toUpperCase() + topic.slice(1)
  if (/sale|discount|% off|promo/.test(topic)) return 'Weekend sale: 15% off every Summit Bottle until Sunday 20:00. Cold water for the next trail, warm coffee for the summit.'
  switch (network) {
    case 'linkedin': return `${T}. Here’s what our team learned this year, and why it matters to anyone who spends their weekends outside.`
    case 'tiktok': return `${T} in 20 seconds. Wait for the last shot.`
    case 'facebook': return `${T}. Tell us in the comments where you’d take it first.`
    case 'x': return `${T}. More on fernway.co`
    case 'youtube': return `${T}: the short version, filmed above Annecy.`
    default: return `${T}. Shot on the trail above Annecy, no filter needed.`
  }
}

/** Examples shown when the command bar opens. */
export const EXAMPLES = [
  'Atlas, a post about the weekend sale on Friday',
  'Write a LinkedIn post about our repair programme',
  'How did TikTok do last week?',
  'Best time to post on Instagram?',
  'What is Peakline up to?',
  'Pause Atlas until Monday',
  'Nova, never offer codes on complaints',
  'Brief: launch the Storm Jacket in March, 300 pre-orders',
  'What needs me today?',
  'What did Nova do overnight?',
  'Reply to Léa',
  'Show me negative mentions this week',
  'Juno, clip the latest video',
]
