// Composer copilot: three rewrites of the caption you wrote, shaped by its pillar and checked against the Playbook.
import type { Network, PlaybookRule } from '../../app/types'
import type { Pillar } from '../../data/publishing'
import { shorten } from './ideasModel'

const HOOK: Record<Pillar, string> = {
  'Gear that lasts': 'Would you still trust it in five years?',
  'Trail stories': 'Where would you take it first?',
  'Repair & care': 'Repair or replace?',
  Community: 'What’s your story with it?',
}
const EMOJI = /\p{Extended_Pictographic}/gu
const clean = (t: string) => t.replace(/\s+/g, ' ').replace(/\s([.,!?])/g, '$1').trim()

type Ctx = { pillar: Pillar; network: Network; words: string[]; rules: PlaybookRule[] }
export type Variant = { label: string; text: string; applied: string[] }

/** Applies the Playbook to a variant: banned words out, one emoji max, short TikTok captions. Says what it changed. */
function playbook(text: string, { network, words, rules }: Ctx): { text: string; applied: string[] } {
  const on = (re: RegExp) => rules.find(r => !r.paused && re.test(r.text))
  const applied: string[] = []
  let t = text
  const hit = words.filter(w => t.toLowerCase().includes(w))
  if (hit.length) { for (const w of hit) t = t.replace(new RegExp(`\\s*\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ''); applied.push(`Banned word removed: ${hit.join(', ')}`) }
  const emoji = on(/one emoji/i)
  if (emoji && (t.match(EMOJI)?.length ?? 0) > 1) { let n = 0; t = t.replace(EMOJI, e => (n++ ? '' : e)); applied.push(emoji.text) }
  const tiktok = on(/tiktok captions under (\d+)/i)
  const max = tiktok ? +tiktok.text.match(/under (\d+)/i)![1] : 0
  if (network === 'tiktok' && max && t.length > max) { t = shorten(t).slice(0, max); applied.push(tiktok!.text) }
  return { text: clean(t), applied }
}

/** Three variants built from your text: a question hook for its pillar, a number or a fact first, a short cut. Duplicates are dropped. */
export function variantsOf(text: string, ctx: Ctx): Variant[] {
  const t = clean(text)
  if (!t) return []
  const sentences = t.split(/(?<=[.!?])\s/)
  // The sentence that holds a figure, cut so it starts with it: "1,200 bags fixed this year."
  const withNum = sentences.find(x => /\d/.test(x) && !/^\d/.test(x))
  const fromNum = withNum && withNum.slice(withNum.search(/\d/))
  const others = sentences.filter(x => x !== withNum).join(' ')
  const rest = sentences.length > 1 ? sentences.slice(1).join(' ') : ''
  const raw: { label: string; text: string }[] = [
    { label: `Question hook · ${ctx.pillar}`, text: `${HOOK[ctx.pillar]} ${t}` },
    fromNum ? { label: 'Number first', text: `${fromNum} ${others}` }
      : { label: 'Fact first', text: rest ? `${rest} ${sentences[0]}` : `${sentences[0].replace(/[.!?]$/, '')}. Here’s why.` },
    { label: 'Shorter', text: shorten(t) },
  ]
  const seen = new Set([t.toLowerCase()])
  return raw.flatMap(v => {
    const p = playbook(v.text, ctx)
    if (seen.has(p.text.toLowerCase())) return []
    seen.add(p.text.toLowerCase())
    return [{ label: v.label, text: p.text, applied: p.applied }]
  })
}
