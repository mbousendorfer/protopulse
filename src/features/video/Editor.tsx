// The full-page clip editor: transcript on the left, the frame in the middle, the inspector on the right, the timeline below.
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Download, Lock, Pause, Play, Redo2, Scissors, Sparkles, Undo2, Wand2 } from 'lucide-react'
import type { Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { hhmm } from '../../app/time'
import { actionOf, uid } from '../../app/core'
import { NETWORK_LABEL } from '../../data/agents'
import { BROLL, MUSIC, PEOPLE, TRANSCRIPT, speakerName, type Source } from '../../data/video'
import { campaignFor, canTrial, holdReason, noRelease, unreleased } from './slice'
import { BANNED } from '../../data/playbook'
import { Btn, Empty, Mark, Net, Pill, Seg, Switch, Tabs, Thinking } from '../../ui'
import { Notice } from '../../ui/Feedback'
import { checkPost } from '../publishing/checks'
import { diffWords, type DiffPart } from '../publishing/ideasModel'
import {
  LANG_LABEL, LANGS, NETWORK_FIT, NET_SPEC, SCORE_LABEL, buildVersions, versionFor, versionIssues, versionOf, applyAsk, captionLines, captionSlips, coverFrames, coverText, shortsTitle, clipPosts, clipText, extend, fillers, fitsLength, keptWords, lengthSpec, removeFillers, rescore, silenceSaved, slipLabel,
  silences, toSRT, wordText, hasNumber, numberWins, trialPair, winnerOf, type Captions, type Clip, type Frame as FrameMode, type Lang, type ScoreKey,
} from './model'
import { Frame, usePlayback, type Playback } from './Player'
import Timeline from './Timeline'
import { TemplatePicker, SwatchPicker } from './BrandKit'
import { CoverFrame, ScoreBadge, fmt, focusAt, useClip } from './parts'
import { ClipNotNow } from './Page'

const STATUS: Record<Clip['status'], string> = { ready: 'Ready to review', sent: 'Sent to Atlas', published: 'Published', snoozed: 'Back tomorrow 08:00', dismissed: 'Dismissed', trial: 'On trial on Reels' }
const CLIP_NETWORKS: Network[] = ['tiktok', 'instagram', 'youtube', 'linkedin', 'facebook']
const typing = (e: KeyboardEvent) => !!(e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"]'))

export default function Editor({ id }: { id: string }) {
  const found = useClip(id)
  const nav = useNavigate()
  if (!found) return <div className="page"><Empty title="This clip is gone" body="It may have been cleared by a reset." action={<Btn onClick={() => nav('/video')}>Back to clips</Btn>} /></div>
  return <EditorBody clip={found.clip} source={found.source} />
}

function EditorBody({ clip, source }: { clip: Clip; source: Source }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const pb = usePlayback(clip, source)
  const [sel, setSel] = useState<[number, number] | null>(null)
  const [pane, setPane] = useState<'transcript' | 'edit'>('edit')
  const [safe, setSafe] = useState(false)
  const edit = (patch: Partial<Clip>) => d({ type: 'video/edit', id: clip.id, patch })
  const score = rescore(clip, pb.tr)
  const canUndo = s.video.editor.clip === clip.id && s.video.editor.past.length > 0
  const canRedo = s.video.editor.clip === clip.id && s.video.editor.future.length > 0
  const open = clip.status === 'ready' || clip.status === 'snoozed'
  // Which version the frame shows: the clip as framed, or one network's version.
  const [pick, setView] = useState<'all' | Network>('all')
  const view = pick !== 'all' && clip.post.networks.includes(pick) ? pick : 'all'
  const version = view === 'all' ? undefined : versionOf(clip, view)
  const shown = version ? { ...clip, aspect: version.aspect, captions: { ...clip.captions, y: version.y } } : clip
  const setAspect = (aspect: Clip['aspect']) => (view === 'all' ? edit({ aspect }) : edit({ versions: { ...clip.versions, [view]: { ...versionOf(clip, view), aspect } } }))

  useEffect(() => { d({ type: 'video/open', id: clip.id }) }, [clip.id, d])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e)) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); d({ type: e.shiftKey ? 'video/redo' : 'video/undo' }); return }
      if (mod || e.altKey) return
      if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); pb.toggle() }
      if ((e.key === 'Backspace' || e.key === 'Delete') && sel) { e.preventDefault(); cutSelection() }
      if (e.key === 'Escape') setSel(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const selected = sel ? pb.tr.words.filter(w => w.i >= Math.min(...sel) && w.i <= Math.max(...sel)).map(w => w.i) : []
  const cutSelection = () => {
    if (!selected.length) return
    const all = selected.every(i => clip.cut.includes(i))
    edit({ cut: all ? clip.cut.filter(i => !selected.includes(i)) : [...new Set([...clip.cut, ...selected])].sort((a, b) => a - b) })
  }

  return (
    <div className={`editor pane-${pane}`}>
      <header className="ed-head">
        <Link to={`/video${clip.source ? `?source=${clip.source}` : ''}`} className="btn ghost sm icon" aria-label="Back to clips"><ArrowLeft size={16} /></Link>
        <Mark agent="juno" />
        <div className="ed-title">
          <input className="ed-title-input" defaultValue={clip.title} aria-label="Clip title" onBlur={e => { const v = e.target.value.trim(); if (v && v !== clip.title) edit({ title: v }) }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
          <span className="muted t-sm ellipsis">From <Link to={`/video/sources/${source.id}`}>{source.title}</Link></span>
        </div>
        <Pill tone={clip.status === 'sent' || clip.status === 'published' ? 'ok' : undefined}>{STATUS[clip.status]}</Pill>
        <ScoreBadge value={score.total} />
        <span className="spacer" />
        <span className="row tight nowrap">
          <Btn variant="ghost" icon size="sm" disabled={!canUndo} onClick={() => d({ type: 'video/undo' })} aria-label="Undo" kbd="⌘Z"><Undo2 size={16} /></Btn>
          <Btn variant="ghost" icon size="sm" disabled={!canRedo} onClick={() => d({ type: 'video/redo' })} aria-label="Redo" kbd="⇧⌘Z"><Redo2 size={16} /></Btn>
        </span>
        {(open || clip.status === 'sent') && (
          <span className="ed-acts">
            {open && <ClipNotNow c={clip} />}
            {open ? <Btn variant="primary" onClick={() => d({ type: 'video/send', ids: [clip.id] })}>Send to Atlas</Btn>
              : <Btn onClick={() => nav('/publishing/calendar')}>Open the calendar<ArrowUpRight size={14} /></Btn>}
          </span>
        )}
      </header>
      <Notice scope="video" className="ed-notice" />
      <div className="ed-panes" role="tablist" aria-label="Editor panels">
        <Tabs value={pane} onChange={setPane} items={[{ value: 'transcript', label: 'Transcript' }, { value: 'edit', label: 'Edit' }]} />
      </div>

      <TranscriptPanel clip={clip} pb={pb} sel={sel} setSel={setSel} selected={selected} onCut={cutSelection} edit={edit} />

      <section className="ed-stage" aria-label="Preview">
        {clip.post.networks.length > 1 && (
          <Seg name="version" size="sm" label="Version" value={view} onChange={setView} options={[{ value: 'all', label: 'All' }, ...clip.post.networks.map(n => ({ value: n, label: NETWORK_FIT[n] ?? NETWORK_LABEL[n] }))]} />
        )}
        <div className="ed-frame-wrap"><Frame clip={shown} source={source} pb={pb} safe={safe && view !== 'all' ? NET_SPEC[view] ?? true : safe} outro={s.video.kit.outro} /></div>
        <div className="ed-transport">
          <Btn icon variant="ghost" onClick={pb.toggle} aria-label={pb.playing ? 'Pause' : 'Play'} kbd="Space">{pb.playing ? <Pause size={18} /> : <Play size={18} />}</Btn>
          <span className="mono t-sm">{fmt(pb.t)} / {fmt(pb.total)}</span>
          <span className="spacer" />
          <Seg name="aspect" size="sm" label="Format" value={shown.aspect} onChange={setAspect} options={[{ value: '9:16', label: '9:16' }, { value: '4:5', label: '4:5' }, { value: '1:1', label: '1:1' }, { value: '16:9', label: '16:9' }]} />
          <Switch checked={safe} onChange={setSafe} label="Safe zones" />
        </div>
        {view !== 'all' && <VersionBar clip={clip} n={view} edit={edit} />}
        {pb.elements}
      </section>

      <Inspector clip={clip} pb={pb} edit={edit} score={score} />

      <div className="ed-timeline"><Timeline clip={clip} source={source} pb={pb} onEdit={edit} /></div>
    </div>
  )
}

/* ---------- One network's version ---------- */

function VersionBar({ clip, n, edit }: { clip: Clip; n: Network; edit: (p: Partial<Clip>) => void }) {
  const v = versionOf(clip, n)
  const issues = versionIssues(clip, n)
  const name = NETWORK_FIT[n] ?? NETWORK_LABEL[n]
  const set = (p: Partial<typeof v>) => edit({ versions: { ...clip.versions, [n]: { ...v, ...p } } })
  const juno = versionFor(clip, n)
  return (
    <div className="ed-version" role="group" aria-label={`${name} version`}>
      <Net n={n} size={16} />
      <span>{issues.length ? <>{name}: {issues.join(', ')}.</> : <>{name}: {v.aspect}, captions clear of the app’s buttons.</>}</span>
      <CommitRange label="Caption height" min={8} max={86} value={v.y} onCommit={y => set({ y })} format={x => `${x}% from the top`} />
      {(v.aspect !== juno.aspect || v.y !== juno.y) && <Btn size="xs" variant="ghost" onClick={() => set(juno)}><Mark agent="juno" />Juno’s version</Btn>}
    </div>
  )
}

/* ---------- Transcript ---------- */

function TranscriptPanel({ clip, pb, sel, setSel, selected, onCut, edit }: {
  clip: Clip; pb: Playback; sel: [number, number] | null; setSel: (s: [number, number] | null) => void; selected: number[]; onCut: () => void; edit: (p: Partial<Clip>) => void
}) {
  const { tr } = pb
  const [mode, setMode] = useState<'none' | 'fix' | 'voice'>('none')
  const [text, setText] = useState('')
  const words = tr.words.filter(w => w.s >= clip.start - 0.01 && w.e <= clip.end + 0.01)
  const cut = new Set(clip.cut)
  const fill = fillers(clip, tr)
  const sil = silences(clip, tr)
  const slips = captionSlips(clip, tr)
  const slipIdx = Object.keys(slips).map(Number)
  const silAfter = new Map(sil.map(g => [g.at, g.dur]))
  const before = tr.sentences.filter(x => x.e <= clip.start + 0.01).at(-1)
  const after = tr.sentences.find(x => x.s >= clip.end - 0.01)
  const activeWord = words.find(w => pb.src >= w.s && pb.src < w.e + 0.1)?.i
  const allCut = selected.length > 0 && selected.every(i => cut.has(i))
  const speaker = (i: number) => tr.sentences[tr.words[i].sent]?.speaker
  const who = speakerName
  const pick = (i: number, shift: boolean) => {
    setMode('none')
    setSel(shift && sel ? [sel[0], i] : [i, i])
    pb.seekSource(tr.words[i].s)
  }
  const start = (m: 'fix' | 'voice') => { setMode(m); setText(selected.map(i => wordText(clip, tr.words[i])).join(' ')) }
  const apply = (e: FormEvent) => {
    e.preventDefault()
    const v = text.trim()
    if (!v || !selected.length) return
    if (mode === 'fix') edit({ fixes: { ...clip.fixes, [selected[0]]: v } })
    if (mode === 'voice') edit({ overdub: { ...clip.overdub, ...Object.fromEntries(selected.map((i, k) => [i, k === 0 ? v : ''])) } })
    setMode('none'); setSel(null)
  }
  let lastSent = -1
  return (
    <section className="ed-transcript" aria-label="Transcript">
      <div className="ed-tools">
        <Btn size="sm" disabled={!fill.length} onClick={() => edit(removeFillers(clip, tr))}><Scissors size={14} />{fill.length ? `Remove ${fill.length} filler${fill.length > 1 ? 's' : ''}` : 'No fillers'}</Btn>
        <Btn size="sm" disabled={!sil.length} onClick={() => edit({ trimGaps: true })}>{sil.length ? `Remove ${sil.length} pause${sil.length > 1 ? 's' : ''} · ${silenceSaved(clip, tr).toFixed(1)} s` : clip.trimGaps ? 'Pauses removed' : 'No long pauses'}</Btn>
        {clip.trimGaps && <Btn size="sm" variant="ghost" onClick={() => edit({ trimGaps: false })}>Keep the pauses</Btn>}
      </div>
      {slipIdx.length > 0 && (
        <div className="ed-flag" role="status">
          <Mark agent="juno" />
          <span className="grow">Juno flags {slipIdx.length === 1 ? 'a caption' : `${slipIdx.length} captions`}: {[...new Set(slipIdx.map(i => slipLabel(clip.heard![i], slips[i])))].join(', ')}, as the Playbook spells it.</span>
          <Btn size="xs" onClick={() => edit({ fixes: { ...clip.fixes, ...slips } })}>Fix {slipIdx.length === 1 ? 'it' : 'them'}</Btn>
        </div>
      )}
      {selected.length > 0 && (
        <div className="ed-sel" role="toolbar" aria-label="Selected words">
          <b className="num">{selected.length} word{selected.length > 1 ? 's' : ''}</b>
          <Btn size="xs" onClick={onCut}>{allCut ? 'Restore' : 'Delete'}</Btn>
          {selected.length === 1 && <Btn size="xs" variant="ghost" onClick={() => start('fix')}>Fix spelling</Btn>}
          <Btn size="xs" variant="ghost" onClick={() => start('voice')}><Lock size={12} />Change the words</Btn>
          <Btn size="xs" variant="ghost" onClick={() => setSel(null)}>Clear</Btn>
        </div>
      )}
      {mode !== 'none' && (
        <form className="ed-fix" onSubmit={apply}>
          {mode === 'fix' ? <p className="muted t-sm">Changes the caption only. The voice stays as it is.</p>
            : <p className="t-sm"><Lock size={12} aria-hidden /> Juno re-voices these words in {who(speaker(selected[0]))}’s voice. She never does this on her own: only you can confirm it.</p>}
          <div className="add-link">
            <input className="input grow" autoFocus value={text} onChange={e => setText(e.target.value)} aria-label={mode === 'fix' ? 'Corrected spelling' : 'New words'} />
            <Btn type="submit" size="sm" variant={mode === 'voice' ? 'primary' : undefined}>{mode === 'fix' ? 'Fix' : 'Re-voice'}</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setMode('none')}>Cancel</Btn>
          </div>
        </form>
      )}
      <div className="ed-words">
        {before && <button className="link-btn ed-extend" onClick={() => edit(extend(clip, tr, 'start', -1))}>Start earlier: “{before.text.slice(0, 48)}{before.text.length > 48 ? '…' : ''}”</button>}
        <p>
          {words.map(w => {
            const sp = tr.sentences[w.sent]?.speaker
            const head = w.sent !== lastSent && sp
            lastSent = w.sent
            const inSel = selected.includes(w.i)
            return (
              <span key={w.i}>
                {head && <b className="ed-speaker">{who(sp)}</b>}
                <button className={`ed-w ${cut.has(w.i) ? 'cut' : ''} ${w.filler ? 'filler' : ''} ${inSel ? 'sel' : ''} ${activeWord === w.i ? 'now' : ''} ${clip.fixes[w.i] ? 'fixed' : ''} ${w.i in slips ? 'flag' : ''} ${w.i in clip.overdub ? 'voiced' : ''}`}
                  onClick={e => pick(w.i, e.shiftKey)} aria-pressed={inSel} title={w.filler ? 'Filler word' : clip.fixes[w.i] ? `Caption fixed: heard “${clip.heard?.[w.i] ?? w.w}”` : w.i in slips ? `Juno: the Playbook says “${slips[w.i]}”` : w.i in clip.overdub ? `Re-voiced: was “${w.w}”` : undefined}>
                  {w.i in clip.overdub ? clip.overdub[w.i] || '·' : wordText(clip, w)}
                </button>
                {silAfter.has(w.e) && <span className="ed-pause">{silAfter.get(w.e)!.toFixed(1)} s pause</span>}{' '}
              </span>
            )
          })}
        </p>
        {after && <button className="link-btn ed-extend" onClick={() => edit(extend(clip, tr, 'end', 1))}>End later: “{after.text.slice(0, 48)}{after.text.length > 48 ? '…' : ''}”</button>}
        <div className="row tight ed-trim">
          <Btn size="xs" variant="ghost" onClick={() => edit(extend(clip, tr, 'start', 1))}>Start one sentence later</Btn>
          <Btn size="xs" variant="ghost" onClick={() => edit(extend(clip, tr, 'end', -1))}>End one sentence sooner</Btn>
        </div>
      </div>
    </section>
  )
}

