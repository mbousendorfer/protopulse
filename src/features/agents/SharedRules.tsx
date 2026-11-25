import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, Check, Pencil, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import type { Agent, AgentId, PlaybookRule } from '../../app/types'
import { useStore } from '../../app/store'
import { ago } from '../../app/time'
import { now } from '../../app/core'
import { AGENTS, agentName } from '../../data/agents'
import { checkMessage, voiceSample } from '../../data/playbook'
import { Btn, Empty, Filters, Mark, Pill, Seg, Switch } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import { appliesTo, proposalsFor, rulesFor, scopeLabel, type ScopedRule } from './rules'
import './rules.css'

const TEAM = AGENTS.map(a => a.id)

type Section = 'rules' | 'facts' | 'words' | 'voice'
const SECTIONS: Section[] = ['rules', 'facts', 'words', 'voice']

/** Agents › Shared rules: the Playbook, everything every agent knows and how it speaks. */
export default function SharedRules() {
  const { s } = useStore()
  const [params, setParams] = useSearchParams()
  const q = params.get('section') as Section
  const section: Section = SECTIONS.includes(q) ? q : 'rules'
  const rules = s.playbook.rules.filter(r => r.kind === 'do' || r.kind === 'dont')
  const facts = s.playbook.rules.filter(r => r.kind === 'fact')
  return (
    <>
      <p className="muted pb-lede">Your Playbook: what every agent knows about Fernway and how it speaks. Edit anything here and every agent picks it up at once.</p>
      <Proposals />
      <TryMessage />
      <div className="row mb-3">
        <Seg name="pb-section" label="Section" value={section} onChange={v => setParams(v === 'rules' ? {} : { section: v }, { replace: true })}
          options={[{ value: 'rules', label: 'Rules' }, { value: 'facts', label: 'Facts' }, { value: 'words', label: 'Words' }, { value: 'voice', label: 'Voice' }]} />
      </div>
      {section === 'rules' && <RuleList items={rules} kinds />}
      {section === 'facts' && <RuleList items={facts} />}
      {section === 'words' && <Words />}
      {section === 'voice' && <VoicePanel />}
    </>
  )
}

/** Agent profile › Rules: every rule and fact this agent applies, with who else follows each one. */
export function AgentRules({ agent }: { agent: Agent }) {
  const { s } = useStore()
  const mine = rulesFor(s.playbook.rules, agent.id, TEAM)
  return (
    <div className="stack lg">
      <Proposals agent={agent.id} />
      <RuleList items={mine.rules} kinds agent={agent} />
      <RuleList items={mine.facts} agent={agent} />
      <p className="row tight pb-also"><BookOpen size={14} aria-hidden /><span>Also follows the brand voice and words.</span><Link to="/agents/rules?section=voice">Open shared rules</Link></p>
    </div>
  )
}

