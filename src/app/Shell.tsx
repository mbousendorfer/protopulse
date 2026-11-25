import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, BookOpen, Bot, ChevronRight, Inbox, LayoutDashboard, LineChart, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen,
  Radar, Search, Send, Settings, Target, Undo2, X, Bell, MessageCircle, Sun, Moon,
} from 'lucide-react'
import { useNow, useStore } from './store'
import { groupOf } from './reducer'
import { inboxNeedsCount } from '../features/inbox/slice'
import { useTheme } from './theme'
import type { AgentId } from './types'
import { Btn, Kbd, Mark, Modal, Pop } from '../ui'
import { ago } from './time'
import CommandBar from '../features/command/CommandBar'
import Boundary from './Boundary'
import ChatDrawer from '../features/chats/Drawer'
import { SocialAvatar } from '../ui/SocialAvatar'
import Moderator from '../features/moderator/Moderator'

const DEPTS: { to: string; label: string; agent: AgentId; icon: ReactNode }[] = [
  { to: '/inbox', label: 'Inbox', agent: 'nova', icon: <Inbox size={16} /> },
  { to: '/publishing', label: 'Publishing', agent: 'atlas', icon: <Send size={16} /> },
  { to: '/insights', label: 'Insights', agent: 'iris', icon: <LineChart size={16} /> },
  { to: '/listening', label: 'Listening', agent: 'echo', icon: <Radar size={16} /> },
  { to: '/strategy', label: 'Strategy', agent: 'sage', icon: <Target size={16} /> },
]

const CRUMB: Record<string, string> = {
  '': 'Desk', focus: 'Focus', inbox: 'Inbox', publishing: 'Publishing', insights: 'Insights', listening: 'Listening', strategy: 'Strategy',
  agents: 'Agents', chats: 'Chats', activity: 'Activity', playbook: 'Playbook', settings: 'Settings', onboarding: 'Onboarding',
}

const GOTO: Record<string, string> = { d: '/', i: '/inbox', p: '/publishing', n: '/insights', l: '/listening', s: '/strategy', a: '/agents', y: '/activity', b: '/playbook' }

