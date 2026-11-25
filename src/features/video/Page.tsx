import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, Clapperboard, Plus } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { hhmm } from '../../app/time'
import { PHASES, PHASE_MS, TRANSCRIPT, type Source } from '../../data/video'
import { Btn, Empty, Filters, Mark, Menu, Net, PageHead, Pill, Tabs } from '../../ui'
import { BulkBar, SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { CountBadge, Notice } from '../../ui/Feedback'
import { LANG_LABEL, captionSlips, type Clip } from './model'
import { ClipThumb, ScoreBadge, SourceThumb, clipScore } from './parts'
import { holdReason } from './slice'
import Sources, { SourceDetail } from './Sources'
import BrandKit from './BrandKit'
import Editor from './Editor'
import './video.css'

type Tab = 'clips' | 'sources' | 'brand'
export const DISMISS_REASONS = ['Off-brand', 'Weak moment', 'Already covered', 'Wrong speaker']

export default function VideoPage() {
  const { s } = useStore()
  const nav = useNavigate()
  const rest = (useParams()['*'] ?? '').split('/')
  if (rest[0] === 'clips' && rest[1]) return <Editor key={rest[1]} id={rest[1]} />
  const tab: Tab = rest[0] === 'sources' ? 'sources' : rest[0] === 'brand' ? 'brand' : 'clips'
  const ready = s.video.clips.filter(c => c.status === 'ready').length
  const working = s.video.sources.filter(x => x.status === 'processing').length

  return (
    <div className="page video-page">
      <PageHead agent="juno" title="Video" lede="Juno watches your videos and lives, finds the moments worth sharing and cuts them into captioned clips. You review, Atlas schedules.">
        <Btn variant="primary" onClick={() => nav('/video/sources')}><Plus size={14} />Add a video</Btn>
      </PageHead>
      <Tabs value={tab} onChange={t => nav(t === 'clips' ? '/video' : `/video/${t}`)} items={[
        { value: 'clips', label: <>Clips{ready > 0 && <CountBadge n={ready} needs label={`${ready} ready to review`} />}</> },
        { value: 'sources', label: <>Sources{working > 0 && <span className="faint t-xs">· {working} in progress</span>}</> },
        { value: 'brand', label: 'Brand kit' },
      ]} />
      {tab === 'clips' && <Clips />}
      {tab === 'sources' && (rest[1] ? <SourceDetail id={rest[1]} /> : <Sources />)}
      {tab === 'brand' && <BrandKit />}
    </div>
  )
}

/* ---------- Clips ---------- */

/** Juno's one-sentence summary at the top of the list. */
function summary(clips: Clip[], sources: Source[]) {
  const ready = clips.filter(c => c.status === 'ready')
  const working = sources.find(x => x.status === 'processing')
  const from = new Set(ready.map(c => c.source)).size
  const head = ready.length ? `${ready.length} clip${ready.length > 1 ? 's' : ''} ready to review, from ${from} video${from > 1 ? 's' : ''}.` : 'Nothing to review right now.'
  return working ? `${head} I’m working on “${working.title}”.` : `${head} I check your channel every 15 minutes.`
}

function NotNow({ c, size }: { c: Clip; size?: 'sm' }) {
  const { d } = useStore()
  return (
    <Menu align="end" trigger={<Btn size={size} variant="ghost" onClick={e => e.stopPropagation()}>Not now<ChevronDown size={12} /></Btn>}
      items={[
        { label: 'Back tomorrow at 08:00', onSelect: () => d({ type: 'video/snooze', ids: [c.id] }) },
        'sep', { heading: 'Dismiss: why?' },
        ...DISMISS_REASONS.map(r => ({ label: r, onSelect: () => d({ type: 'video/dismiss', id: c.id, reason: r }) })),
      ]} />
  )
}
export { NotNow as ClipNotNow }

function ClipRow({ c, src, sel, now }: { c: Clip; src: Source; sel: ReturnType<typeof useSelection>; now: number }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const sc = clipScore(c, src)
  const proof = c.evidence[0]
  // What Juno left for you on this clip, by her level on each action.
  const slips = Object.keys(captionSlips(c, TRANSCRIPT[src.transcript])).length
  const review = c.audio.review?.length ?? 0
  const held = c.status === 'ready' || c.status === 'snoozed' ? holdReason(s, c) : undefined
  const todo = c.status !== 'ready' && c.status !== 'snoozed' ? [] : [
    held ? `Held: ${held}` : '',
    slips ? `${slips} caption${slips > 1 ? 's' : ''} to fix` : '',
    c.framing === 'check' ? 'Framing to check' : c.framing === 'suggested' ? 'Framing suggested' : '',
    review ? `${review} language version${review > 1 ? 's' : ''} to review` : '',
  ].filter(Boolean)
  const posts = c.posts?.map(id => s.publishing.posts.find(p => p.id === id)).filter(Boolean) ?? []
  const stop = (f: () => void) => (e: MouseEvent) => { e.stopPropagation(); f() }
  return (
    <article className={`idea-row clip-row ${now - c.arrivedAt < 120_000 ? 'arrive' : ''} ${sel.has(c.id) ? 'picked' : ''}`}
      onClick={e => { if (!(e.target as Element).closest('a, button, input, label, [role="menu"]')) nav(`/video/clips/${c.id}`) }}>
      <span className="idea-check">{c.status === 'ready' && <SelectBox checked={sel.has(c.id)} visible={sel.count > 0} onToggle={shift => sel.toggle(c.id, shift)} label={`Select: ${c.title}`} />}</span>
      <ClipThumb clip={c} source={src} size="sm" />
      <div className="idea-text">
        <h3><Link to={`/video/clips/${c.id}`} className="idea-title">{c.title}</Link></h3>
        <p className="idea-proof"><span>“{c.hook}”</span></p>
        <p className="idea-meta">
          <ScoreBadge value={sc.total} />
          {proof && <span>{proof.value} {proof.label}</span>}
          <span className="row tight nowrap">{c.post.networks.map(n => <Net key={n} n={n} size={16} />)}</span>
          <span>{src.title}</span>
          {c.audio.dubs.length > 0 && <span title={c.audio.dubs.map(l => LANG_LABEL[l]).join(', ')}>{c.audio.dubs.map(l => l.toUpperCase()).join(' ')}</span>}
          {c.edited && <span>Edited by you</span>}
          {todo.map(t => <span key={t}>{t}</span>)}
        </p>
      </div>
      <div className="idea-acts">
        {c.status === 'ready' && <><Btn size="sm" onClick={stop(() => nav(`/video/clips/${c.id}`))}>Review</Btn><Btn size="sm" variant="primary" onClick={stop(() => d({ type: 'video/send', ids: [c.id] }))}>Send to Atlas</Btn><NotNow c={c} size="sm" /></>}
        {c.status === 'snoozed' && <><Pill>Back tomorrow 08:00</Pill><Btn size="sm" onClick={stop(() => d({ type: 'video/send', ids: [c.id] }))}>Send to Atlas</Btn></>}
        {c.status === 'sent' && <Link className="link-btn" to="/publishing/calendar" onClick={e => e.stopPropagation()}>{posts.length ? `Scheduled ${posts.map(p => `${new Date(p!.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} ${hhmm(p!.at)}`)[0]}${posts.length > 1 ? ` +${posts.length - 1}` : ''}` : 'In the calendar'}</Link>}
        {c.status === 'published' && c.stats && <span className="muted t-sm">{(c.stats.views / 1000).toFixed(1)}k views · {c.stats.er}% engagement{c.stats.retention ? ` · ${c.stats.retention}% watched` : ''}</span>}
      </div>
    </article>
  )
}

/** A video Juno is still working on: the phase, and how far she is. */
function MakingRow({ src, now }: { src: Source; now: number }) {
  const nav = useNavigate()
  const elapsed = Math.max(0, now - (src.startedAt ?? now))
  const k = Math.min(PHASES.length - 1, Math.floor(elapsed / PHASE_MS))
  const pct = Math.min(99, Math.round((elapsed / (PHASES.length * PHASE_MS)) * 100))
  return (
    <article className="idea-row clip-row making" onClick={() => nav(`/video/sources/${src.id}`)}>
      <span />
      <SourceThumb source={src} />
      <div className="idea-text">
        <h3><Link to={`/video/sources/${src.id}`} className="idea-title">{src.title}</Link></h3>
        <p className="idea-meta"><span>{PHASES[k]} · step {k + 1} of {PHASES.length}</span><span>{src.channel}</span></p>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${src.title}: ${pct}%`}><span style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="idea-acts"><span className="muted t-sm num">{pct}%</span></div>
    </article>
  )
}

function Clips() {
  const { s, d } = useStore()
  const now = useNow(1000)
  const loc = useLocation()
  const nav = useNavigate()
  const [only, setOnly] = useState(new URLSearchParams(loc.search).get('source') ?? 'all')
  const srcOf = (c: Clip) => s.video.sources.find(x => x.id === c.source)!
  const clips = s.video.clips.filter(c => only === 'all' || c.source === only)
  const by = (st: Clip['status']) => clips.filter(c => c.status === st).sort((a, b) => clipScore(b, srcOf(b)).total - clipScore(a, srcOf(a)).total)
  const ready = by('ready')
  const readyIds = useMemo(() => ready.map(c => c.id), [ready.map(c => c.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(readyIds)
  const making = s.video.sources.filter(x => x.status === 'processing' && (only === 'all' || x.id === only))
  const withClips = s.video.sources.filter(x => s.video.clips.some(c => c.source === x.id))

  const group = (key: string, title: string, list: Clip[], head?: ReactNode, extra?: ReactNode) => (list.length > 0 || extra) && (
    <section className="ideas-group" aria-labelledby={`vg-${key}`}>
      <header>
        {head}<h2 id={`vg-${key}`}>{title}</h2>{key === 'ready' && <CountBadge n={list.length} />}
        <span className="spacer" />
        {key === 'ready' && list.length > 1 && !sel.count && <Btn size="sm" onClick={() => d({ type: 'video/send', ids: readyIds })}>Send {list.length} to Atlas</Btn>}
      </header>
      <div className="ideas-rows">{extra}{list.map(c => <ClipRow key={c.id} c={c} src={srcOf(c)} sel={sel} now={now} />)}</div>
    </section>
  )

  return (
    <div className="ideas-main">
      <p className="ideas-lede" aria-live="polite"><Mark agent="juno" /><span>{summary(s.video.clips, s.video.sources)}</span></p>
      {withClips.length > 1 && (
        <Filters label="Filter by video" value={only} onChange={v => { setOnly(v); nav(v === 'all' ? '/video' : `/video?source=${v}`, { replace: true }) }}
          items={[{ value: 'all', label: 'All videos' }, ...withClips.map(x => ({ value: x.id, label: x.title, count: s.video.clips.filter(c => c.source === x.id && c.status === 'ready').length || undefined }))]} />
      )}
      {sel.count > 0
        ? <BulkBar count={sel.count} noun={sel.count > 1 ? 'clips selected' : 'clip selected'} onClear={sel.clear} actions={[
          { label: `Send ${sel.count} to Atlas`, primary: true, onRun: () => { d({ type: 'video/send', ids: [...sel.selected] }); sel.clear() } },
          { label: 'Back tomorrow', onRun: () => { d({ type: 'video/snooze', ids: [...sel.selected] }); sel.clear() } },
        ]} />
        : <Notice scope="video" className="video-notice" />}
      {!clips.length && !making.length ? (
        <Empty icon={<Clapperboard size={18} />} title="No clips yet" body="Juno cuts clips as soon as a new video lands on your channel. You can also add a link or a file." action={<Btn onClick={() => nav('/video/sources')}>Add a video</Btn>} />
      ) : (
        <>
          {group('ready', 'Ready to review', ready, readyIds.length > 0 && <SelectAll sel={sel} label="Select every ready clip" />)}
          {group('making', 'Being made', [], undefined, making.length > 0 && making.map(x => <MakingRow key={x.id} src={x} now={now} />))}
          {group('later', 'Later', by('snoozed'))}
          {group('sent', 'Sent to Atlas', by('sent'))}
          {group('published', 'Published', by('published'))}
        </>
      )}
    </div>
  )
}

