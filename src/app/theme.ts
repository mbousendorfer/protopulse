import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
const KEY = 'protopulse:theme'
const EVENT = 'protopulse:theme'

const read = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

/** Current theme and a setter. The attribute on <html> is the source of truth; index.html sets it before paint. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setState] = useState<Theme>(read)
  useEffect(() => {
    const sync = () => setState(read())
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])
  const set = useCallback((t: Theme) => {
    document.documentElement.dataset.theme = t
    try { localStorage.setItem(KEY, t) } catch { /* private mode: theme lasts for the session */ }
    window.dispatchEvent(new Event(EVENT))
  }, [])
  return [theme, set]
}
