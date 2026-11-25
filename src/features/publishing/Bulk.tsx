import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarClock, Check, Copy, PauseCircle, Pencil, RotateCw, Trash2, UserRound } from 'lucide-react'
import type { Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { DAY, hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { PUBLISH_NETWORKS, type Post } from '../../data/publishing'
import { Btn, Mark, Modal, Net, Pill, Seg, Sheet } from '../../ui'
import { BulkBar, type Selection } from '../../ui/Selection'
import { Notice, UndoBar } from '../../ui/Feedback'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { NetworkPreview } from './Previews'
import type { BulkOp } from './slice'
import { RETRY_OPTIONS, failureCardOf, type Retry } from './failures'

const when = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · ${hhmm(t)}`

/** Open a post's preview: kept in the URL (?post=id) so it works from any tab. */
export function useOpenPost() {
  const nav = useNavigate()
  const loc = useLocation()
  return (id: string) => nav(`${loc.pathname}?post=${id}`)
}

type Dialog = { kind: 'reschedule' | 'duplicate' | 'delete'; ids: string[] } | null

/** Reschedule, duplicate and delete dialogs, shared by the bulk bar and the preview panel. */
function Dialogs({ dialog, onClose, onDone }: { dialog: Dialog; onClose: () => void; onDone?: () => void }) {
  const { s, d } = useStore()
  const [mode, setMode] = useState<'shift' | 'date'>('shift')
  const [days, setDays] = useState(1)
  const [dt, setDt] = useState('')
  const now = useNow()
  const [net, setNet] = useState<Network>('instagram')
  const posts = s.publishing.posts.filter(p => dialog?.ids.includes(p.id))
  useEffect(() => { if (dialog && posts[0]) { const x = new Date(posts[0].at + DAY); setDt(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}T${hhmm(posts[0].at)}`); setNet(posts[0].network === 'instagram' ? 'tiktok' : 'instagram') } }, [dialog?.ids.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!dialog) return null
  const n = dialog.ids.length
  const run = (op: BulkOp, extra: { shiftDays?: number; at?: number; network?: Network } = {}) => { d({ type: 'publishing/bulk', ids: dialog.ids, op, ...extra }); onClose(); onDone?.() }
  const noun = `${n} post${n > 1 ? 's' : ''}`

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

