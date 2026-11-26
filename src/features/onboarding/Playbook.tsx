// Archie's Playbook onboarding ("Let's understand your brand."): website or interview, voice source, the 3-stage build, the recap.
import { useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Check, FileText, Globe, MessageSquareText, Pencil, Plus, UserRound, X } from 'lucide-react'
import { useStore } from '../../app/store'
import { now as appNow } from '../../app/core'
import { Btn, Pill } from '../../ui'
import { SocialAvatar } from '../../ui/SocialAvatar'
import {
  INTERVIEW, LOADER, POSTS_READ, PROPOSALS, buildBrief, isSocialUrl, loadingMs, missingFields, normalizeSite, pageOf, pickOf, type Brief, type Opt, type Proposal, type VoiceSource,
} from './model'
import { ConnectModal } from './Connect'
import { Field, Foot, Head, useElapsed } from './parts'

export function Playbook({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { s } = useStore()
  const sub = s.setup.pb.sub
  // Each sub-screen hands the focus to its title, like a screen of its own.
  useEffect(() => { document.querySelector<HTMLElement>('.onb-step h1')?.focus({ preventScroll: true }); window.scrollTo(0, 0) }, [sub])
  if (sub === 'interview') return <Interview />
  if (sub === 'voice') return <VoiceSourceStep />
  if (sub === 'loading') return <Loading />
  if (sub === 'recap' && s.setup.pb.brief) return <Recap onDone={onDone} />
  return <Source onBack={onBack} />
}

/* ---------- 1. The website, or the interview ---------- */

function Source({ onBack }: { onBack: () => void }) {
  const { s, d } = useStore()
  const guessed = s.setup.site
  const [value, setValue] = useState(s.setup.pb.website || guessed)
  const [error, setError] = useState('')
  const site = normalizeSite(value)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!value.trim()) { setError('Paste a website URL to get started.'); return }
    if (!site) { setError('That doesn’t look like a valid website URL. Try something like https://yourbrand.com.'); return }
    if (isSocialUrl(site)) { setError('That’s a social profile, not a website. Enter your website, or pick “I don’t have a website”.'); return }
    d({ type: 'setup/pb', patch: { website: site, noWebsite: false, sub: 'voice' } })
  }
  return (
    <section className="onb-step onb-narrow">
      <Head title="Let’s understand your brand." lede="Point us at your website and we’ll capture what makes your brand yours, then shape it into a Playbook that keeps every post sounding like you." />
      <form className="onb-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="onb-site">What’s your website URL?</label>
          <div className={`onb-url ${error ? 'invalid' : ''}`}>
            <span aria-hidden>https://</span>
            <input id="onb-site" className="input" autoComplete="url" inputMode="url" placeholder="your-brand.com" value={value}
              aria-invalid={!!error} aria-describedby="onb-site-hint" onChange={e => { setValue(e.target.value); setError('') }} />
          </div>
          <p id="onb-site-hint" className={error ? 'onb-error' : 'onb-hint'} role={error ? 'alert' : undefined}>
            {error || (site && site === guessed && s.setup.analysisAt ? `From your email address. We started reading it when your trial started.`
              : site && site !== 'fernway.co' ? 'This test always reads Fernway, whatever the address.' : ' ')}
          </p>
        </div>
        <button type="button" className="choice" onClick={() => d({ type: 'setup/pb', patch: { noWebsite: true, sub: 'interview' } })}>
          <MessageSquareText size={18} aria-hidden />
          <span className="grow"><b>I don’t have a website</b><br /><span className="muted t-sm">Answer a few quick questions instead</span></span>
        </button>
        <Foot onBack={onBack}><Btn type="submit" variant="primary">Continue</Btn></Foot>
      </form>
    </section>
  )
}

