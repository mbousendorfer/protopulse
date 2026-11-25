// The clip as it plays: one <video> driven frame by frame, removed ranges skipped, and every layer computed from (clip, t).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BROLL, MUSIC, TRANSCRIPT, mediaUrl, type Source } from '../../data/video'
import { captionAt, captionLines, duration, keptSegments, playableAt, toClipTime, toSourceTime, type Clip } from './model'
import { CaptionText, playable, videoUrl } from './parts'

export type Playback = ReturnType<typeof usePlayback>

/** Owns the media elements. `t` is clip time (cuts removed), `src` the source time. */
export function usePlayback(clip: Clip, source: Source) {
  const tr = TRANSCRIPT[source.transcript]
  const segs = useMemo(() => keptSegments(clip, tr), [clip, tr])
  const total = duration(segs)
  const video = useRef<HTMLVideoElement>(null)
  const voice = useRef<HTMLAudioElement>(null)
  const music = useRef<HTMLAudioElement>(null)
  const [t, setT] = useState(0)
  const [src, setSrc] = useState(segs[0]?.s ?? clip.start)
  const [playing, setPlaying] = useState(false)
  const [original, setOriginal] = useState(false)
  const spoken = useRef(new Set<number>())
  const segsRef = useRef(segs)
  segsRef.current = segs

  /** Which voice plays: a dub, the cleaned voice, or the video's own track ("Hear the original" forces it). */
  const voiceFile = original ? undefined : clip.audio.lang !== 'en' ? `${source.media}/dub-${clip.audio.lang}.m4a` : clip.audio.studio ? `${source.media}/clean.m4a` : undefined

  // Overdubbed words, grouped in runs, with the text to say instead.
  const overdubs = useMemo(() => {
    const runs: { s: number; e: number; text: string; key: number }[] = []
    for (const w of tr.words) {
      if (!(w.i in clip.overdub)) continue
      const last = runs.at(-1)
      if (last && tr.words[w.i - 1] && w.i - 1 in clip.overdub && last.e === tr.words[w.i - 1].e) { last.e = w.e; last.text += clip.overdub[w.i] ? ` ${clip.overdub[w.i]}` : '' }
      else runs.push({ s: w.s, e: w.e, text: clip.overdub[w.i], key: w.i })
    }
    return runs
  }, [clip.overdub, tr])

  const seekSource = useCallback((x: number) => {
    const v = video.current
    if (!v) return
    const ok = playableAt(segsRef.current, x) ?? segsRef.current[0]?.s ?? x
    v.currentTime = ok
    if (voice.current) voice.current.currentTime = ok
    setSrc(ok); setT(toClipTime(segsRef.current, ok))
    spoken.current.clear()
  }, [])
  const seek = useCallback((clipT: number) => seekSource(toSourceTime(segsRef.current, Math.max(0, clipT))), [seekSource])

  const play = useCallback(() => {
    const v = video.current
    if (!v) return
    if (playableAt(segsRef.current, v.currentTime) === null || v.currentTime < (segsRef.current[0]?.s ?? 0) - 0.05) seekSource(segsRef.current[0]?.s ?? 0)
    void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    void voice.current?.play().catch(() => {})
    void music.current?.play().catch(() => {})
  }, [seekSource])
  const pause = useCallback(() => {
    video.current?.pause(); voice.current?.pause(); music.current?.pause()
    window.speechSynthesis?.cancel()
    setPlaying(false)
  }, [])
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play])

  // Edits move the clip: keep the playhead inside what plays.
  useEffect(() => { if (video.current && !playing) seekSource(video.current.currentTime || segs[0]?.s || 0) }, [segs]) // eslint-disable-line react-hooks/exhaustive-deps

  // The frame loop: skip removed ranges, stop at the end, keep the side tracks in sync, speak overdubs.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      const v = video.current
      if (!v) return
      const ok = playableAt(segsRef.current, v.currentTime)
      if (ok === null) { pause(); setT(duration(segsRef.current)); return }
      if (ok !== v.currentTime && ok - v.currentTime > 0.03) v.currentTime = ok
      const a = voice.current
      if (a && Math.abs(a.currentTime - v.currentTime) > 0.2) a.currentTime = v.currentTime
      const run = overdubs.find(r => v.currentTime >= r.s - 0.02 && v.currentTime < r.e)
      const silenced = !!run
      v.muted = silenced || !!a
      if (a) a.muted = silenced
      if (run && !spoken.current.has(run.key) && run.text && 'speechSynthesis' in window) {
        spoken.current.add(run.key)
        const u = new SpeechSynthesisUtterance(run.text)
        u.lang = 'en-US'
        u.voice = window.speechSynthesis.getVoices().find(x => /^Flo/.test(x.name) && x.lang.startsWith('en')) ?? null
        window.speechSynthesis.speak(u)
      }
      setSrc(v.currentTime); setT(toClipTime(segsRef.current, v.currentTime))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, overdubs, pause])

  // Music follows the mix settings; ducked under the voice.
  useEffect(() => { if (music.current) music.current.volume = Math.min(1, (clip.brand.musicVol / 100) * (clip.brand.duck ? 0.45 : 1)) }, [clip.brand.musicVol, clip.brand.duck, clip.brand.music])
  // A new voice track starts where the video is.
  useEffect(() => {
    const a = voice.current, v = video.current
    if (!v) return
    v.muted = !!voiceFile
    if (a && voiceFile) { a.currentTime = v.currentTime; if (playing) void a.play().catch(() => {}) }
  }, [voiceFile]) // eslint-disable-line react-hooks/exhaustive-deps

  const musicFile = clip.brand.music && MUSIC.find(m => m.id === clip.brand.music)?.file
  const elements = (
    <>
      {voiceFile && <audio ref={voice} src={mediaUrl(voiceFile)} preload="auto" />}
      {musicFile && <audio ref={music} src={mediaUrl(musicFile)} loop preload="auto" />}
    </>
  )
  return { video, segs, total, t, src, playing, play, pause, toggle, seek, seekSource, elements, original, setOriginal, tr }
}

