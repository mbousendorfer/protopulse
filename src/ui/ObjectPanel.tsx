import { useState, type ReactNode } from 'react'
import { History, Send } from 'lucide-react'
import type { AgentId } from '../app/types'
import { ago } from '../app/time'
import { agentName } from '../data/agents'
import { useNow } from '../app/store'
import { Btn, Mark } from './index'
import { SocialAvatar } from './SocialAvatar'

/*
 * The object panel (matrix §16): every object sheet (post, mention, creator, media, Insights post) is built from the
 * same pieces. The Sheet header carries identity and standing actions; then the Ask (only when something waits on Sam),
 * the object itself, its Details, its Results, its Activity.
 */

export type By = AgentId | 'claire' | 'you'
export const byName = (by: By) => (by === 'you' ? 'You' : by === 'claire' ? 'Claire' : agentName(by))

/** Who did it: the agent's mark, Sam's avatar, or a plain history dot when the model doesn't say. */
export const Who = ({ by }: { by?: By }) => (by === 'you' ? <SocialAvatar name="Sam Rivera" size={24} /> : by ? <Mark agent={by} /> : <span className="obj-dot" aria-hidden><History size={12} /></span>)

/** The full date and time of a moment, for a title attribute: 29/11/2025 16:00. */
export const exact = (t: number) => new Date(t).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')

/** What waits on Sam: the question, one reason, the control that answers it. Absent when nothing waits. */
export function Ask({ agents = [], title, children, actions }: { agents?: By[]; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <section className="obj-ask" aria-labelledby="obj-ask-h">
      {agents.length > 0 && <span className="obj-ask-who">{agents.map((a, i) => <Who key={a + i} by={a} />)}</span>}
      <div className="obj-ask-main">
        <h3 id="obj-ask-h">{title}</h3>
        {children}
        {actions && <div className="obj-ask-acts">{actions}</div>}
      </div>
    </section>
  )
}

export type Prop = { label: ReactNode; value?: ReactNode; empty?: ReactNode }
/** Details: label | value rows. A core row with no value reads "None" (plus its add control, passed as `empty`). */
export function Props({ rows, label = 'Details' }: { rows: (Prop | false | '' | null | undefined)[]; label?: string }) {
  return (
    <section className="obj-sec" aria-label={label}>
      <h3 className="obj-sec-h">{label}</h3>
      <dl className="obj-props">
        {rows.filter((r): r is Prop => !!r).map((r, i) => (
          <div key={i}><dt>{r.label}</dt><dd>{r.value ?? <><span className="obj-none">None</span>{r.empty}</>}</dd></div>
        ))}
      </dl>
    </section>
  )
}

/** Named numbers: the metric's name, then its value, then what it's compared with. */
export function Metrics({ items }: { items: { label: string; value: ReactNode; note?: ReactNode }[] }) {
  return (
    <dl className="obj-metrics">
      {items.map(m => <div key={m.label}><dt>{m.label}</dt><dd><b className="num">{m.value}</b>{m.note && <span className="muted t-sm">{m.note}</span>}</dd></div>)}
    </dl>
  )
}

/** A titled block of the aside (Results…). */
export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="obj-sec" aria-label={title}><h3 className="obj-sec-h">{title}</h3>{children}</section>
)

/**
 * One line of activity. `named`: the actor's name starts the line ("Atlas asked you on the Desk"); `said`: their own words
 * (a comment, an agent's reply), shown as a quote under the name. Otherwise the text says it all ("Code added by you").
 */
export type Line = { at?: number; by?: By; text: string; said?: boolean; named?: boolean }

/** Activity: one feed, oldest first, ending in a comment box when the object takes comments. */
export function Timeline({ lines, empty = 'Nothing has happened here yet.', composer }: { lines: Line[]; empty?: string; composer?: { placeholder: string; onSend: (text: string) => void } }) {
  const now = useNow(60_000)
  const [text, setText] = useState('')
  return (
    <section className="obj-sec" aria-label="Activity">
      <h3 className="obj-sec-h">Activity</h3>
      {lines.length ? (
        <ol className="obj-feed">
          {lines.map((l, i) => (
            <li key={i}>
              <Who by={l.by} />
              <div className="obj-feed-main">
                <p>{l.by && (l.named || l.said) && <b>{byName(l.by)}</b>}{l.by && l.named && !l.said && ' '}{!l.said && l.text}{l.at !== undefined && <time dateTime={new Date(l.at).toISOString()} title={exact(l.at)}>{ago(l.at, now)}</time>}</p>
                {l.said && <p className="obj-said">{l.text}</p>}
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="muted t-sm">{empty}</p>}
      {composer && (
        <form className="obj-compose" onSubmit={e => { e.preventDefault(); if (text.trim()) { composer.onSend(text.trim()); setText('') } }}>
          <SocialAvatar name="Sam Rivera" size={24} />
          <input className="input" aria-label="Comment" value={text} onChange={e => setText(e.target.value)} placeholder={composer.placeholder} />
          <Btn type="submit" variant="ghost" disabled={!text.trim()}><Send size={14} />Send</Btn>
        </form>
      )}
    </section>
  )
}

/** The body under the Ask: the object on the left, its aside on the right (one column on narrow sheets). */
export const ObjectBody = ({ main, aside }: { main: ReactNode; aside: ReactNode }) => (
  <div className="obj-body"><div className="obj-main">{main}</div><div className="obj-aside">{aside}</div></div>
)
