import {
  ArrowPathIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  CubeIcon,
  FolderIcon,
  GlobeAltIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import type { FolderAndPermission } from '@stellariscloud/api-client'
import type { FolderMetadata } from '@stellariscloud/types'
import { formatBytes } from '@stellariscloud/utils'
import clsx from 'clsx'
import React from 'react'

import { Button } from '../../design-system/button/button'
import type { IconProps } from '../../design-system/icon'
import { Icon } from '../../design-system/icon'

const MAIN_TEXT_COLOR = 'text-gray-500'
const MAIN_ICON_COLOR = 'text-gray-500'

export type FolderSidebarTab = 'overview' | 'actions' | 'workers'

export const FolderSidebar = ({
  folderAndPermission,
  folderMetadata,
  activeTab = 'overview',
  onTabChange,
  onRescan,
}: {
  onRescan: () => void
  activeTab?: FolderSidebarTab
  onTabChange: (tab: FolderSidebarTab) => void
  folderAndPermission?: Partial<FolderAndPermission>
  folderMetadata?: FolderMetadata
}) => {
  const { folder } = folderAndPermission ?? {}
  const [tab, setTab] = React.useState(activeTab)
  const tabs: { id: string; name: string; icon?: IconProps['icon'] }[] = [
    { id: 'overview', name: 'Overview', icon: BookOpenIcon },
    { id: 'workers', name: 'Workers', icon: WrenchScrewdriverIcon },
    { id: 'settings', name: 'Settings', icon: Cog6ToothIcon },
  ]

  const handleSetTab = React.useCallback(
    (newTab: FolderSidebarTab) => {
      setTab(newTab)
      onTabChange(newTab)
    },
    [onTabChange],
  )

  const actionItems: {
    id: string
    label: string
    description: string
    icon: IconProps['icon']
    onExecute: () => void
  }[] = [
    {
      id: 'rescan',
      label: 'Rescan content',
      description: 'Rescan the underlying storage for content changes',
      icon: ArrowPathIcon,
      onExecute: onRescan,
    },
  ]

  return (
    <div className="p-2 bg-gray-50 dark:bg-gray-600/5 h-full overflow-y-auto">
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        {/* Use an "onChange" listener to redirect the user to the selected tab URL. */}
        <select
          id="tabs"
          name="tabs"
          className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
        >
          {tabs.map((t) => (
            <option key={t.name}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block">
        <nav
          className="isolate flex divide-x divide-gray-200 dark:divide-gray-200/10 rounded-lg shadow"
          aria-label="Tabs"
        >
          {tabs.map((t, tabIdx) => (
            <button
              key={t.id}
              onClick={() => handleSetTab(t.id as FolderSidebarTab)}
              className={clsx(
                tab === t.id
                  ? 'text-gray-900 dark:text-gray-300'
                  : `text-gray-400 hover:text-gray-500`,
                tabIdx === 0 ? 'rounded-l-lg' : '',
                tabIdx === tabs.length - 1 ? 'rounded-r-lg' : '',
                'group relative min-w-0 flex-1 overflow-hidden bg-white dark:bg-white/5 py-4 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10',
              )}
              aria-current={t.id === tab ? 'page' : undefined}
            >
              <div className="flex items-center gap-2">
                {t.icon && <Icon size="sm" icon={t.icon} />}
                {t.name && <span>{t.name}</span>}
              </div>
              <span
                aria-hidden="true"
                className={clsx(
                  t.id === tab ? 'bg-indigo-500' : 'bg-transparent',
                  'absolute inset-x-0 bottom-0 h-0.5',
                )}
              />
            </button>
          ))}
        </nav>
      </div>
      {tab === 'overview' && (
        <>
          <dl className="border-b border-gray-900/5 pb-6 pt-2">
            {folder && (
              <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
                <dt className="flex-none flex">
                  <span className="sr-only">Path</span>
                  <Icon
                    icon={GlobeAltIcon}
                    size="md"
                    className={clsx(MAIN_ICON_COLOR)}
                  />
                </dt>
                <dd className={clsx('text-sm leading-6', MAIN_TEXT_COLOR)}>
                  {folder.contentLocation.endpoint}
                  {folder.contentLocation.endpoint.endsWith('/') ? '' : '/'}
                  {folder.contentLocation.bucket}
                  {folder.contentLocation.bucket.endsWith('/') ? '' : '/'}
                  {folder.contentLocation.prefix}
                </dd>
              </div>
            )}
            {folder && (
              <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
                <dt className="flex-none flex">
                  <span className="sr-only">Folder</span>
                  <Icon
                    icon={FolderIcon}
                    size="md"
                    className={MAIN_ICON_COLOR}
                  />
                </dt>
                <dd className={clsx('text-sm leading-6', MAIN_TEXT_COLOR)}>
                  {folder.name}
                </dd>
              </div>
            )}
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
              <dt className="flex-none flex">
                <span className="sr-only">Size</span>
                <Icon icon={CubeIcon} size="md" className={MAIN_ICON_COLOR} />
              </dt>
              <dd className={clsx('text-sm leading-6', MAIN_TEXT_COLOR)}>
                {`${
                  folderMetadata
                    ? formatBytes(folderMetadata.totalSizeBytes)
                    : 'unknown'
                }`}{' '}
                <span className="font-mono">{`(${
                  folderMetadata?.totalSizeBytes ?? 'unknown'
                } bytes)`}</span>
              </dd>
            </div>
          </dl>
          <ul className="space-y-3 mt-4 px-2">
            {actionItems.map((actionItem) => (
              <li
                key={actionItem.id}
                className="overflow-hidden rounded-md bg-white dark:bg-white/5 p-4 shadow"
              >
                <div className="flex items-start gap-2">
                  <div className="flex flex-col text-gray-700 dark:text-gray-300 flex-1 gap-1">
                    <div className="flex items-center gap-2">
                      <Icon
                        icon={actionItem.icon}
                        size="md"
                        className="text-gray-700 dark:text-gray-400"
                      />
                      <div className="text-lg font-bold">
                        {actionItem.label}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-400">
                      {actionItem.description}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Button
                      onClick={actionItem.onExecute}
                      className="dark:text-gray-200"
                    >
                      Run
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {tab === 'workers' && (
        <div className="text-xs p-4">
          <pre>
            {JSON.stringify(
              {
                work: [],
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </div>
  )
}
