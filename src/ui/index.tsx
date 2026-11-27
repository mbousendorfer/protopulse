import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import * as DM from '@radix-ui/react-dropdown-menu'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tooltip from '@radix-ui/react-tooltip'
import * as Popover from '@radix-ui/react-popover'
import { BookOpen, CalendarDays, ChartLine, CircleHelp, Flame, Image as ImageIcon, Megaphone, MessageCircle, Radar, ShieldCheck, Sparkles, Star, Target, TrendingUp, TriangleAlert, X } from 'lucide-react'
import { AgentAvatar } from './Avatar'
import { Glyph, ROUND } from './SocialAvatar'
import { EmptyScene, type EmptyKind } from './Illustrations'
import type { AgentId, Flagged, Network } from '../app/types'
import { NETWORK_LABEL, agentName } from '../data/agents'

/* ---------- Buttons ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'xs' | 'sm' | 'md'
  icon?: boolean
  kbd?: string
}
export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn({ variant = 'secondary', size = 'md', icon, kbd, className = '', children, ...rest }, ref) {
  const cls = ['btn', variant !== 'secondary' && variant, size !== 'md' && size, icon && 'icon', className].filter(Boolean).join(' ')
  return (
    <button ref={ref} type="button" className={cls} aria-keyshortcuts={kbd} title={kbd && !rest.title ? `Shortcut: ${kbd}` : rest.title} {...rest}>
      {children}
      {kbd && <Kbd>{kbd}</Kbd>}
    </button>
  )
})

export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="kbd">{children}</kbd>

/* ---------- Identity ---------- */
const MARK_PX = { sm: 22, md: 28, lg: 44, xl: 96 } as const
export function Mark({ agent, size, state }: { agent: AgentId | 'claire'; size?: 'md' | 'lg' | 'xl'; state?: 'on' | 'paused' | 'off' }) {
  const name = agentName(agent)
  return (
    <span className={`mark ${size ?? ''}`} aria-label={name} title={name} role="img">
      <AgentAvatar agent={agent} size={MARK_PX[size ?? 'sm']} />
      {state && <span className={`state ${state}`} aria-hidden />}
    </span>
  )
}

/** A network, shown as its own icon (name in the tooltip and for screen readers). */
export const Net = ({ n, size = 18 }: { n: Network; size?: number }) => (
  <span className="net" role="img" title={NETWORK_LABEL[n]} aria-label={NETWORK_LABEL[n]} style={{ width: size, height: size, borderRadius: ROUND[n] ?? '50%' }}>
    <Glyph n={n} />
  </span>
)

/** A tinted tile with an icon that says what kind of item this is. Colour = the agent who raised it. */
export function TopicIcon({ agent, kind, topic, size = 30 }: { agent: AgentId | 'claire'; kind?: string; topic?: string; size?: number }) {
  const t = `${kind ?? ''} ${topic ?? ''}`.toLowerCase()
  const I = /promotion|autonomy/.test(t) ? ShieldCheck : /rule|playbook/.test(t) ? BookOpen : /news/.test(t) ? TrendingUp
    : /complaint|refund|reply|question|intent|order|status/.test(t) ? MessageCircle : /review/.test(t) ? Star
    : /press|safety|creator/.test(t) ? Megaphone : /plan|cadence|slot|pillar/.test(t) ? CalendarDays
    : /trend/.test(t) ? Flame : /competitor/.test(t) ? Radar : /anomaly|spike|report/.test(t) ? ChartLine
    : /campaign/.test(t) ? Target : /visual|post|recycle|counter|hook|draft/.test(t) ? ImageIcon
    : /failed/.test(t) ? TriangleAlert : /info|missing/.test(t) ? CircleHelp : Sparkles
  return (
    <span className="topic-icon" aria-hidden style={{ width: size, height: size, background: `var(--a-${agent}-wash)`, color: `var(--a-${agent}-ink)` }}>
      <I size={Math.round(size * 0.53)} strokeWidth={2} />
    </span>
  )
}

