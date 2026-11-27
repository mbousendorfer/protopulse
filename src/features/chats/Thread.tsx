import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUp, BookPlus, CalendarCheck, Check, Rocket, Scissors, Send, X } from 'lucide-react'
import type { AgentId } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { hhmm } from '../../app/time'
import { AGENTS, agentName } from '../../data/agents'
import { Btn, Mark, Net, Thinking, TopicIcon } from '../../ui'
import { Spark, Bars } from '../../ui/charts'
import { SocialAvatar } from '../../ui/SocialAvatar'
import type { Card, Chat, ChatMsg, ChatsAction } from './slice'

type ActKind = Extract<ChatsAction, { type: 'chats/act' }>['action']
import { routeText } from './respond'

const PROMPTS = [
  '@Atlas a post about the weekend sale on Saturday',
  'How did TikTok do last week?',
  'What is Peakline up to?',
  'Best time to post on LinkedIn?',
  'Reply to Léa',
  'Never offer discount codes on complaints',
  'Brief: launch the Storm Jacket in March, 300 pre-orders',
]

export default function ChatThread({ chat, compact }: { chat: Chat; compact?: boolean }) {
  const { d } = useStore()
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const [, tick] = useState(0)
  const wall = Date.now()
  const now = useNow(1000)

  // Replies are timestamped slightly in the future: show "thinking" until then, re-render to reveal them.
  const pending = chat.messages.filter(m => m.at > now)
  useEffect(() => {
    if (!pending.length) return
    const t = setTimeout(() => tick(x => x + 1), Math.max(200, Math.min(...pending.map(m => m.at - now))))
    return () => clearTimeout(t)
  }, [pending.length, now, wall])
  const visible = chat.messages.filter(m => m.at <= now)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }) }, [visible.length, pending.length])
  useEffect(() => { if (chat.unread) d({ type: 'chats/read', id: chat.id }) }, [chat.unread, chat.id, d])

  const send = (t: string) => {
    if (!t.trim()) return
    d({ type: 'chats/send', id: chat.id, text: t })
    d({ type: 'core/track', kind: 'chat', detail: { text: t } })
    setText('')
  }
  const mention = (a: AgentId) => setText(t => (t.includes(`@${agentName(a)}`) ? t : `@${agentName(a)} ${t}`))
  const next = text.trim() ? routeText(text) : null

  return (
    <div className={`chat ${compact ? 'compact' : ''}`}>
      {chat.context && <div className="chat-context"><span className="faint">Context</span><span className="chip">{chat.context.label}</span></div>}
      <div className="chat-msgs" aria-live="polite">
        {!chat.messages.length && (
          <div className="chat-empty">
            <div className="team-faces">{AGENTS.map(a => <Mark key={a.id} agent={a.id} size="md" />)}</div>
            <h3>Ask the team anything</h3>
            <p className="faint">Your message goes to the right agent. Mention one with @ to choose.</p>
            <div className="chat-prompts">{PROMPTS.map(p => <button key={p} className="filter" onClick={() => send(p)}>{p}</button>)}</div>
          </div>
        )}
        {visible.map(m => <Message key={m.id} chat={chat} m={m} />)}
        {pending.length > 0 && <div className="msg-row"><Mark agent={pending[0].from as AgentId} /><Thinking label={`${agentName(pending[0].from as AgentId)} is thinking…`} /></div>}
        <div ref={end} />
      </div>
      <form className="chat-composer" onSubmit={e => { e.preventDefault(); send(text) }}>
        <div className="chat-mentions" aria-label="Mention an agent">
          {AGENTS.map(a => <button type="button" key={a.id} className={`chat-mention ${next?.agent === a.id ? 'on' : ''}`} onClick={() => mention(a.id)} title={`Mention ${a.name}`}><Mark agent={a.id} />@{a.name}</button>)}
        </div>
        <div className="row nowrap">
          <label htmlFor={`chat-${chat.id}`} className="sr-only">Message the team</label>
          <textarea id={`chat-${chat.id}`} className="textarea" rows={2} value={text} placeholder="Ask the team, or @mention an agent…" onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text) } }} />
          <Btn variant="primary" icon type="submit" aria-label="Send" disabled={!text.trim()}><ArrowUp size={16} /></Btn>
        </div>
        {next && <span className="faint route-hint"><Mark agent={next.agent} /> {agentName(next.agent)} will answer{next.mentioned ? '' : ' · mention someone else with @'}</span>}
      </form>
    </div>
  )
}

function Message({ chat, m }: { chat: Chat; m: ChatMsg }) {
  if (m.from === 'you') return (
    <div className="msg-row you">
      <div className="bubble you"><p>{m.text}</p><span className="mono faint">{hhmm(m.at)}</span></div>
      <SocialAvatar name="Sam Rivera" size={24} />
    </div>
  )
  return (
    <div className="msg-row">
      <Mark agent={m.from} />
      <div className="bubble agent" style={{ ['--agent-ink' as string]: `var(--a-${m.from}-ink)` }}>
        <div className="who"><b>{agentName(m.from)}</b><span className="mono faint">{hhmm(m.at)}</span></div>
        <p>{m.text}</p>
        {m.card && <CardView chat={chat} m={m} card={m.card} agent={m.from} />}
      </div>
    </div>
  )
}

