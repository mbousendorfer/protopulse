// Listening › Needs you: everything Echo needs a decision on, grouped by gesture, each decided in place (PROMPT §3.9).
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, Flame, MessageSquareReply, Radar, Send, Sparkles, UserRound } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { ago } from '../../app/time'
import type { CompEvent, Move } from '../../data/listening'
import { Btn, Filters, Mark, Menu, Pill } from '../../ui'
import { CountBadge, UndoBar } from '../../ui/Feedback'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { MENTION_NET } from './slice'
import { competitorName, competitorOf, listeningNeeds, sentimentOf, watchedCount } from './model'
import { NETWORK_LABEL } from '../../data/agents'
import { gist } from '../../ui/gist'
import { InfoPop, MoreInfo } from '../../ui/More'
import './needs.css'

export const IMPACT_TONE = { High: 'alert', Medium: 'caution', Low: undefined } as const
const SHOWN = 3

type Group = 'urgent' | 'events' | 'mentions' | 'creators' | 'trends'
const LABEL: Record<Group, [string, string]> = {
  urgent: ['Urgent', 'Urgent'],
  events: ['Competitor move', 'Competitor moves'],
  mentions: ['Mention to answer', 'Mentions to answer'],
  creators: ['Creator worth a collab', 'Creators worth a collab'],
  trends: ['Trend to hand to Atlas', 'Trends to hand to Atlas'],
}
const ICON: Record<Group, typeof Send> = { urgent: Flame, events: Radar, mentions: MessageSquareReply, creators: UserRound, trends: Sparkles }

/** The verb for a move, on its button. The full move is the button's text when there's room (the choice). */
const VERB: Record<Move['kind'], string> = { counter: 'Hand to Atlas', sage: 'Brief Sage', sales: 'Tell the sales team', nova: 'Hand to Nova', lesson: 'Add to Echo’s lessons', none: 'Nothing to do' }

/** A shared undo for the dismissals made here (moves and replies carry their own notice). */
type Undo = { text: string; run: () => void }

export default function NeedsYou() {
  const { s } = useStore()
  const needs = listeningNeeds(s)
  const [only, setOnly] = useState<Group | 'all'>('all')
  const [undo, setUndo] = useState<Undo | null>(null)
  const groups = (Object.keys(LABEL) as Group[]).filter(g => needs[g].length)
  const total = groups.reduce((n, g) => n + needs[g].length, 0)
  const shown = groups.filter(g => only === 'all' || only === g)

  if (!total) return (
    <section className="card need-empty">
      <p><b>Nothing needs you here.</b> Echo is watching {watchedCount(s)} competitors, your mentions and the trends around you, and raises what needs a call.</p>
      {undo && <UndoBar onUndo={() => { undo.run(); setUndo(null) }} onDismiss={() => setUndo(null)}>{undo.text}</UndoBar>}
    </section>
  )
  return (
    <div className="stack">
      <Filters label="What needs you" value={groups.includes(only as Group) ? only : 'all'} onChange={setOnly}
        items={[{ value: 'all', label: 'All', count: total }, ...groups.map(g => ({ value: g, label: LABEL[g][1], count: needs[g].length }))]} />
      {undo && <UndoBar onUndo={() => { undo.run(); setUndo(null) }} onDismiss={() => setUndo(null)}>{undo.text}</UndoBar>}
      <section className="card needs" aria-label="Needs you">
        {shown.map(g => <NeedGroup key={g} g={g} needs={needs} onUndo={setUndo} />)}
      </section>
    </div>
  )
}

