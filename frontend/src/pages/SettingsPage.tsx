import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import * as Icons from '@radix-ui/react-icons'
import * as Switch from '@radix-ui/react-switch'
import * as Select from '@radix-ui/react-select'
import * as Tabs from '@radix-ui/react-tabs'
import { API_BASE_URL } from '../config'
import { useAuth } from '../contexts/AuthContext'

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
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
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

  const { data: settings, isLoading: settingsLoading } = useQuery(
    ['settings'],
    async () => {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch settings')
      return response.json()
    },
    { enabled: !!token }
  )

  const updateSettingsMutation = useMutation(
    async (newSettings: Partial<Settings>) => {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      })
      if (!response.ok) throw new Error('Failed to update settings')
      return response.json()
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['settings'])
      },
    }
  )

  const changePasswordMutation = useMutation(
    async (passwordData: typeof passwordForm) => {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordData),
      })
      if (!response.ok) throw new Error('Failed to change password')
      return response.json()
    },
    {
      onSuccess: () => {
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
        setIsChangingPassword(false)
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

  const isLoading = profileLoading || settingsLoading

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Tabs.List className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <Tabs.Trigger
              value="profile"
              className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
            >
              <Icons.PersonIcon className="h-4 w-4 mr-2" />
              Profile
            </Tabs.Trigger>
            <Tabs.Trigger
              value="notifications"
              className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
            >
              <Icons.BellIcon className="h-4 w-4 mr-2" />
              Notifications
            </Tabs.Trigger>
            <Tabs.Trigger
              value="data"
              className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
            >
              <Icons.ArchiveIcon className="h-4 w-4 mr-2" />
              Data & Retention
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="profile" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>

              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <Input
                      type="text"
                      value={profile?.name || ''}
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization
                    </label>
                    <Input
                      type="text"
                      value={profile?.organization || ''}
                      placeholder="Your organization"
                    />
                  </div>

                  <div className="pt-4">
                    <Button>Save Changes</Button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Change Password</h2>

              {!isChangingPassword ? (
                <Button
                  variant="outline"
                  onClick={() => setIsChangingPassword(true)}
                >
                  Change Password
                </Button>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <Input
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isLoading}
                    >
                      {changePasswordMutation.isLoading ? 'Changing...' : 'Change Password'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsChangingPassword(false)
                        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Account Actions</h2>
              <Button
                variant="destructive"
                onClick={logout}
                className="flex items-center gap-2"
              >
                <Icons.ExitIcon className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </Tabs.Content>

          <Tabs.Content value="notifications" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h2>

              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-6 bg-gray-200 rounded w-10"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Email Alerts</label>
                      <p className="text-sm text-gray-500">Receive important notifications via email</p>
                    </div>
                    <Switch.Root
                      checked={settings?.notifications?.email_alerts || false}
                      onCheckedChange={(checked) => handleNotificationChange('email_alerts', checked)}
                      className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-blue-600 outline-none cursor-pointer"
                    >
                      <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 transform data-[state=checked]:translate-x-5 will-change-transform" />
                    </Switch.Root>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Trace Errors</label>
                      <p className="text-sm text-gray-500">Get notified when traces have errors</p>
                    </div>
                    <Switch.Root
                      checked={settings?.notifications?.trace_errors || false}
                      onCheckedChange={(checked) => handleNotificationChange('trace_errors', checked)}
                      className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-blue-600 outline-none cursor-pointer"
                    >
                      <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 transform data-[state=checked]:translate-x-5 will-change-transform" />
                    </Switch.Root>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Performance Alerts</label>
                      <p className="text-sm text-gray-500">Receive alerts for performance issues</p>
                    </div>
                    <Switch.Root
                      checked={settings?.notifications?.performance_alerts || false}
                      onCheckedChange={(checked) => handleNotificationChange('performance_alerts', checked)}
                      className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-blue-600 outline-none cursor-pointer"
                    >
                      <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 transform data-[state=checked]:translate-x-5 will-change-transform" />
                    </Switch.Root>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Weekly Reports</label>
                      <p className="text-sm text-gray-500">Get weekly summary reports</p>
                    </div>
                    <Switch.Root
                      checked={settings?.notifications?.weekly_reports || false}
                      onCheckedChange={(checked) => handleNotificationChange('weekly_reports', checked)}
                      className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-blue-600 outline-none cursor-pointer"
                    >
                      <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 transform data-[state=checked]:translate-x-5 will-change-transform" />
                    </Switch.Root>
                  </div>
                </div>
              )}
            </div>
          </Tabs.Content>

          <Tabs.Content value="data" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Data Retention</h2>

              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-10 bg-gray-200 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Traces Retention (days)</label>
                      <p className="text-sm text-gray-500">How long to keep trace data</p>
                    </div>
                    <Select.Root
                      value={settings?.data_retention?.traces_days?.toString() || '30'}
                      onValueChange={(value) => handleRetentionChange('traces_days', parseInt(value))}
                    >
                      <Select.Trigger className="inline-flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[100px]">
                        <Select.Value />
                        <Select.Icon>
                          <Icons.ChevronDownIcon className="h-4 w-4" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-white border border-gray-200 rounded-md shadow-lg z-50">
                          <Select.Viewport className="p-1">
                            {[7, 14, 30, 60, 90, 180].map((days) => (
                              <Select.Item
                                key={days}
                                value={days.toString()}
                                className="relative flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded data-[highlighted]:bg-blue-100 data-[highlighted]:outline-none"
                              >
                                <Select.ItemText>{days} days</Select.ItemText>
                                <Select.ItemIndicator className="absolute right-2">
                                  <Icons.CheckIcon className="h-4 w-4" />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Metrics Retention (days)</label>
                      <p className="text-sm text-gray-500">How long to keep metrics data</p>
                    </div>
                    <Select.Root
                      value={settings?.data_retention?.metrics_days?.toString() || '90'}
                      onValueChange={(value) => handleRetentionChange('metrics_days', parseInt(value))}
                    >
                      <Select.Trigger className="inline-flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[100px]">
                        <Select.Value />
                        <Select.Icon>
                          <Icons.ChevronDownIcon className="h-4 w-4" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-white border border-gray-200 rounded-md shadow-lg z-50">
                          <Select.Viewport className="p-1">
                            {[30, 60, 90, 180, 365].map((days) => (
                              <Select.Item
                                key={days}
                                value={days.toString()}
                                className="relative flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded data-[highlighted]:bg-blue-100 data-[highlighted]:outline-none"
                              >
                                <Select.ItemText>{days} days</Select.ItemText>
                                <Select.ItemIndicator className="absolute right-2">
                                  <Icons.CheckIcon className="h-4 w-4" />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Sampling Configuration</h2>

              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-6 bg-gray-200 rounded w-10"></div>
                  </div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Enable Sampling</label>
                      <p className="text-sm text-gray-500">Reduce data volume by sampling traces</p>
                    </div>
                    <Switch.Root
                      checked={settings?.sampling?.enabled || false}
                      onCheckedChange={(checked) => handleSamplingChange('enabled', checked)}
                      className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-blue-600 outline-none cursor-pointer"
                    >
                      <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 transform data-[state=checked]:translate-x-5 will-change-transform" />
                    </Switch.Root>
                  </div>

                  {settings?.sampling?.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sampling Rate (%)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={settings?.sampling?.rate || 10}
                        onChange={(e) => handleSamplingChange('rate', parseInt(e.target.value))}
                        className="w-32"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Percentage of traces to keep
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </AppLayout>
  )
}

