import {
  ArrowPathIcon,
  KeyIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { Glasses, Globe } from 'lucide-react'
import type { FolderGetResponse, TaskDTO } from '@stellariscloud/api-client'
import type { FolderMetadata } from '@stellariscloud/types'
import { formatBytes } from '@stellariscloud/utils'
import clsx from 'clsx'
import React from 'react'

import type { IconProps } from '../../design-system/icon'
import { Icon } from '../../design-system/icon'
import Link from 'next/link'
import { ActionsList } from '../../components/actions-list/actions-list.component'
import {
  Card,
  CardContent,
  CardHeader,
  Label,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import { Calculator } from 'lucide-react'
import { apiClient } from '../../services/api'
import { FolderTasksList } from '../folder-tasks-list/folder-tasks-list.view'

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
        .listFolderTasks({ folderId: folder?.id })
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
      <div className="px-3 pb-3 flex flex-col gap-6 flex-1">
        <Card className="bg-transparent">
          <CardHeader className="p-4 pt-3">
            <TypographyH3>
              <div className="flex items-center gap-2">
                <Icon icon={MagnifyingGlassIcon} size="md" />
                <TypographyH3>Folder Overview</TypographyH3>
              </div>
            </TypographyH3>
          </CardHeader>
          <CardContent className="p-4">
            <dl>
              {folder && (
                <>
                  <div className="mt-0 flex w-full items-center flex-none gap-x-4">
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
                  <div className="mt-4 flex w-full items-center flex-none gap-x-4">
                    <dt className="flex-none flex">
                      <span className="sr-only">Bucket</span>
                      <Icon icon={Globe} size="md" />
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
              <div className="mt-4 flex w-full items-center flex-none gap-x-4">
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
          </CardContent>
        </Card>
        {actionItems && <ActionsList actionItems={actionItems} />}
        <FolderTasksList {...{ folderAndPermission }} />
      </div>
    </div>
  )
}