function Interview() {
  const { s, d } = useStore()
  const answers = s.setup.pb.answers
  const [i, setI] = useState(Math.min(answers.length, INTERVIEW.length - 1))
  const [text, setText] = useState(answers[i] ?? '')
  const [error, setError] = useState(false)
  const save = (value: string, to: number) => {
    const next = [...answers]; next[i] = value
    d({ type: 'setup/pb', patch: to >= INTERVIEW.length ? { answers: next, sub: 'voice' } : { answers: next } })
    if (to < INTERVIEW.length) { setI(to); setText(next[to] ?? '') }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) { setError(true); return }
    save(text.trim(), i + 1)
  }
  return (
    <section className="onb-step onb-narrow">
      <Head title="A few quick questions" lede="No problem. Answer in your own words: we’ll turn it into your Playbook." />
      <form className="onb-form" onSubmit={submit} noValidate>
        <Field id="onb-answer" label={<><span className="muted">Question {i + 1} of {INTERVIEW.length}</span><br /><b className="onb-question">{INTERVIEW[i]}</b></>} error={error ? 'Type an answer, or skip this question.' : undefined}>
          <textarea id="onb-answer" key={i} className="textarea" autoFocus placeholder="Type your answer…" value={text} rows={3}
            onChange={e => { setText(e.target.value); setError(false) }}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e as unknown as FormEvent) }} />
        </Field>
        <Foot onBack={() => (i ? (setI(i - 1), setText(answers[i - 1] ?? '')) : d({ type: 'setup/pb', patch: { sub: 'source' } }))}
          note={i === 0 ? 'Skip available after this question' : undefined}>
          {i > 0 && <Btn variant="ghost" onClick={() => save('', i + 1)}>Skip this question</Btn>}
          <Btn type="submit" variant="primary">{i === INTERVIEW.length - 1 ? 'Continue' : 'Next question'}</Btn>
        </Foot>
      </form>
    </section>
  )
}

/* ---------- 2. How should we learn your voice? ---------- */

const SAMPLE_DOC = 'fernway-brand-voice.pdf'

