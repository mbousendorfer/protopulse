// Mention tags: Sam's list, each with an optional rule Echo applies to every mention she files.
import type { State } from '../../app/state'
import { actionOf, notify, pushHandoff, pushLog, uid } from '../../app/core'
import { MENTIONS, type Mention } from '../../data/listening'
import { allMentions } from './model'

export type TagRule = { kind: 'product' | 'press' | 'creator' | 'competitor' | 'word'; value?: string }
export type TagDef = { id: string; name: string; rule?: TagRule }

export const RULE_LABEL: Record<TagRule['kind'], string> = {
  product: 'mentions a product', press: 'source is News, Blog or Forum', creator: 'author reaches 5,000 people or more',
  competitor: 'names a competitor', word: 'contains a word',
}
export const ruleText = (r?: TagRule) => (!r ? 'No rule: you tag by hand' : r.kind === 'word' ? `contains “${r.value}”` : RULE_LABEL[r.kind])

export const TAG_DEFS: TagDef[] = [
  { id: 'tg-product', name: 'Product feedback', rule: { kind: 'product' } },
  { id: 'tg-creator', name: 'Creator', rule: { kind: 'creator' } },
  { id: 'tg-press', name: 'Press', rule: { kind: 'press' } },
  { id: 'tg-support', name: 'Support', rule: { kind: 'word', value: 'support, refund, exchange, delivery' } },
  { id: 'tg-comp', name: 'Competitor', rule: { kind: 'competitor' } },
]

