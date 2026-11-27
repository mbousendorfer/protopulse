import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, Focus as FocusIcon } from 'lucide-react'
import type { AgentId, Decision, DoneItem, Handoff } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { hhmm } from '../../app/time'
import { groupOf } from '../../app/reducer'
import { AGENTS, agentName } from '../../data/agents'
import { Btn, Filters, Menu, TopicIcon } from '../../ui'
import Detail from './Detail'
import BatchDetail, { batchesOf, type Batch } from './Batch'
import Thread from './Thread'
import { SNOOZE, byPriority, useHandoffActions } from './parts'
import { BulkBar, SelectBox, useSelection } from '../../ui/Selection'
import { CountBadge, Notice, UndoBar } from '../../ui/Feedback'
import { Brief } from './widgets'
import './desk.css'
import './today.css'
import { AllClearScene } from '../../ui/Illustrations'
import { Checklist, Welcome } from './Day1'
import { firstBriefAt } from '../onboarding/day1'

/** The list's states (matrix §14): one Filters row with counts, the empty ones hidden. */
type Show = 'need' | 'look' | 'good' | 'claire' | 'later' | 'done'
const SHOW_LABEL: Record<Show, string> = { need: 'Needs you', look: 'Worth a look', good: 'Good news', claire: 'Waiting on Claire', later: 'Later', done: 'Done' }
type Entry = { key: string; group: Exclude<Show, 'done'>; h?: Handoff; b?: Batch }
const size = (e: Entry) => (e.b ? e.b.items.length : 1)
const groupOfCard = (h: Handoff): Entry['group'] => h.lane === 'claire' ? 'claire' : h.lane === 'snoozed' ? 'later' : groupOf(h)

