import { useState } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import type { Network } from '../../app/types'
import { useNow, useStore } from '../../app/store'
import { useTheme, type Theme } from '../../app/theme'
import { ago, MIN } from '../../app/time'
import { Btn, Net, PageHead, Pill, Seg, Switch, Tabs, Thinking } from '../../ui'
import { ShopifyMark } from '../onboarding/parts'
import { pageOf } from '../onboarding/model'
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

type Tab = 'accounts' | 'notifications' | 'profile'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('accounts')
  return (
    <div className="page narrow">
      <PageHead title="Settings" />
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'accounts', label: 'Connected accounts' }, { value: 'notifications', label: 'Notifications' }, { value: 'profile', label: 'Profile' },
      ]} />
      {/* Tabs stay mounted (hidden) so a reconnect, a switch or an unsaved edit survives switching tabs. */}
      <div hidden={tab !== 'accounts'}><Accounts /></div>
      <div hidden={tab !== 'notifications'}><Notifications /></div>
      <div hidden={tab !== 'profile'}><div className="stack lg"><Profile /><Appearance /></div></div>
    </div>
  )
}

function Accounts() {
  const now = useNow()
  const { s, d } = useStore()
  // Day 1: accounts were connected minutes ago, so none is expiring yet; those skipped at sign-up can be connected here.
  const day1 = s.phase === 'day1'
  const [list, setList] = useState<Account[]>(() => (day1 ? ACCOUNTS.filter(a => pageOf(a.id)).map(a => ({ ...a, state: 'ok', syncedMin: 1, note: undefined })) : ACCOUNTS))
  const [busy, setBusy] = useState<string | null>(null)
  const off = (a: Account) => day1 && !s.setup.connected.includes(a.id)
  const reconnect = (a: Account) => {
    setBusy(a.id)
    setTimeout(() => {
      if (off(a)) d({ type: 'setup/connect', ids: [a.id] })
      setList(l => l.map(x => (x.id === a.id ? { ...x, state: 'ok', syncedMin: 0, note: x.id === 'shop' ? x.note : undefined } : x)))
      setBusy(null)
    }, 1400)
  }
  return (
    <ul className="card rows">
      {list.map(a => (
        <li key={a.id} className="set-acc">
          {a.net ? <Net n={a.net} /> : <ShopifyMark />}
          <div className="grow">
            <div className="row tight"><b>{a.name}</b><span className="faint">{a.handle}</span></div>
            <div className="faint t-xs">
              {off(a) ? 'Not connected yet' : [a.followers, a.note, busy === a.id ? null : `Synced ${ago(now - a.syncedMin * MIN, now)}`].filter(Boolean).join(' · ')}
            </div>
          </div>
          {busy === a.id ? <Thinking label={off(a) ? 'Connecting…' : 'Reconnecting…'} /> : off(a) ? <Btn size="sm" onClick={() => reconnect(a)}>Connect</Btn> : (
            <>
              {a.state === 'expiring' && <Pill tone="caution" dot>Expires soon</Pill>}
              {a.state === 'error' && <Pill tone="alert" dot>Disconnected</Pill>}
              <Btn size="sm" variant={a.state === 'ok' ? 'ghost' : undefined} onClick={() => reconnect(a)}><RefreshCw size={14} />{a.state === 'ok' ? 'Resync' : 'Reconnect'}</Btn>
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
