import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, Plus, Settings2 } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import type { State } from '../../app/state'
import { DAY, hhmm } from '../../app/time'
import { PHASES, PHASE_MS, TRANSCRIPT, type Source } from '../../data/video'
import { Btn, Empty, Filters, Mark, Menu, Net, PageHead, Pill, Sheet, Tabs } from '../../ui'
import { Spark } from '../../ui/charts'
import { BulkBar, SelectAll, SelectBox, useSelection, type Selection } from '../../ui/Selection'
import { CountBadge, Notice } from '../../ui/Feedback'
import { InfoPop } from '../../ui/More'
import { netAverage } from '../insights/metrics'
import { LANG_LABEL, NETWORK_FIT, captionSlips, winnerOf, type Clip } from './model'
import { ClipThumb, ScoreBadge, SourceThumb, clipScore } from './parts'
import { flopOf, holdReason, recutOf, unreleased, vetClips, videoNeeds, WEEKLY_QUOTA } from './slice'
import Sources, { SourceCard, SourceDetail, Watching } from './Sources'
import BrandKit, { KitPreview } from './BrandKit'
import Editor from './Editor'
import './video.css'

type Tab = 'clips' | 'sources'
export const DISMISS_REASONS = ['Off-brand', 'Weak moment', 'Already covered', 'Wrong speaker']

/**
 * Video: Clips (the landing grid) and Sources (`/video/sources`, the videos). What Juno watches and the brand kit are setup, used
 * rarely: one Settings sheet over the clips (`/video/settings`; `/video/brand` redirects there).
 */
export default function VideoPage() {
  const { s } = useStore()
  const nav = useNavigate()
  const rest = (useParams()['*'] ?? '').split('/')
  if (rest[0] === 'clips' && rest[1]) return <Editor key={rest[1]} id={rest[1]} />
  if (rest[0] === 'brand') return <Navigate to="/video/settings" replace />
  const tab: Tab = rest[0] === 'sources' ? 'sources' : 'clips'
  const needs = videoNeeds(s).count

  return (
    <div className="page video-page">
      <PageHead agent="juno" title="Video" lede="Juno cuts your videos into clips; you review, Atlas schedules.">
        <Btn onClick={() => nav('/video/settings')}><Settings2 size={14} />Settings</Btn>
        <Btn variant="primary" onClick={() => nav('/video/sources#add')}><Plus size={14} />Add a video</Btn>
      </PageHead>
      <Tabs value={tab} onChange={t => nav(t === 'clips' ? '/video' : `/video/${t}`)} items={[
        { value: 'clips', label: <>Clips{needs > 0 && <CountBadge n={needs} needs label={`${needs} need you`} />}</> },
        { value: 'sources', label: 'Sources' },
      ]} />
      {tab === 'clips' && <Clips />}
      {tab === 'sources' && (rest[1] ? <SourceDetail id={rest[1]} /> : <Sources />)}
      <Sheet open={rest[0] === 'settings'} onOpenChange={o => !o && nav('/video')} title="Video settings">
        <div className="stack lg">
          <div className="kit-top"><KitPreview /><Watching /></div>
          <BrandKit />
        </div>
      </Sheet>
    </div>
  )
}

/* ---------- Pieces shared by the cards ---------- */

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
const k1 = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))

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

/** The clip's best proof: the hook trial it won, else the number that justifies the moment (not its own first line). */
function proofOf(c: Clip): ReactNode {
  const won = c.trial?.held ? winnerOf({ hooks: c.trial.hooks, held: c.trial.held }) : undefined
  if (won !== undefined) return <><b className="num">{Math.max(...c.trial!.held!)}%</b> still watching at 3 s · won its hook trial</>
  const p = c.evidence.find(e => !e.label.includes(c.hook.slice(0, 24)))
  return p && !c.stats ? <><b className="num">{p.value}</b> {p.label}</> : undefined
}

/** A status that isn't the filter's own, and its reason one click away (matrix §13–14). */
const Status = ({ label, tone, why }: { label: string; tone?: 'alert' | 'caution'; why: ReactNode }) =>
  <span className="vc-status"><Pill tone={tone}>{label}</Pill><InfoPop label="Why?">{why}</InfoPop></span>

/**
 * One clip as a vertical tile (matrix §15 « clip → thumbnail grid »): the frame large with its length and Virality badge,
 * the select box on the frame, the hook in two lines, networks and a status only when it isn't the filter's own, then
 * the card's decisions in its foot.
 */
