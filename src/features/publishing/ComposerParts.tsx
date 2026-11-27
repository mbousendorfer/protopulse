// The composer's building blocks: profile picker, caption toolbar, visuals, per-network options, post comments.
import { useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { AtSign, ChevronDown, ChevronLeft, ChevronRight, Hash, ImagePlus, Plus, Smile, Upload, X } from 'lucide-react'
import type { Network } from '../../app/types'
import type { Media, Pillar, Post } from '../../data/publishing'
import { NETWORK_LABEL } from '../../data/agents'
import { ROSTER } from '../../data/inbox'
import { hhmm } from '../../app/time'
import { Btn, Menu, Net, Pop, Seg, Switch } from '../../ui'
import Photo from '../../ui/Photo'
import { ACCOUNTS, GROUPS, accountById, accountLabel } from './accounts'
import { EMOJIS, MENTIONS, fieldsFor, hashtagsFor, insertAt, plainOn, splitThread, type Asset, type Options } from './composerModel'
import type { Format } from './formats'

const short = (id: string) => { const a = accountById(id); return a.main ? NETWORK_LABEL[a.network] : a.name.replace(/^Fernway\s+/, '') }

/* ---------- Profiles ---------- */

/** Selected profiles as chips (the first four, then "+N"), the full list with search and groups in a popover. */
export function ProfilePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const shown = value.slice(0, 4)
  const list = ACCOUNTS.filter(a => `${accountLabel(a)} ${a.handle}`.toLowerCase().includes(q.trim().toLowerCase()))
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  return (
    <div className="row tight" role="group" aria-label="Profiles">
      {shown.map(id => (
        <span key={id} className="cmp-acc on" title={accountLabel(accountById(id))}>
          <Net n={accountById(id).network} />{short(id)}
          <button type="button" className="cmp-acc-x" aria-label={`Remove ${accountLabel(accountById(id))}`} onClick={() => toggle(id)}><X size={12} /></button>
        </span>
      ))}
      <Pop align="start" open={open} onOpenChange={setOpen} trigger={
        <button type="button" className="cmp-acc" aria-label="Choose profiles">
          {value.length > 4 ? `+${value.length - 4}` : <><Plus size={14} />{value.length ? 'Add' : 'Choose profiles'}</>}
        </button>}>
        <div className="cmp-pick">
          <input className="input" placeholder="Search profiles" aria-label="Search profiles" value={q} onChange={e => setQ(e.target.value)} autoFocus />
          {!q && (
            <div className="cmp-pick-groups">
              <span className="label">Profile groups</span>
              {GROUPS.map(g => (
                <button key={g.id} type="button" className="cmp-pick-row" onClick={() => { onChange(g.accounts); setOpen(false) }}>
                  <span>{g.name}</span><span className="t-xs muted">{g.accounts.length} profiles</span>
                </button>
              ))}
            </div>
          )}
          <span className="label">Profiles</span>
          {list.map(a => (
            <label key={a.id} className="cmp-pick-row">
              <input type="checkbox" className="check" checked={value.includes(a.id)} onChange={() => toggle(a.id)} />
              <Net n={a.network} /><span>{accountLabel(a)}</span><span className="t-xs muted">{a.handle}</span>
            </label>
          ))}
          {!list.length && <p className="t-sm muted">No profile matches “{q}”.</p>}
        </div>
      </Pop>
    </div>
  )
}

/* ---------- Caption toolbar ---------- */

