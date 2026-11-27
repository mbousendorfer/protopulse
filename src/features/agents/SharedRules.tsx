import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, MoreHorizontal, Plus, Search, X } from 'lucide-react'
import type { AgentId, Handoff, PlaybookRule } from '../../app/types'
import { useStore } from '../../app/store'
import { ago } from '../../app/time'
import { now } from '../../app/core'
import { AGENTS, agentName } from '../../data/agents'
import { checkMessage, voiceSample } from '../../data/playbook'
import { Btn, Empty, Filters, Mark, Menu, Pill, Seg, Sheet, Switch } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import { InfoPop } from '../../ui/More'
import { appliesTo } from './rules'
import './rules.css'

const TEAM = AGENTS.map(a => a.id)

type Section = 'rules' | 'facts' | 'words' | 'voice'
const SECTIONS: Section[] = ['rules', 'facts', 'words', 'voice']

/**
 * Agents › Shared rules: the Playbook, the one source of truth for what every agent knows and how it speaks.
 * An agent's profile only counts its rules and links here, filtered on it (`?agent=`).
 */
export default function SharedRules() {
  const { s } = useStore()
  const [params, setParams] = useSearchParams()
  const [trying, setTrying] = useState(false)
  const q = params.get('section') as Section
  const section: Section = SECTIONS.includes(q) ? q : 'rules'
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) if (v) next.set(k, v); else next.delete(k)
    setParams(next, { replace: true })
  }
  return (
    <>
      <div className="row mb-3">
        <Seg name="pb-section" label="Section" value={section} onChange={v => set({ section: v === 'rules' ? null : v })}
          options={[{ value: 'rules', label: 'Rules' }, { value: 'facts', label: 'Facts' }, { value: 'words', label: 'Words' }, { value: 'voice', label: 'Voice' }]} />
        <InfoPop label="What’s the Playbook?">Everything your agents know about Fernway and how it speaks. Edit anything here and every agent picks it up at once.</InfoPop>
        <span className="spacer" />
        <Btn size="sm" variant="ghost" onClick={() => setTrying(true)}><Search size={14} />Check a message</Btn>
      </div>
      {section === 'rules' && <RuleList key="rules" items={s.playbook.rules.filter(r => r.kind === 'do' || r.kind === 'dont')} kinds />}
      {section === 'facts' && <RuleList key="facts" items={s.playbook.rules.filter(r => r.kind === 'fact')} />}
      {section === 'words' && <Words />}
      {section === 'voice' && <VoicePanel />}
      <TryMessage open={trying} onOpenChange={setTrying} />
    </>
  )
}

