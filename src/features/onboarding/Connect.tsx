// Agorapulse's Connect page (connect-page-v2): a card per network, its OAuth, then "Select profiles to connect".
// Skippable like Archie's sign-up, with its skip survey. Used on its own screen and, later, from the Desk and the results.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, Eye, KeyRound, Laptop, Send, ShieldCheck, UserPlus } from 'lucide-react'
import { useStore } from '../../app/store'
import { Btn, Modal, Pill } from '../../ui'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { NETWORKS, SKIP_REASONS, appNet, needsReasonText, skipBlocked, validEmail, type NetId, type NetworkDef, type SkipReason } from './model'
import { Foot, Head, NetIcon, narrowScreen } from './parts'

/** The network grid with its OAuth and profile picker. */
export function NetworkGrid() {
  const { s } = useStore()
  const [net, setNet] = useState<NetworkDef | null>(null)
  return (
    <>
      <ul className="onb-grid" aria-label="Social networks">
        {NETWORKS.map(n => {
          const on = n.pages.filter(p => s.setup.connected.includes(p.id)).length
          return (
            <li key={n.id}>
              <button className="onb-net" onClick={() => setNet(n)} aria-label={`${n.name}${on ? `, ${on} connected` : ''}${n.note ? `. ${n.note}` : ''}`}>
                <NetIcon id={n.id} size={28} />
                <span className="onb-net-name">{n.name}</span>
                {on ? <Pill tone="ok" dot>{on} connected</Pill> : n.note ? <span className="onb-net-note">{n.note}</span> : null}
              </button>
            </li>
          )
        })}
      </ul>
      {net && <OAuthFlow key={net.id} net={net} onClose={() => setNet(null)} />}
    </>
  )
}

const VIA: Record<string, NetId> = { Facebook: 'facebook', Google: 'google' }
const PERMS = ['Read your posts, comments and messages', 'Read your results', 'Publish the posts you approve']

