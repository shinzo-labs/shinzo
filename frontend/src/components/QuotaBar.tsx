import React from 'react'
import { Flex, Text, Progress, AlertDialog, Button, Badge } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useQuery } from 'react-query'
import { authService, UserQuota } from '../backendService'
import { useAuth } from '../contexts/AuthContext'

interface QuotaBarProps {
  className?: string
}

export const QuotaBar: React.FC<QuotaBarProps> = ({ className }) => {
  const { token } = useAuth()

  const { data: quota, isLoading, error } = useQuery<UserQuota>(
    'userQuota',
    () => authService.fetchUserQuota(token!),
    {
      enabled: !!token,
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 10000, // Consider data stale after 10 seconds
    }
  )

  if (isLoading || error || !quota) {
    return null
  }

  const { currentUsage, monthlyQuota, tier } = quota

  // If scale tier (unlimited), don't show quota bar
  if (monthlyQuota === null) {
    return (
      <Flex
        className={className}
        style={{
          backgroundColor: 'var(--green-2)',
          borderBottom: '1px solid var(--green-6)',
          padding: '8px 24px',
          minHeight: '40px'
        }}
        justify="center"
        align="center"
        gap="2"
      >
        <Badge color="green" variant="soft">
          <Icons.CheckCircledIcon />
          Scale Plan - Unlimited Usage
        </Badge>
      </Flex>
    )
  }

  const usagePercentage = Math.min((currentUsage / monthlyQuota) * 100, 100)
  const isNearLimit = usagePercentage >= 80
  const isOverLimit = usagePercentage >= 100

  const getStatusColor = () => {
    if (isOverLimit) return 'red'
    if (isNearLimit) return 'orange'
    return 'blue'
  }

  const getStatusText = () => {
    if (isOverLimit) return 'Quota Exceeded'
    if (isNearLimit) return 'Approaching Limit'
    return `${currentUsage.toLocaleString()} / ${monthlyQuota.toLocaleString()} datapoints used`
  }

  const getTierDisplayName = () => {
    switch (tier) {
      case 'free': return 'Free'
      case 'growth': return 'Growth'
      case 'scale': return 'Scale'
      default: return tier
    }
  }

  return (
    <Flex
      className={className}
      style={{
        backgroundColor: isOverLimit ? 'var(--red-2)' : isNearLimit ? 'var(--orange-2)' : 'var(--blue-2)',
        borderBottom: isOverLimit ? '1px solid var(--red-6)' : isNearLimit ? '1px solid var(--orange-6)' : '1px solid var(--blue-6)',
        padding: '8px 24px',
        minHeight: '40px'
      }}
      justify="between"
      align="center"
      gap="4"
    >
      <Flex align="center" gap="3" style={{ flex: 1 }}>
        <Badge color={getStatusColor()} variant="soft">
          {getTierDisplayName()} Plan
        </Badge>

        <Flex direction="column" gap="1" style={{ flex: 1, maxWidth: '300px' }}>
          <Text size="1" color="gray">
            {getStatusText()}
          </Text>
          <Progress
            value={usagePercentage}
            color={getStatusColor()}
            size="1"
          />
        </Flex>
      </Flex>

      {(isNearLimit || isOverLimit) && (
        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button variant="soft" color={getStatusColor()} size="1">
              <Icons.ExclamationTriangleIcon />
              {isOverLimit ? 'Upgrade Required' : 'Upgrade Plan'}
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content style={{ maxWidth: 450 }}>
            <AlertDialog.Title>
              {isOverLimit ? 'Monthly Quota Exceeded' : 'Approaching Monthly Limit'}
            </AlertDialog.Title>
            <AlertDialog.Description size="2">
              {isOverLimit ? (
                <>
                  You have exceeded your monthly quota of {monthlyQuota.toLocaleString()} datapoints.
                  New data ingestion is currently blocked. Please upgrade your subscription to continue.
                </>
              ) : (
                <>
                  You are approaching your monthly limit of {monthlyQuota.toLocaleString()} datapoints.
                  Consider upgrading to avoid service interruption.
                </>
              )}
            </AlertDialog.Description>

            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">
                  Remind Me Later
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button color={getStatusColor()}>
                  <a
                    href="mailto:austin@shinzolabs.com?subject=Subscription Upgrade Request"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    Contact Sales
                  </a>
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      )}
    </Flex>
  )
}