export const Avatar = ({ name, size }: { name: string; size?: 'lg' }) => (
  <span className={`avatar ${size ?? ''}`} aria-hidden>{name.replace(/^@/, '').split(/[\s._]+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}</span>
)

/* ---------- Status ---------- */
export const Pill = ({ tone, dot, children }: { tone?: 'alert' | 'caution' | 'ok' | 'signal'; dot?: boolean; children: ReactNode }) => (
  <span className={`pill ${tone ?? ''}`}>{dot && <span className="dot" aria-hidden />}{children}</span>
)

export const Confidence = ({ v }: { v: number }) => (
  <span className={`conf ${v < 70 ? 'low' : ''}`} title={`${v}% confident`}>
    {v}% confident <i style={{ ['--v' as string]: `${v}%` }} aria-hidden />
  </span>
)

export const Delta = ({ v, down, invert }: { v: string; down?: boolean; invert?: boolean }) => {
  const bad = invert ? !down : down
  return <span className={`delta ${bad ? 'down' : 'up'}`}>{v}</span>
}

/* ---------- Text with uncertain spans ---------- */
export function FlagText({ parts }: { parts: Flagged[] }) {
  return (
    <>
      {parts.map((p, i) => typeof p === 'string' ? <span key={i}>{p}</span> : (
        <Tip key={i} label={p.note}><span className="flag" tabIndex={0} data-flag>{p.text}</span></Tip>
      ))}
    </>
  )
}

/* ---------- Controls ---------- */
export function Seg<T extends string>({ name, value, options, onChange, size, label }: {
  name: string; value: T; options: { value: T; label: ReactNode; disabled?: boolean }[]; onChange: (v: T) => void; size?: 'sm'; label: string
}) {
  return (
    <div className={`seg ${size ?? ''}`} role="radiogroup" aria-label={label}>
      {options.map(o => (
        <label key={o.value}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label, hideLabel, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hideLabel?: boolean; disabled?: boolean }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="track" aria-hidden />
      <span className={hideLabel ? 'sr-only' : ''}>{label}</span>
    </label>
  )
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number }[] }) {
  return (
    <div className="tabs" role="tablist">
      {items.map(it => (
        <button key={it.value} role="tab" aria-selected={value === it.value} className={`tab ${value === it.value ? 'active' : ''}`} onClick={() => onChange(it.value)}>
          {it.label}{it.count !== undefined && <span className="count">{it.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Filters<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number }[]; label: string }) {
  return (
    <div className="filters" role="group" aria-label={label}>
      {items.map(it => (
        <button key={it.value} className="filter" aria-pressed={value === it.value} onClick={() => onChange(it.value)}>
          {it.label}{it.count !== undefined && <span className="count">{it.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ---------- Floating ---------- */
export function Tip({ label, children, side = 'top' }: { label: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tooltip.Root delayDuration={250}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tip" side={side} sideOffset={6}>{label}</Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export type MenuItem = { label: ReactNode; onSelect: () => void; hint?: ReactNode; icon?: ReactNode; disabled?: boolean } | 'sep' | { heading: string }
export function Menu({ trigger, items, align = 'end' }: { trigger: ReactNode; items: MenuItem[]; align?: 'start' | 'end' | 'center' }) {
  return (
    <DM.Root>
      <DM.Trigger asChild>{trigger}</DM.Trigger>
      <DM.Portal>
        <DM.Content className="menu" align={align} sideOffset={6}>
          {items.map((it, i) => it === 'sep' ? <DM.Separator key={i} className="menu-sep" />
            : 'heading' in it ? <DM.Label key={i} className="menu-label">{it.heading}</DM.Label>
            : <DM.Item key={i} className="menu-item" disabled={it.disabled} onSelect={it.onSelect}>{it.icon}{it.label}{it.hint && <span className="hint">{it.hint}</span>}</DM.Item>)}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  )
}

export function Pop({ trigger, children, align = 'end', open, onOpenChange }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'end' | 'center'; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="pop" align={align} sideOffset={6}>{children}</Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function Sheet({ open, onOpenChange, title, children, footer, wide, head }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean; head?: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className={`sheet ${wide ? 'wide' : ''}`} aria-describedby={undefined}>
          <div className="sheet-head">
            {head}
            <Dialog.Title asChild><h2>{title}</h2></Dialog.Title>
            <Dialog.Close asChild><Btn variant="ghost" icon size="sm" aria-label="Close"><X size={16} /></Btn></Dialog.Close>
          </div>
          <div className="sheet-body">{children}</div>
          {footer && <div className="sheet-foot">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Modal({ open, onOpenChange, title, children, footer }: { open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal" aria-describedby={undefined}>
          <div className="sheet-head">
            <Dialog.Title asChild><h2>{title}</h2></Dialog.Title>
            <Dialog.Close asChild><Btn variant="ghost" icon size="sm" aria-label="Close"><X size={16} /></Btn></Dialog.Close>
          </div>
          <div className="sheet-body">{children}</div>
          {footer && <div className="sheet-foot">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ---------- Layout ---------- */
export function PageHead({ title, lede, children, agent }: { title: ReactNode; lede?: ReactNode; children?: ReactNode; agent?: AgentId }) {
  return (
    <header className="page-head">
      <div className="who">
        {agent && <Mark agent={agent} size="lg" />}
        <div>
          <h1>{title}</h1>
          {lede && <p>{lede}</p>}
        </div>
      </div>
      {children && <div className="row">{children}</div>}
    </header>
  )
}

export function Empty({ icon, title, body, action, scene }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode; scene?: EmptyKind }) {
  return (
    <div className="empty">
      <EmptyScene kind={scene ?? (icon ? 'quiet' : 'search')} />
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  )
}

export const Thinking = ({ label }: { label: string }) => (
  <span className="thinking" role="status"><span className="spin" aria-hidden /><span>{label}</span></span>
)
