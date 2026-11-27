import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, BookOpen, CalendarDays, ChartLine, Check, ChevronDown, ChevronRight, Flame, Layers, Lightbulb, MessageCircle, Radar, Sparkles, TriangleAlert, X } from 'lucide-react'
import type { AgentId, Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { DAY, T, ago, hhmm } from '../../app/time'
import { NETWORK_LABEL, agentName } from '../../data/agents'
import { MEDIA, type Post } from '../../data/publishing'
import { BANNED } from '../../data/playbook'
import type { Idea, IdeaSource } from '../../data/ideas'
import { Btn, Empty, Filters, Mark, Menu, Net, Pill, Seg, Thinking } from '../../ui'
import { BulkBar, SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { Notice, Reopen, UndoBar } from '../../ui/Feedback'
import { InfoPop, MoreInfo } from '../../ui/More'
import Photo from '../../ui/Photo'
import { mixOf, targetsOf } from '../strategy/slice'
import { NetworkPreview } from './Previews'
import { checkPost } from './checks'
import { ANGLES, diffWords, sentences, freshness, isOpen, mixVariants, variantText, variantsOf, type Angle, type Variant } from './ideasModel'
import { slotComment } from './slice'
import { NeedRow, atlasNeeds, gestureOf } from './Needs'
import { PostsBulk, useOpenPost } from './Bulk'

/*
 * Publishing's landing (matrix §15): an overview of the week, Needs you as a short queue (§14, the rail badge), then
 * Atlas's ideas as cards (the strongest one set apart, series as a row of linked posts) or the drafts in the same
 * shape. Opening an idea shows its panel beside the cards.
 */

export const DISMISS_REASONS = ['Off-brand', 'Not timely', 'Already covered', 'Wrong pillar']
const SOURCE_ICON = { analytics: ChartLine, listening: Flame, brand: BookOpen, calendar: CalendarDays }
const slot = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}, ${hhmm(t)}`
const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
/** Several photos share a scene name: prefer the one the idea's customer gave permission for. */
const mediaOf = (i: Idea, name?: string) => (name ? MEDIA.filter(m => m.name === name).sort((a, b) => Number(!!i.customer && b.rights.includes(i.customer.handle)) - Number(!!i.customer && a.rights.includes(i.customer.handle)))[0] : undefined)
const iconOf = (x: IdeaSource) => (x.link.includes('/competitors') ? Radar : /^(@|r\/)/.test(x.label) ? MessageCircle : SOURCE_ICON[x.type])
const finders = (i: Idea) => [...new Set(i.sources.map(x => x.agent))].filter(a => a !== 'atlas') as AgentId[]
const isInteractive = (e: MouseEvent) => !!(e.target as Element).closest('a, button, input, label, form, [role="menu"]')

/** Not this one: back tomorrow, or dismiss with a reason. One menu instead of two buttons. */
function NotNow({ i, size, onDone }: { i: Idea; size?: 'sm'; onDone?: () => void }) {
  const { d } = useStore()
  return (
    <Menu align="end" trigger={<Btn size={size} variant="ghost" onClick={e => e.stopPropagation()}>Not this one<ChevronDown size={12} /></Btn>}
      items={[
        { label: 'Back tomorrow at 08:00', onSelect: () => { d({ type: 'publishing/ideaSnooze', ids: [i.id] }); onDone?.() } },
        'sep', { heading: 'Dismiss: why?' },
        ...DISMISS_REASONS.map(r => ({ label: r, onSelect: () => { d({ type: 'publishing/ideaDismiss', id: i.id, reason: r }); onDone?.() } })),
      ]} />
  )
}

/** The main action: Schedule when written, Draft it otherwise; Thursday's batch joins the plan; a series goes to Sage. Orange only when it schedules. */
function Primary({ i, size }: { i: Idea; size?: 'sm' }) {
  const { s, d } = useStore()
  const stop = (f: () => void) => (e: MouseEvent) => { e.stopPropagation(); f() }
  if (i.kind === 'series') return <Btn size={size} variant={size ? undefined : 'primary'} onClick={stop(() => d({ type: 'publishing/ideaToSage', id: i.id }))}>Send to Sage</Btn>
  if (i.origin === 'weekly' && s.publishing.plan.status === 'proposed') return <Btn size={size} variant={size ? undefined : 'primary'} onClick={stop(() => d({ type: 'publishing/ideaToPlan', id: i.id }))}>{size ? 'Add to plan' : 'Add to next week’s plan'}</Btn>
  if (i.status === 'ready') return <Btn size={size} variant={size ? undefined : 'primary'} onClick={stop(() => d({ type: 'publishing/ideaSchedule', ids: [i.id] }))}>Schedule{size ? '' : ` ${slot(i.drafts![0].at)}`}</Btn>
  return <Btn size={size} variant={size ? undefined : 'primary'} onClick={stop(() => d({ type: 'publishing/ideaDraft', id: i.id }))}>Draft it</Btn>
}

function RuleProposal({ i }: { i: Idea }) {
  const { d } = useStore()
  if (!i.proposal) return null
  const what = i.proposal.key.startsWith('dismiss:') ? <>You dismissed two ideas as <b>{i.proposal.key.slice(8).toLowerCase()}</b>.</> : <>You picked <b>{ANGLES.find(a => `angle:${a.key}` === i.proposal!.key)?.label}</b> twice.</>
  return (
    <div className="idea-rule" role="status" onClick={e => e.stopPropagation()}>
      <Mark agent="atlas" />
      <p>{what} Make it a rule? “{i.proposal.text}”</p>
      <Btn size="sm" onClick={() => d({ type: 'publishing/ideaRule', id: i.id, accept: true })}>Add to Playbook</Btn>
      <Btn size="sm" variant="ghost" onClick={() => d({ type: 'publishing/ideaRule', id: i.id, accept: false })}>No</Btn>
    </div>
  )
}

/* ---------- Overview: the week, the pillar mix, Atlas's read ---------- */

const WEEKDAY = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** One short band (matrix §15): this week's posts by day, the pillar mix against Sage's target, Atlas's sentence. Never what Needs you already counts. */
function Overview({ now }: { now: number }) {
  const { s } = useStore()
  const today = new Date(now).setHours(0, 0, 0, 0)
  const monday = today - ((new Date(today).getDay() + 6) % 7) * DAY
  const week = s.publishing.posts.filter(p => p.at >= monday && p.at < monday + 7 * DAY && p.status !== 'draft')
  const days = WEEKDAY.map((_, n) => {
    const inDay = week.filter(p => p.at >= monday + n * DAY && p.at < monday + (n + 1) * DAY)
    return { out: inDay.filter(p => p.status === 'published').length, planned: inDay.filter(p => p.status !== 'published').length }
  })
  const top = Math.max(1, ...days.map(x => x.out + x.planned))
  const published = days.reduce((n, x) => n + x.out, 0)
  const planned = days.reduce((n, x) => n + x.planned, 0)

  const mix = mixOf(s, now)
  const pillars = targetsOf(s).pillars.map(p => ({ ...p, share: mix[p.name] ?? 0 }))
  const scale = Math.max(...pillars.map(p => Math.max(p.share, p.target))) * 1.15 || 1
  const behind = [...pillars].sort((a, b) => (b.target - b.share) - (a.target - a.share))[0]
  const open = s.publishing.ideas.filter(isOpen)
  const ready = open.filter(i => i.status === 'ready').length
  const onBehind = behind && behind.target - behind.share >= 3 ? open.filter(i => i.pillar === behind.name).length : 0
  const say = `${open.length} idea${open.length === 1 ? '' : 's'} this week, ${ready} ready to schedule.`
    + (behind && behind.target - behind.share >= 3 ? ` ${behind.name} is behind target${onBehind ? `, so ${onBehind} of them ${onBehind === 1 ? 'is' : 'are'} ${behind.name}` : ''}.` : '')

  return (
    <section className="card pub-overview" aria-label="This week">
      <p className="pub-ov-say"><Mark agent="atlas" size="md" /><span>{say}</span></p>
      <div className="pub-ov-week">
        <p className="pub-ov-nums"><span><b className="num">{published}</b> published</span><span><b className="num">{planned}</b> scheduled</span><span className="faint">this week</span></p>
        <ol className="pub-ov-days" aria-hidden>
          {days.map((x, n) => (
            <li key={n} className={monday + n * DAY === today ? 'today' : ''}>
              <span className="bar"><i className="planned" style={{ height: `${(x.planned / top) * 100}%` }} /><i className="out" style={{ height: `${(x.out / top) * 100}%` }} /></span>
              <span className="d">{WEEKDAY[n]}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="pub-ov-mix">
        <p className="pub-ov-h">Pillar mix <span className="faint">· vs Sage’s target</span></p>
        <ul>
          {pillars.map(p => (
            <li key={p.name}>
              <span className="name">{p.name}</span>
              <span className="track" aria-hidden><i style={{ width: `${(p.share / scale) * 100}%` }} /><em style={{ left: `${(p.target / scale) * 100}%` }} /></span>
              <span className={`num v ${p === behind && p.target - p.share >= 3 ? 'behind' : ''}`}>{p.share}% <span className="faint">of {p.target}%</span></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ---------- Ideas as cards (matrix §15) ---------- */

/** The picture, or a miniature of the caption on the network's side when there is none. */
function Visual({ media, text }: { media?: string; text: string }) {
  return media ? <Photo name={media} /> : (
    <div className="idea-mini">
      <p><b>Fernway</b></p>
      <p className="idea-mini-text">{text}</p>
    </div>
  )
}

/** The number that made Atlas suggest it, with the agent who found it (Iris, Echo). */
function Proof({ i, big }: { i: Idea; big?: boolean }) {
  const x = i.sources[0]
  if (!x) return null
  const e = evidence(x)
  return (
    <p className={`idea-proof ${big ? 'big' : ''}`}>
      <Mark agent={x.agent} />
      <span>{e.value && <b className="num">{e.value} </b>}{e.measure}</span>
    </p>
  )
}

const whenOf = (i: Idea) => (i.drafts?.[0] ? slot(i.drafts[0].at) : undefined)

function Acts({ i, settled }: { i: Idea; settled: (id: string) => void }) {
  const nav = useNavigate()
  return (
    <div className="idea-acts">
      <Primary i={i} size="sm" />
      <Btn size="sm" variant="ghost" onClick={() => nav(`/publishing/ideas/${i.id}`)}>Edit</Btn>
      <NotNow i={i} size="sm" onDone={() => settled(i.id)} />
    </div>
  )
}

/** One idea, one card: the visual, its networks, the angle, the proof, the pillar and slot, the decision. */
function IdeaCard({ i, current, now, settled }: { i: Idea; current: boolean; now: number; settled: (id: string) => void }) {
  const nav = useNavigate()
  const d0 = i.drafts?.[0]
  const f = freshness(i, now)
  const when = whenOf(i)
  return (
    <article className={`card hoverable idea-card ${current ? 'current' : ''} ${now - i.at < 120_000 ? 'arrive' : ''}`} onClick={e => { if (!isInteractive(e)) nav(`/publishing/ideas/${i.id}`) }}>
      <div className="idea-visual">
        <Visual media={d0?.media ?? i.media} text={d0?.text ?? i.copy[i.networks[0]] ?? i.title} />
        <span className="idea-nets">{i.networks.map(n => <Net key={n} n={n} size={18} />)}</span>
      </div>
      <div className="idea-body">
        <h3 className="idea-angle"><Link to={`/publishing/ideas/${i.id}`} aria-current={current || undefined}>{i.title}</Link></h3>
        <Proof i={i} />
        <p className="idea-meta">{f.soon && <Pill tone="caution">{f.label}</Pill>}<span>{i.pillar}{when && ` · ${when}`}</span></p>
      </div>
      <Acts i={i} settled={settled} />
      <RuleProposal i={i} />
    </article>
  )
}

/** The strongest idea, set apart: the one you can schedule as is, in one click. */
function Featured({ i, current, now, settled }: { i: Idea; current: boolean; now: number; settled: (id: string) => void }) {
  const nav = useNavigate()
  const d0 = i.drafts?.[0]
  const f = freshness(i, now)
  const when = whenOf(i)
  const fmt = d0?.format ?? i.format
  return (
    <article className={`card hoverable idea-feature ${current ? 'current' : ''}`} aria-label={`Atlas’s pick: ${i.title}`} onClick={e => { if (!isInteractive(e)) nav(`/publishing/ideas/${i.id}`) }}>
      <div className="idea-visual">
        <Visual media={d0?.media ?? i.media} text={d0?.text ?? i.copy[i.networks[0]] ?? i.title} />
        <span className="idea-nets">{i.networks.map(n => <Net key={n} n={n} size={20} />)}</span>
      </div>
      <div className="idea-feature-body">
        <p className="idea-pick"><Mark agent="atlas" /><span>Atlas’s pick</span>{f.soon && <Pill tone="caution">{f.label}</Pill>}</p>
        <h3><Link to={`/publishing/ideas/${i.id}`}>{i.title}</Link></h3>
        {/* What gets published, word for word: schedule it as is. */}
        <blockquote className="idea-caption"><span>{d0?.text ?? i.copy[i.networks[0]]}</span></blockquote>
        <Proof i={i} big />
        <p className="idea-meta"><span>{i.pillar} · {i.networks.map(n => NETWORK_LABEL[n]).join(', ')}{fmt ? ` ${fmt.split(' ·')[0].toLowerCase()}` : ''}{when && ` · ${when}`}</span></p>
        <div className="idea-acts">
          <Primary i={i} />
          <Btn variant="ghost" onClick={() => nav(`/publishing/ideas/${i.id}`)}>Edit</Btn>
          <NotNow i={i} onDone={() => settled(i.id)} />
        </div>
        <RuleProposal i={i} />
      </div>
    </article>
  )
}

/** A series: its posts as a row of linked tiles, in the order they go out. */
function SeriesCard({ i, current, settled }: { i: Idea; current: boolean; settled: (id: string) => void }) {
  const nav = useNavigate()
  const steps = i.steps ?? []
  return (
    <article className={`card hoverable idea-series ${current ? 'current' : ''}`} onClick={e => { if (!isInteractive(e)) nav(`/publishing/ideas/${i.id}`) }}>
      <div className="idea-series-head">
        <span className="idea-series-icon"><Layers size={16} aria-hidden /></span>
        <div className="grow">
          <h3 className="idea-angle"><Link to={`/publishing/ideas/${i.id}`} aria-current={current || undefined}>{i.title}</Link></h3>
          <p className="idea-meta"><span>Series · {steps.length} posts · {i.pillar}</span></p>
        </div>
        <Acts i={i} settled={settled} />
      </div>
      <Proof i={i} />
      <ol className="idea-steps-row">
        {steps.map(st => (
          <li key={st.step}>
            <p className="row tight"><Net n={st.network} size={14} /><b>{st.step}</b><span className="faint">{day(T(0, 0, 6 + st.day))}</span></p>
            <p className="idea-step-text">{st.text}</p>
          </li>
        ))}
      </ol>
    </article>
  )
}

/** An idea you just put away: its title and Undo, in place. */
function Settled({ i }: { i: Idea }) {
  const { d } = useStore()
  const label = i.status === 'dismissed' ? `Dismissed · ${i.dismissReason?.toLowerCase()}` : i.status === 'snoozed' ? 'Back tomorrow 08:00' : i.status === 'sent-to-sage' ? 'With Sage' : i.status === 'expired' ? 'Expired' : 'Scheduled'
  return (
    <article className={`card idea-settled ${i.kind === 'series' ? 'wide' : ''}`}>
      <p className="idea-angle">{i.title}</p>
      {i.status === 'dismissed' || i.status === 'snoozed' ? <Reopen label={label} onUndo={() => d({ type: 'publishing/ideaReopen', id: i.id })} /> : <Pill>{label}</Pill>}
      <RuleProposal i={i} />
    </article>
  )
}

/** A post without a slot yet, in the same shape as an idea: its visual, its words, Schedule. The rest is in its panel. */
function DraftCard({ p, check, now }: { p: Post; check: ReactNode; now: number }) {
  const { d } = useStore()
  const open = useOpenPost()
  const later = p.at > now
  return (
    <article className="card hoverable idea-card" onClick={e => { if (!isInteractive(e)) open(p.id) }}>
      <div className="idea-visual">
        {/* No picture: the network alone (the words are the card's title). */}
        {p.media ? <><Photo name={p.media} /><span className="idea-nets"><Net n={p.network} size={18} /></span></> : <span className="idea-noart"><Net n={p.network} size={32} /></span>}
        <span className="idea-check">{check}</span>
      </div>
      <div className="idea-body">
        <h3 className="idea-angle"><button className="dq-name" onClick={() => open(p.id)}>{p.text}</button></h3>
        <p className="idea-meta"><span>{slot(p.at)} · {p.pillar} · by {p.author === 'atlas' ? 'Atlas' : 'you'}</span>{p.note && <InfoPop label="Why?">{p.note}</InfoPop>}</p>
      </div>
      <div className="idea-acts">
        {later ? <Btn size="sm" onClick={() => d({ type: 'publishing/bulk', ids: [p.id], op: 'approve' })}>Schedule</Btn>
          : <Btn size="sm" onClick={() => open(p.id)}>Pick a new time</Btn>}
      </div>
    </article>
  )
}

type Show = 'ideas' | 'drafts'
/** Written ideas (ready) before new ones; an idea keeps its drafts when you put it away, so it keeps its place. */
const written = (i: Idea) => (i.drafts?.length ? 0 : 1)
/** Needs you stays a short queue: the rest one click away. */
const NEEDS_SHOWN = 3

export default function Ideas({ id }: { id?: string }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const now = useNow(15000)
  const [recent, setRecent] = useState<string[]>([])
  const [allNeeds, setAllNeeds] = useState(false)
  const ideas = s.publishing.ideas
  const current = id ? ideas.find(i => i.id === id) : undefined
  const settled = (x: string) => setRecent(r => [...r, x])

  // Needs you (matrix §14): what's blocked first, a failed post, then paused ones, then the rest as Atlas raised them.
  const cards = [...atlasNeeds(s.handoffs)].sort((a, b) => Number(gestureOf(b) === 'fix') - Number(gestureOf(a) === 'fix') || Number(gestureOf(b) === 'paused') - Number(gestureOf(a) === 'paused'))
  const approvable = useMemo(() => cards.filter(h => gestureOf(h) === 'approve').map(h => h.id), [cards.map(h => h.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const needSel = useSelection(approvable, 'needs')
  const approve = (list: string[]) => list.forEach(x => d({ type: 'core/resolve', id: x, decision: { kind: 'approve' } }))
  const shownNeeds = allNeeds ? cards : cards.slice(0, NEEDS_SHOWN)

  // Ideas: ready before new, then by confidence; the ones you just put away stay in place with their Undo.
  const listed = ideas.filter(i => isOpen(i) || recent.includes(i.id))
    .sort((a, b) => written(a) - written(b) || b.confidence - a.confidence)
  const open = listed.filter(isOpen)
  // Set apart: the strongest idea you can schedule as is. Written first, then one whose moment ends soon, then one Iris
  // or Echo found in the data (a gap in the calendar is a weaker reason), then confidence.
  const byData = (i: Idea) => Number(['iris', 'echo'].includes(i.sources[0]?.agent))
  const soon = (i: Idea) => Number(freshness(i, now).soon)
  const featured = open.filter(i => i.kind === 'post').sort((a, b) => written(a) - written(b) || soon(b) - soon(a) || byData(b) - byData(a) || b.confidence - a.confidence)[0]
  const posts = listed.filter(i => i.kind === 'post' && i !== featured)
  const series = listed.filter(i => i.kind === 'series')
  const ready = open.filter(i => i.kind === 'post' && i.status === 'ready').map(i => i.id)
  const drafts = s.publishing.posts.filter(p => p.status === 'draft').sort((a, b) => a.at - b.at)
  const draftIds = useMemo(() => drafts.map(p => p.id), [drafts.map(p => p.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const draftSel = useSelection(draftIds, 'drafts')
  const undo = s.publishing.undo && s.publishing.undo.until > now && s.publishing.undo.ideas ? s.publishing.undo : undefined

  const [pick, setPick] = useState<Show>(new URLSearchParams(loc.search).get('show') === 'drafts' ? 'drafts' : 'ideas')
  const show: Show = current || !drafts.length ? 'ideas' : pick
  const choose = (v: Show) => { setPick(v); nav(v === 'ideas' ? '/publishing' : `/publishing?show=${v}`, { replace: true }) }
  const draftBox = (p: Post) => <SelectBox checked={draftSel.has(p.id)} visible onToggle={sh => draftSel.toggle(p.id, sh)} label={`Select: ${p.text}`} />

  return (
    <div className={`ideas-layout ${current || id ? 'has-current' : ''}`}>
      <div className="ideas-main">
        <Overview now={now} />

        <section className="card vq-list pub-needs" aria-labelledby="pub-needs-h">
          {needSel.count > 0
            ? <BulkBar count={needSel.count} noun={needSel.count > 1 ? 'posts selected' : 'post selected'} onClear={needSel.clear} actions={[{ label: `Approve ${needSel.count}`, primary: true, onRun: () => { approve([...needSel.selected]); needSel.clear() } }]} />
            : (
              <div className="vq-list-head">
                {approvable.length > 0 && <SelectAll sel={needSel} label="Select every post to approve" />}
                <h2 id="pub-needs-h" className="section-title">Needs you <span className="faint num">{cards.length}</span></h2>
                <span className="spacer" />
                {approvable.length > 1 && !current && <Btn size="sm" variant="primary" onClick={() => approve(approvable)}>Approve {approvable.length}</Btn>}
              </div>
            )}
          {cards.length ? (
            <ul className="dq-rows">
              {shownNeeds.map(h => <NeedRow key={h.id} h={h} check={approvable.includes(h.id) ? <SelectBox checked={needSel.has(h.id)} visible onToggle={sh => needSel.toggle(h.id, sh)} label={`Select: ${h.title}`} /> : undefined} />)}
            </ul>
          ) : <p className="pub-needs-empty faint">Nothing needs you here.</p>}
          {cards.length > NEEDS_SHOWN && (
            <button className="link-btn pub-needs-more" onClick={() => setAllNeeds(v => !v)}>{allNeeds ? 'Show less' : `Show ${cards.length - NEEDS_SHOWN} more`}<ChevronDown size={14} aria-hidden className={allNeeds ? 'flip' : ''} /></button>
          )}
        </section>

        <div className="pub-objects-head">
          {drafts.length > 0
            ? <Filters label="Show" value={show} onChange={choose} items={[{ value: 'ideas', label: 'Ideas', count: open.length }, { value: 'drafts', label: 'Drafts', count: drafts.length }]} />
            : <h2 className="section-title">Ideas <span className="faint num">{open.length}</span></h2>}
          <span className="spacer" />
          {show === 'ideas' && ready.length > 1 && !current && <Btn size="sm" onClick={() => d({ type: 'publishing/ideaSchedule', ids: ready })}>Schedule {ready.length} ready</Btn>}
        </div>

        {show === 'drafts' ? (
          <>
            <PostsBulk sel={draftSel} posts={drafts} />
            <div className="idea-grid">{drafts.map(p => <DraftCard key={p.id} p={p} now={now} check={draftBox(p)} />)}</div>
          </>
        ) : (
          <>
            {undo ? <UndoBar className="mb-3" until={undo.until} onUndo={() => d({ type: 'publishing/restore' })} action={<Btn size="xs" variant="ghost" onClick={() => nav('/publishing/calendar')}>Open the calendar</Btn>}>{undo.label}</UndoBar>
              : <Notice scope="publishing" className="mb-3" />}
            {listed.length === 0 ? <Empty title="No ideas" /> : (
              <div className="idea-grid">
                {featured && <Featured key={featured.id} i={featured} current={featured.id === id} now={now} settled={settled} />}
                {posts.map(i => (isOpen(i) ? <IdeaCard key={i.id} i={i} current={i.id === id} now={now} settled={settled} /> : <Settled key={i.id} i={i} />))}
                {series.map(i => (isOpen(i) ? <SeriesCard key={i.id} i={i} current={i.id === id} settled={settled} /> : <Settled key={i.id} i={i} />))}
              </div>
            )}
          </>
        )}
      </div>
      {current && <IdeaPanel key={current.id} i={current} onClose={() => nav('/publishing')} />}
      {id && !current && <aside className="card idea-panel"><Empty title="This idea is gone" body="It may have expired or been cleared by a reset." action={<Btn onClick={() => nav('/publishing')}>Back to Ideas</Btn>} /></aside>}
    </div>
  )
}



/* ---------- Side panel ---------- */
// Three zones that don't look alike: why Atlas suggests it (Atlas speaking), the post (what gets published),
// and Ask Atlas (a conversation, docked at the bottom like a chat bar).

const ORIGIN = { analytics: 'Insights', listening: 'Listening', brand: 'Playbook', calendar: 'Calendar' } as const
/** The big figure and the named measure of a source. */
const evidence = (x: IdeaSource) => ({
  // A source that names its own measure already says its figures: no extra figure in front.
  value: x.value ?? (x.measure ? undefined : x.proof.match(/[+−-]?\d[\d.,]*\s?[%×k]?/)?.[0].trim()),
  measure: x.measure ?? `${x.label}: ${x.proof}`,
})

function Evidence({ list }: { list: IdeaSource[] }) {
  return (
    <ul className="idea-evidence">
      {list.map(x => {
        const e = evidence(x)
        const I = iconOf(x)
        return (
          <li key={x.label}>
            <I size={14} aria-hidden />
            <span>{e.value && <b>{e.value} </b>}{e.measure}</span>
            <Link to={x.link} aria-label={`Open in ${ORIGIN[x.type]}: ${x.label}`}>{ORIGIN[x.type]}<ArrowUpRight size={12} aria-hidden /></Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Behind « Why? »: Atlas's whole reasoning, every source, who found it and when, the pillar and the rule it follows. */
function IdeaWhy({ i, now }: { i: Idea; now: number }) {
  const found = finders(i)
  const fresh = freshness(i, now)
  return (
    <div className="stack">
      <p>{i.why}</p>
      <Evidence list={i.sources} />
      <p className="muted t-sm">
        {found.length ? <>Spotted by {found.map(agentName).join(' and ')}</> : <>Found by Atlas</>} {ago(i.at, now)} · {i.confidence}% confident · {i.pillar} pillar
        {fresh.label !== 'No deadline' && <> · {fresh.label}</>}
        {i.followsRule && <> · follows your rule “{i.followsRule}”</>}
      </p>
    </div>
  )
}

function IdeaPanel({ i, onClose }: { i: Idea; onClose: () => void }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const now = useNow(30000)
  const [net, setNet] = useState<Network>(i.drafts?.[0]?.network ?? i.networks[0])
  const draft = i.drafts?.find(x => x.network === net) ?? i.drafts?.[0]
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(draft?.text ?? '')
  const [moving, setMoving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [ask, setAsk] = useState('')
  const [variants, setVariants] = useState<Variant[] | null>(null)
  const [mix, setMix] = useState<{ hook: 'A' | 'B' | 'C'; body: 'A' | 'B' | 'C' }>({ hook: 'B', body: 'C' })
  const [justChanged, setJustChanged] = useState(false)
  const words = ((s.playbook as { banned?: string[] }).banned ?? BANNED).map(w => w.replace(/\s*\(.*\)$/, '').toLowerCase())
  const open = isOpen(i)
  const last = i.versions.at(-1)
  const prev = i.versions.at(-2)
  const fresh = freshness(i, now)

  useEffect(() => { d({ type: 'publishing/ideaOpen', id: i.id }) }, [i.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setText(draft?.text ?? ''); setEditing(false) }, [draft?.text])

  const think = (label: string, f: () => void) => { setBusy(label); setTimeout(() => { f(); setBusy(null); setJustChanged(true) }, 650) }
  const angle = (a: Angle, label: string) => think(`Atlas is rewriting: ${label.toLowerCase()}`, () => d({ type: 'publishing/ideaRedirect', id: i.id, mode: 'angle', angle: a }))
  const send = () => { const t = ask.trim(); if (!t) return; think('Atlas is reading your note', () => { d({ type: 'publishing/ideaRedirect', id: i.id, mode: 'free', text: t }); setAsk('') }) }
  const media = mediaOf(i, draft?.media ?? i.media)
  const failing = draft ? checkPost({ text: draft.text, network: draft.network, media: draft.media, brief: draft.brief, words, rules: s.playbook.rules }).filter(c => !c.ok) : []
  const pick = (k: 'A' | 'B' | 'C') => variants!.find(v => v.key === k)!
  const status = { scheduled: i.inPlan ? 'In next week’s plan' : 'Scheduled', snoozed: 'Back tomorrow 08:00', dismissed: 'Dismissed', 'sent-to-sage': 'With Sage', expired: 'Expired', new: 'New idea', ready: 'Ready' }[i.status]
  const shownNet = draft?.network ?? i.networks[0]
  const shownText = draft?.text ?? i.copy[shownNet] ?? Object.values(i.copy)[0] ?? ''
  const fmt = (draft?.format ?? (shownNet === 'instagram' ? i.format : undefined))

  return (
    <aside className="card idea-panel" aria-label={`Idea: ${i.title}`}>
      <header className="idea-panel-head">
        <Mark agent="atlas" />
        <div className="grow">
          <h2>{i.title}</h2>
          <p className="row tight t-sm faint">
            <Pill tone={i.status === 'ready' ? 'ok' : i.status === 'new' ? 'signal' : undefined}>{status}</Pill>
            {fresh.soon && <Pill tone="caution">{fresh.label}</Pill>}
            {i.kind === 'series' ? <>{i.steps?.length} posts · {i.networks.map(n => NETWORK_LABEL[n]).join(', ')}</> : <>{NETWORK_LABEL[shownNet]}{fmt ? ` ${fmt.split(' ·')[0].toLowerCase()}` : ''}{draft && ` · ${slot(draft.at)}`}</>}
          </p>
        </div>
        <Btn variant="ghost" icon size="sm" aria-label="Close" onClick={onClose}><X size={16} /></Btn>
      </header>

      <div className="idea-panel-body">
        {!open && (
          <div className="idea-state">
            {i.status === 'scheduled' && !i.inPlan && <p><Check size={14} aria-hidden />In the calendar. <Link to="/publishing/calendar">Open the calendar</Link></p>}
            {i.inPlan && <p><Check size={14} aria-hidden />Added to next week’s plan. <Link to="/publishing/plan">See the plan</Link></p>}
            {i.status === 'sent-to-sage' && i.campaign && <p><Check size={14} aria-hidden />Sage turned it into a campaign plan. <Link to={`/strategy/campaigns/${i.campaign}`}>See the campaign</Link></p>}
            {i.status === 'expired' && <p>Expired: {i.expires?.reason}.</p>}
            {(i.status === 'dismissed' || i.status === 'snoozed') && <Reopen label={status} onUndo={() => d({ type: 'publishing/ideaReopen', id: i.id })} />}
          </div>
        )}

        {/* 1. Why: Atlas speaking, on its own colour */}
        <section className="idea-zone idea-why" aria-labelledby={`why-${i.id}`}>
          <h3 className="idea-zone-title" id={`why-${i.id}`}><Mark agent="atlas" />Why Atlas suggests this</h3>
          {/* Visible: Atlas's first sentence and the strongest proof. The whole reasoning, every source and the rule sit behind « Why? ». */}
          <p className="idea-say">{sentences(i.why)[0]} <MoreInfo label="Why?" title="Why Atlas suggests this"><IdeaWhy i={i} now={now} /></MoreInfo></p>
          <Evidence list={i.sources.slice(0, 1)} />
        </section>

        {/* 2. The post: the preview at real size is the hero */}
        <section className="idea-zone idea-post" aria-labelledby={`post-${i.id}`}>
          <h3 className="idea-zone-title" id={`post-${i.id}`}>
            {i.kind === 'series' ? 'The series' : 'The post'}
            <span className="spacer" />
            {draft && open && !editing && <button className="link-btn t-sm" onClick={() => setEditing(true)}>Edit caption</button>}
          </h3>

          {i.steps ? (
            <ol className="idea-steps">{i.steps.map((st, n) => <li key={st.step}><Net n={st.network} size={16} /><span><b>{n + 1} · {st.step}, {day(T(0, 0, 6 + st.day))}.</b> {st.text}</span></li>)}</ol>
          ) : (
            <>
              {(i.drafts?.length ?? 0) > 1 && <Seg name="idea-net" label="Network" size="sm" value={shownNet} onChange={setNet} options={i.drafts!.map(x => ({ value: x.network, label: NETWORK_LABEL[x.network] }))} />}
              <div className="idea-stage">
                <div className="idea-pv"><NetworkPreview network={shownNet} text={editing ? text : shownText} media={draft?.media ?? i.media} words={words} at={draft?.at} slides={Number(fmt?.match(/(\d+) slides/)?.[1]) || undefined} /></div>
              </div>
              {!draft && <p className="faint t-sm idea-note">Atlas’s first take. Draft it for the final caption, visual and slot.</p>}

              {editing && draft && (
                <div className="idea-edit">
                  <textarea className="textarea" rows={4} value={text} onChange={e => setText(e.target.value)} aria-label="Caption" autoFocus />
                  <span className="row tight"><Btn size="xs" onClick={() => { d({ type: 'publishing/ideaRedirect', id: i.id, mode: 'edit', network: draft.network, text, label: 'Your edit' }); setEditing(false); setJustChanged(true) }} disabled={text === draft.text}>Save</Btn><Btn size="xs" variant="ghost" onClick={() => { setText(draft.text); setEditing(false) }}>Cancel</Btn></span>
                </div>
              )}

              {!busy && justChanged && last && prev && last.by === 'you' && (() => {
                const a = prev.drafts.find(x => x.network === shownNet)?.text, b = last.drafts.find(x => x.network === shownNet)?.text
                return b !== undefined && (
                  <div className="idea-version" aria-live="polite">
                    <p className="row tight t-sm"><b>What changed</b><span className="faint">· {last.label}, version {last.n}</span></p>
                    {a === undefined ? <p className="diff t-sm"><ins>{b}</ins></p> : <p className="diff t-sm">{diffWords(a, b).map((p, n) => <span key={n}>{p.op === 'add' ? <ins>{p.text}</ins> : p.op === 'del' ? <del>{p.text}</del> : p.text}{' '}</span>)}</p>}
                  </div>
                )
              })()}

              {variants && !busy && (
                <div className="idea-variants-box">
                  <p className="row tight t-sm"><b>3 variants from Atlas</b><span className="spacer" /><button className="link-btn t-sm" onClick={() => setVariants(null)}>Close</button></p>
                  <div className="idea-variants">
                    {variants.map(v => (
                      <div key={v.key} className="idea-variant">
                        <span className="k">{v.key} · {v.label}</span>
                        <p><span className="hook">{v.hook}</span> {v.body}</p>
                        <Btn size="xs" onClick={() => { d({ type: 'publishing/ideaRedirect', id: i.id, mode: 'variant', network: shownNet, text: variantText(v), label: `Variant ${v.key} (${v.label.toLowerCase()})` }); setVariants(null); setJustChanged(true) }}>Keep this</Btn>
                      </div>
                    ))}
                  </div>
                  <div className="idea-mix">
                    <span>Hook from</span>
                    <Menu align="start" trigger={<button className="select-btn" aria-label="Hook from">{mix.hook}<ChevronDown size={14} /></button>} items={variants.map(v => ({ label: `${v.key} · ${v.label}`, onSelect: () => setMix(m => ({ ...m, hook: v.key })) }))} />
                    <span>body from</span>
                    <Menu align="start" trigger={<button className="select-btn" aria-label="Body from">{mix.body}<ChevronDown size={14} /></button>} items={variants.map(v => ({ label: `${v.key} · ${v.label}`, onSelect: () => setMix(m => ({ ...m, body: v.key })) }))} />
                    <Btn size="xs" onClick={() => { d({ type: 'publishing/ideaRedirect', id: i.id, mode: 'variant', network: shownNet, text: mixVariants(pick(mix.hook), pick(mix.body)), label: `Hook ${mix.hook} + body ${mix.body}` }); setVariants(null); setJustChanged(true) }}>Use the mix</Btn>
                  </div>
                </div>
              )}

              <dl className="idea-facts">
                <div>
                  <dt>When</dt>
                  {draft ? (
                    <>
                      <dd>{slot(draft.at)}</dd>
                      <dd className="faint">{slotComment(draft.network, draft.at).startsWith('Good slot') ? 'Good slot' : slotComment(draft.network, draft.at)}{open && !moving && <> · <button className="link-btn t-sm" onClick={() => setMoving(true)}>Change</button></>}</dd>
                      {moving && <dd><input type="datetime-local" className="input" aria-label="New slot" value={toLocal(draft.at)} onChange={e => { const t = new Date(e.target.value).getTime(); if (t > now) d({ type: 'publishing/ideaSlot', id: i.id, network: draft.network, at: t }) }} onBlur={() => setMoving(false)} autoFocus /></dd>}
                    </>
                  ) : <dd className="faint">Picked when drafted</dd>}
                </div>
                <div>
                  <dt>Visual</dt>
                  {media ? <><dd>{media.title}</dd><dd className="faint">{media.rights === 'Fernway' ? 'Fernway photo' : media.rights}{fmt ? ` · ${fmt.split('· ')[1] ?? fmt}` : ''}</dd></>
                    : <dd className="idea-brief"><Lightbulb size={14} aria-hidden />{draft?.brief ?? i.brief ?? 'No visual yet.'} No stock photos.</dd>}
                </div>
                <div>
                  <dt>Playbook</dt>
                  {!draft ? <dd className="faint">Checked when drafted</dd> : failing.length ? (
                    <dd><ul className="idea-checks">{failing.map(c => <li key={c.label}><TriangleAlert size={14} aria-hidden />{c.label.replace(`${NETWORK_LABEL[draft.network]}: `, '')}</li>)}</ul></dd>
                  ) : <dd className="idea-pass"><Check size={14} aria-hidden />All checks pass</dd>}
                </div>
              </dl>
            </>
          )}
        </section>

        {i.versions.length > 0 && (
          <details className="idea-history">
            <summary><ChevronRight size={14} aria-hidden />History · {i.versions.length} version{i.versions.length > 1 ? 's' : ''}</summary>
            <ol className="idea-versions" reversed>
              {[...i.versions].reverse().map(v => (
                <li key={v.n}>
                  <span className="n">v{v.n}</span>
                  <span className="grow"><b>{v.label}</b> · {v.by === 'you' ? 'you' : 'Atlas'}, {ago(v.at, now)}{v.note && <span className="faint t-xs block">{v.note}</span>}</span>
                  {v.n !== i.versions.length && open && <button className="link-btn t-sm" onClick={() => { d({ type: 'publishing/ideaRestoreVersion', id: i.id, n: v.n }); setJustChanged(false) }}>Go back to this</button>}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>

      {/* 3. Ask Atlas: a conversation, docked under the detail */}
      {i.kind === 'post' && open && (
        <section className="idea-dock" aria-labelledby={`ask-${i.id}`}>
          <h3 className="idea-zone-title" id={`ask-${i.id}`}><Mark agent="atlas" />Ask Atlas for changes</h3>
          {busy ? <Thinking label={busy} /> : i.said && (
            <div className="idea-bubble" aria-live="polite"><Mark agent="atlas" /><p><span className="faint">You asked: {i.said.you.replace(/^“|”$/g, '')}. </span>{i.said.atlas}</p></div>
          )}
          <RuleProposal i={i} />
          <form className="idea-ask" onSubmit={e => { e.preventDefault(); send() }}>
            <label htmlFor="idea-ask" className="sr-only">Tell Atlas what to change</label>
            <input id="idea-ask" className="input" value={ask} onChange={e => setAsk(e.target.value)} placeholder="Tell Atlas what to change: “make it about repair, post it Saturday”" disabled={!!busy} />
            <Btn type="submit" disabled={!ask.trim() || !!busy}>Send</Btn>
          </form>
          <div className="filters" role="group" aria-label="Suggestions">
            {ANGLES.map(a => <button key={a.key} className="filter" disabled={!!busy} onClick={() => angle(a.key, a.label)}>{a.label}</button>)}
            <button className="filter" disabled={!!busy} onClick={() => think('Atlas is writing 3 variants', () => setVariants(variantsOf(i, shownNet)))}><Sparkles size={12} aria-hidden />3 variants</button>
          </div>
        </section>
      )}

      {open && (
        <footer className="idea-panel-foot">
          <span className="spacer" />
          <NotNow i={i} onDone={() => nav('/publishing')} />
          {i.kind === 'series' && <Btn onClick={() => d({ type: 'publishing/ideaSchedule', ids: [i.id] })}>Schedule the series</Btn>}
          <Primary i={i} />
        </footer>
      )}
    </aside>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')
const toLocal = (t: number) => { const x = new Date(t); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}` }
