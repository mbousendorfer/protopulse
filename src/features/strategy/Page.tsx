import { useEffect, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Lock, Minus, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { AgentId } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { uid } from '../../app/core'
import { DAY } from '../../app/time'
import { AGENTS, NETWORK_LABEL } from '../../data/agents'
import type { Campaign, CampaignStatus, Phase } from '../../data/strategy'
import { Btn, Empty, Mark, Menu, Modal, Net, PageHead, Pill, Tabs, Thinking } from '../../ui'
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
        <Btn variant="primary" onClick={() => nav('/strategy/new')}><Sparkles size={14} />New campaign brief</Btn>
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
  if (!list.length) return <Empty title="No campaigns yet" body="Write a two-line brief and Sage builds the plan." action={<Link to="/strategy/new" className="btn primary">New campaign brief</Link>} />
  return (
    <div className="campaigns">
      {list.map(c => {
        const pct = Math.round((c.goal.current / c.goal.target) * 100)
        return (
          <Link key={c.id} to={`/strategy/campaigns/${c.id}`} className="card campaign-row">
            <div className="row" style={{ justifyContent: 'space-between' }}>
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
  )
}

/* ---------- New brief ---------- */
const PHASES = ['Reading your last 3 launches', 'Checking pillars and cadence', 'Splitting the work between agents']

function NewBrief() {
  const [params] = useSearchParams()
  const { d } = useStore()
  const nav = useNavigate()
  const [brief, setBrief] = useState(params.get('brief') ?? '')
  const [budget, setBudget] = useState('')
  const [phase, setPhase] = useState(-1)
  const started = useRef(false)

  // Leaving the page while Sage is thinking cancels the plan: no campaign appears behind your back.
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const run = (text = brief) => {
    if (!text.trim() || started.current) return
    started.current = true
    setPhase(0)
    PHASES.forEach((_, i) => timers.current.push(window.setTimeout(() => setPhase(i), i * 1100)))
    timers.current.push(window.setTimeout(() => {
      const id = uid('cmp')
      d({ type: 'strategy/create', id, brief: text.trim(), budget: budget ? +budget : undefined })
      nav(`/strategy/campaigns/${id}`, { replace: true })
    }, PHASES.length * 1100))
  }

  useEffect(() => { if (params.get('auto') === '1' && params.get('brief')) run(params.get('brief')!) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="new-brief">
      <Btn variant="ghost" size="sm" onClick={() => nav('/strategy')}><ArrowLeft size={14} />Campaigns</Btn>
      <section className="card pad-lg stack">
        <div className="row tight"><Mark agent="sage" /><b>Brief Sage</b></div>
        <p className="muted">Two or three lines are enough: what, when, and the one number that says it worked.</p>
        {phase < 0 ? (
          <form className="stack" onSubmit={e => { e.preventDefault(); run() }}>
            <div className="field">
              <label htmlFor="brief">Brief</label>
              <textarea id="brief" className="textarea" rows={4} autoFocus value={brief} onChange={e => setBrief(e.target.value)} placeholder="Launch the new Storm Jacket on March 15, goal 300 pre-orders." />
            </div>
            <div className="field" style={{ maxWidth: 220 }}>
              <label htmlFor="budget">Boost budget (optional)</label>
              <input id="budget" className="input" inputMode="numeric" placeholder="€600" value={budget} onChange={e => setBudget(e.target.value.replace(/[^\d]/g, ''))} />
            </div>
            <div className="row">
              <Btn variant="primary" type="submit" disabled={!brief.trim()}><Sparkles size={14} />Build the plan</Btn>
              <span className="faint">Sage drafts it. Nothing goes live until you approve.</span>
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
                <li key={p} className={i < phase ? 'done' : i === phase ? 'now' : ''}>
                  {i < phase ? <Check size={14} /> : i === phase ? <Thinking label={p} /> : <span className="faint">{p}</span>}
                  {i < phase && <span>{p}</span>}
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

  return (
    <div className="stack lg">
      <Btn variant="ghost" size="sm" onClick={() => nav('/strategy')} style={{ alignSelf: 'flex-start' }}><ArrowLeft size={14} />Campaigns</Btn>
      <header className="campaign-head">
        <div>
          <div className="row tight"><Pill tone={STATUS[c.status].tone} dot={c.status === 'live'}>{STATUS[c.status].label}</Pill><span className="mono faint">{fmtDate(c.start)} – {fmtDate(c.end)}{c.version > 1 ? ` · version ${c.version}` : ''}</span></div>
          <h1>{c.name}</h1>
          <p className="muted brief-quote">“{c.brief}”</p>
        </div>
        {c.status === 'review' && (
          <div className="row">
            <Btn variant="primary" onClick={() => d({ type: 'strategy/approve', id: c.id })}><Check size={14} />Approve campaign</Btn>
            <Btn onClick={() => setChanges(o => !o)}>Request changes</Btn>
            <Btn variant="ghost" onClick={() => setDiscard(true)}><Trash2 size={14} />Discard</Btn>
          </div>
        )}
      </header>

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
                    <Btn size="sm" variant="primary" onClick={() => d({ type: 'strategy/adjust', id: c.id, adj: a.id, accept: true })}>Apply</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => d({ type: 'strategy/adjust', id: c.id, adj: a.id, accept: false })}>Decline</Btn>
                  </div>
                ) : <Pill tone={a.status === 'accepted' ? 'ok' : undefined}>{a.status === 'accepted' ? 'Applied' : 'Declined'}</Pill>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.recap && (
        <section className="card pad recap">
          <div className="section-title"><Mark agent="iris" />Recap by Iris</div>
          {c.recap.map(p => <p key={p}>{p}</p>)}
          <Link to="/insights/reports/repair-friday" className="btn sm">Full recap</Link>
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
          <div className="section-title" style={{ marginTop: 16 }}>Audience</div>
          <p className="muted">{c.audience}</p>
        </section>
      </div>

      <section className="card pad">
        <div className="section-title">Timeline</div>
        <Timeline c={c} now={now} />
      </section>

      <section className="card pad">
        <div className="section-title">Posts by phase <span className="faint">· {c.posts.length} posts</span></div>
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
function Pillars() {
  const { s, d } = useStore()
  return (
    <div className="stack lg">
      <section className="card pad">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="section-title" style={{ margin: 0 }}>Editorial pillars <span className="faint">· share of posts, last 30 days</span></div>
          <span className="row tight faint lock-note"><Lock size={13} />Locked: Sage suggests, you decide</span>
        </div>
        <div className="pillars">
          {s.strategy.pillars.map(p => {
            const off = p.actual - p.target
            return (
              <div key={p.id} className="pillar">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <b>{p.name}</b>
                  <span className="num">{p.actual}% <span className="faint">of posts · target {p.target}%</span></span>
                </div>
                <p className="faint">{p.desc}</p>
                <div className="pbar" role="img" aria-label={`${p.name}: ${p.actual}% of posts, target ${p.target}%`}>
                  <i style={{ width: `${p.actual * 2}%` }} className={Math.abs(off) > 5 ? 'off' : ''} />
                  <span className="target" style={{ left: `${p.target * 2}%` }} />
                </div>
                {Math.abs(off) > 5 && <span className={`delta ${off < 0 ? 'down' : 'up'}`}>{off > 0 ? '+' : ''}{off} pt vs target</span>}
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
                  <td className="r">{c.actual}{c.actual < c.target && <span className="delta down"> −{c.target - c.actual}</span>}</td>
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
                    <Btn size="sm" variant="primary" onClick={() => d({ type: 'strategy/proposal', id: p.id, accept: true })}>Apply</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => d({ type: 'strategy/proposal', id: p.id, accept: false })}>Decline</Btn>
                  </div>
                ) : <Pill tone={p.status === 'accepted' ? 'ok' : undefined}>{p.status === 'accepted' ? 'Applied' : 'Declined'}</Pill>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
