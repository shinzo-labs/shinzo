import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import * as Icons from '@radix-ui/react-icons'
import * as Select from '@radix-ui/react-select'
import { API_BASE_URL } from '../config'
import { useAuth } from '../contexts/AuthContext'

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

  const { data: resourcesData, isLoading, error } = useQuery(
    ['resources', searchTerm, selectedType, currentPage],
    async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      })

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      if (selectedType !== 'all') {
        params.append('type', selectedType)
      }

      const response = await fetch(
        `${API_BASE_URL}/api/resources?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch resources')
      }

      return response.json()
    },
    {
      enabled: !!token,
      keepPreviousData: true,
    }
  )

  const resources = resourcesData?.data || []
  const totalCount = resourcesData?.total || 0
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const resourceTypes = ['all', 'service', 'host', 'container', 'database', 'queue', 'other']

  const formatAttributes = (attributes: Record<string, any>) => {
    return Object.entries(attributes)
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${value}`)
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
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
          <div className="text-sm text-gray-500">
            {totalCount} total resources
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Icons.MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search resources by name or attributes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select.Root value={selectedType} onValueChange={setSelectedType}>
                <Select.Trigger className="inline-flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]">
                  <Select.Value />
                  <Select.Icon>
                    <Icons.ChevronDownIcon className="h-4 w-4" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <Select.Viewport className="p-1">
                      {resourceTypes.map((type) => (
                        <Select.Item
                          key={type}
                          value={type}
                          className="relative flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded data-[highlighted]:bg-blue-100 data-[highlighted]:outline-none"
                        >
                          <Select.ItemText>
                            {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                          </Select.ItemText>
                          <Select.ItemIndicator className="absolute right-2">
                            <Icons.CheckIcon className="h-4 w-4" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              <Button onClick={handleSearch} className="flex items-center gap-2">
                <Icons.MagnifyingGlassIcon className="h-4 w-4" />
                Search
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Icons.ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading resources</h3>
                  <p className="text-gray-500">Please try again later</p>
                </div>
              </div>
            ) : resources.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Icons.CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
                  <p className="text-gray-500">
                    {searchTerm || selectedType !== 'all'
                      ? 'Try adjusting your search criteria'
                      : 'No resources have been detected yet'}
                  </p>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attributes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {resources.map((resource: Resource) => (
                    <tr key={resource.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {resource.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {resource.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {resource.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {formatAttributes(resource.attributes)}
                        </div>
                        {Object.keys(resource.attributes).length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{Object.keys(resource.attributes).length - 3} more
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(resource.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <Icons.ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <Icons.ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

