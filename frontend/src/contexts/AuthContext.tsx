import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { API_BASE_URL } from '../config'

interface User {
  uuid: string
  email: string
  verified: boolean
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  verify: (email: string, verification_token: string) => Promise<void>
  resendVerification: (email: string) => Promise<void>
  logout: () => void
  loading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored token on app load (localStorage for persistent, sessionStorage for temporary)
    const persistentToken = localStorage.getItem('auth_token')
    const sessionToken = sessionStorage.getItem('auth_token')

    // Migration: If token is in sessionStorage but not localStorage, move it to localStorage
    // This ensures tokens work across tabs for sharing links
    if (sessionToken && !persistentToken) {
      localStorage.setItem('auth_token', sessionToken)
      sessionStorage.removeItem('auth_token')
    }

    const storedToken = persistentToken || sessionToken

    if (storedToken) {
      setToken(storedToken)
      fetchUser(storedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/fetch_user`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        // Token is invalid, clear it from both storages
        localStorage.removeItem('auth_token')
        sessionStorage.removeItem('auth_token')
        setToken(null)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      localStorage.removeItem('auth_token')
      sessionStorage.removeItem('auth_token')
      setToken(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string, rememberMe = true) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Login failed')
    }

    const data = await response.json()
    const { token: authToken, user: userData } = data

    // Store token based on "Remember Me" preference
    // Default to localStorage so tokens work across tabs (important for sharing links)
    if (rememberMe) {
      localStorage.setItem('auth_token', authToken)
      sessionStorage.removeItem('auth_token') // Clear session storage if exists
    } else {
      sessionStorage.setItem('auth_token', authToken)
      localStorage.removeItem('auth_token') // Clear persistent storage if exists
    }

    setToken(authToken)
    setUser(userData)
  }

  const register = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/create_user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Registration failed')
    }

    await response.json()
  }

  const verify = async (email: string, verification_token: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify_user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, verification_token }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Verification failed')
    }

    const data = await response.json()

    // Store token and user data for automatic login
    if (data.token) {
      localStorage.setItem('auth_token', data.token)
      setToken(data.token)
      setUser(data.user)
    }

    return data
  }

  const resendVerification = async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/resend_verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Failed to resend verification email')
    }

    await response.json()
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
    setToken(null)
    setUser(null)
    window.location.href = 'https://shinzo.ai'
  }

  const value = {
    user,
    token,
    login,
    register,
    verify,
    resendVerification,
    logout,
    loading,
    isAuthenticated: !!token && !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}