/** Emoji, hashtags and mentions, inserted at the caret of the caption on screen. */
export function CaptionTools({ field, value, onInsert, pillar, networks, campaignTag, count }: {
  field: RefObject<HTMLTextAreaElement | null>; value: string; onInsert: (v: string) => void; pillar: Pillar; networks: Network[]; campaignTag?: string; count: { n: number; limit: number; on: string; thread?: number }
}) {
  const [who, setWho] = useState('')
  const put = (add: string) => {
    const el = field.current
    const { value: next, caret } = insertAt(value, el?.selectionStart ?? value.length, el?.selectionEnd ?? value.length, add)
    onInsert(next)
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(caret, caret) })
  }
  const tags = [...new Set([...(campaignTag ? [campaignTag] : []), ...hashtagsFor(pillar)])]
  const people = MENTIONS.filter(m => `${m.name} ${m.handle}`.toLowerCase().includes(who.trim().toLowerCase()))
  const over = !count.thread && count.n > count.limit
  return (
    <div className="cmp-tools">
      <Pop align="start" trigger={<Btn size="sm" variant="ghost" icon aria-label="Emoji" title="Emoji"><Smile size={16} /></Btn>}>
        <div className="cmp-emoji" role="group" aria-label="Emoji">
          {EMOJIS.map(e => <button key={e} type="button" onClick={() => put(e)} aria-label={`Insert ${e}`}>{e}</button>)}
        </div>
      </Pop>
      <Pop align="start" trigger={<Btn size="sm" variant="ghost" icon aria-label="Hashtags" title="Hashtags"><Hash size={16} /></Btn>}>
        <div className="cmp-pick">
          <span className="label">Saved for {pillar}{campaignTag ? ', plus the campaign’s' : ''}</span>
          {tags.map(t => <button key={t} type="button" className="cmp-pick-row" onClick={() => put(t)}><span>{t}</span></button>)}
          <button type="button" className="cmp-pick-row" onClick={() => put(tags.slice(0, 3).join(' '))}><span>Insert the first three</span></button>
          <p className="t-xs muted">Playbook: three at most on Instagram, none on LinkedIn.</p>
        </div>
      </Pop>
      <Pop align="start" trigger={<Btn size="sm" variant="ghost" icon aria-label="Mention someone" title="Mention someone"><AtSign size={16} /></Btn>}>
        <div className="cmp-pick">
          <input className="input" placeholder="Search people" aria-label="Search people" value={who} onChange={e => setWho(e.target.value)} autoFocus />
          {people.slice(0, 8).map(m => {
            const plain = plainOn(m.handle, networks)
            return (
              <button key={`${m.handle}-${m.network}`} type="button" className="cmp-pick-row" onClick={() => put(m.handle)}>
                <Net n={m.network} size={14} /><span>{m.name}</span><span className="t-xs muted">{m.handle}</span>
                {plain.length > 0 && <span className="t-xs muted">· plain text on {plain.map(n => NETWORK_LABEL[n]).join(', ')}</span>}
              </button>
            )
          })}
          {!people.length && <p className="t-sm muted">Nobody matches “{who}”.</p>}
        </div>
      </Pop>
      <span className="spacer" />
      <span className={`t-sm ${over ? 'cmp-over' : 'muted'}`} aria-live="polite">{count.thread ? `${count.on}: a thread of ${count.thread} posts` : `${count.n.toLocaleString('en-GB')} of ${count.limit.toLocaleString('en-GB')} characters on ${count.on}`}</span>
    </div>
  )
}

/* ---------- Visuals ---------- */

