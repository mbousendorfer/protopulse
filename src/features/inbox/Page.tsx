import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AtSign, Check, ChevronDown, EyeOff, Frown, Hand, Inbox as InboxIcon, Mail, Megaphone, Meh, MessageSquare, Paperclip, Search, Send, ShoppingBag, Smile, Star, Undo2, UserRound, X } from 'lucide-react'
import type { Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { ago, hhmm } from '../../app/time'
import { NETWORK_LABEL } from '../../data/agents'
import { CONTACTS, type ConvStatus, type ConvType, type Conversation, type Sentiment } from '../../data/inbox'
import { Btn, Empty, FlagText, Mark, Menu, Net, PageHead, Pill, Switch } from '../../ui'
import { SocialAvatar } from '../../ui/SocialAvatar'
import { virtualConvs } from './slice'
import './inbox.css'

type View = 'needs' | 'drafts' | 'handled' | 'hidden' | 'all'
const VIEWS: { id: View; label: string; match: (c: Conversation) => boolean }[] = [
  { id: 'needs', label: 'Needs you', match: c => ['draft', 'escalated', 'claire'].includes(c.status) },
  { id: 'drafts', label: 'Nova’s drafts', match: c => c.status === 'draft' },
  { id: 'handled', label: 'Handled by Nova', match: c => c.status === 'auto' },
  { id: 'hidden', label: 'Hidden', match: c => c.status === 'hidden' },
  { id: 'all', label: 'All', match: () => true },
]

const STATUS: Record<ConvStatus, { label: string; tone?: 'alert' | 'caution' | 'ok' | 'signal' }> = {
  auto: { label: 'Auto-replied', tone: 'ok' }, draft: { label: 'Draft ready', tone: 'caution' }, escalated: { label: 'Escalated', tone: 'alert' },
  hidden: { label: 'Hidden' }, you: { label: 'You replied' }, claire: { label: 'Waiting on Claire', tone: 'signal' }, takeover: { label: 'You took over' },
}
const TYPE_LABEL: Record<ConvType, string> = { comment: 'Comment', dm: 'Message', mention: 'Mention', review: 'Review', ad: 'Ad comment' }
const SENT: Record<Sentiment, string> = { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' }
const TYPE_ICON: Record<ConvType, typeof Mail> = { comment: MessageSquare, dm: Mail, mention: AtSign, review: Star, ad: Megaphone }
const SENT_ICON: Record<Sentiment, typeof Smile> = { positive: Smile, neutral: Meh, negative: Frown }

/** What it is: a public comment, a private message, a review… */
export function TypeTag({ t }: { t: ConvType }) {
  const I = TYPE_ICON[t]
  return <span className={`ib-tag type ${t}`}><I size={12} aria-hidden />{TYPE_LABEL[t]}</span>
}
/** How it feels, in colour and in words. */
export function SentimentTag({ s }: { s: Sentiment }) {
  const I = SENT_ICON[s]
  return <span className={`ib-tag sent ${s}`}><I size={12} aria-hidden />{SENT[s]}</span>
}

export default function InboxPage() {
  const { s } = useStore()
  const params = useParams()
  const nav = useNavigate()
  const id = params['*'] || undefined
  const [view, setView] = useState<View>('needs')
  const [network, setNetwork] = useState<Network | 'all'>('all')
  const [type, setType] = useState<ConvType | 'all'>('all')
  const [sentiment, setSentiment] = useState<Sentiment | 'all'>('all')
  const [intent, setIntent] = useState(false)
  const [q, setQ] = useState('')

  const all = useMemo(() => [...virtualConvs(s), ...s.inbox.convs].sort((a, b) => b.at - a.at), [s])
  const v = VIEWS.find(x => x.id === view)!
  const list = all.filter(c => v.match(c) && (network === 'all' || c.network === network) && (type === 'all' || c.type === type) &&
    (sentiment === 'all' || c.sentiment === sentiment) && (!intent || (c.intent ?? 0) >= 0.6) &&
    (!q || `${c.author} ${c.messages.map(m => m.text).join(' ')}`.toLowerCase().includes(q.toLowerCase())))
  const current = all.find(c => c.id === id)

  // Deep link to a conversation outside the current view: switch to All so it stays visible in the list.
  useEffect(() => { if (current && !v.match(current)) setView('all') }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtersOn = network !== 'all' || type !== 'all' || sentiment !== 'all' || intent || q
  const clear = () => { setNetwork('all'); setType('all'); setSentiment('all'); setIntent(false); setQ('') }

  return (
    <div className="page inbox-page">
      <PageHead agent="nova" title="Inbox" lede="Every comment, message and review. Nova answers what she can and leaves the rest here for you." />
      <div className={`inbox ${current ? 'has-current' : ''}`}>
        <nav className="ib-views" aria-label="Views">
          {VIEWS.map(x => (
            <button key={x.id} className={`ib-view ${view === x.id ? 'active' : ''}`} onClick={() => setView(x.id)} aria-pressed={view === x.id}>
              {x.label}<span className="num">{all.filter(x.match).length}</span>
            </button>
          ))}
          <div className="ib-filters">
            <span className="faint">Filters</span>
            <Menu align="start" trigger={<button className="ib-select">{network === 'all' ? 'All networks' : NETWORK_LABEL[network]}<ChevronDown size={14} /></button>}
              items={[{ label: 'All networks', onSelect: () => setNetwork('all') }, ...(Object.keys(NETWORK_LABEL) as Network[]).map(n => ({ label: NETWORK_LABEL[n], icon: <Net n={n} />, onSelect: () => setNetwork(n) }))]} />
            <Menu align="start" trigger={<button className="ib-select">{type === 'all' ? 'All types' : TYPE_LABEL[type]}<ChevronDown size={14} /></button>}
              items={[{ label: 'All types', onSelect: () => setType('all') }, ...(Object.keys(TYPE_LABEL) as ConvType[]).map(t => ({ label: TYPE_LABEL[t], onSelect: () => setType(t) }))]} />
            <Menu align="start" trigger={<button className="ib-select">{sentiment === 'all' ? 'Any sentiment' : SENT[sentiment]}<ChevronDown size={14} /></button>}
              items={[{ label: 'Any sentiment', onSelect: () => setSentiment('all') }, ...(Object.keys(SENT) as Sentiment[]).map(t => ({ label: SENT[t], onSelect: () => setSentiment(t) }))]} />
            <Switch checked={intent} onChange={setIntent} label="Buying intent" />
            {filtersOn && <button className="link-btn" onClick={clear}>Clear filters</button>}
          </div>
        </nav>

        <section className="ib-list" aria-label="Conversations">
          <div className="ib-search">
            <Search size={14} aria-hidden />
            <input className="input" placeholder="Search people and messages" value={q} onChange={e => setQ(e.target.value)} aria-label="Search conversations" />
          </div>
          {!list.length ? (
            view === 'needs' && !filtersOn ? <Empty icon={<Check size={18} />} title="Nothing needs you" body="Nova is handling every conversation right now." />
              : <Empty title="No conversations here" body="Try another view or clear the filters." action={filtersOn ? <Btn size="sm" onClick={clear}>Clear filters</Btn> : undefined} />
          ) : (
            <ul>
              {list.map(c => (
                <li key={c.id}>
                  <Link to={`/inbox/${c.id}`} className={`ib-row ${c.id === id ? 'current' : ''} ${c.unread ? 'unread' : ''}`} aria-current={c.id === id ? 'true' : undefined}>
                    <SocialAvatar name={c.author} network={c.network} size={32} />
                    <div className="ib-row-main">
                      <div className="row nowrap tight"><b className="ellipsis">{c.author}</b><span className="spacer" /><span className="mono faint">{hhmm(c.at)}</span></div>
                      <p className="ellipsis">{c.messages.filter(m => m.from === 'them').slice(-1)[0]?.text}</p>
                      <div className="row tight">
                        <Pill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Pill>
                        <TypeTag t={c.type} />
                        <SentimentTag s={c.sentiment} />
                        {(c.intent ?? 0) >= 0.6 && <span className="ib-tag intent"><ShoppingBag size={12} aria-hidden />Wants to buy</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {current ? <ConversationPane c={current} onBack={() => nav('/inbox')} /> : (
          <section className="ib-empty"><Empty icon={<InboxIcon size={18} />} title="Pick a conversation" body="Drafts and escalations are at the top of “Needs you”." /></section>
        )}
      </div>
    </div>
  )
}

function ConversationPane({ c, onBack }: { c: Conversation; onBack: () => void }) {
  const { s, d } = useStore()
  const now = useNow(10000)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [reply, setReply] = useState('')
  const contact = CONTACTS.find(k => k.id === c.contact)
  const others = s.inbox.convs.filter(x => x.contact && x.contact === c.contact && x.id !== c.id)
  const card = c.handoff ? s.handoffs.find(h => h.id === c.handoff) : undefined
  const draftPlain = (c.draft ?? []).map(x => (typeof x === 'string' ? x : x.text)).join('')

  useEffect(() => { setEditing(false); setReply(''); if (c.unread && !c.id.startsWith('h:')) d({ type: 'inbox/read', id: c.id }) }, [c.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const canReply = ['you', 'takeover', 'auto', 'escalated'].includes(c.status)

  return (
    <div className="ib-detail">
      <section className="ib-conv card" aria-label={`Conversation with ${c.author}`}>
        <header className="ib-conv-head">
          <Btn variant="ghost" icon size="sm" className="ib-back" aria-label="Back to the list" onClick={onBack}><ArrowLeft size={16} /></Btn>
          <SocialAvatar name={c.author} network={c.network} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="ellipsis">{c.author}</h2>
            <div className="row tight"><TypeTag t={c.type} /><SentimentTag s={c.sentiment} /><span className="faint">on {NETWORK_LABEL[c.network]} · {ago(c.at, now)}</span></div>
          </div>
          <Pill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Pill>
        </header>

        <div className="ib-thread">
          {c.post && <div className="ib-post"><span className="faint">On</span> {c.post}</div>}
          {c.stars && <div className="stars" aria-label={`${c.stars} out of 5 stars`}>{'★'.repeat(c.stars)}<span>{'★'.repeat(5 - c.stars)}</span></div>}
          {c.messages.map(m => (
            <div key={m.id} className={`ib-msg ${m.from} ${m.undone ? 'undone' : ''}`}>
              {m.from === 'nova' ? <Mark agent="nova" /> : m.from === 'you' ? <span className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>SR</span> : <SocialAvatar name={c.author} network={c.network} size={24} />}
              <div className="bubble">
                <div className="meta">
                  <b>{m.from === 'them' ? c.author : m.from === 'you' ? 'You' : m.auto ? 'Nova · auto' : 'Nova · approved by you'}</b>
                  <span className="mono faint">{hhmm(m.at)}</span>
                </div>
                <p>{m.text}</p>
                {m.undone && <span className="faint ib-meta">Deleted by you</span>}
                {m.auto && m.undoUntil && m.undoUntil > now && !m.undone && (
                  <Btn size="xs" variant="ghost" onClick={() => d({ type: 'inbox/undoAuto', id: c.id, msg: m.id })}><Undo2 size={12} />Undo · {Math.ceil((m.undoUntil - now) / 60000)} min left</Btn>
                )}
              </div>
            </div>
          ))}
          {c.note && <p className="ib-note faint">{c.note}</p>}
          {card?.claire?.reply && (
            <div className="ib-claire"><Mark agent="claire" /><div><b>Claire {card.claire.verdict === 'changes' ? 'asked for changes' : 'declined'}</b><p>“{card.claire.reply}”</p></div></div>
          )}
        </div>

        {(c.status === 'draft' || (c.status === 'escalated' && c.draft)) && (
          <div className="ib-draft">
            <div className="row tight ib-draft-by">
              <Mark agent="nova" />{c.status === 'escalated' ? 'Nova never answers this topic. Suggested holding reply:' : 'Nova’s draft'}
              {card && <Link to="/" className="link-btn" style={{ marginLeft: 'auto', fontSize: 12 }}>Also on your Desk</Link>}
            </div>
            {editing ? <textarea className="textarea" rows={4} value={text} onChange={e => setText(e.target.value)} aria-label="Edit Nova’s draft" autoFocus />
              : <p className="ib-draft-text"><FlagText parts={c.draft ?? []} /></p>}
            {!!c.attachments?.length && (
              <ul className="ib-attach">
                {c.attachments.map(a => (
                  <li key={a.id} className={a.removed ? 'removed' : ''}>
                    {a.kind === 'exchange' ? <ShoppingBag size={13} /> : <Paperclip size={13} />}
                    <span>{a.label}</span><span className="faint">· {a.limit}</span>
                    <button className="link-btn" onClick={() => d({ type: 'inbox/attach', id: c.id, att: a.id })} aria-label={a.removed ? `Add back ${a.label}` : `Remove ${a.label}`}>{a.removed ? 'Add back' : <X size={13} />}</button>
                  </li>
                ))}
              </ul>
            )}
            {!!c.rules?.length && <div className="row tight"><span className="faint" style={{ fontSize: 12 }}>Playbook:</span>{c.rules.map(r => <span key={r} className="chip">{r}</span>)}</div>}
            <div className="row">
              {editing ? (
                <>
                  <Btn variant="primary" onClick={() => { d({ type: 'inbox/approve', id: c.id, text }); setEditing(false) }}><Send size={14} />Send edit</Btn>
                  <Btn variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
                </>
              ) : (
                <>
                  <Btn variant="primary" onClick={() => d({ type: 'inbox/approve', id: c.id })}><Send size={14} />{c.status === 'escalated' ? 'Send holding reply' : 'Approve & send'}</Btn>
                  <Btn onClick={() => { setText(draftPlain); setEditing(true) }}>Edit</Btn>
                </>
              )}
              <Btn variant="ghost" onClick={() => d({ type: 'inbox/takeover', id: c.id })}><Hand size={14} />Take over</Btn>
              <Btn variant="ghost" onClick={() => d({ type: 'inbox/claire', id: c.id })}><UserRound size={14} />Ask Claire</Btn>
              <Btn variant="ghost" onClick={() => d({ type: 'inbox/hide', id: c.id, hidden: true })}><EyeOff size={14} />Hide</Btn>
            </div>
          </div>
        )}

        {c.status === 'hidden' && (
          <div className="ib-draft row"><span className="muted" style={{ flex: 1 }}>Hidden from your public page. Nobody else sees it.</span><Btn onClick={() => d({ type: 'inbox/hide', id: c.id, hidden: false })}>Unhide</Btn></div>
        )}
        {c.status === 'claire' && !card?.claire?.reply && <div className="ib-draft"><span className="muted">Waiting on Claire. She usually replies in about a minute.</span></div>}

        {canReply && !(c.status === 'escalated' && c.draft) && (
          <form className="ib-reply" onSubmit={e => { e.preventDefault(); if (reply.trim()) { d({ type: 'inbox/send', id: c.id, text: reply.trim() }); setReply('') } }}>
            <label htmlFor="ib-reply" className="sr-only">Reply to {c.author}</label>
            <textarea id="ib-reply" className="textarea" rows={2} placeholder={`Reply to ${c.author} as Fernway…`} value={reply} onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit() } }} />
            <div className="row">
              <span className="faint" style={{ fontSize: 12 }}>{c.status === 'takeover' ? 'Nova won’t reply in this conversation.' : c.status === 'auto' ? 'Nova answered. You can add to it.' : ''}</span>
              <span className="spacer" />
              {c.status !== 'hidden' && c.status !== 'takeover' && <Btn variant="ghost" size="sm" onClick={() => d({ type: 'inbox/hide', id: c.id, hidden: true })}><EyeOff size={14} />Hide</Btn>}
              <Btn variant="primary" size="sm" type="submit" disabled={!reply.trim()}><Send size={14} />Send</Btn>
            </div>
          </form>
        )}
      </section>

      <aside className="ib-contact card" aria-label="Contact">
        {contact ? (
          <>
            <div className="row nowrap"><SocialAvatar name={contact.name} network={contact.handles[0]?.network} size={40} /><div><h3>{contact.name}</h3><div className="faint">{contact.location}</div></div></div>
            <ul className="ib-handles">{contact.handles.map(h => <li key={h.handle + h.network}><Net n={h.network} />{h.handle}</li>)}</ul>
            <dl className="ib-facts">
              {contact.followers && <div><dt>Followers</dt><dd className="num">{contact.followers}</dd></div>}
              <div><dt>Customer since</dt><dd>{contact.since ?? 'Not a customer'}</dd></div>
              <div><dt>Lifetime value</dt><dd className="num">€{contact.orders.reduce((a, o) => a + o.total, 0)}</dd></div>
            </dl>
            {!!contact.tags.length && <div className="row tight">{contact.tags.map(t => <Pill key={t} tone={t === 'At risk' ? 'caution' : t === 'VIP' || t === 'Creator' ? 'signal' : undefined}>{t}</Pill>)}</div>}
            <div>
              <div className="section-title">Orders <span className="faint">· Shopify</span></div>
              {contact.orders.length ? (
                <ul className="ib-orders">
                  {contact.orders.map(o => (
                    <li key={o.id}>
                      <div className="row nowrap"><b className="mono">{o.id}</b><span className="faint">{o.date}</span><span className="spacer" /><b className="num">€{o.total}</b></div>
                      <div className="row nowrap"><span className="muted ellipsis" style={{ flex: 1 }}>{o.items}</span><Pill tone={o.status === 'Late' ? 'alert' : o.status === 'Returned' || o.status === 'Processing' ? 'caution' : o.status === 'Delivered' ? 'ok' : undefined}>{o.status}</Pill></div>
                    </li>
                  ))}
                </ul>
              ) : <p className="faint">No orders yet.</p>}
            </div>
            {contact.notes && <div><div className="section-title">Notes</div><p className="muted">{contact.notes}</p></div>}
            {!!others.length && (
              <div>
                <div className="section-title">Other conversations</div>
                <ul className="rows">{others.map(o => <li key={o.id} style={{ padding: '6px 0' }}><Link to={`/inbox/${o.id}`} className="row nowrap tight"><Net n={o.network} /><span className="ellipsis">{o.messages[0]?.text}</span></Link></li>)}</ul>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="row nowrap"><SocialAvatar name={c.author} network={c.network} size={40} /><div><h3>{c.author}</h3><div className="faint">{NETWORK_LABEL[c.network]}</div></div></div>
            <p className="faint">No customer record matches this person. Nova matches profiles by handle and order email.</p>
          </>
        )}
      </aside>
    </div>
  )
}
