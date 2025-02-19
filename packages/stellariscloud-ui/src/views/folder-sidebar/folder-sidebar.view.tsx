import {
  ArrowPathIcon,
  KeyIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import type { FolderGetResponse } from '@stellariscloud/api-client'
import type { FolderMetadata } from '@stellariscloud/types'
import {
  Card,
  CardContent,
  CardHeader,
  cn,
  Label,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import { formatBytes } from '@stellariscloud/utils'
import { Calculator, Globe } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { ActionsList } from '../../components/actions-list/actions-list.component'
import { useServerContext } from '../../contexts/server.context'
import type { IconProps } from '../../design-system/icon'
import { Icon } from '../../design-system/icon'
import { apiClient } from '../../services/api'
import { FolderTasksList } from '../folder-tasks-list/folder-tasks-list.view'

export const FolderSidebar = ({
  onRescan,
  folderAndPermission,
  folderMetadata,
}: {
  onRescan: () => void
  folderAndPermission?: FolderGetResponse
  folderMetadata?: FolderMetadata
}) => {
  const serverContext = useServerContext()
  const { folder } = folderAndPermission ?? {}
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
  ].concat(
    serverContext.appFolderTaskTriggers.map(
      ({ taskTrigger, appIdentifier }) => ({
        id: `${appIdentifier}__${taskTrigger.taskKey}`,
        key: taskTrigger.taskKey,
        label: taskTrigger.label,
        description: taskTrigger.description,
        icon: ArrowPathIcon,
        onExecute: () =>
          folder?.id &&
          apiClient.foldersApi.handleAppTaskTrigger({
            folderId: folder.id,
            taskKey: taskTrigger.taskKey,
            appIdentifier,
            triggerAppTaskInputDTO: {
              inputParams: {},
            },
          }),
      }),
    ),
  )

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-1 flex-col gap-6 px-3 pb-3">
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
                  <div className="mt-0 flex w-full flex-none items-center gap-x-4">
                    <dt className="flex flex-none">
                      <span className="sr-only">Access Key</span>
                      <Icon icon={KeyIcon} size="md" />
                    </dt>
                    <dd className={cn('text-sm leading-6')}>
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
                  <div className="mt-4 flex w-full flex-none items-center gap-x-4">
                    <dt className="flex flex-none">
                      <span className="sr-only">Bucket</span>
                      <Icon icon={Globe} size="md" />
                    </dt>
                    <dd className={cn('text-sm leading-6')}>
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
              <div className="mt-4 flex w-full flex-none items-center gap-x-4">
                <dt className="flex flex-none">
                  <span className="sr-only">Size</span>
                  <Calculator />
                </dt>
                <dd className={cn('text-sm leading-6')}>
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
        {<ActionsList actionItems={actionItems} />}
        <FolderTasksList {...{ folderAndPermission }} />
      </div>
    </div>
  )
}
