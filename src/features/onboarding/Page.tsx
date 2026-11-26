import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useStore } from '../../app/store'
import { Btn } from '../../ui'
import { STAGES, isStep, type Step } from './model'
import { AboutYou, Signup, TeamOrg } from './Account'
import { Connect } from './Connect'
import { Playbook } from './Playbook'
import { Team } from './Steps'
import Results from './Results'
import './onboarding.css'

export default function OnboardingPage() {
  const { s, d } = useStore()
  const nav = useNavigate()
  const raw = useParams()['*'] ?? ''
  const step: Step | null = isStep(raw) ? raw : null
  const signedUp = !!s.setup.email
  // The Playbook and the team wait for the account; the results wait for the team.
  const valid = !!step && (step === 'signup' || signedUp) && (step !== 'results' || s.phase === 'day1') && (!['team'].includes(step) || !!s.setup.pb.brief)

  // The last screen you reached is where /onboarding resumes. Each new screen takes the focus to its title.
  useEffect(() => {
    if (!step || !valid) return
    if (step !== s.setup.step && s.phase !== 'day1') d({ type: 'setup/patch', patch: { step } })
    window.scrollTo(0, 0)
    if (!document.activeElement || document.activeElement === document.body || !document.activeElement.closest('.onb-main')) document.querySelector<HTMLElement>('.onb-step h1')?.focus({ preventScroll: true })
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!step) return <Navigate to={`/onboarding/${signedUp ? s.setup.step : 'signup'}`} replace />
  if (!valid) return <Navigate to={`/onboarding/${signedUp ? (s.phase === 'day1' ? 'results' : 'playbook') : 'signup'}`} replace />

  const go = (to: Step) => nav(`/onboarding/${to}`)
  // Skipping never loses anything: the team starts with what's set, the rest waits on the getting-started list.
  const later = () => { d({ type: 'setup/start' }); nav('/'); window.scrollTo(0, 0) }
  const stage = STAGES.findIndex(st => st.steps.includes(step))
  // "Finish later" needs a trial: from the Playbook on, the team can start with what's set.
  const canLeave = s.phase !== 'day1' && ['connect', 'playbook', 'team'].includes(step)

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
          {canLeave && <Btn variant="ghost" size="sm" onClick={later} title="Your team starts with what’s set so far. The rest waits on your Desk.">Finish later</Btn>}
          {s.phase === 'day1' && step === 'results' && <Btn variant="ghost" size="sm" onClick={() => nav('/')}>Back to my Desk</Btn>}
        </div>
      </header>

      <main className="onb-main" key={step}>
        {step === 'signup' && <Signup onDone={() => go('about')} />}
        {step === 'about' && <AboutYou onDone={() => go('team-org')} />}
        {step === 'team-org' && <TeamOrg onBack={() => go('about')} onDone={() => go('connect')} />}
        {step === 'connect' && <Connect onBack={() => go('team-org')} onDone={() => go('playbook')} />}
        {step === 'playbook' && <Playbook onBack={() => go('connect')} onDone={() => go('team')} />}
        {step === 'team' && <Team onBack={() => go('playbook')} onDone={() => { d({ type: 'setup/start' }); go('results') }} />}
        {step === 'results' && <Results onDone={() => { nav('/'); window.scrollTo(0, 0) }} />}
      </main>

      <p className="onb-testing">Running a test session? <button className="link-btn" onClick={() => { d({ type: 'core/reset' }); nav('/') }}>Skip to the 30-day workspace</button></p>
    </div>
  )
}