function ClipCard({ c, src, now, sel, status, acts }: { c: Clip; src: Source; now: number; sel?: Selection; status?: ReactNode; acts: ReactNode }) {
  const nav = useNavigate()
  const dubs = c.audio.dubs.filter(l => c.status !== 'ready' || !c.audio.review?.includes(l))
  const todo = c.status === 'ready' ? leftToCheck(c, src) : []
  const picked = sel?.has(c.id)
  return (
    <li className={`card hoverable vc-card ${picked ? 'picked' : ''} ${now - c.arrivedAt < 120_000 ? 'arrive' : ''}`} onClick={e => { if (!isInteractive(e)) nav(`/video/clips/${c.id}`) }}>
      <div className="vc-frame">
        <ClipThumb clip={c} source={src} size="fill" />
        <span className="vc-score"><ScoreBadge value={clipScore(c, src).total} /></span>
        {sel && <span className="vc-check"><SelectBox checked={!!picked} visible={sel.count > 0} onToggle={shift => sel.toggle(c.id, shift)} label={`Select: ${c.title}`} /></span>}
      </div>
      <div className="vc-body">
        <p className="vc-hook"><Link to={`/video/clips/${c.id}`} title={c.title}>“{c.hook}”</Link></p>
        <p className="vc-meta">
          <span className="row tight nowrap">{c.post.networks.map(n => <Net key={n} n={n} size={14} />)}</span>
          {dubs.length > 0 && <span title={dubs.map(l => LANG_LABEL[l]).join(', ')}>{dubs.map(l => l.toUpperCase()).join(' ')}</span>}
          {c.edited && <span>Edited</span>}
          {todo.length > 0 && <InfoPop label={`${todo.length} to check`}>{todo.join(' · ')}</InfoPop>}
        </p>
        {status}
      </div>
      <div className="vc-acts">{acts}</div>
    </li>
  )
}

/* ---------- Overview: the week of clips, Juno's read, what she's cutting ---------- */

/** When a published clip went out: its first post, else when it was sent. */
const outAt = (s: State, c: Clip) => Math.min(...(c.posts ?? []).map(id => s.publishing.posts.find(p => p.id === id)?.at ?? Infinity), c.sentAt ?? Infinity)
// ponytail: a clip's views spread over its first days on a fixed decay; read Iris's daily numbers once she keeps them.
const DECAY = [0.45, 0.22, 0.12, 0.08, 0.06, 0.04, 0.03]

