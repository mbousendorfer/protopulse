import { useState } from 'react'
import { BellRing, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { Btn, Menu, Modal, Switch } from '../../ui'
import './alerts.css'

/** A dropdown built on the shared Menu, for short option lists. */
function Choice({ id, value, options, onChange }: { id: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return <Menu align="start" trigger={<button id={id} type="button" className="input in-choice">{options.find(o => o.value === value)?.label ?? value}<ChevronDown size={14} /></button>}
    items={options.map(o => ({ label: o.label, onSelect: () => onChange(o.value) }))} />
}

/** An alert rule an agent watches for. Shared by Iris (metrics) and Echo (searches). */
export type Alert = { id: string; subject: string; condition: string; threshold: number; unit: string; to: 'desk' | 'claire'; on: boolean }

/** Trigger a real download of a text file. */
export function downloadFile(name: string, content: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Rows → CSV, quoting every cell. */
export const toCSV = (rows: (string | number)[][]) => rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')

/** The rule as a sentence: “Views per video drops by more than 30% over 3 posts”. */
export const ruleSentence = (a: Alert, subjects: { value: string; label: string }[]) =>
  `${subjects.find(x => x.value === a.subject)?.label ?? a.subject} ${a.condition} ${a.threshold.toLocaleString('en-GB')}${a.unit}`

/** Editable list of alert rules: on/off, edit, delete, add. */
export function AlertsTable({ agent, alerts, subjects, conditions, units, onSave, onToggle, onDelete, intro }: {
  agent: string
  alerts: Alert[]
  subjects: { value: string; label: string }[]
  conditions: string[]
  units: string[]
  onSave: (a: Alert) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  intro: string
}) {
  const [edit, setEdit] = useState<Alert | null>(null)
  const blank: Alert = { id: '', subject: subjects[0].value, condition: conditions[0], threshold: 20, unit: units[0], to: 'desk', on: true }
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="row tight"><BellRing size={16} aria-hidden />Alerts</h2>
        <Btn size="sm" onClick={() => setEdit(blank)}><Plus size={14} />New alert</Btn>
      </div>
      <p className="muted in-alert-intro">{intro}</p>
      <ul className="in-alerts">
        {alerts.map(a => (
          <li key={a.id} className={a.on ? '' : 'off'}>
            <Switch checked={a.on} onChange={() => onToggle(a.id)} label={`${a.on ? 'Turn off' : 'Turn on'}: ${ruleSentence(a, subjects)}`} hideLabel />
            <span className="in-alert-text"><b>{ruleSentence(a, subjects)}</b><span className="faint"> → {a.to === 'claire' ? 'Desk and Claire' : 'your Desk'}</span></span>
            <Btn size="xs" variant="ghost" icon aria-label={`Edit alert: ${ruleSentence(a, subjects)}`} onClick={() => setEdit(a)}><Pencil size={12} /></Btn>
            <Btn size="xs" variant="ghost" icon aria-label={`Delete alert: ${ruleSentence(a, subjects)}`} onClick={() => onDelete(a.id)}><Trash2 size={12} /></Btn>
          </li>
        ))}
        {!alerts.length && <li className="faint">No alerts. {agent} only reports in the weekly report.</li>}
      </ul>
      {edit && <AlertForm alert={edit} subjects={subjects} conditions={conditions} units={units} onClose={() => setEdit(null)} onSave={a => { onSave(a); setEdit(null) }} />}
    </section>
  )
}

function AlertForm({ alert, subjects, conditions, units, onClose, onSave }: { alert: Alert; subjects: { value: string; label: string }[]; conditions: string[]; units: string[]; onClose: () => void; onSave: (a: Alert) => void }) {
  const [v, setV] = useState(alert)
  const valid = v.threshold > 0
  return (
    <Modal open onOpenChange={o => !o && onClose()} title={alert.id ? 'Edit alert' : 'New alert'}
      footer={<><span className="spacer" /><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!valid} onClick={() => onSave(v)}>{alert.id ? 'Save' : 'Create alert'}</Btn></>}>
      <form className="stack" onSubmit={e => { e.preventDefault(); if (valid) onSave(v) }}>
        <div className="field"><label htmlFor="al-s">Watch</label>
          <Choice id="al-s" value={v.subject} options={subjects} onChange={x => setV({ ...v, subject: x })} /></div>
        <div className="row nowrap">
          <div className="field grow"><label htmlFor="al-c">When it</label>
            <Choice id="al-c" value={v.condition} options={conditions.map(x => ({ value: x, label: x }))} onChange={x => setV({ ...v, condition: x })} /></div>
          <div className="field"><label htmlFor="al-t">Threshold</label><input id="al-t" type="number" min={1} className="input w-100" value={v.threshold} onChange={e => setV({ ...v, threshold: +e.target.value })} /></div>
          <div className="field"><label htmlFor="al-u">Unit</label>
            <Choice id="al-u" value={v.unit} options={units.map(x => ({ value: x, label: x.trim() || 'count' }))} onChange={x => setV({ ...v, unit: x })} /></div>
        </div>
        <div className="field"><span className="label">Send it to</span>
          <div className="row">
            <label className="row tight"><input type="radio" name="al-to" checked={v.to === 'desk'} onChange={() => setV({ ...v, to: 'desk' })} />Your Desk</label>
            <label className="row tight"><input type="radio" name="al-to" checked={v.to === 'claire'} onChange={() => setV({ ...v, to: 'claire' })} />Your Desk and Claire</label>
          </div>
        </div>
      </form>
    </Modal>
  )
}
