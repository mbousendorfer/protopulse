import { useRef, useState } from 'react'
import { AlertTriangle, CalendarPlus, Check, ChevronDown, ChevronRight, Plus, Scissors, Send, Smartphone, Sparkles, Trash2, Wand2, X, Zap } from 'lucide-react'
import type { Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { uid } from '../../app/core'
import { DAY, hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { ROSTER, type Assignee } from '../../data/inbox'
import { BEST_SLOT, type Pillar, type Post } from '../../data/publishing'
import { Btn, Empty, Mark, Menu, Modal, Net, Pill, Pop, Seg, Sheet, Tabs, Thinking } from '../../ui'
import { UndoBar } from '../../ui/Feedback'
import Photo from '../../ui/Photo'
import { NetworkPreview } from './Previews'
import { slotComment } from './slice'
import { EMOJI, LIMIT, NEEDS_MEDIA, checkPost, type Check as PlaybookCheck } from './checks'
import { libraryOf, readImage } from './visuals'
import { criticalAlert, nextRoom, overCap } from './guards'
import { variantsOf, type Variant } from './copilot'
import { ROUTE_REASON, accountById, accountLabel } from './accounts'
import { FIRST_COMMENT, FORMATS, FORMAT_LABEL, firstCommentFor, formatFor, type Format } from './formats'
import { LINK_IN_COMMENT, PLAIN_ONLY, UTM_CONVENTION, captionOf, commentOf, query, shown, track } from './links'
import { forLinkedIn, sentences, shorten } from './ideasModel'
import { InfoPop } from '../../ui/More'
import { STATUS_LABEL, knownLabels, withLabels } from './labels'
import { upcoming } from './queues'
import { isQuiet, notesOn } from './notes'
import { PRICED, pricingToClaire } from './approvals'
import { assetsOf, cropOf, maxVisuals, mediaOf, missingOptions, optionsWith, splitThread, type Asset, type Options } from './composerModel'
import { CaptionTools, NetworkOptions, PostComments, PostHistory, ProfilePicker, Thread, Visuals } from './ComposerParts'

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
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone
/** The next time on `weekday` (0 = Monday) at `time`, after `from`. */
const nextOn = (from: number, weekday: number, time: string) => {
  const [h, m] = time.split(':').map(Number)
  for (let i = 0; i < 8; i++) { const d = new Date(from + i * DAY); d.setHours(h, m, 0, 0); if ((d.getDay() + 6) % 7 === weekday && d.getTime() > from) return d.getTime() }
  return from
}
/** "fernway.co/trail-week" → "Trail Week · Fernway". */
const cardTitle = (url: string) => { const p = url.replace(/^https?:\/\//, '').split(/[/?#]/).filter(Boolean)[1]; return p ? `${p.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · Fernway` : 'Fernway' }

type Where = 'accounts' | 'caption' | 'visual' | 'when' | 'options'
type Problem = { where: Where; text: string; acc?: string }
type Snapshot = { label: string; text: string; variants: Partial<Record<string, string>>; accounts: string[] }
type Kind = 'schedule' | 'now' | 'queue' | 'draft' | 'plan' | 'claire'

export default function Composer({ open, onClose, post, initial }: { open: boolean; onClose: () => void; post?: Post; initial?: { media?: string; text?: string; at?: number; network?: Network } }) {
  const { s, d } = useStore()
  const now = useNow()
  const words = useBannedWords()
  const editing = !!post
  const home = post?.account ?? post?.network
  const [at, setAt] = useState(() => post?.at ?? initial?.at ?? (() => { const b = new Date(now + DAY); return new Date(b.getFullYear(), b.getMonth(), b.getDate(), 18, 30).getTime() })())
  // Profile ids (see accounts.ts): a main account's id is its network.
  const [accounts, setAccounts] = useState<string[]>(post ? [home!] : [initial?.network ?? 'instagram'])
  const [text, setText] = useState(post?.text ?? initial?.text ?? '')
  const [variants, setVariants] = useState<Partial<Record<string, string>>>({})
  const [assets, setAssets] = useState<Asset[]>(() => (post ? assetsOf(post) : initial?.media ? [{ src: initial.media }] : []))
  const media = mediaOf(assets)
  const [pillar, setPillar] = useState<Pillar>(post?.pillar ?? 'Trail stories')
  const [preview, setPreview] = useState<string>(home ?? initial?.network ?? 'instagram')
  const [tab, setTab] = useState<string>('all')
  // Per profile, what you chose; otherwise Atlas's pick. A first comment you clear stays cleared.
  const [formats, setFormats] = useState<Partial<Record<string, Format>>>(post?.format ? { [home!]: post.format } : {})
  const [comments, setComments] = useState<Partial<Record<string, string>>>(post ? { [home!]: post.firstComment ?? '' } : {})
  const [opts, setOpts] = useState<Partial<Record<string, Options>>>(post?.options ? { [home!]: post.options } : {})
  const [optsOpen, setOptsOpen] = useState(false)
  const [link, setLink] = useState(post?.link?.url ?? '')
  const [card, setCard] = useState(post?.link?.card)
  const [mode, setMode] = useState<'profiles' | 'queue'>(post?.queue ? 'queue' : 'profiles')
  const [queueId, setQueueId] = useState(post?.queue ?? s.publishing.queues[0]?.id)
  const [when, setWhen] = useState<'schedule' | 'now'>('schedule')
  const [more, setMore] = useState<number[]>([])
  const [labels, setLabels] = useState<string[]>(post?.labels ?? [])
  const [newLabel, setNewLabel] = useState('')
  const [campaign, setCampaign] = useState(post?.campaign)
  const [assignee, setAssignee] = useState<Assignee | undefined>(post?.assignee)
  const [busy, setBusy] = useState<string | null>(null)
  const [ideas, setIdeas] = useState<Variant[] | null>(null)
  const [undo, setUndo] = useState<Snapshot | null>(null)
  const [tried, setTried] = useState(false)
  const [pane, setPane] = useState<'write' | 'preview'>('write')
  const [side, setSide] = useState<'preview' | 'comments' | 'history'>('preview')
  const [moving, setMoving] = useState<number | null>(null)
  const [asking, setAsking] = useState(false)
  const [ask, setAsk] = useState('')
  const [leaving, setLeaving] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)

  const queue = s.publishing.queues.find(q => q.id === queueId)
  const freeSlots = queue ? upcoming(s, queue).filter(sl => !sl.post && sl.at > now && !isQuiet(s.publishing.notes ?? [], sl.at)) : []
  const inQueue = mode === 'queue' && !editing
  // Queue mode: the queue's network decides the profile and the slot decides the time.
  const targets = inQueue && queue ? [queue.network as string] : accounts
  const slotAt = inQueue ? (freeSlots.some(sl => sl.at === at) ? at : freeSlots[0]?.at ?? at) : when === 'now' ? now : at

  const textFor = (a: string) => variants[a] ?? text
  const optsFor = (a: string) => optionsWith(N(a), opts[a])
  const threadOf = (a: string) => (N(a) === 'x' ? (opts[a]?.thread as string[] | undefined) : undefined)
  const formatOf = (a: string) => formats[a] ?? (assets.length > 1 && FORMATS[N(a)]?.includes('carousel') ? 'carousel' : formatFor(N(a), textFor(a)))
  const commentFor = (a: string) => (a in comments ? comments[a]! : firstCommentFor(N(a), textFor(a), pillar) ?? '')
  const linkFor = (a: string) => track(link, { network: N(a), campaign, pillar })
  const cardNow = card ?? { title: cardTitle(link), description: sentences(text)[0] ?? '' }
  // The profile on screen in the preview column (`acc`), and its network (`net`).
  const acc = targets.includes(preview) ? preview : targets[0]
  const net = acc ? N(acc) : 'instagram'
  const capTab = targets.length > 1 && targets.includes(tab) ? tab : 'all'
  // Atlas routes repair content on Instagram to Fernway Repair; it says so when you pick the main account.
  const suggestRepair = !inQueue && pillar === 'Repair & care' && accounts.includes('instagram') && !accounts.includes('ig-repair')
  const needsClaire = pricingToClaire(s) && PRICED.test(targets.map(textFor).join(' '))

  /* ---------- What still blocks the post, said where it happens and next to the action ---------- */
  const others = s.publishing.posts.filter(p => p.id !== post?.id)
  const times = inQueue || when === 'now' ? [slotAt] : [at, ...more]
  const full = targets.filter(a => times.some(t => overCap(others, { network: N(a), account: a, at: t })))
  const captionChecks = targets.flatMap(a => {
    const parts = threadOf(a)
    const base = checkPost({ text: textFor(a), network: N(a), media, words, rules: s.playbook.rules ?? [] }).filter(c => !/visual/.test(c.label))
    // A thread is counted post by post, not as one caption.
    const counted = parts ? [...base.filter(c => !/characters/.test(c.label)), parts.some(p => p.length > 280)
      ? { ok: false, label: `X: post ${parts.findIndex(p => p.length > 280) + 1} of the thread is over 280 characters` }
      : { ok: true, label: `X: thread of ${parts.length} posts` }] : base
    return counted.map(c => ({ ...c, label: c.label.replace(NETWORK_LABEL[N(a)], L(a)), a }))
  })
  const captionBad = captionChecks.filter(c => !c.ok)
  // Passing rules read once for every network: "Instagram, LinkedIn: no banned words".
  const captionOk = [...captionChecks.filter(c => c.ok).reduce((m, c) => {
    const what = c.label.slice(c.label.indexOf(': ') + 2)
    return m.set(what, [...(m.get(what) ?? []), L(c.a)])
  }, new Map<string, string[]>())].map(([what, ns]) => `${ns.join(', ')}: ${what}`)
  // Lengths read on one line, each network with its own limit.
  const lengths = captionOk.filter(l => / of \d+ characters$/.test(l))
  const okLines = [...captionOk.filter(l => !lengths.includes(l)), ...(lengths.length ? [`Characters: ${lengths.map(l => l.replace(' characters', '').replace(':', '')).join(' · ')}`] : [])]
  const needVisual = media ? [] : targets.filter(a => NEEDS_MEDIA.includes(N(a)))
  const missing = targets.map(a => ({ a, m: missingOptions(N(a), formatOf(a), optsFor(a)) })).filter(x => x.m.length)
  const alert = criticalAlert(s)
  const quiet = times.flatMap(t => notesOn(s.publishing.notes ?? [], t).filter(n => n.quiet))
  const problems: Problem[] = [
    ...(!targets.length ? [{ where: 'accounts' as const, text: inQueue ? 'Pick a queue' : 'Pick at least one profile' }] : []),
    ...(!text.trim() ? [{ where: 'caption' as const, text: 'Write the caption' }] : []),
    ...captionBad.map(c => ({ where: 'caption' as const, text: c.label })),
    ...(needVisual.length ? [{ where: 'visual' as const, text: `${names(needVisual)} need${needVisual.length > 1 ? '' : 's'} a visual` }] : []),
    ...missing.map(x => ({ where: 'options' as const, acc: x.a, text: `${L(x.a)} needs a ${x.m.join(' and a ')}` })),
    ...(inQueue && !freeSlots.length ? [{ where: 'when' as const, text: 'The queue has no free slot in the next 2 weeks' }] : []),
    ...full.map(a => ({ where: 'when' as const, text: `${L(a)} already has 3 posts that day` })),
    ...(!inQueue && when === 'schedule' && times.some(t => t < now) ? [{ where: 'when' as const, text: 'That time has passed' }] : []),
  ]
  // A draft or a plan item only needs something to say and somewhere to say it.
  const draftProblems = problems.filter(p => p.where === 'accounts' || p.text === 'Write the caption')

  const goTo = (p: Problem) => {
    if (p.where === 'options') { setPreview(p.acc!); setSide('preview'); setOptsOpen(true) }
    setPane(p.where === 'options' ? 'preview' : 'write')
    requestAnimationFrame(() => {
      const el = document.getElementById(`cmp-${p.where}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.querySelector<HTMLElement>(p.where === 'options' ? 'input[aria-invalid], textarea, input, button' : 'textarea, input, button')?.focus({ preventScroll: true })
    })
  }

  const build = (status: Post['status'], t: number, group?: string): Post[] => targets.map((n, i) => {
    const fields = optsFor(n)
    const thread = threadOf(n)
    const p: Post = {
      id: editing && i === 0 && t === times[0] ? post!.id : uid('p'), network: N(n), account: accountById(n).main ? undefined : n, at: t, text: textFor(n).trim(), media, status, author: post?.author ?? 'you', pillar, group,
      campaign, note: undefined, handoff: post?.handoff, format: formatOf(n), firstComment: commentFor(n).trim() || undefined,
      link: linkFor(n) && (N(n) === 'facebook' || N(n) === 'linkedin') && !assets.length ? { ...linkFor(n)!, card: cardNow } : linkFor(n),
      assets: assets.length ? assets : undefined, options: Object.keys(fields).length || thread ? { ...fields, ...(thread ? { thread } : {}) } : undefined,
      labels: labels.length ? labels : undefined, assignee, comments: post?.comments, history: post?.history, queue: inQueue ? queue?.id : post?.queue,
    }
    return inQueue && queue ? withLabels(p, queue.name) : p
  })
  const submit = (kind: Kind) => {
    const block = kind === 'draft' || kind === 'plan' ? draftProblems : problems
    if (block.length) { setTried(true); goTo(block[0]); return }
    const group = targets.length > 1 || times.length > 1 ? uid('g') : undefined
    const status: Post['status'] = kind === 'now' ? 'published' : kind === 'schedule' || kind === 'queue' ? 'scheduled' : 'draft'
    const posts = times.flatMap(t => build(status, t, group))
    if (kind === 'plan') posts.forEach(p => d({ type: 'publishing/addToPlan', post: p }))
    else if (kind === 'claire') posts.forEach(p => d({ type: 'publishing/claire', post: ask.trim() ? { ...p, comments: [...(p.comments ?? []), { from: 'you', text: ask.trim(), at: now }] } : p }))
    else posts.forEach(p => d({ type: 'publishing/upsert', post: p, verb: kind === 'now' ? `Published on ${L(p.account ?? p.network)}` : kind === 'queue' ? `Added to the ${queue?.name} queue, ${dayLabel(p.at)} ${hhmm(p.at)}` : undefined }))
    onClose()
  }

  // Closing with unsaved work asks first.
  const [start] = useState(() => JSON.stringify({ at, accounts, text, assets, link, labels, campaign, assignee }))
  const dirty = JSON.stringify({ at, accounts, text, assets, link, labels, campaign, assignee }) !== start || Object.values(variants).some(v => v !== undefined) || Object.keys(opts).length > (post?.options ? 1 : 0) || more.length > 0
  const close = () => (dirty ? setLeaving(true) : onClose())

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
    if (/thread/.test(c.label)) return { label: 'Split again', run: () => setOpts(o => ({ ...o, [c.a]: { ...o[c.a], thread: splitThread(textFor(c.a)) } })) }
    if (/limit/.test(c.label)) return N(c.a) === 'x'
      ? { label: 'Split into a thread', run: () => setOpts(o => ({ ...o, [c.a]: { ...o[c.a], thread: splitThread(textFor(c.a)) } })) }
      : { label: 'Shorten', run: () => fixFor(c.a, 'Atlas shortened the caption', shorten) }
  }

  const best = BEST_SLOT[net]
  const comment = slotComment(net, at)
  const bestAt = (() => { const [h, m] = best.time.split(':').map(Number); const b = new Date(at); return new Date(b.getFullYear(), b.getMonth(), b.getDate(), h, m).getTime() })()
  const room = full.length ? nextRoom(others, { network: N(full[0]), account: full[0], at }) : 0
  const bestTimes = [...new Set(targets.map(N))].map(n => ({ n, ...BEST_SLOT[n] })).filter(b => b.time)

  const upload = async (f?: File) => {
    if (!f) return
    try {
      const name = await readImage(f)
      const title = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Your upload'
      d({ type: 'publishing/upload', media: { id: uid('md'), name, title, tags: ['Upload'], rights: 'Fernway · uploaded by you', used: 0, added: new Date(now).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } })
      setAssets(a => [...a, { src: name, alt: title }]); setUploadError(null)
    } catch { setUploadError(`“${f.name}” isn’t an image Atlas can read. Try a JPG or a PNG.`) }
  }

  // The caption on screen: the shared one, or one profile's own.
  const capValue = capTab === 'all' ? text : textFor(capTab)
  const setCap = (v: string) => { setUndo(null); if (capTab === 'all') setText(v); else setVariants(x => ({ ...x, [capTab]: v })) }
  const countOn = capTab === 'all' ? [...targets].sort((a, b) => (LIMIT[N(a)] ?? 2000) - (LIMIT[N(b)] ?? 2000))[0] : capTab
  const maxPics = targets.length ? Math.max(...targets.map(a => maxVisuals(N(a)))) : 10
  const fewer = targets.filter(a => assets.length > maxVisuals(N(a)))
  const crops = [...new Set(targets.map(a => { const c = cropOf(N(a), formatOf(a)); return c && `${L(a)} ${FORMAT_LABEL[formatOf(a)]} ${c}` }).filter(Boolean))]
  const cardOn = !!link.trim() && !assets.length && targets.some(a => N(a) === 'facebook' || N(a) === 'linkedin')

  // One primary, named after what it does.
  const primaryKind: Kind = needsClaire ? 'claire' : inQueue ? 'queue' : when === 'now' ? 'now' : 'schedule'
  const PRIMARY: Record<Kind, string> = { claire: 'Send for approval', queue: 'Add to queue', now: 'Publish now', schedule: editing && post?.status === 'scheduled' ? 'Save changes' : 'Schedule', draft: '', plan: '' }
  const runPrimary = () => (primaryKind === 'claire' ? (problems.length ? submit('claire') : setAsking(true)) : submit(primaryKind))
  const whenSays = inQueue ? `the ${queue?.name} queue, ${dayLabel(slotAt)}, ` : `${dayLabel(at)}, `
  const andMore = !inQueue && more.length ? ` and ${more.length} more time${more.length > 1 ? 's' : ''}` : ''
  const status = !text.trim() && !tried
    ? <span className="cmp-status">Write the caption, then pick when it goes out.</span>
    : problems.length
      ? <span className="cmp-status bad" role="status"><AlertTriangle size={14} aria-hidden />
          <span>{problems[0].text}{problems.length > 1 ? ` and ${problems.length - 1} more to fix` : ''}</span>
          <button type="button" className="link-btn" onClick={() => goTo(problems[0])}>Fix</button></span>
      : <span className="cmp-status ok" role="status"><Check size={14} aria-hidden />
          <span>{when === 'now' && !inQueue ? <>Ready to publish now on {names(targets)}</> : <>Ready for {whenSays}<span className="mono">{hhmm(slotAt)}</span>{andMore} on {names(targets)}</>}</span></span>

  const live = post ? s.publishing.posts.find(p => p.id === post.id) ?? post : undefined
  const addComment = (t: string) => live && d({ type: 'publishing/upsert', post: { ...live, comments: [...(live.comments ?? []), { from: 'you', text: t, at: now }] }, verb: 'Comment added' })

  return (
    <Sheet open={open} onOpenChange={o => !o && close()} wide title={editing ? `Edit ${L(home!)} post` : 'New post'}
      head={<Mark agent="atlas" />}
      footer={<>
        {editing && <Btn variant="ghost" className="danger" onClick={() => { d({ type: 'publishing/bulk', ids: [post!.id], op: 'delete' }); onClose() }}><Trash2 size={14} />Delete</Btn>}
        {status}
        <span className="spacer" />
        <Btn onClick={() => submit('draft')}>{editing && post?.status === 'scheduled' ? 'Move to drafts' : 'Save draft'}</Btn>
        <Menu trigger={<Btn>More<ChevronDown size={14} /></Btn>} items={[
          ...(primaryKind !== 'claire' ? [{ label: 'Send for approval', hint: ROSTER.claire.short, icon: <Send size={14} />, onSelect: () => (problems.length ? submit('claire') : setAsking(true)) }] : []),
          ...(primaryKind !== 'now' && !inQueue ? [{ label: 'Publish now', icon: <Zap size={14} />, onSelect: () => { setWhen('now'); submit('now') } }] : []),
          { label: 'Add to next week’s plan', icon: <CalendarPlus size={14} />, onSelect: () => submit('plan') },
        ]} />
        <Btn variant="primary" onClick={runPrimary}>{PRIMARY[primaryKind]}</Btn>
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
              <h3 className="section-title flush" id="cmp-h-accounts">Post to{!inQueue && accounts.length > 1 && <span className="muted t-sm">{accounts.length} profiles</span>}</h3>
              {!editing && s.publishing.queues.length > 0 && (
                <Seg name="cmp-mode" label="Post to profiles or a queue" size="sm" value={mode} onChange={setMode} options={[{ value: 'profiles', label: 'Profiles' }, { value: 'queue', label: 'Queue' }]} />
              )}
            </div>
            {editing
              ? <p className="row tight"><Net n={post!.network} />{L(home!)}<span className="muted">· each profile’s post is edited on its own</span></p>
              : inQueue
                ? <div className="row tight">
                    <Menu align="start" trigger={<button type="button" className="select-btn" aria-label={`Queue: ${queue?.name ?? 'none'}`}>{queue && <Net n={queue.network} size={14} />}<span>{queue?.name ?? 'Pick a queue'}</span><ChevronDown size={14} /></button>}
                      items={s.publishing.queues.map(q => ({ label: <span className="row tight"><Net n={q.network} size={14} />{q.name}</span>, hint: `${q.slots.length} slots a week`, onSelect: () => { setQueueId(q.id); setPillar(q.pillar) } }))} />
                    {queue && <span className="muted t-sm">Posts on {L(queue.network)}, {queue.pillar}</span>}
                  </div>
                : <ProfilePicker value={accounts} onChange={setAccounts} />}
            {suggestRepair && (
              <p className="cmp-atlas-says"><Mark agent="atlas" /><span>{ROUTE_REASON}</span>
                <Btn size="xs" onClick={() => { setAccounts(a => a.map(x => (x === 'instagram' ? 'ig-repair' : x))); setPreview('ig-repair') }}>Use Fernway Repair</Btn></p>
            )}
          </section>

          <section className="cmp-sec" id="cmp-caption" aria-labelledby="cmp-h-caption">
            <div className="row between">
              <h3 className="section-title flush" id="cmp-h-caption"><label htmlFor="cmp-text">Caption</label></h3>
              <span className="row tight t-sm"><span className="muted">Pillar</span>
                <Menu align="end" trigger={<button type="button" className="select-btn" aria-label={`Pillar: ${pillar}`}><span>{pillar}</span><ChevronDown size={14} /></button>}
                  items={s.strategy.pillars.map(({ name: p }) => ({ label: p, onSelect: () => setPillar(p), icon: p === pillar ? <Check size={14} /> : undefined }))} />
              </span>
            </div>
            {targets.length > 1 && (
              <div className="cmp-captabs">
                <Tabs value={capTab} onChange={setTab} items={[{ value: 'all', label: 'All networks' }, ...targets.map(a => ({ value: a, label: <span className="row tight nowrap"><Net n={N(a)} size={14} />{accountById(a).main ? NETWORK_LABEL[N(a)] : accountById(a).name}{variants[a] !== undefined && <span className="muted">· own</span>}</span> }))]} />
              </div>
            )}
            <textarea ref={field} id="cmp-text" className="textarea" rows={6} value={capValue} onChange={e => setCap(e.target.value)} placeholder="Packing the Ridge 28L for 3 days on the Tour du Mont Blanc."
              aria-label={capTab === 'all' ? undefined : `${L(capTab)} caption`} />
            {capTab !== 'all' && (
              <p className="cmp-hint">{variants[capTab] !== undefined
                ? <>Own caption on {L(capTab)}. <button type="button" className="link-btn" onClick={() => setVariants(v => ({ ...v, [capTab]: undefined }))}>Reset to shared</button></>
                : <>Same as the shared caption. Type here to give {L(capTab)} its own.</>}</p>
            )}
            {countOn && <CaptionTools field={field} value={capValue} onInsert={setCap} pillar={pillar} networks={targets.map(N)}
              campaignTag={campaign ? `#${campaign.replace(/[^\p{L}\p{N}]+/gu, '')}` : undefined}
              count={{ n: capValue.length, limit: LIMIT[N(countOn)] ?? 2000, on: L(countOn), thread: threadOf(countOn)?.length }} />}

            <div className="cmp-atlas" aria-label="Atlas copilot">
              <Mark agent="atlas" />
              {!text.trim() ? <span className="muted t-sm">Write a first line, then ask Atlas for variants.</span>
                : busy ? <Thinking label={busy} />
                : <>
                    <Btn size="sm" variant="ghost" onClick={() => { setBusy('Writing 3 variants'); setTimeout(() => { setIdeas(variantsOf(text, { pillar, network: net, words, rules: s.playbook.rules ?? [] })); setBusy(null) }, 700) }}><Sparkles size={14} />3 variants</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => think('Shortening', 'Atlas shortened the caption', () => setText(shorten(text)))}><Scissors size={14} />Shorten</Btn>
                    {!inQueue && <Btn size="sm" variant="ghost" title="Adds a LinkedIn version: no emoji, one line of context, a question to close." onClick={() => think('Adapting for LinkedIn', 'Atlas added a LinkedIn version', () => { setAccounts(a => (a.includes('linkedin') ? a : [...a, 'linkedin'])); setVariants(v => ({ ...v, linkedin: forLinkedIn(text) })); setPreview('linkedin'); setTab('linkedin') })}><Wand2 size={14} />Adapt for LinkedIn</Btn>}
                  </>}
            </div>
            {undo && <UndoBar onUndo={restore} onDismiss={() => setUndo(null)}>{undo.label}.</UndoBar>}
            {ideas && !busy && (
              <div className="cmp-ideas" role="group" aria-label="Atlas’s variants">
                {ideas.length ? ideas.map(v => (
                  <button key={v.label} type="button" className="choice" onClick={() => { setUndo(snapshot(`Using “${v.label}”`)); setText(v.text); setIdeas(null) }}>
                    <span className="cmp-idea"><b>{v.label}</b><span>{v.text}</span>{v.applied.length > 0 && <span className="muted t-xs">Playbook: {v.applied.join(' · ')}</span>}</span>
                    <span className="go t-sm">Use</span>
                  </button>
                )) : <p className="muted t-sm">Atlas has nothing better than your caption yet.</p>}
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
              <label htmlFor="cmp-link">Link <span className="muted">· optional</span></label>
              <input id="cmp-link" className="input" value={link} onChange={e => setLink(e.target.value)} placeholder="fernway.co/trail-week" />
              {link.trim() && targets.length > 0 && (
                <div className="cmp-atlas-says cmp-link"><Mark agent="atlas" />
                  <div>
                    <p>Atlas tracks it: {UTM_CONVENTION}.</p>
                    <ul>{targets.map(a => { const l = linkFor(a)!; return (
                      <li key={a} className="row tight"><Net n={N(a)} size={14} /><span className="mono">{shown(l)}</span><span className="t-xs">{PLAIN_ONLY.includes(N(a)) ? `plain link: ${L(a)} refuses redirects` : LINK_IN_COMMENT.includes(N(a)) ? 'in the first comment: captions aren’t clickable' : query(l)}</span></li>
                    ) })}</ul>
                  </div>
                </div>
              )}
              {cardOn && (
                <div className="cmp-card" aria-label="Link preview on Facebook and LinkedIn">
                  <span className="cmp-card-img"><Photo name={card?.image ?? 'trail'} /></span>
                  <div className="stack">
                    <span className="muted t-xs">Link preview on {names(targets.filter(a => N(a) === 'facebook' || N(a) === 'linkedin'))} · {link.replace(/^https?:\/\//, '')}</span>
                    <input className="input" aria-label="Link preview title" value={cardNow.title} onChange={e => setCard({ ...cardNow, title: e.target.value })} />
                    <textarea className="textarea" rows={2} aria-label="Link preview description" value={cardNow.description} onChange={e => setCard({ ...cardNow, description: e.target.value })} />
                    {assets.length === 0 && <span className="muted t-xs">Add a visual and the networks show it instead of this card.</span>}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="cmp-sec" id="cmp-visual" aria-labelledby="cmp-h-visual">
            <h3 className="section-title flush" id="cmp-h-visual">Visuals{assets.length > 0 && <span className="muted t-sm">{assets.length > maxPics ? assets.length : `${assets.length} of ${maxPics}`}</span>}</h3>
            <Visuals value={assets} onChange={setAssets} library={libraryOf(s)} onUpload={() => file.current?.click()} max={maxPics} />
            {needVisual.length > 0 && <p className="cmp-hint bad"><AlertTriangle size={14} aria-hidden />{names(needVisual)} only publish{needVisual.length > 1 ? '' : 'es'} with a visual.</p>}
            {!needVisual.length && !assets.length && targets.length > 0 && <p className="cmp-hint">Optional on {names(targets)}.</p>}
            {fewer.map(a => <p key={a} className="cmp-hint"><AlertTriangle size={14} aria-hidden />{L(a)} takes {maxVisuals(N(a))} visual{maxVisuals(N(a)) > 1 ? 's' : ''}: the first {maxVisuals(N(a)) > 1 ? maxVisuals(N(a)) : 'one'} go{maxVisuals(N(a)) > 1 ? '' : 'es'} out.</p>)}
            {assets.length > 0 && crops.length > 0 && <p className="cmp-hint">Cropped to {crops.join(' · ')}.</p>}
            {assets.some(a => !a.alt?.trim()) && <p className="cmp-hint">{assets.filter(a => !a.alt?.trim()).length} visual{assets.filter(a => !a.alt?.trim()).length > 1 ? 's have' : ' has'} no alt text: screen readers skip {assets.filter(a => !a.alt?.trim()).length > 1 ? 'them' : 'it'}.</p>}
            {uploadError && <p className="cmp-hint bad" role="alert"><AlertTriangle size={14} aria-hidden />{uploadError}</p>}
          </section>

          <section className="cmp-sec" id="cmp-when" aria-labelledby="cmp-h-when">
            <div className="row between">
              <h3 className="section-title flush" id="cmp-h-when">When</h3>
              {!inQueue && <Seg name="cmp-when-mode" label="When it goes out" size="sm" value={when} onChange={setWhen} options={[{ value: 'schedule', label: 'Schedule' }, { value: 'now', label: 'Publish now' }]} />}
            </div>
            {inQueue ? (
              freeSlots.length ? (
                <div className="row cmp-when">
                  <p className="cmp-slot">Next free slot: <b>{dayLabel(slotAt)}</b>, <span className="mono">{hhmm(slotAt)}</span></p>
                  <Menu align="start" trigger={<Btn size="sm">Other slots<ChevronDown size={14} /></Btn>}
                    items={freeSlots.slice(0, 6).map(sl => ({ label: `${dayLabel(sl.at)}, ${hhmm(sl.at)}`, icon: sl.at === slotAt ? <Check size={14} /> : undefined, onSelect: () => setAt(sl.at) }))} />
                </div>
              ) : <p className="cmp-hint bad"><AlertTriangle size={14} aria-hidden />The {queue?.name} queue has no free slot in the next 2 weeks. Schedule it instead.<Btn size="xs" onClick={() => setMode('profiles')}>Schedule</Btn></p>
            ) : when === 'now' ? (
              <p className="cmp-hint">Goes out on {targets.length ? names(targets) : 'the profiles you pick'} as soon as you click Publish now.</p>
            ) : (
              <>
                {[at, ...more].map((t, i) => (
                  <div key={i} className="row cmp-when">
                    <p className="cmp-slot"><b>{dayLabel(t)}</b>, <span className="mono">{hhmm(t)}</span></p>
                    <Pop align="start" open={moving === i} onOpenChange={o => setMoving(o ? i : null)} trigger={<Btn size="sm">Change</Btn>}>
                      <div className="field">
                        <label htmlFor={`cmp-at-${i}`}>Date and time</label>
                        <input id={`cmp-at-${i}`} type="datetime-local" className="input" value={toLocal(t)} onChange={e => { const v = new Date(e.target.value).getTime(); if (Number.isNaN(v)) return; if (i === 0) setAt(v); else setMore(m => m.map((x, j) => (j === i - 1 ? v : x))) }} />
                      </div>
                    </Pop>
                    {i > 0 && <Btn size="sm" variant="ghost" icon aria-label={`Remove ${dayLabel(t)}`} onClick={() => setMore(m => m.filter((_, j) => j !== i - 1))}><X size={14} /></Btn>}
                  </div>
                ))}
                <div className="row tight">
                  {more.length < 4 && !editing && <Btn size="sm" variant="ghost" onClick={() => setMore(m => [...m, (m.at(-1) ?? at) + 7 * DAY])}><Plus size={14} />Add another time</Btn>}
                  {bestTimes.length > 0 && <span className="muted t-sm">Best times:</span>}
                  {bestTimes.map(b => (
                    <Btn key={b.n} size="xs" title={`Iris: ${b.reason}`} onClick={() => setAt(nextOn(now, b.day, b.time))}><Net n={b.n} size={12} />{b.dayName.slice(0, 3)} {b.time}</Btn>
                  ))}
                </div>
                <p className="cmp-atlas-says"><Mark agent="atlas" /><span>{sentences(comment)[0]}{sentences(comment).length > 1 && <> <InfoPop label="Why?">{sentences(comment).slice(1).join(' ')}</InfoPop></>}</span>
                  {!comment.startsWith('Good slot') && bestAt > now && <Btn size="xs" onClick={() => setAt(bestAt)}>Use {best.time}</Btn>}</p>
                {at < now && <p className="cmp-hint bad"><AlertTriangle size={14} aria-hidden />That time has passed. Pick one ahead.</p>}
              </>
            )}
            {full.length > 0 && (
              <p className="cmp-hint bad"><AlertTriangle size={14} aria-hidden />{L(full[0])} already has 3 posts that day, the most Atlas schedules. {dayLabel(room)} has room.
                {!inQueue && <Btn size="xs" onClick={() => setAt(room)}>Use {dayLabel(room)}</Btn>}</p>
            )}
            {quiet.length > 0 && <p className="cmp-hint"><AlertTriangle size={14} aria-hidden />{quiet[0].text}: a quiet day on the calendar.</p>}
            {alert && slotAt - now < DAY && slotAt >= now && <p className="cmp-hint"><AlertTriangle size={14} aria-hidden />{alert.label} is open: Atlas holds posts due in the next 24 hours until it’s over.</p>}
            {when === 'schedule' && <p className="cmp-hint">Times in {TZ.replace('_', ' ')}.</p>}
          </section>

          <section className="cmp-sec" aria-label="Labels, campaign and assignee">
            <details className="cmp-more">
              <summary><ChevronRight size={14} aria-hidden />Labels · Campaign · Assignee
                <span className="muted">{[labels.length ? `${labels.length} label${labels.length > 1 ? 's' : ''}` : '', campaign ?? '', assignee ? ROSTER[assignee].short : ''].filter(Boolean).join(' · ') || 'none yet'}</span></summary>
              <div className="cmp-opts">
                <div className="field">
                  <span className="label">Labels</span>
                  <div className="row tight">
                    {labels.map(l => <span key={l} className="cmp-acc on">{l}<button type="button" className="cmp-acc-x" aria-label={`Remove label ${l}`} onClick={() => setLabels(x => x.filter(y => y !== l))}><X size={12} /></button></span>)}
                    <Menu align="start" trigger={<Btn size="sm" variant="ghost"><Plus size={14} />Label</Btn>}
                      items={knownLabels(s).filter(l => !labels.includes(l)).map(l => ({ label: l, onSelect: () => setLabels(x => [...x, l]) }))} />
                    <input className="input cmp-newlabel" placeholder="New label, Enter adds" aria-label="New label" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newLabel.trim()) { e.preventDefault(); setLabels(x => [...new Set([...x, newLabel.trim()])]); setNewLabel('') } }} />
                  </div>
                </div>
                <div className="row">
                  <div className="field"><span className="label">Campaign</span>
                    <Menu align="start" trigger={<button type="button" className="select-btn" aria-label={`Campaign: ${campaign ?? 'none'}`}><span>{campaign ?? 'None'}</span><ChevronDown size={14} /></button>}
                      items={[{ label: 'None', onSelect: () => setCampaign(undefined) }, ...s.strategy.campaigns.map(c => ({ label: c.name, onSelect: () => setCampaign(c.name) }))]} /></div>
                  <div className="field"><span className="label">Assign to</span>
                    <Menu align="start" trigger={<button type="button" className="select-btn" aria-label={`Assign to: ${assignee ? ROSTER[assignee].name : 'nobody'}`}><span>{assignee ? ROSTER[assignee].name : 'Nobody'}</span><ChevronDown size={14} /></button>}
                      items={[{ label: 'Nobody', onSelect: () => setAssignee(undefined) }, ...(Object.keys(ROSTER) as Assignee[]).map(k => ({ label: ROSTER[k].name, hint: ROSTER[k].role, onSelect: () => setAssignee(k) }))]} /></div>
                </div>
              </div>
            </details>
          </section>
        </div>

        <input ref={file} type="file" accept="image/*" hidden aria-hidden onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} />
        <aside className="cmp-side" aria-label="Preview">
          {editing && live && (
            <Tabs value={side} onChange={setSide} items={[{ value: 'preview', label: 'Preview' }, { value: 'comments', label: 'Comments', count: live.comments?.length || undefined }, { value: 'history', label: 'History' }]} />
          )}
          {side === 'comments' && live ? <PostComments post={live} onAdd={addComment} />
            : side === 'history' && live ? <PostHistory post={live} />
            : <>
          {targets.length > 1 && (
            <Seg name="pv" label="Preview profile" size="sm" value={acc} onChange={setPreview}
              options={targets.map(a => ({ value: a, label: <><Net n={N(a)} size={14} />{targets.length <= 3 && (accountById(a).main ? NETWORK_LABEL[N(a)] : accountById(a).name)}</> }))} />
          )}
          {acc ? (
            <>
              <div className="cmp-net">
                {targets.length === 1 && <p className="row tight"><Net n={net} /><b>{L(acc)}</b></p>}
                {(FORMATS[net]?.length ?? 0) > 1 ? (
                  <div className="field">
                    <span className="label">Format{!(acc in formats) && <span className="muted"> · picked by Atlas</span>}</span>
                    <Seg name={`fmt-${acc}`} label={`${L(acc)} format`} size="sm" value={formatOf(acc)} onChange={v => setFormats(f => ({ ...f, [acc]: v }))} options={FORMATS[net]!.map(f => ({ value: f, label: FORMAT_LABEL[f] }))} />
                  </div>
                ) : <p className="row tight t-sm"><span className="muted">Format</span>{FORMAT_LABEL[formatOf(acc)]}</p>}
                {net === 'instagram' && formatOf(acc) === 'story' && <p className="cmp-hint"><Smartphone size={14} aria-hidden /><Pill>Mobile reminder</Pill>Stories with stickers go out from your phone: you get a push at the time.</p>}
                {FIRST_COMMENT.includes(net) && (
                  <div className="field">
                    <label htmlFor="cmp-first">First comment <span className="muted">· optional{!(acc in comments) && commentFor(acc) ? ', suggested by Atlas' : ''}</span></label>
                    <input id="cmp-first" className="input" placeholder="Published right under the post" value={commentFor(acc)} onChange={e => setComments(c => ({ ...c, [acc]: e.target.value }))} />
                  </div>
                )}
                {net === 'x' && <Thread text={textFor(acc)} value={threadOf(acc)} onChange={v => setOpts(o => ({ ...o, [acc]: { ...o[acc], thread: v as string[] } }))} />}
                <NetworkOptions network={net} label={L(acc)} format={formatOf(acc)} value={optsFor(acc)} onChange={v => setOpts(o => ({ ...o, [acc]: v }))}
                  open={optsOpen} onToggle={setOptsOpen} missing={missingOptions(net, formatOf(acc), optsFor(acc))} />
              </div>
              {textFor(acc).trim() || media
                ? <>
                    <NetworkPreview network={net} who={accountById(acc)} text={captionOf({ text: threadOf(acc)?.[0] ?? textFor(acc), network: net, link: linkFor(acc) })} media={media} words={words} at={slotAt} format={formatOf(acc)}
                      slides={formatOf(acc) === 'carousel' && assets.length > 1 ? assets.length : undefined}
                      firstComment={commentOf({ network: net, firstComment: commentFor(acc) || undefined, link: linkFor(acc) }) || undefined} />
                    {(threadOf(acc)?.length ?? 0) > 1 && <p className="cmp-hint">+{threadOf(acc)!.length - 1} more post{threadOf(acc)!.length > 2 ? 's' : ''} in the thread, as replies.</p>}
                  </>
                : <Empty title={`Your ${L(acc)} post shows here`} body="It follows as you type, cut where the network cuts it." />}
            </>
          ) : <Empty title="Pick a profile" body="The preview shows the post the way each network will." />}
            </>}
        </aside>
      </div>

      <Modal open={asking} onOpenChange={setAsking} title="Send for approval"
        footer={<><span className="spacer" /><Btn variant="ghost" onClick={() => setAsking(false)}>Cancel</Btn><Btn variant="primary" onClick={() => { setAsking(false); submit('claire') }}><Send size={14} />Send for approval</Btn></>}>
        <div className="stack">
          <p>{needsClaire ? 'The Playbook sends posts that mention a price to Claire before they go out.' : 'The post waits as To approve until Claire answers.'}</p>
          <p className="row tight"><b>Approver</b>{ROSTER.claire.name}<span className="muted">· {ROSTER.claire.role}</span></p>
          <div className="field">
            <label htmlFor="cmp-ask">Message <span className="muted">· optional</span></label>
            <textarea id="cmp-ask" className="textarea" rows={3} value={ask} onChange={e => setAsk(e.target.value)} placeholder="Can you check the price in the second line?" />
          </div>
        </div>
      </Modal>
      <Modal open={leaving} onOpenChange={setLeaving} title="Discard changes?"
        footer={<><span className="spacer" /><Btn variant="ghost" onClick={() => setLeaving(false)}>Keep editing</Btn><Btn variant="danger" onClick={() => { setLeaving(false); onClose() }}>Discard</Btn></>}>
        <p>Your caption, visuals and settings for this post are lost. Save draft keeps them.</p>
      </Modal>
    </Sheet>
  )
}
