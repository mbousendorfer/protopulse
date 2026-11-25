import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Pencil, Sunrise } from 'lucide-react'
import type { AgentId, Autonomy, Network, RuleKind } from '../../app/types'
import { useStore } from '../../app/store'
import { AGENTS, AUTONOMY, AUTONOMY_LABEL } from '../../data/agents'
import { Btn, Mark, Net, Pill, Seg, Thinking } from '../../ui'
import './onboarding.css'
import { AgentScene, OnboardingScene } from '../../ui/Illustrations'

type Preset = 'cautious' | 'balanced' | 'autonomous'
const STEPS = ['Connect accounts', 'Build your Playbook', 'Meet your team', 'Set autonomy', 'First brief']

const INTEGRATIONS: { id: string; name: string; net?: Network; handle: string; group: 'Social' | 'Reviews' | 'Store' }[] = [
  { id: 'ig', name: 'Instagram', net: 'instagram', handle: '@fernway · 48k', group: 'Social' },
  { id: 'tt', name: 'TikTok', net: 'tiktok', handle: '@fernway.co · 31k', group: 'Social' },
  { id: 'li', name: 'LinkedIn', net: 'linkedin', handle: 'Fernway · 9k', group: 'Social' },
  { id: 'fb', name: 'Facebook', net: 'facebook', handle: 'Fernway Outdoor · 22k', group: 'Social' },
  { id: 'yt', name: 'YouTube', net: 'youtube', handle: 'Fernway · 6k', group: 'Social' },
  { id: 'x', name: 'X', net: 'x', handle: '@fernwayco · 4k', group: 'Social' },
  { id: 'gr', name: 'Google Reviews', net: 'google', handle: 'Fernway Annecy · 4.6★', group: 'Reviews' },
  { id: 'tp', name: 'Trustpilot', net: 'trustpilot', handle: 'fernway.co · 4.4★', group: 'Reviews' },
  { id: 'shop', name: 'Shopify', handle: 'fernway.myshopify.com · 18,400 orders', group: 'Store' },
]

type Proposal = { id: string; kind: RuleKind | 'voice'; label: string; text: string; evidence: string; agents: AgentId[] }
const PROPOSALS: Proposal[] = [
  { id: 'p-voice', kind: 'voice', label: 'Voice', text: 'Warm, direct, a bit playful. Short sentences. First names.', evidence: 'Seen in 168 of your 200 last replies', agents: ['nova', 'atlas'] },
  { id: 'p-apologise', kind: 'do', label: 'Rule', text: 'Apologise once, then fix', evidence: 'Your complaint replies never apologise twice', agents: ['nova'] },
  { id: 'p-dm', kind: 'do', label: 'Rule', text: 'Move order details to DM', evidence: '41 public complaints moved to DM', agents: ['nova'] },
  { id: 'p-emoji', kind: 'dont', label: 'Rule', text: 'One emoji max', evidence: '94% of your posts use one emoji or none', agents: ['nova', 'atlas'] },
  { id: 'p-competitor', kind: 'dont', label: 'Rule', text: 'Never name a competitor in a reply', evidence: 'You never did in 200 replies', agents: ['nova', 'atlas'] },
  { id: 'p-returns', kind: 'fact', label: 'Fact', text: 'Returns: 30 days, free exchange, refund in 5 working days', evidence: 'From your help centre and 63 replies', agents: ['nova'] },
  { id: 'p-warranty', kind: 'fact', label: 'Fact', text: 'Lifetime warranty on Summit Bottles only', evidence: 'From your help centre', agents: ['nova'] },
  { id: 'p-shipping', kind: 'fact', label: 'Fact', text: 'Shipping: free over €60 in the EU, usually within 2 working days', evidence: 'From your Shopify shipping settings', agents: ['nova'] },
  { id: 'p-press', kind: 'escalate', label: 'Escalation', text: 'Journalists and press always go to a person', evidence: '3 press messages answered by Claire this year', agents: ['nova', 'echo'] },
]

