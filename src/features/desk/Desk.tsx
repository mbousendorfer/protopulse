import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, Focus as FocusIcon } from 'lucide-react'
import type { AgentId, Decision, DoneItem, Handoff } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { hhmm } from '../../app/time'
import { groupOf } from '../../app/reducer'
import { AGENTS, agentName } from '../../data/agents'
import { Btn, Filters, Mark, Menu, TopicIcon } from '../../ui'
import { Spark } from '../../ui/charts'
import Photo from '../../ui/Photo'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { gist } from '../../ui/gist'
import { ClipThumb, useClip } from '../video/parts'
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
const RANK = { urgent: 0, today: 1, week: 2 }
const urgencyOf = (e: Entry) => e.b?.urgency ?? e.h!.urgency
/** Needs you, by gesture (matrix §14): a choice or an answer only you can give, then what to approve. */
type Gesture = 'call' | 'approve'
const GESTURE: Record<Gesture, string> = { call: 'Your call', approve: 'To approve' }
const gestureOf = (e: Entry): Gesture => (e.b || e.h!.kind === 'approval' ? 'approve' : 'call')

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
    // Needs you: batches and single cards, by gesture, then by urgency.
    const need: Entry[] = [...batches.map((b): Entry => ({ key: `b:${b.id}`, group: 'need', b })), ...rest.map((h): Entry => ({ key: `h:${h.id}`, group: 'need', h }))]
      .sort((x, y) => Number(gestureOf(x) === 'approve') - Number(gestureOf(y) === 'approve') || RANK[urgencyOf(x)] - RANK[urgencyOf(y)])
    const one = (h: Handoff): Entry => ({ key: `h:${h.id}`, group: groupOfCard(h), h })
    return [...need, ...open.filter(h => groupOf(h) !== 'need').map(one), ...mine.filter(h => h.lane === 'claire' || h.lane === 'snoozed').map(one)]
  }, [s.handoffs, agent])
  const done = s.desk.done

  const counts = Object.fromEntries((Object.keys(SHOW_LABEL) as Show[]).map(k => [k, k === 'done' ? done.length : entries.filter(e => e.group === k).reduce((n, e) => n + size(e), 0)])) as Record<Show, number>
  const shown = (Object.keys(SHOW_LABEL) as Show[]).filter(k => k === 'need' || counts[k] > 0)
  const show = shown.includes(pick) ? pick : 'need'
  // The decision to take first is set apart above the list (matrix §15): the most urgent single card, then the oldest.
  const needs = entries.filter(e => e.group === 'need')
  const hero = show === 'need' && needs.length > 1 ? needs.filter(e => e.h).sort((x, y) => byPriority(x.h!, y.h!))[0] : undefined
  const rows = show === 'done' ? [] : entries.filter(e => e.group === show && e !== hero)
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
    if (cardParam) return // the link's card wins over the default selection
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

  const headed = new Set(rows.map(gestureOf)).size > 1
  const nowT = useNow(60000)
  const idx = keys.indexOf(selected ?? '')
  const position = idx >= 0 ? `${idx + 1} of ${keys.length}` : undefined
  const next = rows[idx + 1]

  return (
    <div className="page today">
      {s.phase === 'day1' && nowT < firstBriefAt(s.setup.startedAt ?? nowT) ? <Welcome /> : <Brief />}
      {s.phase === 'day1' && <Checklist />}

      <div className="day-bar">
        <Filters label="Your day" value={show} onChange={v => { setShow(v); setLastIndex(0); setSelected(null) }}
          items={shown.map(k => ({ value: k, label: SHOW_LABEL[k], count: counts[k] }))} />
        <span className="spacer" />
        <Menu align="end" trigger={<Btn size="sm" variant="ghost">{agent === 'all' ? 'All agents' : agentName(agent)}<ChevronDown size={12} /></Btn>}
          items={[{ label: 'All agents', onSelect: () => setAgent('all') }, ...AGENTS.map(a => ({ label: a.name, hint: a.dept, onSelect: () => setAgent(a.id) }))]} />
        <Btn size="sm" variant="ghost" onClick={() => nav('/focus')} disabled={!counts.need} kbd="F"><FocusIcon size={13} />Focus</Btn>
      </div>
      <Notice scope="desk" />

      {hero?.h && (
        <section className={`card desk-feature ${hero.h.urgency}`} aria-label="Decide first">
          <Detail key={hero.h.id} h={hero.h} keys={false} feature onDiscuss={setThread} />
        </section>
      )}

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
              : rows.map((e, i) => {
                  const select = pickable.includes(e.key) ? { checked: sel.has(e.key), any: sel.count > 0, toggle: (shift: boolean) => sel.toggle(e.key, shift) } : undefined
                  const g = gestureOf(e)
                  // A short header where the gesture changes, only when Needs you mixes both (matrix §14).
                  const head = show === 'need' && headed && (i === 0 || gestureOf(rows[i - 1]) !== g)
                  return (
                    <Fragment key={e.key}>
                      {head && <li className="day-group" role="presentation"><span>{GESTURE[g]}</span><span className="faint num">{rows.filter(x => gestureOf(x) === g).reduce((n, x) => n + size(x), 0)}</span></li>}
                      {(show === 'look' || show === 'good') && e.h
                        ? <Tile e={e} active={e.key === selected} onClick={() => setSelected(e.key)} select={select} />
                        : <Row e={e} active={e.key === selected} onClick={() => setSelected(e.key)} select={select} />}
                    </Fragment>
                  )
                })}
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
        <TopicIcon agent={e.b.agent} topic={e.b.id === 'rules' ? 'rule' : e.b.id === 'nova' ? 'reply' : 'post'} size={32} />
        <span className="txt">
          <span className="day-title">{e.b.title}</span>
          <span className="day-meta"><Mark agent={e.b.agent} /><Urgency u={e.b.urgency} /><span className="ellipsis">{e.b.meta}</span></span>
        </span>
        {/* A batch reads as its small cards: the first few people or visuals, stacked. */}
        <span className="day-stack" aria-label={`${e.b.items.length} items`}>
          {e.b.items.slice(0, 3).map(h => <Thumb key={h.id} h={h} small />)}
          <CountBadge n={e.b.items.length} />
        </span>
      </button>
    </li>
  )
  const h = e.h!
  const meta = e.group === 'later' && h.snoozedUntil ? `Back at ${hhmm(h.snoozedUntil)}` : e.group === 'claire' ? (h.claire?.reply ? 'Claire answered' : 'Claire is looking') : gist(h.context, 10)
  return (
    <li className={`day-li ${select?.checked ? 'picked' : ''}`}>
      {box}
      <button className={`day-row ${active ? 'active' : ''} ${h.fresh ? 'fresh' : ''}`} onClick={onClick}>
        <TopicIcon agent={h.agent} kind={h.kind} topic={h.topic} size={32} />
        <span className="txt">
          <span className="day-title">{h.title}</span>
          <span className="day-meta"><Mark agent={h.agent} />{e.group === 'need' && <Urgency u={h.urgency} />}<span className="ellipsis">{meta}</span></span>
        </span>
        <Thumb h={h} />
      </button>
    </li>
  )
}

