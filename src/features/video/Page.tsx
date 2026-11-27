import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, Plus } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { hhmm } from '../../app/time'
import { PHASES, PHASE_MS, TRANSCRIPT, type Source } from '../../data/video'
import { Btn, Empty, Filters, Menu, Net, PageHead, Pill, Tabs } from '../../ui'
import { BulkBar, SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { CountBadge, Notice } from '../../ui/Feedback'
import { InfoPop } from '../../ui/More'
import { LANG_LABEL, NETWORK_FIT, captionSlips, winnerOf, type Clip } from './model'
import { ClipThumb, ScoreBadge, SourceThumb, clipScore } from './parts'
import { flopOf, holdReason, recutOf, unreleased, vetClips, videoNeeds, WEEKLY_QUOTA } from './slice'
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
  const needs = videoNeeds(s).count
  const working = s.video.sources.filter(x => x.status === 'processing').length

  return (
    <div className="page video-page">
      <PageHead agent="juno" title="Video" lede="Juno cuts your videos into clips; you review, Atlas schedules.">
        <Btn variant="primary" onClick={() => nav('/video/sources')}><Plus size={14} />Add a video</Btn>
      </PageHead>
      <Tabs value={tab} onChange={t => nav(t === 'clips' ? '/video' : `/video/${t}`)} items={[
        { value: 'clips', label: <>Clips{needs > 0 && <CountBadge n={needs} needs label={`${needs} need you`} />}</> },
        { value: 'sources', label: <>Sources{working > 0 && <span className="faint t-xs">· {working} in progress</span>}</> },
        { value: 'brand', label: 'Brand kit' },
      ]} />
      {tab === 'clips' && <Clips />}
      {tab === 'sources' && (rest[1] ? <SourceDetail id={rest[1]} /> : <Sources />)}
      {tab === 'brand' && <BrandKit />}
    </div>
  )
}

/* ---------- Clips: what waits for Sam first, then the rest ---------- */

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

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const isInteractive = (e: MouseEvent) => !!(e.target as Element).closest('a, button, input, label, [role="menu"]')

/** What Juno left for Sam on a clip she'd send: captions, framing, language versions. Never blocking. */
function leftToCheck(c: Clip, src: Source) {
  const slips = Object.keys(captionSlips(c, TRANSCRIPT[src.transcript])).length
  const review = c.audio.review?.length ?? 0
  return [
    slips ? plural(slips, 'caption') + ' to fix' : '',
    c.framing === 'check' ? 'Framing to check' : c.framing === 'suggested' ? 'Framing suggested' : '',
    review ? `${c.audio.review!.map(l => l.toUpperCase()).join(' ')} version${review > 1 ? 's' : ''} to review` : '',
  ].filter(Boolean)
}

/**
 * One clip, one row (matrix §14): frame and length, title and hook, one line of proof, a status only when it isn't the
 * filter's own (« Held », « Next week », « Below usual »), its « Why? », then the row's decisions.
 */
