import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import * as Icons from '@radix-ui/react-icons'
import { clsx } from 'clsx'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Icons.DashboardIcon,
  },
  {
    name: 'Traces',
    href: '/traces',
    icon: Icons.ActivityLogIcon,
  },
  {
    name: 'Spans',
    href: '/spans',
    icon: Icons.LayersIcon,
  },
  {
    name: 'Metrics',
    href: '/metrics',
    icon: Icons.BarChartIcon,
  },
  {
    name: 'Resources',
    href: '/resources',
    icon: Icons.ComponentInstanceIcon,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Icons.GearIcon,
  },
]

export const Sidebar: React.FC = () => {
  const location = useLocation()

  return (
    <aside className="sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center px-4">
          <div className="flex items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <span className="ml-2 text-lg font-bold text-white">Shinzo</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col px-4 pb-4">
          <ul className="flex flex-1 flex-col space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon

              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={clsx(
                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors',
                      isActive
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {item.name}
                    {item.name === 'Traces' && (
                      <span className="ml-auto w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-xs text-white">
                        2
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </aside>
  )
}