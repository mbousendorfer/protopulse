import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../app/store'
import { Btn, Sheet } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import type { SavedReply } from './saved'

/** The team's saved replies. `seed` opens the form prefilled (Save as reply from a sent message). */
export function SavedSheet({ open, onOpenChange, seed }: { open: boolean; onOpenChange: (o: boolean) => void; seed?: string }) {
  const { s, d } = useStore()
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [removed, setRemoved] = useState<{ reply: SavedReply; index: number } | null>(null)
  const form = seed !== undefined && editing === null ? 'new' : editing
  return (
    <Sheet open={open} onOpenChange={o => { onOpenChange(o); if (!o) setEditing(null) }} title="Saved replies" wide>
      <div className="stack">
        <p className="muted"><code>{'{name}'}</code> becomes the customer’s first name.</p>
        {removed && <UndoBar onUndo={() => { d({ type: 'inbox/savedRestore', ...removed }); setRemoved(null) }} onDismiss={() => setRemoved(null)}>Deleted “{removed.reply.name}”</UndoBar>}
        {form === 'new' && <SavedForm text={seed} onDone={() => { setEditing(null); if (seed !== undefined) onOpenChange(false) }} />}
        <ul className="ib-rules" aria-label="Saved replies">
          {s.inbox.saved.map((r, i) => form === r.id
            ? <li key={r.id}><SavedForm reply={r} onDone={() => setEditing(null)} /></li>
            : (
              <li key={r.id} className="ib-rule">
                <div className="grow">
                  <p><b>{r.name}</b><span className="faint"> · used {r.uses} {r.uses === 1 ? 'time' : 'times'}{r.by === 'you' ? ' · saved by you' : ''}</span></p>
                  <p className="muted">{r.text}</p>
                </div>
                <Btn size="xs" variant="ghost" onClick={() => setEditing(r.id)} aria-label={`Edit ${r.name}`}><Pencil size={12} />Edit</Btn>
                <Btn size="xs" variant="ghost" icon onClick={() => { setRemoved({ reply: r, index: i }); d({ type: 'inbox/savedDelete', id: r.id }) }} aria-label={`Delete ${r.name}`}><Trash2 size={12} /></Btn>
              </li>
            ))}
        </ul>
        {form !== 'new' && <Btn size="sm" className="self-start" onClick={() => setEditing('new')}><Plus size={14} />Add a saved reply</Btn>}
      </div>
    </Sheet>
  )
}

function SavedForm({ reply, text: start, onDone }: { reply?: SavedReply; text?: string; onDone: () => void }) {
  const { d } = useStore()
  const [name, setName] = useState(reply?.name ?? '')
  const [text, setText] = useState(reply?.text ?? start ?? '')
  const ok = name.trim() && text.trim()
  const save = () => {
    if (!ok) return
    d(reply ? { type: 'inbox/savedEdit', id: reply.id, name, text } : { type: 'inbox/savedAdd', name, text })
    onDone()
  }
  return (
    <form className="ib-rule-form stack" onSubmit={e => { e.preventDefault(); save() }} aria-label={reply ? `Edit ${reply.name}` : 'New saved reply'}>
      <label className="stack"><span className="t-sm">Name</span><input className="input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Exchange" /></label>
      <label className="stack"><span className="t-sm">Reply</span><textarea className="textarea" rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="{name}, sorry about that…" /></label>
      <div className="row">
        <Btn size="sm" variant="primary" type="submit" disabled={!ok}>{reply ? 'Save' : 'Add the saved reply'}</Btn>
        <Btn size="sm" variant="ghost" onClick={onDone}>Cancel</Btn>
      </div>
    </form>
  )
}
