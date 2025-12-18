import React, { ReactNode, useState, useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useHasTelemetry } from '../hooks/useHasTelemetry'
import { useHasSpotlightData } from '../hooks/useHasSpotlightData'
import { surveyService } from '../backendService'
import { Flex, Spinner } from '@radix-ui/themes'
import { InitialQuestionnaireDialog } from './InitialQuestionnaireDialog'

interface AppRouteProps {
  children: ReactNode
  /** Whether this route requires authentication */
  protected?: boolean
  /** Whether this route requires onboarding (survey completion). If false, skip onboarding checks entirely. */
  requireOnboarding?: boolean
}

/**
 * Unified route wrapper that handles both authentication and onboarding.
 *
 * @param protected - If true, redirects to /login if user is not authenticated
 * @param requireOnboarding - If true, enforces survey completion and redirects appropriately
 */
export const AppRoute: React.FC<AppRouteProps> = ({
  children,
  protected: isProtected = false,
  requireOnboarding = false
}) => {
  const { isAuthenticated, loading: authLoading, token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { hasTelemetry, loading: telemetryLoading } = useHasTelemetry()
  const { hasSpotlightData, loading: spotlightLoading } = useHasSpotlightData()
  const [survey, setSurvey] = useState<any>(null)
  const [surveyLoading, setSurveyLoading] = useState(requireOnboarding)
  const [showDialog, setShowDialog] = useState(false)

  // Fetch user survey if onboarding is required
  useEffect(() => {
    if (!requireOnboarding || !token) {
      setSurveyLoading(false)
      return
    }

    const fetchSurvey = async () => {
      try {
        const response = await surveyService.fetchSurvey(token)
        setSurvey(response.survey)
        setShowDialog(!response.survey)
      } catch (error) {
        console.error('Error fetching survey:', error)
      } finally {
        setSurveyLoading(false)
      }
    }

    fetchSurvey()
  }, [token, requireOnboarding])

  // Show loading spinner while checking authentication or onboarding status
  if (authLoading || (requireOnboarding && (telemetryLoading || spotlightLoading || surveyLoading))) {
    return (
      <Flex align="center" justify="center" style={{ height: '100vh' }}>
        <Spinner size="3" />
      </Flex>
    )
  }

  // Authentication check
  if (isProtected && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Onboarding checks (only if requireOnboarding is true)
  if (requireOnboarding) {
    const isGettingStartedPage = location.pathname === '/getting-started' || location.pathname === '/spotlight/getting-started'

    // Pages that should always be accessible (analytics pages, settings, etc.)
    const isAlwaysAccessiblePage = location.pathname.startsWith('/spotlight/session-analytics') ||
                                   location.pathname.startsWith('/spotlight/api-keys') ||
                                   location.pathname.startsWith('/settings') ||
                                   location.pathname === '/dashboard'

    // Getting-started pages require a completed survey
    if (isGettingStartedPage && !survey) {
      return <Navigate to="/dashboard" replace />
    }

    // For non-getting-started pages, check survey completion
    if (!isGettingStartedPage && !isAlwaysAccessiblePage) {
      // Pages that are allowed when survey is not completed
      const allowedPagesWithoutSurvey = ['/dashboard', '/login', '/register']
      const isOnAllowedPage = allowedPagesWithoutSurvey.includes(location.pathname)

      // If survey is not completed and user is not on an allowed page, redirect to dashboard
      if (!survey && !isOnAllowedPage) {
        return <Navigate to="/dashboard" replace />
      }

      // Determine if user has any data at all
      const hasAnyData = hasTelemetry || hasSpotlightData

      // If user hasn't received any data, redirect to appropriate getting-started page
      if (!hasAnyData && survey) {
        const usageTypes = survey.usage_types || []
        if (usageTypes.includes('ai-agent')) {
          return <Navigate to="/spotlight/getting-started" replace />
        } else if (usageTypes.includes('mcp-server')) {
          return <Navigate to="/getting-started" replace />
        }
        return <Navigate to="/spotlight/getting-started" replace />
      }
    }
  }

  // Render children with optional survey dialog overlay
  return (
    <>
      {children}
      {requireOnboarding && (
        <InitialQuestionnaireDialog
          open={!survey && showDialog}
          onComplete={async () => {
            setShowDialog(false)
            setSurveyLoading(true)
            try {
              const response = await surveyService.fetchSurvey(token!)
              setSurvey(response.survey)

              // Redirect to appropriate getting-started page based on survey response
              if (response.survey) {
                const usageTypes = response.survey.usage_types || []
                if (usageTypes.includes('ai-agent')) {
                  navigate('/spotlight/getting-started', { replace: true })
                } else if (usageTypes.includes('mcp-server')) {
                  navigate('/getting-started', { replace: true })
                } else {
                  navigate('/spotlight/getting-started', { replace: true })
                }
              }
            } catch (error) {
              console.error('Error refetching survey:', error)
            } finally {
              setSurveyLoading(false)
            }
          }}
        />
      )}
    </>
  )
}