function ClipRow({ c, src, now, check, status, acts }: { c: Clip; src: Source; now: number; check?: ReactNode; status?: ReactNode; acts: ReactNode }) {
  const nav = useNavigate()
  // A finished hook trial is the clip's best proof.
  const won = c.trial?.held ? winnerOf({ hooks: c.trial.hooks, held: c.trial.held }) : undefined
  // A clip found on request is titled after its own first line: say that line once, and prove it with something else.
  const echo = c.hook.startsWith(c.title.replace(/…$/, ''))
  const proof = c.evidence.find(e => !e.label.includes(c.hook.slice(0, 24)))
  const dubs = c.audio.dubs.filter(l => c.status !== 'ready' || !c.audio.review?.includes(l))
  const todo = c.status === 'ready' ? [...leftToCheck(c, src), won !== undefined && c.hook !== c.trial!.hooks[won] ? 'Its hook isn’t the trial winner yet' : ''].filter(Boolean) : []
  return (
    <li className={`dq-row ${now - c.arrivedAt < 120_000 ? 'arrive' : ''}`} onClick={e => { if (!isInteractive(e)) nav(`/video/clips/${c.id}`) }}>
      <span className="dq-check">{check}</span>
      <ClipThumb clip={c} source={src} size="sm" />
      <div className="dq-main">
        <p className="dq-title">{echo ? <Link to={`/video/clips/${c.id}`} className="dq-name">“{c.hook}”</Link> : <><Link to={`/video/clips/${c.id}`} className="dq-name">{c.title}</Link><span className="dq-hook">“{c.hook}”</span></>}</p>
        <p className="dq-line">
          <ScoreBadge value={clipScore(c, src).total} />
          <span className="row tight nowrap">{c.post.networks.map(n => <Net key={n} n={n} size={14} />)}</span>
          {dubs.length > 0 && <span title={dubs.map(l => LANG_LABEL[l]).join(', ')}>{dubs.map(l => l.toUpperCase()).join(' ')}</span>}
          {c.edited && <span>Edited by you</span>}
          {status}
          {todo.length > 0 && <InfoPop label={`${plural(todo.length, 'thing')} to check`}>{todo.join(' · ')}</InfoPop>}
          {won !== undefined
            ? <span className="dq-proof"><b className="num">{Math.max(...c.trial!.held!)}%</b> still watching at 3 s · won its hook trial</span>
            : proof && !c.stats && <span className="dq-proof"><b className="num">{proof.value}</b> {proof.label}</span>}
        </p>
      </div>
      <div className="dq-acts">{acts}</div>
    </li>
  )
}

