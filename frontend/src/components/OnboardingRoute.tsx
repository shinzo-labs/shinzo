import React, { ReactNode, useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useHasTelemetry } from '../hooks/useHasTelemetry'
import { useHasSpotlightData } from '../hooks/useHasSpotlightData'
import { useAuth } from '../contexts/AuthContext'
import { surveyService } from '../backendService'
import { Flex, Spinner } from '@radix-ui/themes'
import { InitialQuestionnaireDialog } from './InitialQuestionnaireDialog'

interface OnboardingRouteProps {
  children: ReactNode
}

export const OnboardingRoute: React.FC<OnboardingRouteProps> = ({ children }) => {
  const { token } = useAuth()
  const { hasTelemetry, loading: telemetryLoading } = useHasTelemetry()
  const { hasSpotlightData, loading: spotlightLoading } = useHasSpotlightData()
  const [survey, setSurvey] = useState<any>(null)
  const [surveyLoading, setSurveyLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)

  // Fetch user survey on mount
  useEffect(() => {
    const fetchSurvey = async () => {
      if (!token) {
        setSurveyLoading(false)
        return
      }

      try {
        const response = await surveyService.fetchSurvey(token)
        setSurvey(response.survey)
        setShowDialog(!response.survey) // Show dialog if survey doesn't exist
      } catch (error) {
        console.error('Error fetching survey:', error)
      } finally {
        setSurveyLoading(false)
      }
    }

    fetchSurvey()
  }, [token])

  // Show loading spinner while checking
  if (telemetryLoading || spotlightLoading || surveyLoading) {
    return (
      <Flex align="center" justify="center" style={{ height: '100vh' }}>
        <Spinner size="3" />
      </Flex>
    )
  }

  // If survey not completed, show dialog
  if (!survey && showDialog) {
    return (
      <InitialQuestionnaireDialog
        open={true}
        onComplete={() => {
          setShowDialog(false)
          // Refresh survey data
          surveyService.fetchSurvey(token!).then(response => setSurvey(response.survey))
        }}
      />
    )
  }

  // Determine if user has any data at all
  const hasAnyData = hasTelemetry || hasSpotlightData

  // If user hasn't received any data, redirect to appropriate getting-started page
  if (!hasAnyData && survey) {
    // Route based on their primary usage type (first selected)
    const usageTypes = survey.usage_types || []
    if (usageTypes.includes('ai-agent')) {
      return <Navigate to="/spotlight/getting-started" replace />
    } else if (usageTypes.includes('mcp-server')) {
      return <Navigate to="/getting-started" replace />
    }

    // Fallback to MCP getting started if no usage type is set
    return <Navigate to="/getting-started" replace />
  }

  return <>{children}</>
}
