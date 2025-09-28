import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface RefreshContextType {
  refreshTrigger: number
  triggerRefresh: () => void
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined)

export const useRefresh = () => {
  const context = useContext(RefreshContext)
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider')
  }
  return context
}

interface RefreshProviderProps {
  children: ReactNode
}

export const RefreshProvider: React.FC<RefreshProviderProps> = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Get refresh interval from environment variable or default to 5 seconds
  const refreshInterval = parseInt(process.env.REACT_APP_REFRESH_INTERVAL || '5')

  // Auto refresh timer - always enabled
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshTrigger(prev => prev + 1)
    }, refreshInterval * 1000)

    return () => clearInterval(timer)
  }, [refreshInterval])

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <RefreshContext.Provider value={{
      refreshTrigger,
      triggerRefresh
    }}>
      {children}
    </RefreshContext.Provider>
  )
}