/** A video Juno is still working on: the phase, and how far she is. */
function MakingRow({ src, now }: { src: Source; now: number }) {
  const nav = useNavigate()
  const elapsed = Math.max(0, now - (src.startedAt ?? now))
  const k = Math.min(PHASES.length - 1, Math.floor(elapsed / PHASE_MS))
  const pct = Math.min(99, Math.round((elapsed / (PHASES.length * PHASE_MS)) * 100))
  return (
    <li className="dq-row is-source" onClick={e => { if (!isInteractive(e)) nav(`/video/sources/${src.id}`) }}>
      <span className="dq-check" />
      <SourceThumb source={src} />
      <div className="dq-main">
        <p className="dq-title"><Link to={`/video/sources/${src.id}`} className="dq-name">{src.title}</Link></p>
        <p className="dq-line"><span>{PHASES[k]} · step {k + 1} of {PHASES.length}</span><span className="dq-src">{src.channel}</span></p>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${src.title}: ${pct}%`}><span style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="dq-acts"><span className="t-sm num">{pct}% done</span></div>
    </li>
  )
}

type Show = 'needs' | 'making' | 'trial' | 'snoozed' | 'sent' | 'published'
const SHOW_LABEL: Record<Show, string> = { needs: 'Needs you', making: 'Being made', trial: 'On trial', snoozed: 'Later', sent: 'Sent to Atlas', published: 'Published' }

/** A status that isn't the filter's own, and its reason one click away (matrix §13–14). */
const Status = ({ label, tone, why }: { label: string; tone?: 'alert' | 'caution'; why: ReactNode }) =>
  <><Pill tone={tone}>{label}</Pill><InfoPop label="Why?">{why}</InfoPop></>

/** Clips as a standard list (matrix §14): one Filters row by state, the video in a menu, one list, BulkBar. */
function Clips() {
  const { s, d } = useStore()
  const now = useNow(1000)
  const loc = useLocation()
  const nav = useNavigate()
  const [only, setOnly] = useState(new URLSearchParams(loc.search).get('source') ?? 'all')
  const srcOf = (c: Clip) => s.video.sources.find(x => x.id === c.source)!
  const clips = s.video.clips.filter(c => only === 'all' || c.source === only)
  const by = (st: Clip['status']) => clips.filter(c => c.status === st).sort((a, b) => clipScore(b, srcOf(b)).total - clipScore(a, srcOf(a)).total)

  // Needs you: videos waiting for a go, clips that did worse than usual, and every clip ready for review, best first.
  const needs = videoNeeds(s)
  const videos = needs.sources.filter(x => only === 'all' || x.id === only)
  const flops = needs.flops.filter(c => only === 'all' || c.source === only)
  const ready = by('ready')
  const toSend = ready.filter(c => !holdReason(s, c))
  // The weekly quota keeps some clips for next week: a status on those rows, not a banner.
  const batch = vetClips(s, toSend)
  const nextWeek = new Set(batch.held.filter(h => !holdReason(s, h.clip)).map(h => h.clip.id))
  const sendIds = useMemo(() => toSend.map(c => c.id), [toSend.map(c => c.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(sendIds)
  const making = s.video.sources.filter(x => x.status === 'processing' && (only === 'all' || x.id === only))
  const withClips = s.video.sources.filter(x => s.video.clips.some(c => c.source === x.id))
  const published = by('published').filter(c => !flops.includes(c))

  const counts: Record<Show, number> = { needs: videos.length + flops.length + ready.length, making: making.length, trial: by('trial').length, snoozed: by('snoozed').length, sent: by('sent').length, published: published.length }
  const shown = (Object.keys(SHOW_LABEL) as Show[]).filter(k => k === 'needs' || counts[k] > 0)
  const [pick, setShow] = useState<Show>('needs')
  const show = shown.includes(pick) ? pick : 'needs'

  const stop = (f: () => void) => (e: MouseEvent) => { e.stopPropagation(); f() }
  const review = (c: Clip, label = 'Review') => <Btn size="sm" onClick={stop(() => nav(`/video/clips/${c.id}`))}>{label}</Btn>
  const row = (c: Clip, acts: ReactNode, status?: ReactNode, check?: ReactNode) => <ClipRow key={c.id} c={c} src={srcOf(c)} now={now} check={check} status={status} acts={acts} />
  const source = only === 'all' ? 'All videos' : s.video.sources.find(x => x.id === only)?.title ?? 'All videos'
  const pickSource = (v: string) => { setOnly(v); nav(v === 'all' ? '/video' : `/video?source=${v}`, { replace: true }) }

  const readyRow = (c: Clip) => {
    const held = holdReason(s, c)
    if (held) {
      const who = unreleased(s, c)[0]
      return row(c, <>
        {who ? <Btn size="sm" onClick={stop(() => d({ type: 'video/release', person: who, signed: true }))}>Release signed</Btn> : review(c, 'Change the length')}
        <NotNow c={c} size="sm" />
      </>, <Status label="Held" tone="caution" why={`${held}. Juno won’t send it until that’s fixed.`} />)
    }
    return row(c, <>{review(c)}<NotNow c={c} size="sm" /></>,
      nextWeek.has(c.id) ? <Status label="Next week" why={`Juno sends ${WEEKLY_QUOTA} clips per video a week, best first. This one goes next week.`} /> : undefined,
      <SelectBox checked={sel.has(c.id)} visible onToggle={shift => sel.toggle(c.id, shift)} label={`Select: ${c.title}`} />)
  }
  const flopRow = (c: Clip) => {
    const f = flopOf(s, c)!
    return row(c, <Btn size="sm" onClick={stop(() => d({ type: 'video/recut', id: c.id }))}>Recut</Btn>,
      <Status label="Below usual" tone="caution" why={`${Math.round(f.share * 100)}% of your ${NETWORK_FIT[f.net] ?? f.net} average views. Juno recuts it with the product first.`} />)
  }
  const videoRow = (x: Source) => (
    <li key={x.id} className="dq-row is-source" onClick={e => { if (!isInteractive(e)) nav(`/video/sources/${x.id}`) }}>
      <span className="dq-check" />
      <SourceThumb source={x} />
      <div className="dq-main">
        <p className="dq-title"><Link to={`/video/sources/${x.id}`} className="dq-name">{x.title}</Link></p>
        <p className="dq-line">{x.status === 'failed' ? <Status label="Failed" tone="alert" why={x.error} /> : <span className="dq-src">New video · {x.channel} · {hhmm(x.at)}</span>}</p>
      </div>
      <div className="dq-acts">
        {x.status === 'failed'
          ? <><Btn size="sm" variant="ghost" onClick={stop(() => nav('/video/sources#add'))}>Upload instead</Btn><Btn size="sm" onClick={stop(() => d({ type: 'video/retry', id: x.id }))}>Retry</Btn></>
          : <Btn size="sm" onClick={stop(() => d({ type: 'video/start', id: x.id }))}>Make clips</Btn>}
      </div>
    </li>
  )

  const rows = show === 'needs' ? [...videos.map(videoRow), ...flops.map(flopRow), ...ready.map(readyRow)]
    : show === 'making' ? making.map(x => <MakingRow key={x.id} src={x} now={now} />)
    : show === 'trial' ? by('trial').map(c => row(c, <>
        <span className="t-sm nowrap">Results {new Date(c.trial!.until).toLocaleDateString('en-GB', { weekday: 'short' })} {hhmm(c.trial!.until)}</span>
        <Btn size="sm" variant="ghost" onClick={stop(() => d({ type: 'video/trialStop', id: c.id }))}>Stop the trial</Btn>
      </>))
    : show === 'snoozed' ? by('snoozed').map(c => row(c, <><Btn size="sm" variant="ghost" onClick={stop(() => d({ type: 'video/send', ids: [c.id] }))}>Send to Atlas</Btn>{review(c)}</>))
    : show === 'sent' ? by('sent').map(c => {
        const posts = (c.posts ?? []).map(id => s.publishing.posts.find(p => p.id === id)).filter(Boolean)
        const first = posts[0]
        return row(c, <Link className="link-btn t-sm nowrap" to="/publishing/calendar">{first ? `Scheduled ${new Date(first.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} ${hhmm(first.at)}${posts.length > 1 ? ` +${posts.length - 1}` : ''}` : 'In the calendar'}</Link>)
      })
    : published.map(c => {
        const recut = recutOf(s, c)
        return row(c, <>
          {c.stats ? <span className="t-sm nowrap">{(c.stats.views / 1000).toFixed(1)}k views · {c.stats.er}% engagement</span> : <Pill>Published</Pill>}
          {recut && <Link className="link-btn t-sm nowrap" to={`/video/clips/${recut.id}`}>{recut.status === 'ready' ? 'New cut to review' : 'New cut sent'}</Link>}
        </>)
      })

  return (
    <div className="dq-page">
      <div className="vq-bar">
        <Filters label="Show" value={show} onChange={v => { setShow(v); sel.clear() }}
          items={shown.map(k => ({ value: k, label: SHOW_LABEL[k], count: counts[k] }))} />
        {withClips.length > 1 && (
          <Menu align="end" trigger={<Btn size="sm" variant="ghost">{source}<ChevronDown size={12} /></Btn>}
            items={[{ label: 'All videos', onSelect: () => pickSource('all') }, ...withClips.map(x => ({ label: x.title, onSelect: () => pickSource(x.id) }))]} />
        )}
      </div>
      <Notice scope="video" className="video-notice" />
      {rows.length ? (
        <section className="card vq-list" aria-label={SHOW_LABEL[show]}>
          {show === 'needs' && toSend.length > 0 && (
            sel.count > 0
              ? <BulkBar count={sel.count} noun={sel.count > 1 ? 'clips selected' : 'clip selected'} onClear={sel.clear} actions={[
                  { label: `Send ${sel.count} to Atlas`, primary: true, onRun: () => { d({ type: 'video/send', ids: [...sel.selected] }); sel.clear() } },
                  { label: 'Not now', onRun: () => { d({ type: 'video/snooze', ids: [...sel.selected] }); sel.clear() } },
                ]} />
              : <div className="vq-list-head">
                  <SelectAll sel={sel} label="Select every clip ready to send" />
                  <span className="spacer" />
                  {batch.go.length > 0 && <Btn size="sm" variant="primary" onClick={() => d({ type: 'video/send', ids: sendIds })}>Send {batch.go.length} to Atlas</Btn>}
                </div>
          )}
          <ul className="dq-rows">{rows}</ul>
        </section>
      ) : <Empty title={show === 'needs' ? 'Nothing needs you here' : `Nothing ${SHOW_LABEL[show].toLowerCase()}`} />}
    </div>
  )
}
