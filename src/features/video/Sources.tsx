import { useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Link2, Radio, TriangleAlert, Upload, Youtube } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { dayLabel, hhmm } from '../../app/time'
import { PHASES, PHASE_MS, TRANSCRIPT, WATCHING, type Source } from '../../data/video'
import { Btn, Empty, Mark, Net, Pill, Seg, Switch, Thinking } from '../../ui'
import { Notice } from '../../ui/Feedback'
import { InfoPop } from '../../ui/More'
import { WEEKLY_QUOTA, sentThisWeek, validUrl } from './slice'
import { ClipThumb, SESSION_BLOBS, ScoreBadge, SourceThumb, clipScore, fmt, playable, videoUrl } from './parts'
import { ON_SCREEN, PEOPLE, mediaUrl, speakerName } from '../../data/video'

const KIND = { youtube: { icon: Youtube, label: 'YouTube upload' }, live: { icon: Radio, label: 'Recorded live' }, link: { icon: Link2, label: 'Pasted link' }, upload: { icon: Upload, label: 'Uploaded file' } }
export const lengthOf = (src: Source) => src.shownDuration ?? fmt(TRANSCRIPT[src.transcript].duration)

/**
 * One source video as a 16:9 card (matrix §15): the poster with its length, the title, the channel and date, then its state
 * and the one action it needs (Make clips, Retry) or the way to its clips.
 */
