import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, BookOpen, CalendarDays, ChartLine, Check, ChevronDown, Clock, Flame, Lightbulb, MessageCircle, Radar, Sparkles, TriangleAlert, X } from 'lucide-react'
import type { AgentId, Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { ago, hhmm } from '../../app/time'
import { NETWORK_LABEL, agentName } from '../../data/agents'
import { MEDIA } from '../../data/publishing'
import { BANNED } from '../../data/playbook'
import type { Idea, IdeaSource } from '../../data/ideas'
import { Btn, Confidence, Empty, Mark, Menu, Net, Pill, Seg, Thinking } from '../../ui'
import { BulkBar, SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { CountBadge, Notice, Reopen, UndoBar } from '../../ui/Feedback'
import Photo from '../../ui/Photo'
import { NetworkPreview } from './Previews'
import { checkPost } from './checks'
import { ANGLES, diffWords, freshness, isOpen, mixVariants, summarize, variantText, variantsOf, type Angle, type Variant } from './ideasModel'
import { slotComment } from './slice'

export const DISMISS_REASONS = ['Off-brand', 'Not timely', 'Already covered', 'Wrong pillar']
const SOURCE_ICON = { analytics: ChartLine, listening: Flame, brand: BookOpen, calendar: CalendarDays }
const slot = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}, ${hhmm(t)}`
const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`
/** Several photos share a scene name: prefer the one the idea's customer gave permission for. */
const mediaOf = (i: Idea, name?: string) => (name ? MEDIA.filter(m => m.name === name).sort((a, b) => Number(!!i.customer && b.rights.includes(i.customer.handle)) - Number(!!i.customer && a.rights.includes(i.customer.handle)))[0] : undefined)

/** "Spotted by Echo → drafted by Atlas": who found it, who wrote it. */
function Provenance({ i }: { i: Idea }) {
  const finders = [...new Set(i.sources.map(x => x.agent))].filter(a => a !== 'atlas') as AgentId[]
  const verb = i.kind === 'series' ? 'series by' : i.drafts ? 'drafted by' : 'angle by'
  const now = useNow(30000)
  return (
    <div className="idea-slip">
      <span className="chain">{[...finders, 'atlas' as const].map(a => <Mark key={a} agent={a} />)}</span>
      {finders.length ? <span>Spotted by <b>{finders.map(agentName).join(' and ')}</b> → {verb} <b>Atlas</b></span> : <span>Spotted and {i.drafts ? 'drafted' : 'found'} by <b>Atlas</b></span>}
      <span>· {ago(i.at, now)}</span>
    </div>
  )
}

function Sources({ sources }: { sources: IdeaSource[] }) {
  return (
    <ul className="idea-src" aria-label="Sources">
      {sources.map(x => {
        const I = x.link.includes('/competitors') ? Radar : /^(@|r\/)/.test(x.label) ? MessageCircle : SOURCE_ICON[x.type]
        return (
          <li key={x.label}>
            <Link to={x.link}><I size={14} aria-hidden /><span><b>{x.label}:</b> {x.proof}</span><span className="who">· {x.type === 'analytics' ? 'Insights' : x.type === 'listening' ? 'Listening' : x.type === 'brand' ? 'Playbook' : 'Calendar'}</span><ArrowUpRight size={12} aria-hidden /></Link>
          </li>
        )
      })}
    </ul>
  )
}

function Meta({ i, now }: { i: Idea; now: number }) {
  const f = freshness(i, now)
  return (
    <div className="idea-meta">
      <Confidence v={i.confidence} />
      <span>{i.pillar}</span>
      <span className="row tight nowrap">{i.networks.map(n => <Net key={n} n={n} />)}{i.networks.map(n => NETWORK_LABEL[n]).join(', ')}</span>
      {f.soon ? <Pill tone="caution"><Clock size={12} aria-hidden />{f.label}</Pill> : <span className="row tight nowrap"><Clock size={14} aria-hidden />{f.label}</span>}
    </div>
  )
}

function RuleProposal({ i }: { i: Idea }) {
  const { d } = useStore()
  if (!i.proposal) return null
  const what = i.proposal.key.startsWith('dismiss:') ? <>You dismissed two ideas as <b>{i.proposal.key.slice(8).toLowerCase()}</b>.</> : <>You picked <b>{ANGLES.find(a => `angle:${a.key}` === i.proposal!.key)?.label}</b> twice.</>
  return (
    <div className="idea-rule" role="status">
      <Mark agent="atlas" />
      <p>{what} Make it a rule for every idea? “{i.proposal.text}”</p>
      <Btn size="sm" onClick={e => { e.stopPropagation(); d({ type: 'publishing/ideaRule', id: i.id, accept: true }) }}>Add to Playbook</Btn>
      <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); d({ type: 'publishing/ideaRule', id: i.id, accept: false }) }}>No</Btn>
    </div>
  )
}