/** The frame: video reframed, B-roll, brand layers and captions. Pure function of (clip, t). */
export function Frame({ clip, source, pb, safe, outro }: { clip: Clip; source: Source; pb: Playback; safe?: boolean | { bottom: number; right: number }; outro: string }) {
  const { tr, t, src, total } = pb
  const lines = useMemo(() => captionLines(clip, tr), [clip, tr])
  const cap = captionAt(lines, Math.max(t, lines[0]?.s ?? 0))
  const shot = tr.shots.find(x => src >= x.s && src < x.e) ?? tr.shots[0]
  const focus = clip.frame === 'track' ? clip.focus ?? shot?.focus ?? 0.5 : clip.focus ?? 0.5
  const broll = clip.broll.find(b => src >= b.at && src < b.at + b.dur)
  const brollFile = (id?: string) => BROLL.find(b => b.id === id)?.file
  const splitFile = brollFile(clip.broll[0]?.asset) ?? brollFile('trail')
  const poster = source.kind === 'upload' ? undefined : mediaUrl(`${source.media}/poster.jpg`)
  return (
    <div className={`frame a-${clip.aspect.replace(':', 'x')} f-${clip.frame}`}>
      {clip.frame === 'fit' && poster && <img className="frame-blur" src={poster} alt="" aria-hidden />}
      {playable(source)
        ? <video ref={pb.video} className="frame-video" src={videoUrl(source)} poster={poster} playsInline preload="auto" style={{ objectPosition: `${focus * 100}% 50%` }} />
        : <div className="frame-gone"><p>Upload the file again to play it.</p></div>}
      {clip.frame === 'split' && splitFile && <video className="frame-split" src={mediaUrl(splitFile)} muted loop autoPlay playsInline aria-hidden />}
      {broll && brollFile(broll.asset) && <video key={broll.id} className="frame-broll" src={mediaUrl(brollFile(broll.asset)!)} muted autoPlay playsInline aria-hidden />}
      {clip.brand.intro && t < 2 && <div className="frame-hook">{clip.hook}</div>}
      <CaptionText c={clip.captions} line={cap.line} active={clip.captions.template === 'clean' || clip.captions.template === 'boxed' ? -1 : cap.active} />
      {clip.brand.logo && <svg className="frame-logo" viewBox="0 0 90 20" aria-hidden><text x="0" y="15" fontSize="15" fontWeight="700" fill="#fff">fernway</text></svg>}
      {clip.brand.outro && total > 4 && t > total - 2 && <div className="frame-outro"><b>fernway</b><span>{outro}</span></div>}
      {clip.brand.progress && <div className="frame-progress" style={{ width: `${total ? (t / total) * 100 : 0}%` }} />}
      {safe === true && <div className={`frame-safe ${clip.aspect === '9:16' ? 'vertical' : ''}`} aria-hidden><span className="safe-rail" /><span className="safe-bottom" /></div>}
      {typeof safe === 'object' && <div className="frame-safe" aria-hidden>
        {safe.right > 0 && <span style={{ right: 0, bottom: `${safe.bottom}%`, width: `${safe.right}%`, height: '40%' }} />}
        {safe.bottom > 0 && <span style={{ left: 0, right: 0, bottom: 0, height: `${safe.bottom}%` }} />}
      </div>}
    </div>
  )
}