function VoiceSourceStep() {
  const { s, d } = useStore()
  const pb = s.setup.pb
  const connected = s.setup.connected
  const site = !pb.noWebsite && !!pb.website
  const [source, setSource] = useState<VoiceSource | null>(pb.voiceSource ?? (connected.length ? 'profile' : site ? 'website' : null))
  const [page, setPage] = useState(pb.voicePage ?? connected.find(id => pageOf(id)?.id === 'ig') ?? connected[0])
  const [doc, setDoc] = useState(pb.docName ?? '')
  const [pasted, setPasted] = useState(pb.pasted)
  const [connecting, setConnecting] = useState(false)
  useEffect(() => { if (!page && connected.length) { setPage(connected[0]); setSource('profile') } }, [connected.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const ready = source === 'profile' ? !!page : source === 'document' ? !!doc : source === 'custom' ? !!pasted.trim() : source === 'website'
  const go = () => {
    if (!ready || !source) return
    d({ type: 'setup/pb', patch: { voiceSource: source, voicePage: source === 'profile' ? page : undefined, docName: doc || undefined, pasted, sub: 'loading', brief: undefined } })
  }
  const opt = (value: VoiceSource, icon: ReactNode, title: string, caption: ReactNode, extra?: ReactNode, disabled?: boolean) => (
    <li className={`onb-source ${source === value ? 'on' : ''} ${disabled ? 'off' : ''}`}>
      <label>
        <input type="radio" name="onb-voice" checked={source === value} disabled={disabled} onChange={() => setSource(value)} />
        {icon}
        <span className="grow"><b>{title}</b><br /><span className="muted t-sm">{caption}</span></span>
      </label>
      {source === value && extra && <div className="onb-source-more">{extra}</div>}
    </li>
  )
  return (
    <section className="onb-step onb-narrow">
      <Head title="How should we learn your voice?" lede={pb.noWebsite ? 'Thanks, that’s what we needed. Now we need a sample of how you write.' : 'Pick a source. Your own posts give the closest match.'} />
      <ul className="onb-sources">
        {opt('profile', <UserRound size={18} aria-hidden />, 'Analyze a connected profile',
          connected.length ? <>Reads its last {POSTS_READ} posts <Pill tone="ok">Recommended</Pill></> : <>No connected profiles yet. <button type="button" className="link-btn" onClick={() => setConnecting(true)}>Connect one</button></>,
          connected.length > 1 && (
            <div className="onb-pages" role="radiogroup" aria-label="Which profile to analyze?">
              {connected.map(id => <label key={id}><input type="radio" name="onb-voice-page" checked={page === id} onChange={() => setPage(id)} /><SocialAvatar name={pageOf(id)!.name} org size={24} />{pageOf(id)!.name}</label>)}
            </div>
          ), !connected.length)}
        {opt('document', <FileText size={18} aria-hidden />, 'Upload a document you wrote', 'PDF, Word, text, or Markdown. We’ll learn your voice from it.', (
          <div className="stack sm">
            <input type="file" className="onb-file" accept=".pdf,.doc,.docx,.txt,.md" aria-label="Upload a document you wrote" onChange={e => setDoc(e.target.files?.[0]?.name ?? '')} />
            {doc ? <p className="onb-sent"><Check size={14} aria-hidden className="ok" />{doc}</p> : <p className="muted t-sm">Up to 3.5 MB. No file handy? <button type="button" className="link-btn" onClick={() => setDoc(SAMPLE_DOC)}>Use {SAMPLE_DOC}</button></p>}
          </div>
        ))}
        {opt('custom', <Pencil size={18} aria-hidden />, 'Write or paste your voice', 'Used exactly as written, no analysis.', (
          <textarea className="textarea" aria-label="Write or paste your voice" rows={4} value={pasted} onChange={e => setPasted(e.target.value)}
            placeholder="e.g. Candid and specific. Short paragraphs, no jargon. Confident but down-to-earth: trust the reader to be smart…" />
        ))}
        {site && opt('website', <Globe size={18} aria-hidden />, 'Read it from your website', 'Less accurate than your posts: a site isn’t written like a reply.')}
      </ul>
      <Foot onBack={() => d({ type: 'setup/pb', patch: { sub: pb.noWebsite ? 'interview' : 'source' } })}>
        <Btn variant="primary" disabled={!ready} onClick={go}>Build my Playbook</Btn>
      </Foot>
      <ConnectModal open={connecting} onOpenChange={setConnecting} why="Your own posts are the closest match for your voice." />
    </section>
  )
}

/* ---------- 3. The build: quick when the site was read in the background ---------- */

function Loading() {
  const { s, d } = useStore()
  const pb = s.setup.pb
  const fromSite = !pb.noWebsite
  const prerun = fromSite && pb.website === s.setup.site && !!s.setup.analysisAt
  const total = loadingMs(prerun)
  const ms = useElapsed(total)
  const stages = fromSite ? LOADER.site : LOADER.interview
  const at = Math.min(stages.length - 1, Math.floor((ms / total) * stages.length))
  useEffect(() => {
    if (ms >= total) d({ type: 'setup/pb', patch: { sub: 'recap', brief: buildBrief(pb, s.setup.org, s.setup.connected) } })
  }, [ms >= total]) // eslint-disable-line react-hooks/exhaustive-deps
  const started = s.setup.analysisAt ? Math.max(1, Math.round((appNow(s) - s.setup.analysisAt) / 60_000)) : 0
  return (
    <section className="onb-step onb-narrow">
      <Head title="Crafting your Playbook" lede={prerun ? `We started reading ${pb.website} ${started} min ago, when your trial started. Nearly there.` : 'This usually takes about 10 seconds.'} />
      <ol className="onb-phases" aria-label="Building your Playbook">
        {stages.map((st, i) => {
          const state = i < at ? 'done' : i === at ? 'current' : 'todo'
          return (
            <li key={st.title} className={state}>
              <span className="onb-phase-icon" aria-hidden>{state === 'done' ? <Check size={12} /> : state === 'current' ? <span className="spin" /> : null}</span>
              <span><span className="onb-phase-label">{st.title}</span><span className="onb-phase-done">{st.sub}</span></span>
            </li>
          )
        })}
      </ol>
      <p className="sr-only" aria-live="polite">{stages[at].title}</p>
      <Foot onBack={() => d({ type: 'setup/pb', patch: { sub: 'voice' } })}><span /></Foot>
    </section>
  )
}

/* ---------- 4. The recap: Archie's fields, required ones block Continue ---------- */

function Toggles({ label, items, onChange }: { label: string; items: Opt[]; onChange: (o: Opt[]) => void }) {
  return (
    <div className="filters onb-toggles" role="group" aria-label={label}>
      {items.map((o, i) => (
        <button key={o.label} type="button" className="filter" aria-pressed={o.on} onClick={() => onChange(items.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}>
          {o.on && <Check size={12} aria-hidden />}{o.label}
        </button>
      ))}
    </div>
  )
}

function Card({ title, sub, from, children }: { title: string; sub?: string; from?: string; children: ReactNode }) {
  return (
    <div className="onb-q-card">
      <h3>{title}</h3>
      {sub && <p className="muted t-sm">{sub}</p>}
      {children}
      {from && <p className="onb-from">{from}</p>}
    </div>
  )
}

function AddLine({ label, placeholder, onAdd }: { label: string; placeholder: string; onAdd: (v: string) => void }) {
  const [v, setV] = useState('')
  const add = () => { if (v.trim()) { onAdd(v.trim()); setV('') } }
  return (
    <div className="row tight">
      <input className="input grow" aria-label={label} placeholder={placeholder} value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
      <Btn size="sm" onClick={add} disabled={!v.trim()}><Plus size={14} />Add</Btn>
    </div>
  )
}

function Recap({ onDone }: { onDone: () => void }) {
  const { s, d } = useStore()
  const pb = s.setup.pb
  const b = pb.brief!
  const put = (patch: Partial<Brief>) => d({ type: 'setup/brief', patch })
  const site = pb.noWebsite ? '' : pb.website
  const missing = missingFields(b, site)
  const learned = s.setup.connected.length > 0
  const from = site ? 'From your website' : 'From your answers'
  return (
    <section className="onb-step">
      <Head title={b.name.trim() ? `Here’s the ${b.name.trim()} Playbook` : 'Here’s your Playbook'} lede={`${site ? 'Pre-filled from your website' : 'Drafted from your answers'}. Edit anything: every agent writes from it.`} />

      <div className="onb-group">
        <h2>Brand</h2>
        <div className="card onb-recap">
          <Card title="Playbook name" sub="Shown next to the Playbook in chats and listings.">
            <input className="input" aria-label="Playbook name" value={b.name} onChange={e => put({ name: e.target.value })} />
          </Card>
          <Card title="Does this describe your business correctly?" sub="Edit it directly if anything needs adjusting." from={from}>
            <textarea className="textarea" aria-label="Business summary" rows={3} value={b.summary} onChange={e => put({ summary: e.target.value })} />
          </Card>
        </div>
      </div>

      <div className="onb-group">
        <h2>Audience and goals</h2>
        <div className="card onb-recap">
          <Card title="Who is your primary audience?" sub="Posts speak to them first.">
            <div className="onb-radios" role="radiogroup" aria-label="Primary audience">
              {b.audiences.map(a => (
                <div key={a} className="onb-radio-row">
                  <label><input type="radio" name="onb-aud" checked={b.primary === a} onChange={() => put({ primary: a })} />{a}</label>
                  <Btn variant="ghost" size="xs" icon aria-label={`Remove ${a}`} onClick={() => put({ audiences: b.audiences.filter(x => x !== a), primary: b.primary === a ? null : b.primary })}><X size={12} /></Btn>
                </div>
              ))}
            </div>
            <AddLine label="Add an audience" placeholder="Add an audience" onAdd={v => put({ audiences: [...b.audiences, v], primary: b.primary ?? v })} />
          </Card>
          <Card title="What’s your primary social media objective?" sub="Agents favour angles that serve it.">
            <Toggles label="Objective" items={b.objectives} onChange={objectives => put({ objectives })} />
          </Card>
          <Card title="What action should your content drive?" sub="Posts include a call to action that matches.">
            <Toggles label="Content action" items={b.actions} onChange={actions => put({ actions })} />
          </Card>
          <Card title="Where should readers go next?" sub={site ? 'The links agents weave into posts.' : 'Optional without a website.'}>
            {b.ctaUrls.map((u, i) => (
              <div key={i} className="row tight">
                <input className="input grow" aria-label={`Link ${i + 1}`} value={u} onChange={e => put({ ctaUrls: b.ctaUrls.map((x, j) => (j === i ? e.target.value : x)) })} />
                <Btn variant="ghost" size="sm" icon aria-label={`Remove link ${i + 1}`} onClick={() => put({ ctaUrls: b.ctaUrls.filter((_, j) => j !== i) })}><X size={14} /></Btn>
              </div>
            ))}
            <AddLine label="Add a link" placeholder="https://" onAdd={v => put({ ctaUrls: [...b.ctaUrls, v] })} />
          </Card>
        </div>
      </div>

      <div className="onb-group">
        <h2>Voice and style</h2>
        <div className="card onb-recap">
          <Card title="What content style fits your brand?" sub="It guides the structure of every post.">
            <Toggles label="Content style" items={b.styles} onChange={styles => put({ styles })} />
          </Card>
          <Card title="Tone of voice" sub={b.voiceSource === 'website' ? 'Agents match it in every draft.' : 'Agents match it in every draft. Optional: your voice profile already says it.'}>
            <Toggles label="Tone of voice" items={b.tones} onChange={tones => put({ tones })} />
          </Card>
          <Card title="Voice profile" sub={b.voiceSource === 'custom' ? 'You wrote this voice yourself. Agents follow it exactly as written.' : 'How your posts and replies read.'} from={b.voiceFrom}>
            <textarea className="textarea" aria-label="Voice profile" rows={3} value={b.voice} onChange={e => put({ voice: e.target.value })} />
          </Card>
        </div>
      </div>

      {b.competitors.length > 0 && (
        <div className="onb-group">
          <h2>Competitors <span className="muted">· found from your website. Echo watches them for your topic feed.</span></h2>
          <ul className="card rows">
            {b.competitors.map((c, i) => (
              <li key={c.id} className={`onb-prop ${c.on ? '' : 'off'}`}>
                <input type="checkbox" className="check" checked={c.on} aria-label={`Watch ${c.label}`} onChange={e => put({ competitors: b.competitors.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)) })} />
                <SocialAvatar name={c.label} org size={24} /><span className="onb-prop-text">{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {learned && (
        <div className="onb-group">
          <h2>What Nova learned from your public replies <span className="muted">· in plain words. Untick what’s wrong, click a line to fix it.</span></h2>
          <ul className="card rows">{PROPOSALS.map(p => <ProposalRow key={p.id} p={p} />)}</ul>
        </div>
      )}

      <Foot onBack={() => d({ type: 'setup/pb', patch: { sub: 'voice' } })} note={missing.length ? <span className="onb-missing" role="status">Fill these in to save: {missing.join(', ')}</span> : undefined}>
        <Btn variant="primary" disabled={missing.length > 0} onClick={onDone}>Save and continue</Btn>
      </Foot>
    </section>
  )
}

function ProposalRow({ p }: { p: Proposal }) {
  const { s, d } = useStore()
  const pick = pickOf(s.setup.picks, p)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(pick.text)
  const save = () => { if (text.trim() && text.trim() !== pick.text) d({ type: 'setup/pick', id: p.id, text, keep: true }); setEditing(false) }
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); save() } if (e.key === 'Escape') { e.preventDefault(); setText(pick.text); setEditing(false) } }
  const edited = pick.text !== p.text
  return (
    <li className={`onb-prop ${pick.keep ? '' : 'off'}`}>
      <input type="checkbox" className="check" checked={pick.keep} onChange={e => d({ type: 'setup/pick', id: p.id, keep: e.target.checked })} aria-label={`Keep: ${pick.text}`} />
      <div className="grow">
        {editing
          ? <input className="input" autoFocus onFocus={e => e.target.select()} value={text} aria-label="Edit this line" onChange={e => setText(e.target.value)} onKeyDown={onKey} onBlur={save} />
          : <button className="onb-prop-text" onClick={() => { setText(pick.text); setEditing(true) }} title="Click to edit">{pick.text}<Pencil size={12} aria-hidden className="onb-pencil" /></button>}
        <div className="onb-proof">{edited && <>Edited by you · <button className="link-btn" onClick={() => { d({ type: 'setup/pick', id: p.id, text: p.text }); setText(p.text) }}>Restore</button> · </>}{p.evidence}</div>
      </div>
    </li>
  )
}
