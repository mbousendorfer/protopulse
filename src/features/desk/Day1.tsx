import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown, ChevronRight, Clock, Sunrise } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { groupOf } from '../../app/reducer'
import { hhmm } from '../../app/time'
import { Btn, Pill, TopicIcon } from '../../ui'
import type { AgentId } from '../../app/types'
import { ConnectModal } from '../onboarding/Connect'
import { Band, Stat } from './widgets'
import { checklist, firstBriefAt, type CheckItem } from '../onboarding/day1'

/** Day 1 replaces the morning brief until the first one is written: who started, and when the brief lands. */
export function Welcome() {
  const { s } = useStore()
  const now = useNow()
  const started = s.setup.startedAt ?? now
  const need = s.handoffs.filter(h => !h.lane && groupOf(h) === 'need').length
  // The latest thing each agent did since it started.
  const first = (agent: string) => s.log.find(l => l.agent === agent && l.status === 'done' && !l.text.startsWith('You ') && l.at >= started - 60_000)
  const connected = s.setup.connected.length > 0
  const line = (id: AgentId) => {
    const p = s.setup.pending.find(x => x.agent === id)
    if (p && !first(id)?.text.startsWith('Found') && !first(id)?.text.startsWith('Wrote your first')) return `${p.label} at ${hhmm(p.at)}`
    const iris = s.setup.pending.find(x => x.id === 'iris')
    if (id === 'sage' && iris) return `Pillars and cadence at ${hhmm(iris.at)}, from your history`
    if (!connected && ['nova', 'echo'].includes(id)) return 'Needs an account'
    return first(id)?.text ?? (id === 'juno' ? 'Starts with your next YouTube video' : 'Starts working tonight')
  }
  return (
    <Band title={`Welcome aboard${s.setup.first ? `, ${s.setup.first}` : ''}.`} panel={`Your agents since ${hhmm(started)}`} agentLine={line}>
      <Stat k="Need you" v={need || 'None'} />
      <Stat k="Team started" v={hhmm(started)} sub="today" />
      <Stat k="First morning brief" v={hhmm(firstBriefAt(started))} sub={<span className="row tight"><Sunrise size={14} aria-hidden />tomorrow</span>} />
    </Band>
  )
}

/** Each step's icon, in the colour of the agent it wakes up. */
const STEP: Record<string, { agent: AgentId | 'claire'; topic: string }> = {
  connect: { agent: 'claire', topic: 'start' }, schedule: { agent: 'atlas', topic: 'plan' }, reply: { agent: 'nova', topic: 'reply' },
  report: { agent: 'iris', topic: 'report' }, playbook: { agent: 'sage', topic: 'playbook' },
}

/** What's left to set up, one card per step: what it takes, what it unlocks, its one action. Folds to one line. */
export function Checklist() {
  const { s, d } = useStore()
  const now = useNow(5000)
  const items = checklist(s, now)
  const done = items.filter(i => i.done).length
  const next = items.find(i => !i.done && i.action)
  const open = s.setup.checklistOpen
  const toggle = () => d({ type: 'setup/patch', patch: { checklistOpen: !open } })
  return (
    <section className={`checklist ${open ? 'open' : ''}`} aria-labelledby="checklist-title">
      <button className="checklist-head" aria-expanded={open} aria-controls="checklist-items" onClick={toggle}>
        {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
        <h2 id="checklist-title">{done === items.length ? 'You’re all set' : 'Getting started'}</h2>
        <span className="faint num">{done} of {items.length} done</span>
        <span className="checklist-bar" aria-hidden><i style={{ transform: `scaleX(${done / items.length})` }} /></span>
      </button>
      {open && <ol id="checklist-items" className="checklist-items">{items.map((i, n) => <Item key={i.id} i={i} n={n + 1} next={i === next} />)}</ol>}
    </section>
  )
}

function Item({ i, n, next }: { i: CheckItem; n: number; next: boolean }) {
  const nav = useNavigate()
  const [connecting, setConnecting] = useState(false)
  const run = () => {
    if (i.action?.connect) setConnecting(true)
    else if (i.action?.to) nav(i.action.to)
  }
  const step = STEP[i.id] ?? { agent: 'claire', topic: 'info' }
  return (
    <li className={`card check-item ${i.done ? 'done' : ''} ${next ? 'next' : ''}`}>
      <div className="check-top">
        <TopicIcon agent={step.agent} topic={step.topic} size={36} />
        <span className="check-mark" aria-hidden>{i.done ? <Check size={12} /> : i.at ? <Clock size={12} /> : <span className="num">{n}</span>}</span>
      </div>
      <b>{i.label}</b><span className="sr-only">{i.done ? ' (done)' : ''}</span>
      {/* A done step only needs its name; an open one says what it takes and what it unlocks. */}
      <p className="muted">{i.done ? i.detail.replace(/\.$/, '') : i.detail}</p>
      {i.unlocks && !i.done && <p className="check-unlocks">{i.unlocks}</p>}
      <div className="check-act">
        {i.done ? <Pill tone="ok">Done</Pill>
          : i.action ? <Btn size="sm" variant={next ? 'primary' : 'secondary'} onClick={run}>{i.action.label}</Btn>
          : i.at ? <span className="faint t-sm">About {hhmm(i.at)}</span> : null}
      </div>
      {i.action?.connect && <ConnectModal open={connecting} onOpenChange={setConnecting} why="Your agents read and reply through it. Its history imports as soon as it’s connected." />}
    </li>
  )
}
