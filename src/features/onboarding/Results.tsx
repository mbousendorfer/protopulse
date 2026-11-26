import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Clock, Send } from 'lucide-react'
import { useNow, useStore } from '../../app/store'
import type { AgentId } from '../../app/types'
import { groupOf } from '../../app/reducer'
import { hhmm } from '../../app/time'
import { agentName } from '../../data/agents'
import { Btn, Mark, Net, Thinking } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import { ConnectModal } from './Connect'
import { Foot, Head, useElapsed } from './parts'
import { DAY1_IDS, QUESTIONS, firstBriefAt } from './day1'
import { publishNet } from './model'

const SENT = (n: number) => `Sent ${n} ${n > 1 ? 'replies' : 'reply'} Nova drafted`
const slot = (t: number) => `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}, ${hhmm(t)}`

/** First results, honest: what's ready now, and what takes hours with the time it lands. Also reachable from the Desk. */
export default function Results({ onDone }: { onDone: () => void }) {
  const { s } = useStore()
  const nova = QUESTIONS.filter(q => s.handoffs.some(h => h.id === q.id) || s.desk.done.some(x => x.id === q.id) || s.inbox.convs.find(c => c.id === q.conv)?.status === 'auto').length
  const waiting = s.handoffs.filter(h => !h.lane && groupOf(h) === 'need').length
  return (
    <section className="onb-step">
      <Head title="Your team’s first results" lede="Some work is ready now. What takes hours says when it lands. Nothing goes out without you." />
      <div className="onb-group">
        <h2>Ready now</h2>
        <ol className="onb-cards">
          <Result agent="atlas" got="3 first drafts"><AtlasResult /></Result>
          {nova > 0 && <Result agent="nova" got={`${nova} ${nova > 1 ? 'replies' : 'reply'}`}><NovaResult /></Result>}
        </ol>
      </div>
      <Later />
      <Foot note={waiting ? `${waiting} thing${waiting > 1 ? 's' : ''} need${waiting > 1 ? '' : 's'} you on your Desk` : undefined}>
        <Btn variant="primary" onClick={onDone}>Open my Desk<ArrowRight size={14} /></Btn>
      </Foot>
    </section>
  )
}

function Result({ agent, got, children }: { agent: AgentId; got: string; children: ReactNode }) {
  return (
    <li className="card onb-result">
      <header><Mark agent={agent} size="md" /><b>{agentName(agent)}</b><span className="muted t-sm">· {got}</span></header>
      <div className="onb-result-body">{children}</div>
    </li>
  )
}

function AtlasResult() {
  const { s, d } = useStore()
  const now = useNow(1000)
  const [connecting, setConnecting] = useState(false)
  // Writing takes a moment, for real: the drafts appear once, the first time this screen opens.
  const seen = s.setup.seen.includes('results-atlas')
  const written = useElapsed(1800, seen) >= 1800
  useEffect(() => { if (written && !seen) d({ type: 'setup/seen', path: 'results-atlas' }) }, [written]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!written) return <Thinking label="Atlas is writing from your Playbook…" />
  const net = publishNet(s.setup.connected)
  return (
    <>
      <p className="onb-result-title">Atlas wrote 3 drafts from your website and your Playbook.</p>
      {!net && (
        <div className="onb-block">
          <p>Pick the account these posts publish on. You don’t have one connected yet, so these drafts are a preview you can’t schedule.</p>
          <Btn variant="primary" onClick={() => setConnecting(true)}>Connect to schedule</Btn>
        </div>
      )}
      <ul className="onb-replies">
        {s.setup.drafts.map(x => (
          <li key={x.id} className="onb-post">
            <span className="onb-a-by">{net && <Net n={net} size={14} />}{x.status === 'scheduled' ? `Scheduled for ${slot(x.at)}` : `Draft for ${slot(x.at)}`}</span>
            <p>{x.text}</p>
            {net && x.status === 'draft' && <div className="row"><Btn size="sm" onClick={() => d({ type: 'setup/schedule', id: x.id })}>Schedule for {slot(x.at)}</Btn></div>}
            {x.status === 'scheduled' && (x.undoUntil && x.undoUntil > now
              ? <UndoBar until={x.undoUntil} onUndo={() => d({ type: 'setup/schedule', id: x.id, undo: true })}>Scheduled. It’s in your calendar.</UndoBar>
              : <p className="muted"><Check size={14} className="ok" aria-hidden /> Scheduled. It’s in your calendar.</p>)}
          </li>
        ))}
      </ul>
      <ConnectModal open={connecting} onOpenChange={setConnecting} why="Atlas needs an account to publish on before it can schedule a draft." />
    </>
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
      <p className="onb-result-title">{alone ? `${qs.length} messages were waiting in your imported Inbox. Nova answered them on her own.` : `${qs.length} message${qs.length > 1 ? 's were' : ' was'} waiting in your imported Inbox. Nova wrote the replies.`}</p>
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

/** What takes real time: the backfill, the import, tomorrow's brief. Each says when it lands, then that it landed. */
function Later() {
  const { s } = useStore()
  const nav = useNavigate()
  const now = useNow(5000)
  const st = s.setup
  const connected = st.connected.length > 0
  const pending = (id: string) => st.pending.find(p => p.id === id)
  const landed = (id: string) => s.handoffs.some(h => h.id === id) || s.desk.done.some(x => x.id === id)
  const briefAt = firstBriefAt(st.startedAt ?? now)
  const rows: { agent: AgentId; what: string; when: ReactNode; ready?: boolean; to?: string }[] = []
  const nova = pending('nova')
  if (nova) rows.push({ agent: 'nova', what: 'Replies to the messages your Inbox imports', when: `In about 10 minutes · around ${hhmm(nova.at)}` })
  const echo = pending('echo')
  rows.push({ agent: 'echo', what: 'First competitor topics',
    ...(echo ? { when: `In about 2 hours, after the backfill · around ${hhmm(echo.at)}` }
      : landed('h-peakline') ? { when: 'Ready', ready: true, to: '/?card=h-peakline' }
      : connected ? { when: 'Started. Topics show up in Listening as Echo finds them.', to: '/listening' } : { when: 'Needs a connected profile' }) })
  const iris = pending('iris')
  rows.push({ agent: 'iris', what: 'Your first report',
    ...(iris ? { when: `Later today, once your history is imported · around ${hhmm(iris.at)}` }
      : landed(DAY1_IDS.iris) ? { when: 'Ready', ready: true, to: `/?card=${DAY1_IDS.iris}` } : { when: 'Needs a connected profile: nothing to report on yet' }) })
  rows.push({ agent: 'iris', what: 'Your first morning brief', ...(now >= briefAt ? { when: 'Ready', ready: true, to: '/' } : { when: `Tomorrow at ${hhmm(briefAt)}` }) })
  return (
    <div className="onb-group">
      <h2>On its way</h2>
      <ul className="card rows onb-later">
        {rows.map(r => (
          <li key={r.what}>
            <Mark agent={r.agent} />
            <div className="grow"><b>{r.what}</b><p className={r.ready ? '' : 'muted'}>{r.ready ? <><Check size={14} aria-hidden className="ok" /> {r.when}</> : <><Clock size={14} aria-hidden /> {r.when}</>}</p></div>
            {r.to && <Btn size="sm" onClick={() => nav(r.to!)}>{r.ready ? 'Open' : 'Look'}</Btn>}
          </li>
        ))}
      </ul>
    </div>
  )
}
