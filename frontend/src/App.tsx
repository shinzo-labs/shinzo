import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Theme } from '@radix-ui/themes'
import { AuthProvider } from './contexts/AuthContext'
import { UserPreferencesProvider } from './contexts/UserPreferencesContext'
import { RefreshProvider } from './contexts/RefreshContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { OnboardingRoute } from './components/OnboardingRoute'

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
import { SpotlightToolAnalyticsPage } from './pages/spotlight/SpotlightToolAnalyticsPage'
import { SpotlightSessionAnalyticsPage } from './pages/spotlight/SpotlightSessionAnalyticsPage'
import { SpotlightUserAnalyticsPage } from './pages/spotlight/SpotlightUserAnalyticsPage'

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

                {/* Protected routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <OnboardingRoute>
                      <DashboardPage />
                    </OnboardingRoute>
                  </ProtectedRoute>
                } />
                <Route path="/getting-started" element={
                  <ProtectedRoute>
                    <GettingStartedPage />
                  </ProtectedRoute>
                } />
                <Route path="/traces" element={
                  <ProtectedRoute>
                    <OnboardingRoute>
                      <TracesPage />
                    </OnboardingRoute>
                  </ProtectedRoute>
                } />
                <Route path="/spans" element={
                  <ProtectedRoute>
                    <OnboardingRoute>
                      <SpansPage />
                    </OnboardingRoute>
                  </ProtectedRoute>
                } />
                <Route path="/metrics" element={
                  <ProtectedRoute>
                    <OnboardingRoute>
                      <MetricsPage />
                    </OnboardingRoute>
                  </ProtectedRoute>
                } />
                <Route path="/resources" element={
                  <ProtectedRoute>
                    <OnboardingRoute>
                      <ResourcesPage />
                    </OnboardingRoute>
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <OnboardingRoute>
                      <SettingsPage />
                    </OnboardingRoute>
                  </ProtectedRoute>
                } />

                {/* Spotlight routes */}
                <Route path="/spotlight/api-keys" element={
                  <ProtectedRoute>
                    <OnboardingRoute>
                      <SpotlightApiKeysPage />
                    </OnboardingRoute>
                  </ProtectedRoute>
                } />
                <Route path="/spotlight/token-analytics" element={
                  <ProtectedRoute>
                    <OnboardingRoute>
                      <SpotlightTokenAnalyticsPage />
                    </OnboardingRoute>
                  </ProtectedRoute>
                } />
                <Route path="/spotlight/tool-analytics" element={
                  <ProtectedRoute>
                    <OnboardingRoute>
                      <SpotlightToolAnalyticsPage />
                    </OnboardingRoute>
                  </ProtectedRoute>
                } />
                <Route path="/spotlight/session-analytics" element={
                  <ProtectedRoute>
                    <OnboardingRoute>
                      <SpotlightSessionAnalyticsPage />
                    </OnboardingRoute>
                  </ProtectedRoute>
                } />
                <Route path="/spotlight/user-analytics" element={
                  <ProtectedRoute>
                    <OnboardingRoute>
                      <SpotlightUserAnalyticsPage />
                    </OnboardingRoute>
                  </ProtectedRoute>
                } />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/getting-started" replace />} />
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