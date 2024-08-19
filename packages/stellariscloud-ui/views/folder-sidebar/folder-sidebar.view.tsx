import {
  ArrowPathIcon,
  GlobeAltIcon,
  KeyIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import type { FolderGetResponse, TaskDTO } from '@stellariscloud/api-client'
import type { FolderMetadata } from '@stellariscloud/types'
import { formatBytes } from '@stellariscloud/utils'
import clsx from 'clsx'
import React from 'react'

import type { IconProps } from '../../design-system/icon'
import { Icon } from '../../design-system/icon'
import Link from 'next/link'
import { ActionsList } from '../../components/actions-list/actions-list.component'
import { Card, Label } from '@stellariscloud/ui-toolkit'
import { Calculator } from 'lucide-react'
import { apiClient } from '../../services/api'
import { TasksList } from '../../components/tasks-list/tasks-list.component'

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
  const [tasks, setTasks] = React.useState<TaskDTO[]>()
  const actionItems: {
    id: string
    key: string
    label: string
    description: string
    icon: IconProps['icon']
    onExecute: () => void
  }[] = [
    {
      id: 'rescan',
      key: 'RESCAN_FOLDER',
      label: 'Refresh folder',
      description: 'Scan the underlying storage for content changes',
      icon: ArrowPathIcon,
      onExecute: onRescan,
    },
  ]

  const fetchTasks = React.useCallback(() => {
    if (folder?.id) {
      void apiClient.tasksApi
        .listTasks({ folderId: folder?.id })
        .then((resp) => setTasks(resp.data.result))
    }
  }, [folder?.id])

  React.useEffect(() => {
    if (folder?.id) {
      void fetchTasks()
    }
  }, [folder?.id])

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="h-full flex pb-2 px-2">
        <Card className="p-3 flex-1">
          <div className="flex flex-col flex-1 gap-1 bg-foreground/5 p-2 rounded-md">
            <div className="flex items-center gap-2">
              <Icon icon={MagnifyingGlassIcon} size="md" />
              <div className="text-lg font-bold">Folder Details</div>
            </div>
          </div>
          <dl className="pb-6 pt-2 text-foreground/80">
            {folder && (
              <>
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
                <Calculator />
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
          <div>{actionItems && <ActionsList actionItems={actionItems} />}</div>
          <div>{tasks && <TasksList tasks={tasks} />}</div>
        </Card>
      </div>
    </div>
  )
}
