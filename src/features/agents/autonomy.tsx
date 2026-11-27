import { useState, type CSSProperties } from 'react'
import {
  Banknote, CalendarDays, ChartLine, ChevronDown, Clock, FileText, Flame, FolderInput, Gauge, LayoutGrid, Lock, Mail, Megaphone,
  MessageCircle, MessageCircleWarning, Radar, Recycle, Repeat, Rocket, ShieldX, Sparkles, Star, Tag, Users, type LucideIcon,
} from 'lucide-react'
import type { Agent, AgentAction, Autonomy, Risk } from '../../app/types'
import { useNow } from '../../app/store'
import { DAY } from '../../app/time'
import { AUTONOMY, AUTONOMY_LABEL, levelFor, weeklyLoad, type Preset } from '../../data/agents'
import { Btn, Pill, Seg } from '../../ui'
import './agents.css'

export const RISK_LABEL = { safe: 'Low risk', risky: 'Medium risk', destructive: 'High risk' } as const

export function presetOf(a: Agent): Preset | 'custom' {
  const free = a.actions.filter(x => !x.locked)
  for (const p of ['cautious', 'balanced', 'autonomous'] as const) if (free.every(x => x.autonomy === levelFor(x.risk, p))) return p
  return 'custom'
}

export const PRESET_SAYS: Record<Preset | 'custom', string> = {
  cautious: 'Cautious: low-risk actions wait for your OK. Everything else is only suggested.',
  balanced: 'Balanced: low-risk actions run on their own. Everything else waits for your OK.',
  autonomous: 'Autonomous: every action that isn’t locked runs on its own.',
  custom: 'Custom: you set each action yourself.',
}

const tone = (a: Agent) => ({ '--tone': `var(--a-${a.id})`, '--tone-wash': `var(--a-${a.id}-wash)`, '--tone-ink': `var(--a-${a.id}-ink)` }) as CSSProperties
const fmt = (n: number) => n.toLocaleString('en-GB')

/** Before → after of a preset, for the Undo bar. */
export function presetDelta(a: Agent, p: Preset): string {
  const was = weeklyLoad(a.actions, x => x.autonomy).act
  const will = weeklyLoad(a.actions, x => levelFor(x.risk, p)).act
  if (will === was) return 'Nothing changes on your Desk.'
  return will > was ? `About ${fmt(will - was)} more a week handled alone.` : `About ${fmt(was - will)} more a week come to you.`
}

/** The weekly volume, kept to one line. */
export function AutonomySummary({ agent, levelOf = x => x.autonomy }: { agent: Agent; levelOf?: (x: AgentAction) => Autonomy }) {
  const load = weeklyLoad(agent.actions, levelOf)
  return <p className="aset-load">{fmt(load.act)} of {fmt(load.act + load.draft + load.suggest)} {agent.unit} a week run on their own.</p>
}

// First match wins: "Turn a brief into a campaign plan" is a plan, not a brief.
const ICONS: [RegExp, LucideIcon][] = [
  [/complaint/i, MessageCircleWarning], [/spam/i, ShieldX], [/exchange|replacement/i, Repeat], [/refund/i, Banknote],
  [/discount/i, Tag], [/review/i, Star], [/press|legal/i, Megaphone], [/competitor/i, Radar], [/plan/i, CalendarDays],
  [/slot/i, Clock], [/recycle/i, Recycle], [/trend/i, Flame], [/brief|report/i, FileText], [/anomal|spike/i, ChartLine],
  [/boost/i, Rocket], [/file mentions/i, FolderInput], [/sales/i, Mail], [/cadence/i, Gauge], [/reallocate/i, Users],
  [/pillar/i, LayoutGrid], [/question|answer/i, MessageCircle],
]
const iconFor = (label: string) => ICONS.find(([re]) => re.test(label))?.[1] ?? Sparkles

const LEVEL_OPTIONS = AUTONOMY.map(l => ({ value: l, label: AUTONOMY_LABEL[l] }))
const RISKS: Risk[] = ['safe', 'risky', 'destructive']

/** One line per action, grouped by risk. With onChange: a Seg per row and details on demand. Without: read-only levels. */
export function AutonomyList({ agent, levelOf = x => x.autonomy, onChange }: { agent: Agent; levelOf?: (x: AgentAction) => Autonomy; onChange?: (action: AgentAction, level: Autonomy) => void }) {
  const now = useNow()
  const [open, setOpen] = useState<string | null>(null)
  const [changed, setChanged] = useState<{ id: string; text: string } | null>(null)
  const locked = agent.actions.filter(x => x.locked)
  const groups = RISKS.map(r => [r, agent.actions.filter(x => !x.locked && x.risk === r)] as const).filter(([, xs]) => xs.length)
  return (
    <div className={`alist ${onChange ? '' : 'compact'}`} style={tone(agent)}>
      {groups.map(([risk, xs]) => (
        <section key={risk} className="alist-group">
          <h3>{RISK_LABEL[risk]} <span className="n">{xs.length}</span></h3>
          <ul>
            {xs.map(x => {
              const level = levelOf(x)
              const Icon = iconFor(x.label)
              const isOpen = open === x.id
              return (
                <li key={x.id} className="arow">
                  <div className="arow-head">
                    <span className="topic-icon arow-icon" aria-hidden><Icon size={16} /></span>
                    <span className="arow-title">
                      {x.label}
                      {onChange && x.trialUntil && x.trialUntil > now && <Pill tone="signal">Trial · {Math.ceil((x.trialUntil - now) / DAY)} days left</Pill>}
                    </span>
                    {onChange ? (
                      <>
                        <Seg name={`${agent.id}-${x.id}`} label={`${x.label}: autonomy`} value={level} options={LEVEL_OPTIONS}
                          onChange={v => { setChanged({ id: x.id, text: `Now: ${x.says[v]}` }); onChange(x, v) }} />
                        <Btn variant="ghost" icon size="sm" className="arow-more" aria-expanded={isOpen} aria-controls={`ad-${x.id}`}
                          aria-label={`${x.label}: details`} onClick={() => setOpen(isOpen ? null : x.id)}><ChevronDown size={16} /></Btn>
                      </>
                    ) : <span className="alevel">{AUTONOMY_LABEL[level]}</span>}
                    {changed?.id === x.id && <p className="arow-now" role="status">{changed.text}</p>}
                  </div>
                  {onChange && (
                    <div className="arow-detail" id={`ad-${x.id}`} hidden={!isOpen}>
                      {x.example && <p className="arow-eg"><span>Example</span>{x.example}</p>}
                      <ul className="alevels">
                        {AUTONOMY.map(l => <li key={l} className={l === level ? 'cur' : ''}><b>{AUTONOMY_LABEL[l]}</b>{x.says[l]}</li>)}
                      </ul>
                      <p className="arow-stats">
                        About {fmt(x.perWeek ?? 0)} a week{x.reviewed !== undefined && <> · {fmt(x.reviewed)} reviewed by you</>}{x.approvedUnchanged !== undefined && <> · {x.approvedUnchanged}% approved unchanged</>}
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {locked.length > 0 && (
        <section className="alist-group">
          <h3><Lock size={14} aria-hidden />Always you <span className="n">{locked.length}</span></h3>
          <ul>
            {locked.map(x => {
              const Icon = iconFor(x.label)
              return (
                <li key={x.id} className="arow">
                  <div className="arow-head">
                    <span className="topic-icon arow-icon off" aria-hidden><Icon size={16} /></span>
                    <span className="arow-title">{x.label}<span className="arow-sub">{x.lockReason}</span></span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
