// The Inbox's shapes (matrix §15): the day in one band, the conversation to answer first set apart, and the pieces every
// conversation row shares (who · type · mood, Nova's reply on her wash, the wait against its target).
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AtSign, Frown, Hand, Mail, Meh, MessageSquare, Send, Smile, Star, UserRound } from 'lucide-react'
import type { Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import type { State } from '../../app/state'
import { ago, hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { TEAMMATES, type ConvType, type Conversation, type Sentiment } from '../../data/inbox'
import { Btn, FlagText, Mark, Net, Pill } from '../../ui'
import { Spark } from '../../ui/charts'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { MoreInfo } from '../../ui/More'
import { gist } from '../../ui/gist'
import { dur, fanOf, needsYou, PUBLIC, waitOf, waitingOn } from './slice'
import { translate } from './translate'

export const TYPE_LABEL: Record<ConvType, string> = { comment: 'Comment', dm: 'Message', mention: 'Mention', review: 'Review' }
export const SENT: Record<Sentiment, string> = { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' }
const TYPE_ICON: Record<ConvType, typeof Mail> = { comment: MessageSquare, dm: Mail, mention: AtSign, review: Star }
const SENT_ICON: Record<Sentiment, typeof Smile> = { positive: Smile, neutral: Meh, negative: Frown }

/** What it is: a public comment, a private message, a review… Information, so text and icon, no fill. */
export const Kind = ({ t }: { t: ConvType }) => { const I = TYPE_ICON[t]; return <span className="ib-kind"><I size={14} aria-hidden />{TYPE_LABEL[t]}</span> }
/** How it feels: the mood's colour on its icon and word. */
export const Mood = ({ s }: { s: Sentiment }) => { const I = SENT_ICON[s]; return <span className={`ib-mood ${s}`}><I size={14} aria-hidden />{SENT[s]}</span> }

/** What a conversation needs: send what Nova is sure of, check the passage she doubts, decide what she never answers. */
export type Need = 'ready' | 'check' | 'call' | 'yours' | 'claire' | 'team'
export const flagsOf = (c: Conversation) => (c.draft ?? []).filter((x): x is Exclude<typeof x, string> => typeof x !== 'string')
export const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
export const needOf = (c: Conversation): Need => c.assignee && TEAMMATES.includes(c.assignee) && c.status !== 'claire' ? 'team' : c.status === 'claire' ? 'claire' : c.status === 'takeover' ? 'yours' : c.status === 'escalated' ? 'call' : flagsOf(c).length ? 'check' : 'ready'
export const NEED_RANK: Record<Need, number> = { call: 0, yours: 1, check: 2, ready: 3, claire: 4, team: 5 }
export const plainDraft = (c: Conversation) => (c.draft ?? []).map(x => (typeof x === 'string' ? x : x.text)).join('')
export const lastText = (c: Conversation) => c.messages.filter(m => m.from === 'them').slice(-1)[0]?.text ?? ''
/** Why Nova stops on an escalation, in a few words: the Playbook rule, else the topic. */
export const reasonOf = (c: Conversation) => gist(c.rules?.[0] ?? cap((c.note ?? 'A topic Nova never answers herself').split(' · ')[0]), 8)

/**
 * The conversation to answer first (matrix §15 hierarchy): an escalation before anything else, then the furthest past its
 * target, then the longest wait. Nothing past its target and no escalation: none is set apart.
 */
export function leadOf(s: State, list: Conversation[], now: number) {
  const over = (c: Conversation) => { const w = waitOf(s, c, now); return w ? w.waited - w.target : -Infinity }
  return list
    .filter(c => needOf(c) === 'call' || waitOf(s, c, now)?.over)
    .sort((a, b) => Number(needOf(b) === 'call') - Number(needOf(a) === 'call') || over(b) - over(a))[0]
}

/** How long the customer has waited on the team, named in words, red once past the target for its type. */
export function WaitTag({ c, fallback }: { c: Conversation; fallback?: boolean }) {
  const { s } = useStore()
  const now = useNow(30_000)
  const w = waitOf(s, c, now)
  if (!w) return fallback ? <span className="mono faint ib-time">{hhmm(c.at)}</span> : null
  return <span className={`ib-wait ${w.over ? 'over' : ''}`} title={`Waiting since ${hhmm(w.since)} · ${dur(w.target)} target`}>Waiting {dur(w.waited)}{w.over ? ` · over ${dur(w.target)}` : ''}</span>
}

/** Nova's (or a teammate's) reply, previewed on the row in the replier's colour. */
export function ReplyLine({ by = 'nova', children }: { by?: 'nova' | string; children: ReactNode }) {
  return <p className={`ib-said ${by === 'nova' ? 'nova' : ''}`}>{by === 'nova' ? <Mark agent="nova" /> : <SocialAvatar name={by} size={16} />}<span className="ib-said-text">{children}</span></p>
}

/** The words that made Nova escalate, marked in the customer's message. */
export function Trigger({ text, words }: { text: string; words: string }) {
  const i = text.toLowerCase().indexOf(words.toLowerCase())
  if (i < 0) return <>{text}</>
  return <>{text.slice(0, i)}<mark className="ib-trigger">{text.slice(i, i + words.length)}</mark>{text.slice(i + words.length)}</>
}

/** Why Nova escalated: the rule, what matched and where, who the fan is, what she won't do. */
export function WhyEscalated({ c, fan }: { c: Conversation; fan?: string }) {
  const rule = c.rules?.[0]
  const open = PUBLIC.includes(c.type)
  return (
    <ul className="ib-why" aria-label="Why Nova escalated">
      {rule && <li><b>Rule</b><span>{rule}</span></li>}
      {c.trigger && <li><b>Why</b><span>“{c.trigger}” in {open ? `a public ${c.type}` : c.type === 'dm' ? 'a DM' : `a ${c.type}`}</span></li>}
      {fan && <li><b>Who</b><span>{fan}</span></li>}
      {open && <li><b>Never</b><span>Refunds or liability in public. The answer goes by DM.</span></li>}
    </ul>
  )
}

const dayStart = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }

/** Today in numbers: what came in (per hour, per network), how fast first replies went out against their target. */
export function dayStats(s: State, all: Conversation[], now: number) {
  const from = dayStart(now)
  const today = all.filter(c => c.at >= from && c.at <= now)
  const hours = Array.from({ length: new Date(now).getHours() + 1 }, () => 0)
  for (const c of today) hours[new Date(c.at).getHours()]++
  const nets = new Map<Network, number>()
  for (const c of today) nets.set(c.network, (nets.get(c.network) ?? 0) + 1)
  // First replies sent today, each against the target of its type; a conversation waiting past its target counts as missed.
  const gaps = all.flatMap(c => {
    const q = c.messages.find(m => m.from === 'them')
    const a = q && c.messages.find(m => m.from !== 'them' && m.at >= q.at && !m.undone)
    return q && a && a.at >= from ? [{ gap: a.at - q.at, ok: a.at - q.at <= (s.inbox.targets?.[c.type] ?? 0) * 60_000 }] : []
  })
  const late = all.filter(c => waitOf(s, c, now)?.over).length
  const sorted = gaps.map(g => g.gap).sort((a, b) => a - b)
  return {
    total: today.length,
    hours,
    nets: [...nets.entries()].sort((a, b) => b[1] - a[1]),
    alone: today.filter(c => c.status === 'auto').length,
    onTarget: gaps.length + late ? Math.round((gaps.filter(g => g.ok).length / (gaps.length + late)) * 100) : 100,
    median: sorted.length ? sorted[Math.floor(sorted.length / 2)] : undefined,
  }
}

/** The day at a glance, above Needs you: Nova's read, what waits on Sam, response time against target, today's volume. */
export function InboxOverview({ all, lead }: { all: Conversation[]; lead?: Conversation }) {
  const { s } = useStore()
  const now = useNow(30_000)
  const st = dayStats(s, all, now)
  const mine = all.filter(needsYou)
  const late = mine.filter(c => waitOf(s, c, now)?.over).length
  return (
    <section className="card ib-overview" aria-label="Today">
      <div className="ib-ov-nova"><Mark agent="nova" size="lg" /><p>I handled {st.alone} of today’s {st.total} alone{lead ? <>; <Link to={`/inbox/${lead.id}`}>{lead.author}</Link> needs you first</> : ''}.</p></div>
      <div className="ib-ov-stat">
        <span className="ib-ov-k">Waiting on you</span>
        <span className="ib-ov-v"><b className="num">{mine.length}</b></span>
        <span className={`ib-ov-sub ${late ? 'late' : ''}`}>{late ? `${late} past target` : 'All within target'}</span>
      </div>
      <div className="ib-ov-stat">
        <span className="ib-ov-k">Response time · today</span>
        <span className="ib-ov-v"><b className="num">{st.onTarget}%</b><span className="ib-ov-unit">on target</span></span>
        {st.median !== undefined && <span className="ib-ov-sub">Median first reply {dur(st.median)}</span>}
      </div>
      <div className="ib-ov-stat">
        <span className="ib-ov-k">New today</span>
        <span className="ib-ov-v"><b className="num">{st.total}</b><Spark data={st.hours} w={96} h={28} color="var(--a-nova)" label="New conversations per hour, today" /></span>
        <span className="ib-ov-sub ib-ov-nets">{st.nets.slice(0, 3).map(([n, k]) => <span key={n} title={`${NETWORK_LABEL[n]}: ${k}`}><Net n={n} size={14} /><span className="num">{k}</span></span>)}</span>
      </div>
    </section>
  )
}

/**
 * The conversation to answer first, set apart: the customer's message in full, why Nova stopped, her reply as it would
 * go out, and the decisions. The rest of Needs you stays the queue under it.
 */
export function FeaturedConv({ c, onOpen }: { c: Conversation; onOpen: (edit?: boolean) => void }) {
  const { s, d } = useStore()
  const now = useNow(30_000)
  const need = needOf(c)
  const text = lastText(c)
  const tr = translate(text)
  const send = () => d({ type: 'inbox/bulk', ids: [c.id], op: 'approve' })
  const takeOver = () => { d({ type: 'inbox/takeover', id: c.id }); onOpen() }
  const flag = flagsOf(c)[0]
  return (
    <section className={`card ib-feature ${need === 'call' ? 'urgent' : ''}`} aria-labelledby="ib-feature-h">
      <header className="ib-feature-head">
        <SocialAvatar name={c.author} network={c.network} size={48} />
        <div className="grow">
          <h2 id="ib-feature-h"><Link to={`/inbox/${c.id}`}>{c.author}</Link></h2>
          <p className="ib-meta-line"><Kind t={c.type} /><Mood s={c.sentiment} /><span>{NETWORK_LABEL[c.network]}</span><span>{ago(c.at, now)}</span></p>
        </div>
        <WaitTag c={c} />
      </header>
      <div className="ib-feature-thread">
        <div className="ib-bubble them">
          {c.post && <span className="ib-bubble-on">On {c.post}</span>}
          <p>{c.trigger ? <Trigger text={text} words={c.trigger} /> : text}</p>
          {tr && <p className="ib-tr">Translated from {tr.lang}: “{tr.en}”</p>}
        </div>
        {need === 'call' && (
          <p className="ib-feature-why"><Pill tone="alert">Your call</Pill>{reasonOf(c)}
            <MoreInfo label="Why?" title="Why Nova escalated">{c.trigger ? <WhyEscalated c={c} fan={fanOf(s, c)} /> : <p>{c.note}</p>}</MoreInfo></p>
        )}
        {need === 'check' && flag && <p className="ib-feature-why"><Pill tone="caution">Check a passage</Pill>{gist(flag.note, 14)}</p>}
        {!!c.draft?.length && (
          <div className="ib-reply-card">
            <p className="ib-reply-by"><Mark agent="nova" />{need === 'call' ? 'Nova’s holding reply' : 'Nova’s reply'}</p>
            {c.dm && <span className="ib-half"><MessageSquare size={14} aria-hidden />In public</span>}
            <p className="ib-bubble nova"><FlagText parts={c.draft} /></p>
            {c.dm && <><span className="ib-half"><Mail size={14} aria-hidden />Then by DM</span><p className="ib-bubble nova">{c.dm}</p></>}
          </div>
        )}
      </div>
      <div className="ib-feature-acts">
        {c.draft?.length ? <>
          <Btn variant="primary" onClick={send}><Send size={14} />{need === 'call' ? 'Send holding reply' : need === 'check' ? 'Send as is' : 'Send'}</Btn>
          <Btn onClick={() => onOpen(true)}>Edit</Btn>
          <Btn variant="ghost" onClick={takeOver}><Hand size={14} />Take over</Btn>
        </> : <Btn variant="primary" onClick={takeOver}><Hand size={14} />Take over</Btn>}
        {need === 'call' && c.status !== 'claire' && <Btn variant="ghost" onClick={() => d({ type: 'inbox/claire', id: c.id })}><UserRound size={14} />Ask Claire</Btn>}
      </div>
    </section>
  )
}

/** For the rows of the other states: the latest answer (Nova's, or a person's), to show on the row. */
export function lastAnswer(c: Conversation) {
  if (!waitingOn(c)) return [...c.messages].reverse().find(m => m.from !== 'them' && !m.undone && m.text.trim())
}
