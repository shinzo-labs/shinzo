import React from 'react'
import { DropdownMenu, Avatar, Flex, Text, Button } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../../contexts/AuthContext'
import { RefreshSettings } from '../ui/RefreshSettings'

interface HeaderProps {
  onRefresh?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onRefresh }) => {
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
  }

  return (
    <Flex
      style={{
        backgroundColor: 'var(--color-background)',
        borderBottom: '1px solid var(--gray-6)',
        padding: '16px 24px',
        minHeight: '64px'
      }}
      justify="between"
      align="center"
      gap="4"
    >
      {/* Left side - could be used for page title or breadcrumbs later */}
      <Flex />

      {/* Right side */}
      <Flex align="center" gap="4">
        {/* Documentation button */}
        <Button
          variant="outline"
          size="2"
          onClick={() => window.open('https://docs.shinzo.ai', '_blank')}
        >
          <Icons.QuestionMarkCircledIcon />
          Docs
        </Button>
        
        {/* Refresh settings */}
        <RefreshSettings onRefresh={onRefresh} />

        {/* User menu */}
        <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="ghost" size="2">
            <Avatar
              size="1"
              fallback={user?.email.charAt(0).toUpperCase() || 'U'}
              color="blue"
            />
            <Text size="2">
              {user?.email}
            </Text>
            <Icons.ChevronDownIcon />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Label>{user?.email}</DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item color="red" onSelect={handleLogout}>
            <Icons.ExitIcon />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      </Flex>
    </Flex>
  )
}