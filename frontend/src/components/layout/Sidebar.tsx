import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import * as Icons from '@radix-ui/react-icons'
import { Flex, Text, Badge, Avatar } from '@radix-ui/themes'
import { useHasTelemetry } from '../../hooks/useHasTelemetry'
import { useHasSpotlightData } from '../../hooks/useHasSpotlightData'

const aiAnalyticsGettingStarted = {
  section: 'Agent Analytics',
  items: [
    {
      name: 'Getting Started',
      href: '/spotlight/getting-started',
      icon: Icons.RocketIcon,
    }
  ]
}

const aiAnalyticsItems = {
  section: 'Agent Analytics',
  items: [
    {
      name: 'Dashboard',
      href: '/spotlight/session-analytics',
      icon: Icons.DashboardIcon,
    },
    {
      name: 'API Keys',
      href: '/spotlight/api-keys',
      icon: Icons.LockClosedIcon,
    }
  ]
}

const mcpTelemetryOnboarding = {
  section: 'MCP Telemetry',
  items: [
    {
      name: 'Getting Started',
      href: '/getting-started',
      icon: Icons.RocketIcon,
    }
  ]
}

const mcpTelemetryItems = {
  section: 'MCP Telemetry',
  items: [
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
    }
  ]
}

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const { hasTelemetry, loading: telemetryLoading } = useHasTelemetry()
  const { hasSpotlightData, loading: spotlightLoading } = useHasSpotlightData()

  // Filter navigation items based on whether user has telemetry data
  // While loading, default to showing normal buttons to avoid whiplash
  // Only show "Getting Started" if we've confirmed there's no data (!loading && !hasData)
  const sidebarConfig = [
    (spotlightLoading || hasSpotlightData) ? aiAnalyticsItems : aiAnalyticsGettingStarted,
    (telemetryLoading || hasTelemetry) ? mcpTelemetryItems : mcpTelemetryOnboarding,
  ]

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
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <Flex align="center" gap="3" style={{ padding: '16px', height: '64px', borderBottom: '1px solid var(--gray-6)', cursor: 'pointer' }}>
          <img
            src="/images/ShinzoIcon512.png"
            alt="Shinzo Logo"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px'
            }}
          />
          <Text size="4" weight="bold">Shinzo</Text>
        </Flex>
      </Link>

      {/* Navigation */}
      <Flex direction="column" style={{ flex: 1, padding: '16px', gap: '4px', overflowY: 'auto' }}>
        {sidebarConfig.map((section) => (
          <React.Fragment key={section.section}>
            <div style={{ margin: '16px 0 8px 0', paddingLeft: '12px' }}>
              <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {section.section}
              </Text>
            </div>
            {section.items.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon

              return (
                <Link key={item.name} to={item.href} style={{ textDecoration: 'none', padding: '8px 12px', borderRadius: 'var(--radius-2)', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: isActive ? 'var(--accent-3)' : 'transparent', color: isActive ? 'var(--accent-11)' : 'var(--gray-11)', transition: 'all 0.2s' }}>
                  <Icon width="18" height="18" />
                  <Text size="2" weight="medium" style={{ flex: 1 }}>{item.name}</Text>
                </Link>
              )
            })}
          </React.Fragment>
        ))}
      </Flex>
    </Flex>
  )
}
