// Sage · Strategy: everything Sage plugs into the core (see src/app/agents-registry.ts).
import { defineIntent, type AgentModule } from '../../app/agent-module'
import { campaignsDue, closeCampaigns, onResolveStrategy, onUndoStrategy } from './slice'
import { SCRIPT } from './script'

declare module '../../data/command' {
  interface IntentTypes { campaign: { brief: string } }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const campaign = defineIntent({
  kind: 'campaign', owner: 'sage', order: 50,
  parse: (t, { raw }) => (/^brief\b|campaign|launch/.test(t) ? { kind: 'campaign', brief: raw.replace(/^\s*(sage[,:]?\s*)?(brief:?\s*)?/i, '').trim() } : undefined),
  bar: (i, { go }) => ({
    text: `Got the brief. I’m opening Strategy to turn “${i.brief}” into a campaign plan: goal, phases, posts and who does what.`,
    after: () => setTimeout(() => go(`/strategy/new?brief=${encodeURIComponent(i.brief)}&auto=1`), 600),
  }),
  chat: i => ({ replies: [{ from: 'sage', text: 'I can turn that into a full campaign plan: goal, phases, posts and who does what. It takes me about a minute.', card: { type: 'brief', text: cap(i.brief), status: 'proposed' } }], effects: [] }),
})

const sage: AgentModule = {
  id: 'sage',
  script: SCRIPT,
  onResolve: onResolveStrategy,
  onUndo: onUndoStrategy,
  due: campaignsDue,
  tick: closeCampaigns,
  intents: [campaign],
}
export default sage