export default function Shell() {
  const { s, d } = useStore()
  const loc = useLocation()
  const nav = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cmd, setCmd] = useState(false)
  const [mod, setMod] = useState(false)
  const [help, setHelp] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const unread = s.chats.list.reduce((n, c) => n + c.unread, 0)
  const gPressed = useRef(0)

  // Counts everywhere mean the same thing: cards in Needs you. Worth a look and Good news never badge.
  const open = s.handoffs.filter(h => !h.lane && groupOf(h) === 'need')
  // The Inbox badge predicts the Inbox's own Needs you view (conversations), not Nova's Desk cards.
  const inboxNeeds = inboxNeedsCount(s)
  const countFor = (agent: AgentId) => open.filter(h => h.agent === agent).length
  const urgentFor = (agent: AgentId) => open.some(h => h.agent === agent && h.urgency === 'urgent')

  // Track navigation for the tester log, close mobile rail.
  useEffect(() => { d({ type: 'core/track', kind: 'nav', detail: { path: loc.pathname } }); setMobileOpen(false) }, [loc.pathname, d])

  // Global shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : null
      const typing = el?.closest('input, textarea, [contenteditable="true"], [role="dialog"]')
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd(o => !o); return }
      if (e.shiftKey && e.key.toLowerCase() === 'd' && !typing) { e.preventDefault(); setMod(o => !o); return }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '?') { setHelp(true); return }
      if (e.key === '/') { e.preventDefault(); setCmd(true); return }
      if (loc.pathname === '/focus') return
      if (e.key.toLowerCase() === 'g') { e.preventDefault(); gPressed.current = Date.now(); return }
      if (Date.now() - gPressed.current < 900 && GOTO[e.key.toLowerCase()]) { e.preventDefault(); nav(GOTO[e.key.toLowerCase()]); gPressed.current = 0; return }
      if (e.key.toLowerCase() === 'f' && loc.pathname === '/' && open.length) { e.preventDefault(); nav('/focus') }
    }
    // Capture phase: the shell sees G-then-key before the Desk's decision keys, which then ignore it.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [loc.pathname, nav, open.length])

  const seg = loc.pathname.split('/')[1] ?? ''
  const sub = loc.pathname.split('/').slice(2).filter(Boolean)

  if (!s.onboarded && seg !== 'onboarding') { setTimeout(() => nav('/onboarding')); return null }
  if (seg === 'focus' || seg === 'onboarding') return (
    <>
      <Boundary resetKey={loc.pathname}><Outlet /></Boundary>
      <Toasts />
      <CommandBar open={cmd} onOpenChange={setCmd} />
      <Moderator open={mod} onOpenChange={setMod} />
    </>
  )

  return (
    <div className={`app ${collapsed ? 'rail-collapsed' : ''} ${mobileOpen ? 'rail-open' : ''}`}>
      <nav className="rail" aria-label="Main">
        <div className="rail-brand">
          <span className="logo" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M4 17h6l3-8 5 15 3-7h7" stroke="var(--void)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div className="hide-collapsed"><b>Protopulse</b><small>Fernway</small></div>
        </div>

        <RailLink to="/" icon={<LayoutDashboard size={16} />} label="Desk" count={open.length} hot={open.some(h => h.urgency === 'urgent')} end />
        <RailLink to="/chats" icon={<MessageCircle size={16} />} label="Chats" count={unread || undefined} />

        <div className="rail-group">
          <span className="label hide-collapsed">Departments</span>
          {DEPTS.map(dp => {
            const ag = s.agents.find(a => a.id === dp.agent)!
            return (
              <RailLink key={dp.to} to={dp.to} label={dp.label} count={dp.agent === 'nova' ? inboxNeeds : countFor(dp.agent)} hot={urgentFor(dp.agent)}
                icon={<Mark agent={dp.agent} state={ag.status === 'on' ? 'on' : 'paused'} />} />
            )
          })}
        </div>

        <div className="rail-group">
          <span className="label hide-collapsed">Team</span>
          <RailLink to="/agents" icon={<Bot size={16} />} label="Agents" />
          <RailLink to="/activity" icon={<Activity size={16} />} label="Activity" />
          <RailLink to="/playbook" icon={<BookOpen size={16} />} label="Playbook" />
        </div>

        <div className="rail-foot">
          <RailLink to="/settings" icon={<Settings size={16} />} label="Settings" />
          <div className="rail-link" style={{ cursor: 'default' }}>
            <SocialAvatar name="Sam Rivera" size={24} />
            <span className="hide-collapsed">Sam Rivera</span>
          </div>
          <button className="rail-link" onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: 0 }} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}<span className="hide-collapsed">Collapse</span>
          </button>
        </div>
      </nav>
      {mobileOpen && <div className="overlay mobile-only" onClick={() => setMobileOpen(false)} />}

      <div className="main">
        <header className="top">
          <Btn variant="ghost" icon size="sm" className="mobile-only" aria-label="Open menu" onClick={() => setMobileOpen(true)}><MenuIcon size={16} /></Btn>
          <div className="crumbs">
            <b>{CRUMB[seg] ?? seg}</b>
            {sub.slice(0, 2).filter(x => !/^[a-z]{1,4}-/.test(x) || seg === 'agents').map(x => {
              // Ids never show as crumbs; an agent id shows as the agent's name.
              const t = seg === 'agents' ? (s.agents.find(a => a.id === x)?.name ?? x) : decodeURIComponent(x).replace(/-/g, ' ')
              return <span key={x} className="row tight nowrap"><ChevronRight size={14} /> <span className="ellipsis" style={{ maxWidth: 200 }}>{t.charAt(0).toUpperCase() + t.slice(1)}</span></span>
            })}
          </div>
          <div className="spacer" />
          <button className="cmd-trigger" onClick={() => setCmd(true)}>
            <Search size={14} aria-hidden /><span>Ask or brief an agent…</span><Kbd>⌘K</Kbd>
          </button>
          <Btn size="sm" onClick={() => setChatOpen(true)} aria-label="Chat with your agents"><MessageCircle size={14} /><span className="hide-sm">Chat</span></Btn>
          <ClaireStatus />
          <ThemeToggle />
          <Notifications />
        </header>
        <main className="content" id="main">
          <Boundary resetKey={loc.pathname}><Outlet /></Boundary>
        </main>
      </div>

      <Toasts />
      <CommandBar open={cmd} onOpenChange={setCmd} />
      <Moderator open={mod} onOpenChange={setMod} />
      <ShortcutHelp open={help} onOpenChange={setHelp} />
      <ChatDrawer open={chatOpen} onOpenChange={setChatOpen} chatId={chatId} setChatId={setChatId} />
    </div>
  )
}

