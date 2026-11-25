import { useEffect, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronDown, ChevronRight, Lock, Minus, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { AgentId, Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { uid } from '../../app/core'
import { DAY } from '../../app/time'
import { AGENTS, NETWORK_LABEL } from '../../data/agents'
import { GOAL_UNITS, PRODUCT_NAMES, readBrief, readGoal, readLaunch, type BriefGap, type BriefInput, type Campaign, type CampaignStatus, type GoalUnit, type Phase, type Pillar } from '../../data/strategy'
import { PUBLISH_NETWORKS } from '../../data/publishing'
import { labelStats, labelWords, lastWeekOf, launchBlock, mixOf, pillarCheck, targetsOf } from './slice'
import { Btn, Empty, Mark, Menu, Modal, Net, PageHead, Pill, Tabs, Thinking } from '../../ui'
import { Reopen } from '../../ui/Feedback'
import { LineChart } from '../../ui/charts'
import './strategy.css'

const STATUS: Record<CampaignStatus, { label: string; tone?: 'ok' | 'caution' | 'signal' }> = {
  brief: { label: 'Brief' }, review: { label: 'Plan to review', tone: 'caution' }, live: { label: 'Live', tone: 'ok' }, done: { label: 'Done' },
}
const fmtDate = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const fmtGoal = (c: Campaign, v: number) => (c.goal.label.includes('€') ? `€${v.toLocaleString('en-GB')}` : v.toLocaleString('en-GB'))

export default function StrategyPage() {
  const loc = useLocation()
  const nav = useNavigate()
  const seg = loc.pathname.split('/')[2] ?? ''
  const tab = seg === 'pillars' ? 'pillars' : 'campaigns'
  return (
    <div className="page strategy">
      <PageHead agent="sage" title="Strategy" lede="Sage turns a two-line brief into a plan the whole team follows, and keeps the pillars and cadence on track.">
        {/* Only on the lists: on the brief it would point to itself, in a campaign it would compete with Approve. */}
        {(seg === '' || seg === 'pillars') && <Btn variant="primary" onClick={() => nav('/strategy/new')}><Sparkles size={14} />New campaign brief</Btn>}
      </PageHead>
      {seg !== 'new' && <Tabs value={tab} onChange={v => nav(v === 'campaigns' ? '/strategy' : '/strategy/pillars')} items={[{ value: 'campaigns', label: 'Campaigns' }, { value: 'pillars', label: 'Pillars and cadence' }]} />}
      <Routes>
        <Route index element={<Campaigns />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/:id" element={<CampaignView />} />
        <Route path="new" element={<NewBrief />} />
        <Route path="pillars" element={<Pillars />} />
        <Route path="*" element={<Campaigns />} />
      </Routes>
    </div>
  )
}

/* ---------- Campaign list ---------- */
function Campaigns() {
  const { s } = useStore()
  const order: CampaignStatus[] = ['review', 'live', 'brief', 'done']
  const list = [...s.strategy.campaigns].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
  return (
    <div className="stack lg">
    <Moments />
    {!list.length ? <Empty title="No campaigns yet" body="Write a two-line brief and Sage builds the plan." action={<Link to="/strategy/new" className="btn primary">New campaign brief</Link>} /> : (
    <div className="campaigns">
      {list.map(c => {
        const pct = Math.round((c.goal.current / c.goal.target) * 100)
        return (
          <Link key={c.id} to={`/strategy/campaigns/${c.id}`} className="card campaign-row">
            <div className="row between">
              <h2>{c.name}</h2>
              <Pill tone={STATUS[c.status].tone} dot={c.status === 'live'}>{STATUS[c.status].label}{c.status === 'review' && c.version > 1 ? ` · v${c.version}` : ''}</Pill>
            </div>
            <p className="muted">{c.brief}</p>
            <div className="campaign-meta">
              <span className="mono faint">{fmtDate(c.start)} – {fmtDate(c.end)}</span>
              <span className="faint">{c.posts.length} posts · €{c.budget} boost budget</span>
            </div>
            <div className="goal-line">
              <span>{c.status === 'review' ? 'Goal' : 'Progress'}: <b className="num">{c.status === 'review' ? fmtGoal(c, c.goal.target) : `${fmtGoal(c, c.goal.current)} of ${fmtGoal(c, c.goal.target)}`}</b> {c.goal.label.replace(' (€)', '')}</span>
              {c.status !== 'review' && <span className="goal-bar" aria-hidden><i style={{ width: `${Math.min(100, pct)}%` }} /></span>}
              {c.status !== 'review' && <span className="num faint">{pct}%</span>}
            </div>
          </Link>
        )
      })}
    </div>
    )}
    </div>
  )
}

/** Dates worth planning for. Sage raises each one 3 weeks before; added ones show in Atlas's calendar. */
function Moments() {
  const { s, d } = useStore()
  const now = useNow()
  const list = s.strategy.moments.filter(m => m.end > now)
  if (!list.length) return null
  return (
    <section className="card">
      <div className="card-head"><h2 className="row tight"><Mark agent="sage" />Moments ahead</h2><span className="faint">Sage raises each one 3 weeks before</span></div>
      <ul className="rows">
        {list.map(m => (
          <li key={m.id} className="moment">
            <span className="mono faint moment-date">{fmtDate(m.start)}{fmtDate(m.end) !== fmtDate(m.start) ? ` – ${fmtDate(m.end)}` : ''}</span>
            <div className="moment-body">
              <b>{m.name}</b>
              <p className="muted">{m.why} <span className="faint">{m.ideas.length} ideas for Atlas · {m.pillars.join(', ')}</span></p>
            </div>
            {m.status === 'added' ? <Pill tone="ok">In the calendar</Pill>
              : m.status === 'skipped' ? <Reopen label="Not this year" onUndo={() => d({ type: 'strategy/reopen', id: m.id })} />
              : (
                <div className="row nowrap">
                  <Btn size="sm" onClick={() => d({ type: 'strategy/moment', id: m.id, add: true })}>Add to the calendar</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => d({ type: 'strategy/moment', id: m.id, add: false })}>Not this year</Btn>
                </div>
              )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------- New brief ---------- */
const PHASES = ['Reading your last 3 launches', 'Checking pillars and cadence', 'Splitting the work between agents']
const STEP_MS = 1100
const UNIT_LABEL: Record<GoalUnit, string> = { 'pre-orders': 'pre-orders', orders: 'orders', 'sign-ups': 'sign-ups', requests: 'requests', 'new followers': 'new followers', 'revenue from social (€)': '€ revenue from social' }
const isoDay = (t: number) => new Date(t).toLocaleDateString('en-CA')
const fromIso = (v: string) => (v ? new Date(`${v}T09:00`).getTime() : undefined)

type Fields = { product: string; launch: string; target: string; unit: GoalUnit; audience: string; networks: Network[] }

/** The one question Sage asks before building, with answers in one click. */
function questionFor(gap: BriefGap, text: string, now: number): { q: string; choices: { label: string; value: Partial<BriefInput> }[]; placeholder: string } {
  if (gap === 'goal') {
    const unit: GoalUnit = /pre-?order/i.test(text) ? 'pre-orders' : /launch|bottle|jacket|ridge|fleece/i.test(text) ? 'orders' : 'sign-ups'
    return {
      q: 'What number says it worked?', placeholder: 'e.g. 500 orders',
      choices: [
        { label: `300 ${unit}`, value: { goal: { target: 300, unit } } },
        { label: `1,000 ${unit}`, value: { goal: { target: 1000, unit } } },
        { label: '€20,000 revenue from social', value: { goal: { target: 20000, unit: 'revenue from social (€)' } } },
      ],
    }
  }
  const d = new Date(now)
  const first = new Date(d.getFullYear(), d.getMonth() + 2, 1, 9).getTime()
  return {
    q: 'When does it launch?', placeholder: '',
    choices: [3, 6].map(w => ({ label: `In ${w} weeks, ${fmtDate(now + w * 7 * DAY)}`, value: { launch: now + w * 7 * DAY } })).concat([{ label: fmtDate(first), value: { launch: first } }]),
  }
}

function NewBrief() {
  const [params] = useSearchParams()
  const { s, d } = useStore()
  const now = useNow()
  const nav = useNavigate()
  const [brief, setBrief] = useState(params.get('brief') ?? '')
  const [budget, setBudget] = useState('')
  const cadence = targetsOf(s).cadence
  const [f, setF] = useState<Fields>({ product: '', launch: '', target: '', unit: 'orders', audience: '', networks: PUBLISH_NETWORKS.filter(n => (cadence[n] ?? 0) > 0) })
  const [more, setMore] = useState(false)
  const [phase, setPhase] = useState(-1)
  const [ask, setAsk] = useState<{ gap: BriefGap; input: BriefInput } | null>(null)
  const [answer, setAnswer] = useState('')
  const started = useRef(false)

  // Leaving the page while Sage is thinking cancels the plan: no campaign appears behind your back.
  const timers = useRef<number[]>([])
  useEffect(() => () => { timers.current.forEach(clearTimeout); timers.current = []; started.current = false }, [])
  const after = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))

  const fields = (): Partial<BriefInput> => ({
    product: f.product || undefined, launch: fromIso(f.launch), audience: f.audience.trim() || undefined, networks: f.networks,
    goal: +f.target ? { target: +f.target, unit: f.unit } : undefined, budget: budget ? +budget : undefined,
  })
  /** Build once nothing is missing: the last two thinking steps, then the plan. */
  const build = (input: BriefInput) => {
    setAsk(null)
    after(0, () => setPhase(1))
    after(STEP_MS, () => setPhase(2))
    after(2 * STEP_MS, () => {
      const id = uid('cmp')
      const { text, ...rest } = input
      d({ type: 'strategy/create', id, brief: text, input: rest })
      nav(`/strategy/campaigns/${id}`, { replace: true })
    })
  }
  /** Sage asks for the first thing the brief leaves out, or builds. */
  const next = (input: BriefInput) => {
    const { missing } = readBrief(input.text, now, input)
    if (missing.length) { setAnswer(''); setAsk({ gap: missing[0], input }) } else build(input)
  }
  const run = (text = brief) => {
    if (!text.trim() || started.current) return
    started.current = true
    setPhase(0)
    after(STEP_MS, () => next(readBrief(text.trim(), now, fields()).input))
  }
  const reply = (value: Partial<BriefInput>) => ask && next({ ...ask.input, ...value })
  const typed = (): Partial<BriefInput> | undefined => {
    if (!ask || !answer.trim()) return
    if (ask.gap === 'goal') { const goal = readGoal(answer); return goal && { goal } }
    const launch = readLaunch(answer, now) ?? fromIso(answer)
    return launch ? { launch } : undefined
  }

  useEffect(() => { if (params.get('auto') === '1' && params.get('brief')) run(params.get('brief')!) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleNet = (n: Network) => setF(x => ({ ...x, networks: x.networks.includes(n) ? x.networks.filter(y => y !== n) : [...x.networks, n] }))
  const qa = ask && questionFor(ask.gap, ask.input.text, now)
  const typedValue = typed()

  return (
    <div className="new-brief">
      <Btn variant="ghost" size="sm" onClick={() => nav('/strategy')}><ArrowLeft size={14} />Campaigns</Btn>
      <section className="card pad-lg stack">
        <div className="row tight"><Mark agent="sage" /><b>Brief Sage</b></div>
        <p className="muted">Two or three lines are enough: what, when, and the one number that says it worked. Sage asks for what’s missing.</p>
        {phase < 0 ? (
          <form className="stack" onSubmit={e => { e.preventDefault(); run() }}>
            <div className="field">
              <label htmlFor="brief">Brief</label>
              <textarea id="brief" className="textarea" rows={4} autoFocus value={brief} onChange={e => setBrief(e.target.value)} placeholder="Launch the new Storm Jacket on March 15, goal 300 pre-orders." />
            </div>
            <button type="button" className="disclose" aria-expanded={more} aria-controls="brief-more" onClick={() => setMore(o => !o)}>
              <ChevronRight size={14} aria-hidden />More details <span className="faint">(optional)</span>
            </button>
            {more && (
              <div id="brief-more" className="brief-fields">
                <div className="field">
                  <span className="label" id="product-l">Product</span>
                  <Menu align="start" trigger={<button type="button" className="select-btn" aria-labelledby="product-l">{f.product || 'Sage picks from the brief'}<ChevronDown size={14} /></button>}
                    items={[{ label: 'Sage picks from the brief', onSelect: () => setF(x => ({ ...x, product: '' })) }, ...PRODUCT_NAMES.map(p => ({ label: p, onSelect: () => setF(x => ({ ...x, product: p })) }))]} />
                </div>
                <div className="field">
                  <label htmlFor="launch">Launch date</label>
                  <input id="launch" type="date" className="input" value={f.launch} min={isoDay(now)} onChange={e => setF(x => ({ ...x, launch: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="target">Goal</label>
                  <div className="row tight nowrap">
                    <input id="target" className="input goal-input" inputMode="numeric" placeholder="300" value={f.target} onChange={e => setF(x => ({ ...x, target: e.target.value.replace(/[^\d]/g, '') }))} />
                    <Menu align="start" trigger={<button type="button" className="select-btn" aria-label="Goal unit">{UNIT_LABEL[f.unit]}<ChevronDown size={14} /></button>}
                      items={GOAL_UNITS.map(u => ({ label: UNIT_LABEL[u], onSelect: () => setF(x => ({ ...x, unit: u })) }))} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="budget">Boost budget</label>
                  <input id="budget" className="input" inputMode="numeric" placeholder="€600" value={budget} onChange={e => setBudget(e.target.value.replace(/[^\d]/g, ''))} />
                </div>
                <div className="field span-2">
                  <label htmlFor="audience">Audience</label>
                  <input id="audience" className="input" placeholder="Sage picks it from the product and your followers" value={f.audience} onChange={e => setF(x => ({ ...x, audience: e.target.value }))} />
                </div>
                <div className="field span-2">
                  <span className="label" id="nets-l">Networks</span>
                  <div className="row tight" role="group" aria-labelledby="nets-l">
                    {PUBLISH_NETWORKS.map(n => (
                      <button key={n} type="button" className="filter net-toggle" aria-pressed={f.networks.includes(n)} aria-label={NETWORK_LABEL[n]} title={NETWORK_LABEL[n]} onClick={() => toggleNet(n)}><Net n={n} /></button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="row">
              <Btn variant="primary" type="submit" disabled={!brief.trim() || (more && !f.networks.length)}><Sparkles size={14} />Build the plan</Btn>
              <span className="faint">{more && !f.networks.length ? 'Pick at least one network.' : 'Sage drafts it. Nothing goes live until you approve.'}</span>
            </div>
            <div className="row tight examples">
              <span className="faint">Try:</span>
              {['Launch the new Storm Jacket on March 15, goal 300 pre-orders.', 'Repair Week in January: 1,000 repair requests.', 'Summit Bottle back-to-school push in September, 2,000 orders.'].map(x => (
                <button key={x} type="button" className="filter" onClick={() => setBrief(x)}>{x}</button>
              ))}
            </div>
          </form>
        ) : (
          <div className="sage-thinking" role="status">
            <blockquote>“{brief}”</blockquote>
            <ol>
              {PHASES.map((p, i) => (
                <li key={p} className={i < phase || (i === 0 && ask) ? 'done' : i === phase && !ask ? 'now' : ''}>
                  {i < phase || (i === 0 && ask) ? <Check size={14} /> : i === phase && !ask ? <Thinking label={p} /> : <span className="faint">{p}</span>}
                  {(i < phase || (i === 0 && ask)) && <span>{p}</span>}
                  {i === 0 && qa && (
                    <form className="sage-ask" onSubmit={e => { e.preventDefault(); if (typedValue) reply(typedValue) }}>
                      <p className="row tight"><Mark agent="sage" /><b>{qa.q}</b></p>
                      <div className="row tight">
                        {qa.choices.map((c, n) => <Btn key={c.label} size="sm" variant={n === 0 ? 'primary' : undefined} autoFocus={n === 0} onClick={() => reply(c.value)}>{c.label}</Btn>)}
                      </div>
                      <div className="row tight nowrap">
                        <label htmlFor="sage-answer" className="sr-only">Your answer</label>
                        {ask!.gap === 'launch'
                          ? <input id="sage-answer" type="date" className="input mw-220" min={isoDay(now)} value={answer} onChange={e => setAnswer(e.target.value)} />
                          : <input id="sage-answer" className="input mw-220" placeholder={qa.placeholder} value={answer} onChange={e => setAnswer(e.target.value)} />}
                        <Btn size="sm" type="submit" disabled={!typedValue}>Use this</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => build(ask!.input)}>Let Sage decide</Btn>
                      </div>
                    </form>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  )
}

/* ---------- Campaign ---------- */
function CampaignView() {
  const { id } = useParams()
  const { s, d } = useStore()
  const now = useNow()
  const nav = useNavigate()
  const [changes, setChanges] = useState(false)
  const [note, setNote] = useState('')
  const [discard, setDiscard] = useState(false)
  const c = s.strategy.campaigns.find(x => x.id === id)
  if (!c) return <Empty title="This campaign doesn’t exist" body="It may have been discarded." action={<Btn onClick={() => nav('/strategy')}>All campaigns</Btn>} />
  const dayN = Math.max(1, Math.ceil((now - c.start) / DAY))
  const days = Math.ceil((c.end - c.start) / DAY)
  const pct = Math.round((c.goal.current / c.goal.target) * 100)
  const expected = c.planned[Math.min(c.planned.length - 1, c.actual.length - 1)] ?? 0
  const block = c.status === 'review' ? launchBlock(s, c) : undefined

  return (
    <div className="stack lg">
      <Btn variant="ghost" size="sm" onClick={() => nav('/strategy')} className="self-start"><ArrowLeft size={14} />Campaigns</Btn>
      <header className="campaign-head">
        <div>
          <div className="row tight"><Pill tone={STATUS[c.status].tone} dot={c.status === 'live'}>{STATUS[c.status].label}</Pill><span className="mono faint">{fmtDate(c.start)} – {fmtDate(c.end)}{c.version > 1 ? ` · version ${c.version}` : ''}</span></div>
          <h1>{c.name}</h1>
          <p className="muted brief-quote">“{c.brief}”</p>
          {c.assumptions && <p className="assumptions"><b>Sage assumed</b>{c.assumptions.map(x => <span key={x}>{x}</span>)}</p>}
        </div>
        {c.status === 'review' && (
          <div className="row">
            <Btn variant="primary" disabled={!!block} aria-describedby={block ? 'launch-block' : undefined} onClick={() => d({ type: 'strategy/approve', id: c.id })}><Check size={14} />Approve campaign</Btn>
            <Btn onClick={() => setChanges(o => !o)}>Request changes</Btn>
            <Btn variant="ghost" onClick={() => setDiscard(true)}><Trash2 size={14} />Discard</Btn>
          </div>
        )}
      </header>

      {block && <p id="launch-block" className="launch-block"><Lock size={14} aria-hidden />{block}</p>}

      {changes && c.status === 'review' && (
        <form className="card pad stack" onSubmit={e => { e.preventDefault(); if (note.trim()) { d({ type: 'strategy/changes', id: c.id, feedback: note.trim() }); setNote(''); setChanges(false) } }}>
          <label htmlFor="changes" className="side-label">What should Sage change?</label>
          <textarea id="changes" className="textarea" rows={3} autoFocus value={note} onChange={e => setNote(e.target.value)} placeholder="More TikTok, less budget, and no mention of price." />
          <div className="row"><Btn variant="primary" type="submit" disabled={!note.trim()}>Send to Sage</Btn><Btn variant="ghost" onClick={() => setChanges(false)}>Cancel</Btn></div>
        </form>
      )}

      {c.diff && c.status === 'review' && (
        <section className="card pad diff">
          <div className="section-title"><Mark agent="sage" />What changed in version {c.version}</div>
          <ul>{c.diff.map((x, i) => <li key={i} className={x.kind}><span className="diff-kind">{x.kind === 'added' ? 'Added' : x.kind === 'removed' ? 'Removed' : 'Changed'}</span>{x.text}</li>)}</ul>
        </section>
      )}

      {c.status !== 'review' && (
        <section className="card pad progress-card">
          <div className="progress-top">
            <div className="stat">
              <b className="num">{fmtGoal(c, c.goal.current)} <span className="faint">of {fmtGoal(c, c.goal.target)}</span></b>
              <span className="label">{c.goal.label.replace(' (€)', '')} · {pct}% of goal{c.status === 'live' ? ` · day ${Math.min(dayN, days)} of ${days}` : ''}</span>
            </div>
            {c.status === 'live' && expected > 0 && (
              <Pill tone={c.goal.current >= expected ? 'ok' : 'caution'}>{Math.round((c.goal.current / expected) * 100)}% of trajectory</Pill>
            )}
          </div>
          <LineChart label="Plan versus actual" labels={c.planned.map((_, i) => `Day ${i}`)} h={180}
            series={[{ name: 'Planned', data: c.planned, dashed: true, tone: 'faint' }, { name: 'Actual', data: c.actual, color: 'var(--a-sage)' }]} />
        </section>
      )}

      {c.status === 'live' && c.adjustments.length > 0 && (
        <section className="card">
          <div className="card-head"><h2 className="row tight"><Mark agent="sage" />Sage’s adjustments</h2></div>
          <ul className="rows">
            {c.adjustments.map(a => (
              <li key={a.id} className="adjust">
                <p>{a.text}</p>
                {a.status === 'proposed' ? (
                  <div className="row nowrap">
                    <Btn size="sm" onClick={() => d({ type: 'strategy/adjust', id: c.id, adj: a.id, accept: true })}>Apply</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => d({ type: 'strategy/adjust', id: c.id, adj: a.id, accept: false })}>Decline</Btn>
                  </div>
                ) : a.status === 'accepted' ? <Pill tone="ok">Applied</Pill> : <Reopen label="Declined" onUndo={() => d({ type: 'strategy/reopen', id: c.id, adj: a.id })} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.recap && (
        <section className="card pad recap">
          <div className="section-title"><Mark agent={c.recapBy ?? 'iris'} />{c.recapBy === 'sage' ? 'Recap by Sage, with Iris’s numbers' : 'Recap by Iris'}</div>
          {c.recap.map(p => <p key={p}>{p}</p>)}
          {c.reportId && <Link to={`/insights/reports/${c.reportId}`} className="btn sm">Full recap</Link>}
        </section>
      )}

      <div className="grid-2">
        <section className="card pad">
          <div className="section-title">Goal and KPIs</div>
          <p className="goal-big"><b className="num">{fmtGoal(c, c.goal.target)}</b> {c.goal.label.replace(' (€)', '')}</p>
          <ul className="bullets">{c.kpis.map(k => <li key={k}>{k}</li>)}</ul>
          <div className="faint budget">Boost budget: <b className="num">€{c.budget.toLocaleString('en-GB')}</b></div>
        </section>
        <section className="card pad">
          <div className="section-title">Key messages</div>
          <ul className="bullets">{c.messages.map(m => <li key={m}>{m}</li>)}</ul>
          <div className="section-title mt-4">Audience</div>
          <p className="muted">{c.audience}</p>
        </section>
      </div>

      <section className="card pad">
        <div className="section-title">Timeline</div>
        <Timeline c={c} now={now} />
      </section>

      <section className="card pad">
        <div className="section-title">Posts by phase <span className="faint">· {c.posts.length} posts</span>{c.status === 'live' && <Link to="/publishing/calendar" className="section-link">See them in Atlas’s calendar</Link>}</div>
        <div className="phase-cols">
          {(['Teasing', 'Launch', 'Follow-up'] as Phase['name'][]).map(ph => (
            <div key={ph} className="phase-col">
              <h3>{ph} <span className="faint num">{c.posts.filter(p => p.phase === ph).length}</span></h3>
              <ul>
                {c.posts.filter(p => p.phase === ph).sort((a, b) => a.day - b.day).map(p => (
                  <li key={p.id}>
                    <Net n={p.network} />
                    <span className="ellipsis" title={p.title}>{p.title}</span>
                    <span className="mono faint">{fmtDate(c.base + p.day * DAY)}</span>
                    {p.published && <Check size={13} className="ok" aria-label="Published" />}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {c.status !== 'review' && <LabelCard c={c} />}

      <section className="card pad">
        <div className="section-title">Who does what <span className="faint">· drag a task to another agent, or use its menu</span></div>
        <DelegateBoard c={c} />
      </section>

      {c.risks.length > 0 && (
        <section className="card pad">
          <div className="section-title">Risks Sage sees</div>
          <ul className="bullets">{c.risks.map(r => <li key={r}>{r}</li>)}</ul>
        </section>
      )}

      <Modal open={discard} onOpenChange={setDiscard} title={`Discard ${c.name}?`} footer={<><span className="spacer" /><Btn variant="ghost" onClick={() => setDiscard(false)}>Keep it</Btn><Btn variant="danger" onClick={() => { d({ type: 'strategy/discard', id: c.id }); nav('/strategy') }}>Discard plan</Btn></>}>
        <p className="muted">The plan and its Desk card go away. Sage keeps the brief in the journal.</p>
      </Modal>
    </div>
  )
}

/** The campaign's label, shared by Atlas's posts and Nova's conversations. */
function LabelCard({ c }: { c: Campaign }) {
  const { s, d } = useStore()
  const st = labelStats(s, c)
  return (
    <section className="card pad stack">
      <div className="section-title flush">Campaign label <span className="faint">· shared by Atlas and Nova</span></div>
      <p className="row tight"><Pill>{c.name}</Pill><span>{st.posts} post{st.posts === 1 ? '' : 's'} in Atlas’s calendar ({st.published} published) · {st.convs} conversation{st.convs === 1 ? '' : 's'} in the Inbox</span></p>
      {st.latest && <p className="muted">Latest: {st.latest.author}, “{st.latest.text}”</p>}
      {st.rule
        ? <p className="faint">Nova labels every new conversation that mentions {labelWords(c).map(w => `“${w}”`).join(', ')}.</p>
        : <div className="row"><Btn size="sm" onClick={() => d({ type: 'strategy/label', id: c.id })}>Ask Nova to label conversations</Btn><span className="faint">Through an Inbox rule you can edit or undo.</span></div>}
      <div className="row tight"><Link to="/publishing/calendar" className="btn sm ghost">Calendar</Link><Link to="/inbox" className="btn sm ghost">Inbox</Link></div>
    </section>
  )
}

function Timeline({ c, now }: { c: Campaign; now: number }) {
  const span = c.end - c.start
  const x = (t: number) => `${Math.max(0, Math.min(100, ((t - c.start) / span) * 100))}%`
  return (
    <div className="timeline">
      <div className="tl-track">
        {c.phases.map(p => (
          <div key={p.name} className={`tl-phase ${p.name === 'Launch' ? 'launch' : ''}`} style={{ left: x(p.start), width: `calc(${x(p.end)} - ${x(p.start)})` }}>
            <b>{p.name}</b><span>{fmtDate(p.start)} – {fmtDate(p.end)}</span>
          </div>
        ))}
        {now > c.start && now < c.end && <span className="tl-now" style={{ left: x(now) }} aria-label="Today" />}
      </div>
      <div className="tl-summary">
        {c.phases.map(p => <p key={p.name}><b>{p.name}</b> <span className="muted">{p.summary}</span></p>)}
      </div>
    </div>
  )
}

/** Tasks in one column per agent. Drag between columns, or use the menu (keyboard). */
function DelegateBoard({ c }: { c: Campaign }) {
  const { d } = useStore()
  const [over, setOver] = useState<AgentId | null>(null)
  const move = (task: string, agent: AgentId) => d({ type: 'strategy/reassign', id: c.id, task, agent })
  return (
    <div className="delegate">
      {AGENTS.map(a => {
        const tasks = c.tasks.filter(t => t.agent === a.id)
        return (
          <div key={a.id} className={`dcol ${over === a.id ? 'over' : ''}`}
            onDragOver={e => { e.preventDefault(); setOver(a.id) }} onDragLeave={() => setOver(null)}
            onDrop={e => { e.preventDefault(); setOver(null); const t = e.dataTransfer.getData('text/plain'); if (t) move(t, a.id) }}>
            <h3><Mark agent={a.id} />{a.name}<span className="faint num">{tasks.length}</span></h3>
            {tasks.map(t => (
              <div key={t.id} className="dtask" draggable onDragStart={e => e.dataTransfer.setData('text/plain', t.id)}>
                <span>{t.label}</span>
                <div className="row tight">
                  <span className={`tstatus ${t.status}`}>{t.status === 'todo' ? 'To do' : t.status === 'doing' ? 'In progress' : 'Done'}</span>
                  <span className="spacer" />
                  <Menu trigger={<Btn size="xs" variant="ghost" aria-label={`Move “${t.label}”`}>Move</Btn>}
                    items={[{ heading: 'Move to' }, ...AGENTS.filter(x => x.id !== a.id).map(x => ({ label: x.name, icon: <Mark agent={x.id} />, onSelect: () => move(t.id, x.id) }))]} />
                </div>
              </div>
            ))}
            {!tasks.length && <div className="dempty">Drop a task here</div>}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Pillars and cadence ---------- */

/** Sam edits the shares and descriptions; Sage checks the sum and says what it means in posts a week. */
function PillarEditor({ draft, onChange, onDone }: { draft: Pillar[]; onChange: (p: Pillar[]) => void; onDone: () => void }) {
  const { s, d } = useStore()
  const check = pillarCheck(s, draft)
  const set = (id: string, patch: Partial<Pillar>) => onChange(draft.map(p => (p.id === id ? { ...p, ...patch } : p)))
  return (
    <form className="pillar-edit" onSubmit={e => { e.preventDefault(); if (check.ok) { d({ type: 'strategy/pillars', pillars: draft }); onDone() } }}>
      <table className="table">
        <thead><tr><th>Pillar</th><th className="r">Target</th><th>Description</th></tr></thead>
        <tbody>
          {draft.map(p => (
            <tr key={p.id}>
              <td><b>{p.name}</b></td>
              <td className="r">
                <span className="row tight nowrap pct-input">
                  <input className="input" type="number" min={0} max={100} step={5} aria-label={`${p.name} target share`} value={Number.isFinite(p.target) ? p.target : ''} onChange={e => set(p.id, { target: e.target.value === '' ? NaN : +e.target.value })} />%
                </span>
              </td>
              <td><input className="input" aria-label={`${p.name} description`} value={p.desc} onChange={e => set(p.id, { desc: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td>Total</td><td className={`r num ${check.total === 100 ? '' : 'warn'}`}>{check.total}%</td><td /></tr></tfoot>
      </table>
      <div className="sage-check" aria-live="polite">
        <Mark agent="sage" />
        <p>{check.issues[0] ?? (check.impact.length ? `${check.impact.join('. ')}. Atlas plans to it from next week.` : 'Change a share or a description and I’ll check it.')}</p>
      </div>
      <div className="row">
        <Btn variant="primary" type="submit" disabled={!check.ok}>Apply</Btn>
        <Btn variant="ghost" onClick={onDone}>Cancel</Btn>
      </div>
    </form>
  )
}
function Pillars() {
  const { s, d } = useStore()
  const [edit, setEdit] = useState<Pillar[] | null>(null)
  const now = useNow()
  const mix = mixOf(s, now)
  const week = lastWeekOf(s, now)
  return (
    <div className="stack lg">
      <section className="card pad">
        <div className="row between">
          <div className="section-title flush">Editorial pillars <span className="faint">· share of posts, last 30 days</span></div>
          {edit ? null : (
            <div className="row tight">
              <span className="row tight faint lock-note"><Lock size={13} />Sage suggests, you decide</span>
              <Btn size="sm" onClick={() => setEdit(structuredClone(s.strategy.pillars))}><Pencil size={14} />Edit pillars</Btn>
            </div>
          )}
        </div>
        {edit && <PillarEditor draft={edit} onChange={setEdit} onDone={() => setEdit(null)} />}
        <div className="pillars" hidden={!!edit}>
          {s.strategy.pillars.map(p => {
            const actual = mix[p.name] ?? 0
            const off = actual - p.target
            return (
              <div key={p.id} className="pillar">
                <div className="row between">
                  <b>{p.name}</b>
                  <span className="num">{actual}% <span className="faint">of posts · target {p.target}%</span></span>
                </div>
                <p className="faint">{p.desc}</p>
                <div className="pbar" role="img" aria-label={`${p.name}: ${actual}% of posts, target ${p.target}%`}>
                  <i style={{ width: `${Math.min(100, actual * 2)}%` }} className={Math.abs(off) > 5 ? 'off' : ''} />
                  <span className="target" style={{ left: `${p.target * 2}%` }} />
                </div>
                {Math.abs(off) > 5 && <span className="off-target">{Math.abs(off)} pt {off > 0 ? 'over' : 'under'} target</span>}
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Cadence per week</h2><span className="faint">Atlas plans to these targets</span></div>
          <table className="table">
            <thead><tr><th>Network</th><th className="r">Last 7 days</th><th className="r">Target</th></tr></thead>
            <tbody>
              {s.strategy.cadence.map(c => (
                <tr key={c.network}>
                  <td><Net n={c.network} size={20} /></td>
                  <td className="r">{week[c.network] ?? 0}{(week[c.network] ?? 0) < c.target && <span className="off-target"> · {c.target - (week[c.network] ?? 0)} short</span>}</td>
                  <td className="r">
                    <span className="stepper">
                      <Btn size="xs" variant="ghost" icon aria-label={`Lower ${NETWORK_LABEL[c.network]} target`} onClick={() => d({ type: 'strategy/cadence', network: c.network, target: c.target - 1 })}><Minus size={12} /></Btn>
                      <b className="num">{c.target}</b>
                      <Btn size="xs" variant="ghost" icon aria-label={`Raise ${NETWORK_LABEL[c.network]} target`} onClick={() => d({ type: 'strategy/cadence', network: c.network, target: c.target + 1 })}><Plus size={12} /></Btn>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <div className="card-head"><h2 className="row tight"><Mark agent="sage" />Sage’s proposals</h2></div>
          <ul className="rows">
            {s.strategy.proposals.map(p => (
              <li key={p.id} className="proposal">
                <div>
                  <b>{p.text}</b>
                  <p className="muted">{p.why}</p>
                </div>
                {p.status === 'proposed' ? (
                  <div className="row nowrap">
                    <Btn size="sm" onClick={() => d({ type: 'strategy/proposal', id: p.id, accept: true })}>Apply</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => d({ type: 'strategy/proposal', id: p.id, accept: false })}>Decline</Btn>
                  </div>
                ) : p.status === 'accepted' ? <Pill tone="ok">Applied</Pill> : <Reopen label="Declined" onUndo={() => d({ type: 'strategy/reopen', id: p.id })} />}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
