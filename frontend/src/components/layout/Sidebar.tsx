import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import * as Icons from '@radix-ui/react-icons'
import { Flex, Text, Badge, Avatar } from '@radix-ui/themes'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Icons.DashboardIcon,
  },
  {
    name: 'Traces',
    href: '/traces',
    icon: Icons.ActivityLogIcon,
  },
  {
    name: 'Spans',
    href: '/spans',
    icon: Icons.LayersIcon,
  },
  {
    name: 'Metrics',
    href: '/metrics',
    icon: Icons.BarChartIcon,
  },
  {
    name: 'Resources',
    href: '/resources',
    icon: Icons.ComponentInstanceIcon,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Icons.GearIcon,
  },
]

export const Sidebar: React.FC = () => {
  const location = useLocation()

  return (
    <Flex
      direction="column"
      style={{
        width: '256px',
        backgroundColor: 'var(--gray-2)',
        borderRight: '1px solid var(--gray-6)',
        height: '100vh',
        flexShrink: 0,
        overflow: 'hidden'
      }}
    >
      {/* Logo */}
      <Flex align="center" gap="3" style={{ padding: '16px', height: '64px', borderBottom: '1px solid var(--gray-6)' }}>
        <img
          src="/ShinzoIcon512.png"
          alt="Shinzo Logo"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px'
          }}
        />
        <Text size="4" weight="bold">Shinzo</Text>
      </Flex>

      {/* Navigation */}
      <Flex direction="column" style={{ flex: 1, padding: '16px', gap: '4px' }}>
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              to={item.href}
              style={{
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: 'var(--radius-2)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: isActive ? 'var(--accent-3)' : 'transparent',
                color: isActive ? 'var(--accent-11)' : 'var(--gray-11)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--gray-3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <Icon width="18" height="18" />
              <Text size="2" weight="medium" style={{ flex: 1 }}>
                {item.name}
              </Text>
            </Link>
          )
        })}
      </Flex>
    </Flex>
  )
}