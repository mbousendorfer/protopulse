// Agorapulse's own first screens: sign-up (+auth/auth-signup) and the about-you qualification, in two screens instead of three.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useStore } from '../../app/store'
import { now as appNow } from '../../app/core'
import { AGENTS } from '../../data/agents'
import { Btn, Mark, Menu, Modal, Seg } from '../../ui'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { TrailScene } from '../../ui/Illustrations'
import {
  HEARD, HEARD_NETWORKS, PHONE_CODES, SSO_ACCOUNT, TEAM_SIZES, TOOLS, aboutErrors, deduce, disposableEmail, heardFollowUp, orgFromSite, validEmail, type About,
} from './model'
import { Field, Foot, Head, Pick } from './parts'

const LINES: Record<string, string> = {
  nova: 'answers your community', atlas: 'plans and writes your posts', iris: 'tells you what works',
  echo: 'watches your competitors', sage: 'keeps your strategy on track', juno: 'cuts your videos into clips',
}

const GoogleG = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
)
const AppleMark = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path fill="currentColor" d="M11.2 8.5c0-1.6 1.3-2.3 1.3-2.4-.7-1-1.8-1.2-2.2-1.2-.9-.1-1.8.6-2.3.6s-1.2-.5-2-.5C5 5 4 5.6 3.5 6.6c-1.1 1.9-.3 4.7.8 6.2.5.7 1.1 1.6 1.9 1.5.8 0 1-.5 2-.5s1.2.5 2 .5 1.3-.8 1.8-1.5c.6-.8.8-1.6.8-1.7 0 0-1.6-.6-1.6-2.6zM9.7 3.8c.4-.5.7-1.2.6-1.8-.6 0-1.3.4-1.7.9-.4.4-.7 1.1-.6 1.8.6 0 1.3-.4 1.7-.9z" /></svg>

type Who = { first: string; last: string; email: string }

export function Signup({ onDone }: { onDone: () => void }) {
  const { d } = useStore()
  const [email, setEmail] = useState('')
  const [email2, setEmail2] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; email2?: string; password?: string }>({})
  const [chooser, setChooser] = useState<'google' | 'apple' | null>(null)
  const [busy, setBusy] = useState(false)
  const first = useRef<HTMLInputElement>(null)
  const timer = useRef<number>()
  useEffect(() => () => clearTimeout(timer.current), [])

  const finish = (who: Who, how: 'google' | 'apple' | 'email') => {
    setBusy(true)
    const site = deduce(who.email).site
    timer.current = window.setTimeout(() => { d({ type: 'setup/patch', patch: { ...who, how, site, org: orgFromSite(site) } }); onDone() }, 600)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    // The product's own messages, in the same order.
    if (!email.trim()) next.email = 'Email is required'
    else if (!validEmail(email)) next.email = 'Email is invalid'
    else if (disposableEmail(email)) next.email = 'Disposable emails not allowed, please use a business email.'
    if (!next.email && email2.trim().toLowerCase() !== email.trim().toLowerCase()) next.email2 = 'Emails do not match.'
    if (!password) next.password = 'Password is required'
    else if (password.length < 8) next.password = 'Password is invalid (minimum 8 characters)'
    setErrors(next)
    const bad = Object.keys(next)[0]
    if (bad) { document.getElementById(`onb-${bad}`)?.focus(); return }
    const { first: f, last } = deduce(email)
    finish({ first: f, last, email: email.trim().toLowerCase() }, 'email')
  }
  const field = (id: 'email' | 'email2' | 'password') => ({ id: `onb-${id}`, 'aria-invalid': !!errors[id], 'aria-describedby': errors[id] ? `onb-${id}-err` : undefined })

  return (
    <div className="onb-signup-grid">
      <section className="onb-step">
        <Head title="Welcome aboard 👋" lede="Try us for free. No credit card needed." />
        <div className="onb-auth">
          <div className="onb-sso">
            <Btn onClick={() => setChooser('google')} disabled={busy}><GoogleG />Sign up with Google</Btn>
            <Btn onClick={() => setChooser('apple')} disabled={busy}><AppleMark />Sign up with Apple</Btn>
          </div>
          <div className="onb-or" role="separator"><span>or</span></div>
          <form className="onb-email" onSubmit={submit} noValidate>
            <Field id="onb-email" label="Business email" error={errors.email}>
              <input ref={first} {...field('email')} className="input" type="email" autoComplete="email" placeholder="name@email.com" value={email} onChange={e => { setEmail(e.target.value); setErrors({}) }} />
            </Field>
            <Field id="onb-email2" label="Confirm email" error={errors.email2}>
              <input {...field('email2')} className="input" type="email" autoComplete="email" placeholder="name@email.com" value={email2} onChange={e => { setEmail2(e.target.value); setErrors({}) }} />
            </Field>
            <Field id="onb-password" label="Password" error={errors.password} hint="At least 8 characters.">
              <input {...field('password')} className="input" type="password" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setErrors({}) }} />
            </Field>
            <Btn type="submit" variant="primary" disabled={busy}>{busy ? 'Creating your account…' : 'Sign up'}</Btn>
          </form>
          <p className="onb-fine">By clicking on “Sign up”, you agree to Protopulse’s Terms of Service and acknowledge its Privacy Policy.</p>
        </div>
      </section>

      <aside className="onb-signup-side" aria-label="Your team">
        <TrailScene />
        <ul>
          {AGENTS.map(a => <li key={a.id}><Mark agent={a.id} size="md" /><span><b>{a.name}</b> {LINES[a.id]}</span></li>)}
        </ul>
        <p>Nothing goes out until you say so.</p>
      </aside>

      <Modal open={!!chooser} onOpenChange={o => !o && setChooser(null)} title={chooser === 'apple' ? 'Sign up with Apple' : 'Choose an account'}>
        <div className="stack">
          <button className="choice" onClick={() => { const how = chooser!; setChooser(null); finish(SSO_ACCOUNT, how) }}>
            <SocialAvatar name="Sam Rivera" size={32} />
            <span className="grow"><b>Sam Rivera</b><br /><span className="muted t-sm">{SSO_ACCOUNT.email}</span></span>
          </button>
          <button className="link-btn self-start" onClick={() => { setChooser(null); setTimeout(() => first.current?.focus(), 50) }}>Use an email address instead</button>
        </div>
      </Modal>
    </div>
  )
}

