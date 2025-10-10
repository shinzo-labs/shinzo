import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Theme } from '@radix-ui/themes'
import { AuthProvider } from './contexts/AuthContext'
import { UserPreferencesProvider } from './contexts/UserPreferencesContext'
import { RefreshProvider } from './contexts/RefreshContext'
import { ProtectedRoute } from './components/ProtectedRoute'

// Auth pages
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { VerifyPage } from './pages/auth/VerifyPage'

// Main app pages
import { DashboardPage } from './pages/DashboardPage'
import { TracesPage } from './pages/TracesPage'
import { SpansPage } from './pages/SpansPage'
import { MetricsPage } from './pages/MetricsPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { SettingsPage } from './pages/SettingsPage'
import { ServerAnalyticsPage } from './pages/ServerAnalyticsPage'

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
                    <DashboardPage />
                  </ProtectedRoute>
                } />
                <Route path="/traces" element={
                  <ProtectedRoute>
                    <TracesPage />
                  </ProtectedRoute>
                } />
                <Route path="/spans" element={
                  <ProtectedRoute>
                    <SpansPage />
                  </ProtectedRoute>
                } />
                <Route path="/metrics" element={
                  <ProtectedRoute>
                    <MetricsPage />
                  </ProtectedRoute>
                } />
                <Route path="/resources" element={
                  <ProtectedRoute>
                    <ResourcesPage />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } />
                <Route path="/server-analytics" element={
                  <ProtectedRoute>
                    <ServerAnalyticsPage />
                  </ProtectedRoute>
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