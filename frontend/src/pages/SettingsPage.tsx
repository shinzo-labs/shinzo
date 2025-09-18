import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, TextField, Card, Flex, Text, Heading, Select, Box, Tabs, Switch } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { API_BASE_URL } from '../config'
import { useAuth } from '../contexts/AuthContext'
import { ingestTokenService } from '../backendService'

interface UserProfile {
  id: string
  email: string
  name: string
  organization?: string
  created_at: string
}

interface Settings {
  notifications: {
    email_alerts: boolean
    trace_errors: boolean
    performance_alerts: boolean
    weekly_reports: boolean
  }
  data_retention: {
    traces_days: number
    metrics_days: number
    logs_days: number
  }
  sampling: {
    enabled: boolean
    rate: number
  }
}

interface IngestToken {
  uuid: string
  ingest_token: string
  status: 'live' | 'deprecated'
  created_at: string
  updated_at: string
}

export const SettingsPage: React.FC = () => {
  const { token, user, logout } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('profile')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  const { data: profile, isLoading: profileLoading } = useQuery(
    ['profile'],
    async () => {
      const response = await fetch(`${API_BASE_URL}/auth/fetch_user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch profile')
      return response.json()
    },
    { enabled: !!token }
  )

  // Stub out settings until backend implements these endpoints
  const settings: Settings = {
    notifications: {
      email_alerts: false,
      trace_errors: true,
      performance_alerts: true,
      weekly_reports: false
    },
    data_retention: {
      traces_days: 30,
      metrics_days: 90,
      logs_days: 7
    },
    sampling: {
      enabled: false,
      rate: 10
    }
  }
  const settingsLoading = false

  const { data: ingestTokens, isLoading: tokensLoading } = useQuery(
    ['ingestTokens'],
    async () => {
      return ingestTokenService.fetchAll(token!)
    },
    { enabled: !!token }
  )

  // Stub out settings update until backend implements these endpoints
  const updateSettingsMutation = useMutation(
    async (newSettings: Partial<Settings>) => {
      // TODO: Implement settings update when backend adds these endpoints
      console.log('Settings update requested (not yet implemented):', newSettings)
      return { success: true }
    },
    {
      onSuccess: () => {
        // Settings are stubbed, so no need to invalidate queries
        console.log('Settings would be updated in backend')
      },
    }
  )

  // Stub out password change until backend implements this endpoint
  const changePasswordMutation = useMutation(
    async (passwordData: typeof passwordForm) => {
      // TODO: Implement password change when backend adds this endpoint
      console.log('Password change requested (not yet implemented):', { email: passwordData.current_password ? '[REDACTED]' : '' })
      return { success: true }
    },
    {
      onSuccess: () => {
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
        setIsChangingPassword(false)
        console.log('Password would be changed in backend')
      },
    }
  )

  const generateTokenMutation = useMutation(
    async () => {
      return ingestTokenService.generate(token!)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['ingestTokens'])
      },
    }
  )

  const revokeTokenMutation = useMutation(
    async (tokenUuid: string) => {
      return ingestTokenService.revoke(token!, tokenUuid)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['ingestTokens'])
      },
    }
  )

  const handleNotificationChange = (key: string, value: boolean) => {
    if (settings) {
      updateSettingsMutation.mutate({
        notifications: {
          ...settings.notifications,
          [key]: value
        }
      })
    }
  }

  const handleRetentionChange = (key: string, value: number) => {
    if (settings) {
      updateSettingsMutation.mutate({
        data_retention: {
          ...settings.data_retention,
          [key]: value
        }
      })
    }
  }

  const handleSamplingChange = (key: string, value: boolean | number) => {
    if (settings) {
      updateSettingsMutation.mutate({
        sampling: {
          ...settings.sampling,
          [key]: value
        }
      })
    }
  }

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      alert('New passwords do not match')
      return
    }
    changePasswordMutation.mutate(passwordForm)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const isLoading = profileLoading || settingsLoading

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        <Heading size="6">Settings</Heading>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Trigger value="profile">
              <Icons.PersonIcon />
              Profile
            </Tabs.Trigger>
            <Tabs.Trigger value="tokens">
              <Icons.TokensIcon />
              Ingest Tokens
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="profile">
            <Flex direction="column" gap="6">
              <Card>
                <Flex direction="column" gap="4">
                  <Heading size="4">Profile Information</Heading>

                  {isLoading ? (
                    <Flex direction="column" gap="4">
                      <Box className="animate-pulse">
                        <Box style={{ height: '16px', backgroundColor: 'var(--gray-3)', borderRadius: '4px', width: '33%', marginBottom: '8px' }} />
                        <Box style={{ height: '40px', backgroundColor: 'var(--gray-3)', borderRadius: '4px' }} />
                      </Box>
                      <Box className="animate-pulse">
                        <Box style={{ height: '16px', backgroundColor: 'var(--gray-3)', borderRadius: '4px', width: '33%', marginBottom: '8px' }} />
                        <Box style={{ height: '40px', backgroundColor: 'var(--gray-3)', borderRadius: '4px' }} />
                      </Box>
                    </Flex>
                  ) : (
                    <Flex direction="column" gap="4">
                      <Flex direction="column" gap="2">
                        <Text size="2" weight="medium">Email</Text>
                        <TextField.Root
                          type="email"
                          value={profile?.email || ''}
                          disabled
                          style={{ backgroundColor: 'var(--gray-2)' }}
                        />
                      </Flex>

                    </Flex>
                  )}
                </Flex>
              </Card>


              <Card>
                <Flex direction="column" gap="4">
                  <Heading size="4">Account Actions</Heading>
                  <Button
                    color="red"
                    onClick={logout}
                  >
                    <Icons.ExitIcon />
                    Sign Out
                  </Button>
                </Flex>
              </Card>
            </Flex>
          </Tabs.Content>


          <Tabs.Content value="tokens">
            <Card>
              <Flex direction="column" gap="4">
                <Flex justify="between" align="center">
                  <Heading size="4">Ingest Tokens</Heading>
                  <Button
                    onClick={() => generateTokenMutation.mutate()}
                    disabled={generateTokenMutation.isLoading}
                  >
                    <Icons.PlusIcon />
                    {generateTokenMutation.isLoading ? 'Generating...' : 'Generate New Token'}
                  </Button>
                </Flex>

                <Text size="2" color="gray">
                  Ingest tokens are used to authenticate your applications when sending telemetry data to Shinzo.
                </Text>

                {tokensLoading ? (
                  <Flex direction="column" gap="4">
                    {[1, 2].map(i => (
                      <Box key={i} className="animate-pulse" style={{ padding: '16px', backgroundColor: 'var(--gray-2)', borderRadius: '8px' }}>
                        <Box style={{ height: '16px', backgroundColor: 'var(--gray-3)', borderRadius: '4px', width: '60%', marginBottom: '8px' }} />
                        <Box style={{ height: '12px', backgroundColor: 'var(--gray-3)', borderRadius: '4px', width: '40%' }} />
                      </Box>
                    ))}
                  </Flex>
                ) : ingestTokens && ingestTokens.length > 0 ? (
                  <Flex direction="column" gap="3">
                    {ingestTokens.map((token: IngestToken) => (
                      <Card key={token.uuid} style={{ backgroundColor: token.status === 'live' ? 'var(--green-2)' : 'var(--gray-3)' }}>
                        <Flex direction="column" gap="3">
                          <Flex justify="between" align="center">
                            <Flex direction="column" gap="1">
                              <Flex align="center" gap="2">
                                <Text size="2" weight="medium">
                                  {token.status === 'live' ? '🟢' : '🔴'}
                                  {token.status === 'live' ? 'Active Token' : 'Deprecated Token'}
                                </Text>
                                {token.status === 'live' && (
                                  <Text size="1" style={{ backgroundColor: 'var(--green-9)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>
                                    LIVE
                                  </Text>
                                )}
                              </Flex>
                              <Text size="1" color="gray">
                                Created: {new Date(token.created_at).toLocaleDateString()}
                              </Text>
                            </Flex>
                            <Flex gap="2">
                              <Button
                                size="1"
                                variant="ghost"
                                onClick={() => copyToClipboard(token.ingest_token)}
                              >
                                <Icons.CopyIcon />
                                Copy
                              </Button>
                              {token.status === 'live' && (
                                <Button
                                  size="1"
                                  color="red"
                                  variant="ghost"
                                  onClick={() => revokeTokenMutation.mutate(token.uuid)}
                                  disabled={revokeTokenMutation.isLoading}
                                >
                                  <Icons.TrashIcon />
                                  Revoke
                                </Button>
                              )}
                            </Flex>
                          </Flex>
                          <Box style={{ backgroundColor: 'var(--gray-1)', padding: '8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                            {token.ingest_token}
                          </Box>
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                ) : (
                  <Box style={{ textAlign: 'center', padding: '32px' }}>
                    <Text size="3" color="gray">No ingest tokens found</Text>
                    <br />
                    <Text size="2" color="gray">Generate your first token to start sending telemetry data</Text>
                  </Box>
                )}
              </Flex>
            </Card>
          </Tabs.Content>

        </Tabs.Root>
      </Flex>
    </AppLayout>
  )
}

