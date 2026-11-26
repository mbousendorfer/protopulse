import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { useStore } from '../../app/store'
import { AGENTS } from '../../data/agents'
import { Btn, Mark, Modal } from '../../ui'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { TrailScene } from '../../ui/Illustrations'
import { GOOGLE_ACCOUNT, STAGES, deduce, isStep, normalizeSite, validEmail, type Step } from './model'
import { Accounts, Brand, Reading, Team } from './Steps'
import { Foot, Head } from './parts'
import Results from './Results'
import './onboarding.css'

export default function OnboardingPage() {
  const { s, d } = useStore()
  const nav = useNavigate()
  const raw = useParams()['*'] ?? ''
  const step: Step | null = isStep(raw) ? raw : null
  const valid = !!step && (step === 'signup' || !!s.setup.email) && (step !== 'results' || s.phase === 'day1')

  // The last screen you reached is where /onboarding resumes. Each new screen takes the focus to its title.
  useEffect(() => {
    if (!step || !valid) return
    if (step !== s.setup.step) d({ type: 'setup/patch', patch: { step } })
    window.scrollTo(0, 0)
    // A screen with its own field keeps it focused; the others hand the focus to their title.
    if (!document.activeElement || document.activeElement === document.body || !document.activeElement.closest('.onb-main')) document.querySelector<HTMLElement>('.onb-step h1')?.focus({ preventScroll: true })
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!step) return <Navigate to={`/onboarding/${s.setup.email ? s.setup.step : 'signup'}`} replace />
  if (!valid) return <Navigate to={`/onboarding/${s.setup.email ? 'team' : 'signup'}`} replace />

  const go = (to: Step) => nav(`/onboarding/${to}`)
  // Skipping never loses anything: the team starts with what's set, the rest waits on the getting-started list.
  const later = () => { d({ type: 'setup/start' }); nav('/'); window.scrollTo(0, 0) }
  const stage = STAGES.findIndex(st => st.steps.includes(step))

  return (
    <div className={`onb at-${step}`}>
      <header className="onb-top">
        <div className="row tight nowrap">
          <span className="logo" aria-hidden><svg width="16" height="16" viewBox="0 0 32 32"><path d="M4 17h6l3-8 5 15 3-7h7" stroke="var(--void)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <b>Protopulse</b>
        </div>
        <ol className="onb-stages" aria-label={`Setup, step ${stage + 1} of ${STAGES.length}: ${STAGES[stage].label}`}>
          {STAGES.map((st, i) => (
            <li key={st.label} className={i < stage ? 'done' : i === stage ? 'current' : ''} aria-current={i === stage ? 'step' : undefined}>
              <i aria-hidden /><span>{i < stage && <Check size={12} aria-hidden />}{st.label}</span>
            </li>
          ))}
        </ol>
        <div className="onb-top-end">
          {step !== 'signup' && step !== 'results' && s.phase !== 'day1' && <Btn variant="ghost" size="sm" onClick={later} title="Your team starts with what’s set so far. The rest waits on your Desk.">Finish later</Btn>}
        </div>
      </header>

      <main className="onb-main" key={step}>
        {step === 'signup' && <Signup onDone={() => go('site')} />}
        {step === 'site' && <Site onDone={() => go('reading')} />}
        {step === 'reading' && <Reading onBack={() => go('site')} onDone={() => go('accounts')} />}
        {step === 'accounts' && <Accounts onBack={() => go('reading')} onDone={() => go('playbook')} />}
        {step === 'playbook' && <Brand onBack={() => go('accounts')} onDone={() => go('team')} />}
        {step === 'team' && <Team onBack={() => go('playbook')} onDone={() => { d({ type: 'setup/start' }); go('results') }} />}
        {step === 'results' && <Results onDone={() => { nav('/'); window.scrollTo(0, 0) }} />}
      </main>

      <p className="onb-testing">Running a test session? <button className="link-btn" onClick={() => { d({ type: 'core/reset' }); nav('/') }}>Skip to the 30-day workspace</button></p>
    </div>
  )
}

const LINES: Record<string, string> = {
  nova: 'answers your community', atlas: 'plans and writes your posts', iris: 'tells you what works',
  echo: 'watches your competitors', sage: 'keeps your strategy on track', juno: 'cuts your videos into clips',
}

function Signup({ onDone }: { onDone: () => void }) {
  const { d } = useStore()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [chooser, setChooser] = useState(false)
  const [busy, setBusy] = useState<'google' | 'email' | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<number>()
  useEffect(() => () => clearTimeout(timer.current), [])

  const finish = (who: { first: string; last: string; email: string }, how: 'google' | 'email') => {
    setBusy(how)
    timer.current = window.setTimeout(() => { d({ type: 'setup/patch', patch: { ...who, site: deduce(who.email).site } }); onDone() }, 700)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!validEmail(email)) { setError('Enter your work email, like sam@yourbrand.com.'); input.current?.focus(); return }
    const { first, last } = deduce(email)
    finish({ first, last, email: email.trim().toLowerCase() }, 'email')
  }

  return (
    <div className="onb-signup-grid">
      <section className="onb-step">
        <Head title="Meet the team that runs your social media" lede="Six AI agents work with you. Setup takes about 3 minutes, and they start before it ends." />
        <div className="onb-auth">
          <Btn className="onb-google" onClick={() => setChooser(true)} disabled={!!busy}>
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
            {busy === 'google' ? 'Signing you in…' : 'Continue with Google'}
          </Btn>
          <div className="onb-or" role="separator"><span>or</span></div>
          <form className="onb-email" onSubmit={submit} noValidate>
            <label htmlFor="onb-email">Work email</label>
            <input id="onb-email" ref={input} className="input" type="email" autoComplete="email" placeholder="sam@yourbrand.com" value={email}
              aria-invalid={!!error} aria-describedby={error ? 'onb-email-error' : undefined} onChange={e => { setEmail(e.target.value); setError('') }} />
            {error && <p id="onb-email-error" className="onb-error" role="alert">{error}</p>}
            <Btn type="submit" variant="primary" disabled={!!busy}>{busy === 'email' ? 'Creating your account…' : 'Continue with email'}</Btn>
          </form>
          <p className="onb-fine">We use your email domain to find your brand.</p>
        </div>
      </section>

      <aside className="onb-signup-side" aria-label="Your team">
        <TrailScene />
        <ul>
          {AGENTS.map(a => <li key={a.id}><Mark agent={a.id} size="md" /><span><b>{a.name}</b> {LINES[a.id]}</span></li>)}
        </ul>
        <p className="muted">Nothing goes out until you say so.</p>
      </aside>

      <Modal open={chooser} onOpenChange={setChooser} title="Choose an account">
        <div className="stack">
          <button className="choice" onClick={() => { setChooser(false); finish(GOOGLE_ACCOUNT, 'google') }}>
            <SocialAvatar name="Sam Rivera" size={32} />
            <span className="grow"><b>Sam Rivera</b><br /><span className="muted t-sm">{GOOGLE_ACCOUNT.email}</span></span>
          </button>
          <button className="link-btn self-start" onClick={() => { setChooser(false); setTimeout(() => input.current?.focus(), 50) }}>Use another account</button>
        </div>
      </Modal>
    </div>
  )
}

