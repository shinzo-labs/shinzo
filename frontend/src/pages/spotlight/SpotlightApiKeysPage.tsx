import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Flex,
  Text,
  Button,
  Table,
  Card,
  Dialog,
  TextField,
  Select,
  Badge,
  Tabs,
  Code,
  Callout,
  Separator
} from '@radix-ui/themes'
import { PlusIcon, TrashIcon, CheckIcon, Cross2Icon, CopyIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { AppLayout } from '../../components/layout/AppLayout'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'

interface ShinzoApiKey {
  uuid: string
  key_name: string
  api_key: string
  key_prefix: string
  key_type: 'live' | 'test'
  status: 'active' | 'inactive' | 'revoked'
  last_used: string | null
  created_at: string
}

interface ProviderKey {
  uuid: string
  provider: string
  provider_base_url: string
  label: string | null
  key_prefix: string
  status: 'active' | 'inactive' | 'revoked'
  last_used: string | null
  last_validated: string | null
  created_at: string
}

export const SpotlightApiKeysPage: React.FC = () => {
  const [isCreateShinzoKeyOpen, setIsCreateShinzoKeyOpen] = useState(false)
  const [isCreateProviderKeyOpen, setIsCreateProviderKeyOpen] = useState(false)
  const [shinzoKeyForm, setShinzoKeyForm] = useState({
    key_name: '',
    key_type: 'live' as 'live' | 'test'
  })
  const [providerKeyForm, setProviderKeyForm] = useState({
    provider: 'anthropic',
    provider_api_key: '',
    provider_base_url: '',
    label: ''
  })
  const [testingKey, setTestingKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const { showToast } = useToast()
  const { token } = useAuth()
  const queryClient = useQueryClient()

  // ============================================================================
  // Shinzo API Keys Queries
  // ============================================================================

  const { data: shinzoKeys, isLoading: loadingShinzoKeys } = useQuery<{ shinzo_api_keys: ShinzoApiKey[] }>(
    'spotlight-shinzo-keys',
    async () => {
      const response = await axios.get(`${BACKEND_URL}/spotlight/shinzo_keys`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    },
    { retry: false }
  )

  const createShinzoKeyMutation = useMutation(
    async (data: typeof shinzoKeyForm) => {
      const response = await axios.post(`${BACKEND_URL}/spotlight/shinzo_keys`, data, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('spotlight-shinzo-keys')
        setIsCreateShinzoKeyOpen(false)
        setShinzoKeyForm({ key_name: '', key_type: 'live' })
        showToast('Shinzo API key created successfully', 'success')
      },
      onError: (error: any) => {
        showToast(error.response?.data?.error || 'Failed to create Shinzo API key', 'error')
      }
    }
  )

  const deleteShinzoKeyMutation = useMutation(
    async (keyUuid: string) => {
      await axios.delete(`${BACKEND_URL}/spotlight/shinzo_keys/${keyUuid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('spotlight-shinzo-keys')
        showToast('Shinzo API key deleted successfully', 'success')
      },
      onError: (error: any) => {
        showToast(error.response?.data?.error || 'Failed to delete Shinzo API key', 'error')
      }
    }
  )

  // ============================================================================
  // Provider Keys Queries
  // ============================================================================

  const { data: providerKeys, isLoading: loadingProviderKeys } = useQuery<{ provider_keys: ProviderKey[] }>(
    'spotlight-provider-keys',
    async () => {
      const response = await axios.get(`${BACKEND_URL}/spotlight/provider_keys`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    },
    { retry: false }
  )

  const testProviderKeyMutation = useMutation(
    async (data: { provider: string; provider_api_key: string; provider_base_url?: string }) => {
      const response = await axios.post(`${BACKEND_URL}/spotlight/provider_keys/test`, data)
      return response.data
    },
    {
      onSuccess: (data) => {
        if (data.success) {
          showToast('Provider key is valid!', 'success')
        } else {
          showToast(data.message || 'Provider key is invalid', 'error')
        }
      },
      onError: () => {
        showToast('Failed to test provider key', 'error')
      }
    }
  )

  const createProviderKeyMutation = useMutation(
    async (data: typeof providerKeyForm) => {
      const response = await axios.post(`${BACKEND_URL}/spotlight/provider_keys`, data, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('spotlight-provider-keys')
        setIsCreateProviderKeyOpen(false)
        setProviderKeyForm({ provider: 'anthropic', provider_api_key: '', provider_base_url: '', label: '' })
        showToast('Provider key created successfully', 'success')
      },
      onError: (error: any) => {
        showToast(error.response?.data?.error || 'Failed to create provider key', 'error')
      }
    }
  )

  const deleteProviderKeyMutation = useMutation(
    async (keyUuid: string) => {
      await axios.delete(`${BACKEND_URL}/spotlight/provider_keys/${keyUuid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('spotlight-provider-keys')
        showToast('Provider key deleted successfully', 'success')
      },
      onError: (error: any) => {
        showToast(error.response?.data?.error || 'Failed to delete provider key', 'error')
      }
    }
  )

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleTestProviderKey = async () => {
    setTestingKey(true)
    try {
      await testProviderKeyMutation.mutateAsync({
        provider: providerKeyForm.provider,
        provider_api_key: providerKeyForm.provider_api_key,
        provider_base_url: providerKeyForm.provider_base_url || undefined
      })
    } finally {
      setTestingKey(false)
    }
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
    showToast('Copied to clipboard!', 'success')
  }

  return (
    <AppLayout>
      <Flex direction="column" gap="4" style={{ padding: '24px' }}>
        <Flex direction="column" gap="2">
          <Text size="6" weight="bold">API Keys</Text>
          <Text size="2" color="gray">
            Manage your Shinzo API keys and provider keys for AI model proxying
          </Text>
        </Flex>

        <Tabs.Root defaultValue="setup">
          <Tabs.List>
            <Tabs.Trigger value="setup">Setup Guide</Tabs.Trigger>
            <Tabs.Trigger value="shinzo-keys">
              Shinzo API Keys
              {shinzoKeys && shinzoKeys.shinzo_api_keys.length > 0 && (
                <Badge ml="2" size="1">{shinzoKeys.shinzo_api_keys.length}</Badge>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="provider-keys">
              Provider Keys
              {providerKeys && providerKeys.provider_keys.length > 0 && (
                <Badge ml="2" size="1">{providerKeys.provider_keys.length}</Badge>
              )}
            </Tabs.Trigger>
          </Tabs.List>

          {/* Setup Guide Tab */}
          <Tabs.Content value="setup">
            <Card mt="4">
              <Flex direction="column" gap="4" p="4">
                <Text size="5" weight="bold">Getting Started with Shinzo Spotlight</Text>

                <Callout.Root color="blue">
                  <Callout.Icon>
                    <InfoCircledIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    Shinzo Spotlight lets you track and analyze all your AI agent requests through a secure proxy.
                  </Callout.Text>
                </Callout.Root>

                <Separator size="4" />

                <Flex direction="column" gap="3">
                  <Text size="4" weight="bold">Step 1: Add Your Provider API Key</Text>
                  <Text size="2" color="gray">
                    First, securely store your AI provider's API key (e.g., Anthropic, OpenAI) in Shinzo.
                    We encrypt it with AES-256-GCM for maximum security.
                  </Text>
                  <Button
                    onClick={() => setIsCreateProviderKeyOpen(true)}
                    style={{ width: 'fit-content' }}
                  >
                    <PlusIcon /> Add Provider Key
                  </Button>
                </Flex>

                <Separator size="4" />

                <Flex direction="column" gap="3">
                  <Text size="4" weight="bold">Step 2: Generate a Shinzo API Key</Text>
                  <Text size="2" color="gray">
                    Create a Shinzo API key to use in your applications. This key authenticates your requests
                    to the Shinzo proxy.
                  </Text>
                  <Button
                    onClick={() => setIsCreateShinzoKeyOpen(true)}
                    style={{ width: 'fit-content' }}
                  >
                    <PlusIcon /> Generate Shinzo API Key
                  </Button>
                </Flex>

                <Separator size="4" />

                <Flex direction="column" gap="3">
                  <Text size="4" weight="bold">Step 3: Update Your Application</Text>
                  <Text size="2" color="gray">
                    Configure your AI application to use Shinzo's proxy endpoint:
                  </Text>
                  <Card style={{ background: 'var(--gray-2)' }}>
                    <Flex direction="column" gap="2">
                      <Text size="2" weight="bold">For Anthropic Claude:</Text>
                      <Code size="2">
                        export ANTHROPIC_BASE_URL="https://api.app.shinzo.ai/spotlight/anthropic"
                      </Code>
                      <Code size="2">
                        export ANTHROPIC_API_KEY="sk_shinzo_live_..."
                      </Code>
                    </Flex>
                  </Card>
                  <Card style={{ background: 'var(--gray-2)' }}>
                    <Flex direction="column" gap="2">
                      <Text size="2" weight="bold">For OpenAI:</Text>
                      <Code size="2">
                        export OPENAI_BASE_URL="https://api.app.shinzo.ai/spotlight/openai"
                      </Code>
                      <Code size="2">
                        export OPENAI_API_KEY="sk_shinzo_live_..."
                      </Code>
                    </Flex>
                  </Card>
                </Flex>

                <Callout.Root color="green">
                  <Callout.Icon>
                    <CheckIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    That's it! Your AI requests will now be tracked and analyzed in the Shinzo dashboard.
                  </Callout.Text>
                </Callout.Root>
              </Flex>
            </Card>
          </Tabs.Content>

          {/* Shinzo Keys Tab */}
          <Tabs.Content value="shinzo-keys">
            <Flex direction="column" gap="4" mt="4">
              <Flex justify="between" align="center">
                <Text size="3">Your Shinzo API keys for authenticating with the proxy</Text>
                <Dialog.Root open={isCreateShinzoKeyOpen} onOpenChange={setIsCreateShinzoKeyOpen}>
                  <Dialog.Trigger>
                    <Button>
                      <PlusIcon /> Create Shinzo API Key
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Content style={{ maxWidth: 450 }}>
                    <Dialog.Title>Create Shinzo API Key</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                      Generate a new Shinzo API key to use in your applications.
                    </Dialog.Description>

                    <Flex direction="column" gap="3">
                      <label>
                        <Text as="div" size="2" mb="1" weight="bold">
                          Key Name
                        </Text>
                        <TextField.Root
                          placeholder="Production Key"
                          value={shinzoKeyForm.key_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setShinzoKeyForm({ ...shinzoKeyForm, key_name: e.target.value })
                          }
                        />
                      </label>

                      <label>
                        <Text as="div" size="2" mb="1" weight="bold">
                          Key Type
                        </Text>
                        <Select.Root
                          value={shinzoKeyForm.key_type}
                          onValueChange={(value: 'live' | 'test') =>
                            setShinzoKeyForm({ ...shinzoKeyForm, key_type: value })
                          }
                        >
                          <Select.Trigger />
                          <Select.Content>
                            <Select.Item value="live">Live</Select.Item>
                            <Select.Item value="test">Test</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      </label>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                      <Dialog.Close>
                        <Button variant="soft" color="gray">Cancel</Button>
                      </Dialog.Close>
                      <Button
                        onClick={() => createShinzoKeyMutation.mutate(shinzoKeyForm)}
                        disabled={createShinzoKeyMutation.isLoading || !shinzoKeyForm.key_name}
                      >
                        Create
                      </Button>
                    </Flex>
                  </Dialog.Content>
                </Dialog.Root>
              </Flex>

              <Card>
                {loadingShinzoKeys ? (
                  <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
                    <Text>Loading...</Text>
                  </Flex>
                ) : !shinzoKeys || shinzoKeys.shinzo_api_keys.length === 0 ? (
                  <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
                    <Text size="3" color="gray">No Shinzo API keys yet</Text>
                    <Text size="2" color="gray">Create your first key to get started</Text>
                  </Flex>
                ) : (
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>API Key</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Last Used</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {shinzoKeys.shinzo_api_keys.map((key) => (
                        <Table.Row key={key.uuid}>
                          <Table.Cell>{key.key_name}</Table.Cell>
                          <Table.Cell>
                            <Flex align="center" gap="2">
                              <Code size="1">{key.key_prefix}...</Code>
                              <Button
                                size="1"
                                variant="ghost"
                                onClick={() => handleCopyKey(key.api_key)}
                              >
                                {copiedKey === key.api_key ? <CheckIcon /> : <CopyIcon />}
                              </Button>
                            </Flex>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge color={key.key_type === 'live' ? 'blue' : 'gray'}>
                              {key.key_type}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge color={key.status === 'active' ? 'green' : 'gray'}>
                              {key.status}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            {key.last_used ? new Date(key.last_used).toLocaleString() : 'Never'}
                          </Table.Cell>
                          <Table.Cell>
                            <Button
                              size="1"
                              variant="soft"
                              color="red"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this Shinzo API key?')) {
                                  deleteShinzoKeyMutation.mutate(key.uuid)
                                }
                              }}
                            >
                              <TrashIcon />
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}
              </Card>
            </Flex>
          </Tabs.Content>

          {/* Provider Keys Tab */}
          <Tabs.Content value="provider-keys">
            <Flex direction="column" gap="4" mt="4">
              <Flex justify="between" align="center">
                <Text size="3">Securely stored API keys for AI providers</Text>
                <Dialog.Root open={isCreateProviderKeyOpen} onOpenChange={setIsCreateProviderKeyOpen}>
                  <Dialog.Trigger>
                    <Button>
                      <PlusIcon /> Add Provider Key
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Content style={{ maxWidth: 450 }}>
                    <Dialog.Title>Add Provider Key</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                      Add your AI provider's API key. It will be encrypted and stored securely.
                    </Dialog.Description>

                    <Flex direction="column" gap="3">
                      <label>
                        <Text as="div" size="2" mb="1" weight="bold">Provider</Text>
                        <Select.Root
                          value={providerKeyForm.provider}
                          onValueChange={(value) =>
                            setProviderKeyForm({ ...providerKeyForm, provider: value })
                          }
                        >
                          <Select.Trigger />
                          <Select.Content>
                            <Select.Item value="anthropic">Anthropic</Select.Item>
                            <Select.Item value="openai">OpenAI</Select.Item>
                            <Select.Item value="google">Google</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      </label>

                      <label>
                        <Text as="div" size="2" mb="1" weight="bold">Provider API Key</Text>
                        <TextField.Root
                          type="password"
                          placeholder="sk-ant-..."
                          value={providerKeyForm.provider_api_key}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setProviderKeyForm({ ...providerKeyForm, provider_api_key: e.target.value })
                          }
                        />
                      </label>

                      <label>
                        <Text as="div" size="2" mb="1" weight="bold">
                          Label (optional)
                        </Text>
                        <TextField.Root
                          placeholder="Production"
                          value={providerKeyForm.label}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setProviderKeyForm({ ...providerKeyForm, label: e.target.value })
                          }
                        />
                      </label>

                      <Button
                        variant="soft"
                        onClick={handleTestProviderKey}
                        disabled={testingKey || !providerKeyForm.provider_api_key}
                      >
                        {testingKey ? 'Testing...' : 'Test Connection'}
                      </Button>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                      <Dialog.Close>
                        <Button variant="soft" color="gray">Cancel</Button>
                      </Dialog.Close>
                      <Button
                        onClick={() => createProviderKeyMutation.mutate(providerKeyForm)}
                        disabled={createProviderKeyMutation.isLoading || !providerKeyForm.provider_api_key}
                      >
                        Add Key
                      </Button>
                    </Flex>
                  </Dialog.Content>
                </Dialog.Root>
              </Flex>

              <Card>
                {loadingProviderKeys ? (
                  <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
                    <Text>Loading...</Text>
                  </Flex>
                ) : !providerKeys || providerKeys.provider_keys.length === 0 ? (
                  <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
                    <Text size="3" color="gray">No provider keys yet</Text>
                    <Text size="2" color="gray">Add a provider key to enable AI model proxying</Text>
                  </Flex>
                ) : (
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Label</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Key Preview</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Last Used</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {providerKeys.provider_keys.map((key) => (
                        <Table.Row key={key.uuid}>
                          <Table.Cell>
                            <Badge>{key.provider}</Badge>
                          </Table.Cell>
                          <Table.Cell>{key.label || '-'}</Table.Cell>
                          <Table.Cell>
                            <Code size="1">{key.key_prefix}...</Code>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge color={key.status === 'active' ? 'green' : 'gray'}>
                              {key.status}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            {key.last_used ? new Date(key.last_used).toLocaleString() : 'Never'}
                          </Table.Cell>
                          <Table.Cell>
                            <Button
                              size="1"
                              variant="soft"
                              color="red"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this provider key?')) {
                                  deleteProviderKeyMutation.mutate(key.uuid)
                                }
                              }}
                            >
                              <TrashIcon />
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}
              </Card>
            </Flex>
          </Tabs.Content>
        </Tabs.Root>
      </Flex>
    </AppLayout>
  )
}