/** A provider's consent screen, then the profiles of that account. Fixing a permission goes through the provider again. */
function OAuthFlow({ net, onClose }: { net: NetworkDef; onClose: () => void }) {
  const { s, d } = useStore()
  const [stage, setStage] = useState<'oauth' | 'select' | 'fix'>('oauth')
  const [busy, setBusy] = useState(false)
  const [fixing, setFixing] = useState<string | null>(null)
  const ok = (id: string) => !net.pages.find(p => p.id === id)?.issue || s.setup.fixed.includes(id)
  const [ticked, setTicked] = useState<string[]>(() => net.pages.filter(p => !p.issue || s.setup.fixed.includes(p.id)).map(p => p.id))
  const timer = useRef<number>()
  useEffect(() => () => clearTimeout(timer.current), [])
  const go = (after: () => void) => { setBusy(true); timer.current = window.setTimeout(() => { setBusy(false); after() }, 900) }
  const todo = ticked.filter(id => !s.setup.connected.includes(id) && ok(id))
  const many = net.pages.length > 1
  const listing = net.id === 'facebook' ? `Here ${many ? `are the ${net.pages.length} Facebook pages` : 'is the single Facebook page'} linked to the Facebook account: Sam Rivera`
    : net.id === 'instagram' ? `Here ${many ? `are the ${net.pages.length} Instagram business profiles` : 'is the single Instagram business profile'} linked to the Facebook address: Sam Rivera`
    : `Here is the ${net.reads} linked to the ${net.via} account: Sam Rivera`

  if (stage === 'oauth' || stage === 'fix') {
    const page = net.pages.find(p => p.id === fixing)
    return (
      <Modal open onOpenChange={o => !o && (stage === 'fix' ? setStage('select') : onClose())} title={`Continue to ${net.via}`}
        footer={<>
          <span className="spacer" />
          <Btn variant="ghost" onClick={() => (stage === 'fix' ? setStage('select') : onClose())}>Cancel</Btn>
          <Btn variant="primary" disabled={busy} onClick={() => go(() => {
            if (stage === 'fix' && fixing) { d({ type: 'setup/patch', patch: { fixed: [...s.setup.fixed, fixing] } }); setTicked(t => [...t, fixing]); setFixing(null) }
            setStage('select')
          })}>{busy ? 'Connecting…' : 'Continue'}</Btn>
        </>}>
        <div className="onb-oauth" aria-live="polite">
          <p className="onb-oauth-who"><NetIcon id={VIA[net.via] ?? net.id} size={20} /><span><b>{net.via}</b> · signed in as Sam Rivera</span></p>
          <h3>{stage === 'fix' ? `Protopulse needs one more permission for ${page?.name}` : `Protopulse wants access to your ${net.reads}`}</h3>
          <ul className="onb-perms">
            {(stage === 'fix' ? ['Read and reply to its comments and messages'] : PERMS).map(p => <li key={p}><Check size={14} aria-hidden className="ok" />{p}</li>)}
          </ul>
          <p className="muted t-sm">This is a test: no real {net.via} account is used. You can remove access anytime in your {net.via} settings.</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onOpenChange={o => !o && onClose()} title="Select profiles to connect"
      footer={<>
        <span className="spacer" />
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={!todo.length || busy} onClick={() => go(() => { d({ type: 'setup/connect', ids: todo }); onClose() })}>
          {busy ? 'Connecting…' : todo.length ? `Connect ${todo.length} profile${todo.length > 1 ? 's' : ''}` : 'Connect'}
        </Btn>
      </>}>
      <div className="stack">
        <p className="muted">{listing}</p>
        {net.id === 'x' && <p className="onb-note">During your Trial, connect one X Lite and one X Plus account at no cost. After the trial, charges apply for each profile you connected.</p>}
        <ul className="card rows">
          {net.pages.map(p => {
            const done = s.setup.connected.includes(p.id)
            const blocked = !ok(p.id)
            return (
              <li key={p.id} className="onb-int">
                <input type="checkbox" className="check" checked={done || (ticked.includes(p.id) && !blocked)} disabled={done || blocked} aria-label={`Connect ${p.name}`}
                  onChange={e => setTicked(t => (e.target.checked ? [...t, p.id] : t.filter(x => x !== p.id)))} />
                <SocialAvatar name={p.name} org size={32} network={appNet(net.id)} />
                <div className="grow">
                  <b>{p.name}</b> <span className="muted">· {p.size}</span>
                  {blocked && (
                    <div className="onb-fix">
                      <Pill tone="caution">Permissions missing</Pill>
                      <span className="onb-found">Protopulse can’t read its messages yet.</span>
                      <Btn size="sm" onClick={() => { setFixing(p.id); setStage('fix') }}>Fix permissions</Btn>
                    </div>
                  )}
                </div>
                {done && <Pill tone="ok" dot>Connected</Pill>}
              </li>
            )
          })}
        </ul>
      </div>
    </Modal>
  )
}

/** What a connection lets Protopulse do, said before anyone clicks. */
export const Reassurance = () => (
  <ul className="onb-trust" aria-label="What Protopulse does with your profiles">
    <li><Eye size={16} aria-hidden /><span><b>Reads</b> your posts, comments, messages and results.</span></li>
    <li><ShieldCheck size={16} aria-hidden /><span><b>Publishes nothing</b> without your approval.</span></li>
    <li><KeyRound size={16} aria-hidden /><span><b>Never sees your password.</b> Disconnect anytime.</span></li>
  </ul>
)

/** The grid in a dialog: from the results, the Desk checklist, anywhere a connection unlocks something. */
export function ConnectModal({ open, onOpenChange, why }: { open: boolean; onOpenChange: (o: boolean) => void; why?: string }) {
  const { s } = useStore()
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Connect a profile" footer={<><span className="spacer" /><Btn variant={s.setup.connected.length ? 'primary' : 'secondary'} onClick={() => onOpenChange(false)}>{s.setup.connected.length ? 'Done' : 'Not now'}</Btn></>}>
      <div className="stack">
        {why && <p>{why}</p>}
        <NetworkGrid />
        <Reassurance />
      </div>
    </Modal>
  )
}

/* ---------- The Connect screen ---------- */

