import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, ChevronRight, Clock, Focus as FocusIcon, ListFilter, Undo2 } from 'lucide-react'
import type { AgentId, Decision, DoneItem, Handoff, Kind, Urgency } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { hhmm } from '../../app/time'
import { groupOf } from '../../app/reducer'
import { AGENTS, agentName } from '../../data/agents'
import { Btn, Kbd, Menu, TopicIcon } from '../../ui'
import Detail from './Detail'
import BatchDetail, { batchesOf, type Batch } from './Batch'
import Thread from './Thread'
import { KIND_LABEL, SNOOZE, byPriority, useHandoffActions } from './parts'
import { BulkBar, SelectBox, useSelection } from '../../ui/Selection'
import { CountBadge } from '../../ui/Feedback'
import { Brief, LiveFeed, ShiftBoard, Team } from './widgets'
import './desk.css'
import './today.css'
import { AllClearScene } from '../../ui/Illustrations'

type Entry = { key: string; group: 'need' | 'look' | 'good' | 'claire' | 'later'; h?: Handoff; b?: Batch }
const GROUPS: { id: Entry['group']; label: string }[] = [
  { id: 'need', label: 'Needs you' }, { id: 'look', label: 'Worth a look' }, { id: 'good', label: 'Good news' },
  { id: 'claire', label: 'Waiting on Claire' }, { id: 'later', label: 'Later' },
]

