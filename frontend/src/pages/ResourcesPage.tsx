import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, Card, Flex, Text, Heading, Badge, Box, Table, Dialog } from '@radix-ui/themes'
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
  const [selectedResource, setSelectedResource] = useState<any>(null)

  const { data: resources = [], isLoading, error } = useQuery(
    'resources',
    async () => {
      return telemetryService.fetchResources(token!)
    },
    {
      enabled: !!token,
    }
  )

  const totalCount = resources.length

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
            <Box style={{ borderBottom: '1px solid var(--gray-6)', paddingBottom: '16px' }}>
              <Heading size="4">
                Resources ({resources.length})
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
            ) : resources.length === 0 ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0', textAlign: 'center' }}>
                <Icons.CubeIcon width="48" height="48" color="var(--gray-8)" />
                <Heading size="4" style={{ marginTop: '16px', marginBottom: '8px' }}>No resources found</Heading>
                <Text color="gray">
                  No resources have been detected yet
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
                  {resources.map((resource: any) => (
                    <Table.Row
                      key={resource.uuid}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedResource(resource)}
                    >
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


        {/* Resource Details Modal */}
        <Dialog.Root open={!!selectedResource} onOpenChange={(open) => !open && setSelectedResource(null)}>
          <Dialog.Content style={{ maxWidth: '600px' }}>
            <Dialog.Title>Resource Details</Dialog.Title>
            {selectedResource && (
              <Flex direction="column" gap="4">
                <Flex direction="column" gap="2">
                  <Text size="2" weight="medium">Service Name</Text>
                  <Text size="3">{selectedResource.service_name}</Text>
                </Flex>

                <Flex direction="column" gap="2">
                  <Text size="2" weight="medium">Resource ID</Text>
                  <Text size="2" style={{ fontFamily: 'monospace', backgroundColor: 'var(--gray-2)', padding: '8px', borderRadius: '4px', wordBreak: 'break-all' }}>
                    {selectedResource.uuid}
                  </Text>
                </Flex>

                <Flex direction="column" gap="2">
                  <Text size="2" weight="medium">Type</Text>
                  <Badge color="blue" variant="soft" style={{ width: 'fit-content' }}>
                    Service
                  </Badge>
                </Flex>

                <Flex direction="column" gap="2">
                  <Text size="2" weight="medium">Attributes</Text>
                  {selectedResource.attributes && Object.keys(selectedResource.attributes).length > 0 ? (
                    <Card style={{ backgroundColor: 'var(--gray-1)' }}>
                      <Flex direction="column" gap="2">
                        {Object.entries(selectedResource.attributes).map(([key, value]) => (
                          <Flex key={key} direction="column" gap="1">
                            <Text size="1" weight="medium" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {key}
                            </Text>
                            <Text size="2" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value)}
                            </Text>
                          </Flex>
                        ))}
                      </Flex>
                    </Card>
                  ) : (
                    <Text size="2" color="gray">No attributes available</Text>
                  )}
                </Flex>

                <Flex direction="column" gap="2">
                  <Text size="2" weight="medium">Created</Text>
                  <Text size="2">{new Date(selectedResource.created_at).toLocaleString()}</Text>
                </Flex>

                <Flex justify="end" gap="2" style={{ marginTop: '16px' }}>
                  <Dialog.Close>
                    <Button variant="outline">Close</Button>
                  </Dialog.Close>
                </Flex>
              </Flex>
            )}
          </Dialog.Content>
        </Dialog.Root>
      </Flex>
    </AppLayout>
  )
}