export function Connect({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { s } = useStore()
  const [inviting, setInviting] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [mailed, setMailed] = useState(false)
  const n = s.setup.connected.length
  return (
    <section className="onb-step">
      <Head title="Almost there! It’s time to add your first profile" lede="Your agents read and reply through your profiles." />
      {narrowScreen() && (
        <div className="card pad onb-mobile">
          <Laptop size={18} aria-hidden />
          <div className="grow">
            <b>Connect from your computer</b>
            <p className="muted">We’ll email you a link to finish there.</p>
          </div>
          {mailed ? <span className="onb-sent"><Check size={14} aria-hidden className="ok" />Sent to {s.setup.email}</span> : <Btn size="sm" onClick={() => setMailed(true)}><Send size={14} />Email me the link</Btn>}
        </div>
      )}
      <NetworkGrid />
      <Reassurance />
      <div className="onb-invite-row">
        <UserPlus size={16} aria-hidden />
        {/* The product's own question until a profile is connected; then it asks about the profiles still missing. */}
        {n ? <p><b>Someone else manages your other profiles?</b> Invite up to 3 people for free to connect them.</p>
          : <p><b>Not ready to connect a profile yet?</b> Invite up to 3 people for free to help you connect social profiles.</p>}
        <Btn size="sm" onClick={() => setInviting(true)}>Invite team members</Btn>
      </div>
      {s.setup.invites.length > 0 && <p className="onb-sent"><Check size={14} aria-hidden className="ok" />Invited {s.setup.invites.join(', ')} · Pending</p>}
      <Foot onBack={onBack} note={n ? `${n} profile${n > 1 ? 's' : ''} connected` : undefined}>
        {n ? <Btn variant="primary" onClick={onDone}>Continue</Btn> : <Btn onClick={() => setSkipping(true)}>Skip for now</Btn>}
      </Foot>
      <InviteModal open={inviting} onOpenChange={setInviting} />
      <SkipModal open={skipping} onOpenChange={setSkipping} onSkip={() => { setSkipping(false); onDone() }} />
    </section>
  )
}

function InviteModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { s, d } = useStore()
  const [emails, setEmails] = useState(['', '', ''])
  const [error, setError] = useState(false)
  const filled = emails.map(e => e.trim()).filter(Boolean)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!filled.length || filled.some(x => !validEmail(x))) { setError(true); return }
    d({ type: 'setup/patch', patch: { invites: [...new Set([...s.setup.invites, ...filled])].slice(0, 3) } })
    setEmails(['', '', '']); onOpenChange(false)
  }
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Invite up to 3 people">
      <form className="stack" onSubmit={submit} noValidate>
        <p>They get a link to connect your profiles. They won’t see your drafts, and nothing is published without your approval.</p>
        {emails.map((v, i) => (
          <input key={i} className="input" type="email" aria-label={`Email ${i + 1}`} placeholder="name@company.com" value={v}
            onChange={e => { setError(false); setEmails(x => x.map((y, j) => (j === i ? e.target.value : y))) }} />
        ))}
        {error && <p className="onb-error" role="alert">Enter a valid email address.</p>}
        <div className="row"><span className="spacer" /><Btn variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn><Btn type="submit" variant="primary">Send invitations</Btn></div>
      </form>
    </Modal>
  )
}

/** archie-skip-connect-modal, with its reasons and reassurances. */
function SkipModal({ open, onOpenChange, onSkip }: { open: boolean; onOpenChange: (o: boolean) => void; onSkip: () => void }) {
  const { s, d } = useStore()
  const [reason, setReason] = useState<SkipReason | null>(s.setup.skip?.reason ?? null)
  const [text, setText] = useState('')
  const [email, setEmail] = useState('')
  const pick = (r: SkipReason) => { if (r !== reason) { setText(''); setEmail('') } setReason(r) }
  const blocked = skipBlocked(reason, text, email)
  const confirm = () => {
    if (blocked || !reason) return
    d({ type: 'setup/patch', patch: { skip: { reason, text: text.trim() }, invites: email.trim() ? [...new Set([...s.setup.invites, email.trim()])] : s.setup.invites } })
    onSkip()
  }
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Skip connecting an account?"
      footer={<><span className="spacer" /><Btn variant="ghost" onClick={() => onOpenChange(false)}>Connect a profile</Btn><Btn disabled={blocked} onClick={confirm}>Skip</Btn></>}>
      <div className="stack">
        <p>A connected account lets us size, format and schedule each draft for the right network.</p>
        <fieldset className="onb-reasons">
          <legend><b>What’s holding you back?</b> <span className="muted">Pick the main reason.</span></legend>
          {SKIP_REASONS.map(r => (
            <div key={r.value} className="onb-reason">
              <label><input type="radio" name="onb-skip" checked={reason === r.value} onChange={() => pick(r.value)} />{r.label}</label>
              {reason === r.value && (
                <div className="onb-reason-more">
                  {needsReasonText(r.value) && (
                    <input className="input" autoFocus aria-label={r.value === 'NETWORK_MISSING' ? 'Which one?' : 'Tell us more'} placeholder={r.value === 'NETWORK_MISSING' ? 'Which one? e.g. Snapchat, Reddit' : 'Tell us more'} value={text} onChange={e => setText(e.target.value)} />
                  )}
                  {r.value === 'SOMEONE_ELSE' && <>
                    <label className="t-sm" htmlFor="onb-skip-email">Invite them to connect (optional)</label>
                    <input id="onb-skip-email" className="input" type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!!email && !validEmail(email)} />
                    {!!email && !validEmail(email) && <p className="onb-error">Enter a valid email address.</p>}
                  </>}
                  <p className="muted t-sm">{r.value === 'SOMEONE_ELSE' && !email ? 'Nothing is published without your approval and you can connect an account later from your Desk.' : r.followUp}</p>
                </div>
              )}
            </div>
          ))}
        </fieldset>
      </div>
    </Modal>
  )
}

