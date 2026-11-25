import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Network } from '../../app/types'
import { useStore } from '../../app/store'
import { actionOf } from '../../app/core'
import { AUTONOMY_LABEL, NETWORK_LABEL } from '../../data/agents'
import { withTeam, type ConvType, type Sentiment } from '../../data/inbox'
import { Btn, Menu, Net, Seg, Sheet, Switch } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import { suggestedCount } from './slice'
import { matches, thenText, whenText, type InboxRule, type RuleOp } from './rules'

const TYPES: Record<ConvType, string> = { comment: 'Comments', dm: 'Messages', mention: 'Mentions', review: 'Reviews', ad: 'Ad comments' }
const OPS: { op: RuleOp['op']; label: string }[] = [{ op: 'label', label: 'Label' }, { op: 'assign', label: 'Assign' }, { op: 'hide', label: 'Hide' }, { op: 'review', label: 'Mark reviewed' }, { op: 'sentiment', label: 'Set sentiment' }]

/** Nova's Inbox rules: what she does on her own as messages arrive, how often, and the switch to stop it. */
export function RulesSheet({ open, onOpenChange, labels }: { open: boolean; onOpenChange: (o: boolean) => void; labels: string[] }) {
  const { s, d } = useStore()
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [removed, setRemoved] = useState<{ rule: InboxRule; index: number } | null>(null)
  const level = actionOf(s, 'nova', 'nova-rules')?.autonomy ?? 'act'
  const waiting = suggestedCount(s)
  const rules = s.inbox.rules
  return (
    <Sheet open={open} onOpenChange={o => { onOpenChange(o); if (!o) setEditing(null) }} title="Nova’s Inbox rules" wide>
      <div className="stack">
        <p className="muted">
          {level === 'act' ? 'Nova applies these as messages arrive. Each one is in the journal with Undo.'
            : level === 'draft' ? 'Nova lines up what these rules would do. You apply them in one go.'
              : 'Nova shows which rule fits on each conversation. You apply them.'}
          {' '}<Link to="/agents/nova" className="link-btn">Rules are on {AUTONOMY_LABEL[level]}</Link>
        </p>
        {level !== 'act' && waiting > 0 && (
          <div className="ib-rule-wait row">
            <span className="grow"><b className="num">{waiting}</b> {waiting > 1 ? 'changes wait' : 'change waits'} for you on conversations that came in.</span>
            <Btn size="sm" onClick={() => d({ type: 'inbox/ruleApplyAll' })}>Apply {waiting > 1 ? `all ${waiting}` : 'it'}</Btn>
          </div>
        )}
        {removed && (
          <UndoBar onUndo={() => { d({ type: 'inbox/ruleRestore', ...removed }); setRemoved(null) }} onDismiss={() => setRemoved(null)}>Deleted the rule “{thenText(removed.rule.then)}”</UndoBar>
        )}
        <ul className="ib-rules" aria-label="Rules">
          {rules.map((r, i) => editing === r.id
            ? <li key={r.id}><RuleForm rule={r} labels={labels} onDone={() => setEditing(null)} /></li>
            : (
              <li key={r.id} className={`ib-rule ${r.on ? '' : 'off'}`}>
                <div className="grow">
                  <p><span className="faint">When a message </span>{whenText(r)}</p>
                  <p><b>{thenText(r.then)}</b><span className="faint"> · used {r.uses} {r.uses === 1 ? 'time' : 'times'} · {r.origin}</span></p>
                </div>
                <Switch checked={r.on} onChange={() => d({ type: 'inbox/ruleToggle', id: r.id })} label={r.on ? 'On' : 'Off'} hideLabel />
                <Btn size="xs" variant="ghost" onClick={() => setEditing(r.id)} aria-label={`Edit the rule ${thenText(r.then)}`}><Pencil size={12} />Edit</Btn>
                <Btn size="xs" variant="ghost" icon onClick={() => { setRemoved({ rule: r, index: i }); d({ type: 'inbox/ruleDelete', id: r.id }) }} aria-label={`Delete the rule ${thenText(r.then)}`}><Trash2 size={12} /></Btn>
              </li>
            ))}
        </ul>
        {editing === 'new' ? <RuleForm labels={labels} onDone={() => setEditing(null)} />
          : <Btn size="sm" className="self-start" onClick={() => setEditing('new')}><Plus size={14} />Add a rule</Btn>}
      </div>
    </Sheet>
  )
}