function NeedGroup({ g, needs, onUndo }: { g: Group; needs: ReturnType<typeof listeningNeeds>; onUndo: (u: Undo) => void }) {
  const { d } = useStore()
  const [open, setOpen] = useState(false)
  const n = needs[g].length
  const I = ICON[g]
  const rows: ReactNode[] =
    g === 'urgent' ? needs.urgent.map(h => <UrgentRow key={h.id} h={h} />)
    : g === 'events' ? needs.events.map(e => <EventNeedRow key={e.id} e={e} onUndo={onUndo} />)
    : g === 'mentions' ? needs.mentions.map(m => <MentionRow key={m.id} m={m} onUndo={onUndo} />)
    : g === 'creators' ? needs.creators.map(c => <CreatorRow key={c.handle} c={c} onUndo={onUndo} />)
    : needs.trends.map(t => <TrendRow key={t.id} t={t} onUndo={onUndo} />)
  // The reason the rows share is said once, here.
  const why: Record<Group, ReactNode> = {
    urgent: 'Echo’s spike guardrail stopped here',
    events: 'Anything public stays yours to publish',
    mentions: 'Nobody has answered yet. At risk ones need a reply within the hour',
    creators: <>Nova drafts the DM; you send it <InfoPop label="Who counts">Positive about Fernway, not paid by a brand, and reaching 10,000 people or more.</InfoPop></>,
    trends: 'Atlas drafts a post for your Desk',
  }
  const primary = g === 'mentions' && n > 1
    ? <Btn size="sm" variant="primary" onClick={() => d({ type: 'listening/mentions', ids: needs.mentions.map(m => m.id), op: 'nova' })}><MessageSquareReply size={14} />Ask Nova to reply to all {n}</Btn>
    : g === 'trends' && n > 1
      ? <Btn size="sm" variant="primary" onClick={() => d({ type: 'listening/trends', ids: needs.trends.map(t => t.id) })}><Mark agent="atlas" />Hand all {n} to Atlas</Btn>
      : null
  return (
    <section className={`need-group need-g-${g}`} aria-label={LABEL[g][1]}>
      <header className="need-head">
        <span className="need-icon" aria-hidden><I size={14} /></span>
        <h2>{LABEL[g][n > 1 ? 1 : 0]}</h2>
        <CountBadge n={n} needs={g === 'urgent'} />
        <span className="faint need-why">{why[g]}</span>
        <span className="spacer" />
        {primary}
      </header>
      <ul>{open ? rows : rows.slice(0, SHOWN)}</ul>
      {n > SHOWN && <button type="button" className="need-more" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Show less' : <>Show {n - SHOWN} more<ChevronDown size={14} /></>}</button>}
    </section>
  )
}

/** One competitor event: Echo's move as a choice, the other moves in a menu, Dismiss. Used here and in Competitors › Events. */
export function EventNeedRow({ e, onUndo }: { e: CompEvent; onUndo: (u: Undo) => void }) {
  const { s, d } = useStore()
  const now = useNow()
  const name = competitorName(s, e.competitor)
  const rec = e.moves.findIndex(m => m.kind !== 'none')
  const pick = (i: number) => d({ type: 'listening/move', event: e.id, index: i })
  const dismiss = () => { d({ type: 'listening/dismiss', event: e.id }); onUndo({ text: `Dismissed “${e.title}”. Echo keeps watching ${name}.`, run: () => d({ type: 'listening/reopen', kind: 'events', id: e.id }) }) }
  const others = e.moves.map((m, i) => ({ m, i })).filter(({ m, i }) => i !== rec && m.kind !== 'none')
  return (
    <li className="need-row need-event">
      <SocialAvatar name={name} network={e.proof.network} org size={32} />
      <div className="need-main">
        <p className="need-title"><Link to={`/listening/competitors/${e.id}`}>{e.title}</Link></p>
        <p className="need-line need-reason"><Pill tone={IMPACT_TONE[e.impact]}>{e.impact} impact</Pill><span className="ellipsis">{gist(e.impactWhy)}</span>
          <MoreInfo label="Why?" title={`Why Echo raised ${name}’s ${e.type.toLowerCase()}`}><EventWhy e={e} /></MoreInfo></p>
        <p className="need-meta">{e.type} · {ago(e.at, now)}</p>
      </div>
      <div className="need-acts">
        {rec >= 0 && (
          <button type="button" className="choice need-choice" onClick={() => pick(rec)} title={`${VERB[e.moves[rec].kind]}: ${e.moves[rec].label}`}>
            <Mark agent={e.moves[rec].agent} /><span>{e.moves[rec].label}</span><ArrowRight size={16} className="go" aria-hidden />
          </button>
        )}
        {others.length > 0 && <Menu trigger={<Btn size="sm" variant="ghost">Other moves<ChevronDown size={14} /></Btn>}
          items={others.map(({ m, i }) => ({ label: m.label, icon: <Mark agent={m.agent} />, onSelect: () => pick(i) }))} />}
        <Btn size="sm" variant="ghost" onClick={dismiss}>Dismiss</Btn>
      </div>
    </li>
  )
}

/** Behind « Why? » on a competitor move: the proof, the impact in full, and Echo's read, before picking a counter-move. */
export function EventWhy({ e }: { e: CompEvent }) {
  const { s } = useStore()
  const c = competitorOf(s, e.competitor)
  const handle = c?.handle ?? competitorName(s, e.competitor)
  return (
    <div className="stack">
      <p><b>{e.title}</b></p>
      <section className="stack gap-2">
        <div className="faint row tight"><SocialAvatar name={handle} network={e.proof.network} org size={24} />Proof · {NETWORK_LABEL[e.proof.network]} · {handle}</div>
        <blockquote className="ls-quote">{e.proof.text}</blockquote>
        <span className="mono faint">{e.proof.metric}</span>
      </section>
      <section className="stack gap-2">
        <div className="section-title flush">Estimated impact <Pill tone={IMPACT_TONE[e.impact]}>{e.impact}</Pill></div>
        <p>{e.impactWhy}</p>
      </section>
      <section className="echo-read need-read"><Mark agent="echo" /><div><div className="section-title flush">Echo’s read</div><p>{e.read}</p></div></section>
      <Link to={`/listening/competitors/${e.id}`} className="btn sm self-start">Open the event</Link>
    </div>
  )
}

function UrgentRow({ h }: { h: ReturnType<typeof listeningNeeds>['urgent'][number] }) {
  const { d } = useStore()
  return (
    <li className="need-row need-urgent">
      <div className="need-main">
        <p className="need-title"><Link to={h.link ?? '/listening/mentions'}>{h.title}</Link></p>
        <p className="need-line need-reason"><span className="ellipsis">{gist(h.why)}</span>{gist(h.why) !== h.why && <MoreInfo label="Why?" title="Why Echo stopped here"><p>{h.why}</p>{h.context && <p className="muted">{h.context}</p>}</MoreInfo>}</p>
        {h.options?.length ? (
          <ol className="need-options">
            {h.options.map((o, i) => (
              <li key={o.label}><button type="button" className="choice" onClick={() => d({ type: 'core/resolve', id: h.id, decision: { kind: 'option', option: o.label, index: i } })}>
                <span>{o.label}</span>{o.recommended && <span className="rec-tag">Recommended</span>}<ArrowRight size={16} className="go" aria-hidden />
              </button></li>
            ))}
          </ol>
        ) : <Link to="/" className="btn sm self-start">Review on Desk</Link>}
      </div>
    </li>
  )
}

function MentionRow({ m, onUndo }: { m: ReturnType<typeof listeningNeeds>['mentions'][number]; onUndo: (u: Undo) => void }) {
  const { s, d } = useStore()
  const now = useNow()
  const mood = sentimentOf(s, m)
  const why = m.risk ? 'At risk' : mood === 'negative' ? 'Negative' : 'A question'
  const seen = () => { d({ type: 'listening/seen', ids: [m.id] }); onUndo({ text: `Marked ${m.author}’s mention as seen. It stays in Mentions.`, run: () => d({ type: 'listening/unseen', ids: [m.id] }) }) }
  return (
    <li className="need-row">
      <SocialAvatar name={m.author} network={MENTION_NET[m.network]} org={!m.author.startsWith('@')} size={32} />
      <div className="need-main">
        <p className="need-title"><b>{m.author}</b><span className="need-quote">“{m.text}”</span></p>
        <p className="need-line"><span>{why} · reach {m.reach.toLocaleString('en-GB')} · {ago(m.at, now)}</span></p>
      </div>
      <div className="need-acts">
        <Btn size="sm" onClick={() => d({ type: 'listening/mentions', ids: [m.id], op: 'nova' })} aria-label={`Ask Nova to reply to ${m.author}`}><Mark agent="nova" />Reply</Btn>
        <Btn size="sm" variant="ghost" onClick={seen}>Mark seen</Btn>
      </div>
    </li>
  )
}

function CreatorRow({ c, onUndo }: { c: ReturnType<typeof listeningNeeds>['creators'][number]; onUndo: (u: Undo) => void }) {
  const { d } = useStore()
  const list = () => { d({ type: 'listening/creator', handle: c.handle, op: 'list' }); onUndo({ text: `Shortlisted ${c.handle}.`, run: () => d({ type: 'listening/creator', handle: c.handle, op: 'unlist' }) }) }
  return (
    <li className="need-row">
      <SocialAvatar name={c.handle} network={MENTION_NET[c.network]} size={32} />
      <div className="need-main">
        <p className="need-title"><Link to={`/listening/creators?c=${encodeURIComponent(c.handle)}`}>{c.handle}</Link><span className="need-quote">{c.name}</span></p>
        <p className="need-line"><span>{c.followers.toLocaleString('en-GB')} followers on {c.network} · {c.mentions.length} mention{c.mentions.length > 1 ? 's' : ''} of Fernway{c.also.length ? ` · also mentions ${c.also.map(a => a.competitor).join(', ')}` : ''}</span></p>
      </div>
      <div className="need-acts">
        <Btn size="sm" onClick={() => d({ type: 'listening/creator', handle: c.handle, op: 'propose' })}><Mark agent="nova" />Propose a collab</Btn>
        <Btn size="sm" variant="ghost" onClick={list}>Shortlist</Btn>
      </div>
    </li>
  )
}

function TrendRow({ t, onUndo }: { t: ReturnType<typeof listeningNeeds>['trends'][number]; onUndo: (u: Undo) => void }) {
  const { d } = useStore()
  const dismiss = () => { d({ type: 'listening/trend', id: t.id, hand: false }); onUndo({ text: `Dismissed “${t.name}”.`, run: () => d({ type: 'listening/reopen', kind: 'trends', id: t.id }) }) }
  return (
    <li className="need-row">
      <div className="need-main">
        <p className="need-title"><Link to="/listening/trends">{t.name}</Link></p>
        <p className="need-line"><span>{t.growth} on {t.networks} · {t.fitWhy}</span></p>
      </div>
      <div className="need-acts">
        <Btn size="sm" onClick={() => d({ type: 'listening/trend', id: t.id, hand: true })}><Mark agent="atlas" />Hand to Atlas</Btn>
        <Btn size="sm" variant="ghost" onClick={dismiss}>Dismiss</Btn>
      </div>
    </li>
  )
}
