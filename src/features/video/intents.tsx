// Juno in ⌘K and Chat: find moments, say why a clip is held, rank what did best, add a network. Numbers come from state.
import type { Network } from '../../app/types'
import type { State } from '../../app/state'
import { DAY } from '../../app/time'
import { now } from '../../app/core'
import { defineIntent } from '../../app/agent-module'
import { NETWORK_LABEL } from '../../data/agents'
import { PEOPLE, TRANSCRIPT } from '../../data/video'
import { Mark } from '../../ui'
import { clipLengthOf, fitsLength, keywords, lengthSpec, versionFor as netVersion, trialPair, winnerOf, type Clip } from './model'
import { canTrial, flopOf, holdReason, reduceVideo, recutOf, unreleased } from './slice'

declare module '../../data/command' {
  interface IntentTypes {
    clipFind: { query: string; count: number }
    clipWhy: { q: string }
    clipBest: object
    clipVersion: { network: Network; q: string }
    clipTrial: { q: string; start: boolean }
    clipRecut: { q: string }
  }
}

const open = (c: Clip) => c.status === 'ready' || c.status === 'snoozed'
const k = (n: number) => `${(n / 1000).toFixed(1)}k`

/** The clip a sentence talks about: most title and hook words in common. */
const ASKING = new Set(['why', 'not', 'going', 'out', 'held', 'stuck', 'sent', 'isn', 'won', 'still', 'here', 'did', 'best', 'version', 'make', 'add', 'create', 'post', 'put', 'video', 'short', 'reel', 'one', 'please', 'juno', 'trial', 'test', 'hook', 'hooks', 'which', 'the', 'its', 'first', 'before', 'sending', 'clip'])
export function matchClip(s: State, q: string, pool = s.video.clips.filter(c => c.status !== 'dismissed')): Clip | undefined {
  const keys = keywords(q).filter(w => !ASKING.has(w))
  const scored = pool.map(c => ({ c, n: keys.filter(w => `${c.title} ${c.hook}`.toLowerCase().includes(w)).length })).filter(x => x.n > 0)
  return scored.sort((a, b) => b.n - a.n)[0]?.c
}

/** Published in the last 7 days, most viewed first: the same numbers as the Published group in Video. */
export const bestClips = (s: State) =>
  s.video.clips.filter(c => c.status === 'published' && c.stats && (c.sentAt ?? 0) > now(s) - 7 * DAY).sort((a, b) => b.stats!.views - a.stats!.views)

const latestSource = (s: State) => [...s.video.sources].filter(x => x.status === 'ready').sort((a, b) => b.at - a.at)[0]

const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 }
const NETS: [RegExp, Network][] = [[/linkedin/, 'linkedin'], [/tiktok/, 'tiktok'], [/instagram|reels?/, 'instagram'], [/youtube|shorts?/, 'youtube'], [/facebook/, 'facebook']]

/** What adding a network to a clip does: the edit, or why not. */
function versionFor(s: State, c: Clip, n: Network): { patch?: Partial<Clip>; text: string } {
  const src = s.video.sources.find(x => x.id === c.source)
  const dur = src ? clipLengthOf(c, TRANSCRIPT[src.transcript]) : 0
  const name = NETWORK_LABEL[n]
  if (c.post.networks.includes(n)) return { text: `“${c.title}” already has a ${name} version.` }
  if (!open(c)) return { text: `“${c.title}” already went to Atlas, so I can’t change where it goes. Undo the send first.` }
  if (!fitsLength(n, dur)) return { text: `“${c.title}” runs ${Math.round(dur)} s, outside ${name}’s ${lengthSpec(n).min}–${lengthSpec(n).max} s. Shorten it in the editor first.` }
  const text = c.post.text[c.post.networks[0]] ?? c.hook
  const v = netVersion(c, n)
  return { patch: { post: { networks: [...c.post.networks, n], text: { ...c.post.text, [n]: text } }, ...(c.versions ? { versions: { ...c.versions, [n]: v } } : {}) }, text: `Added a ${name} version of “${c.title}”: ${c.versions ? `${v.aspect}, captions above the app’s buttons, ` : ''}${Math.round(dur)} s fits, and it starts from the ${NETWORK_LABEL[c.post.networks[0]]} caption. You can change it in the editor, or undo with ⌘Z there.` }
}

