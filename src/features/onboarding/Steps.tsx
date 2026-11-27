import { useState } from 'react'
import { Check, Sparkles, UserPlus } from 'lucide-react'
import { useStore } from '../../app/store'
import type { AgentId } from '../../app/types'
import { AGENTS } from '../../data/agents'
import { Btn, Mark, Pill, Seg } from '../../ui'
import { Foot, Head } from './parts'
import { InfoPop } from '../../ui/More'
import { QUESTIONS } from './day1'
import { PRESETS, andList, connectedNets, levelCounts, levelFor, presetOf, validEmail } from './model'

/* ---------- Team and autonomy ---------- */

type Ctx = { questions: number; faqAlone: boolean; watched: string[]; nets: number; youtube: boolean }
/** What each agent will do, said honestly: what needs an account says so, what takes hours says when. */
const FOR_YOU: Record<AgentId, (c: Ctx) => { text: string; needs?: boolean }> = {
  nova: c => !c.nets ? { text: 'Answers comments, DMs and reviews once a profile is connected.', needs: true }
    : { text: c.questions ? `${c.faqAlone ? 'Answers' : 'Drafts replies to'} the ${c.questions} message${c.questions > 1 ? 's' : ''} waiting in your imported Inbox${c.faqAlone ? ' on her own' : ''}.` : 'Watches your Inbox and drafts replies from your Playbook.' },
  atlas: () => ({ text: 'Writes your 3 first drafts right after this screen.' }),
  iris: c => ({ text: c.nets ? 'First report later today, once your history is imported, and a brief tomorrow at 07:00.' : 'First morning brief tomorrow at 07:00; reports start once a profile is connected.' }),
  echo: c => !c.nets ? { text: 'Watches your competitors once a profile is connected.', needs: true }
    : { text: c.watched.length ? `Backfills ${andList(c.watched).replace(/\.$/, '')}: first topics in about 2 hours.` : 'Watches mentions of your brand; add competitors any time.' },
  sage: () => ({ text: 'Proposes your editorial pillars and a posting cadence.' }),
  juno: c => ({ text: c.youtube ? 'Cuts each new YouTube video into captioned clips for you to review.' : 'Cuts your YouTube videos into clips once YouTube is connected.' }),
}

export function Team({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { s, d } = useStore()
  const [perAgent, setPerAgent] = useState(Object.keys(s.setup.custom).length > 0)
  const nets = connectedNets(s.setup.connected)
  const counts = levelCounts(AGENTS, s.setup)
  const ctx: Ctx = {
    nets: s.setup.connected.length, youtube: nets.includes('youtube'),
    watched: s.setup.pb.brief?.competitors.filter(c => c.on).map(c => c.label) ?? [],
    faqAlone: levelFor('safe', presetOf(s.setup, 'nova')) === 'act',
    questions: QUESTIONS.filter(q => nets.includes(s.inbox.convs.find(c => c.id === q.conv)?.network as never)).length,
  }
  const preset = PRESETS.find(p => p.value === s.setup.preset)!
  const team = Number(s.setup.teamSize ?? 1) >= 3
  return (
    <section className="onb-step">
      <Head title="Meet your team" lede="Here’s what each agent will do, and when." />
      <ul className="card rows onb-team">
        {AGENTS.map(a => {
          const line = FOR_YOU[a.id](ctx)
          return (
            <li key={a.id}>
              <Mark agent={a.id} size="lg" />
              <div className="grow"><b>{a.name}</b> <span className="muted">· {a.dept}</span>{line.needs && <> <Pill tone="caution">Needs an account</Pill></>}<p>{line.text}</p></div>
            </li>
          )
        })}
      </ul>

      <div className="card pad onb-autonomy">
        <h2>How much can they do alone?</h2>
        <Seg name="onb-preset" label="Autonomy for the whole team" value={s.setup.preset} onChange={v => d({ type: 'setup/preset', preset: v })}
          options={PRESETS.map(p => ({ value: p.value, label: p.label }))} />
        <p>{preset.says}</p>
        {/* Same scale, same order as every agent profile: Suggest, Draft, Act. */}
        <dl className="onb-counts" aria-label="Actions at each level, across the team">
          <div><dt>Actions on Suggest</dt><dd className="num">{counts.suggest}</dd></div>
          <div><dt>Actions on Draft</dt><dd className="num">{counts.draft}</dd></div>
          <div><dt>Actions on Act</dt><dd className="num">{counts.act}</dd></div>
        </dl>
        <p className="muted t-sm">Press, legal and safety always come to you, whatever you pick. <InfoPop label="How autonomy grows">Agents ask for more autonomy when your approvals show they’ve earned it. You decide each request.</InfoPop></p>
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

      {team && <Approver />}

      <Foot onBack={onBack} note={s.phase === 'day1' ? 'Your team is already running. Starting again replaces today’s first results.' : undefined}>
        <Btn variant="primary" onClick={onDone}><Sparkles size={14} />{s.phase === 'day1' ? 'Start again' : 'Start my team'}</Btn>
      </Foot>
    </section>
  )
}

/** 3 people or more on social: someone approves what's sensitive. Claire is the one the test knows. */
function Approver() {
  const { s, d } = useStore()
  const [email, setEmail] = useState(s.setup.validator ?? 'claire.dubois@fernway.co')
  const [error, setError] = useState(false)
  const invited = s.setup.validator
  return (
    <div className="card pad onb-autonomy">
      <h2>Who approves what’s sensitive?</h2>
      <p>Agents send press, legal and budget to the person you invite.</p>
      {invited ? (
        <p className="onb-sent"><Check size={14} aria-hidden className="ok" />Invitation sent to {invited} · Pending · <button className="link-btn" onClick={() => d({ type: 'setup/patch', patch: { validator: undefined } })}>Cancel invitation</button></p>
      ) : (
        <form className="row tight onb-approver" onSubmit={e => { e.preventDefault(); if (!validEmail(email)) { setError(true); return } d({ type: 'setup/patch', patch: { validator: email.trim() } }) }} noValidate>
          <input className="input grow" type="email" aria-label="Approver’s email" value={email} aria-invalid={error} onChange={e => { setEmail(e.target.value); setError(false) }} />
          <Btn type="submit"><UserPlus size={14} />Invite as approver</Btn>
        </form>
      )}
      {error && <p className="onb-error" role="alert">Enter a valid email address.</p>}
      <p className="muted t-sm">Optional. You can invite them later from Settings.</p>
    </div>
  )
}
