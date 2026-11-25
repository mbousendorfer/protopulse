import { useState } from 'react'
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { useStore } from '../../app/store'
import { Btn, Sheet } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import { withTeam } from '../../data/inbox'
import { virtualConvs } from './slice'

/** The Inbox labels: how many conversations and rules use each, rename everywhere, delete with Undo. */
export function LabelsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { s, d } = useStore()
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [fresh, setFresh] = useState('')
  const all = [...virtualConvs(s), ...s.inbox.convs.map(withTeam)]
  // The journal line the last rename or delete wrote: its Undo puts everything back.
  const last = s.log[0]
  const shown = last?.link === '/inbox?labels=1' && last.status === 'done' && last.undoUntil ? last : undefined
  return (
    <Sheet open={open} onOpenChange={o => { onOpenChange(o); if (!o) setEditing(null) }} title="Labels">
      <div className="stack">
        <p className="muted">Nova’s rules label conversations as they arrive. Renaming a label renames it everywhere, rules included.</p>
        {shown && <UndoBar onUndo={() => d({ type: 'core/undo', id: shown.id })} until={shown.undoUntil}>{shown.text}</UndoBar>}
        <ul className="ib-rules" aria-label="Labels">
          {s.inbox.labels.map(l => {
            const n = all.filter(c => c.labels?.includes(l)).length
            const r = s.inbox.rules.filter(x => x.then.op === 'label' && x.then.value === l).length
            return (
              <li key={l} className="ib-rule">
                {editing === l ? (
                  <form className="row grow" onSubmit={e => { e.preventDefault(); d({ type: 'inbox/labelRename', from: l, to: name }); setEditing(null) }}>
                    <input className="input grow" autoFocus value={name} onChange={e => setName(e.target.value)} aria-label={`New name for ${l}`} />
                    <Btn size="sm" variant="primary" type="submit" disabled={!name.trim() || name.trim() === l || s.inbox.labels.includes(name.trim())}>Rename</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
                  </form>
                ) : (
                  <>
                    <Tag size={14} aria-hidden />
                    <span className="grow"><b>{l}</b><span className="faint"> · {n} conversation{n === 1 ? '' : 's'}{r ? ` · ${r} rule${r > 1 ? 's' : ''}` : ''}</span></span>
                    <Btn size="xs" variant="ghost" onClick={() => { setEditing(l); setName(l) }} aria-label={`Rename ${l}`}><Pencil size={12} />Rename</Btn>
                    <Btn size="xs" variant="ghost" icon onClick={() => d({ type: 'inbox/labelDelete', name: l })} aria-label={`Delete ${l}`}><Trash2 size={12} /></Btn>
                  </>
                )}
              </li>
            )
          })}
        </ul>
        <form className="row" onSubmit={e => { e.preventDefault(); d({ type: 'inbox/labelAdd', name: fresh }); setFresh('') }}>
          <input className="input w-240" value={fresh} onChange={e => setFresh(e.target.value)} placeholder="New label" aria-label="New label" />
          <Btn size="sm" type="submit" disabled={!fresh.trim() || s.inbox.labels.includes(fresh.trim())}><Plus size={14} />Add</Btn>
        </form>
      </div>
    </Sheet>
  )
}
