import React, { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Flex, Box } from '@radix-ui/themes'

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <Flex style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Flex direction="column" style={{ flex: 1 }}>
        <Header />
        <Box style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {children}
        </Box>
      </Flex>
    </Flex>
  )
}