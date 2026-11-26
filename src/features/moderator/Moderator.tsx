import { useNavigate } from 'react-router-dom'
import { Clock, Download, FastForward, Play, RotateCcw, Sunrise, Trash2, Zap } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import type { Preset } from '../../app/state'
import { hhmm } from '../../app/time'
import { registry, scriptEvents } from '../../app/agents-registry'
import { Btn, Mark, Seg, Sheet, Switch } from '../../ui'
import './moderator.css'

const PRESETS: { id: Preset; label: string; note: string }[] = [
  { id: 'calm', label: 'Calm morning', note: '4 cards' },
  { id: 'busy', label: 'Busy morning', note: '14 cards' },
  { id: 'competitor', label: 'Competitor day', note: 'Peakline, Trailkind, Norrø, Basecamp' },
  { id: 'trust', label: 'Trust test', note: '2 promotions, 1 step back, 1 rule' },
]

/** An event's label without its agent prefix, capitalised. */
const short = (label: string) => { const t = label.replace(/^\w+ · /, ''); return t.charAt(0).toUpperCase() + t.slice(1) }

const JUMPS: { label: string; minutes: number }[] = [{ label: '+10 min', minutes: 10 }, { label: '+1 hour', minutes: 60 }, { label: 'Skip 2 hours', minutes: 120 }, { label: '+1 week', minutes: 7 * 24 * 60 }]

