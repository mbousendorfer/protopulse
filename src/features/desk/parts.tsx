import { useNavigate } from 'react-router-dom'
import { ArrowRight, Paperclip } from 'lucide-react'
import type { Handoff, Kind } from '../../app/types'
import { useStore } from '../../app/store'
import { hhmm, DAY, MIN } from '../../app/time'
import { now as appTime } from '../../app/core'
import { agentName, NETWORK_LABEL } from '../../data/agents'
import { Confidence, FlagText, Mark, Net, Pill } from '../../ui'
import { Spark } from '../../ui/charts'
import Photo from '../../ui/Photo'
import { SocialAvatar } from '../../ui/SocialAvatar'

export const KIND_LABEL: Record<Kind, string> = { approval: 'Approval', decision: 'Decision', info: 'Missing info', alert: 'Alert', promotion: 'Autonomy request', news: 'Good news' }
export const URGENCY_LABEL = { urgent: 'Urgent', today: 'Today', week: 'This week' } as const

export const REJECT_REASONS = ['Wrong info', 'Tone', 'Not allowed', 'Other']

/** The routing slip: when, who, to whom, what. The signature line of every card. */
export function Slip({ h }: { h: Handoff }) {
  const chain = h.chain?.length ? h.chain : [h.agent]
  const verb = h.kind === 'news' ? 'has good news' : h.kind === 'alert' ? 'flags this' : h.kind === 'promotion' ? (h.promote?.to === 'act' ? 'asks for more autonomy' : 'suggests stepping back') : 'needs you'
  return (
    <div className="slip">
      <span className="chain">{chain.map((a, i) => <Mark key={a + i} agent={a} />)}</span>
      <span><b>{chain.map(agentName).join(' → ')}</b> {verb}</span>
      <span className="faint">· {h.topic} · {hhmm(h.at)}</span>
    </div>
  )
}

export function UrgencyPill({ h }: { h: Handoff }) {
  if (h.lane === 'claire') return <Pill tone="signal" dot>With Claire</Pill>
  if (h.lane === 'snoozed') return <Pill>Snoozed</Pill>
  if (h.urgency === 'urgent') return <Pill tone="alert" dot>Urgent</Pill>
  if (h.urgency === 'today') return <Pill tone="caution">Today</Pill>
  return <Pill>This week</Pill>
}

/** CSS variables that let a block take the colours of the agent who wrote it. */
export const tint = (agent: string) => ({ ['--agent' as string]: `var(--a-${agent})`, ['--agent-wash' as string]: `var(--a-${agent}-wash)`, ['--agent-ink' as string]: `var(--a-${agent}-ink)` })

export function PreviewBlock({ h, editing, draft, setDraft }: { h: Handoff; editing?: boolean; draft?: string; setDraft?: (v: string) => void }) {
  const nav = useNavigate()
  const p = h.preview
  if (!p) return null
  if (p.type === 'reply') return (
    <div className="well preview">
      <div className="quote">
        <div className="by row tight"><SocialAvatar name={p.author.split(' · ')[0]} network={p.network} size={24} /> <span>{p.author}</span> <span className="faint">on {NETWORK_LABEL[p.network]}</span></div>
        <p>{p.text}</p>
      </div>
      <div className="draft agent-tint" style={tint(h.agent)}>
        <div className="by agent-label">{agentName(h.agent)}’s reply{h.answer ? ' · edited by you' : ''}</div>
        {editing ? <textarea className="textarea" autoFocus value={draft} onChange={e => setDraft?.(e.target.value)} aria-label="Edit the draft" rows={4} />
          : <p><FlagText parts={p.draft} /></p>}
        {p.attachments?.map(a => <div key={a} className="attach"><Paperclip size={12} aria-hidden />{a}</div>)}
      </div>
    </div>
  )
  if (p.type === 'post') return (
    <div className="well preview agent-tint" style={tint(h.agent)}>
      <div className="by row tight"><Net n={p.network} /><span className="agent-label">{agentName(h.agent)}’s post</span><span className="faint">· {NETWORK_LABEL[p.network]} · {p.slot}</span></div>
      <div className="post-prev">
        {p.media && <span className="post-photo" style={{ width: 64, height: 80, flex: 'none', borderRadius: 6, overflow: 'hidden' }}><Photo name={p.media} /></span>}
        {editing ? <textarea className="textarea" autoFocus value={draft} onChange={e => setDraft?.(e.target.value)} aria-label="Edit the post" rows={3} />
          : <p><FlagText parts={p.text} /></p>}
      </div>
    </div>
  )
  if (p.type === 'metric') return (
    <div className="well preview metric">
      <div>
        <div className="faint t-xs">{p.label}</div>
        <div className="row tight"><b className="num">{p.value}</b><span className={`delta ${p.down ? 'down' : 'up'}`}>{p.delta}</span></div>
      </div>
      <Spark data={p.series} w={180} h={40} tone={p.down ? 'alert' : 'ink'} color={`var(--a-${h.agent})`} label={p.label} />
    </div>
  )
  if (p.type === 'plan') return (
    <div className="well preview">
      <div className="row between">
        <b>{p.title}</b>
        {h.link && <button className="link-btn row tight" onClick={() => nav(h.link!)}>Open <ArrowRight size={12} /></button>}
      </div>
      <ul className="plan-lines">{p.lines.map(l => <li key={l}>{l}</li>)}</ul>
    </div>
  )
  if (p.type === 'evidence') return (
    <div className="well preview">
      <div className="faint caption">Evidence</div>
      <ul className="plan-lines">{p.lines.map(l => <li key={l}>{l}</li>)}</ul>
    </div>
  )
  return <div className="well preview"><div className="faint">{p.label}</div><p>{p.body}</p></div>
}

