import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, Pencil, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import type { AgentId, PlaybookRule } from '../../app/types'
import { useStore } from '../../app/store'
import { ago } from '../../app/time'
import { now } from '../../app/core'
import { AGENTS, agentName } from '../../data/agents'
import { checkMessage, voiceSample } from '../../data/playbook'
import { Btn, Empty, Mark, Menu, PageHead, Pill, Seg, Switch, Tabs } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import { HBars } from '../../ui/charts'
import './playbook.css'

type Tab = 'rules' | 'words' | 'facts' | 'voice' | 'escalation' | 'pillars'

export default function PlaybookPage() {
  const { s } = useStore()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => (params.get('tab') as Tab) || 'rules')
  const rules = s.playbook.rules.filter(r => r.kind === 'do' || r.kind === 'dont')
  const facts = s.playbook.rules.filter(r => r.kind === 'fact')
  return (
    <div className="page">
      <PageHead title="Playbook" lede="What your agents know about Fernway and how they speak. Every draft shows the rules it followed. Edit anything here and every agent picks it up at once." />
      <Proposals />
      <TryMessage />
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'rules', label: 'Rules', count: rules.length },
        { value: 'words', label: 'Words', count: s.playbook.banned.length + s.playbook.preferred.length },
        { value: 'facts', label: 'Facts', count: facts.length },
        { value: 'voice', label: 'Voice' },
        { value: 'escalation', label: 'Escalation', count: s.playbook.escalate.filter(e => e.on).length },
        { value: 'pillars', label: 'Pillars' },
      ]} />
      {tab === 'rules' && <RuleList items={rules} kinds />}
      {tab === 'facts' && <RuleList items={facts} />}
      {tab === 'words' && <Words />}
      {tab === 'voice' && <VoicePanel />}
      {tab === 'escalation' && <Escalation />}
      {tab === 'pillars' && <Pillars />}
    </div>
  )
}

