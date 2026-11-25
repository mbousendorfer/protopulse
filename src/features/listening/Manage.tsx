import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Network } from '../../app/types'
import { useStore } from '../../app/store'
import { NETWORK_LABEL } from '../../data/agents'
import { competitorReady, eventsOf } from './model'
import { Btn, Mark, Menu, Modal, Net, Switch } from '../../ui'
import { SocialAvatar } from '../../ui/SocialAvatar'
import type { Watched } from './slice'

const NETWORKS: Network[] = ['instagram', 'tiktok', 'linkedin', 'facebook', 'youtube', 'x']

/** The competitors Echo watches: who, where, since when. Add, edit, pause or remove. */
export default function ManageCompetitors() {
  const { s, d } = useStore()
  const [edit, setEdit] = useState<Watched | null>(null)
  const [removing, setRemoving] = useState<Watched | null>(null)
  const blank = (): Watched => ({ id: `c-${Date.now().toString(36)}`, name: '', website: '', accounts: [{ network: 'instagram', handle: '' }], tracking: true, since: Date.now(), custom: true })

  return (
    <div className="stack lg">
      <div className="row between">
        <Link to="/listening/competitors" className="btn sm ghost"><ArrowLeft size={14} />All events</Link>
        <Btn variant="primary" onClick={() => setEdit(blank())}><Plus size={14} />Add a competitor</Btn>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Competitors Echo watches <span className="faint num">{s.listening.watch.filter(w => w.tracking).length} of {s.listening.watch.length}</span></h2>
          <span className="row tight faint"><Mark agent="echo" />Echo checks their accounts every hour and raises launches, price changes, campaigns and viral posts.</span>
        </div>
        <ul className="rows">
          {s.listening.watch.map(w => {
            const events = eventsOf(s).filter(e => e.competitor === w.id).length
            return (
              <li key={w.id} className={`ls-watch ${w.tracking ? '' : 'ls-paused'}`}>
                <SocialAvatar name={w.name} org size={40} />
                <div className="ls-watch-main">
                  <div className="row tight"><b>{w.name}</b>{w.website && <a href={`https://${w.website}`} target="_blank" rel="noreferrer" className="faint row tight">{w.website}<ExternalLink size={12} /></a>}</div>
                  <div className="row tight">
                    {w.accounts.map(acc => <span key={acc.network + acc.handle} className="chip"><Net n={acc.network} size={14} />{acc.handle}</span>)}
                  </div>
                  <span className="faint ls-watch-meta">
                    {w.tracking ? 'Watching' : 'Paused'} since {new Date(w.since).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{events ? `${events} event${events > 1 ? 's' : ''} raised` : competitorReady(s, w) ? 'Benchmark ready · first event within the hour' : 'Echo is reading their last 30 days'}
                  </span>
                </div>
                <Switch checked={w.tracking} onChange={() => d({ type: 'listening/watchToggle', id: w.id })} label={`Watch ${w.name}`} hideLabel />
                {competitorReady(s, w) && <Link to={`/listening/competitors/profile/${w.id}`} className="btn sm ghost">Profile</Link>}
                <Btn size="sm" variant="ghost" icon aria-label={`Edit ${w.name}`} onClick={() => setEdit(structuredClone(w))}><Pencil size={14} /></Btn>
                <Btn size="sm" variant="ghost" icon aria-label={`Remove ${w.name}`} onClick={() => setRemoving(w)}><Trash2 size={14} /></Btn>
              </li>
            )
          })}
        </ul>
      </section>

      {edit && <EditCompetitor w={edit} onClose={() => setEdit(null)} onSave={w => { d({ type: 'listening/watchSave', w }); setEdit(null) }} isNew={!s.listening.watch.some(x => x.id === edit.id)} />}

      <Modal open={!!removing} onOpenChange={o => !o && setRemoving(null)} title={`Stop watching ${removing?.name ?? ''}?`}
        footer={<><span className="spacer" /><Btn variant="ghost" onClick={() => setRemoving(null)}>Keep watching</Btn><Btn variant="danger" onClick={() => { d({ type: 'listening/watchDelete', id: removing!.id }); setRemoving(null) }}>Remove</Btn></>}>
        <p className="muted">Echo stops raising their moves and they leave the benchmark. Past events stay in the history. Pausing keeps them in the list instead.</p>
      </Modal>
    </div>
  )
}

function EditCompetitor({ w, isNew, onClose, onSave }: { w: Watched; isNew: boolean; onClose: () => void; onSave: (w: Watched) => void }) {
  const [draft, setDraft] = useState(w)
  const set = (p: Partial<Watched>) => setDraft(x => ({ ...x, ...p }))
  const setAcc = (i: number, p: Partial<Watched['accounts'][number]>) => set({ accounts: draft.accounts.map((a, j) => (j === i ? { ...a, ...p } : a)) })
  const valid = draft.name.trim() && draft.accounts.some(a => a.handle.trim())
  return (
    <Modal open onOpenChange={o => !o && onClose()} title={isNew ? 'Add a competitor' : `Edit ${w.name}`}
      footer={<><span className="faint t-xs">Echo reads their last 30 days: benchmark in about 10 minutes, first event within the hour.</span><span className="spacer" /><Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={!valid} onClick={() => onSave({ ...draft, name: draft.name.trim(), accounts: draft.accounts.filter(a => a.handle.trim()) })}>{isNew ? 'Start watching' : 'Save'}</Btn></>}>
      <div className="stack">
        <div className="field"><label htmlFor="cw-name">Name</label><input id="cw-name" className="input" autoFocus value={draft.name} onChange={e => set({ name: e.target.value })} placeholder="Peakline" /></div>
        <div className="field"><label htmlFor="cw-web">Website</label><input id="cw-web" className="input" value={draft.website} onChange={e => set({ website: e.target.value })} placeholder="peakline.eu" /><span className="hint">Echo also watches price and product pages there.</span></div>
        <div className="field">
          <span className="label">Accounts to watch</span>
          {draft.accounts.map((a, i) => (
            <div key={i} className="row nowrap">
              <Menu align="start" trigger={<Btn size="sm" aria-label={`Network: ${NETWORK_LABEL[a.network]}`}><Net n={a.network} size={16} />{NETWORK_LABEL[a.network]}<ChevronDown size={12} /></Btn>}
                items={NETWORKS.map(n => ({ label: NETWORK_LABEL[n], icon: <Net n={n} size={16} />, onSelect: () => setAcc(i, { network: n }) }))} />
              <input className="input" value={a.handle} onChange={e => setAcc(i, { handle: e.target.value })} placeholder="@handle or page name" aria-label={`${NETWORK_LABEL[a.network]} account`} />
              <Btn size="sm" variant="ghost" icon aria-label="Remove this account" onClick={() => set({ accounts: draft.accounts.filter((_, j) => j !== i) })} disabled={draft.accounts.length === 1}><X size={14} /></Btn>
            </div>
          ))}
          <Btn size="sm" variant="ghost" onClick={() => set({ accounts: [...draft.accounts, { network: NETWORKS.find(n => !draft.accounts.some(a => a.network === n)) ?? 'instagram', handle: '' }] })} className="self-start"><Plus size={14} />Add an account</Btn>
        </div>
      </div>
    </Modal>
  )
}