export const clipWhy = defineIntent({
  kind: 'clipWhy', owner: 'juno', order: 31,
  parse: t => /\bwhy\b/.test(t) && /(not (going|gone|being sent)|isn['’]?t going|held|stuck|not sent|won['’]?t go|still here)/.test(t) && /clip|video|short|reel|rain|strap|zip|bottle|bag|jacket|stitch|repair|hood/.test(t) ? { kind: 'clipWhy', q: t } : undefined,
  bar: (i, { s, d, go }) => {
    const held = s.video.clips.filter(c => open(c) && holdReason(s, c))
    const c = matchClip(s, i.q) ?? held[0]
    if (!c) return { text: 'Nothing is held right now. Every clip waiting in Video can go to Atlas.', ctas: [{ label: 'Open Video', run: () => go('/video') }] }
    const why = open(c) ? holdReason(s, c) : undefined
    if (!why) return { text: open(c) ? `Nothing holds “${c.title}”: it’s ready to review, and goes out when you send it to Atlas.` : `“${c.title}” already went to Atlas.`, ctas: [{ label: 'Open the clip', primary: true, run: () => go(`/video/clips/${c.id}`) }] }
    const who = unreleased(s, c)
    return {
      text: `“${c.title}” is held: ${why}.`,
      ctas: [{ label: 'Open the clip', primary: true, run: () => go(`/video/clips/${c.id}`) }, ...who.map(p => ({ label: `${PEOPLE[p].name}’s release is signed`, run: () => d({ type: 'video/release', person: p, signed: true }) }))],
    }
  },
  chat: (i, { s }) => {
    const held = s.video.clips.filter(c => open(c) && holdReason(s, c))
    const c = matchClip(s, i.q) ?? held[0]
    const why = c && open(c) ? holdReason(s, c) : undefined
    if (!c || !why) return { replies: [{ from: 'juno', text: c ? `Nothing holds “${c.title}”. It goes out when you send it to Atlas.` : 'Nothing is held right now.' }], effects: [] }
    return { replies: [{ from: 'juno', text: `“${c.title}” is held: ${why}.`, card: { type: 'list', items: [{ title: c.title, agent: 'juno', meta: why, link: `/video/clips/${c.id}` }] } }], effects: [] }
  },
})

export const clipBest = defineIntent({
  kind: 'clipBest', owner: 'juno', order: 32,
  parse: t => /\b(clips?|shorts?|reels?)\b/.test(t) && /(did best|best clip|top clip|performed|most views|did well|worked best)/.test(t) ? { kind: 'clipBest' } : undefined,
  bar: (_i, { s, go }) => {
    const best = bestClips(s)
    if (!best.length) return { text: 'No clip went out in the last 7 days, so there’s nothing to compare yet.', ctas: [{ label: 'Open Video', run: () => go('/video') }] }
    const top = best[0]
    return {
      text: `“${top.title}” did best: ${k(top.stats!.views)} views and ${top.stats!.er}% engagement.${best.length > 1 ? ` ${best.length} clips went out in the last 7 days.` : ''}`,
      visual: <ol className="cmdk-list-mini">{best.slice(0, 5).map(c => <li key={c.id}><Mark agent="juno" /><span className="ellipsis">{c.title}</span><span className="num muted">{k(c.stats!.views)} views · {c.stats!.er}%</span></li>)}</ol>,
      ctas: [{ label: 'Open the clip', primary: true, run: () => go(`/video/clips/${top.id}`) }],
    }
  },
  chat: (_i, { s }) => {
    const best = bestClips(s)
    if (!best.length) return { replies: [{ from: 'juno', text: 'No clip went out in the last 7 days yet.' }], effects: [] }
    return { replies: [{ from: 'juno', text: `“${best[0].title}” did best this week:`, card: { type: 'list', items: best.slice(0, 5).map(c => ({ title: c.title, agent: 'juno' as const, meta: `${k(c.stats!.views)} views · ${c.stats!.er}% engagement`, link: `/video/clips/${c.id}` })) } }], effects: [] }
  },
})

