// Juno · Video: everything Juno plugs into the core (see src/app/agents-registry.ts).
import type { State } from '../../app/state'
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { Mark } from '../../ui'
import { ClipPreview } from './parts'
import { backToTrialHook, onResolveVideo, reduceVideo, removeRecuts, stopTrials, tickVideo, undoDeskClips, undoVideoWork, unsendClips, validUrl, videoDue, videoEvent, videoNeeds } from './slice'
import type { Lang } from './model'
import { SCRIPT } from './script'
import { clipBest, clipFind, clipRecut, clipTrial, clipVersion, clipWhy } from './intents'

declare module '../../app/types' {
  interface PreviewTypes { clip: { clip: string } }
  interface LogEntry {
    /** Clips sent to Atlas: Undo takes their posts back out and returns them to Video. */
    clips?: string[]
    /** Caption fixes Juno made alone (clip id → word indexes): Undo takes them off. */
    captionFixes?: Record<string, number[]>
    /** Language versions Juno made alone (clip id → languages): Undo takes them off. */
    dubs?: Record<string, Lang[]>
    /** Hook trials Juno started alone: Undo stops them. */
    trials?: string[]
    /** Clips whose winning hook Juno put on alone: Undo puts their first hook back. */
    trialHooks?: string[]
    /** Recuts Juno made alone: Undo takes them (and their posts) out. */
    recuts?: string[]
  }
  interface Handoff {
    /** A captions card: the fixes approving it makes (clip id → word indexes). */
    fixes?: Record<string, number[]>
  }
}
declare module '../../data/command' {
  interface IntentTypes { clip: { url?: string } }
}

const clip = defineIntent({
  kind: 'clip', owner: 'juno', order: 40,
  parse: (t, { raw }) => {
    const url = raw.match(/https?:\/\/\S+/)?.[0]
    return url || /\bclips?\b|latest video|\bshorts? from\b/.test(t) ? { kind: 'clip', url } : undefined
  },
  bar: (i, { s, d, go }) => {
    if (i.url) {
      const u = validUrl(i.url)
      if (!u) return { text: 'That link doesn’t look right. Paste the full address, starting with https://.', ctas: [{ label: 'Open Video', run: () => go('/video/sources') }] }
      return { text: `Juno is opening the video from ${u.hostname.replace(/^www\./, '')}. This prototype can’t open links, so she uses a sample video: its clips land in Video in about 40 seconds, and nothing goes out until you send them to Atlas.`, after: () => d({ type: 'video/addLink', url: i.url! }), ctas: [{ label: 'Follow it in Video', primary: true, run: () => go('/video') }] }
    }
    const gr20 = s.video.sources.find(x => x.id === 'gr20')
    const ready = s.video.clips.filter(c => c.status === 'ready')
    if (!gr20) return { text: 'The latest video on your channel is “Storm Jacket: 3 days of GR20 rain”, published at 08:00. Juno is cutting it now: transcript, best moments, framing and captions.', after: () => d({ type: 'core/fire', eventId: 'ev-video-gr20' }), ctas: [{ label: 'Follow it in Video', primary: true, run: () => go('/video') }] }
    return {
      text: `Juno already cut the latest video, “${gr20.title}”. ${ready.length} clip${ready.length === 1 ? ' is' : 's are'} ready to review.`,
      visual: ready.length ? <ul className="cmdk-list-mini">{ready.slice(0, 5).map(c => <li key={c.id}><Mark agent="juno" /><span className="ellipsis">{c.title}</span></li>)}</ul> : undefined,
      ctas: [{ label: 'Review the clips', primary: true, run: () => go('/video') }],
    }
  },
  chat: (i, { s }) => {
    if (i.url && validUrl(i.url)) return { replies: [{ from: 'juno', text: 'On it. This prototype can’t open links, so I’ll use a sample video: transcript, best moments, captions. They’ll be in Video in about 40 seconds.', card: { type: 'done', text: 'Video added to Juno’s queue' } }], effects: [(st: State) => reduceVideo(st, { type: 'video/addLink', url: i.url! })] }
    if (i.url) return { replies: [{ from: 'juno', text: 'That link doesn’t look right. Paste the full address, starting with https://.' }], effects: [] }
    const ready = s.video.clips.filter(c => c.status === 'ready')
    if (!s.video.sources.some(x => x.id === 'gr20')) return { replies: [{ from: 'juno', text: 'Your latest upload is “Storm Jacket: 3 days of GR20 rain”. I’m cutting it now and will tell you when the clips are ready.', card: { type: 'done', text: 'Juno is clipping the latest video' } }], effects: [(st: State) => videoEvent(st, 'gr20', true)] }
    return { replies: [{ from: 'juno', text: `I already cut the latest video. ${ready.length} clip${ready.length === 1 ? ' is' : 's are'} waiting for you:`, card: { type: 'list', items: ready.slice(0, 5).map(c => ({ title: c.title, agent: 'juno' as const, meta: `“${c.hook}”`, link: `/video/clips/${c.id}` })) } }], effects: [] }
  },
})