/* ---------- Check a message ---------- */
function highlight(text: string, terms: string[]): ReactNode {
  const clean = [...new Set(terms.filter(Boolean))]
  if (!clean.length) return text
  const re = new RegExp(`(${clean.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'giu')
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i} className="pb-hit">{part}</mark> : part))
}

const SAMPLE = 'Hey guys! Our cheap new Ridge ships tomorrow 🎒🔥 Way better than Peakline. Use code SNOW25 #hike #gear #outdoors #trail'

function TryMessage({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { s } = useStore()
  const [text, setText] = useState('')
  const [network, setNetwork] = useState('instagram')
  const issues = useMemo(() => checkMessage(text, s.playbook.banned, s.playbook.preferred, network), [text, s.playbook, network])
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Check a message against the Playbook">
      <div className="stack pb-try">
        <div className="row">
          <Seg name="try-net" label="Network" size="sm" value={network} onChange={setNetwork} options={[{ value: 'instagram', label: 'Instagram' }, { value: 'linkedin', label: 'LinkedIn' }, { value: 'tiktok', label: 'TikTok' }]} />
          <Btn size="sm" variant="ghost" onClick={() => setText(SAMPLE)}>Paste an example</Btn>
        </div>
        <label htmlFor="pb-try-text" className="sr-only">Message to check</label>
        <textarea id="pb-try-text" className="textarea" rows={4} value={text} placeholder="Paste a reply or a caption to see which rules it breaks" onChange={e => setText(e.target.value)} />
        {text.trim() && (
          <div className="pb-try-out" aria-live="polite">
            <p className="well">{highlight(text, issues.flatMap(i => i.terms))}</p>
            {issues.length ? (
              <ul className="pb-issues">{issues.map(i => <li key={i.rule}><X size={14} className="bad" aria-hidden /><span>{i.rule}</span>{i.terms.length > 0 && <span className="faint">{i.terms.join(', ')}</span>}</li>)}</ul>
            ) : <p className="row tight ok"><Check size={14} />Follows every rule your agents apply.</p>}
          </div>
        )}
      </div>
    </Sheet>
  )
}

/* ---------- Rules and facts: a standard list (matrix §14) ---------- */
type State = 'all' | 'proposed' | 'paused'

/** Rules or facts, filtered by state (proposed by an agent, paused) and by agent (`?agent=`, from a profile). */
function RuleList({ items, kinds }: { items: PlaybookRule[]; kinds?: boolean }) {
  const { s, d } = useStore()
  const [params, setParams] = useSearchParams()
  const qa = params.get('agent') as AgentId
  const agent: 'all' | AgentId = TEAM.includes(qa) ? qa : 'all'
  const setAgent = (v: 'all' | AgentId) => { const next = new URLSearchParams(params); if (v === 'all') next.delete('agent'); else next.set('agent', v); setParams(next, { replace: true }) }
  const [state, setState] = useState<State>('all')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [done, setDone] = useState<{ text: string; undo: () => void } | null>(null)
  const t = now(s)
  const noun = kinds ? 'rule' : 'fact'

  const forAgent = (agents: AgentId[]) => agent === 'all' || agents.includes(agent)
  const matches = (text: string) => text.toLowerCase().includes(q.toLowerCase())
  // Proposals are rules an agent spotted in your edits: they wait for you at the top of the list.
  const proposals = kinds ? s.handoffs.filter(h => h.proposal && !h.lane && (forAgent(h.proposal.agents) || h.agent === agent) && matches(h.proposal.text)) : []
  const rules = items.filter(r => forAgent(r.agents) && matches(r.text))
  const paused = rules.filter(r => r.paused)
  const counts: Record<State, number> = { all: proposals.length + rules.length, proposed: proposals.length, paused: paused.length }
  const states = (['all', 'proposed', 'paused'] as State[]).filter(k => k === 'all' || counts[k] > 0 || k === state)
  const shownProposals = state === 'paused' ? [] : proposals
  const shownRules = state === 'proposed' ? [] : state === 'paused' ? paused : rules

  const decide = (h: Handoff, add: boolean) => {
    d({ type: 'core/resolve', id: h.id, decision: add ? { kind: 'approve' } : { kind: 'reject', reason: 'Not a rule' } })
    setDone({ text: add ? `Added to the Playbook: “${h.proposal!.text}”` : `Dismissed “${h.proposal!.text}”`, undo: () => d({ type: 'core/restore', handoff: h }) })
  }
  const del = (r: PlaybookRule) => {
    const index = s.playbook.rules.indexOf(r)
    d({ type: 'playbook/deleteRule', id: r.id })
    setDone({ text: `Deleted “${r.text}”`, undo: () => d({ type: 'playbook/restoreRule', rule: r, index }) })
  }
  const agentLabel = agent === 'all' ? 'All agents' : agentName(agent)

  return (
    <div className="stack">
      <div className="pb-bar">
        <Filters label="Show" value={state} onChange={setState}
          items={states.map(k => ({ value: k, label: k === 'all' ? `All ${noun}s` : k === 'proposed' ? 'Proposed' : 'Paused', count: counts[k] }))} />
        <div className="row tight">
          <div className="pb-search"><Search size={14} aria-hidden /><input className="input" placeholder={`Search ${noun}s`} value={q} onChange={e => setQ(e.target.value)} aria-label={`Search ${noun}s`} /></div>
          <Menu align="end" trigger={<Btn size="sm" variant="ghost">{agent !== 'all' && <Mark agent={agent} />}{agentLabel}<ChevronDown size={12} /></Btn>}
            items={[{ label: 'All agents', onSelect: () => setAgent('all') }, ...AGENTS.map(a => ({ label: a.name, icon: <Mark agent={a.id} />, hint: a.dept, onSelect: () => setAgent(a.id) }))]} />
          {!adding && <Btn size="sm" onClick={() => setAdding(true)}><Plus size={14} />{kinds ? 'Add a rule' : 'Add a fact'}</Btn>}
        </div>
      </div>
      {done && <UndoBar onUndo={() => { done.undo(); setDone(null) }} onDismiss={() => setDone(null)}>{done.text}</UndoBar>}
      <section className="card" aria-label={kinds ? 'Rules' : 'Facts'}>
        {(adding || (state === 'proposed' && proposals.length > 1)) && (
          <div className="pb-list-head">
            {adding ? <AddRule kinds={!!kinds} agent={agent === 'all' ? undefined : agent} onClose={() => setAdding(false)} /> : <>
              <span className="spacer" />
              <Btn size="sm" variant="primary" onClick={() => { proposals.forEach(h => d({ type: 'core/resolve', id: h.id, decision: { kind: 'approve' } })); setDone({ text: `${proposals.length} rules added to the Playbook.`, undo: () => proposals.forEach(h => d({ type: 'core/restore', handoff: h })) }) }}>Add all {proposals.length} to Playbook</Btn>
            </>}
          </div>
        )}
        <ul className="rows pb-rules">
          {!shownProposals.length && !shownRules.length && <li><Empty title={q ? 'Nothing matches this search' : `No ${noun} for ${agentLabel === 'All agents' ? 'any agent' : agentLabel} yet`} /></li>}
          {shownProposals.map(h => (
            <li key={h.id} className="pb-rule">
              <span className="pb-kind dont">Don’t</span>
              <div className="pb-rule-body">
                <p className="pb-text">{h.proposal!.text}</p>
                <div className="pb-meta">
                  <span>{appliesTo(h.proposal!.agents, TEAM, agentName)}</span>
                  {state !== 'proposed' && <Pill>Proposed by {agentName(h.agent)}</Pill>}
                  <InfoPop label="Why?">{h.context}</InfoPop>
                </div>
              </div>
              <div className="pb-actions">
                <Btn size="sm" variant="ghost" onClick={() => decide(h, false)}>Dismiss</Btn>
                <Btn size="sm" onClick={() => decide(h, true)}>Add to Playbook</Btn>
              </div>
            </li>
          ))}
          {shownRules.map(r => <RuleRow key={r.id} r={r} kinds={kinds} t={t} showPaused={state !== 'paused'} onDelete={() => del(r)} />)}
        </ul>
      </section>
    </div>
  )
}

function RuleRow({ r, kinds, t, showPaused, onDelete }: { r: PlaybookRule; kinds?: boolean; t: number; showPaused: boolean; onDelete: () => void }) {
  const { d } = useStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(r.text)
  const who = appliesTo(r.agents, TEAM, agentName)
  return (
    <li className={`pb-rule ${r.paused ? 'paused' : ''}`}>
      {kinds && <span className={`pb-kind ${r.kind}`}>{r.kind === 'do' ? 'Do' : 'Don’t'}</span>}
      <div className="pb-rule-body">
        {editing ? (
          <>
            <form className="row nowrap" onSubmit={e => { e.preventDefault(); if (draft.trim()) d({ type: 'playbook/editRule', id: r.id, text: draft.trim() }); setEditing(false) }}>
              <input id={`pb-edit-${r.id}`} className="input" autoFocus value={draft} onChange={e => setDraft(e.target.value)} aria-label={kinds ? 'Rule text' : 'Fact text'} aria-describedby={r.agents.length > 1 ? `pb-scope-${r.id}` : undefined} />
              <Btn size="sm" variant="primary" type="submit">Save</Btn>
              <Btn size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
            </form>
            {r.agents.length > 1 && <p className="caption" id={`pb-scope-${r.id}`}>Saving changes it for {who === 'All agents' ? 'every agent' : who}.</p>}
          </>
        ) : <p className="pb-text">{r.text}</p>}
        <div className="pb-meta">
          <span>{who}</span>
          {/* The count stays named; how it was counted and where the rule comes from are one click away. A new rule says it. */}
          <InfoPop label={`${r.uses} use${r.uses === 1 ? '' : 's'}`}>Used {r.uses} time{r.uses === 1 ? '' : 's'} in the last 30 days. {r.origin === 'Onboarding' ? 'Set up during onboarding' : r.origin}.</InfoPop>
          {r.addedAt > t - 86_400_000 * 2 && <span>{r.origin} · {ago(r.addedAt, t)}</span>}
          {r.paused && showPaused && <Pill tone="caution">Paused</Pill>}
        </div>
      </div>
      <div className="pb-actions">
        <Switch checked={!r.paused} onChange={() => d({ type: 'playbook/toggleRule', id: r.id })} label={r.paused ? `Resume “${r.text}”` : `Pause “${r.text}”`} hideLabel />
        <Menu align="end" trigger={<Btn size="sm" variant="ghost" icon aria-label={`More for “${r.text}”`}><MoreHorizontal size={16} /></Btn>} items={[
          // The menu hands the focus back to its trigger as it closes: the field takes it right after.
          { label: 'Edit', onSelect: () => { setDraft(r.text); setEditing(true); setTimeout(() => document.getElementById(`pb-edit-${r.id}`)?.focus(), 50) } },
          { label: 'Delete', onSelect: onDelete },
        ]} />
      </div>
    </li>
  )
}

/** New rules apply to the agents picked; from a list filtered on one agent, that agent is picked first. */
function AddRule({ kinds, agent, onClose }: { kinds: boolean; agent?: AgentId; onClose: () => void }) {
  const { s, d } = useStore()
  const [kind, setKind] = useState<'do' | 'dont'>('do')
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<AgentId[]>(agent ? [agent] : ['nova', 'atlas'])
  const dup = s.playbook.rules.some(r => r.text.toLowerCase() === text.trim().toLowerCase())
  const submit = () => {
    if (!text.trim() || !picked.length || dup) return
    d({ type: 'playbook/addRule', kind: kinds ? kind : 'fact', text: text.trim(), agents: picked, origin: 'Added by you' })
    setText(''); onClose()
  }
  return (
    <form className="pb-add grow" onSubmit={e => { e.preventDefault(); submit() }}>
      <div className="row">
        {kinds && <Seg name="new-kind" label="Kind" size="sm" value={kind} onChange={setKind} options={[{ value: 'do', label: 'Do' }, { value: 'dont', label: 'Don’t' }]} />}
        <input className="input grow" autoFocus value={text} onChange={e => setText(e.target.value)} aria-describedby={dup ? 'pb-dup' : undefined}
          placeholder={kinds ? 'Never reply to a complaint with a joke' : 'Gift cards never expire'} aria-label={kinds ? 'Rule' : 'Fact'} />
      </div>
      {dup && <p className="caption" id="pb-dup">Already in the Playbook.</p>}
      <div className="row">
        <span className="faint">Applies to</span>
        {AGENTS.map(a => (
          <button type="button" key={a.id} className="filter" aria-pressed={picked.includes(a.id)} onClick={() => setPicked(x => x.includes(a.id) ? x.filter(y => y !== a.id) : [...x, a.id])}>{a.name}</button>
        ))}
        <span className="spacer" />
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" type="submit" disabled={!text.trim() || !picked.length || dup}>Add</Btn>
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
