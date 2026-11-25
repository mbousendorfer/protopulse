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
  // Re-seeded whenever none of the shown items is selected (a new batch, or the same batch rebuilt after a reset).
  const itemsKey = b.items.map(h => h.id).join()
  useEffect(() => { if (!b.items.some(h => sel.has(h.id))) sel.set(b.ready.map(h => h.id)) }, [b.id, itemsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = b.items.filter(h => sel.has(h.id))
  const decide = b.items.filter(h => !b.ready.includes(h))
  const leads = b.items.filter(isLead)
  const hidden = ((s.inbox as { convs?: { status: string }[] }).convs ?? []).filter(c => c.status === 'hidden').length

  const bulk = (items: Handoff[], summary: string) => {
    if (!items.length) return
    d({ type: 'core/bulk', ids: items.map(h => h.id), decision: { kind: 'approve' }, summary, agent: b.agent })
    onBulk()
  }

  // One primary per batch: the footer acts on the selection (ready items start selected). The list is grouped in the
  // order the agent sorted it, so the sentence above is what you see; empty groups don't show.
  const lead = b.id === 'nova' ? leads : []
  const groups: { id: Lane; label: string; note: string; items: Handoff[] }[] = (b.id === 'rules'
    ? [{ id: 'all' as Lane, label: 'Proposed', note: 'Each comes from edits you repeated', items: b.items }]
    : [
      { id: 'leads' as Lane, label: 'Want to buy', note: 'Asking before they buy', items: lead },
      { id: 'ready' as Lane, label: 'Ready', note: b.id === 'nova' ? 'Sure of the facts and the tone' : 'Checked against the Playbook', items: b.ready.filter(h => !lead.includes(h)) },
      { id: 'decide' as Lane, label: 'To decide', note: `${agentName(b.agent)} marked a passage to check`, items: decide.filter(h => !lead.includes(h)) },
    ]).filter(g => g.items.length)

  const shown = review === 'leads' ? leads : review === 'ready' ? b.ready : review === 'decide' ? decide : b.items

  return (
    <article className="detail batch" aria-label={b.title}>
      <div className="handoff-top">
        <div className="slip"><span className="chain">{[...new Set(b.items.map(h => h.agent))].map(a => <Mark key={a} agent={a} />)}</span><span><b>{b.id === 'rules' ? 'Your agents' : agentName(b.agent)}</b> {b.id === 'rules' ? 'suggest rules' : 'prepared a batch'}</span><span className="faint">· {b.items.length} items</span></div>
        {b.urgency === 'urgent' ? <Pill tone="alert" dot>Has urgent</Pill> : b.urgency === 'today' ? <Pill tone="caution">Today</Pill> : <Pill>This week</Pill>}
      </div>
      <h2 className="detail-title">{b.title}</h2>
      <p className="handoff-ctx">{b.meta}. {b.id === 'nova' ? 'Nova sorted them: buying questions first, then the replies she’s sure of, then the ones to check.' : b.id === 'atlas' ? 'Atlas checked each one against the Playbook and Sage’s cadence.' : 'Add them all, or review them one by one.'}</p>

      <div className="batch-head row">
        <SelectAll sel={sel} label="Select every item" />
        <span className="faint">{sel.count} of {b.items.length} selected · click a row to see it in full</span>
      </div>
      {groups.map(g => (
        <section key={g.id} className="batch-group" aria-label={g.label}>
          <h3>{g.label}<span className="n">{g.items.length}</span><span className="note">· {g.note}</span>
            <Btn size="xs" variant="ghost" onClick={() => setReview(g.id)}>Review one by one</Btn></h3>
          <ul className="batch-rows">
            {g.items.map(h => {
              const isOpen = open === h.id
              const p = h.preview
              return (
                <li key={h.id} className={`${isOpen ? 'open' : ''} ${sel.has(h.id) ? 'picked' : ''}`}>
                  <div className="batch-row" role="button" tabIndex={0} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : h.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(isOpen ? null : h.id) } }}>
                    <SelectBox checked={sel.has(h.id)} visible onToggle={shift => sel.toggle(h.id, shift)} label={`Select ${h.title}`} />
                    {p?.type === 'reply' ? <SocialAvatar name={p.author.split(' · ')[0]} network={p.network} size={24} /> : p?.type === 'post' ? <Net n={p.network} /> : <TopicIcon agent={h.agent} kind={h.kind} topic={h.topic} size={22} />}
                    <span className="ellipsis">“{h.proposal?.text ?? (p?.type === 'reply' ? p.text : draftText(h)) ?? h.title}”</span>
                    <span className="faint">{p?.type === 'post' ? NETWORK_LABEL[p.network] : ''}</span>
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
        </section>
      ))}
      {b.id === 'nova' && hidden > 0 && <p className="batch-note faint">Nova also hid {hidden} spam on her own (set to Act). <button className="link-btn" onClick={() => nav('/inbox?view=hidden')}>See them</button></p>}

      <footer className="detail-foot">
        <span className="faint">Nothing goes out until you confirm.</span>
        <span className="spacer" />
        {b.id === 'nova' && <Btn size="sm" variant="ghost" onClick={() => nav('/inbox')}><ArrowUpRight size={14} />Inbox</Btn>}
        {/* The footer action stays in place with nothing selected, so the batch always says how it ends. */}
        <Btn variant="primary" disabled={!chosen.length} title={chosen.length ? undefined : 'Select at least one item'} onClick={() => bulk(chosen, b.verb.done(chosen.length))}>{b.verb.many(chosen.length)}</Btn>
      </footer>

      <Sheet open={!!review} onOpenChange={o => !o && setReview(null)} title={b.title} wide>
        <Tabs value={review ?? 'all'} onChange={v => setReview(v)} items={[
          { value: 'all' as Lane, label: 'All', count: b.items.length },
          ...(b.id === 'nova' ? [{ value: 'leads' as Lane, label: 'Want to buy', count: leads.length }] : []),
          ...(b.id !== 'rules' ? [{ value: 'ready' as Lane, label: 'Ready', count: b.ready.length }, { value: 'decide' as Lane, label: 'To decide', count: decide.length }] : []),
        ]} />
        <div className="cards">
          {shown.length ? shown.map(h => <HandoffCard key={h.id} h={h} onDiscuss={id => { setReview(null); onDiscuss(id) }} />) : <p className="faint">Nothing left in this lane.</p>}
        </div>
      </Sheet>
    </article>
  )
}
