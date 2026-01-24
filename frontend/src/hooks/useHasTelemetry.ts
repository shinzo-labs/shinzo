import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { telemetryService } from '../backendService'
import { subHours } from 'date-fns'

export const useHasTelemetry = () => {
  const { token } = useAuth()
  const [hasTelemetry, setHasTelemetry] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkForTelemetry = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        // Check for any traces in the last 30 days
        const response = await telemetryService.fetchTraces(token, {
          start_time: subHours(new Date(), 24 * 30).toISOString(),
          end_time: new Date().toISOString(),
          limit: 1
        })

        setHasTelemetry(response.traces.length > 0)
      } catch (error) {
        console.error('Error checking for telemetry:', error)
        setHasTelemetry(false)
      } finally {
        setLoading(false)
      }
    }

    checkForTelemetry()
  }, [token])

  return { hasTelemetry, loading }
}
