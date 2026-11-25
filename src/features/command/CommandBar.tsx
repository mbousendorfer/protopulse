import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, ArrowRight, BookPlus, Bot, Check, ChevronDown, CornerDownLeft, Focus, Keyboard, Pause, PenLine, Play, Target } from 'lucide-react'
import type { AgentId } from '../../app/types'
import type { State } from '../../app/state'
import { groupOf, type Action } from '../../app/reducer'
import { useStore } from '../../app/store'
import { hhmm } from '../../app/time'
import { pronoun } from '../../app/core'
import { validUrl } from '../video/slice'
import { AGENTS, agentName, NETWORK_LABEL } from '../../data/agents'
import { EXAMPLES, OWNER, draftPost, parse, type Intent } from '../../data/command'
import { Btn, Kbd, Mark, Menu, Thinking } from '../../ui'
import { Heatmap, HBars, LineChart } from '../../ui/charts'
import './command.css'

type Answer = { text: string; visual?: ReactNode; sources?: string[]; ctas?: { label: string; icon?: ReactNode; primary?: boolean; run: () => void }[]; after?: () => void }
type Run = { query: string; intent: Intent; agent: AgentId; phase: 'thinking' | 'streaming' | 'done'; words: number; answer: Answer }

const PAGES: { label: string; to: string; keywords?: string[] }[] = [
  { label: 'Desk', to: '/' }, { label: 'Inbox', to: '/inbox' }, { label: 'Publishing', to: '/publishing' }, { label: 'Insights', to: '/insights' },
  { label: 'Listening', to: '/listening' }, { label: 'Strategy', to: '/strategy' }, { label: 'Agents', to: '/agents' }, { label: 'Activity', to: '/activity' },
  { label: 'Shared rules', to: '/agents/rules', keywords: ['Playbook'] }, { label: 'Escalation', to: '/agents/escalation' }, { label: 'Settings', to: '/settings' },
]

