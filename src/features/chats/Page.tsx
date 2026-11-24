import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MessageSquarePlus, Trash2 } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { uid } from '../../app/core'
import { ago } from '../../app/time'
import type { AgentId } from '../../app/types'
import { Btn, Mark, PageHead } from '../../ui'
import ChatThread from './Thread'
import './chats.css'

export default function ChatsPage() {
  const { s, d } = useStore()
  const { id } = useParams()
  const nav = useNavigate()
  const now = useNow()
  const chat = s.chats.list.find(c => c.id === id) ?? (id ? undefined : s.chats.list[0])
  useEffect(() => { if (!id && s.chats.list[0]) nav(`/chats/${s.chats.list[0].id}`, { replace: true }) }, [id, s.chats.list, nav])

  const start = () => { const nid = uid('chat'); d({ type: 'chats/new', id: nid }); nav(`/chats/${nid}`) }
  const sorted = [...s.chats.list].sort((a, b) => b.updated - a.updated)

  return (
    <div className="page chats-page">
      <PageHead title="Chats" lede="Talk to your agents. Ask, brief, decide: whatever they prepare waits for your OK in the conversation.">
        <Btn variant="primary" onClick={start}><MessageSquarePlus size={14} />New chat</Btn>
      </PageHead>
      <div className="chats-grid">
        <nav className="card chats-list" aria-label="Conversations">
          {sorted.map(c => {
            const who = [...new Set(c.messages.filter(m => m.from !== 'you').map(m => m.from as AgentId))]
            const last = c.messages.filter(m => m.at <= now).slice(-1)[0]
            return (
              <Link key={c.id} to={`/chats/${c.id}`} className={`chat-item ${c.id === chat?.id ? 'active' : ''}`}>
                <span className="faces">{who.length ? who.slice(0, 3).map(a => <Mark key={a} agent={a} />) : <Mark agent="iris" />}</span>
                <span className="txt">
                  <span className="row tight nowrap"><b className="ellipsis">{c.title}</b>{c.unread > 0 && <span className="chat-unread" aria-label={`${c.unread} unread`}>{c.unread}</span>}</span>
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
                <Btn size="sm" variant="ghost" onClick={() => { d({ type: 'chats/delete', id: chat.id }); nav('/chats') }}><Trash2 size={14} />Delete</Btn>
              </div>
              <ChatThread key={chat.id} chat={chat} />
            </>
          ) : <div className="empty"><h3>No conversation yet</h3><Btn variant="primary" onClick={start}>Start one</Btn></div>}
        </section>
      </div>
    </div>
  )
}
