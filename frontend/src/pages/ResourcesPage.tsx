import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, TextField, Card, Flex, Text, Heading, Badge, Select, Box, Table } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../contexts/AuthContext'
import { telemetryService } from '../backendService'

interface Resource {
  id: string
  name: string
  type: string
  attributes: Record<string, any>
  created_at: string
  updated_at: string
}

export const ResourcesPage: React.FC = () => {
  const { token } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const { data: resources = [], isLoading, error } = useQuery(
    ['resources', searchTerm, selectedType, currentPage],
    async () => {
      return telemetryService.fetchResources(token!)
    },
    {
      enabled: !!token,
      keepPreviousData: true,
    }
  )

  const filteredResources = resources.filter((resource: any) => {
    if (searchTerm && !resource.service_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    return true
  })
  const totalCount = filteredResources.length
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const resourceTypes = ['all', 'service', 'host', 'container', 'database', 'queue', 'other']

  const formatAttributes = (attributes: Record<string, any> | null | undefined) => {
    if (!attributes || typeof attributes !== 'object') {
      return 'No attributes'
    }

    const entries = Object.entries(attributes)
    if (entries.length === 0) {
      return 'No attributes'
    }

    return entries
      .slice(0, 3)
      .map(([key, value]) => {
        // Handle cases where value might be an object, array, or other complex type
        const displayValue = typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : String(value)
        return `${key}: ${displayValue}`
      })
      .join(', ')
  }

  const handleSearch = () => {
    setCurrentPage(1)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        <Flex justify="between" align="center">
          <Heading size="6">Resources</Heading>
          <Text size="2" color="gray">
            {totalCount} total resources
          </Text>
        </Flex>

        <Card>
          <Flex direction="column" gap="4">
            <Text size="3" weight="medium">Search Resources</Text>
            <Flex gap="4" align="end" wrap="wrap">
              <Flex direction="column" gap="2" style={{ flex: 1, minWidth: '300px' }}>
                <Text size="2" weight="medium">Search</Text>
                <TextField.Root
                  placeholder="Search resources by name or attributes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                >
                  <TextField.Slot>
                    <Icons.MagnifyingGlassIcon height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Flex>

              <Flex direction="column" gap="2" style={{ minWidth: '140px' }}>
                <Text size="2" weight="medium">Type</Text>
                <Select.Root value={selectedType} onValueChange={setSelectedType}>
                  <Select.Trigger placeholder="Select type" style={{ width: '100%' }} />
                  <Select.Content>
                    {resourceTypes.map((type) => (
                      <Select.Item key={type} value={type}>
                        {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>

              <Button onClick={handleSearch}>
                <Icons.MagnifyingGlassIcon />
                Search
              </Button>
            </Flex>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="4">
            <Box style={{ borderBottom: '1px solid var(--gray-6)', paddingBottom: '16px' }}>
              <Heading size="4">
                Resources ({filteredResources.length})
              </Heading>
            </Box>

            {isLoading ? (
              <Flex justify="center" align="center" style={{ padding: '48px 0' }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderBottomColor: 'rgb(92, 122, 255)'}}></div>
              </Flex>
            ) : error ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0', textAlign: 'center' }}>
                <Icons.ExclamationTriangleIcon width="48" height="48" color="var(--red-9)" />
                <Heading size="4" style={{ marginTop: '16px', marginBottom: '8px' }}>Error loading resources</Heading>
                <Text color="gray">Please try again later</Text>
              </Flex>
            ) : filteredResources.length === 0 ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0', textAlign: 'center' }}>
                <Icons.CubeIcon width="48" height="48" color="var(--gray-8)" />
                <Heading size="4" style={{ marginTop: '16px', marginBottom: '8px' }}>No resources found</Heading>
                <Text color="gray">
                  {searchTerm || selectedType !== 'all'
                    ? 'Try adjusting your search criteria'
                    : 'No resources have been detected yet'}
                </Text>
              </Flex>
            ) : (
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Attributes</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredResources.map((resource: any) => (
                    <Table.Row key={resource.uuid}>
                      <Table.RowHeaderCell>
                        <Flex direction="column" gap="1">
                          <Text size="2" weight="medium">{resource.service_name}</Text>
                          <Text size="1" color="gray">ID: {resource.uuid}</Text>
                        </Flex>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <Badge color="blue" variant="soft">
                          Service
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Flex direction="column" gap="1">
                          <Text size="2" style={{ maxWidth: '300px' }} truncate>
                            {formatAttributes(resource.attributes)}
                          </Text>
                          {Object.keys(resource.attributes || {}).length > 3 && (
                            <Text size="1" color="gray">
                              +{Object.keys(resource.attributes || {}).length - 3} more
                            </Text>
                          )}
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">
                          {new Date(resource.created_at).toLocaleDateString()}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Flex>
        </Card>

        {totalPages > 1 && (
          <Card>
            <Flex justify="between" align="center">
              <Text size="2" color="gray">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results
              </Text>
              <Flex align="center" gap="2">
                <Button
                  variant="ghost"
                  size="1"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <Icons.ChevronLeftIcon />
                  Previous
                </Button>
                <Text size="2" color="gray">
                  Page {currentPage} of {totalPages}
                </Text>
                <Button
                  variant="ghost"
                  size="1"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <Icons.ChevronRightIcon />
                </Button>
              </Flex>
            </Flex>
          </Card>
        )}
      </Flex>
    </AppLayout>
  )
}

