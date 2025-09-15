import React, { useState } from 'react'
import { DropdownMenu, TextField, Avatar, Flex, Text, Button, Badge } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../../contexts/AuthContext'

export const Header: React.FC = () => {
  const { user, logout } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

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
      {/* Global search */}
      <Flex style={{ flex: 1, maxWidth: '400px' }}>
        <TextField.Root
          placeholder="Search traces, spans, services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%' }}
        >
          <TextField.Slot>
            <Icons.MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>
      </Flex>

      {/* System status indicator */}
      <Flex align="center" gap="4">
        <Badge color="green" variant="soft">
          All systems operational
        </Badge>
      </Flex>

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
          <DropdownMenu.Item>
            <Icons.PersonIcon />
            Profile
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <Icons.GearIcon />
            Settings
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <Icons.QuestionMarkCircledIcon />
            Help & Documentation
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item color="red" onSelect={handleLogout}>
            <Icons.ExitIcon />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Flex>
  )
}