export default function Desk() {
  const { s, d } = useStore()
  const nav = useNavigate()
  const [agent, setAgent] = useState<'all' | AgentId>('all')
  const [kind, setKind] = useState<'all' | Kind>('all')
  const [urgency, setUrgency] = useState<'all' | Urgency>('all')
  const [selected, setSelected] = useState<string | null>(null)
  // Links from other pages ("Review on Desk") open that card directly.
  const [params, setParams] = useSearchParams()
  const cardParam = params.get('card')
  useEffect(() => {
    if (!cardParam) return
    const h = s.handoffs.find(x => x.id === cardParam)
    if (h && !h.lane) { setTab(groupOf(h)); setSelected(`h:${h.id}`) }
    setParams({}, { replace: true })
  }, [cardParam]) // eslint-disable-line react-hooks/exhaustive-deps
  const [thread, setThread] = useState<string | null>(null)
  const [shift, setShift] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [tab, setTab] = useState<'need' | 'look' | 'good'>('need')

  const entries = useMemo(() => {
    const mine = s.handoffs.filter(h => (agent === 'all' || h.agent === agent) && (kind === 'all' || h.kind === kind) && (urgency === 'all' || h.urgency === urgency))
    const open = mine.filter(h => !h.lane).sort(byPriority)
    const needOpen = open.filter(h => groupOf(h) === 'need')
    const { batches, rest } = batchesOf(needOpen)
    const out: Entry[] = []
    // Needs you: batches and single cards, ordered by urgency.
    const rank = { urgent: 0, today: 1, week: 2 }
    const need: Entry[] = [...batches.map((b): Entry => ({ key: `b:${b.id}`, group: 'need', b })), ...rest.map((h): Entry => ({ key: `h:${h.id}`, group: 'need', h }))]
      .sort((x, y) => rank[(x.b?.urgency ?? x.h!.urgency)] - rank[(y.b?.urgency ?? y.h!.urgency)])
    out.push(...need)
    out.push(...open.filter(h => groupOf(h) === 'look').map(h => ({ key: `h:${h.id}`, group: 'look' as const, h })))
    out.push(...open.filter(h => groupOf(h) === 'good').map(h => ({ key: `h:${h.id}`, group: 'good' as const, h })))
    out.push(...mine.filter(h => h.lane === 'claire').map(h => ({ key: `h:${h.id}`, group: 'claire' as const, h })))
    out.push(...mine.filter(h => h.lane === 'snoozed').map(h => ({ key: `h:${h.id}`, group: 'later' as const, h })))
    return out
  }, [s.handoffs, agent, kind, urgency])

  const filtering = agent !== 'all' || kind !== 'all' || urgency !== 'all'
  const clearFilters = () => { setAgent('all'); setKind('all'); setUrgency('all') }
  const actionable = entries.filter(e => e.group === 'need' || e.group === 'look' || e.group === 'good' || e.group === 'claire')
  const needCount = entries.filter(e => e.group === 'need').reduce((n, e) => n + (e.b ? e.b.items.length : 1), 0)
  const done = s.desk.done

  // Keep a valid selection: if the selected item left the list, take the one now at the same position.
  const [lastIndex, setLastIndex] = useState(0)
  const current = entries.find(e => e.key === selected)
  const doneSel = selected?.startsWith('d:') ? done.find(x => `d:${x.id}` === selected) : undefined
  useEffect(() => {
    if (current || doneSel) { setLastIndex(Math.max(0, actionable.findIndex(e => e.key === selected))); return }
    // Nothing needs you: show All clear until the user picks something to look at.
    if (!needCount) { if (selected) setSelected(null); return }
    const pool = actionable.filter(e => e.group !== 'claire')
    setSelected(pool[Math.min(lastIndex, pool.length - 1)]?.key ?? null)
  }, [current, doneSel, actionable, lastIndex, selected, needCount])

  // ↑/↓ stay inside the tab on screen, so the highlighted row is always visible.
  const move = useCallback((dir: 1 | -1) => {
    const list = entries.filter(e => (tab === 'need' ? ['need', 'claire', 'later'] : [tab]).includes(e.group))
    const i = list.findIndex(e => e.key === selected)
    const n = list[Math.max(0, Math.min(list.length - 1, i + dir))]
    if (n) setSelected(n.key)
  }, [entries, selected, tab])

  // ↑/↓, J/K to move; F for full-screen Focus. Decisions are handled by the detail pane.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof Element ? e.target : null
      if (t?.closest('input, textarea, [role="dialog"], [role="menu"]') || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'arrowdown' || k === 'j') { e.preventDefault(); move(1) }
      if (k === 'arrowup' || k === 'k') { e.preventDefault(); move(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move, nav])

  // From the brief: jump to an agent's first item (its batch if any) or to a given card.
  const pick = useCallback((key: string) => {
    const k = key.startsWith('agent:') ? entries.find(e => e.group === 'need' && (e.b?.agent === key.slice(6) || e.h?.agent === key.slice(6)))?.key ?? entries.find(e => e.h?.agent === key.slice(6))?.key : key
    if (k) {
      const g = entries.find(e => e.key === k)?.group
      if (g === 'need' || g === 'look' || g === 'good') setTab(g)
      setSelected(k); document.querySelector('.today-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [entries])

  // Multi-select over the open items (a batch row selects all its cards).
  const pickable = useMemo(() => entries.filter(e => e.group === 'need' || e.group === 'look' || e.group === 'good').map(e => e.key), [entries])
  const sel = useSelection(pickable, `${agent}|${kind}|${urgency}`)
  const picked = entries.filter(e => sel.has(e.key)).flatMap(e => (e.b ? e.b.items : [e.h!]))
  const approvable = picked.filter(h => (h.kind === 'approval' || h.kind === 'promotion' || h.kind === 'news') && !h.field && !h.options)
  const runBulk = (ids: string[], extra: { decision?: Decision; snooze?: { until: number; label: string }; claire?: boolean }, summary: string) => {
    if (!ids.length) return
    d({ type: 'core/bulk', ids, ...extra, summary, agent: picked[0]?.agent ?? 'iris' })
    sel.clear()
  }
  const tomorrow = SNOOZE(useHandoffActions().now()).find(x => x.label.startsWith('tomorrow'))

  const position = current ? `${Math.max(1, actionable.indexOf(current) + 1)} of ${actionable.length}` : undefined

  return (
    <div className="page today">
      <Brief onPick={pick} />
      <div className="shift-wrap">
        <button className="lane-toggle" aria-expanded={shift} onClick={() => setShift(o => !o)}>
          {shift ? <ChevronDown size={14} /> : <ChevronRight size={14} />}Shift board <span className="faint">· what your agents did in the last 24 h</span>
        </button>
        {shift && <ShiftBoard />}
      </div>

      <div className="today-grid">
        <nav className="day-list card" aria-label="Your day">
          <div className="day-head">
            <h2>Your day</h2>
            <span className="faint num">{done.length} done</span>
            <span className="spacer" />
            <Btn size="xs" variant="ghost" onClick={() => nav('/focus')} disabled={!needCount} title="Process what needs you one at a time, full screen (F)"><FocusIcon size={13} />Focus</Btn>
            <Menu align="end" trigger={<Btn size="xs" variant="ghost" aria-label="Filter the list"><ListFilter size={13} />{[agent !== 'all' && agentName(agent), kind !== 'all' && KIND_LABEL[kind], urgency !== 'all' && (urgency === 'week' ? 'This week' : urgency === 'today' ? 'Today' : 'Urgent')].filter(Boolean).join(' · ') || 'Filter'}</Btn>}
              items={[
                { heading: 'Agent' }, { label: 'All agents', onSelect: () => setAgent('all') }, ...AGENTS.map(a => ({ label: a.name, hint: a.dept, onSelect: () => setAgent(a.id) })), 'sep',
                { heading: 'Type' }, { label: 'All types', onSelect: () => setKind('all') }, ...(Object.keys(KIND_LABEL) as Kind[]).map(k => ({ label: KIND_LABEL[k], onSelect: () => setKind(k) })), 'sep',
                { heading: 'Urgency' }, { label: 'Any urgency', onSelect: () => setUrgency('all') }, { label: 'Urgent', onSelect: () => setUrgency('urgent') }, { label: 'Today', onSelect: () => setUrgency('today') }, { label: 'This week', onSelect: () => setUrgency('week') },
              ]} />
          </div>
          <div className="day-tabs" role="tablist" aria-label="Your day">
            {([['need', 'Needs you'], ['look', 'Worth a look'], ['good', 'Good news']] as const).map(([id, label]) => {
              const n = entries.filter(e => e.group === id).reduce((k, e) => k + (e.b ? e.b.items.length : 1), 0)
              return (
                <button key={id} role="tab" aria-selected={tab === id} className={`day-tab ${tab === id ? 'on' : ''} ${id}`} onClick={() => { setTab(id); const first = entries.find(e => e.group === id); if (first) setSelected(first.key) }}>
                  {label}<CountBadge n={n} needs={id === 'need' && n > 0} />
                </button>
              )
            })}
          </div>

          <BulkBar count={picked.length} noun={picked.length === 1 ? 'item' : 'items'} onClear={sel.clear} actions={[
            { label: approvable.length < picked.length ? `Approve ${approvable.length} of ${picked.length}` : `Approve ${picked.length}`, primary: true, disabled: !approvable.length,
              note: approvable.length < picked.length ? 'decisions and missing info need you one by one' : undefined,
              onRun: () => runBulk(approvable.map(h => h.id), { decision: { kind: 'approve' } }, `Approved ${approvable.length} items from your Desk`) },
            { label: 'Snooze to tomorrow', onRun: () => tomorrow && runBulk(picked.map(h => h.id), { snooze: { until: tomorrow.until, label: tomorrow.label } }, `Snoozed ${picked.length} items until tomorrow 08:00`) },
            { label: 'Ask Claire', onRun: () => runBulk(picked.map(h => h.id), { claire: true }, `Sent ${picked.length} items to Claire`) },
            { label: 'Reject', onRun: () => { const ids = picked.filter(h => !h.options).map(h => h.id); runBulk(ids, { decision: { kind: 'reject', reason: 'Not now' } }, `Rejected ${ids.length} items`) } },
          ]} />
          {GROUPS.filter(g => (tab === 'need' ? ['need', 'claire', 'later'] : [tab]).includes(g.id)).map(g => {
            const rows = entries.filter(e => e.group === g.id)
            if (!rows.length) return null
            const count = rows.reduce((n, e) => n + (e.b ? e.b.items.length : 1), 0)
            return (
              <section key={g.id} className="day-group">
                {g.id !== tab && <h3>{g.label}<span className="faint num">{count}</span></h3>}
                <ul>
                  {rows.map(e => <Row key={e.key} e={e} active={e.key === selected} onClick={() => setSelected(e.key)}
                    select={pickable.includes(e.key) ? { checked: sel.has(e.key), any: sel.count > 0, toggle: (shift: boolean) => sel.toggle(e.key, shift) } : undefined} />)}
                </ul>
              </section>
            )
          })}

          {filtering && !entries.some(e => e.group === tab) && (
            <div className="day-empty faint">No item matches this filter. <button className="link-btn" onClick={clearFilters}>Clear filters</button></div>
          )}
          {!filtering && tab !== 'need' && !entries.some(e => e.group === tab) && (
            <p className="day-empty faint">{tab === 'look' ? 'Nothing to look at right now. Signals from Iris and Echo land here.' : 'No good news yet today. Your agents post wins here as they happen.'}</p>
          )}
          {tab === 'need' && done.length > 0 && (
            <section className="day-group">
              <button className="lane-toggle" aria-expanded={showDone} onClick={() => setShowDone(o => !o)}>
                {showDone ? <ChevronDown size={14} /> : <ChevronRight size={14} />}Done <span className="faint num">{done.length}</span>
              </button>
              {showDone && (
                <ul>
                  {done.map(x => (
                    <li key={x.id}>
                      <button className={`day-row done ${selected === `d:${x.id}` ? 'active' : ''}`} onClick={() => setSelected(`d:${x.id}`)}>
                        <span className="check" aria-hidden><Check size={12} /></span>
                        <span className="txt"><span className="ellipsis">{x.title}</span><span className="faint ellipsis">{x.text}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          <div className="day-foot faint"><Kbd>↑</Kbd><Kbd>↓</Kbd> move{current?.h && !current.h.field && current.h.lane !== 'claire' && <> · <Kbd>A</Kbd> {current.h.options ? 'recommended option' : 'approve'}</>}{needCount > 0 && <> · <Kbd>F</Kbd> full screen</>}</div>
        </nav>

        <section className="day-pane card" aria-live="polite">
          {doneSel ? <DoneView x={doneSel} onNext={() => setSelected(null)} />
            : current?.b ? <>
                <BatchDetail b={current.b} onBulk={() => setSelected(null)} onDiscuss={setThread} />
                <NextLink e={actionable.slice(actionable.indexOf(current) + 1).find(e => e.group === current.group)} onPick={setSelected} />
              </>
            : current?.h ? <>
                <Detail key={current.h.id} h={current.h} position={position} onDiscuss={setThread} onSettled={() => setSelected(null)} />
                <NextLink e={actionable.slice(actionable.indexOf(current) + 1).find(e => e.group === current.group)} onPick={setSelected} />
              </>
            : filtering && !needCount ? <div className="day-empty faint">Nothing in Needs you matches this filter. <button className="link-btn" onClick={clearFilters}>Clear filters</button></div>
            : <AllClear />}
        </section>

      </div>

      {/* What the agents are doing right now: useful, but below the work that needs you. */}
      <div className="desk-bottom">
        <LiveFeed />
        <Team />
      </div>

      <Thread id={thread} onClose={() => setThread(null)} />
    </div>
  )
}

type RowSelect = { checked: boolean; any: boolean; toggle: (shift: boolean) => void }
function Row({ e, active, onClick, select }: { e: Entry; active: boolean; onClick: () => void; select?: RowSelect }) {
  const box = select && <SelectBox checked={select.checked} visible={select.any} onToggle={select.toggle} label={`Select ${e.b?.title ?? e.h?.title}`} />
  if (e.b) return (
    <li className={`day-li ${select?.checked ? 'picked' : ''}`}>
      {box}
      <button className={`day-row ${active ? 'active' : ''}`} onClick={onClick}>
        <TopicIcon agent={e.b.agent} topic={e.b.id === 'rules' ? 'rule' : e.b.id === 'nova' ? 'reply' : 'post'} />
        <span className="txt"><span className="ellipsis">{e.b.title}</span><span className="faint ellipsis">{e.b.meta}</span></span>
        {e.b.urgency === 'urgent' && <span className="dot urgent" aria-label="Contains urgent items" />}
        <CountBadge n={e.b.items.length} label={`${e.b.items.length} items`} />
      </button>
    </li>
  )
  const h = e.h!
  return (
    <li className={`day-li ${select?.checked ? 'picked' : ''}`}>
      {box}
      <button className={`day-row ${active ? 'active' : ''} ${h.fresh ? 'fresh' : ''}`} onClick={onClick}>
        <TopicIcon agent={h.agent} kind={h.kind} topic={h.topic} />
        <span className="txt">
          <span className="ellipsis">{h.title}</span>
          <span className="faint ellipsis">{e.group === 'later' && h.snoozedUntil ? `Back at ${hhmm(h.snoozedUntil)}` : e.group === 'claire' ? (h.claire?.reply ? 'Claire answered' : 'Claire is looking') : `${agentName(h.agent)} · ${h.topic}`}</span>
        </span>
        {h.urgency === 'urgent' && e.group === 'need' && <span className="dot urgent" aria-label="Urgent" />}
        {e.group === 'later' && <Clock size={12} className="faint" aria-hidden />}
      </button>
    </li>
  )
}

/** One quiet line to move on, instead of a second list. */
function NextLink({ e, onPick }: { e?: Entry; onPick: (key: string) => void }) {
  if (!e) return null
  return (
    <button className="next-link" onClick={() => onPick(e.key)}>
      <span className="faint">Next</span><span className="ellipsis">{e.b?.title ?? e.h!.title}</span><ArrowRight size={14} aria-hidden />
    </button>
  )
}

function DoneView({ x, onNext }: { x: DoneItem; onNext: () => void }) {
  const act = useHandoffActions()
  return (
    <div className="done-view">
      <div className="done-box">
        <Check size={16} />
        <div><b>{x.text}</b><p className="faint">Settled at {hhmm(x.at)}.</p></div>
        <span className="spacer" />
        <Btn size="sm" onClick={() => act.restore(x.h)}><Undo2 size={13} />Undo</Btn>
        <Btn size="sm" variant="ghost" onClick={onNext}>Next item</Btn>
      </div>
      <div className="dimmed" aria-hidden><Detail h={x.h} keys={false} /></div>
    </div>
  )
}

/** Shown when nothing needs you. Also used at the end of Focus. */
export function AllClear({ action }: { action?: ReactNode }) {
  const { s } = useStore()
  const now = useNow()
  const ids = new Set(s.desk.done.map(x => x.id))
  const decisions = s.tester.filter(t => (t.kind === 'desk/decision' || t.kind === 'focus/decision') && ids.has(String((t.detail as { id?: string })?.id)))
  const ms = decisions.reduce((a, t) => a + Number((t.detail as { ms?: number })?.ms ?? 0), 0)
  const alone = s.log.filter(l => l.at > s.brief.since && l.at <= now && (l.status === 'done' || l.status === 'redone')).length
  const mins = Math.max(0, Math.round(ms / 60000)), secs = Math.round((ms % 60000) / 1000)
  const left = s.handoffs.filter(h => !h.lane && groupOf(h) !== 'need').length
  return (
    <div className="all-clear">
      <div className="all-clear-scene"><AllClearScene /></div>
      <h2>All clear</h2>
      <p className="muted">Nothing needs you right now. Your agents will tap you when something does.</p>
      <dl className="clear-stats">
        <div><dt>Handled by you</dt><dd className="num">{s.desk.done.length}</dd></div>
        <div><dt>Your time</dt><dd className="num">{mins ? `${mins} min ` : ''}{secs} s</dd></div>
        <div><dt>Handled by your agents</dt><dd className="num">{alone}</dd></div>
      </dl>
      {left > 0 && <p className="faint">{left} item{left > 1 ? 's' : ''} still worth a look in the list, whenever you have a minute.</p>}
      {action}
    </div>
  )
}
