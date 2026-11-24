import { useEffect } from 'react'
import type { Handoff } from '../../app/types'
import { REJECT_REASONS, SNOOZE, editable, useHandoffActions } from './parts'

export type Mode = 'idle' | 'edit' | 'reject' | 'snooze'
export type Outcome = 'approved' | 'edited' | 'rejected' | 'snoozed' | 'claire' | 'decided'

/**
 * Decision shortcuts shared by the Desk detail pane and Focus:
 * A approve (or the recommended option) · E edit, ⌘↵ approve the edit · R then 1–4 reject · S then 1–4 snooze · C ask Claire
 * · 1–9 pick an option · T / N on autonomy requests. Navigation keys stay with the caller.
 */
export function useDecisionKeys({ h, enabled, mode, setMode, draft, startEdit, finish }: {
  h?: Handoff
  enabled: boolean
  mode: Mode
  setMode: (m: Mode) => void
  draft: string
  startEdit: () => void
  finish: (outcome: Outcome, label: string, fn: () => void) => void
}) {
  const act = useHandoffActions()
  useEffect(() => {
    if (!enabled || !h) return
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (mode === 'edit') {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); finish('edited', 'Approved with your edits', () => act.approve(h, draft)) }
        if (e.key === 'Escape') { e.preventDefault(); setMode('idle') }
        return
      }
      const t = e.target instanceof Element ? e.target : null
      if (t?.closest('input, textarea, [role="dialog"], [role="menu"]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (mode !== 'idle' && e.key === 'Escape') { e.preventDefault(); setMode('idle'); return }
      if (mode === 'reject' && /^[1-4]$/.test(k)) { const r = REJECT_REASONS[+k - 1]; finish('rejected', `Rejected · ${r}`, () => act.reject(h, r)); return }
      if (mode === 'snooze' && /^[1-4]$/.test(k)) { const o = SNOOZE(act.now())[+k - 1]; if (o) finish('snoozed', `Snoozed until ${o.label}`, () => act.snooze(h, o.until, o.label)); return }
      if (h.options && /^[1-9]$/.test(k) && h.options[+k - 1]) { const o = h.options[+k - 1]; finish('decided', o.label, () => act.option(h, +k - 1)); return }
      if (!/^[atnersc]$/.test(k)) return
      e.preventDefault()
      switch (k) {
        case 'a':
          if (h.options) { const i = Math.max(0, h.options.findIndex(o => o.recommended)); finish('decided', h.options[i].label, () => act.option(h, i)) }
          else if (!h.field) finish('approved', h.kind === 'promotion' ? 'Allowed' : h.proposal ? 'Rule added' : h.cta ? h.cta.label : 'Approved', () => act.approve(h))
          break
        case 't': if (h.kind === 'promotion' && h.promote?.to === 'act') finish('approved', 'Trial for a week', () => act.trial(h)); break
        case 'n': if (h.kind === 'promotion') finish('rejected', 'Not yet', () => act.reject(h, 'Not yet')); break
        case 'e': if (editable(h)) startEdit(); break
        case 'r': setMode('reject'); break
        case 's': setMode('snooze'); break
        case 'c': if (h.kind !== 'news') finish('claire', 'Sent to Claire', () => act.claire(h)); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [h, enabled, mode, setMode, draft, startEdit, finish, act])
}
