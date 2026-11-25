import type { Network, PlaybookRule } from '../../app/types'
import { NETWORK_LABEL } from '../../data/agents'

export const LIMIT: Partial<Record<Network, number>> = { x: 280, instagram: 2200, tiktok: 2200, linkedin: 3000, facebook: 5000, youtube: 100 }
export const NEEDS_MEDIA: Network[] = ['instagram', 'tiktok', 'youtube']
export const EMOJI = /\p{Extended_Pictographic}/gu

export type Check = { ok: boolean; label: string }

/** The Composer's live Playbook check, for one network. Ideas run the same check on their drafts. */
export function checkPost({ text, network, media, brief, words, rules }: { text: string; network: Network; media?: string; brief?: string; words: string[]; rules: PlaybookRule[] }): Check[] {
  const name = NETWORK_LABEL[network]
  const active = rules.filter(r => !r.paused)
  const out: Check[] = []
  const hits = words.filter(w => text.toLowerCase().includes(w))
  out.push(hits.length ? { ok: false, label: `${name}: “${hits.join('”, “')}” is not allowed by the Playbook` } : { ok: true, label: `${name}: no banned words` })
  const limit = network === 'tiktok' && active.some(r => /tiktok captions under 100/i.test(r.text)) ? 100 : LIMIT[network] ?? 2000
  out.push(text.length > limit ? { ok: false, label: `${name}: ${text.length} characters, limit ${limit}` } : { ok: true, label: `${name}: ${text.length} of ${limit} characters` })
  const emojis = (text.match(EMOJI) ?? []).length
  if (emojis > 1) out.push({ ok: false, label: `${name}: ${emojis} emojis, the Playbook allows one` })
  if (network === 'linkedin' && emojis > 0 && active.some(r => /emoji/i.test(r.text) && /linkedin/i.test(r.text))) out.push({ ok: false, label: 'LinkedIn: no emojis (Playbook rule)' })
  if (NEEDS_MEDIA.includes(network) && !media) out.push(brief ? { ok: false, label: `${name}: waiting for the visual in the brief` } : { ok: false, label: `${name} needs a visual` })
  return out
}