const TOMORROW: Record<AgentId, string> = {
  nova: 'Answers the 30 to 50 overnight questions, drafts complaint replies for you, hides spam.',
  atlas: 'Fills next week’s calendar from your best posts and asks you to approve the plan on Thursday.',
  iris: 'Writes your first morning brief at 07:00: what happened, what needs you.',
  echo: 'Starts watching Peakline, Norrø, Trailkind and Basecamp Co., plus every mention of Fernway.',
  sage: 'Reads your last 90 days and proposes 4 editorial pillars and a posting cadence.',
  juno: 'Watches your YouTube channel and lives, and turns each new video into clips for you to review.',
}

const levelFor = (risk: string, p: Preset): Autonomy => p === 'cautious' ? (risk === 'safe' ? 'draft' : 'suggest') : p === 'balanced' ? (risk === 'safe' ? 'act' : 'draft') : 'act'

export default function OnboardingPage() {
  const { d } = useStore()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [connected, setConnected] = useState<string[]>([])
  const [kept, setKept] = useState<Record<string, { keep: boolean; text: string }>>({})
  const [presets, setPresets] = useState<Record<AgentId, Preset>>({ nova: 'cautious', atlas: 'cautious', iris: 'cautious', echo: 'cautious', sage: 'cautious', juno: 'cautious' })

  const finish = (skip = false) => {
    d({ type: 'core/onboarded' })
    if (!skip) {
      for (const a of AGENTS) d({ type: 'core/preset', agent: a.id, preset: presets[a.id] })
      for (const p of PROPOSALS) {
        const k = kept[p.id]
        if (k?.keep && p.kind !== 'voice' && p.kind !== 'escalate') d({ type: 'playbook/addRule', kind: p.kind, text: k.text, agents: p.agents, origin: 'Onboarding', quiet: true })
      }
    }
    nav('/')
  }

  const canNext = step === 0 ? connected.length > 0 : step === 1 ? Object.keys(kept).length === PROPOSALS.length : true

  return (
    <div className="onb">
      <header className="onb-top">
        <div className="row tight"><span className="logo" aria-hidden><svg width="16" height="16" viewBox="0 0 32 32"><path d="M4 17h6l3-8 5 15 3-7h7" stroke="var(--void)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></span><b>Protopulse</b><span className="faint">· Set up Fernway</span></div>
        <Btn variant="ghost" size="sm" onClick={() => finish(true)}>Skip setup</Btn>
      </header>

      <div className="onb-body">
        <nav className="onb-steps" aria-label="Setup steps">
          <div className="onb-progress"><span className="num">{step + 1} of {STEPS.length}</span><span className="bar"><i style={{ transform: `scaleX(${(step + 1) / STEPS.length})` }} /></span></div>
          <ol>
            {STEPS.map((label, i) => (
              <li key={label} className={i === step ? 'current' : i < step ? 'done' : ''}>
                <span className="dot">{i < step ? <Check size={12} /> : i + 1}</span>
                {i < step ? <button className="link-btn" onClick={() => setStep(i)}>{label}</button> : <span aria-current={i === step ? 'step' : undefined}>{label}</span>}
              </li>
            ))}
          </ol>
        </nav>

        <main className="onb-main">
          {step !== 2 && <div className="onb-scene"><OnboardingScene step={step} /></div>}
          {step === 0 && <Connect connected={connected} setConnected={setConnected} />}
          {step === 1 && <Playbook kept={kept} setKept={setKept} />}
          {step === 2 && <Team />}
          {step === 3 && <Autonomy presets={presets} setPresets={setPresets} />}
          {step === 4 && <FirstBrief connected={connected.length} kept={Object.values(kept).filter(k => k.keep).length} presets={presets} />}

          <footer className="onb-foot">
            {step > 0 && <Btn variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={14} />Back</Btn>}
            <span className="spacer" />
            {!canNext && <span className="faint">{step === 0 ? 'Connect at least one account to continue.' : 'Review every proposal to continue.'}</span>}
            {step < 4 ? <Btn variant="primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue<ArrowRight size={14} /></Btn>
              : <Btn variant="primary" onClick={() => finish()}><Sunrise size={14} />Start my agents</Btn>}
          </footer>
        </main>
      </div>
    </div>
  )
}

