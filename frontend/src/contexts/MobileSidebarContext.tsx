import React, { createContext, useContext, useState, ReactNode } from 'react'

interface MobileSidebarContextType {
  isOpen: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
  openSidebar: () => void
}

const MobileSidebarContext = createContext<MobileSidebarContextType | undefined>(undefined)

export const MobileSidebarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)

  const toggleSidebar = () => setIsOpen(prev => !prev)
  const closeSidebar = () => setIsOpen(false)
  const openSidebar = () => setIsOpen(true)

  return (
    <MobileSidebarContext.Provider value={{ isOpen, toggleSidebar, closeSidebar, openSidebar }}>
      {children}
    </MobileSidebarContext.Provider>
  )
}

export const useMobileSidebar = () => {
  const context = useContext(MobileSidebarContext)
  if (context === undefined) {
    throw new Error('useMobileSidebar must be used within a MobileSidebarProvider')
  }
  return context
}
