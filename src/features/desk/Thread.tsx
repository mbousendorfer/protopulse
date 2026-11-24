import { useEffect, useRef, useState } from 'react'
import { ArrowUp, BookPlus, Check } from 'lucide-react'
import { useStore } from '../../app/store'
import { hhmm } from '../../app/time'
import { agentName } from '../../data/agents'
import type { ThreadMsg } from '../../app/types'
import { Btn, Mark, Sheet } from '../../ui'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { PreviewBlock, Slip } from './parts'

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
        <div className="thread">
          <Slip h={h} />
          <PreviewBlock h={h} />
          <div className="msgs" aria-live="polite">
            {msgs.map(m => (
              <div key={m.id} className={`msg ${m.from}`}>
                {m.from === 'you' ? <SocialAvatar name="Sam Rivera" size={24} /> : <Mark agent={m.from === 'claire' ? 'claire' : h.agent} />}
                <div className="bubble">
                  <div className="meta"><b>{m.from === 'you' ? 'You' : m.from === 'claire' ? 'Claire' : agentName(h.agent)}</b><span className="mono faint">{hhmm(m.at)}</span></div>
                  <p>{m.text}</p>
                  {m.rule && (
                    <div className="rule-suggest">
                      <span>“{m.rule}”</span>
                      {m.ruleAdded ? <span className="row tight ok"><Check size={14} />Added to the Playbook</span>
                        : <Btn size="sm" variant="primary" onClick={() => d({ type: 'core/acceptRule', id: h.id, msg: m.id })}><BookPlus size={14} />Add to Playbook</Btn>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={end} />
          </div>
          <div className="suggest row">
            {SUGGESTIONS.map(x => <button key={x} className="filter" onClick={() => send(x)}>{x}</button>)}
          </div>
          <form className="composer" onSubmit={e => { e.preventDefault(); send(text) }}>
            <label htmlFor="thread-input" className="sr-only">Message {agentName(h.agent)}</label>
            <textarea id="thread-input" className="textarea" rows={2} value={text} placeholder={`Tell ${agentName(h.agent)} what to change…`} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text) } }} />
            <Btn variant="primary" icon type="submit" aria-label="Send" disabled={!text.trim()}><ArrowUp size={16} /></Btn>
          </form>
        </div>
      )}
    </Sheet>
  )
}
