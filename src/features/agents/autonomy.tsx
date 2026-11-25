import { useState, type CSSProperties } from 'react'
import { ArrowRight, Lock } from 'lucide-react'
import type { Agent, AgentAction, Autonomy } from '../../app/types'
import { useNow } from '../../app/store'
import { DAY } from '../../app/time'
import { levelFor, weeklyLoad, type Preset } from '../../data/agents'
import { AutonomyScale, Pill } from '../../ui'
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

const tone = (a: Agent) => ({ '--tone': `var(--a-${a.id})` }) as CSSProperties
const fmt = (n: number) => n.toLocaleString('en-GB')

/** What a level change does to Sam's week, in one sentence. */
export function deskDelta(n: number, from: Autonomy, to: Autonomy): string {
  if (from === to || !n) return ''
  if (to === 'act') return `About ${fmt(n)} a week leave your Desk.`
  if (from === 'act') return `About ${fmt(n)} a week now come to you.`
  return to === 'draft' ? `About ${fmt(n)} a week now arrive ready to approve.` : `About ${fmt(n)} a week now arrive as a suggestion only. You do the work.`
}

/** Before → after of a preset, for the Undo bar. */
export function presetDelta(a: Agent, p: Preset): string {
  const was = weeklyLoad(a.actions, x => x.autonomy).act
  const will = weeklyLoad(a.actions, x => levelFor(x.risk, p)).act
  if (will === was) return 'Nothing changes on your Desk.'
  return will > was ? `About ${fmt(will - was)} more a week handled alone.` : `About ${fmt(was - will)} more a week come to you.`
}

/** "This week, about N messages": one bar, three named parts in the agent's colour ramp. */
export function AutonomySummary({ agent, levelOf = x => x.autonomy }: { agent: Agent; levelOf?: (x: AgentAction) => Autonomy }) {
  const load = weeklyLoad(agent.actions, levelOf)
  const total = load.act + load.draft + load.suggest || 1
  const parts: [Autonomy, string][] = [['act', 'handled alone'], ['draft', 'wait for your OK'], ['suggest', 'you handle']]
  return (
    <div className="aset-sum" style={tone(agent)}>
      <p className="aset-sum-title">This week, about <b className="num">{fmt(load.act + load.draft + load.suggest)}</b> {agent.unit}</p>
      <div className="aset-bar" role="img" aria-label={parts.map(([l, t]) => `${load[l]} ${t}`).join(', ')}>
        {parts.map(([l]) => <i key={l} className={`lv-${l}`} style={{ flexGrow: load[l] / total, minWidth: load[l] ? 6 : 0 }} />)}
      </div>
      <ul className="aset-legend">
        {parts.map(([l, t]) => <li key={l}><i className={`lv-${l}`} aria-hidden /><b className="num">{fmt(load[l])}</b> {t}</li>)}
      </ul>
    </div>
  )
}

/** One row per action. With onChange: full rows (example, Desk impact). Without: compact and read-only. */
export function AutonomyList({ agent, levelOf = x => x.autonomy, onChange }: { agent: Agent; levelOf?: (x: AgentAction) => Autonomy; onChange?: (action: AgentAction, level: Autonomy) => void }) {
  const now = useNow()
  const [changed, setChanged] = useState<{ id: string; text: string } | null>(null)
  const free = agent.actions.filter(x => !x.locked)
  const locked = agent.actions.filter(x => x.locked)
  return (
    <div className={`aset ${onChange ? '' : 'compact'}`} style={tone(agent)}>
      <ul className="aset-list">
        {free.map(x => {
          const level = levelOf(x)
          return (
            <li key={x.id} className="aset-row">
              <div className="aset-main">
                <h4>{x.label}</h4>
                <p className="aset-meta">
                  {RISK_LABEL[x.risk]} · about {fmt(x.perWeek ?? 0)} a week
                  {onChange && x.approvedUnchanged !== undefined && <> · {x.approvedUnchanged}% approved unchanged</>}
                </p>
                {onChange && x.trialUntil && x.trialUntil > now && <Pill tone="signal">Trial · {Math.ceil((x.trialUntil - now) / DAY)} days left</Pill>}
                {onChange && (
                  <p className="aset-says">
                    {x.example && <><span className="aset-eg">{x.example}</span><ArrowRight size={13} aria-hidden /><span className="sr-only">then</span></>}
                    <span>{x.says[level]}</span>
                  </p>
                )}
                {changed?.id === x.id && <p className="aset-delta" role="status">{changed.text}</p>}
              </div>
              <AutonomyScale name={`${agent.id}-${x.id}`} agent={agent.id} value={level} label={`${x.label}: autonomy`}
                onChange={onChange && (v => { setChanged({ id: x.id, text: deskDelta(x.perWeek ?? 0, level, v) }); onChange(x, v) })} />
            </li>
          )
        })}
      </ul>
      {locked.length > 0 && (
        <div className="aset-locked">
          <h3><Lock size={14} aria-hidden />Always you</h3>
          <ul>
            {locked.map(x => <li key={x.id}><b>{x.label}</b> <span>{x.lockReason}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