/** Urgent and Today, named; this week stays quiet. */
export function Urgency({ u }: { u: Handoff['urgency'] }) {
  return u === 'week' ? null : <b className={`day-urg ${u}`}>{u === 'urgent' ? 'Urgent' : 'Today'}</b>
}

/** The object in miniature: the post's visual, the person who wrote, the metric's curve, the clip's frame. */
function Thumb({ h, small }: { h: Handoff; small?: boolean }) {
  const p = h.preview
  if (p?.type === 'post' && p.media) return <span className="day-thumb"><Photo name={p.media} /></span>
  if (p?.type === 'reply') return <span className="day-thumb face"><SocialAvatar name={p.author.split(' · ')[0]} network={small ? undefined : p.network} size={small ? 24 : 32} /></span>
  if (p?.type === 'metric' && !small) return <span className="day-thumb spark"><Spark data={p.series} w={56} h={26} tone={p.down ? 'alert' : 'ink'} color={`var(--a-${h.agent})`} label={p.label} /></span>
  if (p?.type === 'clip') return <ClipMini id={(p as { clip: string }).clip} />
  return null
}

function ClipMini({ id }: { id: string }) {
  const found = useClip(id)
  return found ? <span className="day-thumb clip"><ClipThumb clip={found.clip} source={found.source} size="sm" /></span> : null
}

/**
 * Worth a look and Good news keep a shape of their own: a small card led by its number or its visual, not a row.
 * A good news without a metric shows the figure its title leads with.
 */
function Tile({ e, active, onClick, select }: { e: Entry; active: boolean; onClick: () => void; select?: RowSelect }) {
  const h = e.h!
  const p = h.preview
  const good = h.kind === 'news'
  const fig = p?.type === 'metric' ? p.value : good ? h.title.match(/\d[\d.,]*(?:k|×|%)?/)?.[0] : undefined
  return (
    <li className={`day-li ${select?.checked ? 'picked' : ''}`}>
      {select && <SelectBox checked={select.checked} visible={select.any} onToggle={select.toggle} label={`Select ${h.title}`} />}
      <button className={`day-tile ${good ? 'good' : ''} ${active ? 'active' : ''} ${h.fresh ? 'fresh' : ''}`} onClick={onClick}>
        <span className="day-meta"><Mark agent={h.agent} /><b>{agentName(h.agent)}</b><span className="ellipsis">{h.topic}</span></span>
        {(fig || p?.type === 'post') && (
          <span className="tile-fig">
            {fig && <span className="tile-num"><b className="num">{fig}</b>{p?.type === 'metric' && <span className={`delta ${p.down ? 'down' : 'up'}`}>{p.delta}</span>}</span>}
            {p?.type === 'metric' ? <Spark data={p.series} w={110} h={34} tone={p.down ? 'alert' : 'ink'} color={`var(--a-${h.agent})`} label={p.label} />
              : <Thumb h={h} />}
          </span>
        )}
        <span className="day-title">{h.title}</span>
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