/** Up to `max` visuals: reorder by drag or arrow keys, alt text each, add from the library or an upload. */
export function Visuals({ value, onChange, library, onUpload, max }: { value: Asset[]; onChange: (v: Asset[]) => void; library: Media[]; onUpload: () => void; max: number }) {
  const [picking, setPicking] = useState(false)
  const drag = useRef<number | null>(null)
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return
    const next = [...value]; const [x] = next.splice(from, 1); next.splice(to, 0, x); onChange(next)
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-asset="${to}"]`)?.focus())
  }
  const onKey = (i: number) => (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); move(i, i - 1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); move(i, i + 1) }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onChange(value.filter((_, j) => j !== i)) }
  }
  const has = (name: string) => value.some(a => a.src === name)
  return (
    <ul className="cmp-assets" aria-label={`Visuals, ${value.length} of ${max}. Arrow keys reorder.`}>
      {value.map((a, i) => (
        <li key={a.src} className="cmp-asset" draggable onDragStart={() => { drag.current = i }} onDragOver={e => e.preventDefault()} onDrop={() => { if (drag.current !== null) move(drag.current, i); drag.current = null }}>
          <button type="button" className="cmp-thumb" data-asset={i} onKeyDown={onKey(i)} aria-label={`Visual ${i + 1} of ${value.length}${a.alt ? `: ${a.alt}` : ', no alt text'}`}><Photo name={a.src} /></button>
          <div className="cmp-asset-bar">
            <Btn size="xs" variant="ghost" icon aria-label="Move left" disabled={i === 0} onClick={() => move(i, i - 1)}><ChevronLeft size={12} /></Btn>
            <Pop align="start" trigger={<Btn size="xs" variant="ghost" className={a.alt ? '' : 'cmp-noalt'}>Alt</Btn>}>
              <div className="field cmp-alt">
                <label htmlFor={`alt-${i}`}>Alt text, read aloud by screen readers</label>
                <textarea id={`alt-${i}`} className="textarea" rows={3} value={a.alt ?? ''} placeholder="The Ridge 28L on a rock above Lac Blanc, packed for 3 days." onChange={e => onChange(value.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
              </div>
            </Pop>
            <Btn size="xs" variant="ghost" icon aria-label="Move right" disabled={i === value.length - 1} onClick={() => move(i, i + 1)}><ChevronRight size={12} /></Btn>
            <Btn size="xs" variant="ghost" icon aria-label={`Remove visual ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><X size={12} /></Btn>
          </div>
        </li>
      ))}
      {value.length < max && (
        <li>
          <Pop align="start" open={picking} onOpenChange={setPicking} trigger={<button type="button" className="cmp-thumb empty" aria-label={value.length ? 'Add a visual' : 'Add visuals'}><ImagePlus size={18} /><span className="t-xs">{value.length ? 'Add' : 'Add visuals'}</span></button>}>
            <div className="cmp-picker" role="listbox" aria-multiselectable aria-label="Media library">
              {library.map(m => (
                <button key={m.id} type="button" role="option" aria-selected={has(m.name)} className={has(m.name) ? 'on' : ''} title={m.title} aria-label={m.title}
                  onClick={() => onChange(has(m.name) ? value.filter(a => a.src !== m.name) : value.length < max ? [...value, { src: m.name, alt: m.title }] : value)}>
                  <Photo name={m.name} />
                </button>
              ))}
            </div>
            <div className="row between cmp-picker-foot">
              <span className="muted t-sm">{value.length} of {max} picked. Atlas never uses stock photos.</span>
              <span className="row tight"><Btn size="sm" variant="ghost" onClick={onUpload}><Upload size={14} />Upload</Btn><Btn size="sm" onClick={() => setPicking(false)}>Done</Btn></span>
            </div>
          </Pop>
        </li>
      )}
    </ul>
  )
}

/* ---------- Per-network options ---------- */

