import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MessageSquarePlus, Trash2 } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { uid } from '../../app/core'
import { ago } from '../../app/time'
import type { AgentId } from '../../app/types'
import type { Chat } from './slice'
import { Btn, Empty, Mark, PageHead } from '../../ui'
import { CountBadge, UndoBar } from '../../ui/Feedback'
import ChatThread from './Thread'
import './chats.css'

export default function ChatsPage() {
  const { s, d } = useStore()
  const [removed, setRemoved] = useState<{ chat: Chat; index: number } | null>(null)
  const { id } = useParams()
  const nav = useNavigate()
  const now = useNow()
  const chat = s.chats.list.find(c => c.id === id) ?? (id ? undefined : s.chats.list[0])
  useEffect(() => { if (!id && s.chats.list[0]) nav(`/chats/${s.chats.list[0].id}`, { replace: true }) }, [id, s.chats.list, nav])

  const start = () => { const nid = uid('chat'); d({ type: 'chats/new', id: nid }); nav(`/chats/${nid}`) }
  const sorted = [...s.chats.list].sort((a, b) => b.updated - a.updated)

  return (
    <div className="page chats-page">
      <PageHead title="Chats">
        <Btn variant="primary" onClick={start}><MessageSquarePlus size={14} />New chat</Btn>
      </PageHead>
      <div className="chats-grid">
        <nav className="card chats-list" aria-label="Conversations">
          {removed && (
            <UndoBar className="m-2" onUndo={() => { d({ type: 'chats/restore', ...removed }); nav(`/chats/${removed.chat.id}`); setRemoved(null) }} onDismiss={() => setRemoved(null)}>Deleted “{removed.chat.title}”</UndoBar>
          )}
          {sorted.map(c => {
            const who = [...new Set(c.messages.filter(m => m.from !== 'you').map(m => m.from as AgentId))]
            const last = c.messages.filter(m => m.at <= now).slice(-1)[0]
            return (
              <Link key={c.id} to={`/chats/${c.id}`} className={`chat-item ${c.id === chat?.id ? 'active' : ''}`}>
                <span className="faces">{who.length ? who.slice(0, 3).map(a => <Mark key={a} agent={a} />) : <Mark agent="iris" />}</span>
                <span className="txt">
                  <span className="row tight nowrap"><b className="ellipsis">{c.title}</b>{c.unread > 0 && <CountBadge n={c.unread} needs label={`${c.unread} unread`} />}</span>
                  <span className="faint ellipsis">{last ? last.text : 'No messages yet'}</span>
                </span>
                <span className="faint when">{ago(c.updated, now)}</span>
              </Link>
            )
          })}
        </nav>
        <section className="card chats-main">
          {chat ? (
            <>
              <div className="chats-head">
                <h2 className="ellipsis">{chat.title}</h2>
                <Btn size="sm" variant="ghost" onClick={() => { setRemoved({ chat, index: s.chats.list.indexOf(chat) }); d({ type: 'chats/delete', id: chat.id }); nav('/chats') }}><Trash2 size={14} />Delete</Btn>
              </div>
              <ChatThread key={chat.id} chat={chat} />
            </>
          ) : <Empty scene="quiet" title="No conversation yet" body="Ask any agent a question, or brief one on a piece of work." action={<Btn variant="primary" onClick={start}>Start one</Btn>} />}
        </section>
      </div>
    </div>
  )
}
