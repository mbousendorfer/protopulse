// App clock. The demo starts on Tuesday 25 November 2026 at 08:12 and runs in real time from there.

export const DAY = 86_400_000
export const MIN = 60_000

/** App time for a given hour/minute, `day` days from the demo start day (negative = past). */
export const T = (h: number, m = 0, day = 0) => new Date(2026, 10, 25 + day, h, m).getTime()

export const DEMO_START = T(8, 12)

export type Clock = { base: number; realAt: number }

export const startClock = (base = DEMO_START): Clock => ({ base, realAt: Date.now() })
export const appNow = (c: Clock) => c.base + (Date.now() - c.realAt)

export const hhmm = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

export const dayLabel = (t: number, now: number) => {
  const d = new Date(t), n = new Date(now)
  const diff = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / DAY)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff === -1) return 'Tomorrow'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export const ago = (t: number, now: number) => {
  const m = Math.round((now - t) / MIN)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h ago`
  return dayLabel(t, now)
}

/** Time an Undo still has: "8 s left" under a minute, then minutes, then hours. */
export const left = (until: number, now: number) => {
  const ms = Math.max(0, until - now)
  if (ms < MIN) return `${Math.max(1, Math.ceil(ms / 1000))} s left`
  const m = Math.ceil(ms / MIN)
  return m >= 60 ? `${Math.round(m / 60)} h left` : `${m} min left`
}
