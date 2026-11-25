import { useRef, useState } from 'react'
import { AlertTriangle, CalendarPlus, Check, ChevronDown, ImagePlus, Scissors, Send, Sparkles, Trash2, Upload, Users, Wand2, X } from 'lucide-react'
import type { Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { uid } from '../../app/core'
import { DAY, hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { BEST_SLOT, type Pillar, type Post } from '../../data/publishing'
import { Btn, Empty, Mark, Menu, Net, Pill, Pop, Seg, Sheet, Switch, Tabs, Thinking } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import Photo from '../../ui/Photo'
import { NetworkPreview } from './Previews'
import { slotComment } from './slice'
import { EMOJI, NEEDS_MEDIA, checkPost, type Check as PlaybookCheck } from './checks'
import { libraryOf, readImage } from './visuals'
import { criticalAlert, nextRoom, overCap } from './guards'
import { variantsOf, type Variant } from './copilot'
import { ACCOUNTS, GROUPS, ROUTE_REASON, accountById, accountLabel } from './accounts'
import { FIRST_COMMENT, FORMATS, FORMAT_LABEL, firstCommentFor, formatFor, type Format } from './formats'
import { LINK_IN_COMMENT, PLAIN_ONLY, UTM_CONVENTION, captionOf, commentOf, query, shown, track } from './links'
import { forLinkedIn, shorten } from './ideasModel'
import { STATUS_LABEL } from './labels'

const FALLBACK_WORDS = ['cheap', 'guys', 'game-changer', 'eco-friendly', 'best ever', 'limited time only']

/** Banned words from the Playbook (rules of kind "word"), with a local fallback. */
function useBannedWords() {
  const { s } = useStore()
  const rules = (s.playbook.rules ?? []).filter(r => r.kind === 'word' && !r.paused)
  const fromRules = rules.flatMap(r => {
    const quoted = [...r.text.matchAll(/[“"']([^”"']+)[”"']/g)].map(m => m[1])
    return quoted.length ? quoted : [r.text.replace(/^(avoid|never say|don['’]t say|banned:?)\s*/i, '').trim()]
  })
  // The Playbook's Words tab keeps its banned list apart from the rules.
  const words = [...((s.playbook as { banned?: string[] }).banned ?? []), ...fromRules].filter(Boolean).map(w => w.toLowerCase())
  return words.length ? [...new Set(words)] : FALLBACK_WORDS
}

const pad = (n: number) => String(n).padStart(2, '0')
const toLocal = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
const dayLabel = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const N = (a: string) => accountById(a).network
const L = (a: string) => accountLabel(accountById(a))
/** Profiles named the way a sentence reads them: "Instagram and LinkedIn". Takes profile ids. */
const names = (as: string[]) => as.map(L).join(as.length > 2 ? ', ' : ' and ')
const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const tidy = (t: string) => t.replace(/[ \t]{2,}/g, ' ').replace(/\s([.,!?])/g, '$1').replace(/,+(?=[.!?]|$)/g, '').replace(/^\s*[,:;]?\s*/, '').replace(/^./, c => c.toUpperCase())
const STATUS_TONE: Partial<Record<Post['status'], 'alert' | 'caution' | 'ok'>> = { failed: 'alert', needs: 'caution', paused: 'caution', published: 'ok' }

type Where = 'accounts' | 'caption' | 'visual' | 'when'
type Problem = { where: Where; text: string }
type Snapshot = { label: string; text: string; variants: Partial<Record<string, string>>; accounts: string[] }

export default function Composer({ open, onClose, post, initial }: { open: boolean; onClose: () => void; post?: Post; initial?: { media?: string; text?: string; at?: number; network?: Network } }) {
  const { s, d } = useStore()
  const now = useNow()
  const words = useBannedWords()
  const editing = !!post
  const [at, setAt] = useState(() => post?.at ?? initial?.at ?? (() => { const b = new Date(now + DAY); return new Date(b.getFullYear(), b.getMonth(), b.getDate(), 18, 30).getTime() })())
  // Profile ids (see accounts.ts): a main account's id is its network.
  const [accounts, setAccounts] = useState<string[]>(post ? [post.account ?? post.network] : [initial?.network ?? 'instagram'])
  const [text, setText] = useState(post?.text ?? initial?.text ?? '')
  const [variants, setVariants] = useState<Partial<Record<string, string>>>({})
  const [media, setMedia] = useState<string | undefined>(post?.media ?? initial?.media)
  const [pillar, setPillar] = useState<Pillar>(post?.pillar ?? 'Trail stories')
  const [preview, setPreview] = useState<string>(post?.account ?? post?.network ?? initial?.network ?? 'instagram')
  // Per network, what you chose; otherwise Atlas's pick. A first comment you clear stays cleared.
  const [formats, setFormats] = useState<Partial<Record<string, Format>>>(post?.format ? { [post.account ?? post.network]: post.format } : {})
  const [comments, setComments] = useState<Partial<Record<string, string>>>(post ? { [post.account ?? post.network]: post.firstComment ?? '' } : {})
  const [link, setLink] = useState(post?.link?.url ?? '')
  const [busy, setBusy] = useState<string | null>(null)
  const [ideas, setIdeas] = useState<Variant[] | null>(null)
  const [undo, setUndo] = useState<Snapshot | null>(null)
  const [tried, setTried] = useState(false)
  const [pane, setPane] = useState<'write' | 'preview'>('write')
  const [picking, setPicking] = useState(false)
  const [moving, setMoving] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)

  const textFor = (a: string) => variants[a] ?? text
  const formatOf = (a: string) => formats[a] ?? formatFor(N(a), textFor(a))
  const commentFor = (a: string) => (a in comments ? comments[a]! : firstCommentFor(N(a), textFor(a), pillar) ?? '')
  const linkFor = (a: string) => track(link, { network: N(a), campaign: post?.campaign, pillar })
  // The profile on screen in the preview column (`acc`), and its network (`net`).
  const acc = accounts.includes(preview) ? preview : accounts[0]
  const net = acc ? N(acc) : 'instagram'
  // Atlas routes repair content on Instagram to Fernway Repair; it says so when you pick the main account.
  const suggestRepair = pillar === 'Repair & care' && accounts.includes('instagram') && !accounts.includes('ig-repair')

  /* ---------- What still blocks the post, said where it happens and next to the action ---------- */
  const others = s.publishing.posts.filter(p => p.id !== post?.id)
  const full = accounts.filter(a => overCap(others, { network: N(a), account: a, at }))
  const captionChecks = accounts.flatMap(a => checkPost({ text: textFor(a), network: N(a), media, words, rules: s.playbook.rules ?? [] })
    .filter(c => !/visual/.test(c.label)).map(c => ({ ...c, label: c.label.replace(NETWORK_LABEL[N(a)], L(a)), a })))
  const captionBad = captionChecks.filter(c => !c.ok)
  // Passing rules read once for every network: "Instagram, LinkedIn: no banned words".
  const captionOk = [...captionChecks.filter(c => c.ok).reduce((m, c) => {
    const what = c.label.slice(c.label.indexOf(': ') + 2)
    return m.set(what, [...(m.get(what) ?? []), L(c.a)])
  }, new Map<string, string[]>())].map(([what, ns]) => `${ns.join(', ')}: ${what}`)
  // Lengths read on one line, each network with its own limit.
  const lengths = captionOk.filter(l => / of \d+ characters$/.test(l))
  const okLines = [...captionOk.filter(l => !lengths.includes(l)), ...(lengths.length ? [`Characters: ${lengths.map(l => l.replace(' characters', '').replace(':', '')).join(' · ')}`] : [])]
  const needVisual = media ? [] : accounts.filter(a => NEEDS_MEDIA.includes(N(a)))
  const alert = criticalAlert(s)
  const problems: Problem[] = [
    ...(!accounts.length ? [{ where: 'accounts' as const, text: 'Pick at least one account' }] : []),
    ...(!text.trim() ? [{ where: 'caption' as const, text: 'Write the caption' }] : []),
    ...captionBad.map(c => ({ where: 'caption' as const, text: c.label })),
    ...(needVisual.length ? [{ where: 'visual' as const, text: `${names(needVisual)} need${needVisual.length > 1 ? '' : 's'} a visual` }] : []),
    ...full.map(a => ({ where: 'when' as const, text: `${L(a)} already has 3 posts that day` })),
    ...(at < now ? [{ where: 'when' as const, text: 'That time has passed' }] : []),
  ]
  // A draft or a plan item only needs something to say and somewhere to say it.
  const draftProblems = problems.filter(p => p.where === 'accounts' || p.text === 'Write the caption')

  const goTo = (where: Where) => {
    setPane('write')
    requestAnimationFrame(() => {
      const el = document.getElementById(`cmp-${where}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.querySelector<HTMLElement>('textarea, input, button')?.focus({ preventScroll: true })
    })
  }

  const build = (status: Post['status']): Post[] => {
    const group = accounts.length > 1 ? uid('g') : undefined
    return accounts.map((n, i) => ({
      id: editing && i === 0 ? post!.id : uid('p'), network: N(n), account: accountById(n).main ? undefined : n, at, text: textFor(n).trim(), media, status, author: post?.author ?? 'you', pillar, group,
      campaign: post?.campaign, note: undefined, handoff: post?.handoff, format: formatOf(n), firstComment: commentFor(n).trim() || undefined, link: linkFor(n),
    }))
  }
  const submit = (kind: 'schedule' | 'draft' | 'plan' | 'claire') => {
    const block = kind === 'schedule' || kind === 'claire' ? problems : draftProblems
    if (block.length) { setTried(true); goTo(block[0].where); return }
    const posts = build(kind === 'schedule' ? 'scheduled' : 'draft')
    if (kind === 'plan') posts.forEach(p => d({ type: 'publishing/addToPlan', post: p }))
    else if (kind === 'claire') posts.forEach(p => d({ type: 'publishing/claire', post: p }))
    else posts.forEach(p => d({ type: 'publishing/upsert', post: p }))
    onClose()
  }

  /* ---------- Edits Atlas makes for you: each one can be undone ---------- */
  const snapshot = (label: string): Snapshot => ({ label, text, variants, accounts })
  const think = (label: string, done: string, fn: () => void) => { setBusy(label); setTimeout(() => { setUndo(snapshot(done)); fn(); setBusy(null) }, 700) }
  const restore = () => { if (!undo) return; setText(undo.text); setVariants(undo.variants); setAccounts(undo.accounts); setUndo(null) }
  /** Applies a fix to the caption that network actually uses: its own version, or the shared one. */
  const fixFor = (n: string, label: string, fn: (t: string) => string) => {
    setUndo(snapshot(label))
    if (variants[n] !== undefined) setVariants(v => ({ ...v, [n]: fn(v[n]!) }))
    else setText(fn)
  }
  const fixOf = (c: PlaybookCheck & { a: string }): { label: string; run: () => void } | undefined => {
    const t = textFor(c.a)
    if (/not allowed/.test(c.label)) {
      const hits = words.filter(w => t.toLowerCase().includes(w))
      return { label: 'Remove', run: () => fixFor(c.a, `Removed “${hits.join('”, “')}”`, x => tidy(hits.reduce((acc, w) => acc.replace(new RegExp(`\\s*\\b${esc(w)}\\b`, 'gi'), ''), x))) }
    }
    if (/no emojis/.test(c.label)) return { label: 'Remove emojis', run: () => fixFor(c.a, 'Removed the emojis', x => tidy(x.replace(EMOJI, ''))) }
    if (/emojis/.test(c.label)) return { label: 'Keep one', run: () => fixFor(c.a, 'Kept one emoji', x => { let i = 0; return tidy(x.replace(EMOJI, e => (i++ ? '' : e))) }) }
    if (/limit/.test(c.label)) return { label: 'Shorten', run: () => fixFor(c.a, 'Atlas shortened the caption', shorten) }
  }

  const toggle = (n: string) => setAccounts(a => (a.includes(n) ? a.filter(x => x !== n) : [...a, n]))
  const best = BEST_SLOT[net]
  const comment = slotComment(net, at)
  const bestAt = (() => { const [h, m] = best.time.split(':').map(Number); const b = new Date(at); return new Date(b.getFullYear(), b.getMonth(), b.getDate(), h, m).getTime() })()
  const room = full.length ? nextRoom(others, { network: N(full[0]), account: full[0], at }) : 0

  const upload = async (f?: File) => {
    if (!f) return
    try {
      const name = await readImage(f)
      const title = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Your upload'
      d({ type: 'publishing/upload', media: { id: uid('md'), name, title, tags: ['Upload'], rights: 'Fernway · uploaded by you', used: 0, added: new Date(now).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } })
      setMedia(name); setUploadError(null); setPicking(false)
    } catch { setUploadError(`“${f.name}” isn’t an image Atlas can read. Try a JPG or a PNG.`) }
  }

  const primary = editing && post?.status === 'scheduled' ? 'Save changes' : 'Schedule'
  const status = !text.trim() && !tried
    ? <span className="cmp-status">Write the caption, then pick when it goes out.</span>
    : problems.length
      ? <span className="cmp-status bad" role="status"><AlertTriangle size={14} aria-hidden />
          <span>{problems[0].text}{problems.length > 1 ? ` and ${problems.length - 1} more to fix` : ''}</span>
          <button type="button" className="link-btn" onClick={() => goTo(problems[0].where)}>Fix</button></span>
      : <span className="cmp-status ok" role="status"><Check size={14} aria-hidden /><span>Ready for {dayLabel(at)}, <span className="mono">{hhmm(at)}</span> on {names(accounts)}</span></span>

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()} wide title={editing ? `Edit ${L(post!.account ?? post!.network)} post` : 'New post'}
      head={<Mark agent="atlas" />}
      footer={<>
        {editing && <Btn variant="ghost" className="danger" onClick={() => { d({ type: 'publishing/bulk', ids: [post!.id], op: 'delete' }); onClose() }}><Trash2 size={14} />Delete</Btn>}
        {status}
        <span className="spacer" />
        <Btn onClick={() => submit('draft')}>{editing && post?.status === 'scheduled' ? 'Move to drafts' : 'Save draft'}</Btn>
        <Menu trigger={<Btn>More<ChevronDown size={14} /></Btn>} items={[
          { label: 'Ask Claire to approve', icon: <Send size={14} />, onSelect: () => submit('claire') },
          { label: 'Add to next week’s plan', icon: <CalendarPlus size={14} />, onSelect: () => submit('plan') },
        ]} />
        <Btn variant="primary" onClick={() => submit('schedule')}>{primary}</Btn>
      </>}>
      <div className="mobile-only cmp-tabs">
        <Tabs value={pane} onChange={setPane} items={[{ value: 'write', label: 'Write' }, { value: 'preview', label: 'Preview' }]} />
      </div>
      <div className="cmp" data-pane={pane}>
        <div className="cmp-edit">
          {post && (post.failure || post.note || post.status !== 'scheduled') && (
            <p className="cmp-was"><Pill tone={STATUS_TONE[post.status]}>{STATUS_LABEL[post.status]}</Pill><span>{post.failure?.text ?? post.note ?? (post.author === 'atlas' ? 'Written by Atlas.' : 'Written by you.')}</span></p>
          )}

          <section className="cmp-sec" id="cmp-accounts" aria-labelledby="cmp-h-accounts">
            <div className="row between">
              <h3 className="section-title flush" id="cmp-h-accounts">Post to</h3>
              {!editing && <Menu align="end" trigger={<Btn size="xs" variant="ghost"><Users size={12} />Profile groups<ChevronDown size={12} /></Btn>}
                items={GROUPS.map(g => ({ label: g.name, hint: `${g.accounts.length} profiles`, onSelect: () => setAccounts(g.accounts) }))} />}
            </div>
            {editing
              ? <p className="row tight"><Net n={post!.network} />{L(post!.account ?? post!.network)}<span className="faint">· each profile’s post is edited on its own</span></p>
              : <div className="row tight" role="group" aria-label="Profiles">
                  {ACCOUNTS.map(a => (
                    <button key={a.id} type="button" className={`cmp-acc ${accounts.includes(a.id) ? 'on' : ''}`} aria-pressed={accounts.includes(a.id)} aria-label={accountLabel(a)} title={accountLabel(a)} onClick={() => toggle(a.id)}>
                      <Net n={a.network} />{a.main ? NETWORK_LABEL[a.network] : a.name}
                    </button>
                  ))}
                </div>}
            {suggestRepair && (
              <p className="cmp-atlas-says"><Mark agent="atlas" /><span>{ROUTE_REASON}</span>
                <Btn size="xs" onClick={() => { setAccounts(a => a.map(x => (x === 'instagram' ? 'ig-repair' : x))); setPreview('ig-repair') }}>Use Fernway Repair</Btn></p>
            )}
          </section>

          <section className="cmp-sec" id="cmp-caption" aria-labelledby="cmp-h-caption">
            <div className="row between">
              <h3 className="section-title flush" id="cmp-h-caption"><label htmlFor="cmp-text">Caption</label>{accounts.length > 1 && <span className="faint t-sm">shared by {accounts.length > 2 ? `all ${accounts.length} networks` : names(accounts)}</span>}</h3>
              <span className="row tight t-sm"><span className="faint">Pillar</span>
                <Menu align="end" trigger={<button type="button" className="select-btn" aria-label={`Pillar: ${pillar}`}><span>{pillar}</span><ChevronDown size={14} /></button>}
                  items={s.strategy.pillars.map(({ name: p }) => ({ label: p, onSelect: () => setPillar(p), icon: p === pillar ? <Check size={14} /> : undefined }))} />
              </span>
            </div>
            <textarea id="cmp-text" className="textarea" rows={6} value={text} onChange={e => { setText(e.target.value); setUndo(null) }} placeholder="Packing the Ridge 28L for 3 days on the Tour du Mont Blanc." />

            <div className="cmp-atlas" aria-label="Atlas copilot">
              <Mark agent="atlas" />
              {!text.trim() ? <span className="faint t-sm">Write a first line: Atlas can then offer variants, shorten it or adapt it for LinkedIn.</span>
                : busy ? <Thinking label={busy} />
                : <>
                    <Btn size="sm" variant="ghost" onClick={() => { setBusy('Writing 3 variants'); setTimeout(() => { setIdeas(variantsOf(text, { pillar, network: net, words, rules: s.playbook.rules ?? [] })); setBusy(null) }, 700) }}><Sparkles size={14} />3 variants</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => think('Shortening', 'Atlas shortened the caption', () => setText(shorten(text)))}><Scissors size={14} />Shorten</Btn>
                    <Btn size="sm" variant="ghost" title="Adds a LinkedIn version: no emoji, one line of context, a question to close." onClick={() => think('Adapting for LinkedIn', 'Atlas added a LinkedIn version', () => { setAccounts(a => (a.includes('linkedin') ? a : [...a, 'linkedin'])); setVariants(v => ({ ...v, linkedin: forLinkedIn(text) })); setPreview('linkedin') })}><Wand2 size={14} />Adapt for LinkedIn</Btn>
                  </>}
            </div>
            {undo && <UndoBar onUndo={restore} onDismiss={() => setUndo(null)}>{undo.label}.</UndoBar>}
            {ideas && !busy && (
              <div className="cmp-ideas" role="group" aria-label="Atlas’s variants">
                {ideas.length ? ideas.map(v => (
                  <button key={v.label} type="button" className="choice" onClick={() => { setUndo(snapshot(`Using “${v.label}”`)); setText(v.text); setIdeas(null) }}>
                    <span className="cmp-idea"><b>{v.label}</b><span>{v.text}</span>{v.applied.length > 0 && <span className="faint t-xs">Playbook: {v.applied.join(' · ')}</span>}</span>
                    <span className="go t-sm">Use</span>
                  </button>
                )) : <p className="faint t-sm">Atlas has nothing better than your caption yet.</p>}
                <Btn size="xs" variant="ghost" onClick={() => setIdeas(null)}>Keep mine</Btn>
              </div>
            )}

            {text.trim() && (
              <ul className="cmp-checks" aria-label="Playbook check, live">
                {captionBad.map(c => { const fix = fixOf(c); return (
                  <li key={c.label} className="bad"><AlertTriangle size={14} aria-hidden /><span>{c.label}</span>{fix && <Btn size="xs" variant="ghost" onClick={fix.run}>{fix.label}</Btn>}</li>
                ) })}
                {okLines.map(l => <li key={l} className="ok"><Check size={14} aria-hidden /><span>{l}</span></li>)}
              </ul>
            )}

            <div className="field">
              <label htmlFor="cmp-link">Link <span className="faint">· optional</span></label>
              <input id="cmp-link" className="input" value={link} onChange={e => setLink(e.target.value)} placeholder="fernway.co/trail-week" />
              {link.trim() && accounts.length > 0 && (
                <div className="cmp-atlas-says cmp-link"><Mark agent="atlas" />
                  <div>
                    <p>Atlas tracks it: {UTM_CONVENTION}.</p>
                    <ul>{accounts.map(a => { const l = linkFor(a)!; return (
                      <li key={a} className="row tight"><Net n={N(a)} size={14} /><span className="mono">{shown(l)}</span><span className="t-xs">{PLAIN_ONLY.includes(N(a)) ? `plain link: ${L(a)} refuses redirects` : LINK_IN_COMMENT.includes(N(a)) ? 'in the first comment: captions aren’t clickable' : query(l)}</span></li>
                    ) })}</ul>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="cmp-sec" id="cmp-visual" aria-labelledby="cmp-h-visual">
            <h3 className="section-title flush" id="cmp-h-visual">Visual</h3>
            <div className="row nowrap cmp-visual">
              {media ? <span className="cmp-thumb"><Photo name={media} /></span> : <span className="cmp-thumb empty" aria-hidden><ImagePlus size={18} /></span>}
              <div className="stack">
                <div className="row">
                  <Pop align="start" open={picking} onOpenChange={setPicking} trigger={<Btn size="sm">{media ? 'Change' : 'Pick from Media'}</Btn>}>
                    <div className="cmp-picker" role="listbox" aria-label="Media library">
                      {libraryOf(s).map(m => (
                        <button key={m.id} type="button" role="option" aria-selected={media === m.name} className={media === m.name ? 'on' : ''} onClick={() => { setMedia(m.name); setPicking(false) }} title={m.title} aria-label={m.title}>
                          <Photo name={m.name} />
                        </button>
                      ))}
                    </div>
                    <div className="row between cmp-picker-foot"><span className="faint t-sm">Your library. Atlas never uses stock photos.</span><Btn size="sm" variant="ghost" onClick={() => file.current?.click()}><Upload size={14} />Upload</Btn></div>
                  </Pop>
                  {media && <Btn size="sm" variant="ghost" onClick={() => setMedia(undefined)}><X size={14} />Remove</Btn>}
                </div>
                {needVisual.length > 0 && <p className="cmp-hint bad"><AlertTriangle size={14} aria-hidden />{names(needVisual)} only publish{needVisual.length > 1 ? '' : 'es'} with a visual.</p>}
                {!needVisual.length && !media && <p className="cmp-hint">Optional on {names(accounts)}.</p>}
                {uploadError && <p className="cmp-hint bad" role="alert"><AlertTriangle size={14} aria-hidden />{uploadError}</p>}
              </div>
            </div>
          </section>

          <section className="cmp-sec" id="cmp-when" aria-labelledby="cmp-h-when">
            <h3 className="section-title flush" id="cmp-h-when">When</h3>
            <div className="row cmp-when">
              <p className="cmp-slot"><b>{dayLabel(at)}</b>, <span className="mono">{hhmm(at)}</span></p>
              <Pop align="start" open={moving} onOpenChange={setMoving} trigger={<Btn size="sm">Change</Btn>}>
                <div className="field">
                  <label htmlFor="cmp-at">Date and time</label>
                  <input id="cmp-at" type="datetime-local" className="input" value={toLocal(at)} onChange={e => { const t = new Date(e.target.value).getTime(); if (!Number.isNaN(t)) setAt(t) }} />
                </div>
              </Pop>
            </div>
            <p className="cmp-atlas-says"><Mark agent="atlas" /><span>{comment}</span>
              {!comment.startsWith('Good slot') && bestAt > now && <Btn size="xs" onClick={() => setAt(bestAt)}>Use {best.time}</Btn>}</p>
            {full.length > 0 && (
              <p className="cmp-hint bad"><AlertTriangle size={14} aria-hidden />{L(full[0])} already has 3 posts that day, the most Atlas schedules. {dayLabel(room)} has room.
                <Btn size="xs" onClick={() => setAt(room)}>Use {dayLabel(room)}</Btn></p>
            )}
            {at < now && <p className="cmp-hint bad"><AlertTriangle size={14} aria-hidden />That time has passed. Pick one ahead.</p>}
            {alert && at - now < DAY && at > now && <p className="cmp-hint"><AlertTriangle size={14} aria-hidden />{alert.label} is open: Atlas holds posts due in the next 24 hours until it’s over.</p>}
          </section>
        </div>

        <input ref={file} type="file" accept="image/*" hidden aria-hidden onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} />
        <aside className="cmp-side" aria-label="Preview">
          {accounts.length > 1 && (
            <Seg name="pv" label="Preview profile" size="sm" value={acc} onChange={setPreview}
              options={accounts.map(a => ({ value: a, label: <><Net n={N(a)} size={14} />{accounts.length <= 3 && (accountById(a).main ? NETWORK_LABEL[N(a)] : accountById(a).name)}</> }))} />
          )}
          {acc ? (
            <>
              <div className="cmp-net">
                {accounts.length === 1 && <p className="row tight"><Net n={net} /><b>{L(acc)}</b></p>}
                {(FORMATS[net]?.length ?? 0) > 1 ? (
                  <div className="field">
                    <span className="label">Format{!(acc in formats) && <span className="faint"> · picked by Atlas</span>}</span>
                    <Seg name={`fmt-${acc}`} label={`${L(acc)} format`} size="sm" value={formatOf(acc)} onChange={v => setFormats(f => ({ ...f, [acc]: v }))} options={FORMATS[net]!.map(f => ({ value: f, label: FORMAT_LABEL[f] }))} />
                  </div>
                ) : <p className="row tight t-sm"><span className="faint">Format</span>{FORMAT_LABEL[formatOf(acc)]}</p>}
                {accounts.length > 1 && (
                  <Switch checked={variants[acc] !== undefined} label={`Own caption on ${L(acc)}`} onChange={on => setVariants(v => ({ ...v, [acc]: on ? text : undefined }))} />
                )}
                {variants[acc] !== undefined && <textarea className="textarea" rows={3} value={variants[acc]} onChange={e => setVariants(v => ({ ...v, [acc]: e.target.value }))} aria-label={`${L(acc)} caption`} />}
                {FIRST_COMMENT.includes(net) && (
                  <div className="field">
                    <label htmlFor="cmp-first">First comment <span className="faint">· optional{!(acc in comments) && commentFor(acc) ? ', suggested by Atlas' : ''}</span></label>
                    <input id="cmp-first" className="input" placeholder="Published right under the post" value={commentFor(acc)} onChange={e => setComments(c => ({ ...c, [acc]: e.target.value }))} />
                  </div>
                )}
              </div>
              {textFor(acc).trim() || media
                ? <NetworkPreview network={net} who={accountById(acc)} text={captionOf({ text: textFor(acc), network: net, link: linkFor(acc) })} media={media} words={words} at={at} format={formatOf(acc)}
                    firstComment={commentOf({ network: net, firstComment: commentFor(acc) || undefined, link: linkFor(acc) }) || undefined} />
                : <Empty title={`Your ${L(acc)} post shows here`} body="Write the caption and pick a visual: the preview follows as you type, cut where the network cuts it." />}
            </>
          ) : <Empty title="Pick an account" body="The preview shows the post the way each network will." />}
        </aside>
      </div>
    </Sheet>
  )
}