/* ---------- About you, screen 1: the person ---------- */

const pickAbout = (s: About): About => ({ first: s.first, last: s.last, phoneCode: s.phoneCode, phone: s.phone, org: s.org, teamSize: s.teamSize, tool: s.tool, heard: s.heard, heardNetwork: s.heardNetwork, heardText: s.heardText, usa: s.usa })

export function AboutYou({ onDone }: { onDone: () => void }) {
  const { s, d } = useStore()
  const [a, setA] = useState<About>(() => pickAbout(s.setup))
  const [shown, setShown] = useState(false)
  const errors = shown ? aboutErrors(a, 'about') : {}
  const put = (p: Partial<About>) => setA(x => ({ ...x, ...p }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs = aboutErrors(a, 'about')
    setShown(true)
    const bad = Object.keys(errs)[0]
    if (bad) { document.getElementById(`onb-${bad}`)?.focus(); return }
    d({ type: 'setup/patch', patch: { first: a.first.trim(), last: a.last.trim(), phoneCode: a.phoneCode, phone: a.phone.trim() } })
    onDone()
  }
  const code = PHONE_CODES.find(c => c.code === a.phoneCode) ?? PHONE_CODES[0]
  return (
    <section className="onb-step onb-narrow">
      <Head title="Let’s get to know you" lede={s.setup.how === 'email' ? 'We took your name from your email. Fix it if it’s wrong.' : `We took your name from your ${s.setup.how === 'apple' ? 'Apple' : 'Google'} account.`} />
      <form className="onb-form" onSubmit={submit} noValidate>
        <div className="onb-two">
          <Field id="onb-first" label="First name" error={errors.first}>
            <input id="onb-first" className="input" autoComplete="given-name" placeholder="Your first name" value={a.first} aria-invalid={!!errors.first} aria-describedby={errors.first ? 'onb-first-err' : undefined} onChange={e => put({ first: e.target.value })} />
          </Field>
          <Field id="onb-last" label="Last name" error={errors.last}>
            <input id="onb-last" className="input" autoComplete="family-name" placeholder="Your last name" value={a.last} aria-invalid={!!errors.last} aria-describedby={errors.last ? 'onb-last-err' : undefined} onChange={e => put({ last: e.target.value })} />
          </Field>
        </div>
        <Field id="onb-phone" label="Phone number" error={errors.phone}>
          <div className="onb-phone">
            <Menu align="start" trigger={<button type="button" className="input onb-pick onb-code" aria-label={`Country code: ${code.country} ${code.code}`}>{code.code}</button>}
              items={PHONE_CODES.map(c => ({ label: `${c.country} ${c.code}`, onSelect: () => put({ phoneCode: c.code }) }))} />
            <input id="onb-phone" className="input" type="tel" autoComplete="tel-national" inputMode="tel" value={a.phone} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'onb-phone-err' : undefined} onChange={e => put({ phone: e.target.value })} />
          </div>
        </Field>
        <Foot><Btn type="submit" variant="primary">Continue</Btn></Foot>
      </form>
    </section>
  )
}

