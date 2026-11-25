import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import type { Handoff, Urgency } from '../../app/types'
import { registry } from '../../app/agents-registry'
import type { Batch, BatchDef } from '../../app/agent-module'
import { useStore } from '../../app/store'
import { NETWORK_LABEL, agentName } from '../../data/agents'
import { Btn, Mark, Net, Pill, Sheet, Tabs, TopicIcon } from '../../ui'
import HandoffCard from './HandoffCard'
import Detail from './Detail'
import { SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { NetworkPreview } from '../publishing/Previews'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { draftText, isLead } from './parts'

export type { Batch }

const worst = (xs: Handoff[]): Urgency => (xs.some(h => h.urgency === 'urgent') ? 'urgent' : xs.some(h => h.urgency === 'today') ? 'today' : 'week')

/** Playbook rules proposed by any agent: core, after the agents' own batches. */
const RULES: BatchDef = {
  id: 'rules', agent: 'nova', match: h => !!h.proposal,
  ready: () => true,
  title: n => `${n} Playbook rules proposed`, meta: xs => `Learned from your edits · ${[...new Set(xs.map(h => h.agent))].map(a => a[0].toUpperCase() + a.slice(1)).join(', ')}`,
  verb: { many: n => `Add ${n} to Playbook`, done: n => `Added ${n} rules to the Playbook` },
}

/** Group similar Desk cards so they can be approved in one go. Only groups of 2 or more become a batch. */
export function batchesOf(open: Handoff[]): { batches: Batch[]; rest: Handoff[] } {
  const defs = [...registry().flatMap(m => m.batches ?? []), RULES]
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

export default function BatchDetail({ b, onBulk, onDiscuss }: { b: Batch; onBulk: () => void; onDiscuss: (id: string) => void }) {
  const { s, d } = useStore()
  const nav = useNavigate()
  const [review, setReview] = useState<Lane | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  // Ready items start selected; the ones to decide wait for a look.
  const sel = useSelection(b.items.map(h => h.id), b.id)
  useEffect(() => { sel.set(b.ready.map(h => h.id)) }, [b.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = b.items.filter(h => sel.has(h.id))
  const decide = b.items.filter(h => !b.ready.includes(h))
  const leads = b.items.filter(isLead)
  const hidden = ((s.inbox as { convs?: { status: string }[] }).convs ?? []).filter(c => c.status === 'hidden').length

  const bulk = (items: Handoff[], summary: string) => {
    if (!items.length) return
    d({ type: 'core/bulk', ids: items.map(h => h.id), decision: { kind: 'approve' }, summary, agent: b.agent })
    onBulk()
  }

  // One primary per batch: the footer acts on the selection (ready items start selected); lanes only open a review.
  const lanes: { id: Lane; label: string; count: number; note: string }[] =
    b.id === 'nova' ? [
      { id: 'leads', label: 'Leads', count: leads.length, note: leads.length ? 'People asking before they buy' : 'No buying questions right now' },
      { id: 'ready', label: 'Ready', count: b.ready.length, note: 'Sure of the facts and the tone' },
      { id: 'decide', label: 'To decide', count: decide.length, note: 'Nova marked a passage she’s unsure about' },
    ] : b.id === 'atlas' ? [
      { id: 'ready', label: 'Ready', count: b.ready.length, note: 'Checked against the Playbook' },
      { id: 'decide', label: 'To decide', count: decide.length, note: 'Atlas marked a passage to check' },
    ] : [
      { id: 'all', label: 'Proposed', count: b.items.length, note: 'Each rule comes from edits you repeated' },
    ]

  const shown = review === 'leads' ? leads : review === 'ready' ? b.ready : review === 'decide' ? decide : b.items

  return (
    <article className="detail batch" aria-label={b.title}>
      <div className="handoff-top">
        <div className="slip"><span className="chain">{[...new Set(b.items.map(h => h.agent))].map(a => <Mark key={a} agent={a} />)}</span><span><b>{b.id === 'rules' ? 'Your agents' : agentName(b.agent)}</b> {b.id === 'rules' ? 'suggest rules' : 'prepared a batch'}</span><span className="faint">· {b.items.length} items</span></div>
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
              {l.count > 0 && <Btn size="sm" onClick={() => setReview(l.id)}>Review</Btn>}
            </div>
          </section>
        ))}
        {b.id === 'nova' && (
          <section className="lane-card">
            <div className="faint">Spam</div>
            <b className="num">{hidden}</b>
            <p className="faint">Hidden by Nova on her own, set to Act</p>
            <div className="row"><Btn size="sm" onClick={() => nav('/inbox?view=hidden')}>See them</Btn></div>
          </section>
        )}
      </div>

      <div className="batch-head row">
        <SelectAll sel={sel} label="Select every item" />
        <span className="faint">{sel.count} of {b.items.length} selected · click a row to see it in full</span>
      </div>
      <ul className="batch-rows">
        {b.items.map(h => {
          const isOpen = open === h.id
          const p = h.preview
          return (
            <li key={h.id} className={`${isOpen ? 'open' : ''} ${sel.has(h.id) ? 'picked' : ''}`}>
              <div className="batch-row" role="button" tabIndex={0} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : h.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(isOpen ? null : h.id) } }}>
                <SelectBox checked={sel.has(h.id)} visible onToggle={shift => sel.toggle(h.id, shift)} label={`Select ${h.title}`} />
                {p?.type === 'reply' ? <SocialAvatar name={p.author.split(' · ')[0]} network={p.network} size={24} /> : p?.type === 'post' ? <Net n={p.network} /> : <TopicIcon agent={h.agent} kind={h.kind} topic={h.topic} size={22} />}
                <span className="ellipsis">“{h.proposal?.text ?? (p?.type === 'reply' ? p.text : draftText(h)) ?? h.title}”</span>
                <span className="faint">{h.proposal ? 'rule' : b.ready.includes(h) ? (p?.type === 'post' ? `ready · ${NETWORK_LABEL[p.network]}` : 'reply ready') : 'to decide'}</span>
                <ChevronDown size={14} className="faint chev" aria-hidden />
              </div>
              {isOpen && (
                <div className="batch-open">
                  {p?.type === 'post' && (
                    <div className="batch-pv"><NetworkPreview network={p.network} text={draftText(h)} media={p.media} words={[]} at={p.slot} /></div>
                  )}
                  <Detail h={h} keys={false} onDiscuss={onDiscuss} onSettled={() => setOpen(null)} />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <footer className="detail-foot">
        <span className="faint">Nothing goes out until you confirm.</span>
        <span className="spacer" />
        {b.id === 'nova' && <Btn size="sm" variant="ghost" onClick={() => nav('/inbox')}><ArrowUpRight size={14} />Inbox</Btn>}
        {chosen.length > 0 && <Btn variant="primary" onClick={() => bulk(chosen, b.verb.done(chosen.length))}>{b.verb.many(chosen.length)}</Btn>}
      </footer>

      <Sheet open={!!review} onOpenChange={o => !o && setReview(null)} title={b.title} wide>
        <Tabs value={review ?? 'all'} onChange={v => setReview(v)} items={[
          { value: 'all' as Lane, label: 'All', count: b.items.length },
          ...(b.id === 'nova' ? [{ value: 'leads' as Lane, label: 'Leads', count: leads.length }] : []),
          ...(b.id !== 'rules' ? [{ value: 'ready' as Lane, label: 'Ready', count: b.ready.length }, { value: 'decide' as Lane, label: 'To decide', count: decide.length }] : []),
        ]} />
        <div className="cards">
          {shown.length ? shown.map(h => <HandoffCard key={h.id} h={h} onDiscuss={id => { setReview(null); onDiscuss(id) }} />) : <p className="faint">Nothing left in this lane.</p>}
        </div>
      </Sheet>
    </article>
  )
}