function RailLink({ to, icon, label, count, hot, end }: { to: string; icon: ReactNode; label: string; count?: number; hot?: boolean; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`} title={label}>
      {icon}
      <span className="hide-collapsed">{label}</span>
      {!!count && <span className={`count hide-collapsed ${hot ? 'hot' : ''}`} aria-label={`${count} need you`}>{count}</span>}
    </NavLink>
  )
}

function ClaireStatus() {
  const { s } = useStore()
  const waiting = s.handoffs.filter(h => h.lane === 'claire').length
  return (
    <Pop trigger={
      <button className="btn sm ghost" aria-label="Claire Dubois, approver">
        <Mark agent="claire" />
        <span className="hide-sm">{waiting ? `${waiting} with Claire` : 'Claire'}</span>
      </button>
    }>
      <div className="stack" style={{ width: 280 }}>
        <div className="row nowrap"><Mark agent="claire" size="md" /><div><b>Claire Dubois</b><div className="muted" style={{ fontSize: 12 }}>Head of Brand · approves what you send her</div></div></div>
        <div className="muted">Usually replies in about a minute.</div>
        <div className="faint" style={{ fontSize: 12 }}>{waiting ? `${waiting} card${waiting > 1 ? 's' : ''} waiting on her decision.` : 'Nothing waiting on her right now.'}</div>
      </div>
    </Pop>
  )
}

function Notifications() {
  const { s, d } = useStore()
  const now = useNow()
  const nav = useNavigate()
  const items = s.log.slice(0, 12)
  return (
    <Pop trigger={<Btn variant="ghost" icon size="sm" aria-label="Recent agent activity"><Bell size={16} /></Btn>}>
      <div style={{ width: 360 }}>
        <div className="section-title">Recent activity</div>
        <ul className="rows" style={{ maxHeight: 360, overflowY: 'auto' }}>
          {items.map(l => (
            <li key={l.id} className="row nowrap" style={{ padding: '8px 0', alignItems: 'flex-start' }}>
              <Mark agent={l.agent} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ textDecoration: l.status === 'undone' ? 'line-through' : undefined, color: l.status === 'undone' ? 'var(--ink-3)' : undefined }}>{l.text}</div>
                <div className="faint mono">{ago(l.at, now)}</div>
              </div>
              {l.undoUntil && l.undoUntil > now && l.status !== 'undone' && <Btn size="xs" variant="ghost" onClick={() => d({ type: 'core/undo', id: l.id })}><Undo2 size={12} />Undo</Btn>}
            </li>
          ))}
        </ul>
        <Btn size="sm" variant="ghost" onClick={() => nav('/activity')}>See all activity</Btn>
      </div>
    </Pop>
  )
}

function Toasts() {
  const { s, d } = useStore()
  const nav = useNavigate()
  useEffect(() => {
    if (!s.toasts.length) return
    const t = setTimeout(() => d({ type: 'core/dropToast', id: s.toasts[0].id }), s.toasts[0].undo ? 6000 : 4000)
    return () => clearTimeout(t)
  }, [s.toasts, d])
  const announce = useMemo(() => s.toasts[s.toasts.length - 1]?.text ?? '', [s.toasts])
  return (
    <div className="toasts" aria-live="polite">
      <span className="sr-only">{announce}</span>
      {s.toasts.map(t => (
        <div key={t.id} className="toast">
          {t.agent && <Mark agent={t.agent} />}
          <p>{t.text}</p>
          {t.undo && <Btn size="xs" onClick={() => { d({ type: 'core/undo', id: t.undo! }); d({ type: 'core/dropToast', id: t.id }) }}>Undo</Btn>}
          {t.link && <Btn size="xs" variant="ghost" onClick={() => { nav(t.link!); d({ type: 'core/dropToast', id: t.id }) }}>Open</Btn>}
          <Btn size="xs" variant="ghost" icon aria-label="Dismiss" onClick={() => d({ type: 'core/dropToast', id: t.id })}><X size={12} /></Btn>
        </div>
      ))}
    </div>
  )
}

const SHORTCUTS: [string, string][] = [
  ['⌘K or /', 'Ask or brief an agent'], ['F', 'Process the Desk in Focus'], ['G then D', 'Desk'], ['G then I', 'Inbox'], ['G then P', 'Publishing'],
  ['G then N', 'Insights'], ['G then L', 'Listening'], ['G then S', 'Strategy'], ['G then A', 'Agents'], ['G then Y', 'Activity'], ['G then B', 'Playbook'],
  ['↑ / ↓ or J / K', 'Desk and Focus: next / previous card'], ['A', 'Desk and Focus: approve, or pick the recommended option'], ['1–9', 'Desk and Focus: pick an option'],
  ['E', 'Desk and Focus: edit (⌘↵ approves the edit)'], ['R then 1–4', 'Desk and Focus: reject with a reason'], ['S then 1–4', 'Desk and Focus: snooze'],
  ['T / N', 'Autonomy request: try for a week / not yet'], ['C', 'Desk and Focus: ask Claire'], ['Z', 'Focus: undo the last decision'],
  ['Shift-click', 'Select a range of rows'], ['Esc', 'Step back, or clear the selection'], ['?', 'This help'],
]

function ShortcutHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Keyboard shortcuts">
      <ul className="rows">
        {SHORTCUTS.map(([k, v]) => (
          <li key={k} className="row" style={{ justifyContent: 'space-between', padding: '8px 0' }}><span className="muted">{v}</span><Kbd>{k}</Kbd></li>
        ))}
      </ul>
    </Modal>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <Btn variant="ghost" icon size="sm" aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} onClick={() => setTheme(next)}>
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </Btn>
  )
}
