import React, { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Flex, Box } from '@radix-ui/themes'

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <Flex style={{ height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <Flex direction="column" style={{ flex: 1, height: '100vh' }}>
        <Header />
        <Box style={{ flex: 1, padding: '24px', overflowY: 'auto', minHeight: 0 }}>
          {children}
        </Box>
      </Flex>
    </Flex>
  )
}