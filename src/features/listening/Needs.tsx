// Listening › Needs you: one standard list (matrix §14). States are filters, the kind (competitor moves, mentions,
// creators, trends) is a menu. Creators and trends Echo doesn't push are « Watching »; what was decided is « Done ».
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, Flame, MessageSquareReply, MoreHorizontal, Sparkles } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import type { State } from '../../app/state'
import type { Handoff, Network } from '../../app/types'
import { ago } from '../../app/time'
import { TRENDS, type CompEvent, type Move, type Trend } from '../../data/listening'
import { NETWORK_LABEL } from '../../data/agents'
import { Btn, Empty, Filters, Mark, Menu, Pill, Sheet } from '../../ui'
import { Ask, ObjectBody, Props, Timeline } from '../../ui/ObjectPanel'
import { CardActs, DecisionRow } from '../../ui/Decisions'
import { Reopen, UndoBar } from '../../ui/Feedback'
import { BulkBar, SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { gist } from '../../ui/gist'
import { InfoPop, MoreInfo } from '../../ui/More'
import { MENTION_NET } from './slice'
import { COLLAB_MIN_REACH, strongestEvent, competitorName, competitorOf, creatorsOf, eventState, eventsOf, listeningNeeds, sentimentOf, watchedCount, type Creator } from './model'
import { Status, plural } from './list'
import { CompetitorsAside, FeaturedMove, FeaturedUrgent, Overview } from './Overview'

export const IMPACT_TONE = { High: 'alert', Medium: 'caution', Low: undefined } as const

type Show = 'needs' | 'watching' | 'done'
const SHOW_LABEL: Record<Show, string> = { needs: 'Needs you', watching: 'Watching', done: 'Done' }
type Kind = 'urgent' | 'events' | 'mentions' | 'creators' | 'trends'
const KIND_LABEL: Record<Kind, string> = { urgent: 'Urgent', events: 'Competitor moves', mentions: 'Mentions', creators: 'Creators', trends: 'Trends' }
/** The verb for a move, on its button. Every move, in full, is in the menu next to it. */
const VERB: Record<Move['kind'], string> = { counter: 'Hand to Atlas', sage: 'Brief Sage', sales: 'Tell the sales team', nova: 'Hand to Nova', lesson: 'Add to Echo’s lessons', none: 'Nothing to do' }
/** The queue stays short: the first rows, then « Show more ». */
const PAGE = 8

type Undo = { text: string; run: () => void }

/** Creators and trends Echo watches without asking you, and what was already decided. */
function watchingOf(s: State) {
  return {
    trends: TRENDS.filter(t => t.fit !== 'High' && !s.listening.trends[t.id]),
    creators: creatorsOf(s).filter(c => !c.fit && !c.signed && !s.listening.creators[c.handle]),
  }
}
function doneOf(s: State) {
  const watched = new Set(s.listening.watch.filter(w => w.tracking).map(w => w.id))
  return {
    events: eventsOf(s).filter(e => watched.has(e.competitor) && eventState(s, e)).sort((a, b) => b.at - a.at),
    trends: TRENDS.filter(t => s.listening.trends[t.id]),
    creators: creatorsOf(s).filter(c => s.listening.creators[c.handle]),
  }
}

export default function NeedsYou() {
  const { s, d } = useStore()
  const [params, setParams] = useSearchParams()
  const needs = listeningNeeds(s)
  const watching = watchingOf(s)
  const done = doneOf(s)
  const [undo, setUndo] = useState<Undo | null>(null)
  const [page, setPage] = useState(PAGE)
  const kindParam = params.get('kind') as Kind | null
  const kind: Kind | 'all' = kindParam && kindParam in KIND_LABEL ? kindParam : 'all'
  const on = (k: Kind) => kind === 'all' || kind === k
  const size = (o: Partial<Record<Kind, unknown[]>>) => (Object.keys(o) as Kind[]).reduce((n, k) => n + (on(k) ? o[k]!.length : 0), 0)
  const counts: Record<Show, number> = { needs: size(needs), watching: size(watching), done: size(done) }
  const shown = (Object.keys(SHOW_LABEL) as Show[]).filter(k => k === 'needs' || counts[k] > 0)
  const pick = (params.get('show') as Show | null) ?? 'needs'
  const show = shown.includes(pick) ? pick : 'needs'
  const set = (p: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(p).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next, { replace: true }); setPage(PAGE)
  }

  // Bulk: the mentions that need a reply, the volume case.
  const mentions = on('mentions') && show === 'needs' ? needs.mentions : []
  const ids = useMemo(() => mentions.map(m => m.id), [mentions.map(m => m.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(ids, `${show}-${kind}`)
  const trends = on('trends') && show === 'needs' ? needs.trends : []

  // Set apart: the spike if Echo raised one, else the strongest competitor move. It leaves the queue below.
  const top = show !== 'needs' ? undefined : on('urgent') && needs.urgent[0] ? needs.urgent[0] : on('events') ? strongestEvent(s) : undefined
  const dismissTop = (e: CompEvent) => { d({ type: 'listening/dismiss', event: e.id }); setUndo({ text: `Dismissed “${e.title}”. Echo keeps watching ${competitorName(s, e.competitor)}.`, run: () => d({ type: 'listening/reopen', kind: 'events', id: e.id }) }) }

  const creator = creatorsOf(s).find(c => c.handle === params.get('c'))
  const rows: ReactNode[] = show === 'needs' ? [
    ...(on('urgent') ? needs.urgent.filter(h => h !== top).map(h => <UrgentRow key={h.id} h={h} />) : []),
    ...(on('events') ? needs.events.filter(e => e !== top).map(e => <EventNeedRow key={e.id} e={e} onUndo={setUndo} />) : []),
    ...(on('creators') ? needs.creators.map(c => <CreatorRow key={c.handle} c={c} onUndo={setUndo} />) : []),
    ...trends.map(t => <TrendRow key={t.id} t={t} onUndo={setUndo} />),
    ...mentions.map(m => <MentionRow key={m.id} m={m} onUndo={setUndo} check={<SelectBox checked={sel.has(m.id)} visible={sel.count > 0} onToggle={shift => sel.toggle(m.id, shift)} label={`Select ${m.author}’s mention`} />} />),
  ] : show === 'watching' ? [
    ...(on('creators') ? watching.creators.map(c => <CreatorRow key={c.handle} c={c} onUndo={setUndo} />) : []),
    ...(on('trends') ? watching.trends.map(t => <TrendRow key={t.id} t={t} onUndo={setUndo} />) : []),
  ] : [
    ...(on('events') ? done.events.map(e => <EventDoneRow key={e.id} e={e} />) : []),
    ...(on('creators') ? done.creators.map(c => <CreatorRow key={c.handle} c={c} onUndo={setUndo} />) : []),
    ...(on('trends') ? done.trends.map(t => <TrendRow key={t.id} t={t} onUndo={setUndo} />) : []),
  ]
  const kinds = (Object.keys(KIND_LABEL) as Kind[]).filter(k => [needs, watching, done].some(o => ((o as Partial<Record<Kind, unknown[]>>)[k]?.length ?? 0) > 0))

  const head = sel.count > 0
    ? <BulkBar count={sel.count} noun={sel.count > 1 ? 'mentions selected' : 'mention selected'} onClear={sel.clear} actions={[
        { label: `Ask Nova to reply to ${sel.count}`, icon: <MessageSquareReply size={14} />, primary: true, onRun: () => { d({ type: 'listening/mentions', ids: [...sel.selected], op: 'nova' }); sel.clear() } },
        { label: 'Mark seen', onRun: () => { d({ type: 'listening/seen', ids: [...sel.selected] }); sel.clear() } },
      ]} />
    : mentions.length > 0 || trends.length > 1 ? (
      <div className="sl-head">
        {mentions.length > 0 && <SelectAll sel={sel} label="Select every mention to answer" />}
        <span className="spacer" />
        {mentions.length > 0
          ? <Btn size="sm" variant="primary" onClick={() => d({ type: 'listening/mentions', ids, op: 'nova' })}><MessageSquareReply size={14} />Ask Nova to reply to {mentions.length}</Btn>
          : <Btn size="sm" variant="primary" onClick={() => d({ type: 'listening/trends', ids: trends.map(t => t.id) })}><Mark agent="atlas" />Hand {trends.length} trends to Atlas</Btn>}
      </div>
    ) : null

  return (
    <div className="stack lg">
      <Overview />
      <div className="ls-landing">
      <div className="ls-main">
      {top && (!('moves' in top)
        ? <FeaturedUrgent h={top as Handoff} />
        : <FeaturedMove e={top as CompEvent} onDismiss={() => dismissTop(top as CompEvent)} />)}
      <div className="sl-bar">
        <Filters label="Show" value={show} onChange={v => { set({ show: v === 'needs' ? null : v }); sel.clear() }}
          items={shown.map(k => ({ value: k, label: SHOW_LABEL[k], count: counts[k] }))} />
        {kinds.length > 1 && <div className="sl-menus">
          <Menu align="end" trigger={<Btn size="sm" variant="ghost">{kind === 'all' ? 'Everything' : KIND_LABEL[kind]}<ChevronDown size={12} /></Btn>}
            items={[{ label: 'Everything', onSelect: () => set({ kind: null }) }, ...kinds.map(k => ({ label: KIND_LABEL[k], hint: kind === k ? <Check size={14} aria-label="Current" /> : undefined, onSelect: () => set({ kind: k }) }))]} />
        </div>}
      </div>
      {rows.length ? (
        <section className="card sl-list" aria-label={SHOW_LABEL[show]}>
          {undo && <UndoBar onUndo={() => { undo.run(); setUndo(null) }} onDismiss={() => setUndo(null)}>{undo.text}</UndoBar>}
          {head}
          <ul className="rows">{rows.slice(0, page)}</ul>
          {rows.length > page && <div className="sl-more"><Btn size="sm" variant="ghost" onClick={() => setPage(p => p + PAGE)}>Show {Math.min(PAGE, rows.length - page)} more of {rows.length - page}<ChevronDown size={14} aria-hidden /></Btn></div>}
        </section>
      ) : <>
        {undo && <UndoBar onUndo={() => { undo.run(); setUndo(null) }} onDismiss={() => setUndo(null)}>{undo.text}</UndoBar>}
        {!top && <Empty title={show === 'needs' ? 'Nothing needs you here' : `Nothing ${SHOW_LABEL[show].toLowerCase()}`} body={show === 'needs' ? `Echo watches ${watchedCount(s)} competitors, your mentions and the trends around you.` : undefined} />}
      </>}
      </div>
      <CompetitorsAside />
      </div>
      <CreatorSheet c={creator} onClose={() => set({ c: null })} />
    </div>
  )
}

/** One competitor event: Echo's recommended move on the row, every move in the menu next to it. Also on Desk links. */
export function EventNeedRow({ e, onUndo }: { e: CompEvent; onUndo: (u: Undo) => void }) {
  const { s, d } = useStore()
  const name = competitorName(s, e.competitor)
  const rec = e.moves.findIndex(m => m.kind !== 'none')
  const pick = (i: number) => d({ type: 'listening/move', event: e.id, index: i })
  const dismiss = () => { d({ type: 'listening/dismiss', event: e.id }); onUndo({ text: `Dismissed “${e.title}”. Echo keeps watching ${name}.`, run: () => d({ type: 'listening/reopen', kind: 'events', id: e.id }) }) }
  return (
    <DecisionRow lead={<SocialAvatar name={name} network={e.proof.network} org size={32} />}
      title={<Link to={`/listening/competitors/${e.id}`}>{e.title}</Link>}
      line={<><Pill tone={IMPACT_TONE[e.impact]}>{e.impact} impact</Pill><span className="sl-gist">{gist(e.impactWhy)}</span>
        <MoreInfo label="Why?" title={`Why Echo raised ${name}’s ${e.type.toLowerCase()}`}><EventWhy e={e} /></MoreInfo></>}
      acts={<>
        {rec >= 0 && <Btn size="sm" title={e.moves[rec].label} onClick={() => pick(rec)}><Mark agent={e.moves[rec].agent} />{VERB[e.moves[rec].kind]}</Btn>}
        <Menu trigger={<Btn size="sm" variant="ghost">Moves<ChevronDown size={12} /></Btn>} items={[
          { heading: 'Echo’s moves' },
          ...e.moves.map((m, i) => ({ label: m.label, icon: m.kind !== 'none' ? <Mark agent={m.agent} /> : undefined, hint: i === rec ? 'Recommended' : undefined, onSelect: () => pick(i) })),
          'sep', { label: 'Dismiss', onSelect: dismiss },
        ]} />
      </>} />
  )
}

/** Behind « Why? » on a competitor move: the proof, the impact in full, and Echo's read. */
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
      <section className="echo-read"><Mark agent="echo" /><div><div className="section-title flush">Echo’s read</div><p>{e.read}</p></div></section>
      <Link to={`/listening/competitors/${e.id}`} className="btn sm self-start">Open the event</Link>
    </div>
  )
}

function EventDoneRow({ e }: { e: CompEvent }) {
  const { s, d } = useStore()
  const now = useNow()
  const st = eventState(s, e)!
  return (
    <DecisionRow lead={<SocialAvatar name={competitorName(s, e.competitor)} network={e.proof.network} org size={32} />}
      title={<Link to={`/listening/competitors/${e.id}`}>{e.title}</Link>}
      line={<><span className="sl-gist">{st.result}</span><span>{ago(e.at, now)}</span></>}
      acts={s.listening.events[e.id]?.status === 'dismissed' ? <Reopen onUndo={() => d({ type: 'listening/reopen', kind: 'events', id: e.id })} /> : <Pill tone="ok"><Check size={12} />{st.status === 'handed' ? 'Handed over' : 'Handled'}</Pill>} />
  )
}

function UrgentRow({ h }: { h: ReturnType<typeof listeningNeeds>['urgent'][number] }) {
  return (
    <DecisionRow lead={<span className="sl-lead-icon urgent" aria-hidden><Flame size={14} /></span>}
      title={<Link to={h.link ?? '/listening/mentions'}>{h.title}</Link>}
      line={<><Status label="Urgent" tone="alert" /><span className="sl-gist">{gist(h.why)}</span>
        <MoreInfo label="Why?" title="Why Echo stopped here"><p>{h.why}</p>{h.context && <p className="muted">{h.context}</p>}</MoreInfo></>}
      acts={<CardActs h={h} />} />
  )
}

function MentionRow({ m, onUndo, check }: { m: ReturnType<typeof listeningNeeds>['mentions'][number]; onUndo: (u: Undo) => void; check: ReactNode }) {
  const { s, d } = useStore()
  const now = useNow()
  const mood = sentimentOf(s, m)
  const seen = () => { d({ type: 'listening/seen', ids: [m.id] }); onUndo({ text: `Marked ${m.author}’s mention as seen. It stays in Mentions.`, run: () => d({ type: 'listening/unseen', ids: [m.id] }) }) }
  return (
    <DecisionRow lead={check}
      title={<><b>{m.author}</b><span className="sl-quote">“{m.text}”</span></>}
      line={<>
        <SocialAvatar name={m.author} network={MENTION_NET[m.network]} org={!m.author.startsWith('@')} size={16} />
        {m.risk ? <Pill tone="alert">At risk</Pill> : mood === 'negative' ? <Pill tone="caution">Negative</Pill> : <Pill>A question</Pill>}
        <span>Reach {m.reach.toLocaleString('en-GB')}</span><span>{ago(m.at, now)}</span>
      </>}
      acts={<>
        <Btn size="sm" onClick={() => d({ type: 'listening/mentions', ids: [m.id], op: 'nova' })} aria-label={`Ask Nova to reply to ${m.author}`}><Mark agent="nova" />Reply</Btn>
        <Menu trigger={<Btn size="sm" variant="ghost" aria-label={`More for ${m.author}’s mention`}>More<ChevronDown size={12} /></Btn>} items={[
          { label: 'Mark seen', onSelect: seen },
          { label: 'Hand to Atlas', onSelect: () => d({ type: 'listening/mentions', ids: [m.id], op: 'atlas' }) },
          { label: 'Hide', onSelect: () => d({ type: 'listening/mentions', ids: [m.id], op: 'hide' }) },
        ]} />
      </>} />
  )
}

const CREATOR_STATUS = { listed: 'Shortlisted', proposed: 'DM on your Desk', contacted: 'Contacted' } as const

function CreatorRow({ c, onUndo }: { c: Creator; onUndo: (u: Undo) => void }) {
  const { s, d } = useStore()
  const [params, setParams] = useSearchParams()
  const st = s.listening.creators[c.handle]
  const open = () => { const p = new URLSearchParams(params); p.set('c', c.handle); setParams(p, { replace: true }) }
  const list = () => { d({ type: 'listening/creator', handle: c.handle, op: 'list' }); onUndo({ text: `Shortlisted ${c.handle}.`, run: () => d({ type: 'listening/creator', handle: c.handle, op: 'unlist' }) }) }
  return (
    <DecisionRow lead={<SocialAvatar name={c.handle} network={MENTION_NET[c.network]} size={32} />}
      title={<><button type="button" className="link-title" onClick={open}>{c.handle}</button><span className="sl-quote">{c.name}</span></>}
      line={<>
        {st && <Pill tone={st === 'contacted' ? 'ok' : 'signal'}>{CREATOR_STATUS[st]}</Pill>}
        <span>{c.followers.toLocaleString('en-GB')} followers</span><span>{plural(c.mentions.length, 'mention')}</span>
        {c.also.length > 0 && <span className="sl-gist">Also mentions {c.also.map(a => a.competitor).join(', ')}</span>}
        <InfoPop label="Why?">{c.fitWhy}</InfoPop>
      </>}
      acts={st === 'listed' ? <>
          {c.fit && <Btn size="sm" onClick={() => d({ type: 'listening/creator', handle: c.handle, op: 'propose' })}><Mark agent="nova" />Propose a collab</Btn>}
          <Btn size="sm" variant="ghost" onClick={() => d({ type: 'listening/creator', handle: c.handle, op: 'unlist' })}>Remove from shortlist</Btn>
        </> : st ? null : <>
          {c.fit && <Btn size="sm" onClick={() => d({ type: 'listening/creator', handle: c.handle, op: 'propose' })}><Mark agent="nova" />Propose a collab</Btn>}
          <Btn size="sm" variant={c.fit ? 'ghost' : undefined} onClick={list}>Shortlist</Btn>
        </>} />
  )
}

function TrendRow({ t, onUndo }: { t: Trend; onUndo: (u: Undo) => void }) {
  const { s, d } = useStore()
  const st = s.listening.trends[t.id]
  const dismiss = () => { d({ type: 'listening/trend', id: t.id, hand: false }); onUndo({ text: `Dismissed “${t.name}”.`, run: () => d({ type: 'listening/reopen', kind: 'trends', id: t.id }) }) }
  return (
    <DecisionRow lead={<span className="sl-lead-icon" aria-hidden><Sparkles size={14} /></span>}
      title={t.name}
      line={<>
        {t.fit !== 'High' && <Pill>{t.fit} fit</Pill>}
        <span>{t.growth}</span><span className="sl-gist">{t.networks}</span>
        <InfoPop label="Why?"><p>{t.fitWhy}</p><ul className="stack gap-2">{t.examples.map(x => <li key={x} className="muted">{x}</li>)}</ul></InfoPop>
      </>}
      acts={st === 'handed' ? <Pill tone="signal"><Check size={12} />With Atlas</Pill>
        : st === 'dismissed' ? <Reopen onUndo={() => d({ type: 'listening/reopen', kind: 'trends', id: t.id })} />
        : <><Btn size="sm" onClick={() => d({ type: 'listening/trend', id: t.id, hand: true })}><Mark agent="atlas" />Hand to Atlas</Btn><Btn size="sm" variant="ghost" onClick={dismiss}>Dismiss</Btn></>} />
  )
}

/** A creator's panel (matrix §16): audience, sentiment, history, their mentions. Opened by `?c=` (Desk cards link here). */
function CreatorSheet({ c, onClose }: { c?: Creator; onClose: () => void }) {
  const { s, d } = useStore()
  const st = c && s.listening.creators[c.handle]
  if (!c) return null
  const net = (MENTION_NET[c.network] ?? c.network) as Network
  const decide = c.fit && !c.signed && st !== 'proposed' && st !== 'contacted'
  return (
    <Sheet open onOpenChange={o => !o && onClose()}
      head={<SocialAvatar name={c.handle} network={net} size={40} />}
      title={c.handle} meta={[c.name, c.network, `${c.followers.toLocaleString('en-GB')} followers`]}
      status={c.signed ? <Pill tone="caution">Signed with {c.signed}</Pill> : st === 'proposed' || st === 'contacted' ? <Pill tone="ok">Collab proposed</Pill> : st === 'listed' ? <Pill>Shortlisted</Pill> : undefined}
      tools={st === 'listed' && <Menu align="end" trigger={<Btn variant="ghost" icon size="sm" aria-label="More actions"><MoreHorizontal size={16} /></Btn>} items={[
        { label: 'Remove from shortlist', onSelect: () => d({ type: 'listening/creator', handle: c.handle, op: 'unlist' }) },
      ]} />}>
      <div className="obj-panel">
        {decide && (
          <Ask agents={['echo']} title={`Work with ${c.handle}?`} actions={<>
            <Btn variant="primary" onClick={() => d({ type: 'listening/creator', handle: c.handle, op: 'propose' })}><MessageSquareReply size={14} />Propose a collab</Btn>
            {!st && <Btn onClick={() => d({ type: 'listening/creator', handle: c.handle, op: 'list' })}>Shortlist</Btn>}
          </>}>
            <p>{gist(c.fitWhy)} <InfoPop label="Who counts">Positive about Fernway, not paid by a brand, and reaching {COLLAB_MIN_REACH.toLocaleString('en-GB')} people or more.</InfoPop></p>
          </Ask>
        )}
        <ObjectBody
          main={<>
            <h3 className="obj-sec-h">Their mentions of Fernway</h3>
            {c.mentions.map(m => <blockquote key={m.id} className="ls-quote">{m.text}</blockquote>)}
          </>}
          aside={<>
            <Props rows={[
              { label: 'Audience', value: <span className="num">{c.followers.toLocaleString('en-GB')} followers on {c.network}</span> },
              { label: 'Sentiment', value: <span className={`ls-mood ${c.mood}`}>{c.mood[0].toUpperCase() + c.mood.slice(1)}</span> },
              { label: 'Also mentions', value: c.also.length ? c.also.map(a => `${a.competitor} (${a.n})`).join(', ') : undefined },
              !decide && { label: 'Echo’s call', value: c.fitWhy },
            ]} />
            <Timeline lines={c.history.map(text => ({ text }))} empty="Echo has no history on this creator yet." />
          </>}
        />
      </div>
    </Sheet>
  )
}
