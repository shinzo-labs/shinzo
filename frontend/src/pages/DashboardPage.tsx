import React from 'react'
import { useQuery } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import * as Icons from '@radix-ui/react-icons'
import { API_BASE_URL } from '../config'
import { useAuth } from '../contexts/AuthContext'

interface DashboardStats {
  totalTraces: number
  activeServices: number
  errorRate: number
  avgResponseTime: number
}

export const DashboardPage: React.FC = () => {
  const { token } = useAuth()

  // Fetch dashboard stats (simulated since we don't have aggregation endpoints)
  const { data: resources = [], isLoading: resourcesLoading } = useQuery(
    'resources',
    async () => {
      const response = await fetch(`${API_BASE_URL}/telemetry/fetch_resources`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch resources')
      return response.json()
    },
    { enabled: !!token }
  )

  // Mock stats since we don't have aggregation endpoints yet
  const stats: DashboardStats = {
    totalTraces: 0, // Would come from aggregated traces data
    activeServices: resources.length,
    errorRate: 0, // Would be calculated from trace status
    avgResponseTime: 0, // Would be calculated from span durations
  }

  const statCards = [
    {
      title: 'Total Traces',
      value: stats.totalTraces.toLocaleString(),
      subtitle: 'Last 24 hours',
      icon: Icons.ActivityLogIcon,
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Active Services',
      value: stats.activeServices.toString(),
      subtitle: 'Currently running',
      icon: Icons.ComponentInstanceIcon,
      trend: '+2',
      trendUp: true,
    },
    {
      title: 'Error Rate',
      value: `${stats.errorRate.toFixed(2)}%`,
      subtitle: 'Last 24 hours',
      icon: Icons.ExclamationTriangleIcon,
      trend: '-0.5%',
      trendUp: false,
    },
    {
      title: 'Avg Response Time',
      value: `${stats.avgResponseTime}ms`,
      subtitle: 'Last 24 hours',
      icon: Icons.ClockIcon,
      trend: '-15ms',
      trendUp: false,
    },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              Overview of your telemetry data and system health
            </p>
          </div>
          <Button variant="outline">
            <Icons.ReloadIcon className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Quick stats cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.title}
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-500">{stat.subtitle}</p>
                  <span
                    className={`text-sm font-medium ${
                      stat.trendUp ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {stat.trend}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Service overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Services list */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Services</h3>
              <p className="text-sm text-gray-500">Active services and their status</p>
            </div>
            <div className="p-6">
              {resourcesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="loading-skeleton h-16 rounded"></div>
                  ))}
                </div>
              ) : resources.length > 0 ? (
                <div className="space-y-4">
                  {resources.slice(0, 5).map((resource: any) => (
                    <div key={resource.uuid} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {resource.service_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {resource.service_version || 'No version'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          Last seen: {new Date(resource.last_seen).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {resources.length > 5 && (
                    <Button variant="ghost" className="w-full mt-4">
                      View all {resources.length} services
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Icons.ComponentInstanceIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">No services found</p>
                  <p className="text-xs text-gray-500">
                    Services will appear here once telemetry data is ingested
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              <p className="text-sm text-gray-500">Latest traces and system events</p>
            </div>
            <div className="p-6">
              <div className="text-center py-8">
                <Icons.ActivityLogIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">No recent activity</p>
                <p className="text-xs text-gray-500">
                  Activity will appear here once traces are received
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start">
              <Icons.PlusIcon className="mr-2 h-4 w-4" />
              Generate Ingest Token
            </Button>
            <Button variant="outline" className="justify-start">
              <Icons.FileTextIcon className="mr-2 h-4 w-4" />
              View Documentation
            </Button>
            <Button variant="outline" className="justify-start">
              <Icons.DownloadIcon className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}