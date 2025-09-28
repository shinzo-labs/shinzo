import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { REFRESH_INTERVAL } from '../config'

interface UseAutoRefreshOptions {
  onRefresh: () => void
}

export const useAutoRefresh = ({ onRefresh }: UseAutoRefreshOptions) => {
  const { user } = useAuth()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
      const intervalMs = REFRESH_INTERVAL

      intervalRef.current = setInterval(() => {
        onRefresh()
      }, intervalMs)

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [onRefresh])

  // Return a function to manually clear the interval if needed
  const clearAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  return { clearAutoRefresh }
}
