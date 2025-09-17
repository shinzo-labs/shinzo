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
  login: (email: string, password: string) => Promise<void>
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
    // Check for stored token on app load
    const storedToken = localStorage.getItem('auth_token')
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
        // Token is invalid, clear it
        localStorage.removeItem('auth_token')
        setToken(null)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      localStorage.removeItem('auth_token')
      setToken(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
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

    localStorage.setItem('auth_token', authToken)
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
    setToken(null)
    setUser(null)
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