function CardView({ chat, m, card, agent }: { chat: Chat; m: ChatMsg; card: Card; agent: AgentId }) {
  const { d } = useStore()
  const nav = useNavigate()
  const [edit, setEdit] = useState<string | null>(null)
  const act = (action: ActKind, text?: string) => d({ type: 'chats/act', id: chat.id, msg: m.id, action, text })

  switch (card.type) {
    case 'chart': return (
      <div className="ccard">
        <div className="row between items-end">
          <div><div className="faint">{card.label}</div><div className="row tight"><b className="big num">{card.value}</b><span className={`delta ${card.down ? 'down' : 'up'}`}>{card.delta}</span></div></div>
          {card.labels ? <div className="ccard-bars"><Bars data={card.series} labels={card.labels} h={70} label={card.label} color={`var(--a-${agent})`} /></div>
            : <Spark data={card.series} w={180} h={44} color={card.down ? 'var(--alert)' : `var(--a-${agent})`} label={card.label} />}
        </div>
        <p className="faint sources">Sources: {card.sources.join(' · ')}</p>
      </div>
    )
    case 'post': return (
      <div className={`ccard ${card.status === 'discarded' ? 'dim' : ''}`}>
        <div className="row tight faint"><Net n={card.network} />{card.slot}</div>
        {edit !== null ? <textarea className="textarea" rows={3} value={edit} onChange={e => setEdit(e.target.value)} aria-label="Edit the post" autoFocus /> : <p className="ctext">{card.text}</p>}
        {card.status === 'scheduled' ? <span className="pill ok"><CalendarCheck size={12} />Scheduled for {card.slot}</span>
          : card.status === 'discarded' ? <span className="pill">Discarded</span> : (
          <div className="row">
            <Btn size="sm" variant="primary" onClick={() => { act('schedule', edit ?? undefined); setEdit(null) }}><CalendarCheck size={14} />Schedule</Btn>
            {edit === null ? <Btn size="sm" onClick={() => setEdit(card.text)}>Edit</Btn> : <Btn size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancel edit</Btn>}
            <Btn size="sm" variant="ghost" onClick={() => act('shorter')}><Scissors size={14} />Shorter</Btn>
            <Btn size="sm" variant="ghost" onClick={() => act('discard')}><X size={14} />Discard</Btn>
          </div>
        )}
      </div>
    )
    case 'reply': return (
      <div className="ccard">
        <div className="row tight"><SocialAvatar name={card.author} network={card.network} size={24} /><span className="faint">{card.author}</span></div>
        <p className="quote">“{card.quote}”</p>
        {edit !== null ? <textarea className="textarea" rows={3} value={edit} onChange={e => setEdit(e.target.value)} aria-label="Edit the reply" autoFocus /> : <p className="ctext">{card.text}</p>}
        {card.status === 'sent' ? <span className="pill ok"><Check size={12} />Sent</span> : (
          <div className="row">
            <Btn size="sm" variant="primary" onClick={() => { act('send', edit ?? undefined); setEdit(null) }}><Send size={14} />Send</Btn>
            {edit === null ? <Btn size="sm" onClick={() => setEdit(card.text)}>Edit</Btn> : <Btn size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancel edit</Btn>}
            {card.convo && <Btn size="sm" variant="ghost" onClick={() => nav(`/inbox/${card.convo}`)}>Open in Inbox</Btn>}
          </div>
        )}
      </div>
    )
    case 'rule': return (
      <div className="ccard">
        <div className="row tight"><TopicIcon agent={card.agent} topic="rule" size={24} /><b>“{card.text}”</b></div>
        {card.status === 'added' ? <span className="pill ok"><Check size={12} />In the Playbook</span> : card.status === 'dismissed' ? <span className="pill">Only for this time</span> : (
          <div className="row">
            <Btn size="sm" variant="primary" onClick={() => act('addRule')}><BookPlus size={14} />Add to Playbook</Btn>
            <Btn size="sm" variant="ghost" onClick={() => act('dismissRule')}>Just this time</Btn>
          </div>
        )}
      </div>
    )
    case 'brief': return (
      <div className="ccard">
        <p className="ctext">“{card.text}”</p>
        {card.status === 'started' ? <span className="pill ok"><Check size={12} />Sage is on it</span> : (
          <div className="row"><Btn size="sm" variant="primary" onClick={() => { act('startBrief'); nav(`/strategy/new?brief=${encodeURIComponent(card.text)}&auto=1`) }}><Rocket size={14} />Build the campaign plan</Btn></div>
        )}
      </div>
    )
    case 'list': return (
      <ul className="ccard list">
        {card.items.map((it, i) => (
          <li key={i}>
            <TopicIcon agent={it.agent} topic={it.title} size={24} />
            <span className="txt"><span>{it.title}</span>{it.meta && <span className="faint">{it.meta}</span>}</span>
            {it.link && <Btn size="xs" variant="ghost" onClick={() => nav(it.link!)}>Open</Btn>}
          </li>
        ))}
      </ul>
    )
    case 'done': return <span className="pill ok"><Check size={12} />{card.text}</span>
  }
}
