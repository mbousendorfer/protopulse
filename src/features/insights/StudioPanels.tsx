// Report Studio, the agentic way: ask Iris for a report, then change it section by section.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, CalendarClock, Check, Link2, Pause, Play, Plus, Printer, Sparkles, Trash2 } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import { actionOf, uid } from '../../app/core'
import { dayLabel } from '../../app/time'
import type { Schedule } from './slice'
import { nextRun } from './reports'
import type { Recipe, Report, ReportSection, SectionKind } from '../../data/insights'
import { Btn, Mark, Menu } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import { DEFAULT_SECTIONS, SECTION_LABEL, enrich, parseEdits, parseRecipe } from './studio'

/** Reports tab: one sentence, and Iris writes it. Saved templates sit underneath. */
export function StudioAsk() {
  const { s, d } = useStore()
  const nav = useNavigate()
  const [text, setText] = useState('')
  // Anything typed here is a request for a report, even without the word.
  const write = (t: string, saved?: Recipe) => {
    const id = uid('r')
    const asked = parseRecipe(t.toLowerCase()) ?? parseRecipe(`a report ${t.toLowerCase()}`) ?? { days: 7, networks: [], audience: 'sam' as const }
    d({ type: 'insights/studio', id, recipe: saved ?? enrich(s, t, { ...asked, sections: DEFAULT_SECTIONS }), via: 'You asked from Insights' })
    setText('')
    nav(`/insights/reports/${id}`)
  }
  return (
    <section className="card pad stack in-studio">
      <form className="row nowrap in-studio-ask" onSubmit={e => { e.preventDefault(); if (text.trim()) write(text) }}>
        <Mark agent="iris" />
        <label htmlFor="studio-ask" className="sr-only">Ask Iris for a report</label>
        <input id="studio-ask" className="input grow" placeholder="A monthly report for Claire on Instagram and TikTok" value={text} onChange={e => setText(e.target.value)} />
        <Btn type="submit" variant="primary" disabled={!text.trim()}><Sparkles size={14} />Ask Iris</Btn>
      </form>
      {s.insights.templates.length > 0 && (
        <div className="row tight in-templates">
          <span className="faint">Your templates</span>
          {s.insights.templates.map(t => (
            <span key={t.id} className="row tight in-template">
              <Btn size="sm" onClick={() => write(t.name, t.recipe)}>{t.name}</Btn>
              <Btn size="xs" variant="ghost" icon aria-label={`Delete template ${t.name}`} onClick={() => d({ type: 'insights/templateDelete', id: t.id })}><Trash2 size={12} /></Btn>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

/** Move, shorten or drop one section of a report Sam asked for. */
export function SectionTools({ r, i, sec }: { r: Report; i: number; sec: ReportSection }) {
  const { d } = useStore()
  const run = (op: 'up' | 'down' | 'remove' | 'shorter' | 'longer', said: string) => d({ type: 'insights/studioEdit', id: r.id, ops: [{ op, i }], said })
  const name = `“${sec.heading}”`
  return (
    <span className="row tight in-sec-tools">
      <Btn size="xs" variant="ghost" icon aria-label={`Move ${sec.heading} up`} disabled={i === 0} onClick={() => run('up', `moved ${name} up`)}><ArrowUp size={12} /></Btn>
      <Btn size="xs" variant="ghost" icon aria-label={`Move ${sec.heading} down`} disabled={i === r.sections.length - 1} onClick={() => run('down', `moved ${name} down`)}><ArrowDown size={12} /></Btn>
      <Btn size="xs" variant="ghost" onClick={() => run(sec.short ? 'longer' : 'shorter', `${sec.short ? 'expanded' : 'shortened'} ${name}`)}>{sec.short ? 'Longer' : 'Shorter'}</Btn>
      <Btn size="xs" variant="ghost" icon aria-label={`Remove ${sec.heading}`} onClick={() => run('remove', `removed ${name}`)}><Trash2 size={12} /></Btn>
    </span>
  )
}

/** Under a report Sam asked for: tell Iris what to change, add a section, undo the last change. */
export function StudioEdit({ r }: { r: Report }) {
  const { s, d } = useStore()
  const now = useNow(1000)
  const [text, setText] = useState('')
  const [miss, setMiss] = useState(false)
  const change = (t: string) => {
    const { ops, said } = parseEdits(t, r)
    setMiss(!ops.length)
    if (ops.length) { d({ type: 'insights/studioEdit', id: r.id, ops, said: said.join(', ') }); setText('') }
  }
  const missing = (Object.keys(SECTION_LABEL) as SectionKind[]).filter(k => !r.sections.some(x => x.kind === k) && (k !== 'campaign' || r.recipe?.campaign) && (k !== 'label' || r.recipe?.label))
  const last = s.log.find(l => l.report?.id === r.id && l.status !== 'undone' && (l.undoUntil ?? 0) > now)
  return (
    <div className="stack in-studio-edit">
      {last && <UndoBar until={last.undoUntil} onUndo={() => d({ type: 'core/undo', id: last.id })}>{last.text.replace(`${r.title}: `, 'Iris ')}</UndoBar>}
      <form className="row nowrap" onSubmit={e => { e.preventDefault(); if (text.trim()) change(text) }}>
        <label htmlFor="studio-edit" className="sr-only">Tell Iris what to change</label>
        <input id="studio-edit" className="input grow" placeholder="Make it shorter and add the top 3 posts" value={text} onChange={e => { setText(e.target.value); setMiss(false) }} />
        <Btn type="submit" disabled={!text.trim()}>Change it</Btn>
        {missing.length > 0 && <Menu trigger={<Btn><Plus size={14} />Add a section</Btn>} items={missing.map(k => ({ label: SECTION_LABEL[k], onSelect: () => d({ type: 'insights/studioEdit', id: r.id, ops: [{ op: 'add', kind: k }], said: `added “${SECTION_LABEL[k]}”` }) }))} />}
      </form>
      {miss && <p className="muted">I can make it shorter or longer, or add, drop or move a section: results, top 3 posts, what didn’t work, best times, pillars, community.</p>}
    </div>
  )
}

/** Keep this report's recipe to ask for it again by name. */
export function SaveTemplate({ r }: { r: Report }) {
  const { s, d } = useStore()
  const [name, setName] = useState(r.recipe?.audience === 'claire' ? `${r.title.split(' · ')[0].replace(' report', '')} for Claire` : r.title.split(' · ')[0])
  const saved = s.insights.templates.find(t => JSON.stringify(t.recipe) === JSON.stringify(r.recipe))
  if (saved) return <p className="muted">Saved as the template “{saved.name}”. Ask for it again in ⌘K or Chat: “Iris, the {saved.name} report”.</p>
  return (
    <form className="stack gap-2" onSubmit={e => { e.preventDefault(); d({ type: 'insights/template', id: r.id, name }) }}>
      <label htmlFor="tpl-name" className="faint">Template name</label>
      <input id="tpl-name" className="input" value={name} onChange={e => setName(e.target.value)} />
      <Btn type="submit" className="self-start" disabled={!name.trim()}>Save as template</Btn>
    </form>
  )
}

const EVERY: Record<Schedule['every'], string> = { week: 'every Monday', month: 'on the 1st of each month' }

/** Reports tab: what Iris writes on a schedule, when, and what she does with it. */
export function Schedules() {
  const { s, d } = useStore()
  const now = useNow(60_000)
  const lvl = actionOf(s, 'iris', 'iris-report')?.autonomy
  if (!s.insights.schedules.length) return null
  const does = (sc: Schedule) => (sc.to === 'sam' ? 'Iris writes it for you' : lvl === 'act' ? 'Iris sends it to Claire' : lvl === 'draft' ? 'It waits for you on the Desk, then goes to Claire' : 'Iris writes it, you send it')
  return (
    <section className="card">
      <div className="card-head"><h2>Scheduled</h2></div>
      <ul className="in-schedules">
        {s.insights.schedules.map(sc => (
          <li key={sc.id} className={sc.paused ? 'off' : ''}>
            <div className="grow">
              <b>{sc.name}</b>
              <span className="muted"> · {EVERY[sc.every]} at 08:00 → {sc.to === 'claire' ? 'Claire' : 'you'}</span>
              <p className="faint">{sc.paused ? 'Paused' : `Next: ${dayLabel(nextRun(sc, now), now)} · ${does(sc)}`}</p>
            </div>
            <Btn size="sm" onClick={() => d({ type: 'insights/schedulePause', id: sc.id })}>{sc.paused ? <><Play size={14} />Resume</> : <><Pause size={14} />Pause</>}</Btn>
            <Btn size="sm" variant="ghost" icon aria-label={`Delete schedule ${sc.name}`} onClick={() => d({ type: 'insights/scheduleDelete', id: sc.id })}><Trash2 size={14} /></Btn>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Report side panel: schedule it, print it to PDF, copy a read-only link. */
export function ReportOut({ r }: { r: Report }) {
  const { s, d } = useStore()
  const [copied, setCopied] = useState(false)
  const scheduled = s.insights.schedules.filter(x => x.name === r.title)
  const plan = (every: Schedule['every'], to: Schedule['to']) => d({ type: 'insights/schedule', name: r.title, recipe: r.recipe!, every, to, via: 'You scheduled it from the report' })
  const link = `${location.origin}${location.pathname}#/insights/reports/${r.id}?view=read`
  return (
    <div className="stack gap-2">
      {r.recipe && (scheduled.length
        ? <p className="muted">Scheduled {scheduled.map(x => `${EVERY[x.every]} for ${x.to === 'claire' ? 'Claire' : 'you'}`).join(' and ')}. Manage it in Insights › Reports.</p>
        : <Menu align="start" trigger={<Btn className="self-start"><CalendarClock size={14} />Schedule</Btn>} items={[
          { label: 'Every Monday, to Claire', onSelect: () => plan('week', 'claire') },
          { label: 'Every month, to Claire', onSelect: () => plan('month', 'claire') },
          { label: 'Every Monday, to me', onSelect: () => plan('week', 'sam') },
        ]} />)}
      <div className="row tight">
        <Btn variant="ghost" onClick={() => { d({ type: 'insights/export', title: r.title }); window.print() }}><Printer size={14} />Download PDF</Btn>
        <Btn variant="ghost" onClick={() => { navigator.clipboard?.writeText(link).catch(() => undefined); setCopied(true) }}>{copied ? <><Check size={14} />Link copied</> : <><Link2 size={14} />Copy read-only link</>}</Btn>
      </div>
    </div>
  )
}
