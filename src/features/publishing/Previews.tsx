import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Ellipsis, EllipsisVertical, Globe, House, Lightbulb, MessageSquareText, Plus, Search, Share2, Tv, User, Users, VolumeX, X as Close } from 'lucide-react'
import type { Network } from '../../app/types'
import type { Post, PostStatus } from '../../data/publishing'
import { useNow } from '../../app/store'
import { MIN, hhmm } from '../../app/time'
import { Empty } from '../../ui'
import Photo from '../../ui/Photo'
import { Ico } from './previews/icons'

/** Highlights Playbook hits (banned words) in a caption. */
export function Marked({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>
  const re = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return <>{text.split(re).map((part, i) => (i % 2 ? <span key={i} className="pub-hit" title="Not allowed by the Playbook">{part}</span> : <span key={i}>{part}</span>))}</>
}

/** Logical width of a phone screen. Previews render at this size and shrink to fit narrower containers. */
const PHONE = 375

const TAG = /([#@][\p{L}\p{N}_]+(?:\.[\p{L}\p{N}_]+)*)/u

/** Caption with hashtags and @mentions coloured the network's way, Playbook hits still marked. */
function Rich({ text, words }: { text: string; words: string[] }) {
  return <>{text.split(TAG).map((part, i) => (i % 2 ? <span key={i} className="pv-tag"><Marked text={part} words={words} /></span> : <Marked key={i} text={part} words={words} />))}</>
}

/** Where a network cuts a caption behind its "more", or -1 when it shows it all. Same walk as Agorapulse's previews
 *  (a character budget, then a paragraph budget), then back to the last space so a word is never split. */
export function cutAt(text: string, max: number, paras = Infinity, min = 0): number {
  if (text.length < min) return -1
  const breaks = [...text.matchAll(/\n/g)].map(m => m.index)
  let i = breaks.length >= paras ? breaks[paras - 1] : text.length > max ? max : -1
  if (i > max) i = max
  if (i === max) { const space = text.lastIndexOf(' ', max); if (space > max * 0.6) i = space }
  return i
}

/** LinkedIn clamps by rendered lines, not characters: every paragraph takes at least one line and wraps every
 *  `perLine` characters. Returns the cut index, keeping room on the last line for "…more", or -1. */
export function cutLines(text: string, lines: number, perLine: number): number {
  let used = 0, start = 0
  for (const para of text.split('\n')) {
    const need = Math.max(1, Math.ceil(para.length / perLine))
    if (used + need > lines) {
      if (used === lines) return start - 1
      const i = start + (lines - used) * perLine - 6
      const space = text.lastIndexOf(' ', i)
      return space > start ? space : i
    }
    used += need
    start += para.length + 1
  }
  return -1
}

function Caption({ v, cut, more, tight, flat }: { v: View; cut: number; more: string; tight?: boolean; flat?: boolean }) {
  const shown = cut < 0 ? v.text : v.text.slice(0, cut).trimEnd()
  // TikTok folds line breaks into spaces while the caption is collapsed.
  return <><Rich text={flat && cut >= 0 ? shown.replace(/\s*\n+\s*/g, ' ') : shown} words={v.words} />{cut >= 0 && <>…{!tight && ' '}<span className="pv-more">{more}</span></>}</>
}

/** 12.4K, 210K, 1.2M: the short count most networks print. */
export const short = (n: number) => (n < 1e3 ? `${n}` : n < 1e6 ? `${dec(n / 1e3)}K` : `${dec(n / 1e6)}M`)
const dec = (x: number) => `${x >= 100 ? Math.round(x) : Math.round(x * 10) / 10}`
const full = (n: number) => n.toLocaleString('en-US')
/** A counter with no value prints nothing, like the networks do before a post has results. */
const count = (n: number) => (n > 0 ? short(n) : null)
const plural = (n: number, w: string) => `${full(n)} ${w}${n === 1 ? '' : 's'}`

type Clock = 'ig' | 'tt' | 'li' | 'fb' | 'x' | 'g'
/** The post's date the way each network prints it: relative once published, the planned slot before that. */
function stamp(at: number | string | undefined, published: boolean, now: number, style: Clock): string {
  if (typeof at === 'string') return at
  if (at === undefined) return style === 'ig' || style === 'g' ? 'Just now' : 'now'
  if (!published) return `${new Date(at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${hhmm(at)}`
  const m = Math.max(0, Math.floor((now - at) / MIN)), h = Math.floor(m / 60), d = Math.floor(h / 24)
  const date = (month: 'long' | 'short') => new Date(at).toLocaleDateString('en-US', { month, day: 'numeric' })
  const unit = m < 60 ? [m, 'minute', 'm'] as const : h < 24 ? [h, 'hour', 'h'] as const : [d, 'day', 'd'] as const
  if (m < 1) return style === 'ig' || style === 'g' ? 'Just now' : 'now'
  switch (style) {
    case 'ig': return d < 7 ? `${plural(unit[0], unit[1])} ago` : date('long')
    case 'g': return d < 7 ? `${plural(unit[0], unit[1])} ago` : `${plural(Math.floor(d / 7), 'week')} ago`
    case 'tt': return d < 7 ? `${unit[0]}${unit[2]} ago` : `${new Date(at).getMonth() + 1}-${new Date(at).getDate()}`
    case 'li': return d < 7 ? `${unit[0]}${unit[2]}` : d < 30 ? `${Math.floor(d / 7)}w` : `${Math.floor(d / 30)}mo`
    case 'fb': return d < 7 ? `${unit[0]}${unit[2]}` : date('long')
    case 'x': return h < 24 ? `${unit[0]}${unit[2]}` : date('short')
  }
}

type View = { text: string; words: string[]; media?: string; live: boolean; reach: number; n: (share: number) => number; when: (s: Clock) => string; slides: number; reel: boolean }

const Brand = ({ size = 28, square }: { size?: number; square?: boolean }) => (
  <span className={`pv-brand ${square ? 'sq' : ''}`} style={{ width: size, height: size }} aria-hidden>
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 32 32"><path d="M5 22 L13 10 L18 17 L21 13 L27 22 Z" fill="var(--pv-brand-ink)" /></svg>
  </span>
)
// Networks show photos edge to edge: no hairline around them.
const Media = ({ name, empty = '' }: { name?: string; empty?: string }) => (name ? <Photo name={name} style={{ outline: 'none' }} /> : <div className="pv-nomedia">{empty}</div>)
const Face = ({ name }: { name: string }) => <span className="pv-face"><Media name={name} /></span>

function Instagram(v: View) {
  const likes = v.n(0.86), comments = v.n(0.04)
  return <>
    <header className="ig-head">
      <Brand size={32} />
      <div className="ig-who"><b>fernway<Ico n="verified" size={12} className="ig-badge" /></b><span>Annecy, France</span></div>
      <Ellipsis size={22} aria-label="More" />
    </header>
    <div className="ig-media">
      <Media name={v.media} empty="No visual" />
      {v.slides > 1 && <span className="ig-count">1/{v.slides}</span>}
      {v.reel && <><Ico n="igReels" size={18} className="ig-reel" /><span className="ig-mute"><VolumeX size={12} /></span></>}
    </div>
    <div className="ig-acts">
      <Ico n="igLike" /><Ico n="igComment" /><Ico n="igRepost" /><Ico n="igShare" />
      {v.slides > 1 && <span className="ig-dots">{Array.from({ length: Math.min(v.slides, 5) }, (_, i) => <i key={i} className={i ? undefined : 'on'} />)}</span>}
      <Ico n="igSave" className="ig-save" />
    </div>
    {likes > 1 && <p className="ig-likes"><Face name="trail" /><Face name="lake" />Liked by <b>lea.hikes</b> and <b>{plural(likes - 1, 'other')}</b></p>}
    {likes === 1 && <p className="ig-likes"><b>1 like</b></p>}
    <p className="ig-cap"><b>fernway</b> <Caption v={v} cut={cutAt(v.text, 115, 1)} more="more" /></p>
    {comments > 0 && <p className="ig-meta">{comments === 1 ? 'View 1 comment' : `View all ${full(comments)} comments`}</p>}
    <p className="ig-time">{v.when('ig')}</p>
  </>
}

function TikTok(v: View) {
  return <>
    <div className="tt-stage">
      <Media name={v.media} empty="No video" />
      <div className="tt-top"><Tv size={22} aria-label="LIVE" /><nav><span>Explore</span><span>Following</span><b>For You</b></nav><Search size={22} aria-label="Search" /></div>
      <div className="tt-scrim" />
      <div className="tt-rail">
        <span className="tt-me"><Brand size={46} /><i><Plus size={12} strokeWidth={3.5} /></i></span>
        <span><Ico n="ttLike" size={34} />{count(v.n(0.8))}</span>
        <span><Ico n="ttComment" size={32} />{count(v.n(0.05))}</span>
        <span><Ico n="ttSave" size={30} />{count(v.n(0.08))}</span>
        <span><Ico n="ttShare" size={30} />{count(v.n(0.07))}</span>
        <span className="tt-disc"><Brand size={24} /></span>
      </div>
      <div className="tt-cap">
        <p className="tt-who"><b>fernway</b><span>· {v.when('tt')}</span></p>
        <p className="tt-text"><Caption v={v} cut={cutAt(v.text, 120, 3, 85)} more="more" flat /></p>
        <p className="tt-sound"><Ico n="ttMelody" size={14} /><span>original sound - Fernway</span></p>
      </div>
      <div className="tt-progress"><i /></div>
    </div>
    <nav className="tt-nav" aria-hidden>
      <span className="on"><House size={22} fill="currentColor" />Home</span><span><Users size={22} />Friends</span>
      <span className="tt-plus"><Plus size={18} strokeWidth={3} /></span>
      <span><MessageSquareText size={22} />Inbox</span><span><User size={22} />Profile</span>
    </nav>
  </>
}

const Bubble = ({ kind }: { kind: 'like' | 'love' | 'idea' }) => (
  <span className={`pv-react ${kind}`}>{kind === 'like' ? <Ico n="ytLike" size={9} /> : kind === 'love' ? <Ico n="ttLike" size={10} /> : <Lightbulb size={10} strokeWidth={3} />}</span>
)

function LinkedIn(v: View) {
  const reactions = v.n(0.82), comments = v.n(0.1), reposts = v.n(0.08)
  return <>
    <header className="li-head">
      <Brand size={48} square />
      <div className="li-who"><b>Fernway</b><span>9,012 followers</span><span>{v.when('li')} • <Globe size={12} /></span></div>
      <span className="li-follow"><Plus size={18} strokeWidth={2.5} />Follow</span>
    </header>
    <p className="li-text"><Caption v={v} cut={cutLines(v.text, v.media ? 3 : 5, 46)} more="more" tight /></p>
    {v.media && <div className="li-media"><Media name={v.media} /></div>}
    {reactions > 0 && <div className="li-social"><span className="pv-reacts"><Bubble kind="like" /><Bubble kind="love" /><Bubble kind="idea" /></span>{full(reactions)}
      <span className="end">{[comments && plural(comments, 'comment'), reposts && plural(reposts, 'repost')].filter(Boolean).join(' • ')}</span></div>}
    <div className="li-acts"><span><Ico n="liLike" />Like</span><span><Ico n="liComment" />Comment</span><span><Ico n="liRepost" />Repost</span><span><Ico n="liSend" />Send</span></div>
  </>
}

function Facebook(v: View) {
  const reactions = v.n(0.78), comments = v.n(0.12), shares = v.n(0.1)
  // Facebook prints short text-only posts large.
  const big = !v.media && v.text.length < 86 && !v.text.includes('\n')
  return <>
    <header className="fb-head">
      <Brand size={40} />
      <div className="fb-who"><b>Fernway</b><span>{v.when('fb')} · <Globe size={12} /></span></div>
      <Ellipsis size={20} /><Close size={20} />
    </header>
    <p className={`fb-text ${big ? 'big' : ''}`}><Caption v={v} cut={cutAt(v.text, 250, 5, 86)} more="See more" /></p>
    {v.media && <div className="fb-media"><Media name={v.media} /></div>}
    {reactions > 0 && <div className="fb-social"><span className="pv-reacts"><Bubble kind="like" /><Bubble kind="love" /></span>{short(reactions)}
      <span className="end">{comments > 0 && <span>{plural(comments, 'comment')}</span>}{shares > 0 && <span>{plural(shares, 'share')}</span>}</span></div>}
    <div className="fb-acts"><span><Ico n="fbLike" size={18} />Like</span><span><Ico n="fbComment" size={18} />Comment</span><span><Ico n="fbShare" size={18} />Share</span></div>
  </>
}

function XPost(v: View) {
  return (
    <div className="x-row">
      <Brand size={40} />
      <div className="x-main">
        <p className="x-who"><b>Fernway</b><Ico n="verified" size={18} className="x-badge" /><span>@fernway · {v.when('x')}</span><Ellipsis size={18} className="x-more" /></p>
        <p className="x-text"><Caption v={v} cut={cutAt(v.text, 280)} more="Show more" /></p>
        {v.media && <div className="x-media"><Media name={v.media} /></div>}
        <div className="x-acts">
          <span><Ico n="xReply" size={18} />{count(v.n(0.08))}</span>
          <span><Ico n="xRepost" size={18} />{count(v.n(0.14))}</span>
          <span><Ico n="xLike" size={18} />{count(v.n(0.78))}</span>
          <span><Ico n="xViews" size={18} />{count(v.live ? v.reach : 0)}</span>
          <span className="x-end"><Ico n="xSave" size={18} /><Ico n="xShare" size={18} /></span>
        </div>
      </div>
    </div>
  )
}

function Shorts(v: View) {
  const likes = v.n(0.9), comments = v.n(0.1)
  return (
    <div className="yt-stage">
      <Media name={v.media} empty="No video" />
      <div className="yt-top"><Search size={24} aria-label="Search" /><EllipsisVertical size={24} aria-label="More" /></div>
      <div className="yt-scrim" />
      <div className="yt-rail">
        <span><i><Ico n="ytLike" size={22} /></i>{count(likes) ?? 'Like'}</span>
        <span><i><Ico n="ytDislike" size={22} /></i>Dislike</span>
        <span><i><Ico n="ytComment" size={22} /></i>{count(comments) ?? 'Comment'}</span>
        <span><i><Ico n="ytShare" size={22} /></i>Share</span>
        <span><i><Ico n="ytMore" size={22} /></i></span>
        <span className="yt-sound"><Media name={v.media} /></span>
      </div>
      <div className="yt-meta">
        <p className="yt-who"><Brand size={32} /><b>@fernway</b><span className="yt-sub">Subscribe</span></p>
        <p className="yt-title"><Rich text={v.text} words={v.words} /></p>
        <p className="yt-audio"><Ico n="ttMelody" size={12} />Fernway · Original audio</p>
      </div>
      <div className="yt-progress"><i /></div>
    </div>
  )
}

function Google(v: View) {
  return <>
    <header className="g-head">
      <Brand size={40} />
      <div className="g-who"><b>Fernway Annecy</b><span>{v.when('g')}</span></div>
      <EllipsisVertical size={20} />
    </header>
    {v.media && <div className="g-media"><Media name={v.media} /></div>}
    <p className="g-text"><Caption v={v} cut={cutAt(v.text, 200, 4)} more="More" /></p>
    <footer className="g-foot"><span className="g-cta">Learn more</span><Share2 size={20} aria-label="Share" /></footer>
  </>
}

const VIEWS: Record<Exclude<Network, 'trustpilot'>, (v: View) => ReactNode> = { instagram: Instagram, tiktok: TikTok, linkedin: LinkedIn, facebook: Facebook, x: XPost, youtube: Shorts, google: Google }

/** Shrinks the 375 px phone to its container without reflowing it, like a screenshot of the real app. */
function useFit(on: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => { if (el.clientWidth) setZoom(Math.min(1, el.clientWidth / PHONE)) }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [on])
  return [ref, zoom] as const
}

type Props = {
  network: Network; text: string; media?: string; words: string[]
  /** Published results: counters are derived from them, so they always agree with the reach. */
  stats?: Post['stats']; status?: PostStatus
  /** Publish time, or a slot label already worded ("Thu 27, 18:00"). */
  at?: number | string
  /** Number of images in a carousel. Defaults to what Atlas's label announces ("Carousel: 5 things…"). */
  slides?: number
  /** Chosen format; without it, Atlas's planning label decides. */
  format?: Post['format']
  /** Shown under the post, as the brand's own first comment. */
  firstComment?: string
}

/** The post as it will look in each network's own app, in the mode that network is mostly used in. */
export function NetworkPreview({ network, text, media, words, stats, status, at, slides, format: chosen, firstComment }: Props) {
  const now = useNow(60_000)
  const [ref, zoom] = useFit(network !== 'trustpilot')
  if (network === 'trustpilot') return <Empty title="No preview for Trustpilot" body="Trustpilot only shows customer reviews and your replies. Brands can’t publish posts there." />
  const published = status === 'published'
  const live = published && !!stats
  const engaged = live ? Math.round((stats.reach * stats.er) / 100) : 0
  const raw = text || 'Your caption shows here.'
  // Atlas's planning label ("Carousel: …", "Reel: …", "Short: …") picks the format, never shows in the caption.
  const format = raw.match(/^(carousel|reel|short)\s*:\s*/i)
  const kind = chosen ?? format?.[1].toLowerCase()
  const caption = format ? raw.slice(format[0].length).replace(/^./, c => c.toUpperCase()) : raw
  const carousel = kind === 'carousel' ? Math.min(10, Math.max(2, +(caption.match(/\b(\d{1,2})\b/)?.[1] ?? 5))) : 1
  const v: View = {
    text: caption, words, media, live, reach: stats?.reach ?? 0,
    n: share => Math.round(engaged * share),
    when: style => stamp(at, published, now, style),
    slides: slides ?? carousel, reel: kind === 'reel',
  }
  const Body = VIEWS[network]
  return (
    <div ref={ref} className="pv-fit">
      <div className={`pv pv-${network}`} style={{ zoom }} role="figure" aria-label={`Preview on ${network}`}>
        <Body {...v} />
        {firstComment && <p className="pv-first"><b>fernway</b> {firstComment}</p>}
      </div>
    </div>
  )
}
