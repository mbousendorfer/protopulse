import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import type { Handoff, Urgency } from '../../app/types'
import { registry } from '../../app/agents-registry'
import type { Batch, BatchDef } from '../../app/agent-module'
import { useStore } from '../../app/store'
import { agentName } from '../../data/agents'
import { Btn, Mark, Net, Pill, TopicIcon } from '../../ui'
import Detail from './Detail'
import { SelectAll, SelectBox, useSelection } from '../../ui/Selection'
import { NetworkPreview } from '../publishing/Previews'
import { SocialAvatar } from '../../ui/SocialAvatar'
import Photo from '../../ui/Photo'
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

/**
 * A batch as one standard list (matrix §14): ready items start selected, a status only on the rows that differ
 * (« Wants to buy », « Passage to check »), each row opens inline on its card, one primary in the list head.
 */
export default function BatchDetail({ b, onBulk, onDiscuss }: { b: Batch; onBulk: () => void; onDiscuss: (id: string) => void }) {
  const { d } = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState<string | null>(null)
  const sel = useSelection(b.items.map(h => h.id), b.id)
  // Re-seeded whenever none of the shown items is selected (a new batch, or the same batch rebuilt after a reset).
  const itemsKey = b.items.map(h => h.id).join()
  useEffect(() => { if (!b.items.some(h => sel.has(h.id))) sel.set(b.ready.map(h => h.id)) }, [b.id, itemsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = b.items.filter(h => sel.has(h.id))
  const leads = b.id === 'nova' ? b.items.filter(isLead) : []
  // In the order the agent sorted them: people about to buy, then what's ready, then what to decide.
  const rows = [...leads, ...b.ready.filter(h => !leads.includes(h)), ...b.items.filter(h => !b.ready.includes(h) && !leads.includes(h))]
  const status = (h: Handoff) => leads.includes(h) ? <Pill tone="signal">Wants to buy</Pill>
    : !b.ready.includes(h) ? <Pill tone="caution">{b.id === 'nova' ? 'Passage to check' : 'To decide'}</Pill> : null

  const bulk = () => {
    if (!chosen.length) return
    d({ type: 'core/bulk', ids: chosen.map(h => h.id), decision: { kind: 'approve' }, summary: b.verb.done(chosen.length), agent: b.agent })
    onBulk()
  }

  return (
    <article className="detail batch" aria-label={b.title}>
      <div className="handoff-top">
        <div className="slip"><span className="chain">{[...new Set(b.items.map(h => h.agent))].map(a => <Mark key={a} agent={a} />)}</span><span><b>{b.id === 'rules' ? 'Your agents' : agentName(b.agent)}</b> {b.id === 'rules' ? 'suggest rules' : 'prepared a batch'}</span></div>
        {b.urgency === 'urgent' ? <Pill tone="alert" dot>Includes urgent</Pill> : b.urgency === 'today' ? <Pill tone="caution">Today</Pill> : <Pill>This week</Pill>}
      </div>
      <h2 className="detail-title">{b.title}</h2>

      <div className="batch-head row">
        <SelectAll sel={sel} label="Select every item" />
        <span className="faint">{sel.count} of {b.items.length} selected</span>
        <span className="spacer" />
        {b.id === 'nova' && <Btn size="sm" variant="ghost" onClick={() => nav('/inbox')}><ArrowUpRight size={14} />Inbox</Btn>}
        <Btn size="sm" variant="primary" disabled={!chosen.length} title={chosen.length ? undefined : 'Select at least one item'} onClick={bulk}>{b.verb.many(chosen.length)}</Btn>
      </div>
      <ul className="batch-rows">
        {rows.map(h => {
          const isOpen = open === h.id
          const p = h.preview
          return (
            <li key={h.id} className={`${isOpen ? 'open' : ''} ${sel.has(h.id) ? 'picked' : ''}`}>
              <div className="batch-row" role="button" tabIndex={0} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : h.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(isOpen ? null : h.id) } }}>
                <SelectBox checked={sel.has(h.id)} visible onToggle={shift => sel.toggle(h.id, shift)} label={`Select ${h.title}`} />
                {p?.type === 'reply' ? <SocialAvatar name={p.author.split(' · ')[0]} network={p.network} size={32} /> : p?.type === 'post' && p.media ? <span className="day-thumb sm"><Photo name={p.media} /></span> : p?.type === 'post' ? <Net n={p.network} /> : <TopicIcon agent={h.agent} kind={h.kind} topic={h.topic} size={28} />}
                <span className="ellipsis">“{h.proposal?.text ?? (p?.type === 'reply' ? p.text : draftText(h)) ?? h.title}”</span>
                <span>{status(h)}</span>
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
    </article>
  )
}
