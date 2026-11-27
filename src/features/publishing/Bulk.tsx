import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, CalendarCheck, CalendarClock, Check, ChevronDown, Copy, Hand, ImageUp, MoreHorizontal, Pencil, Play, Plus, Recycle, RotateCw, Tag, Trash2, TriangleAlert, UserRound, X } from 'lucide-react'
import type { AgentId, Decision, Flagged, Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { DAY, ago, hhmm } from '../../app/time'
import { NETWORK_LABEL, agentName } from '../../data/agents'
import { PUBLISH_NETWORKS, type Post, type PostStatus } from '../../data/publishing'
import { Btn, Confidence, Mark, Menu, Modal, Net, Pill, Seg, Sheet, Tip, type MenuItem } from '../../ui'
import { Ask, Metrics, ObjectBody, Props, Section, Timeline, Who, type By, type Line } from '../../ui/ObjectPanel'
import { BulkBar, type Selection } from '../../ui/Selection'
import { Notice, UndoBar } from '../../ui/Feedback'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { InfoPop } from '../../ui/More'
import { NetworkPreview, SLOT } from './Previews'
import type { BulkOp } from './slice'
import { RETRY_OPTIONS, failureCardOf, type Retry } from './failures'
import { FORMAT_LABEL } from './formats'
import { perfOf } from './perf'
import { STATUS_LABEL, knownLabels } from './labels'
import { actorOf, cardOfPost } from './approvals'
import { WINDOW_TOPIC } from './window'
import { captionOf, commentOf, query, shown as shownLink } from './links'
import { accountOf } from './accounts'
import { versionOf } from '../video/model'
import type { State } from '../../app/state'

/** A clip post shows the clip's version for its network (Juno's contract: requests/atlas-from-juno-clip-version). */
const clipAspect = (s: State, p: Post) => { const c = s.video.clips.find(x => `clip:${x.id}` === p.media); return c ? versionOf(c, p.network).aspect : undefined }

/** Open a post's preview: kept in the URL (?post=id) so it works from any tab. */
export function useOpenPost() {
  const nav = useNavigate()
  const loc = useLocation()
  return (id: string) => nav(`${loc.pathname}?post=${id}`)
}

type Dialog = { kind: 'reschedule' | 'duplicate' | 'delete' | 'label'; ids: string[] } | null

/** Reschedule, duplicate and delete dialogs, shared by the bulk bar and the preview panel. */
function Dialogs({ dialog, onClose, onDone }: { dialog: Dialog; onClose: () => void; onDone?: () => void }) {
  const { s, d } = useStore()
  const [mode, setMode] = useState<'shift' | 'date'>('shift')
  const [days, setDays] = useState(1)
  const [dt, setDt] = useState('')
  const now = useNow()
  const [net, setNet] = useState<Network>('instagram')
  const [picked, setPicked] = useState<string[]>([])
  const [fresh, setFresh] = useState('')
  const posts = s.publishing.posts.filter(p => dialog?.ids.includes(p.id))
  useEffect(() => { if (dialog && posts[0]) { const x = new Date(posts[0].at + DAY); setDt(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}T${hhmm(posts[0].at)}`); setNet(posts[0].network === 'instagram' ? 'tiktok' : 'instagram') } }, [dialog?.ids.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!dialog) return null
  const n = dialog.ids.length
  const run = (op: BulkOp, extra: { shiftDays?: number; at?: number; network?: Network } = {}) => { d({ type: 'publishing/bulk', ids: dialog.ids, op, ...extra }); onClose(); onDone?.() }
  const noun = `${n} post${n > 1 ? 's' : ''}`

  if (dialog.kind === 'label') {
    const add = [...picked, ...(fresh.trim() ? [fresh.trim()] : [])]
    const close = () => { setPicked([]); setFresh(''); onClose() }
    return (
      <Modal open onOpenChange={o => !o && close()} title={`Label ${noun}`}
        footer={<><span className="spacer" /><Btn variant="ghost" onClick={close}>Cancel</Btn><Btn variant="primary" disabled={!add.length} onClick={() => { d({ type: 'publishing/labels', ids: dialog.ids, add }); close(); onDone?.() }}><Tag size={14} />Add {add.length > 1 ? `${add.length} labels` : 'label'}</Btn></>}>
        <div className="pub-filters">
          {knownLabels(s).map(l => (
            <label key={l} className="row tight pub-filter-opt"><input type="checkbox" className="check" checked={picked.includes(l)} onChange={() => setPicked(x => (x.includes(l) ? x.filter(y => y !== l) : [...x, l]))} />{l}</label>
          ))}
          <div className="field"><label htmlFor="new-label">New label</label><input id="new-label" className="input" value={fresh} onChange={e => setFresh(e.target.value)} placeholder="Black Friday" /></div>
        </div>
      </Modal>
    )
  }
  if (dialog.kind === 'delete') return (
    <Modal open onOpenChange={o => !o && onClose()} title={`Delete ${noun}?`}
      footer={<><span className="spacer" /><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="danger" onClick={() => run('delete')}><Trash2 size={14} />Delete {noun}</Btn></>}>
      <p className="muted">They leave the calendar now. You can undo for 10 seconds.</p>
      <ul className="pub-dlg-list">{posts.slice(0, 5).map(p => <li key={p.id}><Net n={p.network} /><span className="ellipsis">{p.text}</span></li>)}{n > 5 && <li className="faint">and {n - 5} more</li>}</ul>
    </Modal>
  )
  if (dialog.kind === 'duplicate') return (
    <Modal open onOpenChange={o => !o && onClose()} title={`Duplicate ${noun}`}
      footer={<><span className="spacer" /><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={() => run('duplicate', { network: net })}><Copy size={14} />Duplicate to {NETWORK_LABEL[net]}</Btn></>}>
      <p className="muted">Copies land in Drafts for {NETWORK_LABEL[net]}, same slot.</p>
      <div className="pub-net-pick" role="radiogroup" aria-label="Network">
        {PUBLISH_NETWORKS.map(x => <button key={x} role="radio" aria-checked={net === x} className={`filter ${net === x ? 'on' : ''}`} aria-pressed={net === x} onClick={() => setNet(x)}><Net n={x} />{NETWORK_LABEL[x]}</button>)}
      </div>
    </Modal>
  )
  return (
    <Modal open onOpenChange={o => !o && onClose()} title={`Reschedule ${noun}`}
      footer={<><span className="spacer" /><Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={() => (mode === 'shift' ? run('reschedule', { shiftDays: days }) : run('reschedule', { at: new Date(dt).getTime() }))} disabled={mode === 'date' && (!dt || new Date(dt).getTime() < now)}><CalendarClock size={14} />Reschedule</Btn></>}>
      <div className="stack">
        <Seg name="resched" label="How" value={mode} onChange={setMode} options={[{ value: 'shift', label: 'Shift by days' }, { value: 'date', label: 'Pick a date and time' }]} />
        {mode === 'shift' ? (
          <div className="field">
            <label htmlFor="pub-shift">Days (negative = earlier)</label>
            <input id="pub-shift" type="number" className="input w-120" value={days} min={-14} max={30} onChange={e => setDays(+e.target.value || 0)} />
            <span className="hint">Each post keeps its time of day. Published posts don’t move.</span>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="pub-dt">New date and time</label>
            <input id="pub-dt" type="datetime-local" className="input w-240" value={dt} onChange={e => setDt(e.target.value)} />
            {dt && new Date(dt).getTime() < now ? <span className="hint" role="alert">That slot is in the past. Pick today or later.</span>
              : n > 1 && <span className="hint">All {n} posts go to this exact slot.</span>}
          </div>
        )}
      </div>
    </Modal>
  )
}

/** The bar shown while posts are selected, plus the 10 s undo strip after a bulk change. */
export function PostsBulk({ sel, posts }: { sel: Selection; posts: Post[] }) {
  const { s, d } = useStore()
  const now = useNow(1000)
  const [dialog, setDialog] = useState<Dialog>(null)
  const picked = posts.filter(p => sel.has(p.id))
  const approvable = picked.filter(p => p.status === 'needs' || p.status === 'draft').length
  const undo = s.publishing.undo && s.publishing.undo.until > now ? s.publishing.undo : undefined
  const ids = [...sel.selected]
  return (
    <>
      <BulkBar count={sel.count} noun={sel.count > 1 ? 'posts selected' : 'post selected'} onClear={sel.clear} actions={[
        { label: `Approve${approvable && approvable < sel.count ? ` ${approvable}` : ''}`, icon: <Check size={14} />, primary: true, disabled: !approvable, note: approvable < sel.count ? `${approvable} of ${sel.count} can be approved, the rest are already scheduled or published` : undefined, onRun: () => { d({ type: 'publishing/bulk', ids, op: 'approve' }); sel.clear() } },
        { label: 'Reschedule', icon: <CalendarClock size={14} />, onRun: () => setDialog({ kind: 'reschedule', ids }) },
        { label: 'Duplicate', icon: <Copy size={14} />, onRun: () => setDialog({ kind: 'duplicate', ids }) },
        { label: 'Label', icon: <Tag size={14} />, onRun: () => setDialog({ kind: 'label', ids }) },
        { label: 'Ask Claire', icon: <UserRound size={14} />, onRun: () => { d({ type: 'publishing/bulk', ids, op: 'claire' }); sel.clear() } },
        { label: 'Delete', icon: <Trash2 size={14} />, onRun: () => setDialog({ kind: 'delete', ids }) },
      ]} />
      {!sel.count && undo && (
        <UndoBar className="mb-3" until={undo.until} onUndo={() => d({ type: 'publishing/restore' })}>{undo.label}</UndoBar>
      )}
      {!sel.count && <Notice scope="publishing" className="mb-3" />}
      <Dialogs dialog={dialog} onClose={() => setDialog(null)} onDone={sel.clear} />
    </>
  )
}

/** A post's labels: remove one, add a known one, or type a new one. */
function LabelsEdit({ p }: { p: Post }) {
  const { s, d } = useStore()
  const [typing, setTyping] = useState(false)
  const [v, setV] = useState('')
  const others = knownLabels(s).filter(l => !p.labels?.includes(l))
  const add = (l: string) => { if (l.trim()) d({ type: 'publishing/labels', ids: [p.id], add: [l] }); setV(''); setTyping(false) }
  return (
    <span className="pub-labels">
      {(p.labels ?? []).map(l => (
        <span key={l} className="chip">{l}<Btn size="xs" variant="ghost" icon aria-label={`Remove the label ${l}`} onClick={() => d({ type: 'publishing/labels', ids: [p.id], remove: [l] })}><X size={12} /></Btn></span>
      ))}
      {typing
        ? <form onSubmit={e => { e.preventDefault(); add(v) }}><input autoFocus className="input" aria-label="New label" value={v} onChange={e => setV(e.target.value)} onBlur={() => (v.trim() ? add(v) : setTyping(false))} placeholder="New label" /></form>
        : <Menu align="start" trigger={<Btn size="xs" variant="ghost"><Plus size={12} />Add<ChevronDown size={12} /></Btn>}
            items={[...others.map(l => ({ label: l, onSelect: () => add(l) })), ...(others.length ? ['sep' as const] : []), { label: 'New label…', onSelect: () => setTyping(true) }]} />}
    </span>
  )
}

const longWhen = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at ${hhmm(t)}`
const shortWhen = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${hhmm(t)}`
/** "in 2 days", "in 3 h", "tomorrow"; "3 h ago", "8 days ago" for the past. */
const until = (t: number, now: number) => {
  if (t <= now) return now - t < DAY ? ago(t, now) : `${Math.round((now - t) / DAY)} days ago`
  const h = Math.round((t - now) / 3_600_000)
  if (h < 1) return 'in less than an hour'
  if (h < 24) return `in ${h} h`
  const d = Math.round((t - now) / DAY)
  return d === 1 ? 'tomorrow' : `in ${d} days`
}
const flat = (parts: Flagged[]) => parts.map(x => (typeof x === 'string' ? x : x.text)).join('')
const TONE: Record<PostStatus, 'alert' | 'caution' | 'ok' | 'signal' | undefined> = { needs: 'caution', paused: 'caution', failed: 'alert', published: 'ok', unapproved: 'signal', scheduled: undefined, draft: undefined }
const APPROVAL: Record<NonNullable<Post['approval']>['state'], string> = { pending: 'Waiting on Claire', approved: 'Approved by Claire', changes: 'Claire asked for changes', declined: 'Declined by Claire' }

/**
 * One post, as an object panel (matrix §16): the header says which post it is and holds what you can always do to it;
 * the Ask says what it waits for from Sam, only when it does; then the post as the network shows it, its details,
 * its results, and everything that happened to it.
 */
export function PostPreview() {
  const { s, d } = useStore()
  const now = useNow(60_000)
  const nav = useNavigate()
  const loc = useLocation()
  const id = new URLSearchParams(loc.search).get('post')
  const p = s.publishing.posts.find(x => x.id === id)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [answer, setAnswer] = useState('')
  useEffect(() => setAnswer(''), [id])
  const close = () => nav(loc.pathname)
  const go = (to?: Post) => to && nav(`${loc.pathname}?post=${to.id}`, { replace: true })
  const net = p ? NETWORK_LABEL[p.network] : ''

  // Previous / next: the calendar's order, by publish time.
  const order = [...s.publishing.posts].sort((a, b) => a.at - b.at)
  const at = p ? order.findIndex(x => x.id === p.id) : -1
  const account = p && accountOf(p)
  const kind = p ? FORMAT_LABEL[p.format ?? 'post'].toLowerCase() : ''

  const more: MenuItem[] = p ? [
    ...(p.status !== 'published' ? [{ label: 'Reschedule', icon: <CalendarClock size={14} />, onSelect: () => setDialog({ kind: 'reschedule', ids: [p.id] }) }] : []),
    { label: 'Duplicate', icon: <Copy size={14} />, onSelect: () => setDialog({ kind: 'duplicate', ids: [p.id] }) },
    'sep',
    { label: 'Delete', icon: <Trash2 size={14} />, onSelect: () => setDialog({ kind: 'delete', ids: [p.id] }) },
  ] : []

  return (
    <>
      <Sheet wide open={!!id} onOpenChange={o => !o && close()}
        head={account && <SocialAvatar name={account.name} network={p!.network} org size={40} />}
        title={p && account ? `${account.name} · ${net} ${kind}` : 'Post not found'}
        meta={p ? [shortWhen(p.at), `${p.pillar} pillar`] : undefined}
        status={p && <Pill tone={TONE[p.status]}>{STATUS_LABEL[p.status]}</Pill>}
        nav={p ? { noun: 'post', prev: at > 0 ? () => go(order[at - 1]) : undefined, next: at < order.length - 1 ? () => go(order[at + 1]) : undefined } : undefined}
        tools={p && <>
          {p.status !== 'published' && <Tip label="Edit post"><Btn variant="ghost" icon size="sm" aria-label="Edit post" onClick={() => nav(`/publishing/post/${p.id}`)}><Pencil size={16} /></Btn></Tip>}
          <Menu align="end" trigger={<Btn variant="ghost" icon size="sm" aria-label="More actions"><MoreHorizontal size={16} /></Btn>} items={more} />
        </>}>
        {!p || !account ? <p className="muted">This post no longer exists.</p> : (() => {
          const card = cardOfPost(s, p)
          const pending = card?.preview?.type === 'post' ? card.preview : undefined
          const perf = perfOf(s, p)
          const queue = p.queue && s.publishing.queues.find(q => q.id === p.queue)
          const edit = <Btn onClick={() => nav(`/publishing/post/${p.id}`)}><Pencil size={14} />Edit</Btn>
          const resolve = (decision: Decision) => card && d({ type: 'core/resolve', id: card.id, decision })
          const approveAlone = () => d({ type: 'publishing/bulk', ids: [p.id], op: 'approve' })

          // The Ask: what this post waits for from Sam, why, and the one thing that moves it. Nothing when it waits for no one.
          let ask: { agents?: By[]; title: string; body?: ReactNode; acts?: ReactNode } | null = null
          if (p.status === 'failed') {
            const fail = failureCardOf(s, p.id)
            const retry = (mode: Retry) => {
              const i = RETRY_OPTIONS.findIndex(o => o.mode === mode)
              d(fail ? { type: 'core/resolve', id: fail.id, decision: { kind: 'option', index: i, option: RETRY_OPTIONS[i].label } } : { type: 'publishing/retry', id: p.id, mode })
            }
            ask = {
              agents: ['atlas'], title: p.failure ? `${net} refused it at ${hhmm(p.failure.at)}` : 'Publishing failed',
              body: <p>{p.failure?.text ?? p.note}{fail?.why && <> <InfoPop label="Why?">{fail.why}</InfoPop></>}</p>,
              acts: <>
                <Btn variant="primary" onClick={() => retry('fix')}><RotateCw size={14} />{RETRY_OPTIONS[0].label}</Btn>
                <Btn onClick={() => retry('nolink')}>{RETRY_OPTIONS[1].label}</Btn>
                <Btn variant="ghost" onClick={() => retry('skip')}>{RETRY_OPTIONS[2].label}</Btn>
              </>,
            }
          } else if (p.status === 'paused' && s.publishing.hold) {
            ask = { title: 'You paused all publishing', body: <p>Nothing goes out until you resume.</p>, acts: <Btn variant="primary" onClick={() => d({ type: 'publishing/resumeAll' })}><Play size={14} />Resume publishing</Btn> }
          } else if (p.status === 'paused') {
            ask = { agents: ['atlas'], title: 'Paused by Atlas', body: <p>{p.note} It goes out on its own once the alert is over.</p>, acts: <Btn variant="primary" onClick={() => d({ type: 'publishing/resume', ids: [p.id] })}><Play size={14} />Resume this post</Btn> }
          } else if (card?.topic === WINDOW_TOPIC && card.options) {
            // The send window: Atlas scheduled it alone, Sam can still stop it. The reason is the Desk card's option.
            ask = {
              agents: ['atlas'], title: card.title, body: <p>{card.why}</p>,
              acts: <>
                <Menu align="start" trigger={<Btn variant="primary"><Hand size={14} />Stop it<ChevronDown size={14} /></Btn>} items={[
                  { heading: 'What’s wrong with it?' },
                  ...card.options.slice(1).map((o, i) => ({ label: o.label.replace('Stop: ', '').replace(/^./, c => c.toUpperCase()), onSelect: () => resolve({ kind: 'option', index: i + 1, option: o.label }) })),
                ]} />
                <Btn variant="ghost" onClick={() => resolve({ kind: 'option', index: 0, option: card.options![0].label })}>Let it go out</Btn>
              </>,
            }
          } else if (p.status === 'unapproved' || card?.lane === 'claire') {
            // Sam has nothing to do: the header pill and Details say it's with Claire; Activity has what was sent.
          } else if (card) {
            const chain: AgentId[] = card.chain?.length ? card.chain : [card.agent]
            const last = card.thread?.at(-1)
            let acts: ReactNode
            if (card.field) {
              acts = (
                <form onSubmit={e => { e.preventDefault(); if (answer.trim()) { resolve({ kind: 'answer', text: answer.trim() }); setAnswer('') } }}>
                  <label htmlFor="pd-answer">{card.field.label}</label>
                  <input id="pd-answer" className="input" value={answer} onChange={e => setAnswer(e.target.value)} placeholder={card.field.placeholder} autoComplete="off" />
                  <Btn type="submit" variant="primary" disabled={!answer.trim()}><Check size={14} />Add {card.field.label.toLowerCase().replace(/^promo /, '')} and schedule</Btn>
                </form>
              )
            } else if (card.options?.length) {
              const best = Math.max(0, card.options.findIndex(o => o.recommended))
              acts = card.options.map((o, i) => <Btn key={o.label} variant={i === best ? 'primary' : undefined} onClick={() => resolve({ kind: 'option', index: i, option: o.label })}>{o.label}</Btn>)
            } else {
              acts = <>
                <Btn variant="primary" onClick={() => resolve({ kind: 'approve' })}><Check size={14} />Approve and schedule</Btn>
                {pending && <Menu align="start" trigger={<Btn>Request changes<ChevronDown size={14} /></Btn>} items={[
                  { heading: `Ask ${agentName(card.agent)} to rewrite it` },
                  ...['Make it shorter', 'Make it warmer', 'Make it more formal'].map(text => ({ label: text, onSelect: () => d({ type: 'core/thread', id: card.id, text }) })),
                ]} />}
              </>
            }
            ask = {
              agents: chain, title: card.kind === 'approval' ? `${agentName(card.agent)} needs your approval` : card.title,
              body: <>
                <p><b>{chain.map(agentName).join(' → ')}:</b> {card.context}{card.kind === 'approval' && p.at > now && <> It goes out <b>{longWhen(p.at)}</b> once you approve.</>}
                  {/* The setting, the Playbook rule and the confidence: one click away (matrix §13). Already in a sheet, so a popover. */}
                  {(card.why || !!card.rules?.length || !!card.confidence) && <> <InfoPop label="Why?">
                    <div className="stack">
                      {card.why && <p>{card.why}</p>}
                      {!!card.rules?.length && <p className="pd-rules"><BookOpen size={14} aria-hidden />Playbook: {card.rules.map(r => `“${r}”`).join(' · ')}</p>}
                      {!!card.confidence && <Confidence v={card.confidence} />}
                    </div>
                  </InfoPop></>}
                </p>
                {last?.from === 'agent' && card.thread!.some(m => m.from === 'you') && <p aria-live="polite"><b>{agentName(card.agent)}:</b> {last.text}</p>}
              </>,
              acts,
            }
          } else if (p.status === 'needs') {
            ask = {
              agents: ['atlas'], title: p.waiting === 'visual' ? 'Atlas needs a visual' : 'Atlas needs your approval', body: p.note && <p>{p.note}</p>,
              acts: p.waiting === 'visual'
                ? <Link className="btn primary" to={`/publishing/media?for=${p.id}`}><ImageUp size={14} />Upload it in Media</Link>
                : <><Btn variant="primary" onClick={approveAlone}><Check size={14} />Approve and schedule</Btn>{edit}</>,
            }
          } else if (p.status === 'draft') {
            ask = {
              title: p.at > now ? 'Schedule this draft?' : 'Its slot has passed',
              body: <p>{p.note ? `${p.note} ` : ''}{p.at > now ? <>Scheduling puts it out <b>{longWhen(p.at)}</b>.</> : 'Pick a new time to schedule it.'}</p>,
              acts: p.at > now
                ? <Btn variant="primary" onClick={approveAlone}><CalendarCheck size={14} />Schedule it</Btn>
                : <Btn variant="primary" onClick={() => setDialog({ kind: 'reschedule', ids: [p.id] })}><CalendarClock size={14} />Pick a new time</Btn>,
            }
          }

          // A decision taken on this post's Desk card (here or on the Desk) can be undone from here while its window lasts.
          const undo = s.log.find(l => l.status !== 'undone' && (l.undoUntil ?? 0) > now && l.restore?.some(h => h.ref === p.id || h.id === p.handoff || h.id === p.approval?.card))

          // Activity: the Desk card, its thread, the post's history and comments, oldest first.
          const commentAt = new Set((p.comments ?? []).map(c => c.at))
          const lines: Line[] = [
            ...(card?.at && card.lane !== 'claire' && card.topic !== WINDOW_TOPIC ? [{ at: card.at, by: card.agent as By, named: true, text: card.kind === 'approval' ? 'asked for your approval on the Desk' : 'asked you on the Desk' }] : []),
            ...(card?.thread ?? []).filter(m => !(m.from === 'agent' && m.text === card!.why)).map(m => ({ at: m.at, by: (m.from === 'agent' ? card!.agent : m.from) as By, named: m.from === 'you', said: m.from !== 'you', text: m.from === 'you' ? `asked “${m.text}”` : m.text })),
            ...(p.history ?? []).filter(h => !commentAt.has(h.at)).map(h => ({ at: h.at, by: actorOf(h.text), text: h.text })),
            ...(p.comments ?? []).map(c => ({ at: c.at, by: c.from as By, said: true, text: c.text })),
            ...(p.status === 'published' ? [{ at: p.at, text: `Published on ${net}` }] : []),
          ].sort((a, b) => a.at! - b.at!)
          const flags = pending?.text.filter((x): x is Exclude<Flagged, string> => typeof x !== 'string') ?? []

          // Live fill: what Sam types into a missing slot shows in the preview, where it will land.
          const typed = card?.field ? answer.trim().toUpperCase() : ''
          const caption = pending ? flat(pending.text) : captionOf(p)
          const shown = typed ? caption.replace(SLOT, typed) : caption

          const approval = p.approval ? `${APPROVAL[p.approval.state]}${p.approval.state === 'pending' ? ` since ${hhmm(p.approval.at)}` : `, ${shortWhen(p.approval.at)}`}`
            : card?.kind === 'approval' || (p.status === 'needs' && !card?.field && p.waiting !== 'visual') ? 'Waiting on you' : 'Not needed'
          const idea = perf?.worth && s.publishing.ideas.find(i => i.key === `recycle-${p.id}`)

          return (
            <div className="obj-panel">
              {ask && <Ask agents={ask.agents} title={ask.title} actions={ask.acts}>{ask.body}</Ask>}
              {undo && <UndoBar until={undo.undoUntil} onUndo={() => d({ type: 'core/undo', id: undo.id })}>{undo.text}</UndoBar>}
              <ObjectBody
                main={<>
                  <NetworkPreview network={p.network} who={account} aspect={clipAspect(s, p)} text={shown} fill={typed ? [typed] : []} media={pending?.media ?? p.media} words={[]} stats={p.stats} status={p.status} at={p.at} format={p.format} firstComment={commentOf(p)} />
                  {pending && flat(pending.text) !== p.text && <p className="obj-note">You see the version on the Desk card: approving schedules this text.</p>}
                  {flags.map(f => <p key={f.text} className="obj-note"><TriangleAlert size={14} aria-hidden /><span>Atlas isn’t sure about “{f.text}”: {f.note}</span></p>)}
                </>}
                aside={<>
                  {p.status === 'published' && (
                    <Section title="Results">
                      {perf ? <>
                        <Metrics items={[
                          { label: 'Reach', value: perf.reach.toLocaleString('en-GB'), note: `${perf.ratio}× your ${net} median (${Math.round(perf.medianReach).toLocaleString('en-GB')})` },
                          { label: 'Engagement rate', value: `${perf.er}%`, note: `${perf.er >= perf.medianEr ? 'Above' : 'Below'} the median (${perf.medianEr}%)` },
                        ]} />
                        <p className="obj-note"><Mark agent="atlas" /><span><b>Atlas:</b> {perf.reading}</span></p>
                      </> : p.stats
                        ? <Metrics items={[{ label: 'Reach', value: p.stats.reach.toLocaleString('en-GB') }, { label: 'Engagement rate', value: `${p.stats.er}%` }]} />
                        : <p className="muted t-sm">No results yet.</p>}
                      {(perf?.worth || p.stats || perf) && <div className="obj-ask-acts">
                        {perf?.worth && (idea ? <Link className="btn" to={`/publishing/ideas/${idea.id}`}>In Ideas: review it</Link> : <Btn variant="primary" onClick={() => d({ type: 'publishing/recycle', id: p.id })}><Recycle size={14} />Recycle it</Btn>)}
                        <Link className="btn ghost" to="/insights">See in Insights</Link>
                      </div>}
                    </Section>
                  )}
                  <Props rows={[
                    { label: p.status === 'published' ? 'Published' : 'Publishes', value: <><span>{longWhen(p.at)}</span><span className="muted t-sm">{until(p.at, now)}</span>{p.status !== 'published' && <Tip label="Reschedule"><Btn size="xs" variant="ghost" icon aria-label="Reschedule" onClick={() => setDialog({ kind: 'reschedule', ids: [p.id] })}><CalendarClock size={12} /></Btn></Tip>}</> },
                    { label: 'Profile', value: <><SocialAvatar name={account.name} network={p.network} org size={24} /><span>{account.name}</span>{account.handle !== account.name && <span className="muted">{account.handle}</span>}<span className="muted">· {net}</span></> },
                    { label: 'Format', value: FORMAT_LABEL[p.format ?? 'post'] },
                    { label: 'Pillar', value: p.pillar },
                    { label: 'Campaign', value: p.campaign && (p.campaignId ? <Link to={`/strategy/campaigns/${p.campaignId}`}>{p.campaign}</Link> : p.campaign) },
                    queue && { label: 'Queue', value: <Link to="/publishing/queues">{queue.name}</Link> },
                    { label: 'Written by', value: <><Who by={p.author === 'atlas' ? 'atlas' : 'you'} /><span>{p.author === 'atlas' ? 'Atlas' : 'You'}</span></> },
                    { label: 'Approval', value: approval },
                    p.link && { label: 'Link', value: <span className="pd-link"><span className="mono">{shownLink(p.link)}</span>{p.link.utm && <span className="muted t-xs"> → {p.link.url}?{query(p.link)}</span>}</span> },
                    p.firstComment && { label: 'First comment', value: p.firstComment },
                    { label: 'Labels', value: p.labels?.length ? <LabelsEdit p={p} /> : undefined, empty: <LabelsEdit p={p} /> },
                  ]} />
                  <Timeline lines={lines} empty="No activity recorded on this post yet." composer={{ placeholder: 'Comment for the team or Atlas…', onSend: text => d({ type: 'publishing/comment', id: p.id, text }) }} />
                </>}
              />
            </div>
          )
        })()}
      </Sheet>
      <Dialogs dialog={dialog} onClose={() => setDialog(null)} onDone={() => dialog?.kind === 'delete' && close()} />
    </>
  )
}
