import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, Plus, TriangleAlert, UserRound } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { hhmm } from '../../app/time'
import { PEOPLE, PHASES, PHASE_MS, TRANSCRIPT, type Source } from '../../data/video'
import { Btn, Filters, Mark, Menu, Net, PageHead, Pill, Tabs } from '../../ui'
import { BulkBar, SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { CountBadge, Notice } from '../../ui/Feedback'
import { LANG_LABEL, captionSlips, lengthSpec, type Clip } from './model'
import { ClipThumb, ScoreBadge, SourceThumb, clipLength, clipScore } from './parts'
import { holdReason, unreleased, vetClips, videoNeeds, WEEKLY_QUOTA } from './slice'
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
      <PageHead agent="juno" title="Video" lede="Juno watches your videos and lives, finds the moments worth sharing and cuts them into captioned clips. You review, Atlas schedules.">
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
 * One clip on one dense row: frame and length, title and hook, then score, proof, networks and source on one line.
 * `check`: the selection box (ready to send only). `note`: the row's own reason (held for length). `acts`: its decisions.
 */
function ClipRow({ c, src, now, check, note, acts }: { c: Clip; src: Source; now: number; check?: ReactNode; note?: ReactNode; acts: ReactNode }) {
  const nav = useNavigate()
  // A clip found on request is titled after its own first line: say that line once, and prove it with something else.
  const echo = c.hook.startsWith(c.title.replace(/…$/, ''))
  const proof = c.evidence.find(e => !e.label.includes(c.hook.slice(0, 24)))
  const todo = c.status === 'ready' ? leftToCheck(c, src) : []
  return (
    <li className={`dq-row ${now - c.arrivedAt < 120_000 ? 'arrive' : ''}`} onClick={e => { if (!isInteractive(e)) nav(`/video/clips/${c.id}`) }}>
      <span className="dq-check">{check}</span>
      <ClipThumb clip={c} source={src} size="sm" />
      <div className="dq-main">
        <p className="dq-title">{echo ? <Link to={`/video/clips/${c.id}`} className="dq-name">“{c.hook}”</Link> : <><Link to={`/video/clips/${c.id}`} className="dq-name">{c.title}</Link><span className="dq-hook">“{c.hook}”</span></>}</p>
        <p className="dq-line">
          <ScoreBadge value={clipScore(c, src).total} />
          <span className="row tight nowrap">{c.post.networks.map(n => <Net key={n} n={n} size={14} />)}</span>
          {c.audio.dubs.length > 0 && <span title={c.audio.dubs.map(l => LANG_LABEL[l]).join(', ')}>{c.audio.dubs.map(l => l.toUpperCase()).join(' ')}</span>}
          {c.edited && <span>Edited by you</span>}
          {proof && !c.stats && <span className="dq-proof"><b className="num">{proof.value}</b> {proof.label}</span>}
          <span className="dq-src">From {src.title}</span>
        </p>
        {note}
        {todo.length > 0 && <p className="dq-todo"><TriangleAlert size={12} aria-hidden />{todo.join(' · ')}</p>}
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

type Show = 'all' | 'send' | 'held' | 'videos'

function Clips() {
  const { s, d } = useStore()
  const now = useNow(1000)
  const loc = useLocation()
  const nav = useNavigate()
  const [only, setOnly] = useState(new URLSearchParams(loc.search).get('source') ?? 'all')
  const [show, setShow] = useState<Show>('all')
  const srcOf = (c: Clip) => s.video.sources.find(x => x.id === c.source)!
  const clips = s.video.clips.filter(c => only === 'all' || c.source === only)
  const by = (st: Clip['status']) => clips.filter(c => c.status === st).sort((a, b) => clipScore(b, srcOf(b)).total - clipScore(a, srcOf(a)).total)

  // The decisions: clips Juno would send, clips she holds (and why), videos waiting for a go or a retry.
  const ready = by('ready')
  const toSend = ready.filter(c => !holdReason(s, c))
  const held = ready.filter(c => holdReason(s, c))
  const videos = videoNeeds(s).sources.filter(x => only === 'all' || x.id === only)
  const sendIds = useMemo(() => toSend.map(c => c.id), [toSend.map(c => c.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(sendIds)
  // The weekly quota is per batch: say once, at the group, which clips the group action would keep here.
  const batch = vetClips(s, toSend)
  const quota = batch.held.filter(h => !holdReason(s, h.clip))
  const quotaFrom = [...new Set(quota.map(h => srcOf(h.clip).title))]
  // Held clips, by what unblocks them: a person's signed release, or the clip's length.
  const people = [...new Set(held.flatMap(c => unreleased(s, c)))]
  const tooLong = held.filter(c => !unreleased(s, c).length)

  const making = s.video.sources.filter(x => x.status === 'processing' && (only === 'all' || x.id === only))
  const withClips = s.video.sources.filter(x => s.video.clips.some(c => c.source === x.id))
  const working = s.video.sources.find(x => x.status === 'processing')
  const from = new Set(ready.map(c => c.source)).size
  const total = toSend.length + held.length + videos.length
  const on = (k: Show) => show === 'all' || show === k
  const count = (k: Show, n: number, label: string) => n > 0 && (
    <button type="button" className="dq-count" aria-pressed={show === k} onClick={() => setShow(show === k ? 'all' : k)}>{label}</button>
  )
  const stop = (f: () => void) => (e: MouseEvent) => { e.stopPropagation(); f() }
  const review = (c: Clip, label = 'Review') => <Btn size="sm" onClick={stop(() => nav(`/video/clips/${c.id}`))}>{label}</Btn>
  const rowsOf = (list: Clip[], acts: (c: Clip) => ReactNode, note?: (c: Clip) => ReactNode) =>
    <ul className="dq-rows">{list.map(c => <ClipRow key={c.id} c={c} src={srcOf(c)} now={now} note={note?.(c)} acts={acts(c)} />)}</ul>

  return (
    <div className="dq-page">
      <p className="dq-sum" aria-live="polite">
        <Mark agent="juno" />
        {total ? <>
          {count('send', toSend.length, `${toSend.length} ready to send`)}
          {toSend.length > 0 && held.length > 0 && <span aria-hidden>·</span>}
          {count('held', held.length, `${held.length} held`)}
          {(toSend.length > 0 || held.length > 0) && videos.length > 0 && <span aria-hidden>·</span>}
          {count('videos', videos.length, `${plural(videos.length, 'new video')} to start`)}
          <span className="dq-sum-note">{ready.length > 0 && `from ${plural(from, 'video')}. `}{working ? `I’m working on “${working.title}”.` : 'I check your channel every 15 minutes.'}</span>
        </> : <span>Nothing needs you here. {working ? `I’m working on “${working.title}”.` : 'I check your channel every 15 minutes.'}</span>}
      </p>
      {withClips.length > 1 && (
        <Filters label="Filter by video" value={only} onChange={v => { setOnly(v); nav(v === 'all' ? '/video' : `/video?source=${v}`, { replace: true }) }}
          items={[{ value: 'all', label: 'All videos' }, ...withClips.map(x => ({ value: x.id, label: x.title, count: s.video.clips.filter(c => c.source === x.id && c.status === 'ready').length || undefined }))]} />
      )}
      <Notice scope="video" className="video-notice" />

      {on('send') && toSend.length > 0 && (
        <section className="dq" aria-labelledby="vq-send">
          <header className="dq-head">
            <SelectAll sel={sel} label="Select every clip ready to send" />
            <h3 id="vq-send">Ready to send</h3><CountBadge n={toSend.length} />
            <span className="dq-hint">Best first. Atlas puts them in your best slots.</span>
            <span className="spacer" />
            {!sel.count && batch.go.length > 0 && <Btn size="sm" variant="primary" onClick={() => d({ type: 'video/send', ids: sendIds })}>Send {batch.go.length} to Atlas</Btn>}
          </header>
          {quota.length > 0 && <p className="dq-note">{plural(quota.length, 'clip')} from “{quotaFrom.join('” and “')}” would wait for next week: Juno sends {WEEKLY_QUOTA} clips per video per week, the best first.</p>}
          {sel.count > 0 && <BulkBar count={sel.count} noun={sel.count > 1 ? 'clips selected' : 'clip selected'} onClear={sel.clear} actions={[
            { label: `Send ${sel.count} to Atlas`, primary: true, onRun: () => { d({ type: 'video/send', ids: [...sel.selected] }); sel.clear() } },
            { label: 'Not now', onRun: () => { d({ type: 'video/snooze', ids: [...sel.selected] }); sel.clear() } },
          ]} />}
          <ul className="dq-rows">{toSend.map(c => (
            <ClipRow key={c.id} c={c} src={srcOf(c)} now={now}
              check={<SelectBox checked={sel.has(c.id)} visible onToggle={shift => sel.toggle(c.id, shift)} label={`Select: ${c.title}`} />}
              acts={<>{review(c)}<NotNow c={c} size="sm" /></>} />
          ))}</ul>
        </section>
      )}

      {on('held') && held.length > 0 && (
        <section className="dq" aria-labelledby="vq-held">
          <header className="dq-head">
            <h3 id="vq-held">Held</h3><CountBadge n={held.length} />
            <span className="dq-hint">Juno won’t send these until the reason is fixed.</span>
          </header>
          {people.map(p => {
            const list = held.filter(c => unreleased(s, c).includes(p))
            return (
              <div key={p} className="dq-sub">
                <div className="dq-note">
                  <UserRound size={14} aria-hidden />
                  <span><b>{PEOPLE[p].name}</b>, {PEOPLE[p].role}, is on screen without a signed release.</span>
                  <span className="spacer" />
                  <Btn size="sm" onClick={() => d({ type: 'video/release', person: p, signed: true })}>{PEOPLE[p].name}’s release is signed</Btn>
                </div>
                {rowsOf(list, c => <>{review(c)}<NotNow c={c} size="sm" /></>)}
              </div>
            )
          })}
          {tooLong.length > 0 && (
            <div className="dq-sub">
              <div className="dq-note"><TriangleAlert size={14} aria-hidden /><span>Outside every chosen network’s length: {lengthSpec('tiktok').min}–{lengthSpec('tiktok').max} s, {lengthSpec('linkedin').max} s on LinkedIn.</span></div>
              {rowsOf(tooLong, c => <>{review(c, 'Change the length')}<NotNow c={c} size="sm" /></>,
                c => <p className="dq-why">{Math.round(clipLength(c, srcOf(c)))} s long</p>)}
            </div>
          )}
        </section>
      )}

      {on('videos') && videos.length > 0 && (
        <section className="dq" aria-labelledby="vq-videos">
          <header className="dq-head">
            <h3 id="vq-videos">New videos</h3><CountBadge n={videos.length} />
            <span className="dq-hint">Juno asks before cutting a new video.</span>
          </header>
          <ul className="dq-rows">{videos.map(x => (
            <li key={x.id} className="dq-row is-source" onClick={e => { if (!isInteractive(e)) nav(`/video/sources/${x.id}`) }}>
              <span className="dq-check" />
              <SourceThumb source={x} />
              <div className="dq-main">
                <p className="dq-title"><Link to={`/video/sources/${x.id}`} className="dq-name">{x.title}</Link></p>
                {x.status === 'failed' ? <p className="dq-why"><TriangleAlert size={12} aria-hidden />{x.error}</p> : <p className="dq-line"><span className="dq-src">{x.channel} · published {hhmm(x.at)}</span></p>}
              </div>
              <div className="dq-acts">
                {x.status === 'failed'
                  ? <><Btn size="sm" variant="ghost" onClick={stop(() => nav('/video/sources#add'))}>Upload the file instead</Btn><Btn size="sm" onClick={stop(() => d({ type: 'video/retry', id: x.id }))}>Retry</Btn></>
                  : <Btn size="sm" onClick={stop(() => d({ type: 'video/start', id: x.id }))}>Make clips</Btn>}
              </div>
            </li>
          ))}</ul>
        </section>
      )}

      {/* The rest of the module: what Juno is making, what you put off, what went out. */}
      {making.length > 0 && (
        <section className="card dq-rest">
          <div className="card-head"><h2>Being made <span className="faint num">{making.length}</span></h2></div>
          <ul className="dq-rows">{making.map(x => <MakingRow key={x.id} src={x} now={now} />)}</ul>
        </section>
      )}
      {by('snoozed').length > 0 && (
        <section className="card dq-rest">
          <div className="card-head"><h2>Later <span className="faint num">{by('snoozed').length}</span></h2><span className="faint t-sm">Back tomorrow at 08:00</span></div>
          {rowsOf(by('snoozed'), c => <><Btn size="sm" variant="ghost" onClick={stop(() => d({ type: 'video/send', ids: [c.id] }))}>Send to Atlas</Btn>{review(c)}</>)}
        </section>
      )}
      {by('sent').length > 0 && (
        <section className="card dq-rest">
          <div className="card-head"><h2>Sent to Atlas <span className="faint num">{by('sent').length}</span></h2></div>
          {rowsOf(by('sent'), c => {
            const posts = (c.posts ?? []).map(id => s.publishing.posts.find(p => p.id === id)).filter(Boolean)
            const first = posts[0]
            return <Link className="link-btn t-sm nowrap" to="/publishing/calendar">{first ? `Scheduled ${new Date(first.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} ${hhmm(first.at)}${posts.length > 1 ? ` +${posts.length - 1}` : ''}` : 'In the calendar'}</Link>
          })}
        </section>
      )}
      {by('published').length > 0 && (
        <section className="card dq-rest">
          <div className="card-head"><h2>Published <span className="faint num">{by('published').length}</span></h2></div>
          {rowsOf(by('published'), c => c.stats ? <span className="t-sm nowrap">{(c.stats.views / 1000).toFixed(1)}k views · {c.stats.er}% engagement{c.stats.retention ? ` · ${c.stats.retention}% watched` : ''}</span> : <Pill>Published</Pill>)}
        </section>
      )}
    </div>
  )
}