const juno: AgentModule = {
  id: 'juno',
  script: SCRIPT,
  // The rail badge and Agents › Team count the Clips decisions block.
  needs: s => videoNeeds(s).count,
  onResolve: onResolveVideo,
  // Undoing a Desk decision on a clips card, or clips Juno sent alone, takes back what was sent.
  onUndo: (s, l) => {
    let next = s
    for (const h of l.restore ?? []) next = undoDeskClips(next, h)
    next = undoVideoWork(next, l.captionFixes, l.dubs)
    if (l.trials) next = stopTrials(next, l.trials)
    if (l.trialHooks) next = backToTrialHook(next, l.trialHooks)
    if (l.recuts) next = removeRecuts(next, l.recuts)
    return l.clips ? unsendClips(next, l.clips) : next
  },
  // Videos being processed move on; snoozed clips come back.
  due: videoDue,
  tick: tickVideo,
  intents: [clipWhy, clipBest, clipVersion, clipFind, clipTrial, clipRecut, clip],
  previews: { clip: p => <ClipPreview id={p.clip} /> },
  testerStats: ev => [
    ['Clips opened', ev.filter(e => e.kind === 'video/open').length],
    ['Clip edits', ev.filter(e => e.kind === 'video/edit').length],
    ['Asked Juno', ev.filter(e => e.kind === 'video/ask').length],
    ['Clips sent as is', ev.filter(e => e.kind === 'video/decision' && e.detail?.outcome === 'as-is').length],
    ['Clips sent modified', ev.filter(e => e.kind === 'video/decision' && e.detail?.outcome === 'modified').length],
    ['Clips dismissed', ev.filter(e => e.kind === 'video/decision' && e.detail?.outcome === 'dismissed').length],
    ['Dubs approved', ev.filter(e => e.kind === 'video/dub-approved').length],
    ['Hook trials started', ev.filter(e => e.kind === 'video/trial').length],
    ['Recuts asked', ev.filter(e => e.kind === 'video/recut').length],
  ],
  // Moderator › Hard to see: what a tester rarely stumbles on (⇧D).
  // New upload: processing, then clips with a held one (Hugo, no release), captions fixed, dubs to review by level.
  triggers: [
    { event: 'ev-video-gr20', to: '/video', label: 'New upload: watch it being cut, one clip held for a missing release' },
    { event: 'ev-video-captions', to: '/video' },
    { event: 'ev-video-more', to: '/video?source=repair', label: '4 more moments: “Send all” hits the 5-a-week quota' },
    { event: 'ev-video-recut', to: '/video', label: 'A published clip did worse than usual: Juno recuts it, product first' },
    { event: 'ev-video-trial', to: '/', label: 'Hook trial results: the winner, then a Playbook rule after 3 wins' },
  ],
}
export default juno
