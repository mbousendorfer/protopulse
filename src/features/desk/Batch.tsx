import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { AgentId, Handoff, Urgency } from '../../app/types'
import { useStore } from '../../app/store'
import { NETWORK_LABEL } from '../../data/agents'
import { Btn, Mark, Net, Pill, Sheet, Tabs, TopicIcon } from '../../ui'
import HandoffCard from './HandoffCard'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { draftText } from './parts'

export type BatchId = 'nova' | 'atlas' | 'rules'
export type Batch = {
  id: BatchId
  agent: AgentId
  title: string
  meta: string
  items: Handoff[]
  ready: Handoff[]
  urgency: Urgency
  verb: { one: string; many: (n: number) => string; done: (n: number) => string }
}

const flagged = (h: Handoff) => {
  const p = h.preview
  const parts = p?.type === 'reply' ? p.draft : p?.type === 'post' ? p.text : []
  return parts.some(x => typeof x !== 'string')
}
const isLead = (h: Handoff) => /intent|lead|which bag|buy/i.test(`${h.topic} ${h.title}`)
const worst = (xs: Handoff[]): Urgency => (xs.some(h => h.urgency === 'urgent') ? 'urgent' : xs.some(h => h.urgency === 'today') ? 'today' : 'week')

/** Group similar Desk cards so they can be approved in one go. Only groups of 2 or more become a batch. */
export function batchesOf(open: Handoff[]): { batches: Batch[]; rest: Handoff[] } {
  const defs: { id: BatchId; agent: AgentId; match: (h: Handoff) => boolean; ready: (h: Handoff) => boolean; title: (n: number) => string; meta: (xs: Handoff[], r: number) => string; verb: Batch['verb'] }[] = [
    {
      id: 'nova', agent: 'nova', match: h => h.agent === 'nova' && h.kind === 'approval' && h.preview?.type === 'reply' && !h.proposal,
      ready: h => h.confidence >= 80 && !flagged(h),
      title: n => `${n} replies Nova drafted`, meta: (xs, r) => [xs.filter(isLead).length ? `${xs.filter(isLead).length} want to buy` : '', `${r} ready to send`].filter(Boolean).join(' · '),
      verb: { one: 'Send', many: n => `Send ${n} ready`, done: n => `Sent ${n} replies Nova drafted` },
    },
    {
      id: 'atlas', agent: 'atlas', match: h => h.kind === 'approval' && h.preview?.type === 'post' && !h.proposal,
      ready: h => h.confidence >= 75 && !flagged(h),
      title: n => `${n} posts to approve`, meta: (_xs, r) => `${r} ready to schedule`,
      verb: { one: 'Schedule', many: n => `Schedule ${n} ready`, done: n => `Scheduled ${n} posts Atlas drafted` },
    },
    {
      id: 'rules', agent: 'nova', match: h => !!h.proposal,
      ready: () => true,
      title: n => `${n} Playbook rules proposed`, meta: xs => `Learned from your edits · ${[...new Set(xs.map(h => h.agent))].map(a => a[0].toUpperCase() + a.slice(1)).join(', ')}`,
      verb: { one: 'Add', many: n => `Add ${n} rules`, done: n => `Added ${n} rules to the Playbook` },
    },
  ]
  let rest = open
  const batches: Batch[] = []
  for (const def of defs) {
    const items = rest.filter(h => !h.lane && def.match(h))
    if (items.length < 2) continue
    rest = rest.filter(h => !items.includes(h))
    const ready = items.filter(def.ready)
    batches.push({ id: def.id, agent: def.agent, title: def.title(items.length), meta: def.meta(items, ready.length), items, ready, urgency: worst(items), verb: def.verb })
  }
  return { batches, rest }
}

type Lane = 'all' | 'leads' | 'ready' | 'decide'