function Site({ onDone }: { onDone: () => void }) {
  const { s, d } = useStore()
  const fromEmail = deduce(s.setup.email).site
  const [value, setValue] = useState(s.setup.site || fromEmail)
  const [error, setError] = useState('')
  const site = normalizeSite(value)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!site) { setError('Enter your website, like fernway.co.'); return }
    d({ type: 'setup/patch', patch: { site, read: s.setup.site === site && s.setup.read } })
    onDone()
  }
  return (
    <section className="onb-step onb-narrow">
      <Head title={s.setup.first ? `What’s your website, ${s.setup.first}?` : 'What’s your website?'}
        lede="Protopulse reads it to learn your products, your policies and where you post. It’s the only thing you’ll type." />
      <form className="onb-site" onSubmit={submit} noValidate>
        <div className={`onb-url ${error ? 'invalid' : ''}`}>
          <span aria-hidden>https://</span>
          <input className="input" aria-label="Your website" autoFocus autoComplete="url" inputMode="url" placeholder="yourbrand.com" value={value}
            aria-invalid={!!error} aria-describedby="onb-site-hint" onChange={e => { setValue(e.target.value); setError('') }} />
        </div>
        <p id="onb-site-hint" className={error ? 'onb-error' : 'onb-hint'} role={error ? 'alert' : undefined}>
          {error || (site && site !== 'fernway.co' ? 'This test always reads Fernway, whatever the address.'
            : value && site === fromEmail ? 'From your email address.'
            : !value ? <>No website handy? <button type="button" className="link-btn" onClick={() => setValue('fernway.co')}>Use fernway.co</button></> : ' ')}
        </p>
        <Foot><Btn type="submit" variant="primary"><Sparkles size={14} />Read my brand</Btn></Foot>
      </form>
    </section>
  )
}