/* ---------- About you, screen 2: the team and the organization ---------- */

export function TeamOrg({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { s, d } = useStore()
  const [a, setA] = useState<About>(() => pickAbout(s.setup))
  const [shown, setShown] = useState(false)
  const errors = shown ? aboutErrors(a, 'team-org') : {}
  const put = (p: Partial<About>) => setA(x => ({ ...x, ...p }))
  const follow = heardFollowUp(a.heard)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs = aboutErrors(a, 'team-org')
    setShown(true)
    const bad = Object.keys(errs)[0]
    if (bad) { document.getElementById(`onb-${bad}`)?.focus(); return }
    // "Start my trial": the trial starts and the welcome job begins reading the site in the background.
    d({ type: 'setup/patch', patch: { ...pickAbout(a), org: a.org.trim(), analysisAt: s.setup.analysisAt ?? (s.setup.site ? appNow(s) : undefined) } })
    onDone()
  }
  return (
    <section className="onb-step onb-narrow">
      <Head title="Your team and organization" lede={s.setup.site ? `We guessed your organization from ${s.setup.site}.` : 'A few questions, then your trial starts.'} />
      <form className="onb-form" onSubmit={submit} noValidate>
        <Field id="onb-org" label="What is the name of your organization?" error={errors.org}>
          <input id="onb-org" className="input" autoComplete="organization" placeholder="Your company name" value={a.org} aria-invalid={!!errors.org} aria-describedby={errors.org ? 'onb-org-err' : undefined} onChange={e => put({ org: e.target.value })} />
        </Field>
        <div className="field" id="onb-teamSize" tabIndex={-1}>
          <span className="label">How many people are handling social media in your company?</span>
          <Seg name="onb-team-size" label="How many people are handling social media in your company?" value={a.teamSize ?? ('' as never)} onChange={v => put({ teamSize: v })} options={TEAM_SIZES.map(t => ({ value: t.value, label: t.label }))} />
          {errors.teamSize && <p className="onb-error" role="alert">{errors.teamSize}</p>}
        </div>
        <Pick id="onb-tool" label="Is your company already using a Social Media Management tool?" value={a.tool} options={TOOLS} onChange={v => put({ tool: v })} error={errors.tool} />
        <Pick id="onb-heard" label="Where did you first hear about us?" value={a.heard} options={HEARD} onChange={v => put({ heard: v, heardNetwork: null, heardText: '' })} error={errors.heard} />
        {follow?.kind === 'network' && (
          <Pick id="onb-heardNetwork" label={follow.label} value={a.heardNetwork} options={HEARD_NETWORKS.map(n => ({ value: n, label: n }))} onChange={v => put({ heardNetwork: v })} error={errors.heardNetwork} />
        )}
        {follow?.kind === 'text' && (
          <Field id="onb-heardText" label={follow.required ? follow.label : <>{follow.label} <span className="muted">(optional)</span></>} error={errors.heardText}>
            {follow.multiline
              ? <textarea id="onb-heardText" className="textarea" placeholder={follow.placeholder} value={a.heardText} aria-invalid={!!errors.heardText} onChange={e => put({ heardText: e.target.value })} />
              : <input id="onb-heardText" className="input" placeholder={follow.placeholder} value={a.heardText} onChange={e => put({ heardText: e.target.value })} />}
          </Field>
        )}
        <div className="field" id="onb-usa" tabIndex={-1}>
          <span className="label">Are you based in the USA?</span>
          <Seg name="onb-usa" label="Are you based in the USA?" value={a.usa ?? ('' as never)} onChange={v => put({ usa: v })} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
          {errors.usa && <p className="onb-error" role="alert">{errors.usa}</p>}
        </div>
        <Foot onBack={onBack} note="16-day trial · Advanced plan"><Btn type="submit" variant="primary">Start my trial</Btn></Foot>
      </form>
    </section>
  )
}