export default function BatchDetail({ b, onBulk }: { b: Batch; onBulk: () => void }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const [review, setReview] = useState<Lane | null>(null)
  const decide = b.items.filter(h => !b.ready.includes(h))
  const leads = b.items.filter(isLead)
  const hidden = ((s.inbox as { convs?: { status: string }[] }).convs ?? []).filter(c => c.status === 'hidden').length

  const bulk = (items: Handoff[], summary: string) => {
    if (!items.length) return
    d({ type: 'core/bulk', ids: items.map(h => h.id), decision: { kind: 'approve' }, summary, agent: b.agent })
    onBulk()
  }

  const lanes: { id: Lane; label: string; count: number; note: string; action?: { label: string; run: () => void } }[] =
    b.id === 'nova' ? [
      { id: 'leads', label: 'Leads', count: leads.length, note: leads.length ? 'People asking before they buy' : 'No buying questions right now', action: leads.filter(h => b.ready.includes(h)).length ? { label: `Send ${leads.filter(h => b.ready.includes(h)).length}`, run: () => bulk(leads.filter(h => b.ready.includes(h)), `Sent ${leads.filter(h => b.ready.includes(h)).length} lead replies`) } : undefined },
      { id: 'ready', label: 'Ready', count: b.ready.length, note: 'Sure of the facts and the tone', action: b.ready.length ? { label: b.verb.many(b.ready.length), run: () => bulk(b.ready, b.verb.done(b.ready.length)) } : undefined },
      { id: 'decide', label: 'To decide', count: decide.length, note: 'Nova marked a passage she’s unsure about' },
    ] : b.id === 'atlas' ? [
      { id: 'ready', label: 'Ready', count: b.ready.length, note: 'Checked against the Playbook', action: b.ready.length ? { label: b.verb.many(b.ready.length), run: () => bulk(b.ready, b.verb.done(b.ready.length)) } : undefined },
      { id: 'decide', label: 'To decide', count: decide.length, note: 'Atlas marked a passage to check' },
    ] : [
      { id: 'all', label: 'Proposed', count: b.items.length, note: 'Each rule comes from edits you repeated', action: { label: b.verb.many(b.items.length), run: () => bulk(b.items, b.verb.done(b.items.length)) } },
    ]

  const shown = review === 'leads' ? leads : review === 'ready' ? b.ready : review === 'decide' ? decide : b.items

  return (
    <article className="detail batch" aria-label={b.title}>
      <div className="handoff-top">
        <div className="slip"><span className="chain">{[...new Set(b.items.map(h => h.agent))].map(a => <Mark key={a} agent={a} />)}</span><span><b>{b.id === 'rules' ? 'Your agents' : b.agent === 'nova' ? 'Nova' : 'Atlas'}</b> {b.id === 'rules' ? 'suggest rules' : 'prepared a batch'}</span><span className="faint">· {b.items.length} items</span></div>
        {b.urgency === 'urgent' ? <Pill tone="alert" dot>Has urgent</Pill> : b.urgency === 'today' ? <Pill tone="caution">Today</Pill> : <Pill>This week</Pill>}
      </div>
      <h2 className="detail-title">{b.title}</h2>
      <p className="handoff-ctx">{b.meta}. {b.id === 'nova' ? 'Nova sorted them: buying questions first, then the replies she’s sure of, then the ones to check.' : b.id === 'atlas' ? 'Atlas checked each one against the Playbook and Sage’s cadence.' : 'Add them all, or review them one by one.'}</p>

      <div className="lanes">
        {lanes.map(l => (
          <section key={l.id} className={`lane-card ${l.id === 'ready' || l.id === 'all' ? 'main' : ''}`} style={{ ['--agent' as string]: `var(--a-${b.agent})`, ['--agent-wash' as string]: `var(--a-${b.agent}-wash)`, ['--agent-ink' as string]: `var(--a-${b.agent}-ink)` }}>
            <div className="faint">{l.label}</div>
            <b className="num">{l.count}</b>
            <p className="faint">{l.note}</p>
            <div className="row">
              {l.action && <Btn size="sm" variant="primary" onClick={l.action.run}>{l.action.label}</Btn>}
              {l.count > 0 && <Btn size="sm" onClick={() => setReview(l.id)}>Review</Btn>}
            </div>
          </section>
        ))}
        {b.id === 'nova' && (
          <section className="lane-card">
            <div className="faint">Spam</div>
            <b className="num">{hidden}</b>
            <p className="faint">Hidden by Nova on her own, set to Act</p>
            <div className="row"><Btn size="sm" onClick={() => nav('/inbox')}>See them</Btn></div>
          </section>
        )}
      </div>

      <ul className="batch-rows">
        {b.items.slice(0, 6).map(h => (
          <li key={h.id}>
            {h.preview?.type === 'reply' ? <SocialAvatar name={h.preview.author.split(' · ')[0]} network={h.preview.network} size={24} /> : h.preview?.type === 'post' ? <Net n={h.preview.network} /> : <TopicIcon agent={h.agent} kind={h.kind} topic={h.topic} size={22} />}
            <span className="ellipsis">“{h.proposal?.text ?? (h.preview?.type === 'reply' ? h.preview.text : draftText(h)) ?? h.title}”</span>
            <span className="faint">{h.proposal ? 'rule' : b.ready.includes(h) ? (h.preview?.type === 'post' ? `ready · ${NETWORK_LABEL[h.preview.network]}` : 'reply ready') : 'to decide'}</span>
          </li>
        ))}
        {b.items.length > 6 && <li className="faint">and {b.items.length - 6} more</li>}
      </ul>

      <footer className="detail-foot">
        <span className="faint">Nothing goes out until you confirm.</span>
        <span className="spacer" />
        <Btn size="sm" variant="ghost" onClick={() => setReview('all')}>Review one by one</Btn>
        {b.id === 'nova' && <Btn size="sm" variant="ghost" onClick={() => nav('/inbox')}><ArrowUpRight size={14} />Inbox</Btn>}
        {b.ready.length > 0 && b.id !== 'rules' && <Btn variant="primary" onClick={() => bulk(b.ready, b.verb.done(b.ready.length))}>{b.verb.many(b.ready.length)}</Btn>}
      </footer>

      <Sheet open={!!review} onOpenChange={o => !o && setReview(null)} title={b.title} wide>
        <Tabs value={review ?? 'all'} onChange={v => setReview(v)} items={[
          { value: 'all' as Lane, label: 'All', count: b.items.length },
          ...(b.id === 'nova' ? [{ value: 'leads' as Lane, label: 'Leads', count: leads.length }] : []),
          ...(b.id !== 'rules' ? [{ value: 'ready' as Lane, label: 'Ready', count: b.ready.length }, { value: 'decide' as Lane, label: 'To decide', count: decide.length }] : []),
        ]} />
        <div className="cards">
          {shown.length ? shown.map(h => <HandoffCard key={h.id} h={h} onDiscuss={() => nav(h.link ?? '/')} />) : <p className="faint">Nothing left in this lane.</p>}
        </div>
      </Sheet>
    </article>
  )
}
