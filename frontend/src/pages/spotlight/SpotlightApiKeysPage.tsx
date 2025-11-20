import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Flex, Text, Button, Table, Card, Dialog, TextField, Select, Badge } from '@radix-ui/themes'
import { PlusIcon, TrashIcon, Pencil1Icon } from '@radix-ui/react-icons'
import { AppLayout } from '../../components/layout/AppLayout'
import { useToast } from '../../hooks/useToast'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'

interface ApiKey {
  uuid: string
  key_name: string
  api_key: string
  provider: string
  provider_base_url: string
  status: string
  last_used: string | null
  created_at: string
}

export const SpotlightApiKeysPage: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    key_name: '',
    provider: 'anthropic',
    provider_api_key: '',
    provider_base_url: '',
  })
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const { data: apiKeys, isLoading } = useQuery<{ api_keys: ApiKey[] }>(
    'spotlight-api-keys',
    async () => {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${BACKEND_URL}/spotlight/api_keys`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    }
  )

  const createMutation = useMutation(
    async (data: typeof formData) => {
      const token = localStorage.getItem('token')
      const response = await axios.post(`${BACKEND_URL}/spotlight/api_keys`, data, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('spotlight-api-keys')
        setIsCreateDialogOpen(false)
        setFormData({ key_name: '', provider: 'anthropic', provider_api_key: '', provider_base_url: '' })
        showToast('API key created successfully', 'success')
      },
      onError: (error: any) => {
        showToast(error.response?.data?.error || 'Failed to create API key', 'error')
      }
    }
  )

  const deleteMutation = useMutation(
    async (keyUuid: string) => {
      const token = localStorage.getItem('token')
      await axios.delete(`${BACKEND_URL}/spotlight/api_keys/${keyUuid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('spotlight-api-keys')
        showToast('API key deleted successfully', 'success')
      },
      onError: (error: any) => {
        showToast(error.response?.data?.error || 'Failed to delete API key', 'error')
      }
    }
  )

  const handleCreate = () => {
    createMutation.mutate(formData)
  }

  const handleDelete = (keyUuid: string) => {
    if (window.confirm('Are you sure you want to delete this API key?')) {
      deleteMutation.mutate(keyUuid)
    }
  }

  return (
    <AppLayout>
      <Flex direction="column" gap="4" style={{ padding: '24px' }}>
        <Flex justify="between" align="center">
          <div>
            <Text size="6" weight="bold">API Keys</Text>
            <Text size="2" color="gray">Manage your Spotlight API keys for AI model proxying</Text>
          </div>
          <Dialog.Root open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <Dialog.Trigger>
              <Button>
                <PlusIcon /> Create API Key
              </Button>
            </Dialog.Trigger>
            <Dialog.Content style={{ maxWidth: 450 }}>
              <Dialog.Title>Create API Key</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                Create a new API key to proxy requests to AI model providers.
              </Dialog.Description>

              <Flex direction="column" gap="3">
                <label>
                  <Text as="div" size="2" mb="1" weight="bold">
                    Key Name
                  </Text>
                  <TextField.Root
                    placeholder="My API Key"
                    value={formData.key_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, key_name: e.target.value })
                    }
                  />
                </label>

                <label>
                  <Text as="div" size="2" mb="1" weight="bold">
                    Provider
                  </Text>
                  <Select.Root
                    value={formData.provider}
                    onValueChange={(value) => setFormData({ ...formData, provider: value })}
                  >
                    <Select.Trigger />
                    <Select.Content>
                      <Select.Item value="anthropic">Anthropic</Select.Item>
                      <Select.Item value="openai">OpenAI</Select.Item>
                      <Select.Item value="google">Google</Select.Item>
                      <Select.Item value="custom">Custom</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </label>

                <label>
                  <Text as="div" size="2" mb="1" weight="bold">
                    Provider API Key
                  </Text>
                  <TextField.Root
                    type="password"
                    placeholder="sk-ant-..."
                    value={formData.provider_api_key}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, provider_api_key: e.target.value })
                    }
                  />
                </label>

                {formData.provider === 'custom' && (
                  <label>
                    <Text as="div" size="2" mb="1" weight="bold">
                      Provider Base URL
                    </Text>
                    <TextField.Root
                      placeholder="https://api.example.com"
                      value={formData.provider_base_url}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, provider_base_url: e.target.value })
                      }
                    />
                  </label>
                )}
              </Flex>

              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button onClick={handleCreate} disabled={createMutation.isLoading}>
                  Create
                </Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>

        <Card>
          {isLoading ? (
            <Text>Loading...</Text>
          ) : apiKeys?.api_keys.length === 0 ? (
            <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
              <Text size="3" color="gray">No API keys yet</Text>
              <Text size="2" color="gray">Create your first API key to get started</Text>
            </Flex>
          ) : (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>API Key</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Last Used</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {apiKeys?.api_keys.map((key) => (
                  <Table.Row key={key.uuid}>
                    <Table.Cell>{key.key_name}</Table.Cell>
                    <Table.Cell>
                      <Badge>{key.provider}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <code style={{ fontSize: '12px' }}>{key.api_key.slice(0, 20)}...</code>
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
                        onClick={() => handleDelete(key.uuid)}
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
    </AppLayout>
  )
}
