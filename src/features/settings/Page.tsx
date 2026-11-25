import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, RefreshCw } from 'lucide-react'
import type { Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { useTheme, type Theme } from '../../app/theme'
import { ago, MIN } from '../../app/time'
import { Btn, Net, PageHead, Pill, Seg, Switch, Tabs, Thinking } from '../../ui'
import './settings.css'

type Account = { id: string; name: string; handle: string; net?: Network; followers?: string; state: 'ok' | 'expiring' | 'error'; syncedMin: number; note?: string }

const ACCOUNTS: Account[] = [
  { id: 'ig', name: 'Instagram', handle: '@fernway', net: 'instagram', followers: '48k followers', state: 'ok', syncedMin: 2 },
  { id: 'tt', name: 'TikTok', handle: '@fernway.co', net: 'tiktok', followers: '31k followers', state: 'ok', syncedMin: 3 },
  { id: 'li', name: 'LinkedIn', handle: 'Fernway', net: 'linkedin', followers: '9k followers', state: 'expiring', syncedMin: 6, note: 'Access expires in 5 days' },
  { id: 'fb', name: 'Facebook', handle: 'Fernway Outdoor', net: 'facebook', followers: '22k followers', state: 'ok', syncedMin: 2 },
  { id: 'yt', name: 'YouTube', handle: 'Fernway', net: 'youtube', followers: '6k subscribers', state: 'ok', syncedMin: 14 },
  { id: 'x', name: 'X', handle: '@fernwayco', net: 'x', followers: '4k followers', state: 'error', syncedMin: 190, note: 'X rejected the last sync. Reconnect to keep publishing.' },
  { id: 'gr', name: 'Google Reviews', handle: 'Fernway Annecy', net: 'google', state: 'ok', syncedMin: 30 },
  { id: 'tp', name: 'Trustpilot', handle: 'fernway.co', net: 'trustpilot', state: 'ok', syncedMin: 25 },
  { id: 'shop', name: 'Shopify', handle: 'fernway.myshopify.com', state: 'ok', syncedMin: 1, note: 'Orders, products and refunds for Nova' },
]

const NOTIFS = [
  { id: 'urgent', label: 'Urgent cards on the Desk', on: true },
  { id: 'new', label: 'Every new card on the Desk', on: true },
  { id: 'auto', label: 'Actions agents take on their own', on: true },
  { id: 'claire', label: 'Claire’s replies', on: true },
  { id: 'promo', label: 'Agents asking for more autonomy', on: true },
  { id: 'competitor', label: 'Competitor events', on: false },
]

type Tab = 'accounts' | 'notifications' | 'appearance' | 'profile' | 'approver'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('accounts')
  return (
    <div className="page narrow">
      <PageHead title="Settings" lede="Accounts your agents use, what pings you, and who approves what." />
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'accounts', label: 'Connected accounts' }, { value: 'notifications', label: 'Notifications' }, { value: 'appearance', label: 'Appearance' },
        { value: 'profile', label: 'Profile' }, { value: 'approver', label: 'Approver' },
      ]} />
      {/* Tabs stay mounted (hidden) so a reconnect, a switch or an unsaved edit survives switching tabs. */}
      <div hidden={tab !== 'accounts'}><Accounts /></div>
      <div hidden={tab !== 'notifications'}><Notifications /></div>
      <div hidden={tab !== 'appearance'}><Appearance /></div>
      <div hidden={tab !== 'profile'}><Profile /></div>
      <div hidden={tab !== 'approver'}><Approver /></div>
    </div>
  )
}

