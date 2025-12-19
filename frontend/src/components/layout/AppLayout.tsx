import React, { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { QuotaBar } from '../QuotaBar'
import { Flex, Box } from '@radix-ui/themes'

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <Flex style={{ height: '100vh', overflow: 'hidden', width: '100vw' }}>
      <Sidebar />
      <Flex direction="column" style={{ flex: 1, height: '100vh', minWidth: 0, overflow: 'hidden' }}>
        <QuotaBar />
        <Header />
        <Box className="app-content-area" style={{ flex: 1, padding: '24px', overflow: 'auto', minHeight: 0, minWidth: 0 }}>
          {children}
        </Box>
      </Flex>
    </Flex>
  )
}