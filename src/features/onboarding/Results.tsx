import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Send } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import type { AgentId } from '../../app/types'
import { groupOf } from '../../app/reducer'
import { hhmm } from '../../app/time'
import { agentName } from '../../data/agents'
import { PILLAR_PERF } from '../../data/insights'
import { Btn, Mark, Net } from '../../ui'
import { HBars } from '../../ui/charts'
import { UndoBar } from '../../ui/Feedback'
import { Foot, Head, useElapsed } from './parts'
import { DAY1_IDS, QUESTIONS } from './day1'

const SENT = (n: number) => `Sent ${n} ${n > 1 ? 'replies' : 'reply'} Nova drafted`
const slot = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}, ${hhmm(t)}`

/** The first results, one agent after the other. Each card thinks for a moment, then shows real work on Fernway's data. */
export default function Results({ onDone }: { onDone: () => void }) {
  const { s } = useStore()
  const has = (id: string) => s.handoffs.some(h => h.id === id) || s.desk.done.some(x => x.id === id)
  const nova = QUESTIONS.filter(q => has(q.id) || s.inbox.convs.find(c => c.id === q.conv)?.status === 'auto').length
  const cards: { agent: AgentId; working: string; got: string; body: ReactNode }[] = []
  if (nova) cards.push({ agent: 'nova', working: 'Reading messages', got: `${nova} ${nova > 1 ? 'replies' : 'reply'} ${QUESTIONS.some(q => s.handoffs.some(h => h.id === q.id)) ? 'ready' : 'sent'}`, body: <NovaResult /> })
  if (has(DAY1_IDS.atlas)) cards.push({ agent: 'atlas', working: 'Reading your posts', got: '1 post idea', body: <AtlasResult /> })
  if (has('h-peakline')) cards.push({ agent: 'echo', working: 'Checking competitors', got: '1 price move', body: <Plain id="h-peakline" where="Worth a look" /> })
  if (has(DAY1_IDS.iris)) cards.push({ agent: 'iris', working: 'Comparing themes', got: '1 finding', body: <IrisResult /> })
  if (has(DAY1_IDS.sage)) cards.push({ agent: 'sage', working: 'Planning', got: '4 pillars', body: <Plain id={DAY1_IDS.sage} where="Needs you" /> })

  const STEP = 1500
  const ms = useElapsed(cards.length * STEP + 300)
  const revealed = Math.min(cards.length, Math.floor((ms + 300) / STEP))
  const done = revealed >= cards.length
  const waiting = s.handoffs.filter(h => !h.lane && groupOf(h) === 'need').length

  return (
    <section className="onb-step">
      <Head title={done ? 'Your team’s first results' : 'Your team is on it'}
        lede={cards.length ? 'Real work on Fernway’s data, from the first minutes. Nothing goes out without you.' : 'Connect an account and your agents start reading. Your Desk lists what’s left to set up.'} />
      {cards.length > 0 && (
        <ol className="onb-crew" aria-label="Your agents">
          {cards.map((c, i) => (
            <li key={c.agent} className={i < revealed ? 'ready' : ''}>
              <button disabled={i >= revealed} onClick={() => document.getElementById(`onb-r-${c.agent}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                <Mark agent={c.agent} size="md" />
                <span><b>{agentName(c.agent)}</b>{i < revealed ? <span className="onb-got"><Check size={12} aria-hidden />{c.got}</span> : <span className="onb-working"><span className="spin" aria-hidden />{c.working}</span>}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="sr-only" aria-live="polite">{revealed ? `${revealed} of ${cards.length} agents done` : ''}</p>
      <ol className="onb-cards">
        {cards.slice(0, revealed).map(c => (
          <li key={c.agent} id={`onb-r-${c.agent}`} className="card onb-result">
            <header>
              <Mark agent={c.agent} size="md" />
              <b style={{ color: `var(--a-${c.agent}-ink)` }}>{agentName(c.agent)}</b>
              <span className="muted t-sm">· {c.got}</span>
            </header>
            <div className="onb-result-body">{c.body}</div>
          </li>
        ))}
      </ol>
      <Foot note={done ? (waiting ? `${waiting} thing${waiting > 1 ? 's' : ''} need${waiting > 1 ? '' : 's'} you on your Desk` : 'Nothing needs you right now') : undefined}>
        <Btn variant={done ? 'primary' : 'secondary'} onClick={onDone}>Open my Desk<ArrowRight size={14} /></Btn>
      </Foot>
    </section>
  )
}