function Accounts() {
  const now = useNow()
  const [list, setList] = useState(ACCOUNTS)
  const [busy, setBusy] = useState<string | null>(null)
  const reconnect = (a: Account) => {
    setBusy(a.id)
    setTimeout(() => {
      setList(l => l.map(x => (x.id === a.id ? { ...x, state: 'ok', syncedMin: 0, note: x.id === 'shop' ? x.note : undefined } : x)))
      setBusy(null)
    }, 1400)
  }
  return (
    <ul className="card rows">
      {list.map(a => (
        <li key={a.id} className="set-acc">
          {a.net ? <Net n={a.net} /> : <span className="net">SH</span>}
          <div className="grow">
            <div className="row tight"><b>{a.name}</b><span className="faint">{a.handle}</span></div>
            <div className="faint t-xs">
              {[a.followers, a.note, busy === a.id ? null : `Synced ${ago(now - a.syncedMin * MIN, now)}`].filter(Boolean).join(' · ')}
            </div>
          </div>
          {busy === a.id ? <Thinking label="Reconnecting…" /> : (
            <>
              {a.state === 'ok' && <Pill tone="ok" dot>Connected</Pill>}
              {a.state === 'expiring' && <Pill tone="caution" dot>Expires soon</Pill>}
              {a.state === 'error' && <Pill tone="alert" dot>Disconnected</Pill>}
              <Btn size="sm" variant={a.state === 'ok' ? 'ghost' : 'primary'} onClick={() => reconnect(a)}><RefreshCw size={13} />{a.state === 'ok' ? 'Resync' : 'Reconnect'}</Btn>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

function Notifications() {
  const [list, setList] = useState(NOTIFS)
  return (
    <section className="card">
      <div className="card-head"><h2>In-app notifications</h2><span className="faint">What reaches the bell in the top bar.</span></div>
      <ul className="rows">
        {list.map(n => (
          <li key={n.id} className="set-row">
            <span>{n.label}</span>
            <Switch checked={n.on} onChange={on => setList(l => l.map(x => (x.id === n.id ? { ...x, on } : x)))} label={n.label} hideLabel />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Appearance() {
  const [theme, setTheme] = useTheme()
  return (
    <section className="card">
      <div className="card-head"><h2>Appearance</h2><span className="faint">Saved on this device.</span></div>
      <div className="set-row">
        <span>Theme</span>
        <Seg<Theme> name="theme" label="Theme" value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </div>
    </section>
  )
}

function Profile() {
  const [saved, setSaved] = useState(false)
  const [name, setName] = useState('Sam Rivera')
  const [role, setRole] = useState('Social Media Lead')
  const [tz, setTz] = useState('cet')
  return (
    <form className="card pad stack set-profile" onSubmit={e => { e.preventDefault(); setSaved(true) }} onChange={() => setSaved(false)}>
      <div className="row nowrap"><span className="avatar lg">SR</span><div><b>{name}</b><div className="faint">sam@fernway.co</div></div></div>
      <div className="grid-2">
        <div className="field"><label htmlFor="p-name">Name</label><input id="p-name" className="input" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="p-role">Role</label><input id="p-role" className="input" value={role} onChange={e => setRole(e.target.value)} /></div>
      </div>
      <div className="field">
        <span className="label">Time zone</span>
        <Seg name="tz" label="Time zone" value={tz} onChange={setTz} options={[{ value: 'cet', label: 'Paris (CET)' }, { value: 'utc', label: 'London (UTC)' }, { value: 'est', label: 'New York (EST)' }]} />
        <span className="hint">Your morning brief arrives at 07:00 in this time zone.</span>
      </div>
      <div className="row"><Btn type="submit" variant="primary">Save</Btn>{saved && <span className="faint" role="status"><Check size={14} aria-hidden /> Saved</span>}</div>
    </form>
  )
}

function Approver() {
  const { s } = useStore()
  return (
    <section className="card">
      <div className="card-head">
        <div className="row nowrap"><span className="mark claire">CD</span><div><h2>Claire Dubois</h2><span className="faint t-xs">Head of Brand · approves what you send her</span></div></div>
        <Link to="/playbook?tab=escalation" className="btn sm ghost">Edit in the Playbook</Link>
      </div>
      <p className="card-body muted pb-0">Topics that go straight to Claire instead of you. You can still send her any card with “Ask Claire”.</p>
      <ul className="rows">
        {s.playbook.escalate.map(e => (
          <li key={e.id} className="set-row">
            <span>{e.label}</span>
            <span className="faint">{!e.on ? 'Off' : e.to === 'claire' ? 'Goes to Claire' : 'Goes to you'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
