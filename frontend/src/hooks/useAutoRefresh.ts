import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface UseAutoRefreshOptions {
  onRefresh: () => void
  enabled?: boolean
}

export const useAutoRefresh = ({ onRefresh, enabled = true }: UseAutoRefreshOptions) => {
  const { user } = useAuth()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Only set up auto-refresh if:
    // 1. Feature is enabled globally
    // 2. User has auto-refresh enabled
    // 3. User has specified an interval
    // 4. Component-level enabled flag is true
    if (
      enabled &&
      user?.auto_refresh_enabled &&
      user?.auto_refresh_interval_seconds &&
      user.auto_refresh_interval_seconds > 0
    ) {
      const intervalMs = user.auto_refresh_interval_seconds * 1000

      intervalRef.current = setInterval(() => {
        onRefresh()
      }, intervalMs)
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [
    enabled,
    user?.auto_refresh_enabled,
    user?.auto_refresh_interval_seconds,
    onRefresh
  ])

  // Return a function to manually clear the interval if needed
  const clearAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  return { clearAutoRefresh }
}