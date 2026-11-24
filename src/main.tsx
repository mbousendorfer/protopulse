import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import * as Tooltip from '@radix-ui/react-tooltip'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './styles/tokens.css'
import './styles/base.css'
import { StoreProvider } from './app/store'
import Shell from './app/Shell'
import Desk from './features/desk/Desk'
import Focus from './features/desk/Focus'
import { Team, AgentProfile } from './features/agents/Agents'
import Activity from './features/activity/Activity'
import InboxPage from './features/inbox/Page'
import PublishingPage from './features/publishing/Page'
import InsightsPage from './features/insights/Page'
import ListeningPage from './features/listening/Page'
import StrategyPage from './features/strategy/Page'
import PlaybookPage from './features/playbook/Page'
import SettingsPage from './features/settings/Page'
import OnboardingPage from './features/onboarding/Page'
import ChatsPage from './features/chats/Page'

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
              <Route path="chats" element={<ChatsPage />} />
              <Route path="chats/:id" element={<ChatsPage />} />
              <Route path="agents" element={<Team />} />
              <Route path="agents/:id" element={<AgentProfile />} />
              <Route path="activity" element={<Activity />} />
              <Route path="playbook" element={<PlaybookPage />} />
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