function Overview({ now }: { now: number }) {
  const { s } = useStore()
  const srcOf = (c: Clip) => s.video.sources.find(x => x.id === c.source)
  const ready = s.video.clips.filter(c => c.status === 'ready')
  const videos = new Set(ready.map(c => c.source)).size
  const week = s.video.clips.filter(c => c.status === 'published' && c.stats && outAt(s, c) > now - 7 * DAY)
  const views = week.reduce((n, c) => n + c.stats!.views, 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = now - (6 - i) * DAY
    return week.reduce((n, c) => { const k = Math.floor((day - outAt(s, c)) / DAY); return n + (k >= 0 && k < DECAY.length ? c.stats!.views * DECAY[k] : 0) }, 0)
  })
  const best = [...week].sort((a, b) => b.stats!.views - a.stats!.views)[0]
  const bestSrc = best && srcOf(best)
  const making = s.video.sources.find(x => x.status === 'processing')
  const el = making ? Math.max(0, now - (making.startedAt ?? now)) : 0
  const phase = Math.min(PHASES.length - 1, Math.floor(el / PHASE_MS))
  const pct = Math.min(99, Math.round((el / (PHASES.length * PHASE_MS)) * 100))

  // Juno's read: how this week's best clip did against its network, in one sentence.
  const net = best?.post.networks[0]
  const avg = net && netAverage(s, net)?.reach
  const lift = best && avg ? best.stats!.views / avg : undefined
  const say = !best ? (ready.length ? `Nothing went out this week. ${plural(ready.length, 'clip')} ${ready.length === 1 ? 'is' : 'are'} ready for Atlas.` : 'Nothing went out this week. Add a video and I’ll cut it.')
    : lift && lift >= 1 ? `“${best.title}” did ${lift.toFixed(1)}× your ${NETWORK_FIT[net!] ?? net} average. I rank clips like it first.`
    : `This week’s clips are under your ${NETWORK_FIT[net!] ?? net} average. I put the strongest moments first.`

  return (
    <section className="card vc-overview" aria-label="This week in Video">
      <p className="vc-ov-say"><Mark agent="juno" size="lg" /><span>{say}</span></p>
      <div className="vc-ov-stat">
        <span className="vc-ov-k">Clips ready</span>
        <span className="vc-ov-v"><b className="num">{ready.length}</b><span className="vc-ov-sub">from {plural(videos, 'video')}</span></span>
      </div>
      <div className="vc-ov-stat">
        <span className="vc-ov-k">Views this week</span>
        <span className="vc-ov-v"><b className="num">{k1(Math.round(views))}</b>{views > 0 && <Spark data={days} w={88} h={28} color="var(--a-juno)" label="Views of this week’s clips per day, last 7 days" />}</span>
      </div>
      {best && bestSrc && (
        <Link to={`/video/clips/${best.id}`} className="vc-ov-stat vc-ov-best">
          <ClipThumb clip={best} source={bestSrc} size="sm" />
          <span className="vc-ov-best-text"><span className="vc-ov-k">Best this week</span><b className="ellipsis">{best.title}</b><span className="vc-ov-sub num">{k1(best.stats!.views)} views</span></span>
        </Link>
      )}
      {making && (
        <Link to={`/video/sources/${making.id}`} className="vc-ov-stat vc-ov-making">
          <span className="vc-ov-k">Cutting now · {PHASES[phase].toLowerCase()}</span>
          <b className="ellipsis">{making.title}</b>
          <span className="vc-ov-progress"><span className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${making.title}: ${pct}%`}><span style={{ width: `${pct}%` }} /></span><span className="num t-sm">{pct}%</span></span>
        </Link>
      )}
    </section>
  )
}

/* ---------- The clip to send first, set apart ---------- */

function Featured({ c, src, sending, sel, onSend }: { c: Clip; src: Source; sending: number; sel: Selection; onSend?: () => void }) {
  const nav = useNavigate()
  const todo = leftToCheck(c, src)
  const proof = proofOf(c)
  return (
    <section className={`card hoverable vc-feature ${sel.has(c.id) ? 'picked' : ''}`} aria-labelledby="vc-feature-h" onClick={e => { if (!isInteractive(e)) nav(`/video/clips/${c.id}`) }}>
      <div className="vc-frame">
        <ClipThumb clip={c} source={src} size="fill" />
        <span className="vc-score"><ScoreBadge value={clipScore(c, src).total} /></span>
        <span className="vc-check"><SelectBox checked={sel.has(c.id)} visible={sel.count > 0} onToggle={shift => sel.toggle(c.id, shift)} label={`Select: ${c.title}`} /></span>
      </div>
      <div className="vc-feature-body">
        <p className="vc-pick"><Mark agent="juno" />Juno’s pick to send first</p>
        <h2 id="vc-feature-h"><Link to={`/video/clips/${c.id}`}>{c.title}</Link></h2>
        <p className="vc-feature-hook">“{c.hook}”</p>
        {proof && <p className="vc-proof">{proof}</p>}
        <p className="vc-meta">
          <span className="row tight nowrap">{c.post.networks.map(n => <Net key={n} n={n} size={16} />)}</span>
          <span className="ellipsis">From {src.title}</span>
          {todo.length > 0 && <InfoPop label={`${todo.length} to check`}>{todo.join(' · ')}</InfoPop>}
        </p>
        <div className="vc-feature-acts">
          {onSend && <Btn variant="primary" onClick={e => { e.stopPropagation(); onSend() }}>Send {sending} to Atlas</Btn>}
          <Btn onClick={e => { e.stopPropagation(); nav(`/video/clips/${c.id}`) }}>Review</Btn>
          <NotNow c={c} />
        </div>
      </div>
    </section>
  )
}

/* ---------- Clips ---------- */

type Show = 'needs' | 'making' | 'trial' | 'snoozed' | 'sent' | 'published'
const SHOW_LABEL: Record<Show, string> = { needs: 'Needs you', making: 'Being made', trial: 'On trial', snoozed: 'Later', sent: 'Sent to Atlas', published: 'Published' }

/**
 * Clips (matrix §15): the overview band, the state filters and the video menu, then in Needs you the small action cards
 * (new videos, flops), the clip to send first set apart, and the other clips as a grid of vertical tiles with BulkBar.
 */
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
  // The weekly quota keeps some clips for next week: a status on those cards, not a banner.
  const batch = vetClips(s, toSend)
  const nextWeek = new Set(batch.held.filter(h => !holdReason(s, h.clip)).map(h => h.clip.id))
  const sendIds = useMemo(() => toSend.map(c => c.id), [toSend.map(c => c.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(sendIds)
  const making = s.video.sources.filter(x => x.status === 'processing' && (only === 'all' || x.id === only))
  const withClips = s.video.sources.filter(x => s.video.clips.some(c => c.source === x.id))
  const published = by('published').filter(c => !flops.includes(c))
  // Set apart: the first clip Juno would send now (no hold, best score first).
  const featured = batch.go[0]

  const counts: Record<Show, number> = { needs: videos.length + flops.length + ready.length, making: making.length, trial: by('trial').length, snoozed: by('snoozed').length, sent: by('sent').length, published: published.length }
  const shown = (Object.keys(SHOW_LABEL) as Show[]).filter(k => k === 'needs' || counts[k] > 0)
  const [pick, setShow] = useState<Show>('needs')
  const show = shown.includes(pick) ? pick : 'needs'

  const stop = (f: () => void) => (e: MouseEvent) => { e.stopPropagation(); f() }
  const review = (c: Clip, label = 'Review') => <Btn size="sm" onClick={stop(() => nav(`/video/clips/${c.id}`))}>{label}</Btn>
  const card = (c: Clip, acts: ReactNode, status?: ReactNode, selectable?: boolean) => <ClipCard key={c.id} c={c} src={srcOf(c)} now={now} sel={selectable ? sel : undefined} status={status} acts={acts} />
  const source = only === 'all' ? 'All videos' : s.video.sources.find(x => x.id === only)?.title ?? 'All videos'
  const pickSource = (v: string) => { setOnly(v); nav(v === 'all' ? '/video' : `/video?source=${v}`, { replace: true }) }

  const readyCard = (c: Clip) => {
    const held = holdReason(s, c)
    if (held) {
      const who = unreleased(s, c)[0]
      return card(c, <>
        {who ? <Btn size="sm" onClick={stop(() => d({ type: 'video/release', person: who, signed: true }))}>Release signed</Btn> : review(c, 'Change the length')}
        <NotNow c={c} size="sm" />
      </>, <Status label="Held" tone="caution" why={`${held}. Juno won’t send it until that’s fixed.`} />)
    }
    return card(c, <>{review(c)}<NotNow c={c} size="sm" /></>,
      nextWeek.has(c.id) ? <Status label="Next week" why={`Juno sends ${WEEKLY_QUOTA} clips per video a week, best first. This one goes next week.`} /> : undefined, true)
  }

  // New videos and flops: small action cards, one gesture each.
  const flopCard = (c: Clip) => {
    const f = flopOf(s, c)!
    return (
      <li key={c.id} className="card hoverable vc-act" onClick={e => { if (!isInteractive(e)) nav(`/video/clips/${c.id}`) }}>
        <ClipThumb clip={c} source={srcOf(c)} size="sm" />
        <div className="vc-act-main">
          <Link to={`/video/clips/${c.id}`} className="vc-act-title">{c.title}</Link>
          <Status label="Below usual" tone="caution" why={`${Math.round(f.share * 100)}% of your ${NETWORK_FIT[f.net] ?? f.net} average views. Juno recuts it with the product first.`} />
        </div>
        <Btn size="sm" onClick={stop(() => d({ type: 'video/recut', id: c.id }))}>Recut</Btn>
      </li>
    )
  }
  const videoCard = (x: Source) => (
    <li key={x.id} className="card hoverable vc-act" onClick={e => { if (!isInteractive(e)) nav(`/video/sources/${x.id}`) }}>
      <SourceThumb source={x} />
      <div className="vc-act-main">
        <Link to={`/video/sources/${x.id}`} className="vc-act-title">{x.title}</Link>
        {x.status === 'failed'
          ? <span className="vc-status"><Pill tone="alert">Failed</Pill><InfoPop label="Why?">{x.error}</InfoPop><button type="button" className="link-btn t-sm" onClick={stop(() => nav('/video/sources#add'))}>Upload instead</button></span>
          : <span className="vc-act-sub">New video · {x.channel} · {hhmm(x.at)}</span>}
      </div>
      {x.status === 'failed'
        ? <Btn size="sm" onClick={stop(() => d({ type: 'video/retry', id: x.id }))}>Retry</Btn>
        : <Btn size="sm" onClick={stop(() => d({ type: 'video/start', id: x.id }))}>Make clips</Btn>}
    </li>
  )

  const grid = show === 'needs' ? ready.filter(c => c !== featured).map(readyCard)
    : show === 'making' ? []
    : show === 'trial' ? by('trial').map(c => card(c, <>
        <span className="t-sm nowrap">Results {new Date(c.trial!.until).toLocaleDateString('en-GB', { weekday: 'short' })} {hhmm(c.trial!.until)}</span>
        <Btn size="sm" variant="ghost" onClick={stop(() => d({ type: 'video/trialStop', id: c.id }))}>Stop the trial</Btn>
      </>))
    : show === 'snoozed' ? by('snoozed').map(c => card(c, <>{review(c)}<Btn size="sm" variant="ghost" onClick={stop(() => d({ type: 'video/send', ids: [c.id] }))}>Send to Atlas</Btn></>))
    : show === 'sent' ? by('sent').map(c => {
        const posts = (c.posts ?? []).map(id => s.publishing.posts.find(p => p.id === id)).filter(Boolean)
        const first = posts[0]
        return card(c, <Link className="link-btn t-sm" to="/publishing/calendar">{first ? `Scheduled ${new Date(first.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} ${hhmm(first.at)}${posts.length > 1 ? ` +${posts.length - 1}` : ''}` : 'In the calendar'}</Link>)
      })
    : published.map(c => {
        const recut = recutOf(s, c)
        return card(c, <>
          {c.stats ? <span className="t-sm vc-views"><b className="num">{k1(c.stats.views)}</b> views · {c.stats.er}% engagement</span> : <Pill>Published</Pill>}
          {recut && <Link className="link-btn t-sm" to={`/video/clips/${recut.id}`}>{recut.status === 'ready' ? 'New cut to review' : 'New cut sent'}</Link>}
        </>)
      })
  const acts = show === 'needs' ? [...videos.map(videoCard), ...flops.map(flopCard)] : []
  const empty = !grid.length && !acts.length && !(show === 'needs' && featured) && !(show === 'making' && making.length)

  return (
    <div className="vc-page">
      <Overview now={now} />
      <div className="vq-bar">
        <Filters label="Show" value={show} onChange={v => { setShow(v); sel.clear() }}
          items={shown.map(k => ({ value: k, label: SHOW_LABEL[k], count: counts[k] }))} />
        {withClips.length > 1 && (
          <Menu align="end" trigger={<Btn size="sm" variant="ghost">{source}<ChevronDown size={12} /></Btn>}
            items={[{ label: 'All videos', onSelect: () => pickSource('all') }, ...withClips.map(x => ({ label: x.title, onSelect: () => pickSource(x.id) }))]} />
        )}
      </div>
      <Notice scope="video" className="video-notice" />
      {acts.length > 0 && <ul className="vc-acts-row" aria-label="Videos and clips to act on">{acts}</ul>}
      {show === 'needs' && featured && (
        <Featured c={featured} src={srcOf(featured)} sending={batch.go.length} sel={sel} onSend={sel.count ? undefined : () => d({ type: 'video/send', ids: sendIds })} />
      )}
      {show === 'needs' && grid.length > 0 && (
        sel.count > 0
          ? <BulkBar count={sel.count} noun={sel.count > 1 ? 'clips selected' : 'clip selected'} onClear={sel.clear} actions={[
              { label: `Send ${sel.count} to Atlas`, primary: true, onRun: () => { d({ type: 'video/send', ids: [...sel.selected] }); sel.clear() } },
              { label: 'Not now', onRun: () => { d({ type: 'video/snooze', ids: [...sel.selected] }); sel.clear() } },
            ]} />
          : toSend.length > 0 && <div className="vc-grid-head"><SelectAll sel={sel} label="Select every clip ready to send" /><span>{plural(ready.length - (featured ? 1 : 0), 'more clip')} to review</span></div>
      )}
      {show === 'making' && making.length > 0 && <ul className="vs-grid" aria-label={SHOW_LABEL.making}>{making.map(x => <SourceCard key={x.id} src={x} now={now} />)}</ul>}
      {grid.length > 0 && <ul className="vc-grid" aria-label={SHOW_LABEL[show]}>{grid}</ul>}
      {empty && <Empty title={show === 'needs' ? 'Nothing needs you here' : `Nothing ${SHOW_LABEL[show].toLowerCase()}`} />}
    </div>
  )
}
