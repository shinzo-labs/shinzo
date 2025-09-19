import React, { createContext, useContext, useEffect, useState } from 'react'
import { userPreferencesService } from '../backendService'
import { useAuth } from './AuthContext'

interface UserPreference {
  uuid: string
  preference_key: string
  preference_value: any
  created_at: string
  updated_at: string
}

interface UserPreferencesContextType {
  preferences: Record<string, any>
  loading: boolean
  error: string | null
  savePreference: (key: string, value: any) => Promise<void>
  getPreference: <T = any>(key: string, defaultValue?: T) => T
  deletePreference: (key: string) => Promise<void>
  refreshPreferences: () => Promise<void>
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined)

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext)
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider')
  }
  return context
}

interface UserPreferencesProviderProps {
  children: React.ReactNode
}

export const UserPreferencesProvider: React.FC<UserPreferencesProviderProps> = ({ children }) => {
  const { token, user } = useAuth()
  const [preferences, setPreferences] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshPreferences = async () => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const response = await userPreferencesService.getPreferences(token)
      const preferencesMap: Record<string, any> = {}

      response.preferences.forEach((pref: UserPreference) => {
        preferencesMap[pref.preference_key] = pref.preference_value
      })

      setPreferences(preferencesMap)
    } catch (err: any) {
      setError(err.message || 'Failed to load user preferences')
      console.error('Error loading user preferences:', err)
    } finally {
      setLoading(false)
    }
  }

  const savePreference = async (key: string, value: any) => {
    if (!token) throw new Error('No authentication token available')

    try {
      await userPreferencesService.savePreference(token, {
        preference_key: key,
        preference_value: value
      })

      // Update local state
      setPreferences(prev => ({
        ...prev,
        [key]: value
      }))

      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to save preference')
      throw err
    }
  }

  const getPreference = <T = any>(key: string, defaultValue?: T): T => {
    return preferences[key] !== undefined ? preferences[key] : defaultValue
  }

  const deletePreference = async (key: string) => {
    if (!token) throw new Error('No authentication token available')

    try {
      await userPreferencesService.deletePreference(token, key)

      // Update local state
      setPreferences(prev => {
        const newPreferences = { ...prev }
        delete newPreferences[key]
        return newPreferences
      })

      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to delete preference')
      throw err
    }
  }

  // Load preferences when user logs in
  useEffect(() => {
    if (token && user) {
      refreshPreferences()
    } else {
      // Clear preferences when user logs out
      setPreferences({})
      setError(null)
    }
  }, [token, user])

  const value: UserPreferencesContextType = {
    preferences,
    loading,
    error,
    savePreference,
    getPreference,
    deletePreference,
    refreshPreferences
  }

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  )
}