/* ---------- Inspector ---------- */

type InspTab = 'captions' | 'layout' | 'brand' | 'audio' | 'post'

/** A slider that previews while you drag and saves once, when you let go. */
function CommitRange({ value, min, max, step = 1, label, onCommit, format }: { value: number; min: number; max: number; step?: number; label: string; onCommit: (v: number) => void; format?: (v: number) => string }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  const commit = () => { if (v !== value) onCommit(v) }
  return (
    <label className="ed-range"><span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={e => setV(+e.target.value)} onPointerUp={commit} onKeyUp={commit} onBlur={commit} aria-valuetext={format?.(v)} />
      <span className="num muted t-sm">{format ? format(v) : v}</span>
    </label>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="ed-field"><span className="ed-label">{label}</span>{children}</div>
}

function Inspector({ clip, pb, edit, score }: { clip: Clip; pb: Playback; edit: (p: Partial<Clip>) => void; score: ReturnType<typeof rescore> }) {
  const [tab, setTab] = useState<InspTab>('captions')
  return (
    <section className="ed-inspector" aria-label="Edit">
      <Tabs value={tab} onChange={setTab} items={[{ value: 'captions', label: 'Captions' }, { value: 'layout', label: 'Layout' }, { value: 'brand', label: 'Brand' }, { value: 'audio', label: 'Audio' }, { value: 'post', label: 'Post' }]} />
      <div className="ed-insp-body">
        {tab === 'captions' && <CaptionsTab clip={clip} pb={pb} edit={edit} />}
        {tab === 'layout' && <LayoutTab clip={clip} pb={pb} edit={edit} />}
        {tab === 'brand' && <BrandTab clip={clip} pb={pb} edit={edit} />}
        {tab === 'audio' && <AudioTab clip={clip} pb={pb} edit={edit} />}
        {tab === 'post' && <PostTab clip={clip} edit={edit} score={score} dur={pb.total} />}
      </div>
      <AskJuno clip={clip} pb={pb} edit={edit} />
    </section>
  )
}

function CaptionsTab({ clip, pb, edit }: { clip: Clip; pb: Playback; edit: (p: Partial<Clip>) => void }) {
  const c = clip.captions
  const cap = (p: Partial<Captions>) => edit({ captions: { ...c, ...p } })
  const langs: Lang[] = ['en', ...clip.audio.dubs]
  const download = () => {
    const blob = new Blob([toSRT(captionLines(clip, pb.tr))], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${clip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${clip.audio.lang}.srt`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  return (
    <div className="stack">
      <TemplatePicker name={`tpl-${clip.id}`} value={c.template} captions={c} onChange={template => cap({ template })} />
      <Field label="Font"><Seg name="font" size="sm" label="Font" value={c.font} onChange={font => cap({ font })} options={[{ value: 'sans', label: 'Sans' }, { value: 'condensed', label: 'Condensed' }, { value: 'serif', label: 'Serif' }]} /></Field>
      <CommitRange label="Size" min={4} max={11} value={c.size} onCommit={size => cap({ size })} />
      <Field label="Position"><Seg name="pos" size="sm" label="Caption position" value={c.y <= 30 ? 'top' : c.y <= 60 ? 'middle' : 'bottom'} onChange={v => cap({ y: v === 'top' ? 18 : v === 'middle' ? 48 : 72 })} options={[{ value: 'top', label: 'Top' }, { value: 'middle', label: 'Middle' }, { value: 'bottom', label: 'Bottom' }]} /></Field>
      <CommitRange label="Fine position" min={8} max={86} value={c.y} onCommit={y => cap({ y })} format={v => `${v}% from the top`} />
      <Field label="Words per line"><Seg name="per" size="sm" label="Words per line" value={String(c.perLine)} onChange={v => cap({ perLine: +v })} options={['1', '2', '3', '4', '6'].map(v => ({ value: v, label: v }))} /></Field>
      <Field label="Highlight"><SwatchPicker name={`sw-${clip.id}`} value={c.color} onChange={color => cap({ color })} /></Field>
      <Switch checked={c.emoji} onChange={emoji => cap({ emoji })} label="Emoji after key words" />
      <Switch checked={c.upper} onChange={upper => cap({ upper })} label="Capitals" />
      <Field label="Caption language"><Seg name="caplang" size="sm" label="Caption language" value={clip.audio.lang} onChange={lang => edit({ audio: { ...clip.audio, lang } })} options={langs.map(l => ({ value: l, label: LANG_LABEL[l] }))} /></Field>
      {clip.audio.dubs.length === 0 && <p className="muted t-sm">Other languages come with a dubbed version: make one in Audio.</p>}
      <Btn size="sm" variant="ghost" className="self-start" onClick={download}><Download size={14} />Download captions (.srt)</Btn>
    </div>
  )
}

const FRAMES: { value: FrameMode; label: string; note: string }[] = [
  { value: 'track', label: 'Auto-track', note: 'Follows the subject shot by shot' },
  { value: 'fill', label: 'Fill', note: 'Crops to fill the frame' },
  { value: 'fit', label: 'Fit', note: 'The whole picture on a blurred background' },
  { value: 'split', label: 'Split', note: 'The video on top, B-roll below' },
]

function LayoutTab({ clip, pb, edit }: { clip: Clip; pb: Playback; edit: (p: Partial<Clip>) => void }) {
  const { s } = useStore()
  const shots = pb.tr.shots.filter(x => x.e > clip.start && x.s < clip.end)
  return (
    <div className="stack">
      <FramingNote clip={clip} edit={edit} kit={s.video.kit.brand} />
      <div className="choices" role="radiogroup" aria-label="Framing">
        {FRAMES.map(f => (
          <label key={f.value} className={`choice-row ${clip.frame === f.value ? 'on' : ''}`}>
            <input type="radio" name={`frame-${clip.id}`} checked={clip.frame === f.value} onChange={() => edit({ frame: f.value })} />
            <span><b>{f.label}</b><span className="muted t-sm block">{f.note}</span></span>
          </label>
        ))}
      </div>
      {clip.frame !== 'fit' && (
        <>
          {clip.frame === 'track' && <Switch checked={clip.focus !== undefined} onChange={on => edit({ focus: on ? 0.5 : undefined })} label="Set the subject position myself" />}
          {(clip.frame !== 'track' || clip.focus !== undefined) && <CommitRange label="Subject position" min={0} max={100} value={Math.round((clip.focus ?? 0.5) * 100)} onCommit={v => edit({ focus: v / 100 })} format={v => (v < 40 ? 'Left' : v > 60 ? 'Right' : 'Centre')} />}
        </>
      )}
      {clip.frame === 'track' && clip.focus === undefined && (
        <Field label="Shots Juno tracked">
          <ul className="ed-list">{shots.map(x => <li key={x.s}><button className="link-btn" onClick={() => pb.seekSource(Math.max(x.s, clip.start))}>{x.label}</button><span className="muted t-sm">subject {x.focus < 0.45 ? 'left' : x.focus > 0.55 ? 'right' : 'centre'}</span></li>)}</ul>
        </Field>
      )}
    </div>
  )
}

/** Reframe and brand kit on Draft (applied, to check) or Suggest (Juno's proposal, not applied). */
export function FramingNote({ clip, edit, kit }: { clip: Clip; edit: (p: Partial<Clip>) => void; kit: Clip['brand'] }) {
  if (!clip.framing) return null
  return (
    <div className="ed-flag" role="status">
      <Mark agent="juno" />
      {clip.framing === 'check' ? <>
        <span className="grow">Juno framed it on the speaker, made a version per network and applied the brand kit. Reframing is set to Draft: check it.</span>
        <Btn size="xs" onClick={() => edit({ framing: undefined })}>Keep it</Btn>
        <Btn size="xs" variant="ghost" onClick={() => edit({ framing: undefined, frame: 'fit', focus: undefined, versions: undefined, brand: { ...clip.brand, logo: false, progress: false, intro: false, outro: false, music: undefined } })}>Undo framing</Btn>
      </> : <>
        <span className="grow">Juno suggests auto-tracking the speaker, a version per network, and the brand kit: logo, progress bar, end card, music.</span>
        <Btn size="xs" onClick={() => edit({ framing: undefined, frame: 'track', brand: { ...kit }, versions: buildVersions(clip) })}>Apply</Btn>
      </>}
    </div>
  )
}

function BrandTab({ clip, pb, edit }: { clip: Clip; pb: Playback; edit: (p: Partial<Clip>) => void }) {
  const { s } = useStore()
  const b = clip.brand
  const brand = (p: Partial<Clip['brand']>) => edit({ brand: { ...b, ...p } })
  const kept = keptWords(clip, pb.tr)
  const used = new Set(clip.broll.map(x => x.asset))
  const ideas = BROLL.filter(a => !used.has(a.id)).map(a => ({ a, w: kept.find(w => a.match.test(w.w)) })).filter(x => x.w)
  return (
    <div className="stack">
      <FramingNote clip={clip} edit={edit} kit={s.video.kit.brand} />
      <Switch checked={b.logo} onChange={logo => brand({ logo })} label="Logo" />
      <Switch checked={b.progress} onChange={progress => brand({ progress })} label="Progress bar" />
      <Switch checked={b.intro} onChange={intro => brand({ intro })} label="Hook card for the first 2 seconds" />
      <Switch checked={b.outro} onChange={outro => brand({ outro })} label="End card" />
      <Field label="B-roll">
        {clip.broll.length > 0 && <ul className="ed-list">{clip.broll.map(x => <li key={x.id}><span>{BROLL.find(a => a.id === x.asset)?.label} · {x.dur} s</span><Btn size="xs" variant="ghost" onClick={() => edit({ broll: clip.broll.filter(y => y.id !== x.id) })}>Remove</Btn></li>)}</ul>}
        {ideas.length > 0 ? (
          <ul className="ed-list">{ideas.map(({ a, w }) => (
            <li key={a.id}><span className="row tight nowrap"><Mark agent="juno" /><span>On “{w!.w.replace(/[.,!?]$/, '')}”: {a.label.toLowerCase()}</span></span><Btn size="xs" onClick={() => edit({ broll: [...clip.broll, { id: uid('br'), asset: a.id, at: w!.s, dur: 3 }] })}>Add</Btn></li>
          ))}</ul>
        ) : <p className="muted t-sm">No other B-roll fits what’s said in this clip.</p>}
      </Field>
      <Field label="Music"><Seg name="music" size="sm" label="Music" value={b.music ?? 'none'} onChange={v => brand({ music: v === 'none' ? undefined : v })} options={[{ value: 'none', label: 'None' }, ...MUSIC.map(m => ({ value: m.id, label: m.label.split(' · ')[0] }))]} /></Field>
      {b.music && <><CommitRange label="Music volume" min={0} max={60} value={b.musicVol} onCommit={musicVol => brand({ musicVol })} format={v => `${v}%`} /><Switch checked={b.duck} onChange={duck => brand({ duck })} label="Lower the music under the voice" /></>}
    </div>
  )
}

function AudioTab({ clip, pb, edit }: { clip: Clip; pb: Playback; edit: (p: Partial<Clip>) => void }) {
  const { s, d } = useStore()
  const [making, setMaking] = useState<Lang | null>(null)
  const level = s.agents.find(a => a.id === 'juno')?.actions.find(x => x.id === 'juno-dub')?.autonomy ?? 'draft'
  const order = [...new Set<Lang>([...s.video.kit.langs, ...LANGS.filter(l => l !== 'en')])]
  const review = clip.audio.review ?? []
  const voiced = Object.entries(clip.overdub).filter(([, v]) => v)
  const make = (lang: Lang) => {
    setMaking(lang)
    setTimeout(() => { d({ type: 'video/dub', id: clip.id, lang }); setMaking(null) }, 1500)
  }
  const play = (lang: Lang) => edit({ audio: { ...clip.audio, lang } })
  return (
    <div className="stack">
      <Field label="Studio sound">
        <Switch checked={clip.audio.studio} onChange={studio => edit({ audio: { ...clip.audio, studio } })} label="Remove room noise and hum" />
        {clip.audio.studio && clip.audio.lang === 'en' && <Btn size="sm" variant="ghost" className="self-start" aria-pressed={pb.original} onClick={() => pb.setOriginal(!pb.original)}>{pb.original ? 'Back to studio sound' : 'Hear the original'}</Btn>}
      </Field>
      <Field label="Voice">
        <ul className="ed-list">
          <li><span><b>English</b> · original voice</span>{clip.audio.lang === 'en' ? <Pill tone="ok">Playing</Pill> : <Btn size="xs" onClick={() => play('en')}>Play</Btn>}</li>
          {order.map(l => {
            const made = clip.audio.dubs.includes(l)
            const toReview = made && review.includes(l)
            const worth = !made && level === 'suggest' && s.video.kit.langs.includes(l as never)
            return (
              <li key={l}>
                <span><b>{LANG_LABEL[l]}</b> · {toReview ? 'made by Juno, to review' : made ? 'same voice, captions translated' : worth ? 'Juno suggests it: a brand kit language' : 'not made yet'}</span>
                {making === l ? <Thinking label="Dubbing…" />
                  : made ? <span className="row tight nowrap">
                    {clip.audio.lang === l ? <Pill tone="ok">Playing</Pill> : <Btn size="xs" variant={toReview ? 'ghost' : undefined} onClick={() => play(l)}>{toReview ? 'Listen' : 'Play'}</Btn>}
                    {toReview && <Btn size="xs" onClick={() => d({ type: 'video/approveDub', id: clip.id, lang: l })}>Approve</Btn>}
                  </span>
                  : <Btn size="xs" disabled={!!making} onClick={() => make(l)}>Make it</Btn>}
              </li>
            )
          })}
        </ul>
        <p className="muted t-sm">{level === 'act'
          ? 'Translate and dub is set to Act: Juno makes your brand kit languages for every new clip and sends them with it, as their own posts. Undo from the journal.'
          : level === 'draft'
            ? 'Translate and dub is set to Draft: Juno makes your brand kit languages for every new clip. Each waits for your review; approved ones go out with the clip, as their own posts.'
            : 'Translate and dub is set to Suggest: Juno points out the languages worth making. The ones you make go out with the clip, as their own posts.'}</p>
      </Field>
      <Field label="Re-voiced words">
        {voiced.length ? <ul className="ed-list">{voiced.map(([i, v]) => <li key={i}><span>“{pb.tr.words[+i].w}” → “{v}”</span><Btn size="xs" variant="ghost" onClick={() => { const o = { ...clip.overdub }; for (const k of Object.keys(o)) if (+k >= +i && (+k === +i || o[+k] === '')) delete o[+k]; edit({ overdub: o }) }}>Revert</Btn></li>)}</ul>
          : <p className="muted t-sm">Select words in the transcript and use “Change the words”. Juno never changes what someone says on her own.</p>}
      </Field>
    </div>
  )
}

function PostTab({ clip, edit, score, dur }: { clip: Clip; edit: (p: Partial<Clip>) => void; score: ReturnType<typeof rescore>; dur: number }) {
  const { s, d } = useStore()
  const open = clip.status === 'ready' || clip.status === 'snoozed'
  const held = open ? holdReason(s, clip) : undefined
  const campaign = campaignFor(s, clip)
  const who = open ? unreleased(s, clip) : []
  const now = useNow(30000)
  const [own, setOwn] = useState('')
  const slots = useMemo(() => clipPosts(clip, s.publishing.posts, now, () => 'preview', dur), [clip, s.publishing.posts, now, dur])
  const setNets = (n: Network, on: boolean) => {
    const networks = on ? [...clip.post.networks, n] : clip.post.networks.filter(x => x !== n)
    if (!networks.length) return
    edit({ post: { networks, text: on ? { ...clip.post.text, [n]: clip.post.text[clip.post.networks[0]] ?? clip.hook } : clip.post.text }, ...(on && clip.versions ? { versions: { ...clip.versions, [n]: versionFor(clip, n) } } : {}) })
  }
  return (
    <div className="stack">
      {held && (
        <div className="ed-flag" role="status">
          <Mark agent="juno" />
          <span className="grow">Not going out: {held}.</span>
          {who.map(p => <Btn key={p} size="xs" onClick={() => d({ type: 'video/release', person: p, signed: true })}>{PEOPLE[p].name}’s release is signed</Btn>)}
        </div>
      )}
      <div className="ed-score">
        <div className="row between"><b>Virality score</b><b className="num ed-score-total">{score.total}</b></div>
        {(Object.keys(SCORE_LABEL) as ScoreKey[]).map(k => (
          <div key={k} className="ed-score-row">
            <span>{SCORE_LABEL[k]}</span><span className="ed-bar"><span style={{ width: `${score.score[k]}%` }} /></span><span className="num">{score.score[k]}</span>
            <p className="muted t-sm">{score.reasons[k]}</p>
          </div>
        ))}
        {score.track && (
          <div className="ed-score-row">
            <span className="ed-score-wide">Track record</span><span className="num">{score.track.delta > 0 ? `+${score.track.delta}` : score.track.delta}</span>
            <p className="muted t-sm">{score.track.why}</p>
          </div>
        )}
      </div>
      <div className="ed-why">
        <div className="row tight"><Mark agent="juno" /><b>Why this moment</b></div>
        <p>{clip.why}</p>
        <ul className="ed-evidence">
          {clip.evidence.map(e => <li key={e.label}><b className="num">{e.value}</b> <span>{e.label}</span> {e.to ? <Link to={e.to} className="link-btn">{e.from} ↗</Link> : <span className="muted">· {e.from}</span>}</li>)}
          {clip.track?.like && <li><b className="num">{(clip.track.like.views / 1000).toFixed(1)}k</b> <span>views on “{clip.track.like.title}”, the closest clip you published</span> <Link to={`/video/clips/${clip.track.like.id}`} className="link-btn">Video ↗</Link></li>}
        </ul>
      </div>
      <Field label="Hook">
        <div className="choices" role="radiogroup" aria-label="Hook">
          {[...new Set([...clip.hooks, clip.hook])].map(h => (
            <label key={h} className={`choice-row ${clip.hook === h ? 'on' : ''}`}><input type="radio" name={`hook-${clip.id}`} checked={clip.hook === h} disabled={clip.status === 'trial'} onChange={() => edit({ hook: h })} /><span>{h}</span></label>
          ))}
        </div>
        <form className="add-link" onSubmit={e => { e.preventDefault(); if (own.trim()) { edit({ hook: own.trim(), hooks: [...clip.hooks, own.trim()] }); setOwn('') } }}>
          <input className="input grow" placeholder="Write your own hook" value={own} onChange={e => setOwn(e.target.value)} aria-label="Your own hook" />
          <Btn size="sm" type="submit" disabled={!own.trim()}>Use it</Btn>
        </form>
      </Field>
      <TrialField clip={clip} edit={edit} />
      <CoverField clip={clip} edit={edit} />
      <Field label="Where it goes">
        <div className="row">{CLIP_NETWORKS.map(n => <label key={n} className="check-row"><input type="checkbox" className="check" checked={clip.post.networks.includes(n)} onChange={e => setNets(n, e.target.checked)} /><Net n={n} size={16} />{NETWORK_FIT[n]}</label>)}</div>
        {clip.post.networks.filter(n => !fitsLength(n, dur)).map(n => <p key={n} className="muted t-sm">{NETWORK_FIT[n]}: {Math.round(dur)} s is outside {lengthSpec(n).min}–{lengthSpec(n).max} s, so Atlas won’t post it there.</p>)}
        {clip.post.networks.flatMap(n => versionIssues(clip, n).map(x => <p key={n + x} className="muted t-sm">{NETWORK_FIT[n]}: {x}.</p>))}
      </Field>
      {clip.post.networks.map(n => {
        const text = clip.post.text[n] ?? ''
        const checks = checkPost({ text, network: n, media: `clip:${clip.id}`, words: BANNED, rules: s.playbook.rules })
        return (
          <div key={n} className="ed-field">
            <span className="ed-label row tight"><Net n={n} size={16} />{NETWORK_LABEL[n]} caption</span>
            <textarea className="textarea" rows={3} defaultValue={text} key={`${n}-${text}`} onBlur={e => { if (e.target.value !== text) edit({ post: { ...clip.post, text: { ...clip.post.text, [n]: e.target.value } } }) }} aria-label={`${NETWORK_LABEL[n]} caption`} />
            <ul className="ed-checks">{checks.map(c => <li key={c.label} className={c.ok ? 'ok' : 'bad'}>{c.ok ? '✓' : '!'} {c.label}</li>)}</ul>
          </div>
        )
      })}
      <Field label="Label and campaign">
        <ul className="ed-list">
          <li><span>Label</span><span>{clip.pillar}</span></li>
          <li><span>Campaign</span>{campaign ? <span>{campaign.name} (Sage) · joins {s.publishing.posts.filter(p => p.campaign === campaign.name).length} posts already planned for it</span> : <span className="muted">None running for {clip.pillar}</span>}</li>
        </ul>
      </Field>
      {(clip.status === 'ready' || clip.status === 'snoozed') && (
        <Field label="When Atlas will post it">
          <ul className="ed-list">{slots.map(p => <li key={p.network}><span className="row tight nowrap"><Net n={p.network} size={16} />{new Date(p.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, {hhmm(p.at)}</span><span className="muted t-sm">best free slot</span></li>)}</ul>
        </Field>
      )}
    </div>
  )
}

/* ---------- Hook trial ---------- */

const TRIAL_LEVEL = {
  act: 'Hook trials are set to Act: Juno trials her best new clips (80+) on her own and puts the winning hook on. Undo from the journal.',
  draft: 'Hook trials are set to Draft: when a trial ends, Juno asks you on the Desk to use the winner and send the clip to Atlas.',
  suggest: 'Hook trials are set to Suggest: Juno says which hooks to test. You start the trial and pick the hook.',
}

/** Two hooks against each other on Reels, non-followers first: what Juno would test, the trial running, or who won. */
function TrialField({ clip, edit }: { clip: Clip; edit: (p: Partial<Clip>) => void }) {
  const { s, d } = useStore()
  const t = clip.trial
  const pair = t?.hooks ?? trialPair(clip)
  if (!pair) return null
  const level = actionOf(s, 'juno', 'juno-trial')?.autonomy ?? 'draft'
  const ok = canTrial(s, clip)
  const wins = numberWins(s.video.trials).length
  const day = (x: number) => new Date(x).toLocaleDateString('en-GB', { weekday: 'short' })
  const w = t?.held ? winnerOf({ hooks: pair, held: t.held }) : 0
  return (
    <Field label="Hook trial">
      {clip.status === 'trial' && t ? (
        <>
          <p className="t-sm">On Instagram Reels since {hhmm(t.from)}, each hook shown to non-followers first. Results {day(t.until)} at {hhmm(t.until)}; nothing reaches your followers before.</p>
          <ul className="ed-list">{pair.map((h, i) => <li key={h}><span>“{h}”</span><span className="muted t-sm">{i === 0 ? 'Current hook' : 'Challenger'}</span></li>)}</ul>
          <Btn size="sm" variant="ghost" className="self-start" onClick={() => d({ type: 'video/trialStop', id: clip.id })}>Stop the trial</Btn>
        </>
      ) : t?.held ? (
        <>
          <ul className="ed-list">{pair.map((h, i) => <li key={h}><span>“{h}”{i === w && <b> · won</b>}</span><span className="num t-sm">{t.held![i]}% still watching at 3 s</span></li>)}</ul>
          {clip.hook !== pair[w] && (clip.status === 'ready' || clip.status === 'snoozed') && <Btn size="sm" className="self-start" onClick={() => edit({ hook: pair[w] })}>Use the winning hook</Btn>}
        </>
      ) : (
        <>
          <p className="t-sm"><Mark agent="juno" /> Juno would test “{pair[0]}” against “{pair[1]}”{hasNumber(pair[0]) !== hasNumber(pair[1]) && s.video.trials.length ? ` One opens on a number, the other doesn’t: a hook with a number won ${wins} of your ${s.video.trials.length} trials so far.` : ''}</p>
          {ok === true ? <Btn size="sm" className="self-start" onClick={() => d({ type: 'video/trial', id: clip.id })}>Trial 2 hooks first</Btn> : <p className="muted t-sm">Can’t trial it now: {ok.charAt(0).toLowerCase()}{ok.slice(1)}.</p>}
        </>
      )}
      <p className="muted t-sm">{TRIAL_LEVEL[level]}</p>
    </Field>
  )
}

/* ---------- Cover ---------- */

function CoverField({ clip, edit }: { clip: Clip; edit: (p: Partial<Clip>) => void }) {
  const { s } = useStore()
  const source = s.video.sources.find(x => x.id === clip.source)
  if (!source || source.kind === 'upload') return null
  const frames = coverFrames(clip, TRANSCRIPT[source.transcript], noRelease(s, source.transcript))
  const at = (x: number) => fmt(Math.max(0, x - clip.start))
  const pick = (x: number) => edit({ cover: { at: x, text: clip.cover?.text ?? coverText(clip.hook), by: 'you' } })
  return (
    <>
      <Field label="Cover">
        {!clip.cover && frames[0] && <p className="t-sm row tight"><Mark agent="juno" />Juno suggests the frame at {at(frames[0].at)}: {frames[0].why.toLowerCase()}. Pick one to use it.</p>}
        <div className="row" role="radiogroup" aria-label="Cover frame">
          {frames.map(f => (
            <button key={f.at} type="button" role="radio" aria-checked={clip.cover?.at === f.at} className="cover-pick" onClick={() => pick(f.at)} aria-label={`Frame at ${at(f.at)}: ${f.why}`} title={f.why}>
              <CoverFrame source={source} at={f.at} focus={focusAt(clip, source, f.at)} text={clip.cover?.at === f.at ? clip.cover.text : undefined} /><span className="mono">{at(f.at)}</span>
            </button>
          ))}
        </div>
        {clip.cover && frames[0] && <p className="muted t-sm">{clip.cover.by === 'juno' ? `Juno’s pick: ${frames[0].why.toLowerCase()}, the hook reads over it.` : `Your pick. Juno’s was ${at(frames[0].at)}, ${frames[0].why.toLowerCase()}.`}</p>}
        {clip.cover && <input className="input" aria-label="Cover text" defaultValue={clip.cover.text} key={clip.cover.text} maxLength={60} onBlur={e => { const v = e.target.value.trim(); if (v !== clip.cover!.text) edit({ cover: { ...clip.cover!, text: v, by: 'you' } }) }} />}
      </Field>
      {clip.post.networks.includes('youtube') && (
        <Field label="YouTube title">
          <input className="input" aria-label="YouTube title" defaultValue={clip.ytTitle ?? shortsTitle(clip)} key={clip.ytTitle} maxLength={100} onBlur={e => { const v = e.target.value.trim(); if (v && v !== clip.ytTitle) edit({ ytTitle: v }) }} />
        </Field>
      )}
    </>
  )
}

/* ---------- Ask Juno ---------- */

const ASKS = ['Shorter, 30 s', 'Start with the strap', 'Remove the ums', 'Punchier captions', 'Pick a better cover', 'French version']

function AskJuno({ clip, pb, edit }: { clip: Clip; pb: Playback; edit: (p: Partial<Clip>) => void }) {
  const { s, d } = useStore()
  const avoid = noRelease(s, s.video.sources.find(x => x.id === clip.source)?.transcript ?? '')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState<{ ask: string; reply: string; diff?: DiffPart[] } | null>(null)
  const ask = (text: string) => {
    if (!text.trim() || busy) return
    setBusy(true); setQ('')
    setTimeout(() => {
      const r = applyAsk(clip, pb.tr, text, avoid)
      if (r.changed) {
        const { id: _, status: __, ...patch } = r.clip
        edit(patch)
      }
      const a = clipText(clip, pb.tr), b = clipText(r.clip, pb.tr)
      setLast({ ask: text, reply: r.reply, diff: r.changed && a !== b ? diffWords(a, b) : undefined })
      d({ type: 'core/track', kind: 'video/ask', detail: { clip: clip.id, text, changed: r.changed } })
      setBusy(false)
    }, 650)
  }
  return (
    <div className="ed-dock">
      <div className="row tight"><Mark agent="juno" /><b>Ask Juno for changes</b></div>
      {busy ? <Thinking label="Juno is editing…" /> : last && (
        <div className="ed-bubble">
          <p className="muted t-sm">You: {last.ask}</p>
          <p>{last.reply}</p>
          {last.diff && <p className="diff t-sm">{last.diff.map((p, k) => p.op === 'same' ? <span key={k}>{p.text.split(' ').length > 8 ? '… ' : `${p.text} `}</span> : p.op === 'add' ? <ins key={k}>{p.text} </ins> : <del key={k}>{p.text} </del>)}</p>}
        </div>
      )}
      <form className="add-link" onSubmit={e => { e.preventDefault(); ask(q) }}>
        <input className="input grow" placeholder="Make it shorter, open on the strap…" value={q} onChange={e => setQ(e.target.value)} aria-label="Ask Juno" />
        <Btn type="submit" size="sm" disabled={!q.trim() || busy}><Wand2 size={14} />Send</Btn>
      </form>
      <div className="filters ed-chips">{ASKS.map(a => <button key={a} className="filter" onClick={() => ask(a)} disabled={busy}><Sparkles size={12} aria-hidden />{a}</button>)}</div>
    </div>
  )
}
