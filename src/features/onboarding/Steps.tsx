import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Pencil, Sparkles } from 'lucide-react'
import { useStore } from '../../app/store'
import type { AgentId } from '../../app/types'
import { AGENTS } from '../../data/agents'
import { Btn, Mark, Net, Pill, Seg, Thinking } from '../../ui'
import Photo from '../../ui/Photo'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { voiceSample, VOICE } from '../../data/playbook'
import { Foot, Head, ShopifyMark, useElapsed } from './parts'
import { QUESTIONS } from './day1'
import {
  INTEGRATIONS, PHASES, PRESETS, PROPOSALS, READ_MS, SECTIONS, andList, keptCount, levelCounts, levelFor, netOf, pickOf, presetOf, readingAt, type Integration, type Proposal,
} from './model'

/* ---------- The live read ---------- */

const PRODUCT_PHOTO: Record<string, string> = { pack: 'pack', bottle: 'bottle', jacket: 'jacket', fleece: 'fleece' }

export function Reading({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { s, d } = useStore()
  const [skipped, setSkipped] = useState(s.setup.read)
  const ms = useElapsed(READ_MS, skipped)
  const r = readingAt(ms)
  useEffect(() => { if (r.done && !s.setup.read) d({ type: 'setup/patch', patch: { read: true } }) }, [r.done]) // eslint-disable-line react-hooks/exhaustive-deps
  const has = (key: string) => r.shown.some(f => f.key === key)
  const of = (phase: string) => r.shown.filter(f => f.phase === phase)
  const latest = r.shown.at(-1)

  return (
    <section className="onb-step onb-wide">
      <Head title={r.done ? 'Here’s Fernway, as we read it' : `Reading ${s.setup.site || 'fernway.co'}`}
        lede={r.done ? 'Products, policies, accounts, voice and competitors. You’ll check each of them in a moment.' : 'Everything you’d otherwise type into a form. This takes a few seconds.'} />
      <div className="onb-read">
        <ol className="onb-phases" aria-label="What Protopulse is reading">
          {PHASES.map((p, i) => {
            const state = i < r.current ? 'done' : i === r.current ? 'current' : 'todo'
            return (
              <li key={p.id} className={state}>
                <span className="onb-phase-icon" aria-hidden>{state === 'done' ? <Check size={12} /> : state === 'current' ? <span className="spin" /> : null}</span>
                <span><span className="onb-phase-label">{p.label}</span>{state === 'done' && <span className="onb-phase-done">{p.done}</span>}</span>
              </li>
            )
          })}
        </ol>

        <article className="card onb-brand" aria-label="What Protopulse found">
          <header className="onb-brand-head">
            {has('brand') ? <>
              <span className="onb-brand-logo" aria-hidden>F</span>
              <div><h2>Fernway</h2><p className="muted">Outdoor gear · Annecy, France · fernway.co</p></div>
            </> : <div className="onb-skeleton" aria-hidden><i /><i /></div>}
          </header>
          {of('site').length > 1 && (
            <section>
              <h3>Products</h3>
              <ul className="onb-products">
                {of('site').filter(f => PRODUCT_PHOTO[f.key]).map(f => (
                  <li key={f.key} className="onb-in"><span className="onb-product-photo"><Photo name={PRODUCT_PHOTO[f.key]} /></span><b>{f.label}</b><span className="muted">{f.detail}</span></li>
                ))}
              </ul>
            </section>
          )}
          {of('policies').length > 0 && (
            <section>
              <h3>Policies</h3>
              <ul className="onb-facts">{of('policies').map(f => <li key={f.key} className="onb-in"><Check size={14} aria-hidden className="ok" />{f.label}</li>)}</ul>
            </section>
          )}
          {of('accounts').length > 0 && (
            <section>
              <h3>Accounts <span className="muted num">{of('accounts').length}</span></h3>
              <ul className="onb-nets">
                {of('accounts').map(f => { const i = INTEGRATIONS.find(x => x.id === f.key)!; return <li key={f.key} className="onb-in" title={`${i.name} · ${i.handle}`}>{i.net ? <Net n={i.net} size={22} /> : <ShopifyMark />}</li> })}
              </ul>
            </section>
          )}
          {of('voice').length > 0 && (
            <section>
              <h3>Voice</h3>
              {of('voice').map(f => <p key={f.key} className="onb-in onb-voice-find"><b>{f.label}</b>{f.detail && <span className="muted"> · {f.detail}</span>}</p>)}
            </section>
          )}
          {of('rivals').length > 0 && (
            <section>
              <h3>Likely competitors</h3>
              <ul className="onb-rivals">{of('rivals').map(f => <li key={f.key} className="onb-in"><SocialAvatar name={f.label} org size={24} />{f.label}</li>)}</ul>
            </section>
          )}
          <p className="sr-only" aria-live="polite">{latest ? `Found: ${latest.label}${latest.detail ? `, ${latest.detail}` : ''}` : ''}</p>
        </article>
      </div>
      <Foot onBack={onBack}>
        {r.done ? <Btn variant="primary" onClick={onDone}>Review what we found</Btn> : <Btn variant="ghost" onClick={() => setSkipped(true)}>Skip the wait</Btn>}
      </Foot>
    </section>
  )
}


/* ---------- Accounts: found, ticked, connected in one click ---------- */

export function Accounts({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { s, d } = useStore()
  const connected = s.setup.connected
  const [ticked, setTicked] = useState<string[]>(() => INTEGRATIONS.map(i => i.id))
  const [busy, setBusy] = useState<string[]>([])
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const todo = ticked.filter(id => !connected.includes(id))
  const connect = () => {
    setBusy(todo)
    todo.forEach((id, n) => timers.current.push(window.setTimeout(() => { d({ type: 'setup/connect', ids: [id] }); setBusy(b => b.filter(x => x !== id)) }, 500 + n * 280)))
  }
  const working = busy.length > 0
  return (
    <section className="onb-step">
      <Head title={`We found your ${INTEGRATIONS.length} accounts`} lede="Your agents read and reply through them. Nothing is published until you choose how much they can do alone." />
      {(['Social', 'Reviews', 'Store'] as const).map(g => (
        <div key={g} className="onb-group">
          <h2>{g === 'Store' ? 'Store, for orders and exchanges' : g === 'Reviews' ? 'Review sites' : 'Social networks'}</h2>
          <ul className="card rows">
            {INTEGRATIONS.filter(i => i.group === g).map(i => (
              <AccountRow key={i.id} i={i} on={connected.includes(i.id)} busy={busy.includes(i.id)} ticked={ticked.includes(i.id)}
                onTick={v => setTicked(t => (v ? [...t, i.id] : t.filter(x => x !== i.id)))} />
            ))}
          </ul>
        </div>
      ))}
      <Foot onBack={onBack} note={working ? <Thinking label={`Connecting ${busy.length} more…`} /> : !todo.length && connected.length ? `${connected.length} of ${INTEGRATIONS.length} connected` : undefined}>
        {todo.length && !working ? <>
          {!!connected.length && <Btn variant="ghost" onClick={onDone}>Continue with {connected.length}</Btn>}
          <Btn variant="primary" onClick={connect}>Connect {todo.length} account{todo.length > 1 ? 's' : ''}</Btn>
        </> : <Btn variant="primary" disabled={working} onClick={onDone}>{connected.length ? 'Continue' : 'Continue without accounts'}</Btn>}
      </Foot>
    </section>
  )
}

function AccountRow({ i, on, busy, ticked, onTick }: { i: Integration; on: boolean; busy: boolean; ticked: boolean; onTick: (v: boolean) => void }) {
  return (
    <li className={`onb-int ${on ? 'on' : ''}`}>
      <input type="checkbox" className="check" checked={on || ticked} disabled={on || busy} onChange={e => onTick(e.target.checked)} aria-label={`Connect ${i.name}`} />
      {i.net ? <Net n={i.net} size={22} /> : <ShopifyMark />}
      <div className="grow">
        <b>{i.name}</b> <span className="muted">{i.handle}{i.size ? ` · ${i.size}` : ''}</span>
        <div className="onb-found">{i.foundIn}</div>
      </div>
      {busy ? <Thinking label="Connecting…" /> : on ? <Pill tone="ok" dot>Connected</Pill> : null}
    </li>
  )
}

/* ---------- Playbook: one set to validate, each line with its proof ---------- */

export function Brand({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { s } = useStore()
  const n = keptCount(s.setup)
  return (
    <section className="onb-step">
      <Head title="Here’s how Fernway sounds" lede="From your site, your help centre and your last 200 posts and replies. Untick what’s wrong, click a line to fix it. Every agent follows what you keep." />
      {SECTIONS.map(sec => (
        <div key={sec.title} className="onb-group">
          <h2>{sec.title} <span className="muted">· {sec.note}</span></h2>
          <ul className="card rows">
            {PROPOSALS.filter(p => sec.kind.includes(p.kind)).map(p => <ProposalRow key={p.id} p={p} />)}
          </ul>
        </div>
      ))}
      <Foot onBack={onBack} note={`${n} of ${PROPOSALS.length} kept`}>
        <Btn variant="primary" onClick={onDone}>{n ? `Add ${n} to my Playbook` : 'Continue without them'}</Btn>
      </Foot>
    </section>
  )
}

function ProposalRow({ p }: { p: Proposal }) {
  const { s, d } = useStore()
  const pick = pickOf(s.setup, p)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(pick.text)
  const save = () => { if (text.trim() && text.trim() !== pick.text) d({ type: 'setup/pick', id: p.id, text, keep: true }); setEditing(false) }
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); save() } if (e.key === 'Escape') { e.preventDefault(); setText(pick.text); setEditing(false) } }
  const edited = pick.text !== p.text
  return (
    <li className={`onb-prop ${pick.keep ? '' : 'off'}`}>
      <input type="checkbox" className="check" checked={pick.keep} onChange={e => d({ type: 'setup/pick', id: p.id, keep: e.target.checked })} aria-label={`Keep: ${pick.text}`} />
      {p.kind === 'competitor' && <SocialAvatar name={pick.text} org size={24} />}
      <div className="grow">
        {editing
          ? <input className="input" autoFocus onFocus={e => e.target.select()} value={text} aria-label="Edit this line" onChange={e => setText(e.target.value)} onKeyDown={onKey} onBlur={save} />
          : <button className="onb-prop-text" onClick={() => { setText(pick.text); setEditing(true) }} disabled={p.kind === 'competitor'} title={p.kind === 'competitor' ? undefined : 'Click to edit'}>
              {pick.text}{p.kind !== 'competitor' && <Pencil size={12} aria-hidden className="onb-pencil" />}
            </button>}
        <div className="onb-proof">{edited && <>Edited by you · <button className="link-btn" onClick={() => { d({ type: 'setup/pick', id: p.id, text: p.text }); setText(p.text) }}>Restore</button> · </>}{p.evidence}</div>
        {p.kind === 'voice' && pick.keep && (
          <div className="onb-sample"><span className="onb-sample-by"><Mark agent="nova" />How Nova would answer a complaint</span><p>{voiceSample(VOICE)}</p></div>
        )}
      </div>
    </li>
  )
}

