import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, CalendarCheck, CalendarClock, Check, ChevronDown, Copy, History, ImageUp, Link2, ListOrdered, Megaphone, Pencil, Play, Plus, Recycle, RotateCw, Tag, Target, Trash2, TriangleAlert, UserRound, X } from 'lucide-react'
import type { AgentId, Decision, Flagged, Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { DAY, hhmm } from '../../app/time'
import { NETWORK_LABEL, agentName } from '../../data/agents'
import { PUBLISH_NETWORKS, type Post, type PostStatus } from '../../data/publishing'
import { Btn, Confidence, Mark, Menu, Modal, Net, Pill, Seg, Sheet, type MenuItem } from '../../ui'
import { BulkBar, type Selection } from '../../ui/Selection'
import { Notice, UndoBar } from '../../ui/Feedback'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { NetworkPreview } from './Previews'
import type { BulkOp } from './slice'
import { RETRY_OPTIONS, failureCardOf, type Retry } from './failures'
import { FORMAT_LABEL } from './formats'
import { perfOf } from './perf'
import { STATUS_LABEL, knownLabels } from './labels'
import { actorOf, cardOfPost } from './approvals'
import { captionOf, commentOf, query, shown as shownLink } from './links'
import { accountLabel, accountOf } from './accounts'
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
const stamp = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${hhmm(t)}`
const flat = (parts: Flagged[]) => parts.map(x => (typeof x === 'string' ? x : x.text)).join('')
const TONE: Record<PostStatus, 'alert' | 'caution' | 'ok' | 'signal' | undefined> = { needs: 'caution', paused: 'caution', failed: 'alert', published: 'ok', unapproved: 'signal', scheduled: undefined, draft: undefined }
type By = AgentId | 'claire' | 'you'
const NAME = (by: By) => (by === 'you' ? 'You' : by === 'claire' ? 'Claire' : agentName(by))

/** Who did it: the agent's mark, Sam's avatar, or a plain history dot when the model doesn't say. */
const Who = ({ by }: { by?: By }) => (by === 'you' ? <SocialAvatar name="Sam Rivera" size={24} /> : by ? <Mark agent={by} /> : <span className="pd-dot" aria-hidden><History size={12} /></span>)

/**
 * One post: first what Sam has to do (the state band, one main action), then the post as the network shows it,
 * its facts on one side and what happened to it, in order.
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
  const close = () => nav(loc.pathname)
  const net = p ? NETWORK_LABEL[p.network] : ''
  return (
    <>
      <Sheet wide open={!!id} onOpenChange={o => !o && close()} head={p && <Net n={p.network} />} title={p ? `${accountLabel(accountOf(p))} post` : 'Post not found'}>
        {!p ? <p className="muted">This post no longer exists.</p> : (() => {
          const card = cardOfPost(s, p)
          const pending = card?.preview?.type === 'post' ? card.preview : undefined
          const perf = perfOf(s, p)
          const queue = p.queue && s.publishing.queues.find(q => q.id === p.queue)
          const edit = <Btn onClick={() => nav(`/publishing/post/${p.id}`)}><Pencil size={14} />Edit</Btn>
          const resched = <Btn onClick={() => setDialog({ kind: 'reschedule', ids: [p.id] })}><CalendarClock size={14} />Reschedule</Btn>
          const resolve = (decision: Decision) => card && d({ type: 'core/resolve', id: card.id, decision })
          const approveAlone = () => d({ type: 'publishing/bulk', ids: [p.id], op: 'approve' })

          // The state band: what this post is waiting for, why, and the one thing that moves it.
          let head: string, body: ReactNode = null, acts: ReactNode = null, shown: ('edit' | 'resched')[] = []
          if (p.status === 'failed') {
            const fail = failureCardOf(s, p.id)
            const retry = (mode: Retry) => {
              const i = RETRY_OPTIONS.findIndex(o => o.mode === mode)
              d(fail ? { type: 'core/resolve', id: fail.id, decision: { kind: 'option', index: i, option: RETRY_OPTIONS[i].label } } : { type: 'publishing/retry', id: p.id, mode })
            }
            head = p.failure ? `${net} refused it at ${hhmm(p.failure.at)}` : 'Publishing failed'
            body = <p className="pd-say"><Mark agent="atlas" /><span>{p.failure?.text ?? p.note} {fail?.why}</span></p>
            acts = <>
              <Btn variant="primary" onClick={() => retry('fix')}><RotateCw size={14} />{RETRY_OPTIONS[0].label}</Btn>
              <Btn onClick={() => retry('nolink')}>{RETRY_OPTIONS[1].label}</Btn>
              <Btn variant="ghost" onClick={() => retry('skip')}>{RETRY_OPTIONS[2].label}</Btn>
            </>
          } else if (p.status === 'paused') {
            head = 'Paused by Atlas'
            body = <p className="pd-say"><Mark agent="atlas" /><span>{p.note} It goes out on its own once the alert is over.</span></p>
            acts = <Btn variant="primary" onClick={() => d({ type: 'publishing/resume', ids: [p.id] })}><Play size={14} />Resume this post</Btn>
          } else if (p.status === 'unapproved' || card?.lane === 'claire') {
            const asked = [...(p.comments ?? [])].reverse().find(c => c.from !== 'claire')
            head = 'Waiting on Claire'
            body = <p className="pd-say">{asked ? <Who by={asked.from as By} /> : <Mark agent="claire" />}<span>{asked ? `${asked.text} ` : ''}{card?.claire ? `Asked at ${hhmm(card.claire.askedAt)}. ` : ''}It’s scheduled as soon as she approves.</span></p>
            acts = edit; shown = ['edit']
          } else if (card) {
            const chain: AgentId[] = card.chain?.length ? card.chain : [card.agent]
            const last = card.thread?.at(-1)
            head = card.kind === 'approval' ? 'Atlas needs your approval' : card.title
            body = <>
              <p className="pd-say">
                <span className="pd-chain">{chain.map((a, i) => <Mark key={a + i} agent={a} />)}</span>
                <span><b>{chain.map(agentName).join(' → ')}:</b> {card.context} {card.why}{card.kind === 'approval' && p.at > now && <> It goes out <b>{longWhen(p.at)}</b> once you approve.</>}</span>
              </p>
              {(!!card.rules?.length || !!card.confidence) && (
                <p className="pd-why">
                  {!!card.rules?.length && <span className="pd-rules"><BookOpen size={14} aria-hidden />Playbook: {card.rules.map(r => `“${r}”`).join(' · ')}</span>}
                  {!!card.confidence && <Confidence v={card.confidence} />}
                </p>
              )}
              {last?.from === 'agent' && card.thread!.some(m => m.from === 'you') && <p className="pd-say" aria-live="polite"><Mark agent={card.agent} /><span><b>{agentName(card.agent)}:</b> {last.text}</span></p>}
            </>
            if (card.field) {
              acts = (
                <form className="pd-answer" onSubmit={e => { e.preventDefault(); if (answer.trim()) { resolve({ kind: 'answer', text: answer.trim() }); setAnswer('') } }}>
                  <label htmlFor="pd-answer">{card.field.label}</label>
                  <input id="pd-answer" className="input" value={answer} onChange={e => setAnswer(e.target.value)} placeholder={card.field.placeholder} />
                  <Btn type="submit" variant="primary" disabled={!answer.trim()}><Check size={14} />Add and schedule</Btn>
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
                {edit}
              </>
              shown = ['edit']
            }
          } else if (p.status === 'needs') {
            head = 'Needs you'
            body = p.note && <p className="pd-say"><Mark agent="atlas" /><span>{p.note}</span></p>
            acts = p.waiting === 'visual'
              ? <Link className="btn primary" to="/publishing/media"><ImageUp size={14} />Upload it in Media</Link>
              : <><Btn variant="primary" onClick={approveAlone}><Check size={14} />Approve and schedule</Btn>{edit}</>
            shown = ['edit']
          } else if (p.status === 'draft') {
            head = 'Draft: not scheduled'
            body = <p className="pd-say"><span>{p.note ? `${p.note} ` : ''}{p.at > now ? <>Scheduling puts it out <b>{longWhen(p.at)}</b>.</> : 'Its slot has passed: pick a new time.'}</span></p>
            acts = p.at > now ? <><Btn variant="primary" onClick={approveAlone}><CalendarCheck size={14} />Schedule it</Btn>{edit}</> : <>{resched}{edit}</>
            shown = p.at > now ? ['edit'] : ['edit', 'resched']
          } else if (p.status === 'scheduled') {
            head = `Goes out ${longWhen(p.at)}`
            body = <p className="pd-say"><span>{p.approval?.state === 'approved' ? 'Claire approved it. ' : ''}{p.note ? `${p.note} ` : ''}It publishes on its own: nothing to do.</span></p>
            acts = <>{resched}{edit}</>
            shown = ['edit', 'resched']
          } else {
            head = `Published ${longWhen(p.at)}`
            const idea = perf?.worth && s.publishing.ideas.find(i => i.key === `recycle-${p.id}`)
            body = perf ? <>
              <dl className="pd-metrics">
                <div><dt>Reach</dt><dd><b className="num">{perf.reach.toLocaleString('en-GB')}</b> <span className="muted">{perf.ratio}× your {net} median ({Math.round(perf.medianReach).toLocaleString('en-GB')})</span></dd></div>
                <div><dt>Engagement rate</dt><dd><b className="num">{perf.er}%</b> <span className="muted">{perf.er >= perf.medianEr ? 'above' : 'below'} the median ({perf.medianEr}%)</span></dd></div>
              </dl>
              <p className="pd-say"><Mark agent="atlas" /><span><b>Atlas:</b> {perf.reading}</span></p>
            </> : p.stats
              ? <p className="pd-say"><span><b className="num">{p.stats.reach.toLocaleString('en-GB')}</b> reach · <b className="num">{p.stats.er}%</b> engagement rate</span></p>
              : <p className="pd-say"><span>No results yet.</span></p>
            acts = <>
              {perf?.worth && (idea ? <Link className="btn" to={`/publishing/ideas/${idea.id}`}>In Ideas: review it</Link> : <Btn variant="primary" onClick={() => d({ type: 'publishing/recycle', id: p.id })}><Recycle size={14} />Recycle it</Btn>)}
              {(p.stats || perf) && <Link className="btn ghost" to="/insights">See in Insights</Link>}
            </>
          }

          // A decision taken on this post's Desk card (here or on the Desk) can be undone from here while its window lasts.
          const undo = s.log.find(l => l.status !== 'undone' && (l.undoUntil ?? 0) > now && l.restore?.some(h => h.ref === p.id || h.id === p.handoff || h.id === p.approval?.card))

          const more: MenuItem[] = [
            ...(p.status !== 'published' && !shown.includes('edit') ? [{ label: 'Edit', icon: <Pencil size={14} />, onSelect: () => nav(`/publishing/post/${p.id}`) }] : []),
            ...(p.status !== 'published' && !shown.includes('resched') ? [{ label: 'Reschedule', icon: <CalendarClock size={14} />, onSelect: () => setDialog({ kind: 'reschedule', ids: [p.id] }) }] : []),
            { label: 'Duplicate', icon: <Copy size={14} />, onSelect: () => setDialog({ kind: 'duplicate', ids: [p.id] }) },
            'sep',
            { label: 'Delete', icon: <Trash2 size={14} />, onSelect: () => setDialog({ kind: 'delete', ids: [p.id] }) },
          ]

          // Activity: the Desk card, its thread, the post's history and comments, oldest first.
          const commentAt = new Set((p.comments ?? []).map(c => c.at))
          const lines: { at: number; by?: By; text: string; named?: boolean }[] = [
            ...(card?.at && card.lane !== 'claire' ? [{ at: card.at, by: card.agent, named: true, text: card.kind === 'approval' ? 'Asked for your approval on the Desk' : 'Asked you on the Desk' }] : []),
            ...(card?.thread ?? []).filter(m => !(m.from === 'agent' && m.text === card!.why)).map(m => ({ at: m.at, by: (m.from === 'agent' ? card!.agent : m.from) as By, named: true, text: m.from === 'you' ? `Asked “${m.text}”` : m.text })),
            ...(p.history ?? []).filter(h => !commentAt.has(h.at)).map(h => ({ at: h.at, by: actorOf(h.text), text: h.text })),
            ...(p.comments ?? []).map(c => ({ at: c.at, by: c.from as By, named: true, text: c.text })),
            ...(p.status === 'published' ? [{ at: p.at, text: `Published on ${net}` }] : []),
          ].sort((a, b) => a.at - b.at)
          const flags = pending?.text.filter((x): x is Exclude<Flagged, string> => typeof x !== 'string') ?? []

          return (
            <div className="pd">
              <section className="pd-state" aria-labelledby="pd-state-h">
                <div className="pd-state-h">
                  <Pill tone={TONE[p.status]}>{STATUS_LABEL[p.status]}</Pill>
                  <h3 id="pd-state-h">{head}</h3>
                </div>
                {body}
                {undo && <UndoBar until={undo.undoUntil} onUndo={() => d({ type: 'core/undo', id: undo.id })}>{undo.text}</UndoBar>}
                <div className="pd-acts">
                  {acts}
                  <Menu align="end" trigger={<Btn variant="ghost">More<ChevronDown size={14} /></Btn>} items={more} />
                </div>
              </section>

              <div className="pd-grid">
                <div className="pd-post">
                  <NetworkPreview network={p.network} who={accountOf(p)} aspect={clipAspect(s, p)} text={pending ? flat(pending.text) : captionOf(p)} media={pending?.media ?? p.media} words={[]} stats={p.stats} status={p.status} at={p.at} format={p.format} firstComment={commentOf(p)} />
                  {pending && flat(pending.text) !== p.text && <p className="pd-note">You see the version on the Desk card: approving schedules this text.</p>}
                  {flags.map(f => <p key={f.text} className="pd-note"><TriangleAlert size={14} aria-hidden /><span>Atlas isn’t sure about “{f.text}”: {f.note}</span></p>)}
                </div>

                <div className="pd-side">
                  <section aria-labelledby="pd-facts-h">
                    <h3 id="pd-facts-h" className="section-title">Details</h3>
                    <ul className="pd-facts">
                      <li><CalendarClock size={16} aria-hidden /><span>{longWhen(p.at)}</span></li>
                      <li><Net n={p.network} size={16} /><span>{accountOf(p).name} <span className="muted">{accountOf(p).handle}</span> · {net}{p.format ? ` · ${FORMAT_LABEL[p.format]}` : ''}</span></li>
                      <li><Who by={p.author === 'atlas' ? 'atlas' : 'you'} /><span>Written by {p.author === 'atlas' ? 'Atlas' : 'you'}</span></li>
                      <li><Target size={16} aria-hidden /><span>{p.pillar} pillar</span></li>
                      {queue && <li><ListOrdered size={16} aria-hidden /><Link to="/publishing/queues">{queue.name} queue</Link></li>}
                      {p.campaign && <li><Megaphone size={16} aria-hidden />{p.campaignId ? <Link to={`/strategy/campaigns/${p.campaignId}`}>{p.campaign} campaign</Link> : <span>{p.campaign} campaign</span>}</li>}
                      {p.link && <li><Link2 size={16} aria-hidden /><span className="pd-link"><span className="mono">{shownLink(p.link)}</span>{p.link.utm && <span className="muted t-xs"> → {p.link.url}?{query(p.link)}</span>}</span></li>}
                      <li><Tag size={16} aria-hidden /><span><span className="sr-only">Labels: </span><LabelsEdit p={p} /></span></li>
                    </ul>
                  </section>
                  <section aria-labelledby="pd-act-h">
                    <h3 id="pd-act-h" className="section-title">Activity</h3>
                    {lines.length ? (
                      <ol className="pd-activity">
                        {lines.map((l, i) => (
                          <li key={i}><Who by={l.by} /><span>{l.named && l.by && <b>{NAME(l.by)} </b>}{l.text}</span><time className="mono">{stamp(l.at)}</time></li>
                        ))}
                      </ol>
                    ) : <p className="muted">No activity recorded on this post yet.</p>}
                  </section>
                </div>
              </div>
            </div>
          )
        })()}
      </Sheet>
      <Dialogs dialog={dialog} onClose={() => setDialog(null)} onDone={() => dialog?.kind === 'delete' && close()} />
    </>
  )
}
