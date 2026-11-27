import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import * as Tooltip from '@radix-ui/react-tooltip'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './styles/tokens.css'
import './styles/base.css'
import { StoreProvider } from './app/store'
import Shell from './app/Shell'
import Desk from './features/desk/Desk'
import Focus from './features/desk/Focus'
import { AgentsLayout, Team, AgentProfile } from './features/agents/Agents'
import SharedRules from './features/agents/SharedRules'
import Escalation from './features/agents/Escalation'
import { playbookTarget } from './features/agents/rules'
import Activity from './features/activity/Activity'
import InboxPage from './features/inbox/Page'
import PublishingPage from './features/publishing/Page'
import InsightsPage from './features/insights/Page'
import ListeningPage from './features/listening/Page'
import StrategyPage from './features/strategy/Page'
import VideoPage from './features/video/Page'
import SettingsPage from './features/settings/Page'
import OnboardingPage from './features/onboarding/Page'
import ChatsPage from './features/chats/Page'

/** The Playbook moved under Agents: old links still land in the right place. */
function PlaybookRedirect() {
  return <Navigate to={playbookTarget(useLocation().search)} replace />
}

/** Activity is a tab of Agents now: old links keep their filters. */
function ActivityRedirect() {
  return <Navigate to={`/agents/activity${useLocation().search}`} replace />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <Tooltip.Provider>
        <HashRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Desk />} />
              <Route path="focus" element={<Focus />} />
              <Route path="inbox/*" element={<InboxPage />} />
              <Route path="publishing/*" element={<PublishingPage />} />
              <Route path="insights/*" element={<InsightsPage />} />
              <Route path="listening/*" element={<ListeningPage />} />
              <Route path="strategy/*" element={<StrategyPage />} />
              <Route path="video/*" element={<VideoPage />} />
              <Route path="chats" element={<ChatsPage />} />
              <Route path="chats/:id" element={<ChatsPage />} />
              <Route path="agents" element={<AgentsLayout />}>
                <Route index element={<Team />} />
                <Route path="rules" element={<SharedRules />} />
                <Route path="escalation" element={<Escalation />} />
                <Route path="activity" element={<Activity />} />
              </Route>
              <Route path="agents/:id" element={<AgentProfile />} />
              <Route path="activity" element={<ActivityRedirect />} />
              <Route path="playbook" element={<PlaybookRedirect />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="onboarding/*" element={<OnboardingPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </Tooltip.Provider>
    </StoreProvider>
  </StrictMode>,
)