function DismissMenu({ i, size = 'sm', onDone }: { i: Idea; size?: 'sm' | 'md'; onDone?: () => void }) {
  const { d } = useStore()
  return (
    <Menu align="start" trigger={<Btn size={size === 'sm' ? 'sm' : undefined} variant="ghost" onClick={e => e.stopPropagation()}>Dismiss<ChevronDown size={12} /></Btn>}
      items={[{ heading: 'Why not?' }, ...DISMISS_REASONS.map(r => ({ label: r, onSelect: () => { d({ type: 'publishing/ideaDismiss', id: i.id, reason: r }); onDone?.() } }))]} />
  )
}

/** The main action, always first: Schedule when written, Draft it otherwise; Thursday's batch joins the plan; a series goes to Sage. */
function Primary({ i, size }: { i: Idea; size?: 'sm' }) {
  const { s, d } = useStore()
  const stop = (f: () => void) => (e: MouseEvent) => { e.stopPropagation(); f() }
  if (i.kind === 'series') return <Btn size={size} variant="primary" onClick={stop(() => d({ type: 'publishing/ideaToSage', id: i.id }))}>Send to Sage</Btn>
  if (i.origin === 'weekly' && s.publishing.plan.status === 'proposed') return <Btn size={size} variant="primary" onClick={stop(() => d({ type: 'publishing/ideaToPlan', id: i.id }))}>Add to next week’s plan</Btn>
  if (i.status === 'ready') return <Btn size={size} variant="primary" onClick={stop(() => d({ type: 'publishing/ideaSchedule', ids: [i.id] }))}>Schedule{size ? '' : ` ${slot(i.drafts![0].at)}`}</Btn>
  return <Btn size={size} variant="primary" onClick={stop(() => d({ type: 'publishing/ideaDraft', id: i.id }))}>Draft it</Btn>
}

