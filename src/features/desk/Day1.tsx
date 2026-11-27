import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown, ChevronRight, Clock, Sunrise } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { groupOf } from '../../app/reducer'
import { hhmm } from '../../app/time'
import { Btn } from '../../ui'
import type { AgentId } from '../../app/types'
import { ConnectModal } from '../onboarding/Connect'
import { BriefScene } from '../../ui/Illustrations'
import { AgentTiles } from './widgets'
import { checklist, firstBriefAt, type CheckItem } from '../onboarding/day1'

/** Day 1 replaces the morning brief until the first one is written: who started, what they found, when the brief lands. */
export function Welcome({ onPick }: { onPick: (key: string) => void }) {
  const { s } = useStore()
  const now = useNow()
  const started = s.setup.startedAt ?? now
  const open = s.handoffs.filter(h => !h.lane)
  const need = open.filter(h => groupOf(h) === 'need').length
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
    <section className="brief card day1" aria-labelledby="welcome-title">
      <div className="brief-top">
        <div>
          <h1 id="welcome-title" className="hello">Welcome aboard{s.setup.first ? `, ${s.setup.first}` : ''}.</h1>
          <p className="story">{connected
            ? <><b className="num">{need || 'Nothing'}</b> {need === 1 ? 'thing needs' : need ? 'things need' : 'needs'} you. Your team started at {hhmm(started)}.</>
            : <>Atlas wrote 3 first drafts from your Playbook. Connect a profile to schedule them: Nova and Echo start once one is connected.</>}</p>
          <p className="day1-promise"><Sunrise size={16} aria-hidden />Your first morning brief arrives tomorrow at {hhmm(firstBriefAt(started))}.</p>
        </div>
        <div className="brief-scene"><BriefScene hour={new Date(now).getHours()} /></div>
      </div>
      <AgentTiles onPick={onPick} line={id => line(id as AgentId)} />
    </section>
  )
}

/** What's left to set up, what's done, what each step unlocks. Folds to one line. */
export function Checklist({ side }: { side?: boolean }) {
  const { s, d } = useStore()
  const now = useNow(5000)
  const items = checklist(s, now)
  const done = items.filter(i => i.done).length
  const open = s.setup.checklistOpen
  const toggle = () => d({ type: 'setup/patch', patch: { checklistOpen: !open } })
  return (
    <section className={`card checklist ${open ? 'open' : ''} ${side ? 'side' : ''}`} aria-labelledby="checklist-title">
      <button className="checklist-head" aria-expanded={open} aria-controls="checklist-items" onClick={toggle}>
        {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
        <h2 id="checklist-title">{done === items.length ? 'You’re all set' : 'Getting started'}</h2>
        <span className="faint num">{done} of {items.length} done</span>
        <span className="checklist-bar" aria-hidden><i style={{ transform: `scaleX(${done / items.length})` }} /></span>
      </button>
      {open && <ol id="checklist-items" className="checklist-items">{items.map(i => <Item key={i.id} i={i} />)}</ol>}
    </section>
  )
}

function Item({ i }: { i: CheckItem }) {
  const nav = useNavigate()
  const [connecting, setConnecting] = useState(false)
  const run = () => {
    if (i.action?.connect) setConnecting(true)
    else if (i.action?.to) nav(i.action.to)
  }
  return (
    <li className={`check-item ${i.done ? 'done' : ''}`}>
      <span className="check-mark" aria-hidden>{i.done ? <Check size={12} /> : i.at ? <Clock size={12} /> : null}</span>
      <div className="grow">
        <b>{i.label}</b><span className="sr-only">{i.done ? ' (done)' : ''}</span>
        {/* A done step only needs its name; an open one says what it takes and what it unlocks. */}
        {!i.done && <p className="muted">{i.detail}</p>}
        {i.unlocks && !i.done && <p className="check-unlocks">{i.unlocks}</p>}
      </div>
      {i.action && !i.done && <Btn size="sm" onClick={run}>{i.action.label}</Btn>}
      {i.action?.connect && <ConnectModal open={connecting} onOpenChange={setConnecting} why="Your agents read and reply through it. Its history imports as soon as it’s connected." />}
    </li>
  )
}
