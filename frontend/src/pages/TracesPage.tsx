import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import * as Icons from '@radix-ui/react-icons'
import * as Select from '@radix-ui/react-select'
import { API_BASE_URL, DEFAULT_TIME_RANGE } from '../config'
import { useAuth } from '../contexts/AuthContext'
import { format, subHours, subDays } from 'date-fns'

interface Trace {
  uuid: string
  start_time: string
  end_time: string | null
  service_name: string
  operation_name: string | null
  status: string | null
  span_count: number
  duration_ms: number | null
}

export const TracesPage: React.FC = () => {
  const { token } = useAuth()
  const [timeRange, setTimeRange] = useState(DEFAULT_TIME_RANGE)
  const [serviceFilter, setServiceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Calculate time range
  const getTimeRange = () => {
    const end = new Date()
    let start = new Date()

    switch (timeRange) {
      case '15m':
        start = new Date(end.getTime() - 15 * 60 * 1000)
        break
      case '1h':
        start = subHours(end, 1)
        break
      case '6h':
        start = subHours(end, 6)
        break
      case '24h':
        start = subHours(end, 24)
        break
      case '7d':
        start = subDays(end, 7)
        break
      default:
        start = subHours(end, 1)
    }

    return {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    }
  }

  // Fetch traces
  const { data: traces = [], isLoading, error } = useQuery(
    ['traces', timeRange, serviceFilter, statusFilter],
    async () => {
      const timeParams = getTimeRange()
      const params = new URLSearchParams(timeParams)

      const response = await fetch(`${API_BASE_URL}/telemetry/fetch_traces?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch traces')
      return response.json()
    },
    { enabled: !!token }
  )

  // Filter traces based on selected filters
  const filteredTraces = traces.filter((trace: Trace) => {
    if (serviceFilter && !trace.service_name.toLowerCase().includes(serviceFilter.toLowerCase())) {
      return false
    }
    if (statusFilter && trace.status !== statusFilter) {
      return false
    }
    return true
  })

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'ok', label: 'Success' },
    { value: 'error', label: 'Error' },
    { value: 'timeout', label: 'Timeout' },
  ]

  const timeRangeOptions = [
    { value: '15m', label: 'Last 15 minutes' },
    { value: '1h', label: 'Last 1 hour' },
    { value: '6h', label: 'Last 6 hours' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Traces</h1>
            <p className="text-gray-600">
              Distributed tracing analysis and visualization
            </p>
          </div>
          <Button variant="outline">
            <Icons.ReloadIcon className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Time range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Range
              </label>
              <Select.Root value={timeRange} onValueChange={setTimeRange}>
                <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <Select.Value />
                  <Select.Icon>
                    <Icons.ChevronDownIcon />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <Select.Viewport className="p-1">
                      {timeRangeOptions.map((option) => (
                        <Select.Item
                          key={option.value}
                          value={option.value}
                          className="relative flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100"
                        >
                          <Select.ItemText>{option.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Service filter */}
            <div>
              <Input
                label="Service"
                placeholder="Filter by service name"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              />
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
                <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <Select.Value placeholder="All statuses" />
                  <Select.Icon>
                    <Icons.ChevronDownIcon />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <Select.Viewport className="p-1">
                      {statusOptions.map((option) => (
                        <Select.Item
                          key={option.value}
                          value={option.value}
                          className="relative flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100"
                        >
                          <Select.ItemText>{option.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Clear filters */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setServiceFilter('')
                  setStatusFilter('')
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Traces table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Traces ({filteredTraces.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="p-6">
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="loading-skeleton h-16 rounded"></div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <Icons.ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
              <p className="mt-2 text-sm text-red-600">Failed to load traces</p>
            </div>
          ) : filteredTraces.length === 0 ? (
            <div className="p-6 text-center">
              <Icons.ActivityLogIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">No traces found</p>
              <p className="text-xs text-gray-500">
                Try adjusting your filters or time range
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Spans
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTraces.map((trace: Trace) => (
                    <tr key={trace.uuid} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(trace.start_time), 'HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trace.service_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trace.operation_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trace.duration_ms ? `${trace.duration_ms}ms` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            trace.status === 'ok'
                              ? 'bg-green-100 text-green-800'
                              : trace.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {trace.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trace.span_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}