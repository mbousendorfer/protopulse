import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Undo2 } from 'lucide-react'
import { useStore } from '../../app/store'
import { groupOf } from '../../app/reducer'
import { Btn, Kbd, TopicIcon } from '../../ui'
import Detail from './Detail'
import { AllClear } from './Desk'
import { byPriority, useHandoffActions } from './parts'
import './desk.css'
import './today.css'
import './focus.css'

/** Full screen, one Needs-you item at a time. Decision keys live in Detail; this handles moving and undo. */
export default function Focus() {
  const { s } = useStore()
  const nav = useNavigate()
  const act = useHandoffActions()
  const queue = useMemo(() => s.handoffs.filter(h => !h.lane && groupOf(h) === 'need').sort(byPriority), [s.handoffs])
  const [currentId, setCurrentId] = useState<string | undefined>(queue[0]?.id)
  const doneAtStart = useRef(s.desk.done.length)
  const total = useRef(queue.length)
  const handled = s.desk.done.length - doneAtStart.current
  total.current = Math.max(total.current, handled + queue.length)

  const idx = Math.max(0, queue.findIndex(h => h.id === currentId))
  const h = queue.find(x => x.id === currentId) ?? queue[Math.min(idx, queue.length - 1)]
  useEffect(() => { if (h && h.id !== currentId) setCurrentId(h.id) }, [h, currentId])

  const undo = () => {
    const last = s.desk.done[0]
    if (!last || handled <= 0) return
    act.restore(last.h)
    setCurrentId(last.h.id)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof Element ? e.target : null
      if (t?.closest('input, textarea, [role="dialog"]')) return
      const k = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); undo(); return }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Esc leaves Focus only when the card is idle; in Edit, Reject or Snooze it just steps back.
      if (k === 'escape' && document.querySelector('.detail')?.getAttribute('data-mode') === 'idle') { nav('/'); return }
      if (k === 'j' || k === 'arrowdown') { e.preventDefault(); setCurrentId(queue[Math.min(queue.length - 1, idx + 1)]?.id) }
      if (k === 'k' || k === 'arrowup') { e.preventDefault(); setCurrentId(queue[Math.max(0, idx - 1)]?.id) }
      if (k === 'z') { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="focus">
      <header className="focus-top">
        <Btn variant="ghost" onClick={() => nav('/')} kbd="Esc"><ArrowLeft size={14} />Desk</Btn>
        <div className="focus-progress" aria-live="polite">
          <span className="num">{h ? `${Math.min(handled + 1, total.current)} of ${total.current}` : `${handled} done`}</span>
          <span className="bar" aria-hidden><i style={{ width: `${(handled / Math.max(1, total.current)) * 100}%` }} /></span>
        </div>
        <Btn variant="ghost" onClick={undo} disabled={handled <= 0} kbd="Z"><Undo2 size={14} />Undo</Btn>
      </header>

      {!h ? (
        <div className="focus-summary"><AllClear action={<Btn variant="primary" onClick={() => nav('/')}>Back to the Desk</Btn>} /></div>
      ) : (
        <div className="focus-body">
          <ol className="focus-queue" aria-label="Queue">
            {queue.map((x, i) => (
              <li key={x.id}>
                <button aria-current={x.id === h.id} onClick={() => setCurrentId(x.id)}>
                  <TopicIcon agent={x.agent} kind={x.kind} topic={x.topic} size={24} />
                  <span className="ellipsis">{x.title}</span>
                  {x.urgency === 'urgent' && <span className="dot" style={{ color: 'var(--alert)' }} aria-label="Urgent" />}
                  <span className="mono faint">{i + 1}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="focus-card card">
            <Detail key={h.id} h={h} big onSettled={() => setCurrentId(queue[idx + 1]?.id ?? queue[idx - 1]?.id)} />
            <div className="focus-nav faint"><Kbd>J</Kbd><Kbd>K</Kbd> next / previous · <Kbd>Z</Kbd> undo · <Kbd>Esc</Kbd> back to Desk</div>
          </div>
        </div>
      )}
    </div>
  )
}
