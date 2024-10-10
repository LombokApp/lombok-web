import {
  ArrowPathIcon,
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

import type { IconProps } from '../../design-system/icon'
import { Icon } from '../../design-system/icon'
import Link from 'next/link'

const MAIN_TEXT_COLOR = 'text-gray-500 dark:text-gray-400'
const MAIN_ICON_COLOR = 'text-gray-500'
import { apiClient } from '../../services/api'
import { TasksList } from '../../components/tasks-list/tasks-list.component'
import { ActionsList } from '../../components/actions-list/actions-list.component'
import { Card, Label } from '@stellariscloud/ui-toolkit'

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
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="h-full flex pb-2 pr-2">
        <Card className="p-3 flex-1">
          <div className="flex flex-col flex-1 gap-1 bg-foreground/5 p-2 rounded-md">
            <div className="flex items-center gap-2">
              <Icon icon={MagnifyingGlassIcon} size="md" />
              <div className="text-lg font-bold">Overview</div>
            </div>
          </div>
          <dl className="pb-6 pt-2">
            {folder && (
              <>
                <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
                  <dt className="flex-none flex">
                    <span className="sr-only">Folder</span>
                    <Icon icon={FolderIcon} size="md" />
                  </dt>
                  <dd className={clsx('text-sm leading-6')}>
                    <Label>{folder.name}</Label>
                  </dd>
                </div>
                <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
                  <dt className="flex-none flex">
                    <span className="sr-only">Access Key</span>
                    <Icon icon={KeyIcon} size="md" />
                  </dt>
                  <dd className={clsx('text-sm leading-6')}>
                    {folder.contentLocation.providerType === 'USER' ? (
                      <Link
                        className="underline"
                        href={`/access-keys/${folder.contentLocation.accessKeyHashId}`}
                      >
                        <Label>{folder.contentLocation.label}</Label>
                      </Link>
                    ) : (
                      <Label>{folder.contentLocation.label}</Label>
                    )}
                  </dd>
                </div>
                <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
                  <dt className="flex-none flex">
                    <span className="sr-only">Bucket</span>
                    <Icon icon={GlobeAltIcon} size="md" />
                  </dt>
                  <dd className={clsx('text-sm leading-6')}>
                    <span className="opacity-50">Bucket: </span>
                    <span className="italic">
                      {folder.contentLocation.bucket}
                    </span>{' '}
                    - <span className="opacity-50">Prefix: </span>
                    <span className="italic">
                      {folder.contentLocation.prefix}
                    </span>
                  </dd>
                </div>
              </>
            )}
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
              <dt className="flex-none flex">
                <span className="sr-only">Size</span>
                <Icon icon={CubeIcon} size="md" />
              </dt>
              <dd className={clsx('text-sm leading-6')}>
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
          <div>{tasks && <ActionsList actionItems={actionItems} />}</div>
          <div>{tasks && <TasksList tasks={tasks} />}</div>
        </Card>
      </div>
    </div>
  )
}
