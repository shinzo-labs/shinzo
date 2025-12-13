import React, { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useHasTelemetry } from '../hooks/useHasTelemetry'
import { useHasSpotlightData } from '../hooks/useHasSpotlightData'
import { useUserPreferences } from '../contexts/UserPreferencesContext'
import { Flex, Spinner } from '@radix-ui/themes'

interface OnboardingRouteProps {
  children: ReactNode
}

export const OnboardingRoute: React.FC<OnboardingRouteProps> = ({ children }) => {
  const { hasTelemetry, loading: telemetryLoading } = useHasTelemetry()
  const { hasSpotlightData, loading: spotlightLoading } = useHasSpotlightData()
  const { preferences, loading: preferencesLoading } = useUserPreferences()

  // Show loading spinner while checking
  if (telemetryLoading || spotlightLoading || preferencesLoading) {
    return (
      <Flex align="center" justify="center" style={{ height: '100vh' }}>
        <Spinner size="3" />
      </Flex>
    )
  }

  // Check if user has completed the questionnaire
  const questionnaireCompleted = preferences.questionnaire_completed === true
  const usageIntents = preferences.onboarding_usage_intents || []

  // If questionnaire not completed, redirect to questionnaire
  if (!questionnaireCompleted) {
    return <Navigate to="/questionnaire" replace />
  }

  // Determine if user has any data at all
  const hasAnyData = hasTelemetry || hasSpotlightData

  // If user hasn't received any data, redirect to appropriate getting-started page
  if (!hasAnyData) {
    // Route based on their primary intent (first selected)
    if (usageIntents.includes('ai-agent')) {
      return <Navigate to="/spotlight/getting-started" replace />
    } else if (usageIntents.includes('mcp-server')) {
      return <Navigate to="/getting-started" replace />
    }

    // Fallback to MCP getting started if no intent is set
    return <Navigate to="/getting-started" replace />
  }

  return <>{children}</>
}