function IdeaCard({ i, current, sel, now, settled }: { i: Idea; current: boolean; sel: ReturnType<typeof useSelection>; now: number; settled: (id: string) => void }) {
  const { d } = useStore()
  const nav = useNavigate()
  const open = (redirect?: boolean) => nav(`/publishing/ideas/${i.id}${redirect ? '?focus=redirect' : ''}`)
  const onCard = (e: MouseEvent) => { if (!(e.target as Element).closest('a, button, input, label, [role="menu"]')) open() }
  const d0 = i.drafts?.[0]
  const media = mediaOf(i, d0?.media)
  const arrived = now - i.at < 120_000
  return (
    <article className={`idea ${current ? 'current' : ''} ${arrived ? 'arrive' : ''} ${sel.has(i.id) ? 'picked' : ''}`} onClick={onCard} aria-current={current || undefined}>
      <span className="idea-check">{i.status === 'ready' && i.kind === 'post' && <SelectBox checked={sel.has(i.id)} visible={sel.count > 0} onToggle={shift => sel.toggle(i.id, shift)} label={`Select: ${i.title}`} />}</span>
      <div className="idea-body">
        <Provenance i={i} />
        <h3><Link to={`/publishing/ideas/${i.id}`} className="idea-title">{i.title}</Link></h3>
        <p className="idea-why">{i.why}</p>
        <Sources sources={i.sources} />
        <Meta i={i} now={now} />
        {i.followsRule && <p className="idea-follows"><BookOpen size={14} aria-hidden />Following your rule “{i.followsRule}”</p>}
        {d0 && (
          <div className="idea-prev">
            <span className="idea-thumb">{d0.media ? <Photo name={d0.media} /> : <Lightbulb size={16} aria-hidden />}</span>
            <div className="grow">
              <div className="row tight t-sm"><Net n={d0.network} /><b>{slot(d0.at)}</b><span className="faint">· {media ? `${media.title} · ${media.rights.startsWith('UGC') || media.rights.startsWith('Creator') ? media.rights : 'Fernway photo'}` : 'Visual brief, no photo yet'}</span></div>
              <p>{d0.text}</p>
              {i.drafts!.length > 1 && <span className="faint t-xs">and {plural(i.drafts!.length - 1, 'other network')}</span>}
            </div>
          </div>
        )}
        {i.steps && (
          <ol className="idea-steps">
            {i.steps.map((st, n) => <li key={st.step}><b>{n + 1} · {st.step}</b><span className="row tight"><Net n={st.network} />{new Date(new Date(2026, 11, 1 + st.day)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</span>{st.text}</li>)}
          </ol>
        )}
        <RuleProposal i={i} />
        <div className="idea-actions">
          <Primary i={i} size="sm" />
          {i.kind === 'series' && <Btn size="sm" onClick={e => { e.stopPropagation(); d({ type: 'publishing/ideaSchedule', ids: [i.id] }) }}>Schedule the series</Btn>}
          {i.kind === 'post' && <Btn size="sm" onClick={e => { e.stopPropagation(); open(true) }}>Redirect</Btn>}
          <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); settled(i.id); d({ type: 'publishing/ideaSnooze', ids: [i.id] }) }}>Not now</Btn>
          <DismissMenu i={i} onDone={() => settled(i.id)} />
        </div>
      </div>
    </article>
  )
}