function RuleForm({ rule, labels, onDone }: { rule?: InboxRule; labels: string[]; onDone: () => void }) {
  const { s, d } = useStore()
  const [words, setWords] = useState(rule?.words.join(', ') ?? '')
  const [network, setNetwork] = useState<Network | undefined>(rule?.network)
  const [type, setType] = useState<ConvType | undefined>(rule?.type)
  const [op, setOp] = useState<RuleOp['op']>(rule?.then.op ?? 'label')
  const [label, setLabel] = useState(rule?.then.op === 'label' ? rule.then.value : labels[0] ?? '')
  const [who, setWho] = useState<'sam' | 'claire'>(rule?.then.op === 'assign' ? rule.then.value : 'claire')
  const [mood, setMood] = useState<Sentiment>(rule?.then.op === 'sentiment' ? rule.then.value : 'negative')
  const [now, setNow] = useState(true)
  const [fresh, setFresh] = useState(false)
  const list = words.split(',').map(w => w.trim()).filter(Boolean)
  const then: RuleOp = op === 'label' ? { op, value: label.trim() } : op === 'assign' ? { op, value: who } : op === 'sentiment' ? { op, value: mood } : { op }
  const draft = { words: list, network, type, then }
  const fits = list.length ? s.inbox.convs.filter(c => matches({ ...draft, id: '', on: true, uses: 0, origin: '' }, withTeam(c))).length : 0
  const ok = list.length > 0 && (op !== 'label' || !!label.trim())
  const save = () => {
    if (!ok) return
    d(rule ? { type: 'inbox/ruleEdit', id: rule.id, rule: draft } : { type: 'inbox/ruleAdd', rule: draft, applyNow: now && fits > 0 })
    onDone()
  }
  return (
    <form className="ib-rule-form stack" onSubmit={e => { e.preventDefault(); save() }} aria-label={rule ? 'Edit the rule' : 'New rule'}>
      <label className="stack">
        <span className="t-sm">When a message says any of</span>
        <input className="input" autoFocus value={words} onChange={e => setWords(e.target.value)} placeholder="refund, money back" />
      </label>
      <div className="row">
        <Menu align="start" trigger={<Btn size="sm" variant="ghost">{network ? <><Net n={network} />{NETWORK_LABEL[network]}</> : 'On any network'}<ChevronDown size={12} /></Btn>}
          items={[{ label: 'Any network', onSelect: () => setNetwork(undefined) }, ...(Object.keys(NETWORK_LABEL) as Network[]).map(n => ({ label: NETWORK_LABEL[n], icon: <Net n={n} />, onSelect: () => setNetwork(n) }))]} />
        <Menu align="start" trigger={<Btn size="sm" variant="ghost">{type ? TYPES[type] : 'Any type'}<ChevronDown size={12} /></Btn>}
          items={[{ label: 'Any type', onSelect: () => setType(undefined) }, ...(Object.keys(TYPES) as ConvType[]).map(t => ({ label: TYPES[t], onSelect: () => setType(t) }))]} />
      </div>
      <div className="row">
        <span className="t-sm">Nova should</span>
        <Menu align="start" trigger={<Btn size="sm" variant="ghost">{OPS.find(o => o.op === op)!.label}<ChevronDown size={12} /></Btn>}
          items={OPS.map(o => ({ label: o.label, onSelect: () => setOp(o.op) }))} />
        {op === 'label' && (fresh
          ? <input className="input w-180" autoFocus value={label} onChange={e => setLabel(e.target.value)} placeholder="New label" aria-label="New label" />
          : <Menu align="start" trigger={<Btn size="sm" variant="ghost">{label || 'Pick a label'}<ChevronDown size={12} /></Btn>}
              items={[...labels.map(l => ({ label: l, onSelect: () => setLabel(l) })), 'sep', { label: 'New label…', icon: <Plus size={14} />, onSelect: () => { setFresh(true); setLabel('') } }]} />)}
        {op === 'assign' && <Seg name="ib-rule-who" size="sm" label="Assign to" value={who} onChange={setWho} options={[{ value: 'claire', label: 'Claire' }, { value: 'sam', label: 'Me' }]} />}
        {op === 'sentiment' && <Seg name="ib-rule-mood" size="sm" label="Sentiment" value={mood} onChange={setMood} options={[{ value: 'positive', label: 'Positive' }, { value: 'neutral', label: 'Neutral' }, { value: 'negative', label: 'Negative' }]} />}
      </div>
      {!rule && fits > 0 && <Switch checked={now} onChange={setNow} label={`Also apply it to the ${fits} conversation${fits > 1 ? 's' : ''} that match now`} />}
      <div className="row">
        <Btn size="sm" variant="primary" type="submit" disabled={!ok}>{rule ? 'Save' : 'Add the rule'}</Btn>
        <Btn size="sm" variant="ghost" onClick={onDone}>Cancel</Btn>
      </div>
    </form>
  )
}
