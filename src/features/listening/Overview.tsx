// Listening's landing shapes (matrix §15): the week in one band, the move to answer first as a large card, and the
// competitors as small objects beside the queue.
import { Link } from 'react-router-dom'
import { ArrowRight, Flame, Star } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { ago } from '../../app/time'
import type { CompEvent } from '../../data/listening'
import type { Handoff } from '../../app/types'
import { Delta, Mark, Pill } from '../../ui'
import { Spark } from '../../ui/charts'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { MoreInfo } from '../../ui/More'
import { gist } from '../../ui/gist'
import { brandWeek, competitorMood, competitorName, competitorsOf, echoWeekRead, eventsOf, moodCount, openEvents, recent, shareOfVoice, sovTrend, WEEK } from './model'
import { EventWhy, IMPACT_TONE } from './Needs'

const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th']

/** Positive / neutral / negative as one bar, its two telling parts named under it. */
export function MoodBar({ positive, negative, label }: { positive: number; negative: number; label: string }) {
  const neutral = Math.max(0, 100 - positive - negative)
  return (
    <div className="ls-mood-bar">
      <div className="stackbar" style={{ height: 8 }} role="img" aria-label={`${label}: ${positive}% positive, ${neutral}% neutral, ${negative}% negative`}>
        <i style={{ width: `${positive}%`, background: 'var(--ok)' }} />
        <i style={{ width: `${neutral}%`, background: 'var(--lift-2)' }} />
        <i style={{ width: `${negative}%`, background: 'var(--alert)' }} />
      </div>
      <span className="ls-mood-key"><span><i className="pos" />{positive}% positive</span><span><i className="neg" />{negative}% negative</span></span>
    </div>
  )
}

/** The week at a glance: Echo's read, the volume, the mood, our share of voice. Landing only. */
export function Overview() {
  const { s } = useStore()
  const week = brandWeek(s)
  const c = moodCount(s, recent(s, WEEK))
  const pc = (n: number) => (c.total ? Math.round((n / c.total) * 100) : 0)
  const sov = shareOfVoice(s)
  const rank = Object.values(sov).sort((a, b) => b - a).indexOf(sov.fernway)
  const brands = Object.keys(sov).length
  const trend = sovTrend(s).fernway
  const dSov = trend[trend.length - 1] - trend[0]
  return (
    <section className="card ls-overview" aria-label="This week">
      <div className="ls-ov-echo"><Mark agent="echo" size="lg" /><p>{echoWeekRead(s)}</p></div>
      <div className="ls-ov-stat">
        <span className="ls-ov-k">Mentions · 7 days</span>
        <span className="ls-ov-v"><b className="num">{week.total.toLocaleString('en-GB')}</b><Spark data={week.days} w={96} h={28} color="var(--a-echo)" label="Brand mentions per day, last 7 days" /></span>
      </div>
      <div className="ls-ov-stat">
        <span className="ls-ov-k">Sentiment · 7 days</span>
        <MoodBar positive={pc(c.positive)} negative={pc(c.negative)} label="Sentiment of your mentions, last 7 days" />
      </div>
      <div className="ls-ov-stat">
        <span className="ls-ov-k">Share of voice</span>
        <span className="ls-ov-v"><b className="num">{sov.fernway}%</b><Delta v={`${dSov > 0 ? '+' : ''}${dSov} pts`} down={dSov < 0} /></span>
        <span className="ls-ov-sub">{ORD[rank] ?? `#${rank + 1}`} of {brands} brands · 6 weeks</span>
      </div>
    </section>
  )
}

/** The competitor move to answer first, set apart: proof in one line, Echo's moves as choices, recommended first. */
export function FeaturedMove({ e, onDismiss }: { e: CompEvent; onDismiss: () => void }) {
  const { s, d } = useStore()
  const now = useNow()
  const name = competitorName(s, e.competitor)
  const rec = e.moves.findIndex(m => m.kind !== 'none')
  return (
    <section className="card ls-feature" aria-labelledby="ls-feature-h">
      <div className="ls-feature-head">
        <SocialAvatar name={name} network={e.proof.network} org size={48} />
        <div className="grow">
          <p className="ls-feature-meta"><Link to={`/listening/competitors/profile/${e.competitor}`}>{name}</Link><span>{e.type}</span><span>{ago(e.at, now)}</span></p>
          <h2 id="ls-feature-h"><Link to={`/listening/competitors/${e.id}`}>{e.title}</Link></h2>
        </div>
        <Pill tone={IMPACT_TONE[e.impact]}>{e.impact} impact</Pill>
      </div>
      <p className="ls-feature-why">{gist(e.impactWhy, 18)} <MoreInfo label="Why?" title={`Why Echo raised ${name}’s ${e.type.toLowerCase()}`}><EventWhy e={e} /></MoreInfo></p>
      <ol className="move-list ls-moves">
        {e.moves.filter(m => m.kind !== 'none').map(m => {
          const i = e.moves.indexOf(m)
          return (
            <li key={m.label}>
              <button className={`choice ${i === rec ? 'rec' : ''}`} onClick={() => d({ type: 'listening/move', event: e.id, index: i })}>
                <Mark agent={m.agent} />
                <span className="move-label">{m.label}</span>
                {i === rec && <span className="rec-tag"><Star size={12} aria-hidden />Recommended</span>}
                <ArrowRight size={16} className="go" aria-hidden />
              </button>
            </li>
          )
        })}
      </ol>
      <button type="button" className="link-btn t-sm" onClick={onDismiss}>Nothing to do</button>
    </section>
  )
}

