import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Theme } from '@radix-ui/themes'
import { AuthProvider } from './contexts/AuthContext'
import { UserPreferencesProvider } from './contexts/UserPreferencesContext'
import { RefreshProvider } from './contexts/RefreshContext'
import { AppRoute } from './components/AppRoute'

// Auth pages
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { VerifyPage } from './pages/auth/VerifyPage'

// Main app pages
import { DashboardPage } from './pages/DashboardPage'
import { GettingStartedPage } from './pages/GettingStartedPage'
import { TracesPage } from './pages/TracesPage'
import { SpansPage } from './pages/SpansPage'
import { MetricsPage } from './pages/MetricsPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { SettingsPage } from './pages/SettingsPage'

// Spotlight pages
import { SpotlightApiKeysPage } from './pages/spotlight/SpotlightApiKeysPage'
import { SpotlightTokenAnalyticsPage } from './pages/spotlight/SpotlightTokenAnalyticsPage'
import { SpotlightSessionAnalyticsPage } from './pages/spotlight/SpotlightSessionAnalyticsPage'
import { SpotlightGettingStartedPage } from './pages/spotlight/SpotlightGettingStartedPage'

import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 30000,
      cacheTime: 300000,
    },
  },
})

function App() {
  return (
    <Theme>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserPreferencesProvider>
            <RefreshProvider>
              <Router>
                <div className="App">
                  <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify" element={<VerifyPage />} />

                {/* Protected routes with onboarding */}
                <Route path="/dashboard" element={
                  <AppRoute protected requireOnboarding>
                    <DashboardPage />
                  </AppRoute>
                } />
                <Route path="/traces" element={
                  <AppRoute protected requireOnboarding>
                    <TracesPage />
                  </AppRoute>
                } />
                <Route path="/spans" element={
                  <AppRoute protected requireOnboarding>
                    <SpansPage />
                  </AppRoute>
                } />
                <Route path="/metrics" element={
                  <AppRoute protected requireOnboarding>
                    <MetricsPage />
                  </AppRoute>
                } />
                <Route path="/resources" element={
                  <AppRoute protected requireOnboarding>
                    <ResourcesPage />
                  </AppRoute>
                } />
                <Route path="/settings" element={
                  <AppRoute protected requireOnboarding>
                    <SettingsPage />
                  </AppRoute>
                } />

                {/* Spotlight routes with onboarding */}
                <Route path="/spotlight/api-keys" element={
                  <AppRoute protected requireOnboarding>
                    <SpotlightApiKeysPage />
                  </AppRoute>
                } />
                <Route path="/spotlight/token-analytics" element={
                  <AppRoute protected requireOnboarding>
                    <SpotlightTokenAnalyticsPage />
                  </AppRoute>
                } />
                <Route path="/spotlight/session-analytics" element={
                  <AppRoute protected requireOnboarding>
                    <SpotlightSessionAnalyticsPage />
                  </AppRoute>
                } />

                {/* Protected routes with survey requirement (getting-started pages) */}
                <Route path="/getting-started" element={
                  <AppRoute protected requireOnboarding>
                    <GettingStartedPage />
                  </AppRoute>
                } />
                <Route path="/spotlight/getting-started" element={
                  <AppRoute protected requireOnboarding>
                    <SpotlightGettingStartedPage />
                  </AppRoute>
                } />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              </div>
              </Router>
            </RefreshProvider>
          </UserPreferencesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Theme>
  )
}

export default App