/** Where the agent took its facts from. */
export function Sources({ h }: { h: Handoff }) {
  if (!h.sources?.length) return null
  return (
    <div className="sources" aria-label="Sources">
      <span className="faint">Sources</span>
      {h.sources.map(x => <span key={x.label} className="chip source" title={`From ${x.from}`}>{x.label}<span className="faint">· {x.from}</span></span>)}
    </div>
  )
}

/** Shown on "missing info" cards: the agent asks instead of inventing. */
export function WontGuess({ h }: { h: Handoff }) {
  if (h.kind !== 'info' || !h.field) return null
  return <p className="wont-guess">{h.agent[0].toUpperCase() + h.agent.slice(1)} won’t guess. Tell it once and it goes into the Playbook facts.</p>
}

export function WhyLine({ h }: { h: Handoff }) {
  return (
    <div className="why">
      <span><span className="faint">Why you’re seeing this:</span> {h.why}</span>
      <Confidence v={h.confidence} />
      {!!h.rules?.length && (
        <span className="row tight">
          <span className="faint">Playbook:</span>
          {h.rules.map(r => <span key={r} className="chip">{r}</span>)}
        </span>
      )}
    </div>
  )
}

export function ClaireNote({ h }: { h: Handoff }) {
  if (!h.claire?.reply) return null
  return (
    <div className={`claire-note ${h.claire.verdict}`}>
      <Mark agent="claire" />
      <div><b>Claire {h.claire.verdict === 'changes' ? 'asked for changes' : h.claire.verdict === 'decline' ? 'declined' : 'approved'}</b><p>“{h.claire.reply}”</p></div>
    </div>
  )
}

export const SNOOZE = (now: number) => {
  const d = new Date(now)
  const at = (day: number, h: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + day, h, 0).getTime()
  return [
    { label: 'in 1 hour', until: now + 60 * MIN },
    { label: d.getHours() < 14 ? 'this afternoon (14:00)' : 'this evening (18:00)', until: d.getHours() < 14 ? at(0, 14) : at(0, 18) },
    { label: 'tomorrow 08:00', until: at(1, 8) },
    { label: 'next Monday 08:00', until: at(((8 - d.getDay()) % 7) || 7, 8) },
  ].filter(x => x.until > now && x.until < now + 8 * DAY)
}

/** Everything a card can do, shared by the Desk and Focus. */
export function useHandoffActions() {
  const { s, d } = useStore()
  return {
    approve: (h: Handoff, edited?: string) => {
      if (edited !== undefined) d({ type: 'core/editDraft', id: h.id, text: edited })
      d({ type: 'core/resolve', id: h.id, decision: { kind: 'approve', edited } })
    },
    reject: (h: Handoff, reason?: string) => d({ type: 'core/resolve', id: h.id, decision: { kind: 'reject', reason } }),
    option: (h: Handoff, index: number) => d({ type: 'core/resolve', id: h.id, decision: { kind: 'option', index, option: h.options![index].label } }),
    answer: (h: Handoff, text: string) => d({ type: 'core/resolve', id: h.id, decision: { kind: 'answer', text } }),
    trial: (h: Handoff) => d({ type: 'core/resolve', id: h.id, decision: { kind: 'trial' } }),
    snooze: (h: Handoff, until: number, label: string) => d({ type: 'core/snooze', id: h.id, until, label }),
    claire: (h: Handoff) => d({ type: 'core/askClaire', id: h.id }),
    restore: (h: Handoff) => d({ type: 'core/restore', handoff: h }),
    now: () => appTime(s),
  }
}

/** Plain text of the draft or post body, for editing. */
export const draftText = (h: Handoff) => {
  const p = h.preview
  const parts = p?.type === 'reply' ? p.draft : p?.type === 'post' ? p.text : undefined
  return parts ? parts.map(x => (typeof x === 'string' ? x : x.text)).join('') : ''
}

export const editable = (h: Handoff) => h.preview?.type === 'reply' || h.preview?.type === 'post'

/** Sort: urgent first, then promotions and decisions, then the oldest. */
export const byPriority = (a: Handoff, b: Handoff) => {
  const u = { urgent: 0, today: 1, week: 2 }
  return u[a.urgency] - u[b.urgency] || a.at - b.at
}