export const clipVersion = defineIntent({
  kind: 'clipVersion', owner: 'juno', order: 33,
  parse: t => {
    if (!/\bversion\b|\bpost (it|this) on\b|\bput (it|this) on\b/.test(t)) return
    const n = NETS.find(([re]) => re.test(t))?.[1]
    return n && /(make|add|create|do|want|need|post|put|give)/.test(t) ? { kind: 'clipVersion', network: n, q: t.replace(/linkedin|tiktok|instagram|youtube|facebook|version/g, '') } : undefined
  },
  bar: (i, { s, d, go }) => {
    const c = matchClip(s, i.q, s.video.clips.filter(open)) ?? s.video.clips.filter(open)[0]
    if (!c) return { text: 'No clip is waiting for review. Version a clip before it goes to Atlas.', ctas: [{ label: 'Open Video', run: () => go('/video') }] }
    const v = versionFor(s, c, i.network)
    return { text: v.text, after: v.patch ? () => d({ type: 'video/edit', id: c.id, patch: v.patch! }) : undefined, ctas: [{ label: 'Open the clip', primary: true, run: () => go(`/video/clips/${c.id}`) }] }
  },
  chat: (i, { s }) => {
    const c = matchClip(s, i.q, s.video.clips.filter(open)) ?? s.video.clips.filter(open)[0]
    if (!c) return { replies: [{ from: 'juno', text: 'No clip is waiting for review right now.' }], effects: [] }
    const v = versionFor(s, c, i.network)
    return { replies: [{ from: 'juno', text: v.text, card: v.patch ? { type: 'done', text: `${NETWORK_LABEL[i.network]} added to “${c.title}”` } : undefined }], effects: v.patch ? [(st: State) => reduceVideo(st, { type: 'video/edit', id: c.id, patch: v.patch! })] : [] }
  },
})

export const clipFind = defineIntent({
  kind: 'clipFind', owner: 'juno', order: 34,
  parse: t => {
    const m = t.match(/\b(?:clip|cut|find|make)\b.*?\b(?:moments?|clips?|bits?)\b.*?\babout\s+(.+)/)
    if (!m) return
    const n = t.match(/\b(\d|one|two|three|four|five)\b/)?.[1]
    return { kind: 'clipFind', query: m[1].replace(/^(the|our|my)\s+/, ''), count: Math.min(5, n ? NUM[n] ?? +n : 3) }
  },
  bar: (i, { s, d, go }) => {
    const src = latestSource(s)
    if (!src) return { text: 'There’s no video ready to search yet. Add one in Video.', ctas: [{ label: 'Add a video', run: () => go('/video/sources') }] }
    return {
      text: `Juno is reading “${src.title}” for moments about “${i.query}”. Up to ${i.count} clip${i.count > 1 ? 's' : ''} land in Ready to review, each with where it’s said and why.`,
      after: () => d({ type: 'video/find', source: src.id, query: i.query, len: 45, count: i.count }),
      ctas: [{ label: 'Review the clips', primary: true, run: () => go(`/video?source=${src.id}`) }],
    }
  },
  chat: (i, { s }) => {
    const src = latestSource(s)
    if (!src) return { replies: [{ from: 'juno', text: 'There’s no video ready to search yet.' }], effects: [] }
    return {
      replies: [{ from: 'juno', text: `Reading “${src.title}” for moments about “${i.query}”. They’ll be in Ready to review.`, card: { type: 'done', text: `Juno is finding ${i.count} moment${i.count > 1 ? 's' : ''} about “${i.query}”` } }],
      effects: [(st: State) => reduceVideo(st, { type: 'video/find', source: src.id, query: i.query, len: 45, count: i.count })],
    }
  },
})

/** A hook trial, asked for or asked about: the result if there is one, the trial running, or Juno starts one (or says why not). */
function trialAnswer(s: State, i: { q: string; start: boolean }): { text: string; clip?: Clip; start?: boolean } {
  const c = matchClip(s, i.q) ?? (i.start ? s.video.clips.find(x => canTrial(s, x) === true) : s.video.clips.filter(x => x.trial).sort((a, b) => b.trial!.from - a.trial!.from)[0])
  if (!c) {
    const last = s.video.trials[s.video.trials.length - 1]
    if (!last) return { text: 'No hook trial yet. Open a clip and trial its hooks from the Post tab.' }
    const w = winnerOf(last)
    return { text: `Last trial, on “${last.title}”: “${last.hooks[w]}” held ${last.held[w]}% of viewers at 3 s, against ${last.held[1 - w]}%.` }
  }
  if (c.status === 'trial') return { clip: c, text: `“${c.title}” is on trial on Reels: “${c.trial!.hooks[0]}” against “${c.trial!.hooks[1]}”. Results at ${new Date(c.trial!.until).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.` }
  if (c.trial?.held) {
    const w = winnerOf({ hooks: c.trial.hooks, held: c.trial.held })
    return { clip: c, text: `On “${c.title}”, “${c.trial.hooks[w]}” won: ${c.trial.held[w]}% still watching at 3 s, against ${c.trial.held[1 - w]}%.${c.hook === c.trial.hooks[w] ? ' The clip uses it.' : ' The clip still has the other hook.'}` }
  }
  const ok = canTrial(s, c)
  if (!i.start) return { clip: c, text: `“${c.title}” hasn’t been trialled.${ok === true ? ` Juno would put “${trialPair(c)![0]}” against “${trialPair(c)![1]}”.` : ''}` }
  if (ok !== true) return { clip: c, text: `Juno can’t trial “${c.title}”: ${ok.charAt(0).toLowerCase()}${ok.slice(1)}.` }
  const [a, b] = trialPair(c)!
  return { clip: c, start: true, text: `Juno trials “${a}” against “${b}” on Reels, with non-followers first. Results in 24 hours; nothing reaches your followers before.` }
}