/** The negative spike, set apart the same way: Echo's options as choices. */
export function FeaturedUrgent({ h }: { h: Handoff }) {
  const { d } = useStore()
  const opts = h.options ?? []
  const rec = Math.max(0, opts.findIndex(o => o.recommended))
  return (
    <section className="card ls-feature urgent" aria-labelledby="ls-feature-h">
      <div className="ls-feature-head">
        <span className="sl-lead-icon urgent lg" aria-hidden><Flame size={20} /></span>
        <div className="grow">
          <p className="ls-feature-meta"><span>Echo</span><span>Negative spike</span></p>
          <h2 id="ls-feature-h">{h.title}</h2>
        </div>
        <Pill tone="alert">Urgent</Pill>
      </div>
      <p className="ls-feature-why">{gist(h.why, 18)} <MoreInfo label="Why?" title="Why Echo stopped here"><p>{h.why}</p>{h.context && <p className="muted">{h.context}</p>}</MoreInfo></p>
      {opts.length > 0 ? (
        <ol className="move-list ls-moves">
          {opts.map((o, i) => (
            <li key={o.label}>
              <button className={`choice ${i === rec ? 'rec' : ''}`} onClick={() => d({ type: 'core/resolve', id: h.id, decision: { kind: 'option', option: o.label, index: i } })}>
                <span className="move-label">{o.label}</span>
                {i === rec && <span className="rec-tag"><Star size={12} aria-hidden />Recommended</span>}
                <ArrowRight size={16} className="go" aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      ) : <Link to={`/?card=${h.id}`} className="btn sm self-start">Review on Desk</Link>}
    </section>
  )
}

/** Competitors › one card per brand: who, the latest move, share of voice and its trend, how people talk about them.
 *  A brand with a move waiting for you comes first, the strongest move first. */
export function CompetitorCards() {
  const { s } = useStore()
  const now = useNow()
  const sov = shareOfVoice(s)
  const trend = sovTrend(s)
  const watched = competitorsOf(s).filter(c => s.listening.watch.find(w => w.id === c.id)?.tracking)
  const events = eventsOf(s).sort((a, b) => b.at - a.at)
  const open = openEvents(s)
  const rank = (id: string) => { const e = open.find(x => x.competitor === id); return e ? ['High', 'Medium', 'Low'].indexOf(e.impact) : 9 }
  const cards = [...watched].sort((a, b) => rank(a.id) - rank(b.id) || (sov[b.id] ?? 0) - (sov[a.id] ?? 0))
  return (
    <ul className="ls-comp-grid" aria-label="Competitors">
      {cards.map((c, i) => {
        const waiting = open.find(e => e.competitor === c.id)
        const last = waiting ?? events.find(e => e.competitor === c.id)
        const t = trend[c.id] ?? []
        const delta = t.length ? t[t.length - 1] - t[0] : 0
        const mood = competitorMood(c.id)
        return (
          <li key={c.id}>
            <Link to={`/listening/competitors/profile/${c.id}`} className={`card ls-comp ${waiting && i === 0 ? "first" : ""}`}>
              <div className="ls-comp-head">
                <SocialAvatar name={c.name} org size={40} />
                <span className="grow"><b>{c.name}</b><span className="ls-comp-sub">{c.handle} · {c.price}</span></span>
              </div>
              {last ? <p className="ls-comp-move">{waiting === last && <Pill tone={IMPACT_TONE[last.impact] ?? "caution"}>Needs a move</Pill>}<span className="chip">{last.type}</span><span className="ls-comp-title">{last.title}</span><span className="ls-comp-sub">{ago(last.at, now)}</span></p>
                : <p className="ls-comp-move ls-comp-sub">No move spotted yet</p>}
              <div className="ls-comp-nums">
                <div>
                  <span className="ls-ov-k">Share of voice</span>
                  <span className="ls-ov-v"><b className="num">{sov[c.id] ?? 0}%</b><Delta v={`${delta > 0 ? '+' : ''}${delta} pts`} down={delta < 0} invert /></span>
                  <Spark data={t} w={120} h={24} fill={false} color="var(--chart)" label={`${c.name} share of voice, last 6 weeks`} />
                </div>
                <div>
                  <span className="ls-ov-k">Sentiment</span>
                  <MoodBar positive={mood.positive} negative={mood.negative} label={`How people talk about ${c.name}`} />
                </div>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** The brands Echo watches, as small objects: share of voice and its 6-week line, a link to each page. */
export function CompetitorsAside() {
  const { s } = useStore()
  const sov = shareOfVoice(s)
  const trend = sovTrend(s)
  const watched = competitorsOf(s).filter(c => s.listening.watch.find(w => w.id === c.id)?.tracking)
  return (
    <aside className="card ls-aside" aria-labelledby="ls-aside-h">
      <div className="card-head"><h2 id="ls-aside-h">Competitors</h2><Link to="/listening/competitors" className="link-btn t-sm">See all</Link></div>
      <ul>
        {watched.map(c => (
          <li key={c.id}>
            <Link to={`/listening/competitors/profile/${c.id}`} className="ls-aside-row">
              <SocialAvatar name={c.name} org size={32} />
              <span className="grow"><b>{c.name}</b><span className="ls-aside-sub">{sov[c.id] ?? 0}% share of voice</span></span>
              <Spark data={trend[c.id] ?? []} w={64} h={24} fill={false} color="var(--ink-3)" label={`${c.name} share of voice, last 6 weeks`} />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
