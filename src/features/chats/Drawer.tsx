import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Maximize2, MessageSquarePlus } from 'lucide-react'
import { useStore } from '../../app/store'
import { uid } from '../../app/core'
import { Btn, Sheet } from '../../ui'
import ChatThread from './Thread'
import './chats.css'

const LABEL: Record<string, string> = { '': 'your Desk', inbox: 'the Inbox', publishing: 'Publishing', insights: 'Insights', listening: 'Listening', strategy: 'Strategy', agents: 'the team', activity: 'Activity', settings: 'Settings' }

/** The chat, from anywhere, with the page you're on as context. */
export default function ChatDrawer({ open, onOpenChange, chatId, setChatId }: { open: boolean; onOpenChange: (o: boolean) => void; chatId: string | null; setChatId: (id: string) => void }) {
  const { s, d } = useStore()
  const loc = useLocation()
  const nav = useNavigate()
  const context = useMemo(() => {
    const [seg, sub] = loc.pathname.split('/').slice(1)
    const base = LABEL[seg ?? ''] ?? seg
    const extra = seg === 'inbox' && sub ? ` · ${s.handoffs.find(h => h.ref === sub)?.title ?? sub.replace('c-', '@')}` : seg === 'agents' && sub ? ` · ${sub[0].toUpperCase()}${sub.slice(1)}` : ''
    return { label: `${base}${extra}`, link: loc.pathname }
  }, [loc.pathname, s.handoffs])
  const chat = s.chats.list.find(c => c.id === chatId)

  const fresh = () => { const id = uid('chat'); d({ type: 'chats/new', id, context }); setChatId(id) }
  // Opening with no current chat starts one, with this page as context.
  useEffect(() => { if (open && !chat) fresh() }, [open, chat]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={chat?.messages.length ? chat.title : 'New chat'}
      footer={chat && <>
        <span className="spacer" />
        {chat.messages.length > 0 && <Btn size="sm" variant="ghost" onClick={fresh}><MessageSquarePlus size={14} />New chat</Btn>}
        <Btn size="sm" variant="ghost" onClick={() => { onOpenChange(false); nav(`/chats/${chat.id}`) }}><Maximize2 size={14} />Open in Chats</Btn>
      </>}>
      {chat && <ChatThread key={chat.id} chat={chat} compact />}
    </Sheet>
  )
}
