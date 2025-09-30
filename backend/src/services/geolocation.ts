import axios from 'axios'
import { logger } from '../logger'

export interface GeolocationData {
  country?: string
  country_code?: string
  city?: string
  region?: string
  latitude?: number
  longitude?: number
}

/**
 * Get geolocation data from IP address using ip-api.com (free tier: 45 req/min)
 * Note: For production, consider using MaxMind GeoIP2 or similar paid service
 */
export async function getGeolocation(ipAddress: string): Promise<GeolocationData | null> {
  // Skip localhost and private IPs
  if (!ipAddress ||
      ipAddress === 'unknown' ||
      ipAddress.startsWith('127.') ||
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('10.') ||
      ipAddress.startsWith('172.')) {
    return null
  }

  try {
    // Use ip-api.com free tier (no API key required)
    const response = await axios.get(`http://ip-api.com/json/${ipAddress}`, {
      timeout: 3000,
      params: {
        fields: 'status,country,countryCode,region,city,lat,lon'
      }
    })

    if (response.data.status === 'success') {
      return {
        country: response.data.country,
        country_code: response.data.countryCode,
        city: response.data.city,
        region: response.data.region,
        latitude: response.data.lat,
        longitude: response.data.lon
      }
    }

    return null
  } catch (error) {
    logger.warn({ message: 'Failed to get geolocation', ipAddress, error })
    return null
  }
}

/**
 * Extract IP address from request headers
 */
export function extractIpAddress(headers: Record<string, string | string[] | undefined>): string | null {
  // Check common headers for client IP
  const forwardedFor = headers['x-forwarded-for']
  if (forwardedFor) {
    const ips = typeof forwardedFor === 'string' ? forwardedFor.split(',') : forwardedFor
    return ips[0].trim()
  }

  const realIp = headers['x-real-ip']
  if (realIp && typeof realIp === 'string') {
    return realIp
  }

  const cfConnectingIp = headers['cf-connecting-ip']
  if (cfConnectingIp && typeof cfConnectingIp === 'string') {
    return cfConnectingIp
  }

  return null
}