export const clipTrial = defineIntent({
  kind: 'clipTrial', owner: 'juno', order: 35,
  parse: t => /\bhooks?\b/.test(t) && /\b(trial|test|a\/b|won|win|better|best)\b/.test(t) ? { kind: 'clipTrial', q: t, start: /\b(trial|test|a\/b)\b/.test(t) && !/\b(won|win|result)/.test(t) } : undefined,
  bar: (i, { s, d, go }) => {
    const r = trialAnswer(s, i)
    return { text: r.text, after: r.start ? () => d({ type: 'video/trial', id: r.clip!.id }) : undefined, ctas: [{ label: r.clip ? 'Open the clip' : 'Open Video', primary: true, run: () => go(r.clip ? `/video/clips/${r.clip.id}` : '/video') }] }
  },
  chat: (i, { s }) => {
    const r = trialAnswer(s, i)
    return { replies: [{ from: 'juno', text: r.text, card: r.start ? { type: 'done', text: `Hook trial started on “${r.clip!.title}”` } : undefined }], effects: r.start ? [(st: State) => reduceVideo(st, { type: 'video/trial', id: r.clip!.id })] : [] }
  },
})

/** A recut asked for: Juno makes it when the clip did worse than usual, or says how it did. */
function recutAnswer(s: State, q: string): { text: string; clip?: Clip; make?: boolean } {
  const out = s.video.clips.filter(c => c.status === 'published' && c.stats && !c.recutOf)
  const c = matchClip(s, q, out) ?? out.find(x => flopOf(s, x))
  if (!c) return { text: 'None of your published clips did worse than usual. Juno recuts the ones that get under half your average views.' }
  const done = recutOf(s, c)
  if (done) return { clip: done, text: `“${c.title}” already has a new cut, ${done.status === 'ready' ? 'waiting for your review' : 'sent to Atlas'}.` }
  const f = flopOf(s, c)
  if (!f) return { clip: c, text: `“${c.title}” did fine: ${k(c.stats!.views)} views. Juno recuts clips under half your average.` }
  return { clip: c, make: true, text: `“${c.title}” got ${k(c.stats!.views)} views, ${Math.round(f.share * 100)}% of your average. Juno made a new cut with the product on screen from the first second. It’s in Ready to review.` }
}

export const clipRecut = defineIntent({
  kind: 'clipRecut', owner: 'juno', order: 36,
  parse: t => /\bre-?cut\b/.test(t) ? { kind: 'clipRecut', q: t.replace(/re-?cut/g, '') } : undefined,
  bar: (i, { s, d, go }) => {
    const r = recutAnswer(s, i.q)
    const to = r.make ? `/video/clips/${r.clip!.id}-recut` : r.clip ? `/video/clips/${r.clip.id}` : '/video'
    return { text: r.text, after: r.make ? () => d({ type: 'video/recut', id: r.clip!.id }) : undefined, ctas: [{ label: r.clip ? 'Open the clip' : 'Open Video', primary: true, run: () => go(to) }] }
  },
  chat: (i, { s }) => {
    const r = recutAnswer(s, i.q)
    return { replies: [{ from: 'juno', text: r.text, card: r.make ? { type: 'done', text: `New cut of “${r.clip!.title}”` } : undefined }], effects: r.make ? [(st: State) => reduceVideo(st, { type: 'video/recut', id: r.clip!.id })] : [] }
  },
})
