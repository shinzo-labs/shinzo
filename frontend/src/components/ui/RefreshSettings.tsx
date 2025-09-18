import React, { useState, useEffect } from 'react'
import { DropdownMenu, Button, Switch, Select, Text, Flex, Box } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../../contexts/AuthContext'

export interface RefreshSettingsProps {
  onRefresh?: () => void
}

interface RefreshInterval {
  value: number
  label: string
}

const REFRESH_INTERVALS: RefreshInterval[] = [
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' },
]

export const RefreshSettings: React.FC<RefreshSettingsProps> = ({ onRefresh }) => {
  const { user, updateRefreshSettings } = useAuth()
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<number>(30)
  const [isUpdating, setIsUpdating] = useState(false)

  // Initialize state from user settings
  useEffect(() => {
    if (user) {
      setAutoRefreshEnabled(user.auto_refresh_enabled)
      setRefreshInterval(user.auto_refresh_interval_seconds || 30)
    }
  }, [user])

  const handleRefreshToggle = async (enabled: boolean) => {
    setIsUpdating(true)
    try {
      await updateRefreshSettings(enabled, enabled ? refreshInterval : null)
      setAutoRefreshEnabled(enabled)
    } catch (error) {
      console.error('Failed to update refresh settings:', error)
      // Revert the UI state on error
      setAutoRefreshEnabled(user?.auto_refresh_enabled || false)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleIntervalChange = async (newInterval: string) => {
    const intervalSeconds = parseInt(newInterval)
    setIsUpdating(true)
    try {
      await updateRefreshSettings(autoRefreshEnabled, intervalSeconds)
      setRefreshInterval(intervalSeconds)
    } catch (error) {
      console.error('Failed to update refresh interval:', error)
      // Revert the UI state on error
      setRefreshInterval(user?.auto_refresh_interval_seconds || 30)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleManualRefresh = () => {
    if (onRefresh) {
      onRefresh()
    }
  }

  return (
    <Flex align="center" gap="2">
      {/* Manual refresh button */}
      <Button
        variant="outline"
        size="2"
        onClick={handleManualRefresh}
      >
        <Icons.ReloadIcon />
      </Button>

      {/* Auto-refresh dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="outline" size="2">
            <Icons.ChevronDownIcon />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" style={{ minWidth: '280px' }}>
          <DropdownMenu.Label>Auto-refresh Settings</DropdownMenu.Label>
          <DropdownMenu.Separator />

          {/* Auto-refresh toggle */}
          <Box style={{ padding: '8px 12px' }}>
            <Flex align="center" justify="between">
              <Text size="2" weight="medium">Auto-refresh</Text>
              <Switch
                checked={autoRefreshEnabled}
                onCheckedChange={handleRefreshToggle}
                disabled={isUpdating}
              />
            </Flex>
          </Box>

          {/* Interval selector */}
          <Box style={{ padding: '8px 12px' }}>
            <Flex direction="column" gap="2">
              <Text size="2" weight="medium" color={autoRefreshEnabled ? undefined : 'gray'}>
                Refresh interval
              </Text>
              <Select.Root
                value={refreshInterval.toString()}
                onValueChange={handleIntervalChange}
                disabled={!autoRefreshEnabled || isUpdating}
              >
                <Select.Trigger style={{ width: '100%' }} />
                <Select.Content>
                  {REFRESH_INTERVALS.map((interval) => (
                    <Select.Item key={interval.value} value={interval.value.toString()}>
                      {interval.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
          </Box>

          {autoRefreshEnabled && (
            <Box style={{ padding: '8px 12px' }}>
              <Text size="1" color="gray">
                Data will refresh every {REFRESH_INTERVALS.find(i => i.value === refreshInterval)?.label.toLowerCase()}
              </Text>
            </Box>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Flex>
  )
}