function NovaResult() {
  const { s, d } = useStore()
  const nav = useNavigate()
  const now = useNow(1000)
  const qs = QUESTIONS.filter(q => s.handoffs.some(h => h.id === q.id) || s.desk.done.some(x => x.id === q.id) || s.inbox.convs.find(c => c.id === q.conv)?.status === 'auto')
  const open = qs.filter(q => s.handoffs.some(h => h.id === q.id && !h.lane))
  const alone = s.log.find(l => l.agent === 'nova' && /on her own/.test(l.text))
  const sent = s.log.find(l => l.text.startsWith('Sent ') && l.restore?.some(h => h.id.startsWith('d1-nova')) && l.status !== 'undone')
  return (
    <>
      <p className="onb-result-title">{alone ? `${qs.length} questions came in overnight. Nova answered them on her own.` : `${qs.length} question${qs.length > 1 ? 's' : ''} came in overnight. Nova wrote the answers.`}</p>
      <ul className="onb-replies">
        {qs.map(q => {
          const c = s.inbox.convs.find(x => x.id === q.conv)!
          const h = s.handoffs.find(x => x.id === q.id)
          const draft = h?.preview?.type === 'reply' ? h.preview.draft.map(p => (typeof p === 'string' ? p : p.text)).join('') : q.draft
          const isOpen = open.includes(q)
          return (
            <li key={q.id}>
              <div className="onb-q"><Net n={c.network} size={16} /><b>{c.author}</b><span className="muted">{c.messages[0].text}</span></div>
              <div className="onb-a"><span className="onb-a-by">Nova’s reply{!isOpen && <> · <Check size={12} aria-hidden />{alone ? 'sent by Nova' : 'sent'}</>}</span><p>{draft}</p></div>
            </li>
          )
        })}
      </ul>
      <p className="onb-sources">From your Playbook facts · {qs.map(q => q.fact.split(':')[0]).join(', ')}</p>
      {open.length > 0 ? (
        <div className="row">
          <Btn variant="primary" onClick={() => d({ type: 'core/bulk', ids: open.map(q => q.id), decision: { kind: 'approve' }, summary: SENT(open.length), agent: 'nova' })}><Send size={14} />Send {open.length} {open.length > 1 ? 'replies' : 'reply'}</Btn>
          <Btn onClick={() => nav(`/?card=${open[0].id}`)}>Edit on my Desk</Btn>
        </div>
      ) : sent && sent.undoUntil && sent.undoUntil > now ? (
        <UndoBar until={sent.undoUntil} onUndo={() => d({ type: 'core/undo', id: sent.id })}>Sent. Nova learns from every reply you approve or edit.</UndoBar>
      ) : alone ? (
        <p className="muted">Each one can be undone from the Inbox for 10 minutes. <button className="link-btn" onClick={() => nav('/inbox')}>Open the Inbox</button></p>
      ) : <p className="muted"><Check size={14} className="ok" aria-hidden /> Sent. Nova learns from every reply you approve or edit.</p>}
    </>
  )
}

function AtlasResult() {
  const { s, d } = useStore()
  const now = useNow(1000)
  const idea = s.publishing.ideas.find(i => i.handoff === DAY1_IDS.atlas || (s.handoffs.find(h => h.id === DAY1_IDS.atlas)?.ref === i.id))
    ?? s.publishing.ideas.find(i => i.id === s.desk.done.find(x => x.id === DAY1_IDS.atlas)?.h.ref)
  if (!idea) return null
  const src = idea.sources[0]
  const draft = idea.drafts?.[0]
  const open = s.handoffs.some(h => h.id === DAY1_IDS.atlas)
  const log = s.log.find(l => l.restore?.some(h => h.id === DAY1_IDS.atlas) && l.status !== 'undone')
  const scheduled = idea.status === 'scheduled'
  return (
    <>
      <p className="onb-result-title">Atlas suggests: {idea.title}</p>
      {src.value && <p className="onb-metric"><b className="num">{src.value}</b> <span>{src.measure}</span></p>}
      <p className="muted">{idea.why}</p>
      {draft && (
        <div className="onb-post">
          <span className="onb-a-by"><Net n={draft.network} size={14} /> Draft for {slot(draft.at)}</span>
          <p>{draft.text}</p>
        </div>
      )}
      {open && !draft && <div className="row"><Btn onClick={() => d({ type: 'publishing/ideaDraft', id: idea.id })}>Draft it</Btn><span className="muted t-sm">Atlas is on Suggest: it writes when you ask.</span></div>}
      {open && draft && <div className="row"><Btn onClick={() => d({ type: 'core/resolve', id: DAY1_IDS.atlas, decision: { kind: 'approve' } })}>Schedule for {slot(draft.at)}</Btn></div>}
      {scheduled && log?.undoUntil && log.undoUntil > now
        ? <UndoBar until={log.undoUntil} onUndo={() => d({ type: 'core/undo', id: log.id })}>Scheduled. It’s in your calendar.</UndoBar>
        : scheduled ? <p className="muted"><Check size={14} className="ok" aria-hidden /> Scheduled. It’s in your calendar.</p> : null}
    </>
  )
}

function IrisResult() {
  const { s } = useStore()
  const h = s.handoffs.find(x => x.id === DAY1_IDS.iris) ?? s.desk.done.find(x => x.id === DAY1_IDS.iris)?.h
  if (!h) return null
  const best = [...PILLAR_PERF].sort((a, b) => b.er - a.er)[0]
  return (
    <>
      <p className="onb-result-title">{h.title}</p>
      <p className="muted">{h.context}</p>
      <figure className="onb-chart">
        <figcaption className="muted t-sm">Engagement rate by theme, last 90 days</figcaption>
        <HBars items={PILLAR_PERF.map(p => ({ label: p.pillar, value: p.er }))} format={v => `${v}%`} highlight={best.pillar} color="var(--a-iris)" />
      </figure>
    </>
  )
}

function Plain({ id, where }: { id: string; where: string }) {
  const { s } = useStore()
  const h = s.handoffs.find(x => x.id === id) ?? s.desk.done.find(x => x.id === id)?.h
  if (!h) return null
  const lines = h.preview?.type === 'plan' ? h.preview.lines : undefined
  return (
    <>
      <p className="onb-result-title">{h.title}</p>
      <p className="muted">{h.context}</p>
      {lines && <ul className="onb-lines">{lines.map(l => <li key={l}>{l}</li>)}</ul>}
      <p className="onb-where">{s.handoffs.some(x => x.id === id) ? `On your Desk, in ${where}.` : 'Settled on your Desk.'}</p>
    </>
  )
}