export function SourceCard({ src, now }: { src: Source; now: number }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const K = KIND[src.kind].icon
  const stop = (f: () => void) => (e: MouseEvent) => { e.stopPropagation(); f() }
  const el = Math.max(0, now - (src.startedAt ?? now))
  const pct = Math.min(99, Math.round((el / (PHASES.length * PHASE_MS)) * 100))
  const all = s.video.clips.filter(c => c.source === src.id && c.status !== 'dismissed')
  const ready = all.filter(c => c.status === 'ready').length
  return (
    <li className="card hoverable vs-card" onClick={e => { if (!(e.target as Element).closest('a, button, [role="menu"]')) nav(`/video/sources/${src.id}`) }}>
      <div className="vs-frame">
        <SourceThumb source={src} />
        <span className="clip-thumb-len mono">{lengthOf(src)}</span>
      </div>
      <div className="vs-body">
        <Link className="vs-title" to={`/video/sources/${src.id}`}>{src.title}</Link>
        <p className="vs-meta"><K size={14} aria-label={KIND[src.kind].label} /><span className="ellipsis">{src.channel}</span><span className="nowrap">{dayLabel(src.at, now)}, {hhmm(src.at)}</span></p>
      </div>
      <div className="vs-state">
        {src.status === 'processing' ? <>
          <span className="vs-making"><span className="t-sm">{PHASES[Math.min(PHASES.length - 1, Math.floor(el / PHASE_MS))]}</span><span className="t-sm num">{pct}%</span></span>
          <span className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${src.title}: ${pct}%`}><span style={{ width: `${pct}%` }} /></span>
        </> : src.status === 'failed' ? <>
          <span className="vc-status"><Pill tone="alert">Failed</Pill><InfoPop label="Why?">{src.error}</InfoPop></span>
          <Btn size="sm" onClick={stop(() => d({ type: 'video/retry', id: src.id }))}>Retry</Btn>
        </> : src.status === 'waiting' ? <>
          <span className="t-sm">New video</span>
          <Btn size="sm" onClick={stop(() => d({ type: 'video/start', id: src.id }))}>Make clips</Btn>
        </> : <>
          <span className="t-sm"><b className="num">{ready}</b> {ready === 1 ? 'clip' : 'clips'} ready · {all.length} in all</span>
          {all.length > 0 && <Link className="link-btn t-sm" to={`/video?source=${src.id}`}>See clips</Link>}
        </>}
      </div>
    </li>
  )
}

function AddVideo() {
  const { d } = useStore()
  const [url, setUrl] = useState('')
  const [err, setErr] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!validUrl(url)) { setErr('That doesn’t look like a link. Paste a YouTube, Vimeo or podcast address.'); return }
    d({ type: 'video/addLink', url }); setUrl(''); setErr('')
  }
  const pick = (f?: File) => {
    if (!f) return
    const blob = URL.createObjectURL(f)
    SESSION_BLOBS.add(blob)
    d({ type: 'video/addUpload', name: f.name, blob })
  }
  return (
    <section className="card pad stack" aria-labelledby="add-video" id="add">
      <h2 id="add-video" className="section-title flush">Add a video</h2>
      <form className="add-link" onSubmit={submit} noValidate>
        <label className="sr-only" htmlFor="video-url">Video link</label>
        <input id="video-url" className="input grow" type="url" inputMode="url" placeholder="https://youtube.com/watch?v=…" value={url} onChange={e => { setUrl(e.target.value); setErr('') }} aria-invalid={!!err} aria-describedby={err ? 'video-url-err' : undefined} />
        <Btn type="submit" disabled={!url.trim()}>Clip it</Btn>
      </form>
      {err && <p id="video-url-err" className="field-error" role="alert"><TriangleAlert size={14} aria-hidden />{err}</p>}
      <div className="row">
        <input ref={file} type="file" accept="video/*" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
        <Btn variant="ghost" onClick={() => file.current?.click()}><Upload size={14} />Upload a file</Btn>
        <span className="muted t-sm">MP4 or MOV. Your file stays in this browser.</span>
      </div>
    </section>
  )
}

/** Juno's channel and auto-clipping: a setting, so it sits in the Video settings sheet. */
export function Watching() {
  const { s, d } = useStore()
  const kit = s.video.kit
  return (
    <section className="stack" aria-labelledby="watching">
      <h2 id="watching" className="section-title flush">Watching</h2>
      <div className="row nowrap"><Net n="youtube" size={22} /><div><b>{WATCHING.channel}</b> <span className="muted">{WATCHING.handle} · checked every {WATCHING.checkedEvery}</span></div></div>
      <Switch checked={kit.watchUploads} onChange={v => d({ type: 'video/kit', patch: { watchUploads: v } })} label="Clip new uploads" />
      <Switch checked={kit.watchLives} onChange={v => d({ type: 'video/kit', patch: { watchLives: v } })} label="Clip recorded lives and webinars" />
    </section>
  )
}

/** Videos: add one, then every video as a 16:9 card (matrix §15) that opens its transcript. */
export default function Sources() {
  const { s } = useStore()
  const now = useNow(1000)
  return (
    <div className="stack lg">
      <Notice scope="video" />
      <AddVideo />
      {!s.video.sources.length ? <Empty title="No videos yet" /> : (
        <ul className="vs-grid" aria-label="Videos">{s.video.sources.map(src => <SourceCard key={src.id} src={src} now={now} />)}</ul>
      )}
    </div>
  )
}

/* ---------- One source ---------- */

const LENGTHS = [{ value: '20', label: 'Under 30 s' }, { value: '45', label: '30–60 s' }, { value: '75', label: '60–90 s' }]
const COUNTS = [{ value: '1', label: '1' }, { value: '3', label: '3' }, { value: '5', label: '5' }]

export function SourceDetail({ id }: { id: string }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const now = useNow(1000)
  const video = useRef<HTMLVideoElement>(null)
  const [q, setQ] = useState('')
  const [len, setLen] = useState('45')
  const [count, setCount] = useState('3')
  const [busy, setBusy] = useState(false)
  const src = s.video.sources.find(x => x.id === id)
  if (!src) return <Empty title="This video is gone" body="It may have been cleared by a reset." action={<Btn onClick={() => nav('/video/sources')}>Back to sources</Btn>} />
  const tr = TRANSCRIPT[src.transcript]
  const people = [...new Set((ON_SCREEN[src.transcript] ?? []).map(p => p.who))]
  const clips = s.video.clips.filter(c => c.source === src.id && c.status !== 'dismissed')
  const clipAt = (t: number) => clips.find(c => t >= c.start - 0.01 && t <= c.end + 0.01)
  const seek = (t: number) => { if (video.current) { video.current.currentTime = t; void video.current.play().catch(() => {}) } }
  const find = (e: FormEvent) => {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    setTimeout(() => { d({ type: 'video/find', source: src.id, query: q.trim(), len: +len, count: +count }); setBusy(false); setQ('') }, 1200)
  }
  return (
    <div className="stack lg">
      <Link to="/video/sources" className="link-btn row tight self-start"><ArrowLeft size={14} />All videos</Link>
      <div className="src-head">
        <h2>{src.title}</h2>
        <p className="muted">{KIND[src.kind].label} · {src.channel} · {dayLabel(src.at, now)}, {hhmm(src.at)} · <span className="num">{lengthOf(src)}</span> · <span className="num">{sentThisWeek(s, src.id)} of {WEEKLY_QUOTA}</span> clips sent this week</p>
      </div>
      <Notice scope="video" />
      {src.status !== 'ready' ? (
        <div className="card pad stack">
          {src.status === 'processing' && <Thinking label={`Juno is working on it: ${PHASES[Math.min(PHASES.length - 1, Math.floor((now - (src.startedAt ?? now)) / PHASE_MS))].toLowerCase()}…`} />}
          {src.status === 'waiting' && <><p>Juno spotted this video and is waiting for your go.</p><Btn className="self-start" onClick={() => d({ type: 'video/start', id: src.id })}>Make clips</Btn></>}
          {src.status === 'failed' && <><p className="field-error"><TriangleAlert size={14} aria-hidden />{src.error}</p><div className="row"><Btn onClick={() => d({ type: 'video/retry', id: src.id })}>Retry</Btn><Btn variant="ghost" onClick={() => nav('/video/sources#add')}>Upload the file instead</Btn></div></>}
        </div>
      ) : (
        <div className="src-body">
          <div className="stack">
            {playable(src)
              ? <video ref={video} className="src-video" src={videoUrl(src)} poster={src.kind === 'upload' ? undefined : mediaUrl(`${src.media}/poster.jpg`)} controls preload="metadata" />
              : <div className="src-video gone"><p>Upload the file again to play it: uploads stay in the browser for one session.</p></div>}
            {clips.length > 0 && (
              <section aria-labelledby="src-clips-h" className="stack">
                <h3 id="src-clips-h" className="section-title flush">Clips from this video</h3>
                <ul className="src-clips">{[...clips].sort((a, b) => clipScore(b, src).total - clipScore(a, src).total).map(c => (
                  <li key={c.id}>
                    <Link to={`/video/clips/${c.id}`} className="src-clip" title={c.title}>
                      <ClipThumb clip={c} source={src} size="fill" />
                      <span className="vc-score"><ScoreBadge value={clipScore(c, src).total} /></span>
                    </Link>
                  </li>
                ))}</ul>
              </section>
            )}
            {src.sampleTranscript && <p className="muted t-sm">{src.kind === 'link' ? 'This prototype can’t open links: the video, transcript and clips below come from a sample video.' : 'This prototype can’t transcribe your file: the transcript and clips below come from a sample video.'}</p>}
            <form className="card pad stack" onSubmit={find} aria-labelledby="find-h">
              <div className="row nowrap"><Mark agent="juno" /><h3 id="find-h" className="section-title flush">Find clips about…</h3></div>
              <div className="add-link">
                <label className="sr-only" htmlFor="find-q">What should the clips be about?</label>
                <input id="find-q" className="input grow" placeholder="e.g. second-hand bags, the warranty, zips" value={q} onChange={e => setQ(e.target.value)} />
                <Btn type="submit" disabled={!q.trim() || busy}>Find</Btn>
              </div>
              <div className="row">
                <Seg name="find-len" label="Clip length" size="sm" value={len} onChange={setLen} options={LENGTHS} />
                <Seg name="find-count" label="How many clips" size="sm" value={count} onChange={setCount} options={COUNTS.map(c => ({ ...c, label: `${c.label} clip${c.value === '1' ? '' : 's'}` }))} />
              </div>
              {busy && <Thinking label="Reading the transcript…" />}
            </form>
            {people.length > 0 && (
              <section className="card pad stack" aria-labelledby="people-h">
                <h3 id="people-h" className="section-title flush">People on screen</h3>
                <ul className="ed-list">{people.map(p => (
                  <li key={p}>
                    <span><b>{PEOPLE[p].name}</b>, {PEOPLE[p].role} · {s.video.releases[p] ? 'release signed' : 'no signed release: Juno holds the clips that show him'}</span>
                    <Btn size="xs" variant={s.video.releases[p] ? 'ghost' : undefined} onClick={() => d({ type: 'video/release', person: p, signed: !s.video.releases[p] })}>{s.video.releases[p] ? 'Remove the release' : 'Release is signed'}</Btn>
                  </li>
                ))}</ul>
              </section>
            )}
          </div>
          <section className="card src-transcript" aria-labelledby="tr-h">
            <div className="card-head"><h3 id="tr-h">Transcript</h3><span className="muted t-sm">{clips.length} moments picked</span></div>
            {tr.chapters && (
              <ol className="chapters">{tr.chapters.map(ch => <li key={ch.title}><button className="link-btn" onClick={() => seek(ch.s)}><span className="mono">{ch.display}</span> {ch.title}</button></li>)}</ol>
            )}
            <ol className="tr-lines">
              {tr.sentences.map(se => {
                const c = clipAt(se.s)
                const first = c && Math.abs(c.start - se.s) < 0.02
                return (
                  <li key={se.i} className={c ? 'in-clip' : ''}>
                    {first && c && <div className="tr-clip"><Link to={`/video/clips/${c.id}`} className="link-btn">{c.title}</Link><ScoreBadge value={clipScore(c, src).total} /></div>}
                    <button className="tr-line" onClick={() => seek(se.s)}>
                      <span className="mono">{fmt(se.s)}</span>
                      {se.speaker && <b>{speakerName(se.speaker)}</b>}
                      <span>{se.text}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>
        </div>
      )}
    </div>
  )
}
