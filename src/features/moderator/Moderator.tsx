import { useNavigate } from 'react-router-dom'
import { Download, FastForward, Play, RotateCcw, Trash2, Zap } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import type { Preset } from '../../app/state'
import { hhmm } from '../../app/time'
import { SCRIPT } from '../../data/script'
import { Btn, Mark, Seg, Sheet, Switch } from '../../ui'
import './moderator.css'

const PRESETS: { id: Preset; label: string; note: string }[] = [
  { id: 'calm', label: 'Calm morning', note: '4 cards' },
  { id: 'busy', label: 'Busy morning', note: '14 cards' },
  { id: 'competitor', label: 'Competitor day', note: 'Peakline, Trailkind, Norrø, Basecamp' },
  { id: 'trust', label: 'Trust test', note: '2 promotions, 1 step back, 1 rule' },
]

export default function Moderator({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const now = useNow(5000)
  const ev = s.tester
  const count = (...kinds: string[]) => ev.filter(e => kinds.includes(e.kind)).length
  const focus = ev.filter(e => e.kind === 'focus/decision').map(e => Number(e.detail?.ms ?? 0))
  const avg = focus.length ? Math.round(focus.reduce((a, b) => a + b, 0) / focus.length / 100) / 10 : 0
  const counters: [string, number | string][] = [
    ['Desk decisions', count('core/resolve')],
    ['Undos', count('core/undo', 'core/restore')],
    ['Autonomy changes', count('core/autonomy', 'core/preset')],
    ['Commands typed', count('command')],
    ['Sent to Claire', count('core/askClaire')],
    ['Thread messages', count('core/thread')],
    ['Pages visited', count('nav')],
    ['Seconds per Focus card', focus.length ? avg : '–'],
  ]
  const run = (fn: () => void) => { fn(); onOpenChange(false) }

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
        <p className="faint">Only for the person running the session. Hidden from the tester (⇧D to toggle). App time {hhmm(now)}.</p>

        <section className="stack">
          <h3>Session</h3>
          <div className="row">
            <Btn onClick={() => run(() => { d({ type: 'core/reset' }); nav('/') })}><RotateCcw size={14} />Reset demo</Btn>
            <Btn onClick={() => run(() => { d({ type: 'core/reset', onboarding: true }); nav('/onboarding') })}><Play size={14} />Start onboarding</Btn>
            <Btn onClick={() => run(() => { d({ type: 'core/skipDay' }); nav('/') })}><FastForward size={14} />Skip to tomorrow 08:00</Btn>
          </div>
        </section>

        <section className="stack">
          <h3>Scenario</h3>
          <div className="mod-presets">
            {PRESETS.map(p => (
              <button key={p.id} className="mod-preset" onClick={() => run(() => { d({ type: 'core/reset', preset: p.id }); nav('/') })}>
                <b>{p.label}</b><span className="faint">{p.note}</span>
              </button>
            ))}
          </div>
          <p className="faint" style={{ fontSize: 12 }}>A scenario resets the demo, keeps the tester log.</p>
        </section>

        <section className="stack">
          <h3>Proactive feed</h3>
          <div className="row">
            <Switch checked={s.engine.live} onChange={live => d({ type: 'core/engine', live })} label={s.engine.live ? 'On' : 'Off'} />
            <Seg name="cadence" label="Cadence" size="sm" value={String(s.engine.cadence)} onChange={v => d({ type: 'core/engine', cadence: +v })}
              options={[{ value: '10', label: 'Every 10 s' }, { value: '30', label: 'Every 30 s' }, { value: '60', label: 'Every 60 s' }]} />
          </div>
          <p className="faint" style={{ fontSize: 12 }}>{s.engine.live ? `Next event at ${hhmm(s.engine.nextAt)} · ${s.engine.cursor % SCRIPT.length + 1} of ${SCRIPT.length} in the script` : 'Paused. Agents only act when you trigger an event.'}</p>
          <ul className="mod-events">
            {SCRIPT.map(e => (
              <li key={e.id}>
                <Mark agent={e.handoff.agent} />
                <span className="ellipsis">{e.label.replace(/^\w+ · /, '')}</span>
                {e.always && <span className="faint mod-tag">always a card</span>}
                <Btn size="xs" onClick={() => d({ type: 'core/fire', eventId: e.id })} aria-label={`Trigger ${e.label}`}><Zap size={12} />Trigger</Btn>
              </li>
            ))}
          </ul>
        </section>

        <section className="stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>Tester log <span className="faint num">{ev.length} events</span></h3>
            <div className="row">
              <Btn size="sm" onClick={exportJson} disabled={!ev.length}><Download size={14} />Export JSON</Btn>
              <Btn size="sm" variant="ghost" onClick={() => d({ type: 'core/clearTracker' })} disabled={!ev.length}><Trash2 size={14} />Clear</Btn>
            </div>
          </div>
          <dl className="mod-counters">
            {counters.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}
          </dl>
          <ol className="mod-log mono">
            {ev.slice(-12).reverse().map((e, i) => (
              <li key={`${e.t}-${i}`}><span className="faint">{hhmm(e.app)}</span><span>{e.kind}</span><span className="faint ellipsis">{e.detail ? JSON.stringify(e.detail) : ''}</span></li>
            ))}
            {!ev.length && <li className="faint">Nothing recorded yet. Every click the tester makes lands here.</li>}
          </ol>
        </section>
      </div>
    </Sheet>
  )
}