/** Read-only preview of a post, with what happened to it and what you can do next. */
export function PostPreview() {
  const { s, d } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const id = new URLSearchParams(loc.search).get('post')
  const p = s.publishing.posts.find(x => x.id === id)
  const [dialog, setDialog] = useState<Dialog>(null)
  const close = () => nav(loc.pathname)
  return (
    <>
      <Sheet wide open={!!id} onOpenChange={o => !o && close()} title={p ? `${NETWORK_LABEL[p.network]} · ${when(p.at)}` : 'Post not found'}
        footer={p && <>
          <Btn variant="ghost" onClick={() => setDialog({ kind: 'delete', ids: [p.id] })}><Trash2 size={14} />Delete</Btn>
          <span className="spacer" />
          {p.status !== 'published' && <Btn onClick={() => setDialog({ kind: 'reschedule', ids: [p.id] })}><CalendarClock size={14} />Reschedule</Btn>}
          <Btn onClick={() => setDialog({ kind: 'duplicate', ids: [p.id] })}><Copy size={14} />Duplicate</Btn>
          {p.status !== 'published' && <Btn variant="primary" onClick={() => nav(`/publishing/post/${p.id}`)}><Pencil size={14} />Edit</Btn>}
        </>}>
        {p?.failure && p.status === 'failed' && (() => {
          // The Desk card and this panel are one decision: settle the card when there is one.
          const card = failureCardOf(s, p.id)
          const retry = (mode: Retry) => {
            const i = RETRY_OPTIONS.findIndex(o => o.mode === mode)
            d(card ? { type: 'core/resolve', id: card.id, decision: { kind: 'option', index: i, option: RETRY_OPTIONS[i].label } } : { type: 'publishing/retry', id: p.id, mode })
          }
          return (
            <section className="pub-fail card pad" aria-label="Publishing failed">
              <AlertTriangle size={18} aria-hidden />
              <div className="grow">
                <b>Failed at {hhmm(p.failure.at)}</b>
                <p className="muted">{p.failure.text} Atlas can retry with the plain link.</p>
              </div>
              <Btn variant="primary" onClick={() => retry('fix')}><RotateCw size={14} />Retry now</Btn>
              <Btn onClick={() => retry('nolink')}>Publish without the link</Btn>
              <Btn variant="ghost" onClick={() => retry('skip')}>Skip X today</Btn>
            </section>
          )
        })()}
        {p?.status === 'paused' && (
          <section className="pub-fail pub-paused card pad" aria-label="Paused">
            <PauseCircle size={18} aria-hidden />
            <div className="grow"><b>Paused by Atlas</b><p className="muted">{p.note} It goes out on its own once the alert is over.</p></div>
            <Btn onClick={() => d({ type: 'publishing/resume', ids: [p.id] })}>Resume this post</Btn>
          </section>
        )}
        {!p ? <p className="muted">This post no longer exists.</p> : (
          <div className="pub-prev">
            <div className="pub-prev-net"><NetworkPreview network={p.network} text={p.text} media={p.media} words={[]} stats={p.stats} status={p.status} at={p.at} /></div>
            <dl className="pub-prev-meta">
              <div><dt>Status</dt><dd><Pill tone={p.status === 'published' ? 'ok' : p.status === 'needs' || p.status === 'paused' ? 'caution' : p.status === 'failed' ? 'alert' : undefined}>{p.status === 'needs' ? 'Needs you' : p.status === 'unapproved' ? 'To approve' : p.status[0].toUpperCase() + p.status.slice(1)}</Pill></dd></div>
              <div><dt>Author</dt><dd className="row tight">{p.author === 'atlas' ? <><Mark agent="atlas" />Atlas</> : <><SocialAvatar name="Sam Rivera" size={24} />You</>}</dd></div>
              <div><dt>Pillar</dt><dd>{p.pillar}</dd></div>
              {p.campaign && <div><dt>Campaign</dt><dd>{p.campaign}</dd></div>}
              {p.stats && <div><dt>Results</dt><dd className="num">{p.stats.reach.toLocaleString('en-GB')} reach · {p.stats.er}% engagement</dd></div>}
              {p.note && <div><dt>Note</dt><dd>{p.note}</dd></div>}
            </dl>
            <section>
              <h3 className="pub-prev-h">History</h3>
              <ol className="pub-hist">
                <li><span className="faint">Created by {p.author === 'atlas' ? 'Atlas' : 'you'}</span></li>
                {(p.history ?? []).map((h, i) => <li key={i}><span>{h.text}</span><span className="mono faint">{new Date(h.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {hhmm(h.at)}</span></li>)}
                {p.status === 'published' && <li><span>Published</span><span className="mono faint">{when(p.at)}</span></li>}
              </ol>
            </section>
            {!!p.comments?.length && (
              <section>
                <h3 className="pub-prev-h">Comments</h3>
                <ol className="pub-hist pub-comments">
                  {p.comments.map((c, i) => (
                    <li key={i}>
                      <span className="row tight">{c.from === 'atlas' ? <Mark agent="atlas" /> : <SocialAvatar name={c.from === 'claire' ? 'Claire Dubois' : 'Sam Rivera'} size={16} />}<span><b>{c.from === 'atlas' ? 'Atlas' : c.from === 'claire' ? 'Claire' : 'You'}</b> {c.text}</span></span>
                      <span className="mono faint">{hhmm(c.at)}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}
      </Sheet>
      <Dialogs dialog={dialog} onClose={() => setDialog(null)} onDone={() => dialog?.kind === 'delete' && close()} />
    </>
  )
}
