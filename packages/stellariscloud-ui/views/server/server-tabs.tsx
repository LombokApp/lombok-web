import {
  BoltIcon,
  CircleStackIcon,
  Cog8ToothIcon,
  ServerIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import React from 'react'

export function ServerTabs({ activeTab }: { activeTab: string }) {
  const tabs = [
    { name: 'info', label: 'Info', icon: ServerIcon, href: '/server' },
    {
      name: 'users',
      label: 'Users',
      icon: UserGroupIcon,
      href: '/server/users',
    },
    {
      name: 'storage',
      label: 'Storage',
      icon: CircleStackIcon,
      href: '/server/storage',
    },
    {
      name: 'apps',
      label: 'Apps',
      icon: BoltIcon,
      href: '/server/apps',
    },
    {
      name: 'settings',
      label: 'Settings',
      icon: Cog8ToothIcon,
      href: '/server/settings',
    },
  ]
  return (
    <div>
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        {/* Use an "onChange" listener to redirect the user to the selected tab URL. */}
        <select
          id="tabs"
          name="tabs"
          className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          defaultValue={activeTab}
        >
          {tabs.map((tab) => (
            <option key={tab.name}>{tab.label}</option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <div key={tab.name} className="group">
                <Link
                  href={tab.href}
                  className={clsx(
                    tab.name === activeTab
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:text-gray-700 group-hover:text-gray-500',
                    'inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium',
                  )}
                  aria-current={tab.name === activeTab ? 'page' : undefined}
                >
                  <tab.icon
                    className={clsx(
                      tab.name === activeTab
                        ? 'text-indigo-500'
                        : 'text-gray-400 dark:text-gray-300 group-hover:text-gray-500',
                      '-ml-0.5 mr-2 h-5 w-5',
                    )}
                    aria-hidden="true"
                  />
                  <span className="">{tab.label}</span>
                </Link>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