/** A card you just put away: one line, with Undo. */
function Settled({ i }: { i: Idea }) {
  const { d } = useStore()
  const label = i.status === 'dismissed' ? `Dismissed · ${i.dismissReason?.toLowerCase()}` : i.status === 'snoozed' ? 'Back tomorrow 08:00' : i.status === 'sent-to-sage' ? 'With Sage' : i.status === 'expired' ? 'Expired' : 'Scheduled'
  return (
    <article className="idea settled">
      <div className="idea-body">
        <div className="row"><span className="grow ellipsis">{i.title}</span>{i.status === 'dismissed' || i.status === 'snoozed' ? <Reopen label={label} onUndo={() => d({ type: 'publishing/ideaReopen', id: i.id })} /> : <Pill>{label}</Pill>}</div>
        <RuleProposal i={i} />
      </div>
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
  const behind = ideas.filter(i => isOpen(i) && i.status === 'ready').length

  const group = (key: string, title: string, list: Idea[], head?: ReactNode) => list.length > 0 && (
    <section className="ideas-group" aria-labelledby={`ig-${key}`}>
      <header>
        {head}
        <h2 id={`ig-${key}`}>{title}</h2><CountBadge n={list.filter(isOpen).length} />
        <span className="spacer" />
        {key === 'ready' && readyIds.length > 1 && !sel.count && <Btn size="sm" onClick={() => d({ type: 'publishing/ideaSchedule', ids: readyIds })}>Schedule {readyIds.length} ready</Btn>}
      </header>
      <div className="ideas-list">
        {list.map(i => (isOpen(i) ? <IdeaCard key={i.id} i={i} current={i.id === id} sel={sel} now={now} settled={settled} /> : <Settled key={i.id} i={i} />))}
      </div>
    </section>
  )

  return (
    <div className={`ideas-layout ${current ? 'has-current' : ''}`}>
      <div className="ideas-main">
        <p className="ideas-lede" aria-live="polite"><Mark agent="atlas" /><span>{summarize(ideas)}</span></p>
        {sel.count > 0 ? (
          <BulkBar count={sel.count} noun={sel.count > 1 ? 'ideas selected' : 'idea selected'} onClear={sel.clear} actions={[
            { label: `Schedule ${sel.count} ready`, primary: true, onRun: () => { d({ type: 'publishing/ideaSchedule', ids: [...sel.selected] }); sel.clear() } },
            { label: 'Not now', onRun: () => { [...sel.selected].forEach(settled); d({ type: 'publishing/ideaSnooze', ids: [...sel.selected] }); sel.clear() } },
          ]} />
        ) : undo ? <UndoBar className="mb-3" until={undo.until} onUndo={() => d({ type: 'publishing/restore' })} action={<Btn size="xs" variant="ghost" onClick={() => nav('/publishing/calendar')}>Open the calendar</Btn>}>{undo.label}</UndoBar>
          : <Notice scope="publishing" className="mb-3" />}
        {!shown.length ? <Empty icon={<Lightbulb size={18} />} title="No ideas waiting" body="Atlas brings the next one as soon as a signal is worth it: a post that takes off, a trend, a customer photo, an empty day." /> : (
          <>
            {group('ready', 'Ready to review', ready, readyIds.length > 0 && <SelectAll sel={sel} label="Select every ready idea" />)}
            {group('new', 'New ideas', fresh)}
            {group('series', 'Series', series)}
          </>
        )}
        <span className="sr-only">{behind} ideas ready to review</span>
      </div>
      {current && <IdeaPanel key={current.id} i={current} onClose={() => nav('/publishing')} />}
      {id && !current && <aside className="card idea-panel"><Empty title="This idea is gone" body="It may have expired or been cleared by a reset." action={<Btn onClick={() => nav('/publishing')}>Back to Ideas</Btn>} /></aside>}
    </div>
  )
}

/* ---------- Side panel ---------- */

function IdeaPanel({ i, onClose }: { i: Idea; onClose: () => void }) {
  const { s, d } = useStore()
  const loc = useLocation()
  const nav = useNavigate()
  const now = useNow(30000)
  const [net, setNet] = useState<Network>(i.drafts?.[0]?.network ?? i.networks[0])
  const draft = i.drafts?.find(x => x.network === net) ?? i.drafts?.[0]
  const [text, setText] = useState(draft?.text ?? '')
  const [busy, setBusy] = useState<string | null>(null)
  const [ask, setAsk] = useState('')
  const [variants, setVariants] = useState<Variant[] | null>(null)
  const [mix, setMix] = useState<{ hook: 'A' | 'B' | 'C'; body: 'A' | 'B' | 'C' }>({ hook: 'B', body: 'C' })
  const redirectRef = useRef<HTMLElement>(null)
  const words = ((s.playbook as { banned?: string[] }).banned ?? BANNED).map(w => w.replace(/\s*\(.*\)$/, '').toLowerCase())
  const open = isOpen(i)
  const last = i.versions.at(-1)
  const prev = i.versions.at(-2)

  useEffect(() => { d({ type: 'publishing/ideaOpen', id: i.id }) }, [i.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setText(draft?.text ?? '') }, [draft?.text])
  useEffect(() => { if (new URLSearchParams(loc.search).get('focus') === 'redirect') redirectRef.current?.scrollIntoView({ block: 'start' }) }, [loc.search])

  const think = (label: string, f: () => void) => { setBusy(label); setTimeout(() => { f(); setBusy(null) }, 650) }
  const angle = (a: Angle, label: string) => think(`Atlas is rewriting: ${label.toLowerCase()}`, () => d({ type: 'publishing/ideaRedirect', id: i.id, mode: 'angle', angle: a }))
  const send = () => { const t = ask.trim(); if (!t) return; think('Atlas is reading your note', () => { d({ type: 'publishing/ideaRedirect', id: i.id, mode: 'free', text: t }); setAsk('') }) }
  const media = mediaOf(i, draft?.media)
  const checks = draft ? checkPost({ text: draft.text, network: draft.network, media: draft.media, brief: draft.brief, words, rules: s.playbook.rules }) : []
  const pickedVariant = (k: 'A' | 'B' | 'C') => variants!.find(v => v.key === k)!
  const status = { new: 'New idea', ready: 'Ready', scheduled: i.inPlan ? 'In next week’s plan' : 'Scheduled', snoozed: 'Back tomorrow 08:00', dismissed: 'Dismissed', 'sent-to-sage': 'With Sage', expired: 'Expired' }[i.status]

  return (
    <aside className="card idea-panel" aria-label={`Idea: ${i.title}`}>
      <header className="idea-panel-head">
        <Mark agent="atlas" />
        <div className="grow">
          <h2>{i.title}</h2>
          <div className="row tight t-sm faint">
            <Pill tone={i.status === 'ready' ? 'ok' : i.status === 'expired' || i.status === 'dismissed' ? undefined : i.status === 'new' ? 'signal' : undefined}>{status}</Pill>
            {i.versions.length > 0 && <span>Version {i.versions.length}</span>}
            {draft && <span>· {NETWORK_LABEL[draft.network]}{draft.format ? ` ${draft.format.split(' ·')[0].toLowerCase()}` : ''} · {slot(draft.at)}</span>}
          </div>
        </div>
        <Btn variant="ghost" icon size="sm" aria-label="Close" onClick={onClose}><X size={16} /></Btn>
      </header>

      <div className="idea-panel-body">
        <section>
          <p className="idea-why">{i.why}</p>
          <Sources sources={i.sources} />
          <Meta i={i} now={now} />
        </section>

        {!open && (
          <div className="idea-state">
            {i.status === 'scheduled' && !i.inPlan && <p><Check size={14} aria-hidden />In the calendar. <Link to="/publishing/calendar">Open the calendar</Link></p>}
            {i.inPlan && <p><Check size={14} aria-hidden />Added to next week’s plan. <Link to="/publishing/plan">See the plan</Link></p>}
            {i.status === 'sent-to-sage' && i.campaign && <p><Check size={14} aria-hidden />Sage turned it into a campaign plan. <Link to={`/strategy/campaigns/${i.campaign}`}>See the campaign</Link></p>}
            {i.status === 'expired' && <p><Clock size={14} aria-hidden />Expired: {i.expires?.reason}.</p>}
            {(i.status === 'dismissed' || i.status === 'snoozed') && <Reopen label={status} onUndo={() => d({ type: 'publishing/ideaReopen', id: i.id })} />}
          </div>
        )}

        {i.steps && (
          <section>
            <div className="section-title">The series</div>
            <ol className="idea-steps vertical">{i.steps.map((st, n) => <li key={st.step}><b>{n + 1} · {st.step}</b><span className="row tight"><Net n={st.network} />{NETWORK_LABEL[st.network]}</span>{st.text}</li>)}</ol>
            {i.brief && <p className="idea-brief"><Lightbulb size={14} aria-hidden />{i.brief}</p>}
          </section>
        )}

        {i.kind === 'post' && !draft && (
          <section>
            <div className="section-title">Atlas’s angle</div>
            <p className="idea-copy">{Object.values(i.copy)[0]}</p>
            <p className="faint t-sm">Not written yet. Publishing trend posts is set to Suggest: Atlas writes it when you say so.</p>
          </section>
        )}

        {draft && (
          <section>
            <div className="section-title">Draft</div>
            {i.drafts!.length > 1 && <Seg name="idea-net" label="Network" size="sm" value={draft.network} onChange={setNet} options={i.drafts!.map(x => ({ value: x.network, label: NETWORK_LABEL[x.network] }))} />}
            <div className="idea-draft">
              <div className="idea-pv"><NetworkPreview network={draft.network} text={draft.text} media={draft.media} words={words} /></div>
              <div className="stack">
                <div className="field">
                  <label htmlFor="idea-cap">Caption</label>
                  <textarea id="idea-cap" className="textarea" rows={5} value={text} onChange={e => setText(e.target.value)} disabled={!open} />
                  {text !== draft.text && <div className="row tight"><Btn size="xs" onClick={() => d({ type: 'publishing/ideaRedirect', id: i.id, mode: 'edit', network: draft.network, text, label: 'Your edit' })}>Save my edit</Btn><Btn size="xs" variant="ghost" onClick={() => setText(draft.text)}>Cancel</Btn></div>}
                </div>
                <div className="field">
                  <span className="label">Visual</span>
                  {media ? <span className="t-sm">{media.title} · <span className="faint">{media.rights === 'Fernway' ? 'Fernway photo' : media.rights}</span></span>
                    : <p className="idea-brief"><Lightbulb size={14} aria-hidden />{draft.brief ?? 'No visual.'} Atlas never uses stock photos.</p>}
                </div>
                <div className="field">
                  <label htmlFor="idea-slot">Slot</label>
                  <input id="idea-slot" type="datetime-local" className="input" disabled={!open} value={toLocal(draft.at)} onChange={e => { const t = new Date(e.target.value).getTime(); if (t > now) d({ type: 'publishing/ideaSlot', id: i.id, network: draft.network, at: t }) }} />
                  <p className="idea-slot-note"><Mark agent="atlas" />{slotComment(draft.network, draft.at)}</p>
                </div>
                <ul className="idea-checks" aria-label="Playbook check">{checks.map(c => <li key={c.label} className={c.ok ? 'ok' : 'bad'}>{c.ok ? <Check size={14} aria-hidden /> : <TriangleAlert size={14} aria-hidden />}{c.label.replace(`${NETWORK_LABEL[draft.network]}: `, '')}</li>)}</ul>
              </div>
            </div>
          </section>
        )}

        {i.kind === 'post' && open && (
          <section className="idea-redirect" ref={redirectRef} aria-label="Redirect">
            <div className="section-title flush">Redirect <span className="faint">· Atlas rewrites, you don’t</span></div>

            <div className="mode">
              <h3>One click</h3>
              <div className="filters" role="group" aria-label="Angles">
                {ANGLES.map(a => <button key={a.key} className="filter" disabled={!!busy} onClick={() => angle(a.key, a.label)}>{a.label}</button>)}
              </div>
            </div>

            {busy && <Thinking label={busy} />}

            {!busy && last && prev && last.by === 'you' && (
              <div className="idea-version" aria-live="polite">
                <div className="row tight t-sm"><b>Version {last.n} · {last.label}</b><span className="faint">· {ago(last.at, now)}</span></div>
                {(() => {
                  const a = prev.drafts.find(x => x.network === net)?.text, b = last.drafts.find(x => x.network === net)?.text
                  if (b === undefined) return null
                  if (a === undefined) return <p className="diff t-sm"><ins>{b}</ins></p>
                  return <p className="diff t-sm">{diffWords(a, b).map((p, n) => <span key={n}>{p.op === 'add' ? <ins>{p.text}</ins> : p.op === 'del' ? <del>{p.text}</del> : p.text}{' '}</span>)}</p>
                })()}
              </div>
            )}
            {!busy && i.said && (
              <div className="idea-said" aria-live="polite">
                <p className="faint t-sm">You: {i.said.you.startsWith('“') ? i.said.you : `“${i.said.you}”`}</p>
                <p className="atlas-says"><Mark agent="atlas" /><span>{i.said.atlas}</span></p>
              </div>
            )}
            <RuleProposal i={i} />

            <div className="mode">
              <h3><label htmlFor="idea-ask">Tell Atlas what to change</label></h3>
              <form className="idea-ask" onSubmit={e => { e.preventDefault(); send() }}>
                <input id="idea-ask" className="input" value={ask} onChange={e => setAsk(e.target.value)} placeholder="Make it about repair, and post it Friday" disabled={!!busy} />
                <Btn type="submit" disabled={!ask.trim() || !!busy}>Send</Btn>
              </form>
            </div>

            <div className="mode">
              <div className="row"><h3 className="m-0">Side by side</h3><span className="spacer" /><Btn size="sm" disabled={!!busy} onClick={() => think('Atlas is writing 3 variants', () => setVariants(variantsOf(i, net)))}><Sparkles size={14} />{variants ? 'Write 3 again' : 'Show 3 variants'}</Btn></div>
              {variants && (
                <>
                  <div className="idea-variants">
                    {variants.map(v => (
                      <div key={v.key} className="idea-variant">
                        <span className="k">{v.key} · {v.label}</span>
                        <p><span className="hook">{v.hook}</span> {v.body}</p>
                        <Btn size="xs" onClick={() => { d({ type: 'publishing/ideaRedirect', id: i.id, mode: 'variant', network: net, text: variantText(v), label: `variant ${v.key} (${v.label.toLowerCase()})` }); setVariants(null) }}>Keep this</Btn>
                      </div>
                    ))}
                  </div>
                  <div className="idea-mix">
                    <span>Hook from</span>
                    <Menu align="start" trigger={<button className="select-btn" aria-label="Hook from">{mix.hook}<ChevronDown size={14} /></button>} items={variants.map(v => ({ label: `${v.key} · ${v.label}`, onSelect: () => setMix(m => ({ ...m, hook: v.key })) }))} />
                    <span>body from</span>
                    <Menu align="start" trigger={<button className="select-btn" aria-label="Body from">{mix.body}<ChevronDown size={14} /></button>} items={variants.map(v => ({ label: `${v.key} · ${v.label}`, onSelect: () => setMix(m => ({ ...m, body: v.key })) }))} />
                    <Btn size="xs" onClick={() => { d({ type: 'publishing/ideaRedirect', id: i.id, mode: 'variant', network: net, text: mixVariants(pickedVariant(mix.hook), pickedVariant(mix.body)), label: `hook ${mix.hook} + body ${mix.body}` }); setVariants(null) }}>Use the mix</Btn>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {i.versions.length > 0 && (
          <section>
            <div className="section-title">Versions</div>
            <ol className="idea-versions" reversed>
              {[...i.versions].reverse().map(v => (
                <li key={v.n}>
                  <span className="n">v{v.n}</span>
                  <span className="grow"><b>{v.label}</b> · {v.by === 'you' ? 'you' : 'Atlas'}, {ago(v.at, now)}{v.note && <span className="faint t-xs block">{v.note}</span>}</span>
                  {v.n !== i.versions.length && open && <button className="link-btn t-sm" onClick={() => d({ type: 'publishing/ideaRestoreVersion', id: i.id, n: v.n })}>Go back to this</button>}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {open && (
        <footer className="idea-panel-foot">
          <span className="spacer" />
          <Btn variant="ghost" onClick={() => { d({ type: 'publishing/ideaSnooze', ids: [i.id] }); nav('/publishing') }}>Not now</Btn>
          <DismissMenu i={i} size="md" />
          {i.kind === 'series' && <Btn onClick={() => d({ type: 'publishing/ideaSchedule', ids: [i.id] })}>Schedule the series</Btn>}
          <Primary i={i} />
        </footer>
      )}
    </aside>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')
const toLocal = (t: number) => { const x = new Date(t); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}` }