export default function Desk() {
  const { s, d } = useStore()
  const nav = useNavigate()
  const [agent, setAgent] = useState<'all' | AgentId>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [thread, setThread] = useState<string | null>(null)
  const [pick, setShow] = useState<Show>('need')

  const entries = useMemo(() => {
    const mine = s.handoffs.filter(h => agent === 'all' || h.agent === agent)
    const open = mine.filter(h => !h.lane).sort(byPriority)
    const { batches, rest } = batchesOf(open.filter(h => groupOf(h) === 'need'))
    // Needs you: batches and single cards, ordered by urgency.
    const rank = { urgent: 0, today: 1, week: 2 }
    const need: Entry[] = [...batches.map((b): Entry => ({ key: `b:${b.id}`, group: 'need', b })), ...rest.map((h): Entry => ({ key: `h:${h.id}`, group: 'need', h }))]
      .sort((x, y) => rank[(x.b?.urgency ?? x.h!.urgency)] - rank[(y.b?.urgency ?? y.h!.urgency)])
    const one = (h: Handoff): Entry => ({ key: `h:${h.id}`, group: groupOfCard(h), h })
    return [...need, ...open.filter(h => groupOf(h) !== 'need').map(one), ...mine.filter(h => h.lane === 'claire' || h.lane === 'snoozed').map(one)]
  }, [s.handoffs, agent])
  const done = s.desk.done

  const counts = Object.fromEntries((Object.keys(SHOW_LABEL) as Show[]).map(k => [k, k === 'done' ? done.length : entries.filter(e => e.group === k).reduce((n, e) => n + size(e), 0)])) as Record<Show, number>
  const shown = (Object.keys(SHOW_LABEL) as Show[]).filter(k => k === 'need' || counts[k] > 0)
  const show = shown.includes(pick) ? pick : 'need'
  const rows = show === 'done' ? [] : entries.filter(e => e.group === show)
  const keys = show === 'done' ? done.map(x => `d:${x.id}`) : rows.map(e => e.key)

  // Links from other pages ("Review on Desk") open that card directly, in its state; a card in a batch opens its batch.
  const [params, setParams] = useSearchParams()
  const cardParam = params.get('card')
  useEffect(() => {
    if (!cardParam) return
    const h = s.handoffs.find(x => x.id === cardParam)
    if (h) { setAgent('all'); setShow(groupOfCard(h)); setSelected(entries.find(e => e.b?.items.some(x => x.id === h.id))?.key ?? `h:${h.id}`) }
    setParams({}, { replace: true })
  }, [cardParam]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a valid selection: if the selected item left the list, take the one now at the same position.
  // Nothing needs you: All clear shows until the user picks another state.
  const [lastIndex, setLastIndex] = useState(0)
  const current = entries.find(e => e.key === selected && e.group === show)
  const doneSel = show === 'done' ? done.find(x => `d:${x.id}` === selected) : undefined
  useEffect(() => {
    if (selected && keys.includes(selected)) { setLastIndex(keys.indexOf(selected)); return }
    const next = keys[Math.min(lastIndex, keys.length - 1)] ?? null
    if (next !== selected) setSelected(next)
  }, [keys.join(), selected, lastIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // ↑/↓, J/K move inside the state on screen. Decisions are handled by the detail pane; F opens Focus (app shortcut).
  const move = useCallback((dir: 1 | -1) => {
    const i = keys.indexOf(selected ?? '')
    const n = keys[Math.max(0, Math.min(keys.length - 1, i + dir))]
    if (n) setSelected(n)
  }, [keys, selected])
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
  }, [move])

  // Multi-select over the open items (a batch row selects all its cards).
  const pickable = useMemo(() => (['need', 'look', 'good'].includes(show) ? rows.map(e => e.key) : []), [rows.map(e => e.key).join(), show]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = useSelection(pickable, `${agent}|${show}`)
  const picked = rows.filter(e => sel.has(e.key)).flatMap(e => (e.b ? e.b.items : [e.h!]))
  const approvable = picked.filter(h => (h.kind === 'approval' || h.kind === 'promotion' || h.kind === 'news') && !h.field && !h.options)
  const runBulk = (ids: string[], extra: { decision?: Decision; snooze?: { until: number; label: string }; claire?: boolean }, summary: string) => {
    if (!ids.length) return
    d({ type: 'core/bulk', ids, ...extra, summary, agent: picked[0]?.agent ?? 'iris' })
    sel.clear()
  }
  const tomorrow = SNOOZE(useHandoffActions().now()).find(x => x.label.startsWith('tomorrow'))

  const nowT = useNow(60000)
  const idx = keys.indexOf(selected ?? '')
  const position = idx >= 0 ? `${idx + 1} of ${keys.length}` : undefined
  const next = rows[idx + 1]

  return (
    <div className="page today">
      {s.phase === 'day1' && nowT < firstBriefAt(s.setup.startedAt ?? nowT)
        ? <div className="day1-top"><Welcome /><Checklist side /></div>
        : <><Brief />{s.phase === 'day1' && <Checklist />}</>}

      <div className="day-bar">
        <Filters label="Your day" value={show} onChange={v => { setShow(v); setLastIndex(0); setSelected(null) }}
          items={shown.map(k => ({ value: k, label: SHOW_LABEL[k], count: counts[k] }))} />
        <span className="spacer" />
        <Menu align="end" trigger={<Btn size="sm" variant="ghost">{agent === 'all' ? 'All agents' : agentName(agent)}<ChevronDown size={12} /></Btn>}
          items={[{ label: 'All agents', onSelect: () => setAgent('all') }, ...AGENTS.map(a => ({ label: a.name, hint: a.dept, onSelect: () => setAgent(a.id) }))]} />
        <Btn size="sm" variant="ghost" onClick={() => nav('/focus')} disabled={!counts.need} kbd="F"><FocusIcon size={13} />Focus</Btn>
      </div>
      <Notice scope="desk" />

      <div className="today-grid">
        <nav className="day-list card" aria-label={SHOW_LABEL[show]}>
          <BulkBar count={picked.length} noun={picked.length === 1 ? 'item' : 'items'} onClear={sel.clear} actions={[
            { label: approvable.length < picked.length ? `Approve ${approvable.length} of ${picked.length}` : `Approve ${picked.length}`, primary: true, disabled: !approvable.length,
              note: approvable.length < picked.length ? 'decisions and missing info need you one by one' : undefined,
              onRun: () => runBulk(approvable.map(h => h.id), { decision: { kind: 'approve' } }, `Approved ${approvable.length} items from your Desk`) },
            { label: 'Snooze to tomorrow', onRun: () => tomorrow && runBulk(picked.map(h => h.id), { snooze: { until: tomorrow.until, label: tomorrow.label } }, `Snoozed ${picked.length} items until tomorrow 08:00`) },
            { label: 'Ask Claire', onRun: () => runBulk(picked.map(h => h.id), { claire: true }, `Asked Claire about ${picked.length} items`) },
            { label: 'Reject', onRun: () => { const ids = picked.filter(h => !h.options).map(h => h.id); runBulk(ids, { decision: { kind: 'reject', reason: 'Not now' } }, `Rejected ${ids.length} items`) } },
          ]} />
          <ul className="day-rows">
            {show === 'done'
              ? done.map(x => (
                <li key={x.id}>
                  <button className={`day-row done ${selected === `d:${x.id}` ? 'active' : ''}`} onClick={() => setSelected(`d:${x.id}`)}>
                    <span className="check" aria-hidden><Check size={12} /></span>
                    <span className="txt"><span className="ellipsis">{x.title}</span><span className="faint ellipsis">{x.text}</span></span>
                  </button>
                </li>
              ))
              : rows.map(e => <Row key={e.key} e={e} active={e.key === selected} onClick={() => setSelected(e.key)}
                  select={pickable.includes(e.key) ? { checked: sel.has(e.key), any: sel.count > 0, toggle: (shift: boolean) => sel.toggle(e.key, shift) } : undefined} />)}
          </ul>
          {!keys.length && <p className="day-empty faint">{agent !== 'all' ? <>Nothing from {agentName(agent)} here. <button className="link-btn" onClick={() => setAgent('all')}>All agents</button></> : 'Nothing needs you.'}</p>}
        </nav>

        <section className="day-pane card" aria-live="polite">
          {doneSel ? <DoneView x={doneSel} onNext={idx < keys.length - 1 ? () => move(1) : undefined} />
            : current?.b ? <>
                <BatchDetail b={current.b} onBulk={() => setSelected(null)} onDiscuss={setThread} />
                <NextLink e={next} onPick={setSelected} />
              </>
            : current?.h ? <>
                <Detail key={current.h.id} h={current.h} position={position} onDiscuss={setThread} onSettled={() => setSelected(null)} />
                <NextLink e={next} onPick={setSelected} />
              </>
            : show === 'need' && agent === 'all' ? <AllClear />
            : <p className="day-empty faint">Nothing to show.</p>}
        </section>
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

function DoneView({ x, onNext }: { x: DoneItem; onNext?: () => void }) {
  const act = useHandoffActions()
  return (
    <div className="done-view">
      <UndoBar onUndo={() => act.restore(x.h)} action={onNext && <Btn size="xs" variant="ghost" onClick={onNext}>Next item</Btn>}>
        <b>{x.text}</b> <span className="faint">· settled at {hhmm(x.at)}</span>
      </UndoBar>
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
      {action}
    </div>
  )
}
