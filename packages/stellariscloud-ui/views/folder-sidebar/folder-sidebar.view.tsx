import {
  ArrowPathIcon,
  BookOpenIcon,
  CubeIcon,
  FolderIcon,
  GlobeAltIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import type { FolderGetResponse } from '@stellariscloud/api-client'
import type { FolderMetadata } from '@stellariscloud/types'
import { formatBytes } from '@stellariscloud/utils'
import clsx from 'clsx'
import React from 'react'

import { Button } from '../../design-system/button/button'
import type { IconProps } from '../../design-system/icon'
import { Icon } from '../../design-system/icon'

const MAIN_TEXT_COLOR = 'text-gray-500 dark:text-gray-400'
const MAIN_ICON_COLOR = 'text-gray-500'

export type FolderSidebarTab = 'overview' | 'settings' | 'workers'

export const FolderSidebar = ({
  folderAndPermission,
  folderMetadata,
  activeTab = 'overview',
  onTabChange,
  onRescan,
  onIndexAll,
}: {
  onRescan: () => void
  onIndexAll: () => void
  activeTab?: FolderSidebarTab
  onTabChange: (tab: FolderSidebarTab) => void
  folderAndPermission?: FolderGetResponse
  folderMetadata?: FolderMetadata
}) => {
  const { folder } = folderAndPermission ?? {}
  const [tab, setTab] = React.useState(activeTab)
  const tabs: { id: string; name: string; icon?: IconProps['icon'] }[] = [
    { id: 'overview', name: 'Overview', icon: BookOpenIcon },
    { id: 'workers', name: 'Workers', icon: WrenchScrewdriverIcon },
    // { id: 'settings', name: 'Settings', icon: Cog6ToothIcon },
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
      label: 'Rescan folder content',
      description: 'Scan the underlying storage for content changes',
      icon: ArrowPathIcon,
      onExecute: onRescan,
    },
    {
      id: 'index_all',
      label: 'Index all unindexed',
      description: 'Enqueue indexing jobs for all unindexed objects',
      icon: MagnifyingGlassIcon,
      onExecute: onIndexAll,
    },
  ]

  return (
    <div className="py-2 bg-gray-50 dark:bg-gray-600/5 h-full overflow-y-auto">
      <>
        <div className="flex flex-col text-gray-700 dark:text-gray-300 flex-1 gap-1 bg-gray-50/5 p-2 mx-2 rounded-md">
          <div className="flex items-center gap-2">
            <Icon
              icon={MagnifyingGlassIcon}
              size="md"
              className="text-gray-700 dark:text-gray-400"
            />
            <div className="text-lg font-bold">Overview</div>
          </div>
        </div>
        <dl className="border-b border-gray-900/5 pb-6 pt-2">
          {folder && (
            <>
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
              <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
                <dt className="flex-none flex">
                  <span className="sr-only">Access Key</span>
                  <Icon
                    icon={KeyIcon}
                    size="md"
                    className={'dark:text-amber-200'}
                  />
                </dt>
                <dd
                  className={clsx(
                    'text-sm leading-6',
                    MAIN_TEXT_COLOR,
                    // 'dark:text-amber-200',
                  )}
                >
                  {folder.contentLocation.label}
                </dd>
              </div>
            </>
          )}
          <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
            <dt className="flex-none flex">
              <span className="sr-only">Size</span>
              <Icon icon={CubeIcon} size="md" className={MAIN_ICON_COLOR} />
            </dt>
            <dd className={clsx('text-sm leading-6', MAIN_TEXT_COLOR)}>
              {`${folderMetadata ? folderMetadata.totalCount : 'unknown'}`}{' '}
              objects -{' '}
              {`${
                folderMetadata
                  ? formatBytes(folderMetadata.totalSizeBytes)
                  : 'unknown'
              }`}{' '}
              <span className="font-mono">{`(${
                folderMetadata?.totalSizeBytes.toLocaleString() ?? 'unknown'
              } bytes)`}</span>
            </dd>
          </div>
        </dl>
        <div className="flex flex-col text-gray-700 dark:text-gray-300 flex-1 gap-1 bg-gray-50/5 p-2 mx-2 rounded-md">
          <div className="flex items-center gap-2">
            <Icon
              icon={MagnifyingGlassIcon}
              size="md"
              className="text-gray-700 dark:text-gray-400"
            />
            <div className="text-lg font-bold">Actions</div>
          </div>
        </div>
        <ul className="space-y-3 my-4 px-2">
          {actionItems.map((actionItem) => (
            <li
              key={actionItem.id}
              className="overflow-hidden rounded-md bg-white dark:bg-black/20 p-4 shadow"
            >
              <div className="flex items-start gap-2">
                <div className="flex flex-col text-gray-700 dark:text-gray-300 flex-1 gap-1">
                  <div className="flex items-center gap-2">
                    <Icon
                      icon={actionItem.icon}
                      size="md"
                      className="text-gray-700 dark:text-gray-400"
                    />
                    <div className="text-lg font-bold">{actionItem.label}</div>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-400">
                    {actionItem.description}
                  </div>
                </div>
                <div className="shrink-0">
                  <Button
                    primary
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
        <div className="flex flex-col text-gray-700 dark:text-gray-300 flex-1 gap-1 bg-gray-50/5 p-2 mx-2 rounded-md">
          <div className="flex items-center gap-2">
            <Icon
              icon={MagnifyingGlassIcon}
              size="md"
              className="text-gray-700 dark:text-gray-400"
            />
            <div className="text-lg font-bold">Events</div>
          </div>
        </div>
      </>
    </div>
  )
}
