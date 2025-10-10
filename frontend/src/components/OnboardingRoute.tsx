import React, { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useHasTelemetry } from '../hooks/useHasTelemetry'
import { Flex, Spinner } from '@radix-ui/themes'

interface OnboardingRouteProps {
  children: ReactNode
}

export const OnboardingRoute: React.FC<OnboardingRouteProps> = ({ children }) => {
  const { hasTelemetry, loading } = useHasTelemetry()

  // Show loading spinner while checking for telemetry
  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ height: '100vh' }}>
        <Spinner size="3" />
      </Flex>
    )
  }

  // If user hasn't received any telemetry data, redirect to getting-started
  if (hasTelemetry === false) {
    return <Navigate to="/getting-started" replace />
  }

  return <>{children}</>
}
