// Small pieces of Video used elsewhere too: the clip thumbnail, the Desk preview, the score.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Play } from 'lucide-react'
import { useStore } from '../../app/store'
import { Net } from '../../ui'
import Photo from '../../ui/Photo'
import { TRANSCRIPT, mediaUrl, type Source } from '../../data/video'
import { SWATCH, display, duration, keptSegments, rescore, type CapLine, type Captions, type Clip } from './model'

/** A scene to draw while the poster loads, or when it's missing. */
const SCENE: Record<string, string> = { repair: 'workshop', gr20: 'rain', live: 'workshop' }

export const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
export const clipLength = (c: Clip, src: Source) => duration(keptSegments(c, TRANSCRIPT[src.transcript]))
export const clipScore = (c: Clip, src: Source) => rescore(c, TRANSCRIPT[src.transcript])

export function useClip(id?: string) {
  const { s } = useStore()
  const clip = s.video.clips.find(c => c.id === id)
  const source = clip && s.video.sources.find(x => x.id === clip.source)
  return clip && source ? { clip, source } : undefined
}

/** One frame of the source video, cropped like the clip: the browser shows the frame at `#t`, no image needed. */
export function CoverFrame({ source, at, focus, text }: { source: Source; at: number; focus: number; text?: string }) {
  return (
    <>
      <video className="cover-frame" src={`${mediaUrl(`${source.media}/video.mp4`)}#t=${at}`} preload="metadata" muted playsInline tabIndex={-1} style={{ objectPosition: `${focus * 100}% 50%` }} />
      {text && <span className="cover-text">{text}</span>}
    </>
  )
}

/** Focus of the shot on screen at a source time. */
export const focusAt = (c: Clip, source: Source, at: number) => c.focus ?? TRANSCRIPT[source.transcript].shots.find(x => at >= x.s && at < x.e)?.focus ?? 0.5

/** The clip's cover, or the source's poster, framed like the clip (9:16 by default), with its length. */
export function ClipThumb({ clip, source, size = 'md' }: { clip: Clip; source: Source; size?: 'sm' | 'md' | 'lg' }) {
  const [broken, setBroken] = useState(false)
  const focus = clip.focus ?? TRANSCRIPT[source.transcript].shots[0]?.focus ?? 0.5
  return (
    <span className={`clip-thumb ${size} a-${clip.aspect.replace(':', 'x')}`} aria-hidden>
      {clip.cover && source.kind !== 'upload' ? <CoverFrame source={source} at={clip.cover.at} focus={focusAt(clip, source, clip.cover.at)} text={size === 'lg' ? clip.cover.text : undefined} />
        : broken ? <Photo name={SCENE[source.media] ?? 'workshop'} /> : <img src={mediaUrl(`${source.media}/poster.jpg`)} alt="" style={{ objectPosition: `${focus * 100}% 50%` }} onError={() => setBroken(true)} loading="lazy" />}
      <span className="clip-thumb-len mono">{fmt(clipLength(clip, source))}</span>
    </span>
  )
}

/** Uploaded files play for this session only: blob URLs die on reload. */
export const SESSION_BLOBS = new Set<string>()
export const playable = (src: Source) => src.kind !== 'upload' || (!!src.blob && SESSION_BLOBS.has(src.blob))
export const videoUrl = (src: Source) => (src.kind === 'upload' ? src.blob! : mediaUrl(`${src.media}/video.mp4`))

/** The source's poster, 16:9. */
export function SourceThumb({ source }: { source: Source }) {
  const [broken, setBroken] = useState(false)
  return (
    <span className="src-thumb" aria-hidden>
      {broken || source.kind === 'upload' ? <Photo name={SCENE[source.media] ?? 'workshop'} /> : <img src={mediaUrl(`${source.media}/poster.jpg`)} alt="" onError={() => setBroken(true)} loading="lazy" />}
    </span>
  )
}

/** One caption line as it appears inside the video. Styles here are content (Fernway colours, capitals), not UI. */
export function CaptionText({ c, line, active }: { c: Captions; line?: CapLine; active: number }) {
  if (!line) return null
  return (
    <div className={`cap cap-${c.template} cap-f-${c.font}`} style={{ top: `${c.y}%`, fontSize: `${c.size * 0.75}cqh`, ['--hl' as string]: SWATCH[c.color] }}>
      <span className="cap-line">
        {line.words.map((w, k) => <span key={k} className={`cap-w ${k === active ? 'on' : ''} ${w.key ? 'key' : ''}`}>{display(c, w)}</span>)}
      </span>
    </div>
  )
}

/** "Virality 87": the metric always named. */
export function ScoreBadge({ value }: { value: number }) {
  return <span className={`score-badge ${value >= 85 ? 'high' : value >= 70 ? 'mid' : 'low'}`}><span className="faint">Virality</span> <b className="num">{value}</b></span>
}

/** A clip on a Desk card. */
export function ClipPreview({ id }: { id: string }) {
  const nav = useNavigate()
  const found = useClip(id)
  if (!found) return <div className="well preview"><p className="muted">This clip is no longer in Video.</p></div>
  const { clip, source } = found
  return (
    <div className="well preview clip-preview">
      <button className="clip-preview-thumb" onClick={() => nav(`/video/clips/${clip.id}`)} aria-label={`Open “${clip.title}” in the editor`}>
        <ClipThumb clip={clip} source={source} size="lg" /><span className="clip-play"><Play size={18} aria-hidden /></span>
      </button>
      <div className="stack">
        <div><b>{clip.title}</b><div className="muted">“{clip.hook}”</div></div>
        <div className="row tight"><ScoreBadge value={clipScore(clip, source).total} /><span className="row tight">{clip.post.networks.map(n => <Net key={n} n={n} />)}</span></div>
        <div className="muted t-sm">From {source.title}</div>
        <button className="link-btn row tight self-start" onClick={() => nav(`/video/clips/${clip.id}`)}>Review in the editor <ArrowRight size={12} /></button>
      </div>
    </div>
  )
}