function Connect({ connected, setConnected }: { connected: string[]; setConnected: (f: (x: string[]) => string[]) => void }) {
  const [busy, setBusy] = useState<string[]>([])
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const connect = (id: string, delay = 0) => {
    timers.current.push(window.setTimeout(() => setBusy(b => [...b, id]), delay))
    timers.current.push(window.setTimeout(() => { setBusy(b => b.filter(x => x !== id)); setConnected(c => (c.includes(id) ? c : [...c, id])) }, delay + 1100))
  }
  const left = INTEGRATIONS.filter(i => !connected.includes(i.id) && !busy.includes(i.id))
  return (
    <section className="onb-step">
      <h1>Connect your accounts</h1>
      <p className="lede">Your agents read and act through these. Nothing is published until you’ve set their autonomy.</p>
      <div className="row"><Btn onClick={() => left.forEach((i, n) => connect(i.id, n * 350))} disabled={!left.length}>Connect all</Btn><span className="faint">{connected.length} of {INTEGRATIONS.length} connected</span></div>
      {(['Social', 'Reviews', 'Store'] as const).map(g => (
        <div key={g} className="onb-group">
          <h2>{g === 'Store' ? 'Store, for orders and refunds' : g === 'Reviews' ? 'Reviews' : 'Social networks'}</h2>
          <ul className="card rows">
            {INTEGRATIONS.filter(i => i.group === g).map(i => (
              <li key={i.id} className="onb-int">
                {i.net ? <Net n={i.net} /> : <span className="net">SH</span>}
                <div className="grow"><b>{i.name}</b>{connected.includes(i.id) && <div className="faint t-xs">{i.handle}</div>}</div>
                {busy.includes(i.id) ? <Thinking label="Connecting…" /> : connected.includes(i.id) ? <Pill tone="ok" dot>Connected</Pill> : <Btn size="sm" onClick={() => connect(i.id)}>Connect</Btn>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

const READ_PHASES = ['Reading your last 200 posts', 'Reading 200 replies and reviews', 'Finding your voice', 'Extracting product facts', 'Spotting your rules']

function Playbook({ kept, setKept }: { kept: Record<string, { keep: boolean; text: string }>; setKept: (f: (x: Record<string, { keep: boolean; text: string }>) => Record<string, { keep: boolean; text: string }>) => void }) {
  const done = Object.keys(kept).length
  const [phase, setPhase] = useState<'idle' | 'reading' | 'review'>(done ? 'review' : 'idle')
  const [pct, setPct] = useState(0)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  useEffect(() => {
    if (phase !== 'reading') return
    const t = setInterval(() => setPct(p => { if (p >= 100) { clearInterval(t); setPhase('review'); return 100 } return p + 4 }), 140)
    return () => clearInterval(t)
  }, [phase])
  const current = PROPOSALS[done]
  const decide = (keep: boolean, value = current.text) => { setKept(k => ({ ...k, [current.id]: { keep, text: value } })); setEditing(false) }

  return (
    <section className="onb-step">
      <h1>Build your Playbook</h1>
      <p className="lede">Protopulse reads how you already write, then proposes the voice, rules and facts every agent will follow. You keep what’s right.</p>
      {phase === 'idle' && <Btn variant="primary" onClick={() => setPhase('reading')} className="self-start">Read my last 200 posts and replies</Btn>}
      {phase === 'reading' && (
        <div className="card pad onb-reading" role="status">
          <Thinking label={READ_PHASES[Math.min(READ_PHASES.length - 1, Math.floor(pct / 20))]} />
          <span className="bar"><i style={{ transform: `scaleX(${pct / 100})` }} /></span>
          <span className="faint num">{Math.round(pct * 2)} of 200 posts</span>
        </div>
      )}
      {phase === 'review' && (
        current ? (
          <div className="stack">
            <div className="faint num">Proposal {done + 1} of {PROPOSALS.length}</div>
            <article className="card pad-lg onb-prop" key={current.id}>
              <span className="chip">{current.label}</span>
              {editing ? <input className="input" autoFocus value={text} onChange={e => setText(e.target.value)} aria-label="Edit the proposal" onKeyDown={e => { if (e.key === 'Enter' && text.trim()) decide(true, text.trim()) }} />
                : <p className="onb-prop-text">{current.text}</p>}
              <p className="faint">{current.evidence} · for {current.agents.map(a => a[0].toUpperCase() + a.slice(1)).join(' and ')}</p>
              <div className="row">
                {editing ? <><Btn variant="primary" disabled={!text.trim()} onClick={() => decide(true, text.trim())}>Keep edited</Btn><Btn variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn></>
                  : <><Btn variant="primary" onClick={() => decide(true)}><Check size={14} />Keep</Btn><Btn onClick={() => { setText(current.text); setEditing(true) }}><Pencil size={14} />Edit</Btn><Btn variant="ghost" onClick={() => decide(false)}>Skip</Btn></>}
                <span className="spacer" />
                <Btn size="sm" variant="ghost" onClick={() => setKept(k => Object.fromEntries([...Object.entries(k), ...PROPOSALS.filter(p => !k[p.id]).map(p => [p.id, { keep: true, text: p.text }])]))}>Keep all remaining</Btn>
              </div>
            </article>
          </div>
        ) : (
          <div className="card pad onb-summary">
            <Check size={16} className="ok" />
            <span>{Object.values(kept).filter(k => k.keep).length} kept, {Object.values(kept).filter(k => !k.keep).length} skipped. You can change any of it later in the Playbook.</span>
            <Btn size="sm" variant="ghost" onClick={() => setKept(() => ({}))}>Review again</Btn>
          </div>
        )
      )}
    </section>
  )
}

function Team() {
  return (
    <section className="onb-step">
      <h1>Meet your team</h1>
      <p className="lede">Six agents, one per department. They work around the clock and only come to you when a person is needed.</p>
      <div className="onb-team">
        {AGENTS.map(a => (
          <article key={a.id} className="card pad onb-agent">
            <AgentScene agent={a.id} />
            <div><h2>{a.name}</h2><span className="faint">{a.dept} · {a.shift}</span></div>
            <p className="muted">{a.role}</p>
            <p><span className="faint">Tomorrow morning: </span>{TOMORROW[a.id]}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Autonomy({ presets, setPresets }: { presets: Record<AgentId, Preset>; setPresets: (f: (p: Record<AgentId, Preset>) => Record<AgentId, Preset>) => void }) {
  return (
    <section className="onb-step">
      <h1>How much can each agent do alone?</h1>
      <p className="lede">We recommend Cautious for the first week: agents draft and suggest, you approve. They’ll ask for more autonomy when your approvals show they’ve earned it.</p>
      <div className="stack">
        {AGENTS.map(a => {
          const p = presets[a.id]
          const by = (l: Autonomy) => a.actions.filter(x => (x.locked ? 'suggest' : levelFor(x.risk, p)) === l)
          return (
            <article key={a.id} className="card pad onb-auto">
              <div className="row between">
                <div className="row nowrap"><Mark agent={a.id} size="md" /><b>{a.name}</b><span className="faint">{a.dept}</span></div>
                <Seg name={`onb-${a.id}`} label={`${a.name} autonomy`} value={p} onChange={v => setPresets(x => ({ ...x, [a.id]: v }))}
                  options={[{ value: 'cautious', label: 'Cautious · recommended' }, { value: 'balanced', label: 'Balanced' }, { value: 'autonomous', label: 'Autonomous' }]} />
              </div>
              <div className="onb-levels">
                {AUTONOMY.map(l => (
                  <div key={l}>
                    <span className="faint">{AUTONOMY_LABEL[l]} · {by(l).length}</span>
                    <ul>{by(l).map(x => <li key={x.id}>{x.label}{x.locked ? ' (locked)' : ''}</li>)}{!by(l).length && <li className="faint">Nothing</li>}</ul>
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function FirstBrief({ connected, kept, presets }: { connected: number; kept: number; presets: Record<AgentId, Preset> }) {
  const label = { cautious: 'Cautious', balanced: 'Balanced', autonomous: 'Autonomous' }
  return (
    <section className="onb-step">
      <h1>Your agents start tonight</h1>
      <p className="lede">Your first brief arrives tomorrow at 07:00. Open Protopulse with your coffee: everything that needs you will be on your Desk.</p>
      <dl className="card pad onb-recap">
        <div><dt>Accounts connected</dt><dd className="num">{connected}</dd></div>
        <div><dt>Playbook entries kept</dt><dd className="num">{kept}</dd></div>
        {AGENTS.map(a => <div key={a.id}><dt>{a.name}</dt><dd>{label[presets[a.id]]}</dd></div>)}
      </dl>
      <p className="faint">For this demo, starting your agents jumps to a workspace that has been running for 30 days.</p>
    </section>
  )
}