/** What the network asks beyond the caption, folded under "More X options". */
export function NetworkOptions({ network, label, format, value, onChange, open, onToggle, missing }: {
  network: Network; label: string; format: Format; value: Options; onChange: (o: Options) => void; open: boolean; onToggle: (o: boolean) => void; missing: string[]
}) {
  const fields = fieldsFor(network, format)
  if (!fields.length) return null
  const set = (k: string, v: string | boolean) => onChange({ ...value, [k]: v })
  return (
    <details className="cmp-more" id="cmp-options" open={open} onToggle={e => onToggle((e.target as HTMLDetailsElement).open)}>
      <summary><ChevronRight size={14} aria-hidden />More {label} options{missing.length > 0 && <span className="cmp-over">· {missing.join(', ')} needed</span>}</summary>
      <div className="cmp-opts">
        {fields.map(f => {
          const id = `opt-${network}-${f.key}`
          if (f.kind === 'switch') return <Switch key={f.key} checked={!!value[f.key]} label={f.label} onChange={v => set(f.key, v)} />
          if (f.kind === 'choice' && f.choices!.length <= 3) return (
            <div key={f.key} className="field"><span className="label">{f.label}</span>
              <Seg name={id} label={f.label} size="sm" value={String(value[f.key] ?? f.choices![0])} onChange={v => set(f.key, v)} options={f.choices!.map(c => ({ value: c, label: c }))} /></div>
          )
          if (f.kind === 'choice') return (
            <div key={f.key} className="field"><span className="label">{f.label}</span>
              <Menu align="start" trigger={<button type="button" className="select-btn" aria-label={`${f.label}: ${value[f.key] ?? f.choices![0]}`}><span>{String(value[f.key] ?? f.choices![0])}</span><ChevronDown size={14} /></button>}
                items={f.choices!.map(c => ({ label: c, onSelect: () => set(f.key, c) }))} /></div>
          )
          const v = String(value[f.key] ?? '')
          return (
            <div key={f.key} className="field">
              <label htmlFor={id}>{f.label}{f.required ? <span className="muted"> · required</span> : <span className="muted"> · optional</span>}</label>
              <input id={id} className="input" value={v} maxLength={f.max} aria-invalid={f.required && !v.trim() ? true : undefined} onChange={e => set(f.key, e.target.value)} />
              {(f.hint || f.max) && <span className="t-xs muted">{f.hint ?? `${v.length} of ${f.max} characters`}</span>}
            </div>
          )
        })}
      </div>
    </details>
  )
}

/** X: split the caption into a thread, each post editable and counted. */
export function Thread({ text, value, onChange }: { text: string; value?: string[]; onChange: (v: string[] | undefined) => void }) {
  return (
    <div className="cmp-thread">
      <Switch checked={!!value} label={text.length > 280 ? `Split into a thread (${splitThread(text).length} posts)` : 'Split into a thread'} onChange={on => onChange(on ? splitThread(text) : undefined)} />
      {value?.map((p, i) => (
        <div key={i} className="field">
          <label htmlFor={`th-${i}`}>Post {i + 1} of {value.length} <span className={p.length > 280 ? 'cmp-over' : 'muted'}>· {p.length} of 280 characters</span></label>
          <textarea id={`th-${i}`} className="textarea" rows={3} value={p} onChange={e => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
        </div>
      ))}
    </div>
  )
}

/* ---------- Comments and history on a saved post ---------- */

const FROM = { atlas: 'Atlas', claire: ROSTER.claire.name, you: 'You' } as const
const stamp = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${hhmm(t)}`

export function PostComments({ post, onAdd }: { post: Post; onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  const send = () => { if (text.trim()) { onAdd(text.trim()); setText('') } }
  return (
    <div className="cmp-talk">
      {post.comments?.length
        ? <ul>{post.comments.map((c, i) => <li key={i}><p className="row tight t-sm"><b>{FROM[c.from]}</b><span className="muted">{stamp(c.at)}</span></p><p>{c.text}</p></li>)}</ul>
        : <p className="muted t-sm">No comments yet. Comments stay inside the team, never on the network.</p>}
      <div className="field">
        <label htmlFor="cmp-comment">Comment <span className="muted">· @Claire to ask her</span></label>
        <textarea id="cmp-comment" className="textarea" rows={2} value={text} placeholder="Enter sends, Shift+Enter for a new line" onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <Btn size="sm" disabled={!text.trim()} onClick={send}>Comment</Btn>
      </div>
    </div>
  )
}

export function PostHistory({ post }: { post: Post }) {
  return post.history?.length
    ? <ul className="cmp-talk">{[...post.history].reverse().map((h, i) => <li key={i}><p className="muted t-sm">{stamp(h.at)}</p><p>{h.text}</p></li>)}</ul>
    : <p className="muted t-sm">Nothing happened to this post yet.</p>
}
