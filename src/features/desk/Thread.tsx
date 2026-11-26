import { useEffect, useRef, useState } from 'react'
import { ArrowUp, BookPlus, Check } from 'lucide-react'
import { useStore } from '../../app/store'
import { hhmm } from '../../app/time'
import { agentName } from '../../data/agents'
import type { ThreadMsg } from '../../app/types'
import { Btn, Mark, Sheet } from '../../ui'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { PreviewBlock, Slip, tint } from './parts'
import '../chats/chats.css'

const SUGGESTIONS = ['Why did you raise this?', 'Make it shorter', 'Make it warmer', 'Don’t offer discount codes on complaints', 'Ask Claire']

export default function Thread({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { s, d } = useStore()
  const h = s.handoffs.find(x => x.id === id)
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [h?.thread?.length])

  const send = (t: string) => {
    if (!h || !t.trim()) return
    d({ type: 'core/thread', id: h.id, text: t.trim() })
    setText('')
  }

  const intro: ThreadMsg | null = h ? { id: 'intro', from: 'agent', at: h.at, text: `${h.why}${h.rules?.length ? ` I applied ${h.rules.map(r => `“${r}”`).join(' and ')}.` : ''} Ask me anything about it, or tell me what to change.` } : null
  const msgs = h ? (h.thread?.length ? h.thread : [intro!]) : []

  return (
    <Sheet open={!!h} onOpenChange={o => !o && onClose()} title={h?.title ?? ''}>
      {h && (
        <div className="thread chat compact">
          <Slip h={h} />
          <PreviewBlock h={h} />
          {/* Same conversation look as Chats: your messages on the right, the agent's in a bubble with its name. */}
          <div className="chat-msgs" aria-live="polite">
            {msgs.map(m => m.from === 'you' ? (
              <div key={m.id} className="msg-row you">
                <div className="bubble you"><p>{m.text}</p><span className="mono faint">{hhmm(m.at)}</span></div>
                <SocialAvatar name="Sam Rivera" size={24} />
              </div>
            ) : (
              <div key={m.id} className="msg-row">
                <Mark agent={m.from === 'claire' ? 'claire' : h.agent} />
                <div className="bubble agent" style={tint(m.from === 'claire' ? 'claire' : h.agent)}>
                  <div className="who"><b>{m.from === 'claire' ? 'Claire' : agentName(h.agent)}</b><span className="mono faint">{hhmm(m.at)}</span></div>
                  <p>{m.text}</p>
                  {m.rule && (
                    <div className="ccard">
                      <b>“{m.rule}”</b>
                      {m.ruleAdded ? <span className="pill ok"><Check size={12} />In the Playbook</span>
                        : <div className="row"><Btn size="sm" variant="primary" onClick={() => d({ type: 'core/acceptRule', id: h.id, msg: m.id })}><BookPlus size={14} />Add to Playbook</Btn></div>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={end} />
          </div>
          <form className="chat-composer" onSubmit={e => { e.preventDefault(); send(text) }}>
            <div className="chat-mentions" aria-label="Suggestions">
              {SUGGESTIONS.map(x => <button type="button" key={x} className="filter" onClick={() => send(x)}>{x}</button>)}
            </div>
            <div className="row nowrap">
              <label htmlFor="thread-input" className="sr-only">Message {agentName(h.agent)}</label>
              <textarea id="thread-input" className="textarea" rows={2} value={text} placeholder={`Tell ${agentName(h.agent)} what to change…`} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text) } }} />
              <Btn variant="primary" icon type="submit" aria-label="Send" disabled={!text.trim()}><ArrowUp size={16} /></Btn>
            </div>
          </form>
        </div>
      )}
    </Sheet>
  )
}