/* ---------- Proposed by agents (Desk cards with a rule proposal) ---------- */
function Proposals({ agent }: { agent?: AgentId }) {
  const { s, d } = useStore()
  const items = agent ? proposalsFor(s.handoffs, agent) : s.handoffs.filter(h => h.proposal && !h.lane)
  if (!items.length) return null
  return (
    <section className="card pb-proposals" aria-labelledby="pb-prop">
      <div className="card-head"><h2 id="pb-prop" className="row tight"><Sparkles size={14} aria-hidden />{agent ? `Proposed for ${agentName(agent)}` : 'Proposed by your agents'} <span className="faint num">{items.length}</span></h2></div>
      <ul className="rows">
        {items.map((h, i) => (
          <li key={h.id} className="pb-prop">
            <Mark agent={h.agent} />
            <div className="grow">
              <b>“{h.proposal!.text}”</b>
              <p className="muted">{h.context} <span className="faint">· for {h.proposal!.agents.map(agentName).join(' and ')}</span></p>
            </div>
            {/* One orange button per zone: the first proposal's. */}
            <Btn size="sm" variant={i === 0 ? 'primary' : undefined} onClick={() => d({ type: 'core/resolve', id: h.id, decision: { kind: 'approve' } })}><Plus size={14} />Add</Btn>
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
/** One list for Shared rules (every rule, filter by agent) and for an agent's Rules tab (`agent` set: its rules, with their scope). */
function RuleList({ items, kinds, agent }: { items: PlaybookRule[] | ScopedRule[]; kinds?: boolean; agent?: Agent }) {
  const { s, d } = useStore()
  const [filter, setFilter] = useState<'all' | AgentId>('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [deleted, setDeleted] = useState<{ rule: PlaybookRule; index: number } | null>(null)
  const t = now(s)
  const rows: ScopedRule[] = items.map(x => ('rule' in x ? x : { rule: x, scope: { kind: 'all' } }))
  const shown = agent ? rows : rows.filter(({ rule: r }) => (filter === 'all' || r.agents.includes(filter)) && r.text.toLowerCase().includes(q.toLowerCase()))
  const del = (r: PlaybookRule) => { setDeleted({ rule: r, index: s.playbook.rules.indexOf(r) }); d({ type: 'playbook/deleteRule', id: r.id }) }
  const noun = kinds ? 'rule' : 'fact'

  const undo = deleted && (
    <UndoBar onUndo={() => { d({ type: 'playbook/restoreRule', rule: deleted.rule, index: deleted.index }); setDeleted(null) }} onDismiss={() => setDeleted(null)}>Deleted “{deleted.rule.text}”</UndoBar>
  )
  const list = (
    <ul className={agent ? 'rows pb-rules' : 'card rows pb-rules'}>
      {!shown.length && <li><Empty title={q ? 'Nothing matches this search' : agent ? `No ${noun} for ${agent.name} yet` : `No ${noun} for this agent yet`} /></li>}
      {shown.map(({ rule: r, scope }) => {
        const others = scope.kind === 'some' ? scope.others.map(agentName).join(' and ') : scope.kind === 'all' ? 'every agent' : ''
        return (
          <li key={r.id} className={`pb-rule ${r.paused ? 'paused' : ''}`}>
            {kinds && <span className={`pb-kind ${r.kind}`}>{r.kind === 'do' ? 'Do' : 'Don’t'}</span>}
            <div className="pb-rule-body">
              {editing === r.id ? (
                <>
                  <form className="row nowrap" onSubmit={e => { e.preventDefault(); if (draft.trim()) d({ type: 'playbook/editRule', id: r.id, text: draft.trim() }); setEditing(null) }}>
                    <input className="input" autoFocus value={draft} onChange={e => setDraft(e.target.value)} aria-label={kinds ? 'Rule text' : 'Fact text'} aria-describedby={agent && others ? `pb-scope-${r.id}` : undefined} />
                    <Btn size="sm" variant="primary" type="submit">Save</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
                  </form>
                  {agent && others && <p className="caption" id={`pb-scope-${r.id}`}>Shared with {others}: saving changes it for {scope.kind === 'all' ? 'them' : others} too.</p>}
                </>
              ) : <p className="pb-text">{r.text}</p>}
              <div className="pb-meta">
                <span className="row tight">
                  {r.agents.map(a => <Mark key={a} agent={a} />)}
                  <span>{agent ? scopeLabel(scope, agent.name, agentName) : appliesTo(r.agents, TEAM, agentName)}</span>
                </span>
                <span>Used {r.uses} times in 30 days</span>
                <span className="faint">{r.origin}{r.addedAt > t - 86_400_000 * 2 ? ` · ${ago(r.addedAt, t)}` : ''}</span>
                {r.paused && <Pill tone="caution">Paused</Pill>}
              </div>
            </div>
            <div className="pb-actions">
              <Switch checked={!r.paused} onChange={() => d({ type: 'playbook/toggleRule', id: r.id })} label={r.paused ? `Resume “${r.text}”` : `Pause “${r.text}”`} hideLabel />
              <Btn size="xs" variant="ghost" icon aria-label={`Edit “${r.text}”`} onClick={() => { setEditing(r.id); setDraft(r.text) }}><Pencil size={14} /></Btn>
              <Btn size="xs" variant="ghost" icon aria-label={`Delete “${r.text}”`} onClick={() => del(r)}><Trash2 size={14} /></Btn>
            </div>
          </li>
        )
      })}
    </ul>
  )

  if (agent) return (
    <section className="card">
      <div className="card-head pb-card-head">
        <div>
          <h2>{kinds ? `Rules ${agent.name} follows` : `Facts ${agent.name} cites`} <span className="faint num">{rows.length}</span></h2>
          <span className="faint">{kinds ? 'A shared rule changes for every agent that follows it.' : `Products, prices and policies ${agent.name} quotes.`}</span>
        </div>
        {!adding && <Btn size="sm" onClick={() => setAdding(true)}><Plus size={14} />{kinds ? `Add a rule for ${agent.name}` : `Add a fact for ${agent.name}`}</Btn>}
      </div>
      {adding && <div className="card-body"><AddRule kinds={!!kinds} agent={agent} onClose={() => setAdding(false)} /></div>}
      {list}
      {undo && <div className="card-body">{undo}</div>}
    </section>
  )

  return (
    <div className="stack">
      <div className="row">
        <div className="pb-search"><Search size={14} aria-hidden /><input className="input" placeholder={kinds ? 'Search rules' : 'Search facts'} value={q} onChange={e => setQ(e.target.value)} aria-label="Search" /></div>
        <Filters label="Agent" value={filter} onChange={setFilter} items={[{ value: 'all', label: 'All agents' }, ...AGENTS.map(a => ({ value: a.id as AgentId, label: <><Mark agent={a.id} />{a.name}</> }))]} />
      </div>
      {undo}
      {adding ? <AddRule kinds={!!kinds} onClose={() => setAdding(false)} /> : <Btn className="self-start" onClick={() => setAdding(true)}><Plus size={14} />{kinds ? 'Add a rule' : 'Add a fact'}</Btn>}
      {list}
    </div>
  )
}

/** With `agent`, the rule is for that agent alone; sharing it is done in Shared rules. */
function AddRule({ kinds, agent, onClose }: { kinds: boolean; agent?: Agent; onClose: () => void }) {
  const { s, d } = useStore()
  const [kind, setKind] = useState<'do' | 'dont'>('do')
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<AgentId[]>(['nova', 'atlas'])
  const agents = agent ? [agent.id] : picked
  const dup = s.playbook.rules.some(r => r.text.toLowerCase() === text.trim().toLowerCase())
  const submit = () => {
    if (!text.trim() || !agents.length || dup) return
    d({ type: 'playbook/addRule', kind: kinds ? kind : 'fact', text: text.trim(), agents, origin: 'Added by you' })
    setText(''); onClose()
  }
  return (
    <form className={agent ? 'pb-add' : 'card pad pb-add'} onSubmit={e => { e.preventDefault(); submit() }}>
      <div className="row">
        {kinds && <Seg name="new-kind" label="Kind" size="sm" value={kind} onChange={setKind} options={[{ value: 'do', label: 'Do' }, { value: 'dont', label: 'Don’t' }]} />}
        <input className="input grow" autoFocus value={text} onChange={e => setText(e.target.value)} aria-describedby={dup ? 'pb-dup' : undefined}
          placeholder={kinds ? 'Never reply to a complaint with a joke' : 'Gift cards never expire'} aria-label={kinds ? 'Rule' : 'Fact'} />
      </div>
      {dup && <p className="caption" id="pb-dup">Already in the Playbook.</p>}
      <div className="row">
        {agent ? (
          <span className="faint">For {agent.name} only. To share it with other agents, add it in <Link to={`/agents/rules${kinds ? '' : '?section=facts'}`}>Shared rules</Link>.</span>
        ) : (
          <>
            <span className="faint">Applies to</span>
            {AGENTS.map(a => (
              <button type="button" key={a.id} className="filter" aria-pressed={picked.includes(a.id)} onClick={() => setPicked(x => x.includes(a.id) ? x.filter(y => y !== a.id) : [...x, a.id])}>{a.name}</button>
            ))}
          </>
        )}
        <span className="spacer" />
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
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