export default function CommandBar({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: string }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [run, setRun] = useState<Run | null>(null)
  const timers = useRef<number[]>([])

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => { if (!open) { clear(); setRun(null); setQ('') } }, [open])
  useEffect(() => clear, [])

  const close = () => onOpenChange(false)
  const go = (to: string) => { close(); nav(to) }

  const start = (query: string, forceAgent?: AgentId) => {
    clear()
    const { intent, forced } = parse(query)
    const agent = forceAgent ?? forced ?? OWNER[intent.kind]
    const answer = respond(intent, agent, s, d, go, query, x => start(x))
    d({ type: 'core/track', kind: 'command', detail: { text: query, intent: intent.kind, agent } })
    setRun({ query, intent, agent, phase: 'thinking', words: 0, answer })
    setQ('')
    const total = answer.text.split(' ').length
    timers.current.push(window.setTimeout(() => {
      setRun(r => r && { ...r, phase: 'streaming' })
      const tick = (n: number) => {
        setRun(r => r && { ...r, words: n, phase: n >= total ? 'done' : 'streaming' })
        if (n < total) timers.current.push(window.setTimeout(() => tick(n + 1), 26))
        else answer.after?.()
      }
      tick(1)
    }, 700))
  }

  const agentLabel = (id: AgentId) => s.agents.find(a => a.id === id)!
  const typedIntent = q.trim() ? parse(q) : null
  const typedAgent = typedIntent ? typedIntent.forced ?? OWNER[typedIntent.intent.kind] : 'atlas'

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="cmdk-modal" aria-describedby={undefined} onEscapeKeyDown={e => { if (run) { e.preventDefault(); clear(); setRun(null) } }}>
          <Dialog.Title className="sr-only">Command bar</Dialog.Title>
          <Command label="Ask or brief an agent" loop shouldFilter={!run}>
            <div className="cmdk-input">
              {run ? <Btn size="sm" variant="ghost" icon aria-label="Back to commands" onClick={() => { clear(); setRun(null) }}><ArrowLeft size={14} /></Btn> : <Bot size={16} className="faint" aria-hidden />}
              <Command.Input value={q} onValueChange={setQ} autoFocus placeholder={run ? 'Ask a follow-up or brief another agent…' : 'Ask or brief an agent…'}
                onKeyDown={e => { if (run && e.key === 'Enter' && q.trim()) { e.preventDefault(); start(q) } }} />
              <Kbd>Esc</Kbd>
            </div>

            {run ? <AnswerView run={run} agentName={agentLabel(run.agent).name} onReroute={a => start(run.query, a)} /> : (
              <Command.List className="cmdk-list">
                <Command.Empty>No command matches. Press Enter to brief an agent.</Command.Empty>
                {q.trim() && (
                  <Command.Group heading="Brief an agent">
                    <Command.Item value={`__brief ${q}`} forceMount onSelect={() => start(q)} className="cmdk-item brief">
                      <Mark agent={typedAgent} />
                      <span className="ellipsis"><b>{agentName(typedAgent)}</b> · “{q}”</span>
                      <span className="hint row tight"><CornerDownLeft size={12} />Send</span>
                    </Command.Item>
                  </Command.Group>
                )}
                <Command.Group heading="Try asking">
                  {EXAMPLES.map(x => {
                    const p = parse(x)
                    const a = p.forced ?? OWNER[p.intent.kind]
                    return <Command.Item key={x} value={x} onSelect={() => start(x)} className="cmdk-item"><Mark agent={a} /><span className="ellipsis">{x}</span></Command.Item>
                  })}
                </Command.Group>
                <Command.Group heading="Actions">
                  <Command.Item value="process desk focus" onSelect={() => go('/focus')} className="cmdk-item"><Focus size={14} />Process the Desk in Focus<span className="hint">F</span></Command.Item>
                  <Command.Item value="new post write compose" onSelect={() => go('/publishing/new')} className="cmdk-item"><PenLine size={14} />New post</Command.Item>
                  <Command.Item value="new campaign brief strategy" onSelect={() => go('/strategy/new')} className="cmdk-item"><Target size={14} />New campaign brief</Command.Item>
                  <Command.Item value="keyboard shortcuts help" onSelect={() => { close(); setTimeout(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true })), 50) }} className="cmdk-item"><Keyboard size={14} />Keyboard shortcuts<span className="hint">?</span></Command.Item>
                  {s.agents.map(a => (
                    <Command.Item key={a.id} value={`${a.status === 'on' ? 'pause' : 'resume'} ${a.name}`} className="cmdk-item"
                      onSelect={() => { d({ type: 'core/agentStatus', agent: a.id, status: a.status === 'on' ? 'paused' : 'on' }); close() }}>
                      {a.status === 'on' ? <Pause size={14} /> : <Play size={14} />}{a.status === 'on' ? 'Pause' : 'Resume'} {a.name}<span className="hint">{a.dept}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group heading="Go to">
                  {PAGES.map(p => <Command.Item key={p.to} value={`go ${p.label}`} keywords={p.keywords} onSelect={() => go(p.to)} className="cmdk-item"><ArrowRight size={14} />{p.label}</Command.Item>)}
                  {AGENTS.map(a => <Command.Item key={a.id} value={`agent profile ${a.name} ${a.dept}`} onSelect={() => go(`/agents/${a.id}`)} className="cmdk-item"><Mark agent={a.id} />{a.name}’s profile<span className="hint">{a.dept}</span></Command.Item>)}
                </Command.Group>
              </Command.List>
            )}
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function AnswerView({ run, agentName: name, onReroute }: { run: Run; agentName: string; onReroute: (a: AgentId) => void }) {
  const words = run.answer.text.split(' ')
  return (
    <div className="cmdk-answer" aria-live="polite">
      <div className="cmdk-q"><span className="avatar sm">SR</span><p>{run.query}</p></div>
      <div className="cmdk-route mono">
        <span className="faint">Routed to</span>
        <Menu align="start" trigger={<button className="route-btn"><Mark agent={run.agent} />{name}<ChevronDown size={12} /></button>}
          items={[{ heading: 'Send to another agent' }, ...AGENTS.filter(a => a.id !== run.agent).map(a => ({ label: `${a.name} · ${a.dept}`, icon: <Mark agent={a.id} />, onSelect: () => onReroute(a.id) }))]} />
        {OWNER[run.intent.kind] !== run.agent && <span className="faint">· not {name}’s usual job</span>}
      </div>
      {run.phase === 'thinking' ? <Thinking label={THINK[run.agent]} /> : (
        <div className="cmdk-reply">
          <p>{words.slice(0, run.words).join(' ')}{run.phase === 'streaming' && <span className="caret" aria-hidden />}</p>
          {run.phase === 'done' && run.answer.visual && <div className="cmdk-visual">{run.answer.visual}</div>}
          {run.phase === 'done' && run.answer.sources && <p className="cmdk-sources faint">Sources: {run.answer.sources.join(' · ')}</p>}
          {run.phase === 'done' && run.answer.ctas && <Ctas key={run.answer.text} ctas={run.answer.ctas} />}
        </div>
      )}
    </div>
  )
}

const THINK: Record<AgentId, string> = {
  nova: 'Nova is checking the inbox and the Playbook…', atlas: 'Atlas is reading the calendar and the Playbook…', iris: 'Iris is pulling the numbers…',
  echo: 'Echo is scanning competitors and mentions…', sage: 'Sage is reading the plan and the pillars…', juno: 'Juno is watching the latest videos…',
}

/** The scripted answer for one intent. `go` navigates and closes the bar. */
function respond(i: Intent, agent: AgentId, s: State, d: (a: Action) => void, go: (to: string) => void, query: string, ask: (q: string) => void): Answer {
  const owner = OWNER[i.kind]
  const pass = agent !== owner && i.kind !== 'unknown' ? `That’s usually ${agentName(owner)}’s job, so I’ve looped ${agentName(owner)} in. ` : ''
  const a = answerFor(i, s, d, go, query, ask)
  return { ...a, text: pass + a.text }
}

function answerFor(i: Intent, s: State, d: (a: Action) => void, go: (to: string) => void, query: string, ask: (q: string) => void): Answer {
  switch (i.kind) {
    case 'post': {
      const text = draftPost(i.topic, i.network)
      return {
        text: `Drafted a ${NETWORK_LABEL[i.network]} post on “${i.topic}” for ${i.slot}, the best slot this week. It follows the Playbook: one call to action, one emoji max. It’s on your Desk for approval.`,
        visual: <div className="well cmdk-post"><div className="faint t-xs">{NETWORK_LABEL[i.network]} · {i.slot}</div><p>{text}</p></div>,
        after: () => d({ type: 'playbook/briefAtlas', title: `${NETWORK_LABEL[i.network]} post: ${i.topic}`, network: i.network, slot: i.slot, text, brief: query }),
        ctas: [{ label: 'Open the Desk', primary: true, run: () => go('/') }, { label: 'Open Publishing', run: () => go('/publishing') }],
      }
    }
    case 'tiktok':
      return {
        text: 'TikTok had a weak week: 1,840 views per video on average, down 38% from 2,970 the week before. All 4 videos since Thursday open on the product for 4 to 6 seconds before anything happens. Trailkind’s best reels hook in 2. I’d test 3-second hooks this week.',
        visual: <LineChart label="TikTok views per video, last 10 days" labels={['15', '16', '17', '18', '19', '20', '21', '22', '23', '24']} series={[{ name: 'Views per video', data: [8200, 9100, 10400, 8800, 9600, 7900, 2100, 1900, 1700, 1800] }]} h={150} />,
        sources: ['TikTok analytics, 15–24 Nov', '4 videos since Thu 20 Nov'],
        ctas: [{ label: 'Ask Atlas to test hooks', primary: true, run: () => d({ type: 'playbook/briefAtlas', title: 'TikTok: test 3-second hooks', network: 'tiktok', slot: 'Thu 27, 18:00', text: 'Bag vs. downpour, 3 seconds in. Spoiler: the laptop stays dry.', brief: 'Test 3-second hooks on TikTok' }) }, { label: 'Open Insights', run: () => go('/insights') }],
      }
    case 'besttime': {
      const best = { instagram: ['Friday 18:30', 4, 5], linkedin: ['Tuesday 08:30', 1, 1], tiktok: ['Thursday 18:00', 3, 5] }[i.network] as [string, number, number]
      const values = Array.from({ length: 7 }, (_, r) => Array.from({ length: 6 }, (_, c) => Math.max(0.08, 0.65 - Math.abs(r - best[1]) * 0.12 - Math.abs(c - best[2]) * 0.1 + ((r * 7 + c * 3) % 5) * 0.03)))
      values[best[1]][best[2]] = 1
      return {
        text: `Best slot on ${i.network === 'linkedin' ? 'LinkedIn' : i.network === 'tiktok' ? 'TikTok' : 'Instagram'}: ${best[0]}. Posts in that slot got 2.1× the median reach over the last 90 days. Atlas already uses it for the plan.`,
        visual: <Heatmap label="Reach by day and hour" rows={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} cols={['08', '10', '12', '14', '16', '18']} values={values} best={[best[1], best[2]]} />,
        sources: ['Native analytics, last 90 days', '312 posts'],
        ctas: [{ label: 'Open Insights', run: () => go('/insights') }],
      }
    }
    case 'compare':
      return {
        text: 'Carousels win on saves, reels win on reach. Over 30 days, carousels averaged a 4.2% engagement rate against 2.9% for reels, but reels reached 2.4× more people. For sales posts, carousels convert better: 1.8% link clicks against 0.9%.',
        visual: <HBars items={[{ label: 'Carousels · engagement', value: 4.2 }, { label: 'Reels · engagement', value: 2.9 }, { label: 'Carousels · clicks', value: 1.8 }, { label: 'Reels · clicks', value: 0.9 }]} format={v => `${v}%`} />,
        sources: ['Instagram analytics, 26 Oct – 24 Nov', '18 carousels, 22 reels'],
        ctas: [{ label: 'Open Insights', run: () => go('/insights') }],
      }
    case 'performance':
      return {
        text: 'Last 7 days: reach 412k, up 8% on the week before. Engagement rate 3.1%, up 0.4 points. 1,204 replies handled, 91% by Nova, with a median reply time of 4 minutes. The one dip is TikTok views per video, down 38%.',
        visual: <LineChart label="Reach per day, last 2 weeks" labels={['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24']} h={140}
          series={[{ name: 'This week', data: [52, 55, 58, 61, 57, 60, 63, 58, 61, 59, 64, 62, 60, 66].map(x => x * 1000) }, { name: 'Previous', dashed: true, tone: 'faint', data: [49, 51, 53, 55, 52, 54, 56, 53, 55, 54, 57, 55, 54, 58].map(x => x * 1000) }]} />,
        sources: ['Native analytics, 18–24 Nov vs 11–17 Nov'],
        ctas: [{ label: 'Read the weekly report', run: () => go('/insights') }],
      }
    case 'competitor': {
      const peak = /peak/.test(i.name)
      return {
        text: peak
          ? 'Peakline cut the Aero 30 to €99 overnight, −29%. It’s their direct rival to the Ridge. Comments under their post are mixed: 31% ask about durability. I suggest not matching the price and posting about how long the Ridge lasts instead.'
          : `This week: Peakline cut the Aero 30 to €99, Trailkind’s “bag vs. rain” reel hit 1.2M views, Norrø announced lifetime repairs, and Basecamp Co. recalled 8,000 bottles. ${i.name === 'competitors' ? '' : `Most of the noise around ${i.name} is in the Events feed.`}`,
        sources: ['Competitor accounts, Instagram and LinkedIn', 'Echo’s event feed, last 7 days'],
        ctas: [{ label: 'Open competitor events', primary: true, run: () => go('/listening/competitors') }],
      }
    }
    case 'pause':
      return {
        text: `Done. ${agentName(i.agent)} is paused${i.until ? ` until ${i.until}` : ''}. Nothing it would have published will go out, and its cards stay on your Desk.`,
        after: () => d({ type: 'core/agentStatus', agent: i.agent, status: 'paused', until: i.until }),
        ctas: [{ label: `Resume ${agentName(i.agent)}`, run: () => d({ type: 'core/agentStatus', agent: i.agent, status: 'on' }) }],
      }
    case 'resume':
      return { text: `${agentName(i.agent)} is back on shift.`, after: () => d({ type: 'core/agentStatus', agent: i.agent, status: 'on' }) }
    case 'rule': {
      const exists = s.playbook.rules.some(r => r.text.toLowerCase() === i.rule.toLowerCase())
      return {
        text: exists ? `That rule is already in the Playbook: “${i.rule}”.` : `Understood. As a rule for ${agentName(i.agent)}: “${i.rule}”. Add it to the Playbook so every draft follows it?`,
        ctas: exists ? [{ label: `Open ${agentName(i.agent)}’s rules`, run: () => go(`/agents/${i.agent}?tab=rules`) }] : [
          { label: 'Add to Playbook', icon: <BookPlus size={14} />, primary: true, run: () => d({ type: 'playbook/addRule', kind: 'dont', text: i.rule, agents: [i.agent], origin: 'Added by you from the command bar' }) },
          { label: `Open ${agentName(i.agent)}’s rules`, run: () => go(`/agents/${i.agent}?tab=rules`) },
        ],
      }
    }
    case 'campaign':
      return {
        text: `Got the brief. I’m opening Strategy to turn “${i.brief}” into a campaign plan: goal, phases, posts and who does what.`,
        after: () => setTimeout(() => go(`/strategy/new?brief=${encodeURIComponent(i.brief)}&auto=1`), 600),
      }
    case 'needs': {
      const open = s.handoffs.filter(h => !h.lane && groupOf(h) === 'need')
      const urgent = open.filter(h => h.urgency === 'urgent')
      const claire = s.handoffs.filter(h => h.lane === 'claire').length
      return {
        text: open.length
          ? `${open.length} card${open.length > 1 ? 's' : ''} need you${urgent.length ? `, ${urgent.length} urgent: ${urgent.map(h => h.title).join('; ')}` : ''}. ${claire ? `${claire} more wait on Claire.` : ''} In Focus mode that’s about ${Math.max(2, Math.round(open.length * 0.4))} minutes.`
          : 'Nothing needs you right now. Your agents have it from here.',
        visual: open.length ? <ul className="cmdk-list-mini">{open.slice(0, 5).map(h => <li key={h.id}><Mark agent={h.agent} /><span className="ellipsis">{h.title}</span>{h.urgency === 'urgent' && <span className="pill alert">Urgent</span>}</li>)}</ul> : undefined,
        ctas: open.length ? [{ label: 'Process in Focus', icon: <Focus size={14} />, primary: true, run: () => go('/focus') }, { label: 'Open the Desk', run: () => go('/') }] : [],
      }
    }
    case 'overnight': {
      const items = s.log.filter(l => l.agent === i.agent && l.at >= s.brief.since).slice(0, 6)
      return {
        text: items.length ? `Since ${hhmm(s.brief.since)} yesterday, ${agentName(i.agent)} did ${items.length} thing${items.length > 1 ? 's' : ''} on ${pronoun(i.agent)} own. Here are the latest.` : `${agentName(i.agent)} didn’t act alone since ${hhmm(s.brief.since)} yesterday.`,
        visual: items.length ? <ul className="cmdk-list-mini">{items.map(l => <li key={l.id}><span className="mono faint">{hhmm(l.at)}</span><span className="ellipsis">{l.text}</span>{l.status === 'undone' && <span className="faint">undone</span>}</li>)}</ul> : undefined,
        ctas: [{ label: 'Open Activity', run: () => go('/activity') }],
      }
    }
    case 'reply':
      return i.convo
        ? { text: `Opening the conversation with ${i.name.charAt(0).toUpperCase() + i.name.slice(1)}. Nova’s draft is ready if you want it.`, after: () => setTimeout(() => go(`/inbox/${i.convo}`), 500) }
        : { text: `I couldn’t find a conversation with “${i.name}” in the last 30 days. Try their handle, or search the Inbox.`, ctas: [{ label: 'Open the Inbox', run: () => go('/inbox') }] }
    case 'mentions':
      return {
        text: 'This week: 14 negative mentions out of 388, 3.6%. Most are about the Storm Jacket seams thread on Reddit and late deliveries. Opening Listening filtered on negative.',
        sources: ['Echo’s mention feed, 18–24 Nov'],
        after: () => setTimeout(() => go('/listening/mentions?sentiment=negative'), 700),
      }
    case 'clip': {
      if (i.url) {
        const u = validUrl(i.url)
        if (!u) return { text: 'That link doesn’t look right. Paste the full address, starting with https://.', ctas: [{ label: 'Open Video', run: () => go('/video/sources') }] }
        return { text: `Juno is opening the video from ${u.hostname.replace(/^www\./, '')}. Its clips land in Video in about 40 seconds, and nothing goes out until you send them to Atlas.`, after: () => d({ type: 'video/addLink', url: i.url! }), ctas: [{ label: 'Follow it in Video', primary: true, run: () => go('/video') }] }
      }
      const gr20 = s.video.sources.find(x => x.id === 'gr20')
      const ready = s.video.clips.filter(c => c.status === 'ready')
      if (!gr20) return { text: 'The latest video on your channel is “Storm Jacket: 3 days of GR20 rain”, published at 08:00. Juno is cutting it now: transcript, best moments, framing and captions.', after: () => d({ type: 'core/fire', eventId: 'ev-video-gr20' }), ctas: [{ label: 'Follow it in Video', primary: true, run: () => go('/video') }] }
      return {
        text: `Juno already cut the latest video, “${gr20.title}”. ${ready.length} clip${ready.length === 1 ? ' is' : 's are'} ready to review.`,
        visual: ready.length ? <ul className="cmdk-list-mini">{ready.slice(0, 5).map(c => <li key={c.id}><Mark agent="juno" /><span className="ellipsis">{c.title}</span></li>)}</ul> : undefined,
        ctas: [{ label: 'Review the clips', primary: true, run: () => go('/video') }],
      }
    }
    case 'unknown':
      return {
        text: 'I’m not sure what you mean. I can draft posts, answer questions about performance, check competitors or change how agents work. Try one of these:',
        ctas: [
          { label: 'How did TikTok do last week?', run: () => ask('How did TikTok do last week?') },
          { label: 'What needs me today?', run: () => ask('What needs me today?') },
          { label: 'What is Peakline up to?', run: () => ask('What is Peakline up to?') },
        ],
      }
  }
}


/** Answer buttons run once: after a click the button says it's done, so a second click can't add a duplicate card. */
function Ctas({ ctas }: { ctas: NonNullable<Answer['ctas']> }) {
  const [used, setUsed] = useState<string[]>([])
  return (
    <div className="row">
      {ctas.map(c => used.includes(c.label)
        ? <Btn key={c.label} size="sm" disabled><Check size={14} />Done</Btn>
        : <Btn key={c.label} size="sm" variant={c.primary ? 'primary' : 'secondary'} onClick={() => { c.run(); setUsed(u => [...u, c.label]) }}>{c.icon}{c.label}</Btn>)}
    </div>
  )
}
