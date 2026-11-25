// Tracks in clip time: video segments on the filmstrip, captions, B-roll, music. Playhead and trim handles move with the pointer.
import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { BROLL, MUSIC, mediaUrl, type Source } from '../../data/video'
import { captionLines, toClipTime, toSourceTime, type Clip } from './model'
import type { Playback } from './Player'
import { fmt } from './parts'

const TILE = 71 // px per 2 s on the 40 px-high filmstrip (160×90 tiles)
/** Below this, a caption line is a few pixels wide and unreadable: on a phone the timeline scrolls instead of fitting. */
const MIN_FIT = 24

/** Drag helper: calls back with the horizontal distance, ends on release. */
function drag(e: RPointerEvent, move: (dx: number) => void, end: (dx: number) => void) {
  e.preventDefault(); e.stopPropagation()
  const x0 = e.clientX
  const onMove = (ev: PointerEvent) => move(ev.clientX - x0)
  const onUp = (ev: PointerEvent) => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); end(ev.clientX - x0) }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

export default function Timeline({ clip, source, pb, onEdit }: { clip: Clip; source: Source; pb: Playback; onEdit: (p: Partial<Clip>) => void }) {
  const { segs, total, t, tr } = pb
  const [zoom, setZoom] = useState(12)
  const [fit, setFit] = useState(40)
  const [trim, setTrim] = useState<{ edge: 'start' | 'end'; dx: number } | null>(null)
  const [moving, setMoving] = useState<{ id: string; dx: number } | null>(null)
  const lane = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  // Opens fitted to the full width, however short the clip; zoom in from there.
  useLayoutEffect(() => { const w = scroller.current?.clientWidth; if (w && total) { const f = Math.max(MIN_FIT, Math.floor((w - 56) / total)); setFit(f); setZoom(f) } }, [Math.round(total)]) // eslint-disable-line react-hooks/exhaustive-deps
  const lines = useMemo(() => captionLines(clip, tr), [clip, tr])
  const px = (sec: number) => sec * zoom
  const width = Math.max(px(total) + 48, 320)
  const snap = (x: number) => tr.words.reduce((best, w) => (Math.abs(w.s - x) < Math.abs(best - x) ? w.s : best), tr.words[0]?.s ?? 0)
  const snapEnd = (x: number) => tr.words.reduce((best, w) => (Math.abs(w.e - x) < Math.abs(best - x) ? w.e : best), tr.words.at(-1)?.e ?? 0)

  const seekAt = (clientX: number) => {
    const box = lane.current?.getBoundingClientRect()
    if (box) pb.seek(Math.max(0, Math.min(total, (clientX - box.left) / zoom)))
  }
  const scrub = (e: RPointerEvent) => {
    seekAt(e.clientX)
    drag(e, dx => seekAt(e.clientX + dx), () => {})
  }
  const trimEdge = (edge: 'start' | 'end') => (e: RPointerEvent) => drag(e, dx => setTrim({ edge, dx }), dx => {
    setTrim(null)
    const sec = dx / zoom
    if (Math.abs(sec) < 0.1) return
    if (edge === 'start') { const start = snap(Math.max(0, clip.start + sec)); if (start < clip.end - 3) onEdit({ start }) }
    else { const end = snapEnd(Math.min(tr.duration, clip.end + sec)); if (end > clip.start + 3) onEdit({ end }) }
  })
  const moveBroll = (id: string) => (e: RPointerEvent) => drag(e, dx => setMoving({ id, dx }), dx => {
    setMoving(null)
    const b = clip.broll.find(x => x.id === id)
    if (!b || Math.abs(dx) < 3) return
    const at = toSourceTime(segs, Math.max(0, toClipTime(segs, b.at) + dx / zoom))
    onEdit({ broll: clip.broll.map(x => (x.id === id ? { ...x, at } : x)) })
  })
  const keyTrim = (edge: 'start' | 'end') => (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const dir = e.key === 'ArrowLeft' ? -1 : 1
    const words = edge === 'start' ? tr.words.map(w => w.s) : tr.words.map(w => w.e)
    const cur = edge === 'start' ? clip.start : clip.end
    const next = dir < 0 ? [...words].reverse().find(x => x < cur - 0.01) : words.find(x => x > cur + 0.01)
    if (next === undefined) return
    if (edge === 'start' && next < clip.end - 3) onEdit({ start: next })
    if (edge === 'end' && next > clip.start + 3) onEdit({ end: next })
  }

  let acc = 0
  const blocks = segs.map(g => { const b = { x: px(acc), w: px(g.e - g.s), s: g.s }; acc += g.e - g.s; return b })
  const ticks = Array.from({ length: Math.floor(total / 5) + 1 }, (_, k) => k * 5)
  const music = clip.brand.music && MUSIC.find(m => m.id === clip.brand.music)

  return (
    <section className="timeline" aria-label="Timeline">
      <div className="tl-bar">
        <span className="mono t-sm">{fmt(t)} / {fmt(total)}</span>
        <span className="muted t-sm">{segs.length - 1 > 0 ? `${segs.length - 1} cut${segs.length > 2 ? 's' : ''}` : 'No cuts'}</span>
        <span className="spacer" />
        <label className="row tight t-sm muted">Zoom<input type="range" min={6} max={Math.max(40, fit * 2)} value={zoom} onChange={e => setZoom(+e.target.value)} aria-label="Timeline zoom" /></label>
      </div>
      <div className="tl-body">
      <div className="tl-names" aria-hidden><span className="tl-ruler-gap" /><span>Video</span><span>Captions</span><span>B-roll</span>{music && <span>Music</span>}</div>
      <div className="tl-scroll" ref={scroller}>
        <div className="tl-inner" style={{ width }}>
          <div className="tl-ruler" onPointerDown={scrub} role="slider" tabIndex={0} aria-label="Playhead" aria-valuemin={0} aria-valuemax={Math.round(total)} aria-valuenow={Math.round(t)} aria-valuetext={`${fmt(t)} of ${fmt(total)}`}
            onKeyDown={e => { if (e.key === 'ArrowLeft') pb.seek(t - 1); if (e.key === 'ArrowRight') pb.seek(t + 1) }}>
            {ticks.map(k => <span key={k} style={{ left: px(k) }} className="mono">{fmt(k)}</span>)}
          </div>
          <div className="tl-lanes" ref={lane}>
            <div className="tl-track" aria-label="Video">
              {blocks.map((b, k) => (
                <span key={k} className="tl-seg" style={{ left: b.x, width: Math.max(2, b.w), backgroundImage: source.kind === 'upload' ? undefined : `url(${mediaUrl(`${source.media}/strip.jpg`)})`, backgroundPositionX: -(b.s / 2) * TILE }}>
                  {k > 0 && <i className="tl-cut" title="Cut" />}
                </span>
              ))}
              <button className="tl-handle start" style={{ left: -6 + (trim?.edge === 'start' ? trim.dx : 0) }} onPointerDown={trimEdge('start')} onKeyDown={keyTrim('start')} aria-label={`Clip start, ${fmt(clip.start)} in the video. Arrows move it word by word.`} />
              <button className="tl-handle end" style={{ left: blocks.length ? blocks.at(-1)!.x + blocks.at(-1)!.w - 6 + (trim?.edge === 'end' ? trim.dx : 0) : 0 }} onPointerDown={trimEdge('end')} onKeyDown={keyTrim('end')} aria-label={`Clip end, ${fmt(clip.end)} in the video. Arrows move it word by word.`} />
            </div>
            <div className="tl-track caps" aria-label="Captions">
              {lines.map((l, k) => <span key={k} className={`tl-cap ${t >= l.s && t < l.e ? 'on' : ''}`} style={{ left: px(l.s), width: Math.max(4, px(l.e - l.s)) }} title={l.words.map(w => w.text).join(' ')}>{l.words.map(w => w.text).join(' ')}</span>)}
            </div>
            <div className="tl-track" aria-label="B-roll">
              {!clip.broll.length && <span className="tl-empty">No B-roll yet. Juno suggests shots in Brand.</span>}
              {clip.broll.map(b => (
                <button key={b.id} className="tl-broll" style={{ left: px(toClipTime(segs, b.at)) + (moving?.id === b.id ? moving.dx : 0), width: px(b.dur) }} onPointerDown={moveBroll(b.id)}
                  aria-label={`${BROLL.find(x => x.id === b.asset)?.label} at ${fmt(toClipTime(segs, b.at))}. Drag to move.`}>
                  {BROLL.find(x => x.id === b.asset)?.label}
                </button>
              ))}
            </div>
            {music && <div className="tl-track" aria-label="Music"><span className="tl-music" style={{ left: 0, width: px(total) }}>{music.label} · {clip.brand.musicVol}%</span></div>}
            <span className="tl-playhead" style={{ left: px(t) }} aria-hidden />
          </div>
        </div>
      </div>
      </div>
    </section>
  )
}
