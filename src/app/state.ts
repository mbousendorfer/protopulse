import type { Agent, DoneItem, Handoff, LogEntry, TesterEvent, Notice } from './types'
import { startClock, type Clock, DEMO_START, MIN } from './time'
import { AGENTS } from '../data/agents'
import { HANDOFFS } from '../data/desk'
import { LOG } from '../data/activity'
import { initialInbox, type InboxState } from '../features/inbox/slice'
import { initialPublishing, type PublishingState } from '../features/publishing/slice'
import { initialInsights, type InsightsState } from '../features/insights/slice'
import { initialListening, type ListeningState } from '../features/listening/slice'
import { initialStrategy, type StrategyState } from '../features/strategy/slice'
import { initialPlaybook, type PlaybookState } from '../features/playbook/slice'
import { initialChats, type ChatsState } from '../features/chats/slice'
import { initialVideo, type VideoState } from '../features/video/slice'

export type Engine = { live: boolean; cadence: number; nextAt: number; cursor: number }

export type State = {
  v: number
  clock: Clock
  agents: Agent[]
  handoffs: Handoff[]
  log: LogEntry[]
  notice?: Notice
  engine: Engine
  brief: { read: boolean; since: number }
  desk: { done: DoneItem[] }
  tester: TesterEvent[]
  onboarded: boolean
  inbox: InboxState
  publishing: PublishingState
  insights: InsightsState
  listening: ListeningState
  strategy: StrategyState
  playbook: PlaybookState
  chats: ChatsState
  video: VideoState
}

export const STATE_VERSION = 2

export type Preset = 'calm' | 'busy' | 'competitor' | 'trust'

export function initialState(): State {
  const clock = startClock()
  return {
    v: STATE_VERSION,
    clock,
    agents: structuredClone(AGENTS),
    handoffs: structuredClone(HANDOFFS),
    log: structuredClone(LOG),
    engine: { live: true, cadence: 30, nextAt: DEMO_START + MIN / 2, cursor: 0 },
    brief: { read: false, since: DEMO_START - 13 * 60 * MIN - 32 * MIN },
    desk: { done: [] },
    tester: [],
    onboarded: true,
    inbox: initialInbox(),
    publishing: initialPublishing(),
    insights: initialInsights(),
    listening: initialListening(),
    strategy: initialStrategy(),
    playbook: initialPlaybook(),
    chats: initialChats(),
    video: initialVideo(),
  }
}
