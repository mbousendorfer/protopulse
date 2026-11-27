import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, BookOpen, CalendarDays, ChartLine, Check, ChevronDown, ChevronRight, Flame, Layers, Lightbulb, MessageCircle, Radar, Sparkles, TriangleAlert, X } from 'lucide-react'
import type { AgentId, Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { T, ago, hhmm } from '../../app/time'
import { NETWORK_LABEL, agentName } from '../../data/agents'
import { MEDIA } from '../../data/publishing'
import { BANNED } from '../../data/playbook'
import type { Idea, IdeaSource } from '../../data/ideas'
import { Btn, Empty, Mark, Menu, Net, Pill, Seg, Thinking } from '../../ui'
import { BulkBar, SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { CountBadge, Notice, Reopen, UndoBar } from '../../ui/Feedback'
import Photo from '../../ui/Photo'
import { NetworkPreview } from './Previews'
import { checkPost } from './checks'
import { ANGLES, diffWords, sentences, freshness, isOpen, mixVariants, summarize, variantText, variantsOf, type Angle, type Variant } from './ideasModel'
import { targetsOf } from '../strategy/slice'
import { slotComment } from './slice'
import { PublishingNeeds } from './Needs'
import { MoreInfo } from '../../ui/More'

/*
 * Three levels, so the list can be scanned:
 * 1. The list: one row per idea, its strongest proof, when and where. Actions only while no idea is open.
 * 2. The panel: why, the draft, one field to redirect. Everything Sam needs to decide.
 * 3. On demand: editing, slot, variants, history.
 */

export const DISMISS_REASONS = ['Off-brand', 'Not timely', 'Already covered', 'Wrong pillar']
const SOURCE_ICON = { analytics: ChartLine, listening: Flame, brand: BookOpen, calendar: CalendarDays }
const slot = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}, ${hhmm(t)}`
const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
/** Several photos share a scene name: prefer the one the idea's customer gave permission for. */
const mediaOf = (i: Idea, name?: string) => (name ? MEDIA.filter(m => m.name === name).sort((a, b) => Number(!!i.customer && b.rights.includes(i.customer.handle)) - Number(!!i.customer && a.rights.includes(i.customer.handle)))[0] : undefined)
const iconOf = (x: IdeaSource) => (x.link.includes('/competitors') ? Radar : /^(@|r\/)/.test(x.label) ? MessageCircle : SOURCE_ICON[x.type])
const finders = (i: Idea) => [...new Set(i.sources.map(x => x.agent))].filter(a => a !== 'atlas') as AgentId[]

/** Not now (back tomorrow) or dismiss with a reason: one menu instead of two buttons. */
function NotNow({ i, size, onDone }: { i: Idea; size?: 'sm'; onDone?: () => void }) {
  const { d } = useStore()
  return (
    <Menu align="end" trigger={<Btn size={size} variant="ghost" onClick={e => e.stopPropagation()}>Not now<ChevronDown size={12} /></Btn>}
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
  if (i.origin === 'weekly' && s.publishing.plan.status === 'proposed') return <Btn size={size} variant={size ? undefined : 'primary'} onClick={stop(() => d({ type: 'publishing/ideaToPlan', id: i.id }))}>Add to next week’s plan</Btn>
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

/** One idea in the list: what, the strongest proof, when and where. */
function IdeaRow({ i, current, sel, now, settled }: { i: Idea; current: boolean; sel: ReturnType<typeof useSelection>; now: number; settled: (id: string) => void }) {
  const nav = useNavigate()
  const d0 = i.drafts?.[0]
  const proof = i.sources[0]
  const P = proof ? iconOf(proof) : Lightbulb
  const f = freshness(i, now)
  const thumb = d0?.media ? <Photo name={d0.media} /> : i.kind === 'series' ? <Layers size={16} aria-hidden /> : <P size={16} aria-hidden />
  const when = d0 ? slot(d0.at) : i.steps ? `${day(T(0, 0, 6 + i.steps[0].day))} to ${day(T(0, 0, 6 + i.steps.at(-1)!.day))}` : undefined
  const ready = i.status === 'ready' && i.kind === 'post'
  return (
    <article className={`idea-row ${current ? 'current' : ''} ${now - i.at < 120_000 ? 'arrive' : ''} ${sel.has(i.id) ? 'picked' : ''}`}
      onClick={e => { if (!(e.target as Element).closest('a, button, input, label, [role="menu"]')) nav(`/publishing/ideas/${i.id}`) }}>
      <span className="idea-check">{ready && <SelectBox checked={sel.has(i.id)} visible={sel.count > 0} onToggle={shift => sel.toggle(i.id, shift)} label={`Select: ${i.title}`} />}</span>
      <span className="idea-thumb">{thumb}</span>
      <div className="idea-text">
        <h3><Link to={`/publishing/ideas/${i.id}`} className="idea-title" aria-current={current || undefined}>{i.title}</Link></h3>
        {proof && <p className="idea-proof"><P size={14} aria-hidden /><span>{proof.label}: {proof.proof}</span></p>}
        <p className="idea-meta">
          <span className="row tight nowrap">{i.networks.map(n => <Net key={n} n={n} size={16} />)}</span>
          {when && <span>{when}</span>}
          {f.soon && <Pill tone="caution">{f.label}</Pill>}
          <span>{i.confidence}% confident</span>
          {i.followsRule && <span className="row tight nowrap"><BookOpen size={12} aria-hidden />Follows your rule</span>}
        </p>
      </div>
      <div className="idea-acts"><Primary i={i} size="sm" /><NotNow i={i} size="sm" onDone={() => settled(i.id)} /></div>
      <RuleProposal i={i} />
    </article>
  )
}

/** An idea you just put away: one line, with Undo. */
function Settled({ i }: { i: Idea }) {
  const { d } = useStore()
  const label = i.status === 'dismissed' ? `Dismissed · ${i.dismissReason?.toLowerCase()}` : i.status === 'snoozed' ? 'Back tomorrow 08:00' : i.status === 'sent-to-sage' ? 'With Sage' : i.status === 'expired' ? 'Expired' : 'Scheduled'
  return (
    <article className="idea-row settled">
      <span /><span />
      <div className="idea-text"><span className="ellipsis">{i.title}</span></div>
      <div className="idea-acts">{i.status === 'dismissed' || i.status === 'snoozed' ? <Reopen label={label} onUndo={() => d({ type: 'publishing/ideaReopen', id: i.id })} /> : <Pill>{label}</Pill>}</div>
      <RuleProposal i={i} />
    </article>
  )
}

export default function Ideas({ id }: { id?: string }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const now = useNow(15000)
  const [recent, setRecent] = useState<string[]>([])
  const ideas = s.publishing.ideas
  const shown = ideas.filter(i => isOpen(i) || recent.includes(i.id))
  const current = id ? ideas.find(i => i.id === id) : undefined
  const ready = shown.filter(i => i.kind === 'post' && i.status === 'ready')
  const fresh = shown.filter(i => i.kind === 'post' && i.status !== 'ready')
  const series = shown.filter(i => i.kind === 'series')
  const readyIds = useMemo(() => ready.filter(isOpen).map(i => i.id), [ready.map(i => i.id + i.status).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(readyIds)
  const undo = s.publishing.undo && s.publishing.undo.until > now && s.publishing.undo.ideas ? s.publishing.undo : undefined
  const settled = (x: string) => setRecent(r => [...r, x])

  const group = (key: string, title: string, list: Idea[], head?: ReactNode) => list.length > 0 && (
    <section className="ideas-group" aria-labelledby={`ig-${key}`}>
      <header>
        {head}
        <h2 id={`ig-${key}`}>{title}</h2><CountBadge n={list.filter(isOpen).length} />
        <span className="spacer" />
        {key === 'ready' && readyIds.length > 1 && !sel.count && !current && <Btn size="sm" onClick={() => d({ type: 'publishing/ideaSchedule', ids: readyIds })}>Schedule {readyIds.length} ready</Btn>}
      </header>
      <div className="ideas-rows">
        {list.map(i => (isOpen(i) ? <IdeaRow key={i.id} i={i} current={i.id === id} sel={sel} now={now} settled={settled} /> : <Settled key={i.id} i={i} />))}
      </div>
    </section>
  )

  return (
    <div className={`ideas-layout ${current || id ? 'has-current' : ''}`}>
      <div className="ideas-main">
        <PublishingNeeds watching={`the calendar, the queues and ${ideas.filter(isOpen).length} open ideas`} />
        <p className="ideas-lede" aria-live="polite"><Mark agent="atlas" /><span>{summarize(ideas, targetsOf(s))}</span></p>
        {sel.count > 0 ? (
          <BulkBar count={sel.count} noun={sel.count > 1 ? 'ideas selected' : 'idea selected'} onClear={sel.clear} actions={[
            { label: `Schedule ${sel.count} ready`, primary: true, onRun: () => { d({ type: 'publishing/ideaSchedule', ids: [...sel.selected] }); sel.clear() } },
            { label: 'Not now', onRun: () => { [...sel.selected].forEach(settled); d({ type: 'publishing/ideaSnooze', ids: [...sel.selected] }); sel.clear() } },
          ]} />
        ) : undo ? <UndoBar until={undo.until} onUndo={() => d({ type: 'publishing/restore' })} action={<Btn size="xs" variant="ghost" onClick={() => nav('/publishing/calendar')}>Open the calendar</Btn>}>{undo.label}</UndoBar>
          : <Notice scope="publishing" />}
        {!shown.length ? <Empty icon={<Lightbulb size={18} />} title="No ideas waiting" body="Atlas brings the next one as soon as a signal is worth it." /> : (
          <>
            {group('ready', 'Ready to review', ready, readyIds.length > 0 && <SelectAll sel={sel} label="Select every ready idea" />)}
            {group('new', 'New ideas', fresh)}
            {group('series', 'Series', series)}
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
  const found = finders(i)
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
          <p className="idea-why-foot">
            {found.length ? <>Spotted by {found.map(agentName).join(' and ')}</> : <>Found by Atlas</>} · {i.confidence}% confident
            {fresh.label !== 'No deadline' && <> · {fresh.label}</>}
          </p>
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