export default function Moderator({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const now = useNow(5000)
  const ev = s.tester
  const SCRIPT = scriptEvents()
  const run = (fn: () => void) => { fn(); onOpenChange(false) }
  const count = (...kinds: string[]) => ev.filter(e => kinds.includes(e.kind)).length
  const focus = ev.filter(e => e.kind === 'focus/decision').map(e => Number(e.detail?.ms ?? 0))
  const avg = focus.length ? Math.round(focus.reduce((a, b) => a + b, 0) / focus.length / 100) / 10 : 0
  const main: [string, number][] = [
    ['Desk decisions', count('core/resolve')], ['Undos', count('core/undo', 'core/restore')],
    ['Autonomy changes', count('core/autonomy', 'core/preset')], ['Commands typed', count('command')],
  ]
  const more: [string, number | string][] = [
    ['Asked Claire', count('core/askClaire')], ['Thread messages', count('core/thread')], ['Pages visited', count('nav')],
    ['Onboarding screens', new Set(ev.filter(e => e.kind === 'setup/patch' && (e.detail?.patch as { step?: string })?.step).map(e => (e.detail?.patch as { step: string }).step)).size],
    ['Seconds per Focus card', focus.length ? avg : '–'],
    ...registry().flatMap(m => m.testerStats?.(ev) ?? []),
  ]
  const triggers = registry().flatMap(m => (m.triggers ?? []).flatMap(t => {
    const e = SCRIPT.find(x => x.id === t.event)
    // The mark already names the agent: every label drops its "Nova · " prefix, written or derived.
    return e ? [{ ...t, agent: m.id, label: short(t.label ?? e.label) }] : []
  }))
  const where = s.phase === 'day1' ? 'Day 1 workspace' : s.onboarded ? 'Day 30 workspace' : `onboarding, at “${s.setup.step}”`

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), events: s.tester }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `protopulse-session-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Moderator">
      <div className="mod stack lg">
        <p className="faint">App time {hhmm(now)} · {where} · hidden from the tester, ⇧D to toggle.</p>

        <section className="stack">
          <h3>Time</h3>
          <div className="row">
            {JUMPS.map(j => <Btn key={j.minutes} size="sm" onClick={() => d({ type: 'core/advance', minutes: j.minutes })}><Clock size={14} />{j.label}</Btn>)}
            <Btn size="sm" onClick={() => run(() => { d({ type: 'core/skipDay' }); nav('/') })}><FastForward size={14} />Tomorrow 08:00</Btn>
          </div>
          <p className="faint t-xs">Skip 2 hours delivers what Day 1 announces with a delay: Echo’s first topics and Iris’s first report. Claire’s answers, snoozes, response targets, idea windows, videos in progress, reports and trials all run on this clock.</p>
        </section>

        {triggers.length > 0 && (
          <section className="stack">
            <h3>Hard to see</h3>
            <ul className="mod-events all">
              {triggers.map(t => (
                <li key={t.event}>
                  <Mark agent={t.agent} />
                  <span className="ellipsis">{t.label}</span>
                  <Btn size="xs" onClick={() => run(() => { d({ type: 'core/fire', eventId: t.event }); nav(t.to) })} aria-label={`Show ${t.label}`}><Zap size={12} />Show</Btn>
                </li>
              ))}
            </ul>
            <p className="faint t-xs">Show fires it now and opens where it lands.</p>
          </section>
        )}

        <section className="stack">
          <h3>Start over</h3>
          <div className="row">
            <Btn size="sm" onClick={() => run(() => { d({ type: 'core/reset' }); nav('/') })}><RotateCcw size={14} />Day 30 workspace</Btn>
            <Btn size="sm" onClick={() => run(() => { d({ type: 'core/reset', onboarding: true }); d({ type: 'setup/start', defaults: true }); nav('/') })}><Sunrise size={14} />Day 1 Desk</Btn>
            <Btn size="sm" onClick={() => run(() => { d({ type: 'core/reset', onboarding: true }); nav('/onboarding/signup') })}><Play size={14} />Start onboarding</Btn>
          </div>
          <div className="mod-presets">
            {PRESETS.map(p => (
              <button key={p.id} className="mod-preset" onClick={() => run(() => { d({ type: 'core/reset', preset: p.id }); nav('/') })}>
                <b>{p.label}</b><span className="faint">{p.note}</span>
              </button>
            ))}
          </div>
          <p className="faint t-xs">Each one resets the demo and keeps the tester log.</p>
        </section>

        <section className="stack">
          <h3>Proactive feed</h3>
          <div className="row">
            <Switch checked={s.engine.live} onChange={live => d({ type: 'core/engine', live })} label={s.engine.live ? `On · next at ${hhmm(s.engine.nextAt)}` : 'Off'} />
            <Seg name="cadence" label="Cadence" size="sm" value={String(s.engine.cadence)} onChange={v => d({ type: 'core/engine', cadence: +v })}
              options={[{ value: '10', label: 'Every 10 s' }, { value: '30', label: 'Every 30 s' }, { value: '60', label: 'Every 60 s' }]} />
          </div>
          <details className="mod-more">
            <summary>All {SCRIPT.length} script events</summary>
            <ul className="mod-events">
              {SCRIPT.map(e => (
                <li key={e.id}>
                  <Mark agent={e.agent ?? e.handoff?.agent ?? 'atlas'} />
                  <span className="ellipsis">{short(e.label)}</span>
                  {e.tag && <span className="faint mod-tag">{e.tag}</span>}
                  <Btn size="xs" onClick={() => d({ type: 'core/fire', eventId: e.id })} aria-label={`Trigger ${e.label}`}><Zap size={12} />Trigger</Btn>
                </li>
              ))}
            </ul>
          </details>
        </section>

        <section className="stack">
          <div className="row between">
            <h3>Tester log <span className="faint num">{ev.length} events</span></h3>
            <div className="row">
              <Btn size="sm" onClick={exportJson} disabled={!ev.length}><Download size={14} />Export JSON</Btn>
              <Btn size="sm" variant="ghost" onClick={() => d({ type: 'core/clearTracker' })} disabled={!ev.length}><Trash2 size={14} />Clear</Btn>
            </div>
          </div>
          <dl className="mod-counters">
            {main.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}
          </dl>
          <details className="mod-more">
            <summary>Every counter and the last events</summary>
            <dl className="mod-counters">
              {more.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}
            </dl>
            <ol className="mod-log mono">
              {ev.slice(-12).reverse().map((e, i) => (
                <li key={`${e.t}-${i}`}><span className="faint">{hhmm(e.app)}</span><span>{e.kind}</span><span className="faint ellipsis">{e.detail ? JSON.stringify(e.detail) : ''}</span></li>
              ))}
              {!ev.length && <li className="faint">Nothing recorded yet. Every click the tester makes lands here.</li>}
            </ol>
          </details>
        </section>
      </div>
    </Sheet>
  )
}
