import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarPlus, Check, ChevronDown, ImagePlus, Scissors, Send, Sparkles, Trash2, Users, Wand2, X } from 'lucide-react'
import type { Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { uid } from '../../app/core'
import { DAY, hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { BEST_SLOT, type Pillar, type Post } from '../../data/publishing'
import { Btn, Mark, Menu, Net, Pop, Seg, Sheet, Thinking, Tip } from '../../ui'
import Photo from '../../ui/Photo'
import { NetworkPreview } from './Previews'
import { slotComment } from './slice'
import { checkPost } from './checks'
import { libraryOf } from './visuals'
import { nextRoom, overCap } from './guards'
import { variantsOf, type Variant } from './copilot'
import { ACCOUNTS, GROUPS, ROUTE_REASON, accountById, accountLabel } from './accounts'
import { FIRST_COMMENT, FORMATS, FORMAT_LABEL, firstCommentFor, formatFor, type Format } from './formats'
import { LINK_IN_COMMENT, PLAIN_ONLY, UTM_CONVENTION, captionOf, commentOf, query, shown, track } from './links'
import { forLinkedIn, shorten } from './ideasModel'

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
const toDate = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

export default function Composer({ open, onClose, post, initial }: { open: boolean; onClose: () => void; post?: Post; initial?: { media?: string; text?: string; at?: number; network?: Network } }) {
  const { s, d } = useStore()
  const now = useNow()
  const words = useBannedWords()
  const editing = !!post
  const startAt = post?.at ?? initial?.at ?? (() => { const b = new Date(now + DAY); return new Date(b.getFullYear(), b.getMonth(), b.getDate(), 18, 30).getTime() })()
  // Profile ids (see accounts.ts): a main account's id is its network.
  const [accounts, setAccounts] = useState<string[]>(post ? [post.account ?? post.network] : [initial?.network ?? 'instagram'])
  const [text, setText] = useState(post?.text ?? initial?.text ?? '')
  const [variants, setVariants] = useState<Partial<Record<string, string>>>({})
  const [media, setMedia] = useState<string | undefined>(post?.media ?? initial?.media)
  const [date, setDate] = useState(toDate(startAt))
  const [time, setTime] = useState(hhmm(startAt))
  const [pillar, setPillar] = useState<Pillar>(post?.pillar ?? 'Trail stories')
  const [preview, setPreview] = useState<string>(post?.account ?? post?.network ?? initial?.network ?? 'instagram')
  // Per network, what you chose; otherwise Atlas's pick. A first comment you clear stays cleared.
  const [formats, setFormats] = useState<Partial<Record<string, Format>>>(post?.format ? { [post.account ?? post.network]: post.format } : {})
  const [comments, setComments] = useState<Partial<Record<string, string>>>(post ? { [post.account ?? post.network]: post.firstComment ?? '' } : {})
  const [link, setLink] = useState(post?.link?.url ?? '')
  const [busy, setBusy] = useState<string | null>(null)
  const [ideas, setIdeas] = useState<Variant[] | null>(null)
  // After a failed submit the error follows the form live: it clears as soon as the problem is fixed.
  const [tried, setTried] = useState<boolean | null>(null)

  const at = useMemo(() => { const [y, m, dd] = date.split('-').map(Number); const [h, mi] = time.split(':').map(Number); return new Date(y, m - 1, dd, h || 0, mi || 0).getTime() }, [date, time])
  const N = (a: string) => accountById(a).network
  const L = (a: string) => accountLabel(accountById(a))
  const textFor = (a: string) => variants[a] ?? text
  const formatOf = (a: string) => formats[a] ?? formatFor(N(a), textFor(a))
  const commentFor = (a: string) => (a in comments ? comments[a]! : firstCommentFor(N(a), textFor(a), pillar) ?? '')
  const linkFor = (a: string) => track(link, { network: N(a), campaign: post?.campaign, pillar })
  const previewAcc = accounts.includes(preview) ? preview : accounts[0]
  const previewNet = previewAcc ? N(previewAcc) : 'instagram'
  // Atlas routes repair content on Instagram to Fernway Repair; it says so when you pick the main account.
  const suggestRepair = pillar === 'Repair & care' && accounts.includes('instagram') && !accounts.includes('ig-repair')

  // Guardrail: 3 posts per network per day. The post you are editing doesn't count against itself.
  const others = s.publishing.posts.filter(p => p.id !== post?.id)
  const full = accounts.filter(a => overCap(others, { network: N(a), account: a, at }))
  const checks = [
    ...accounts.flatMap(a => checkPost({ text: textFor(a), network: N(a), media, words, rules: s.playbook.rules ?? [] })),
    ...full.map(a => ({ ok: false, label: `${L(a)} already has 3 posts on ${new Date(at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}. Atlas suggests ${new Date(nextRoom(others, { network: N(a), account: a, at })).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}.` })),
  ]
  const blocking = checks.filter(c => !c.ok)

  const think = (label: string, fn: () => void) => { setBusy(label); setTimeout(() => { fn(); setBusy(null) }, 700) }

  const build = (status: Post['status']): Post[] => {
    const group = accounts.length > 1 ? uid('g') : undefined
    return accounts.map((n, i) => ({
      id: editing && i === 0 ? post!.id : uid('p'), network: N(n), account: accountById(n).main ? undefined : n, at, text: textFor(n).trim(), media, status, author: post?.author ?? 'you', pillar, group,
      campaign: post?.campaign, note: undefined, handoff: post?.handoff, format: formatOf(n), firstComment: commentFor(n).trim() || undefined, link: linkFor(n),
    }))
  }
  const validate = (forSchedule: boolean) => {
    if (!text.trim()) return 'Write something first.'
    if (!accounts.length) return 'Pick at least one account.'
    if (forSchedule && blocking.length) return `Fix ${blocking.length} Playbook check${blocking.length > 1 ? 's' : ''} before scheduling.`
    if (forSchedule && at < now) return 'Pick a time in the future.'
    return null
  }
  const error = tried === null ? null : validate(tried)
  const submit = (kind: 'schedule' | 'draft' | 'plan' | 'claire') => {
    const err = validate(kind === 'schedule' || kind === 'claire')
    if (err) { setTried(kind === 'schedule' || kind === 'claire'); return }
    const posts = build(kind === 'schedule' ? 'scheduled' : 'draft')
    if (kind === 'plan') posts.forEach(p => d({ type: 'publishing/addToPlan', post: p }))
    else if (kind === 'claire') posts.forEach(p => d({ type: 'publishing/claire', post: p }))
    else posts.forEach(p => d({ type: 'publishing/upsert', post: p }))
    onClose()
  }

  const toggle = (n: string) => setAccounts(a => (a.includes(n) ? a.filter(x => x !== n) : [...a, n]))
  const best = BEST_SLOT[previewNet]

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()} wide title={editing ? 'Edit post' : 'New post'}
      head={<Mark agent="atlas" />}
      footer={<>
        {editing && <Btn variant="ghost" className="danger" onClick={() => { d({ type: 'publishing/bulk', ids: [post!.id], op: 'delete' }); onClose() }}><Trash2 size={14} />Delete</Btn>}
        {error && <span className="cmp-error" role="alert"><AlertTriangle size={14} />{error}</span>}
        <span className="spacer" />
        <Btn variant="ghost" onClick={() => submit('draft')}>Save draft</Btn>
        <Btn variant="ghost" onClick={() => submit('plan')}><CalendarPlus size={14} />Add to plan</Btn>
        <Btn onClick={() => submit('claire')}><Send size={14} />Ask Claire</Btn>
        <Btn variant="primary" onClick={() => submit('schedule')}>{editing && post?.status === 'scheduled' ? 'Save changes' : 'Schedule'}</Btn>
      </>}>
      <div className="cmp">
        <div className="cmp-edit">
          <fieldset className="cmp-accounts">
            <legend className="label">Accounts</legend>
            <div className="row tight">
              {ACCOUNTS.map(({ id: n }) => (
                <button key={n} type="button" className={`cmp-acc ${accounts.includes(n) ? 'on' : ''}`} aria-pressed={accounts.includes(n)} onClick={() => !editing && toggle(n)} disabled={editing && !accounts.includes(n)}>
                  <Net n={N(n)} />{L(n)}{accounts.includes(n) && <Check size={12} />}
                </button>
              ))}
            </div>
            {!editing && (
              <Menu align="start" trigger={<Btn size="xs" variant="ghost"><Users size={12} />Profile groups<ChevronDown size={12} /></Btn>}
                items={GROUPS.map(g => ({ label: g.name, hint: `${g.accounts.length} profiles`, onSelect: () => setAccounts(g.accounts) }))} />
            )}
            {suggestRepair && (
              <div className="cmp-slot">
                <Mark agent="atlas" />
                <p><b>Atlas:</b> {ROUTE_REASON}</p>
                <Btn size="xs" onClick={() => { setAccounts(a => a.map(x => (x === 'instagram' ? 'ig-repair' : x))); setPreview('ig-repair') }}>Use Fernway Repair</Btn>
              </div>
            )}
          </fieldset>

          <div className="field">
            <label htmlFor="cmp-text">Caption{accounts.length > 1 ? ' · shared by every account' : ''}</label>
            <textarea id="cmp-text" className="textarea" rows={5} value={text} onChange={e => setText(e.target.value)} placeholder="Packing the Ridge 28L for 3 days on the Tour du Mont Blanc." />
          </div>

          {accounts.length > 1 && (
            <div className="cmp-variants">
              {accounts.map(n => (
                <div key={n} className="cmp-variant">
                  <label className="switch">
                    <input type="checkbox" checked={variants[n] !== undefined} onChange={e => setVariants(v => ({ ...v, [n]: e.target.checked ? text : undefined }))} />
                    <span className="track" aria-hidden /><span className="row tight"><Net n={N(n)} />Customize for {L(n)}</span>
                  </label>
                  {variants[n] !== undefined && <textarea className="textarea" rows={3} value={variants[n]} onChange={e => setVariants(v => ({ ...v, [n]: e.target.value }))} aria-label={`${L(n)} version`} />}
                </div>
              ))}
            </div>
          )}

          <div className="field">
            <label htmlFor="cmp-link">Link <span className="faint">· optional</span></label>
            <input id="cmp-link" className="input" value={link} onChange={e => setLink(e.target.value)} placeholder="fernway.co/trail-week" />
            {link.trim() && accounts.length > 0 && (
              <div className="cmp-slot cmp-link">
                <Mark agent="atlas" />
                <div>
                  <p><b>Atlas</b> tracks it: {UTM_CONVENTION}.</p>
                  <ul>{accounts.map(n => { const l = linkFor(n)!; return (
                    <li key={n} className="row tight"><Net n={N(n)} /><span className="mono">{shown(l)}</span><span className="faint t-xs">{PLAIN_ONLY.includes(N(n)) ? `plain link: ${L(n)} refuses redirects` : LINK_IN_COMMENT.includes(N(n)) ? 'in the first comment: captions aren’t clickable' : query(l)}</span></li>
                  ) })}</ul>
                </div>
              </div>
            )}
          </div>

          {accounts.length > 0 && (
            <fieldset className="cmp-net">
              <legend className="label">Per network <span className="faint">· Atlas pre-filled the format{accounts.some(n => FIRST_COMMENT.includes(N(n))) ? ' and the first comment' : ''}</span></legend>
              {accounts.map(n => (
                <div key={n} className="cmp-net-row">
                  <span className="row tight"><Net n={N(n)} />{L(n)}</span>
                  {(FORMATS[N(n)]?.length ?? 0) > 1
                    ? <Seg name={`fmt-${n}`} label={`${L(n)} format`} size="sm" value={formatOf(n)} onChange={v => setFormats(f => ({ ...f, [n]: v }))} options={FORMATS[N(n)]!.map(f => ({ value: f, label: FORMAT_LABEL[f] }))} />
                    : <span className="faint">{FORMAT_LABEL[formatOf(n)]}</span>}
                  {FIRST_COMMENT.includes(N(n))
                    ? <input className="input" aria-label={`${L(n)} first comment`} placeholder="First comment (optional)" value={commentFor(n)} onChange={e => setComments(c => ({ ...c, [n]: e.target.value }))} />
                    : <span className="faint t-xs">No first comment on {L(n)}</span>}
                </div>
              ))}
            </fieldset>
          )}

          <div className="cmp-row">
            <div className="field">
              <span className="label">Visual</span>
              <div className="row nowrap">
                {media ? <span className="cmp-thumb"><Photo name={media} /></span> : <span className="cmp-thumb empty"><ImagePlus size={16} /></span>}
                <Pop align="start" trigger={<Btn size="sm">{media ? 'Change' : 'Pick from Media'}</Btn>}>
                  <div className="cmp-picker" role="listbox" aria-label="Media library">
                    {libraryOf(s).map(m => (
                      <button key={m.id} role="option" aria-selected={media === m.name} className={media === m.name ? 'on' : ''} onClick={() => setMedia(m.name)} title={m.title}>
                        <Photo name={m.name} />
                      </button>
                    ))}
                  </div>
                </Pop>
                {media && <Btn size="sm" variant="ghost" onClick={() => setMedia(undefined)}><X size={14} />Remove</Btn>}
              </div>
            </div>
            <div className="field">
              <span className="label">Pillar</span>
              <Menu align="start" trigger={<button className="select-btn block">{pillar}<ChevronDown size={14} /></button>} items={s.strategy.pillars.map(({ name: p }) => ({ label: p, onSelect: () => setPillar(p) }))} />
            </div>
          </div>

          <div className="cmp-row">
            <div className="field"><label htmlFor="cmp-date">Date</label><input id="cmp-date" type="date" className="input" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="field"><label htmlFor="cmp-time">Time</label><input id="cmp-time" type="time" className="input" value={time} onChange={e => setTime(e.target.value)} /></div>
          </div>
          <div className="cmp-slot">
            <Mark agent="atlas" />
            <p><b>Atlas:</b> {time === best.time ? slotComment(previewNet, at) : `${best.time} is the best slot on ${NETWORK_LABEL[previewNet]}. ${best.reason}`}</p>
            {time !== best.time && <Btn size="xs" onClick={() => setTime(best.time)}>Use {best.time}</Btn>}
          </div>

          {full.length > 0 && (() => {
            const room = nextRoom(others, { network: N(full[0]), account: full[0], at })
            const label = new Date(room).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
            return (
              <div className="cmp-slot">
                <Mark agent="atlas" />
                <p><b>Atlas:</b> {L(full[0])} already has 3 posts that day, the most Atlas schedules. {label} has room.</p>
                <Btn size="xs" onClick={() => setDate(toDate(room))}>Use {label}</Btn>
              </div>
            )
          })()}
          <section className="cmp-check" aria-label="Playbook check">
            <div className="section-title">Playbook check <span className="faint">· live</span></div>
            <ul>{checks.map(c => <li key={c.label} className={c.ok ? 'ok' : 'bad'}>{c.ok ? <Check size={13} /> : <AlertTriangle size={13} />}{c.label}</li>)}</ul>
          </section>
        </div>

        <div className="cmp-side">
          {accounts.length > 0 ? (
            <>
              {accounts.length > 1 && <Seg name="pv" label="Preview profile" size="sm" value={previewAcc} onChange={setPreview} options={accounts.map(n => ({ value: n, label: L(n) }))} />}
              <NetworkPreview network={previewNet} who={accountById(previewAcc)} text={captionOf({ text: textFor(previewAcc), network: previewNet, link: linkFor(previewAcc) })} media={media} words={words} at={at} format={formatOf(previewAcc)} firstComment={commentOf({ network: previewNet, firstComment: commentFor(previewAcc) || undefined, link: linkFor(previewAcc) }) || undefined} />
            </>
          ) : <p className="faint">Pick an account to see the preview.</p>}

          <section className="cmp-copilot" aria-label="Atlas copilot">
            <div className="row tight"><Mark agent="atlas" /><b>Atlas</b><span className="faint">copilot</span></div>
            <div className="row tight">
              <Btn size="sm" disabled={!text.trim() || !!busy} onClick={() => think('Writing 3 variants', () => setIdeas(variantsOf(text, { pillar, network: previewNet, words, rules: s.playbook.rules ?? [] })))}><Sparkles size={14} />3 variants</Btn>
              <Btn size="sm" disabled={!text.trim() || !!busy} onClick={() => think('Shortening', () => setText(shorten(text)))}><Scissors size={14} />Shorten</Btn>
              <Tip label="Adds a LinkedIn version: no emoji, one line of context, a question to close.">
                <Btn size="sm" disabled={!text.trim() || !!busy} onClick={() => think('Adapting for LinkedIn', () => { setAccounts(a => (a.includes('linkedin') ? a : [...a, 'linkedin'])); setVariants(v => ({ ...v, linkedin: forLinkedIn(text) })); setPreview('linkedin') })}><Wand2 size={14} />Adapt for LinkedIn</Btn>
              </Tip>
            </div>
            {busy && <Thinking label={busy} />}
            {ideas && !busy && (
              <ul className="cmp-ideas">
                {ideas.map(v => (
                  <li key={v.label}>
                    <span className="faint">{v.label}</span>
                    <p>{v.text}</p>
                    {v.applied.length > 0 && <span className="faint t-xs">Playbook: {v.applied.join(' · ')}</span>}
                    <Btn size="xs" onClick={() => { setText(v.text); setIdeas(null) }}>Use this</Btn>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Sheet>
  )
}
