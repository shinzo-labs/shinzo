import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { spotlightService } from '../backendService'
import { CHECK_INTERVAL } from '../config'

export const useHasSpotlightData = () => {
  const { token } = useAuth()
  const [hasSpotlightData, setHasSpotlightData] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkForSpotlightData = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        // Check for any Spotlight data by querying the session analytics endpoint
        // This should return data if there are any sessions, messages, or interactions
        const response = await spotlightService.fetchSessions(token, {
          limit: 1,
          offset: 0
        })

        // If we get any sessions back, we have Spotlight data
        const hasSessions = response.sessions?.length > 0

        setHasSpotlightData(hasSessions)
      } catch (error) {
        console.error('Error checking for Spotlight data:', error)
        setHasSpotlightData(false)
      } finally {
        setLoading(false)
      }
    }

    // Initial check
    checkForSpotlightData()

    // Poll every CHECK_INTERVAL while we don't have data
    const interval = setInterval(() => {
      if (!hasSpotlightData) {
        checkForSpotlightData()
      }
    }, CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [token, hasSpotlightData])

  return { hasSpotlightData, loading }
}
