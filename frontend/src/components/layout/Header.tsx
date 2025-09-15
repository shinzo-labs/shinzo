import React, { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../../contexts/AuthContext'
import { DEFAULT_TIME_RANGE } from '../../config'

const timeRanges = [
  { label: 'Last 15 minutes', value: '15m' },
  { label: 'Last 1 hour', value: '1h' },
  { label: 'Last 6 hours', value: '6h' },
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Custom', value: 'custom' },
]

export const Header: React.FC = () => {
  const { user, logout } = useAuth()
  const [selectedTimeRange, setSelectedTimeRange] = useState(DEFAULT_TIME_RANGE)
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogout = () => {
    logout()
  }

  return (
    <header className="header">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Global search */}
        <div className="flex flex-1 items-center">
          <div className="relative w-full max-w-md">
            <Icons.MagnifyingGlassIcon className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400 pl-3" />
            <input
              type="search"
              placeholder="Search traces, spans, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block h-10 w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-x-1 text-sm font-medium text-gray-700 hover:text-gray-900">
                <Icons.ClockIcon className="h-4 w-4" />
                {timeRanges.find(range => range.value === selectedTimeRange)?.label || 'Last 1 hour'}
                <Icons.ChevronDownIcon className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-50"
                sideOffset={5}
              >
                {timeRanges.map((range) => (
                  <DropdownMenu.Item
                    key={range.value}
                    className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100"
                    onSelect={() => setSelectedTimeRange(range.value)}
                  >
                    {range.label}
                    {selectedTimeRange === range.value && (
                      <Icons.CheckIcon className="ml-auto h-4 w-4" />
                    )}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* System status indicator */}
          <div className="flex items-center">
            <div className="h-2 w-2 bg-green-400 rounded-full"></div>
            <span className="ml-2 text-sm text-gray-600">All systems operational</span>
          </div>
        </div>

        {/* User menu */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-x-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden lg:block">{user?.email}</span>
                <Icons.ChevronDownIcon className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-50"
                sideOffset={5}
                align="end"
              >
                <DropdownMenu.Label className="px-2 py-2 text-sm font-medium text-gray-700">
                  {user?.email}
                </DropdownMenu.Label>
                <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />
                <DropdownMenu.Item className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100">
                  <Icons.PersonIcon className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100">
                  <Icons.GearIcon className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100">
                  <Icons.QuestionMarkCircledIcon className="mr-2 h-4 w-4" />
                  Help & Documentation
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 text-red-600"
                  onSelect={handleLogout}
                >
                  <Icons.ExitIcon className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  )
}