export function matches(r: TagRule, m: Mention, rivals: string[]): boolean {
  const t = m.text.toLowerCase()
  switch (r.kind) {
    case 'product': return !!m.product
    case 'press': return m.network === 'Web'
    case 'creator': return m.author.startsWith('@') && m.reach >= 5000
    case 'competitor': return rivals.some(n => t.includes(n))
    case 'word': return (r.value ?? '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean).some(w => t.includes(w))
  }
}
const rivalsOf = (s: Pick<State, 'listening'>) => s.listening.watch.map(w => w.name.toLowerCase()).concat('norro')

/** The tags Echo's rules give a mention. */
export const autoTags = (s: Pick<State, 'listening'>, defs: TagDef[], m: Mention) => defs.filter(d => d.rule && matches(d.rule, m, rivalsOf(s))).map(d => d.name)

/** The seeded feed was filed before the demo: Echo already tagged it. */
export const seedTags = (s: Pick<State, 'listening'>): Record<string, string[]> =>
  Object.fromEntries(MENTIONS.map(m => [m.id, autoTags(s, TAG_DEFS, m)]).filter(([, t]) => t.length))

declare module '../../app/types' {
  interface LogEntry {
    /** Tags before Echo or Sam changed them, by mention (null: had none). Undo puts them back. */
    tagsBefore?: Record<string, string[] | null>
    /** A tag Sam deleted, restored by Undo. */
    tagDef?: TagDef
  }
}

const patchL = (s: State, p: Partial<State['listening']>): State => ({ ...s, listening: { ...s.listening, ...p } })

/** Add tags to mentions; returns the state and what the tags were before. */
function addTags(s: State, add: Record<string, string[]>) {
  const tags = { ...s.listening.tags }
  const before: Record<string, string[] | null> = {}
  for (const [id, ts] of Object.entries(add)) {
    const next = [...new Set([...(tags[id] ?? []), ...ts])]
    if (next.length === (tags[id] ?? []).length) continue
    before[id] = tags[id] ?? null
    tags[id] = next
  }
  return { s: patchL(s, { tags }), before }
}
const count = (add: Record<string, string[]>) => Object.values(add).reduce((n, t) => n + t.length, 0)

/**
 * New mentions get Echo's tags, by her level on “Tag and file mentions”: Act tags them (journal, Undo),
 * Draft waits for your OK on the Desk, Suggest only shows them as suggestions on Mentions.
 */
export function tagNew(s: State): State {
  const fresh = allMentions(s).filter(m => !s.listening.filed[m.id] && !MENTIONS.includes(m))
  if (!fresh.length) return s
  const filed = { ...s.listening.filed }
  const add: Record<string, string[]> = {}
  for (const m of fresh) {
    filed[m.id] = true
    const ts = autoTags(s, s.listening.tagDefs, m).filter(t => !(s.listening.tags[m.id] ?? []).includes(t))
    if (ts.length) add[m.id] = ts
  }
  let next = patchL(s, { filed })
  if (!count(add)) return next
  const level = actionOf(s, 'echo', 'echo-file')?.autonomy ?? 'act'
  if (level === 'act') {
    const r = addTags(next, add)
    return pushLog(r.s, { agent: 'echo', text: `Tagged ${Object.keys(add).length} new mentions: ${summary(add)}`, status: 'done', reason: 'Tag and file mentions, set to Act', link: '/listening/mentions', undoMinutes: 30, tagsBefore: r.before })
  }
  const pending = { ...next.listening.pendingTags }
  for (const [id, ts] of Object.entries(add)) pending[id] = [...new Set([...(pending[id] ?? []), ...ts])]
  next = patchL(next, { pendingTags: pending })
  if (level === 'suggest') return next
  const n = Object.keys(pending).length
  const card = next.handoffs.find(h => h.ref === TAG_BATCH)
  const fields = { title: `Tag ${n} new mention${n > 1 ? 's' : ''}?`, context: summary(pending), preview: { type: 'text' as const, label: 'Echo’s tags', body: Object.entries(pending).slice(0, 6).map(([id, ts]) => `${allMentions(s).find(m => m.id === id)?.author ?? id}: ${ts.join(', ')}`).join(' · ') } }
  return card ? { ...next, handoffs: next.handoffs.map(h => (h.id === card.id ? { ...h, ...fields } : h)) }
    : pushHandoff(next, { agent: 'echo', kind: 'approval', urgency: 'week', topic: 'Tags', action: 'echo-file', ref: TAG_BATCH, why: 'Tagging is set to Draft: Echo asks before filing.', confidence: 92, link: '/listening/mentions', ...fields })
}
export const TAG_BATCH = 'tag-batch'

function summary(add: Record<string, string[]>) {
  const by = new Map<string, number>()
  for (const ts of Object.values(add)) for (const t of ts) by.set(t, (by.get(t) ?? 0) + 1)
  return [...by].map(([t, n]) => `${n} ${t}`).join(', ')
}

/** Apply pending suggestions (all, or one mention's one tag). */
export function acceptPending(s: State, only?: { id: string; tag: string }, fromCard = false): State {
  const pending = { ...s.listening.pendingTags }
  const add = only ? { [only.id]: [only.tag] } : pending
  const r = addTags(s, add)
  if (only) pending[only.id] = (pending[only.id] ?? []).filter(t => t !== only.tag)
  const left = only ? Object.fromEntries(Object.entries(pending).filter(([, t]) => t.length)) : {}
  let next = patchL(r.s, { pendingTags: left })
  if (!Object.keys(left).length) next = { ...next, handoffs: next.handoffs.filter(h => h.ref !== TAG_BATCH) }
  // From the Desk card, the core's journal line is the Undo: keep what to take back.
  if (fromCard) return patchL(next, { lastBatch: { before: r.before, pending: s.listening.pendingTags } })
  return only ? next : pushLog(next, { agent: 'echo', text: `Filed ${Object.keys(add).length} mentions with Echo’s tags`, status: 'approved', reason: 'You approved Echo’s tags', undoMinutes: 30, tagsBefore: r.before })
}

/** Save a tag (new or edited). A rule applies at once to every mention, with Undo; a rename follows on every mention. */
export function saveTag(s: State, def: TagDef): State {
  const old = s.listening.tagDefs.find(d => d.id === def.id)
  const fresh: TagDef = old ? def : { ...def, id: uid('tg') }
  let tags = s.listening.tags
  if (old && old.name !== def.name) tags = Object.fromEntries(Object.entries(tags).map(([id, ts]) => [id, ts.map(t => (t === old.name ? def.name : t))]))
  const defs = old ? s.listening.tagDefs.map(d => (d.id === def.id ? fresh : d)) : [...s.listening.tagDefs, fresh]
  const next = patchL(s, { tagDefs: defs, tags })
  if (!fresh.rule || JSON.stringify(old?.rule) === JSON.stringify(fresh.rule)) return next
  const add: Record<string, string[]> = {}
  for (const m of allMentions(next)) if (matches(fresh.rule, m, rivalsOf(next))) add[m.id] = [fresh.name]
  const r = addTags(next, add)
  const n = Object.keys(r.before).length
  return pushLog(r.s, { agent: 'echo', text: `Tagged ${n} mention${n === 1 ? '' : 's'} “${fresh.name}” (${ruleText(fresh.rule)})`, status: 'done', reason: 'You set a tag rule', link: '/listening/mentions', undoMinutes: 30, tagsBefore: r.before })
}

/** Delete a tag and take it off every mention. Undo brings both back. */
export function deleteTag(s: State, id: string): State {
  const def = s.listening.tagDefs.find(d => d.id === id)
  if (!def) return s
  const before: Record<string, string[] | null> = {}
  const tags = { ...s.listening.tags }
  for (const [mid, ts] of Object.entries(tags)) if (ts.includes(def.name)) { before[mid] = ts; tags[mid] = ts.filter(t => t !== def.name) }
  const next = patchL(s, { tagDefs: s.listening.tagDefs.filter(d => d.id !== id), tags })
  const logged = pushLog(next, { agent: 'echo', text: `Deleted the tag “${def.name}” from ${Object.keys(before).length} mentions`, status: 'done', reason: 'You changed the tags', link: '/listening/mentions', undoMinutes: 30, tagsBefore: before, tagDef: def })
  return notify(logged, 'listening', `Deleted “${def.name}” from ${Object.keys(before).length} mentions.`, { undo: logged.log[0].id })
}

/** Undo of any tag change: tags back as they were, a deleted tag back in the list. */
export function undoTags(s: State, before?: Record<string, string[] | null>, def?: TagDef): State {
  if (!before && !def) return s
  const tags = { ...s.listening.tags }
  for (const [id, ts] of Object.entries(before ?? {})) { if (ts) tags[id] = ts; else delete tags[id] }
  const tagDefs = def && !s.listening.tagDefs.some(d => d.id === def.id) ? [...s.listening.tagDefs, def] : s.listening.tagDefs
  return patchL(s, { tags, tagDefs })
}