/* ---------- Team and autonomy ---------- */

type Ctx = { questions: number; faqAlone: boolean; watched: string[] }
const FOR_FERNWAY: Record<AgentId, (c: Ctx) => string> = {
  nova: c => c.questions
    ? `${c.questions} question${c.questions > 1 ? 's' : ''} from last night ${c.questions > 1 ? 'are' : 'is'} waiting. Nova ${c.faqAlone ? 'answers them on her own' : 'drafts the answers for you to send'}, from your facts.`
    : 'Answers comments, DMs and reviews from your facts, and hides spam.',
  atlas: () => 'Finds what to post next from your best posts this month, and fills the gaps in your calendar.',
  iris: () => 'Reads 90 days of results tonight. Your first morning brief lands tomorrow at 07:00.',
  echo: c => c.watched.length ? `Watches ${andList(c.watched)}, and every mention of Fernway.` : 'Watches every mention of Fernway. Add competitors any time.',
  sage: () => 'Proposes your editorial pillars and a posting cadence from what already works.',
  juno: () => 'Watches your YouTube channel and lives, and cuts each new video into captioned clips for you to review.',
}

export function Team({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { s, d } = useStore()
  const [perAgent, setPerAgent] = useState(Object.keys(s.setup.custom).length > 0)
  const watched = PROPOSALS.filter(p => p.kind === 'competitor' && pickOf(s.setup, p).keep).map(p => pickOf(s.setup, p).text)
  const counts = levelCounts(AGENTS, s.setup)
  const ctx: Ctx = {
    watched, faqAlone: levelFor('safe', presetOf(s.setup, 'nova')) === 'act',
    questions: QUESTIONS.filter(q => s.setup.connected.some(id => netOf(id) === s.inbox.convs.find(c => c.id === q.conv)?.network)).length,
  }
  const preset = PRESETS.find(p => p.value === s.setup.preset)!
  return (
    <section className="onb-step">
      <Head title="Meet your team" lede="Six agents, one per department. Here’s what each will do for Fernway, starting now." />
      <ul className="card rows onb-team">
        {AGENTS.map(a => (
          <li key={a.id}>
            <Mark agent={a.id} size="lg" />
            <div className="grow"><b>{a.name}</b> <span className="muted">· {a.dept}</span><p>{FOR_FERNWAY[a.id](ctx)}</p></div>
          </li>
        ))}
      </ul>

      <div className="card pad onb-autonomy">
        <h2>How much can they do alone?</h2>
        <Seg name="onb-preset" label="Autonomy for the whole team" value={s.setup.preset} onChange={v => d({ type: 'setup/preset', preset: v })}
          options={PRESETS.map(p => ({ value: p.value, label: p.label }))} />
        <p>{preset.says}</p>
        {/* Same scale, same order as every agent profile: Suggest, Draft, Act. */}
        <dl className="onb-counts" aria-label="Actions at each level, across the team">
          <div><dt>Actions on Suggest</dt><dd className="num">{counts.suggest}</dd></div>
          <div><dt>On Draft</dt><dd className="num">{counts.draft}</dd></div>
          <div><dt>On Act</dt><dd className="num">{counts.act}</dd></div>
        </dl>
        <p className="muted t-sm">Press, legal and safety always come to you, whatever you pick. Agents ask for more autonomy when your approvals show they’ve earned it.</p>
        <button className="link-btn self-start" aria-expanded={perAgent} onClick={() => setPerAgent(o => !o)}>{perAgent ? 'Same setting for everyone' : 'Adjust per agent'}</button>
        {perAgent && (
          <ul className="rows onb-per-agent">
            {AGENTS.map(a => (
              <li key={a.id}>
                <Mark agent={a.id} /><b>{a.name}</b>
                <span className="spacer" />
                <Seg name={`onb-${a.id}`} size="sm" label={`${a.name} autonomy`} value={presetOf(s.setup, a.id)} onChange={v => d({ type: 'setup/preset', preset: v, agent: a.id })}
                  options={PRESETS.map(p => ({ value: p.value, label: p.label }))} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <Foot onBack={onBack} note={s.phase === 'day1' ? 'Your team is already running. Starting again replaces today’s first results.' : undefined}>
        <Btn variant="primary" onClick={onDone}><Sparkles size={14} />{s.phase === 'day1' ? 'Start again' : 'Start my team'}</Btn>
      </Foot>
    </section>
  )
}
