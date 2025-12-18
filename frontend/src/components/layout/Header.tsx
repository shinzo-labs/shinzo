import React from 'react'
import { DropdownMenu, Avatar, Flex, Text, Button, IconButton } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../../contexts/AuthContext'
import { useMobileSidebar } from '../../contexts/MobileSidebarContext'

export const Header: React.FC = () => {
  const { user, logout } = useAuth()
  const { toggleSidebar } = useMobileSidebar()

  const handleLogout = () => {
    logout()
  }

  return (
    <Flex
      className="mobile-header"
      style={{
        backgroundColor: 'var(--color-background)',
        borderBottom: '1px solid var(--gray-6)',
        padding: '16px 24px',
        minHeight: '64px',
        flexShrink: 0
      }}
      align="center"
      gap="4"
    >
      {/* Left side - Hamburger menu for mobile */}
      <IconButton
        variant="ghost"
        className="hamburger-button"
        onClick={toggleSidebar}
        style={{ display: 'none' }}
      >
        <Icons.HamburgerMenuIcon width="20" height="20" />
      </IconButton>

      {/* Right side */}
      <Flex align="center" gap="2" className="header-buttons-container" style={{ flexShrink: 0 }}>
        {/* Documentation button */}
        <Button
          variant="solid"
          size="2"
          onClick={() => window.open('https://docs.shinzo.ai', '_blank')}
        >
          <Icons.QuestionMarkCircledIcon />
          <span className="header-button-text">Docs</span>
        </Button>

        {/* Live Support dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="outline" size="2">
              <Icons.ChatBubbleIcon />
              <span className="header-button-text">Need support?</span>
              <Icons.ChevronDownIcon className="header-button-text" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item onSelect={() => window.open('https://calendly.com/shinzolabs/meet-extended', '_blank')}>
              <Icons.CalendarIcon />
              Schedule a Meeting
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => window.open('https://discord.gg/UYUdSdp5N8', '_blank')}>
              <Icons.DiscordLogoIcon />
              Join Discord
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        {/* User menu */}
        <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="ghost" size="2">
            <Avatar
              size="1"
              fallback={user?.email.charAt(0).toUpperCase() || 'U'}
              color="blue"
            />
            <Text size="2" className="header-button-text">
              {user?.email}
            </Text>
            <Icons.ChevronDownIcon className="header-button-text" />
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