/* ---------- Proposed by agents (Desk cards with a rule proposal) ---------- */
function Proposals() {
  const { s, d } = useStore()
  const items = s.handoffs.filter(h => h.proposal && !h.lane)
  if (!items.length) return null
  return (
    <section className="card pb-proposals" aria-labelledby="pb-prop">
      <div className="card-head"><h2 id="pb-prop" className="row tight"><Sparkles size={14} aria-hidden />Proposed by your agents <span className="faint num">{items.length}</span></h2></div>
      <ul className="rows">
        {items.map(h => (
          <li key={h.id} className="pb-prop">
            <Mark agent={h.agent} />
            <div className="grow">
              <b>“{h.proposal!.text}”</b>
              <p className="muted">{h.context} <span className="faint">· for {h.proposal!.agents.map(agentName).join(' and ')}</span></p>
            </div>
            <Btn size="sm" variant="primary" onClick={() => d({ type: 'core/resolve', id: h.id, decision: { kind: 'approve' } })}><Plus size={14} />Add</Btn>
            <Btn size="sm" variant="ghost" onClick={() => d({ type: 'core/resolve', id: h.id, decision: { kind: 'reject', reason: 'Not a rule' } })}>Dismiss</Btn>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------- Try a message ---------- */
function highlight(text: string, terms: string[]): ReactNode {
  const clean = [...new Set(terms.filter(Boolean))]
  if (!clean.length) return text
  const re = new RegExp(`(${clean.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'giu')
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i} className="pb-hit">{part}</mark> : part))
}

const SAMPLE = 'Hey guys! Our cheap new Ridge ships tomorrow 🎒🔥 Way better than Peakline. Use code SNOW25 #hike #gear #outdoors #trail'

function TryMessage() {
  const { s } = useStore()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [network, setNetwork] = useState('instagram')
  const issues = useMemo(() => checkMessage(text, s.playbook.banned, s.playbook.preferred, network), [text, s.playbook, network])
  if (!open) return (
    <button className="pb-try-fold" onClick={() => setOpen(true)}><Search size={14} aria-hidden />Try a message against the Playbook</button>
  )
  return (
    <section className="card pad pb-try" aria-labelledby="pb-try">
      <div className="row between">
        <h2 id="pb-try" className="section-title flush">Try a message</h2>
        <div className="row">
          <Seg name="try-net" label="Network" size="sm" value={network} onChange={setNetwork} options={[{ value: 'instagram', label: 'Instagram' }, { value: 'linkedin', label: 'LinkedIn' }, { value: 'tiktok', label: 'TikTok' }]} />
          <Btn size="sm" variant="ghost" onClick={() => setText(SAMPLE)}>Paste an example</Btn>
          <Btn size="sm" variant="ghost" icon aria-label="Close" onClick={() => setOpen(false)}><X size={14} /></Btn>
        </div>
      </div>
      <label htmlFor="pb-try-text" className="sr-only">Message to check</label>
      <textarea id="pb-try-text" className="textarea" rows={3} value={text} placeholder="Paste a reply or a caption to see which rules it breaks" onChange={e => setText(e.target.value)} />
      {text.trim() && (
        <div className="pb-try-out" aria-live="polite">
          <p className="well">{highlight(text, issues.flatMap(i => i.terms))}</p>
          {issues.length ? (
            <ul className="pb-issues">{issues.map(i => <li key={i.rule}><X size={14} className="bad" aria-hidden /><span>{i.rule}</span>{i.terms.length > 0 && <span className="faint">{i.terms.join(', ')}</span>}</li>)}</ul>
          ) : <p className="row tight ok"><Check size={14} />Follows every rule your agents apply.</p>}
        </div>
      )}
    </section>
  )
}

/* ---------- Rules and facts ---------- */
function RuleList({ items, kinds }: { items: PlaybookRule[]; kinds?: boolean }) {
  const { s, d } = useStore()
  const [agent, setAgent] = useState<'all' | AgentId>('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [deleted, setDeleted] = useState<{ rule: PlaybookRule; index: number } | null>(null)
  const t = now(s)
  const shown = items.filter(r => (agent === 'all' || r.agents.includes(agent)) && r.text.toLowerCase().includes(q.toLowerCase()))
  const del = (r: PlaybookRule) => { setDeleted({ rule: r, index: s.playbook.rules.indexOf(r) }); d({ type: 'playbook/deleteRule', id: r.id }) }

  return (
    <div className="stack">
      <div className="row">
        <div className="pb-search"><Search size={14} aria-hidden /><input className="input" placeholder={kinds ? 'Search rules' : 'Search facts'} value={q} onChange={e => setQ(e.target.value)} aria-label="Search" /></div>
        <Seg name={`pb-agent-${kinds ? 'r' : 'f'}`} label="Agent" size="sm" value={agent} onChange={setAgent} options={[{ value: 'all', label: 'All agents' }, ...AGENTS.map(a => ({ value: a.id as AgentId, label: a.name }))]} />
      </div>
      {deleted && (
        <UndoBar onUndo={() => { d({ type: 'playbook/restoreRule', rule: deleted.rule, index: deleted.index }); setDeleted(null) }} onDismiss={() => setDeleted(null)}>Deleted “{deleted.rule.text}”</UndoBar>
      )}
      <AddRule kinds={!!kinds} />
      <ul className="card rows pb-rules">
        {!shown.length && <li><Empty title={q ? 'Nothing matches this search' : 'No rule for this agent yet'} /></li>}
        {shown.map(r => (
          <li key={r.id} className={`pb-rule ${r.paused ? 'paused' : ''}`}>
            {kinds && <span className={`pb-kind ${r.kind}`}>{r.kind === 'do' ? 'Do' : 'Don’t'}</span>}
            <div className="pb-rule-body">
              {editing === r.id ? (
                <form className="row nowrap" onSubmit={e => { e.preventDefault(); if (draft.trim()) d({ type: 'playbook/editRule', id: r.id, text: draft.trim() }); setEditing(null) }}>
                  <input className="input" autoFocus value={draft} onChange={e => setDraft(e.target.value)} aria-label="Rule text" />
                  <Btn size="sm" variant="primary" type="submit">Save</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
                </form>
              ) : <p className="pb-text">{r.text}</p>}
              <div className="pb-meta">
                <span className="row tight">{r.agents.map(a => <Mark key={a} agent={a} />)}</span>
                <span>Used {r.uses} times in 30 days</span>
                <span className="faint">{r.origin}{r.addedAt > t - 86_400_000 * 2 ? ` · ${ago(r.addedAt, t)}` : ''}</span>
                {r.paused && <Pill tone="caution">Paused</Pill>}
              </div>
            </div>
            <div className="pb-actions">
              <Switch checked={!r.paused} onChange={() => d({ type: 'playbook/toggleRule', id: r.id })} label={r.paused ? `Resume “${r.text}”` : `Pause “${r.text}”`} hideLabel />
              <Btn size="xs" variant="ghost" icon aria-label={`Edit “${r.text}”`} onClick={() => { setEditing(r.id); setDraft(r.text) }}><Pencil size={13} /></Btn>
              <Btn size="xs" variant="ghost" icon aria-label={`Delete “${r.text}”`} onClick={() => del(r)}><Trash2 size={13} /></Btn>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AddRule({ kinds }: { kinds: boolean }) {
  const { s, d } = useStore()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<'do' | 'dont'>('do')
  const [text, setText] = useState('')
  const [agents, setAgents] = useState<AgentId[]>(['nova', 'atlas'])
  if (!open) return <Btn className="self-start" onClick={() => setOpen(true)}><Plus size={14} />{kinds ? 'Add a rule' : 'Add a fact'}</Btn>
  const dup = s.playbook.rules.some(r => r.text.toLowerCase() === text.trim().toLowerCase())
  const submit = () => {
    if (!text.trim() || !agents.length || dup) return
    d({ type: 'playbook/addRule', kind: kinds ? kind : 'fact', text: text.trim(), agents, origin: 'Added by you' })
    setText(''); setOpen(false)
  }
  return (
    <form className="card pad pb-add" onSubmit={e => { e.preventDefault(); submit() }}>
      <div className="row">
        {kinds && <Seg name="new-kind" label="Kind" size="sm" value={kind} onChange={setKind} options={[{ value: 'do', label: 'Do' }, { value: 'dont', label: 'Don’t' }]} />}
        <input className="input grow" autoFocus value={text} onChange={e => setText(e.target.value)} aria-describedby={dup ? 'pb-dup' : undefined}
          placeholder={kinds ? 'Never reply to a complaint with a joke' : 'Gift cards never expire'} aria-label={kinds ? 'Rule' : 'Fact'} />
      </div>
      {dup && <p className="caption" id="pb-dup">Already in the Playbook.</p>}
      <div className="row">
        <span className="faint">Applies to</span>
        {AGENTS.map(a => (
          <button type="button" key={a.id} className="filter" aria-pressed={agents.includes(a.id)} onClick={() => setAgents(x => x.includes(a.id) ? x.filter(y => y !== a.id) : [...x, a.id])}>{a.name}</button>
        ))}
        <span className="spacer" />
        <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
        <Btn variant="primary" type="submit" disabled={!text.trim() || !agents.length || dup}>Add</Btn>
      </div>
    </form>
  )
}

/* ---------- Words ---------- */
function Words() {
  const { s, d } = useStore()
  const [ban, setBan] = useState('')
  const [use, setUse] = useState('')
  const [instead, setInstead] = useState('')
  return (
    <div className="grid-2">
      <section className="card pad">
        <h2 className="section-title">Never use <span className="faint">{s.playbook.banned.length}</span></h2>
        <div className="pb-chips">
          {s.playbook.banned.map(w => (
            <span key={w} className="chip pb-word">{w}<button aria-label={`Remove ${w}`} onClick={() => d({ type: 'playbook/banned', word: w, add: false })}><X size={12} /></button></span>
          ))}
        </div>
        <form className="row nowrap" onSubmit={e => { e.preventDefault(); d({ type: 'playbook/banned', word: ban, add: true }); setBan('') }}>
          <input className="input" value={ban} onChange={e => setBan(e.target.value)} placeholder="awesome" aria-label="Word to ban" />
          <Btn type="submit" disabled={!ban.trim()}>Add</Btn>
        </form>
      </section>
      <section className="card pad">
        <h2 className="section-title">Prefer <span className="faint">{s.playbook.preferred.length}</span></h2>
        <ul className="rows pb-pref">
          {s.playbook.preferred.map(p => (
            <li key={p.use}><b>{p.use}</b><span className="faint">instead of</span><span>{p.instead}</span>
              <Btn size="xs" variant="ghost" icon aria-label={`Remove ${p.use}`} onClick={() => d({ type: 'playbook/preferred', use: p.use, add: false })}><X size={12} /></Btn></li>
          ))}
        </ul>
        <form className="row nowrap" onSubmit={e => { e.preventDefault(); if (use.trim() && instead.trim()) { d({ type: 'playbook/preferred', use: use.trim(), instead: instead.trim(), add: true }); setUse(''); setInstead('') } }}>
          <input className="input" value={use} onChange={e => setUse(e.target.value)} placeholder="backpack" aria-label="Word to use" />
          <span className="faint">instead of</span>
          <input className="input" value={instead} onChange={e => setInstead(e.target.value)} placeholder="rucksack" aria-label="Word to replace" />
          <Btn type="submit" disabled={!use.trim() || !instead.trim()}>Add</Btn>
        </form>
      </section>
    </div>
  )
}

/* ---------- Voice ---------- */
const SLIDERS = [
  { key: 'warmth', left: 'Neutral', right: 'Warm' },
  { key: 'play', left: 'Serious', right: 'Playful' },
  { key: 'length', left: 'Short', right: 'Detailed' },
] as const

function VoicePanel() {
  const { s, d } = useStore()
  const v = s.playbook.voice
  return (
    <div className="grid-2">
      <section className="card pad stack">
        <h2 className="section-title flush">How Fernway sounds</h2>
        {SLIDERS.map(x => (
          <label key={x.key} className="pb-slider">
            <span className="row between"><span className="muted">{x.left}</span><span className="muted">{x.right}</span></span>
            <input type="range" min={0} max={100} step={5} value={v[x.key]} onChange={e => d({ type: 'playbook/voice', key: x.key, value: +e.target.value })}
              aria-label={`${x.left} to ${x.right}`} aria-valuetext={`${v[x.key]} out of 100`} />
          </label>
        ))}
        <p className="faint">All agents use this voice. Nova applies it to replies, Atlas to captions.</p>
      </section>
      <section className="card pad">
        <h2 className="section-title">Live example <span className="faint">· Nova replying to a complaint</span></h2>
        <div className="well">
          <div className="faint t-xs">@lea.hikes</div>
          <p>Strap snapped on day 2 of the GR20. For a €140 bag that’s not ok.</p>
          <div className="pb-sample"><Mark agent="nova" /><p aria-live="polite">{voiceSample(v)}</p></div>
        </div>
      </section>
    </div>
  )
}

/* ---------- Escalation ---------- */
/** Ready-made escalation conditions. "N" is replaced by the number the user types. */
const CONDITIONS: { id: string; label: string; n?: string; agents: AgentId[] }[] = [
  { id: 'injury', label: 'Injury, safety or product recall', agents: ['nova', 'echo'] },
  { id: 'press', label: 'Journalists and press', agents: ['nova', 'echo'] },
  { id: 'legal', label: 'Lawyers and legal threats', agents: ['nova'] },
  { id: 'creator', label: 'Creators above N followers', n: '50k', agents: ['nova', 'echo'] },
  { id: 'refund', label: 'Refunds above €N', n: '150', agents: ['nova'] },
  { id: 'spike', label: 'More than N negative mentions in an hour', n: '20', agents: ['echo'] },
  { id: 'competitor', label: 'Anything that names a competitor', agents: ['atlas', 'echo'] },
  { id: 'budget', label: 'Spending above €N', n: '100', agents: ['iris', 'sage'] },
  { id: 'drop', label: 'A metric dropping more than N% in a week', n: '30', agents: ['iris'] },
]

/** The one place to edit escalation. Agent profiles and Settings › Approver show it and link here. */
function Escalation() {
  const { s, d } = useStore()
  const labelOf = (c: (typeof CONDITIONS)[number], v = c.n) => (c.n ? c.label.replace('N', v || c.n) : c.label)
  const [cond, setCond] = useState(() => CONDITIONS.find(c => !s.playbook.escalate.some(r => r.label === labelOf(c))) ?? CONDITIONS[0])
  const [n, setN] = useState(cond.n ?? '')
  const [to, setTo] = useState<'sam' | 'claire'>('sam')
  const [removed, setRemoved] = useState<(typeof s.playbook.escalate)[number] | null>(null)
  const label = labelOf(cond, n)
  const exists = s.playbook.escalate.some(r => r.label === label)
  return (
    <section className="card">
      <div className="card-head"><h2>Always raised to a person</h2><span className="faint">Whatever the autonomy, these topics never go out without a human.</span></div>
      <ul className="rows">
        {s.playbook.escalate.map(e => (
          <li key={e.id} className={`pb-esc ${e.on ? '' : 'off'}`}>
            <Switch checked={e.on} onChange={on => d({ type: 'playbook/escalate', id: e.id, on })} label={e.label} hideLabel />
            <div className="grow">
              <b>{e.label}</b>
              <div className="faint t-xs">Watched by {e.agents.map(agentName).join(' and ')}</div>
            </div>
            <Seg name={`esc-${e.id}`} label={`Who decides: ${e.label}`} size="sm" value={e.to} onChange={to => d({ type: 'playbook/escalate', id: e.id, to })}
              options={[{ value: 'sam', label: 'You' }, { value: 'claire', label: 'Claire' }]} />
            <Btn size="xs" variant="ghost" icon aria-label={`Delete ${e.label}`} onClick={() => { setRemoved(e); d({ type: 'playbook/escalateDelete', id: e.id }) }}><Trash2 size={12} /></Btn>
          </li>
        ))}
      </ul>
      <div className="card-body">
        {removed && (
          <UndoBar className="mb-3" onUndo={() => { d({ type: 'playbook/escalateAdd', rule: removed }); setRemoved(null) }} onDismiss={() => setRemoved(null)}>Deleted “{removed.label}”</UndoBar>
        )}
        <div className="section-title">Add a rule</div>
        <div className="row">
          <Menu align="start" trigger={<Btn size="sm">{cond.label.replace('N', '…')}<ChevronDown size={14} /></Btn>}
            items={CONDITIONS.map(c => ({ label: c.label.replace('N', '…'), hint: c.agents.map(agentName).join(', '), onSelect: () => { setCond(c); setN(c.n ?? '') } }))} />
          {cond.n && <input className="input pb-n" inputMode="numeric" value={n} onChange={e => setN(e.target.value)} aria-label="Threshold" />}
          <span className="faint">goes to</span>
          <Seg name="new-esc" label="Who decides" size="sm" value={to} onChange={setTo} options={[{ value: 'sam', label: 'You' }, { value: 'claire', label: 'Claire' }]} />
          <Btn size="sm" variant="primary" disabled={exists} title={exists ? 'This rule already exists' : undefined} onClick={() => d({ type: 'playbook/escalateAdd', rule: { id: `e-${Date.now().toString(36)}`, label, to, on: true, agents: cond.agents } })}><Plus size={14} />Add “{label}”</Btn>
        </div>
      </div>
    </section>
  )
}

/* ---------- Pillars (read-only) ---------- */
function Pillars() {
  const { s } = useStore()
  return (
    <section className="card pad">
      <div className="row between mb-3">
        <div><h2 className="section-title flush">Editorial pillars</h2><p className="faint">Target share of posts. Sage proposes changes in Strategy and you accept them there.</p></div>
        <Link to="/strategy/pillars" className="btn sm">Open in Strategy</Link>
      </div>
      <HBars items={s.strategy.pillars.map(p => ({ label: p.name, value: p.target }))} format={v => `${v}%`} />
    </section>
  )
}
