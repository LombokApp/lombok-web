import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import type {
  FolderAndPermission,
  FolderOperationData,
  FolderOperationStatus,
} from '@stellariscloud/api-client'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import clsx from 'clsx'
import React from 'react'

import { Badge } from '../../../design-system/badge/badge'
import { Button } from '../../../design-system/button/button'
import { Icon } from '../../../design-system/icon'
import { foldersApi } from '../../../services/api'
import { iconForOperationType } from '../../../utils/icons'

const MAIN_TEXT_COLOR = 'text-gray-500 dark:text-gray-400'
// const MAIN_ICON_COLOR = 'text-gray-500'

type FolderOperationFilter = 'all' | 'failed' | 'complete' | 'pending'

export const FolderWorkersTab = ({
  folderAndPermission: { folder },
}: {
  folderAndPermission: FolderAndPermission
}) => {
  const [folderOperations, setFolderOperations] = React.useState<{
    meta: { totalCount: number }
    result: FolderOperationData[]
  }>()
  const [filter, setFilter] = React.useState<FolderOperationFilter>('all')
  const [{ limit, offset }, setLimitOffset] = React.useState<{
    limit: number
    offset: number
  }>({
    limit: 25,
    offset: 0,
  })

  const refetchFolderOperations = React.useCallback(() => {
    void foldersApi
      .listFolderOperations({
        folderId: folder.id,
        limit,
        offset,
        ...(filter === 'all'
          ? {}
          : { status: filter.toUpperCase() as FolderOperationStatus }),
      })
      .then((result) => setFolderOperations(result.data))
  }, [folder.id, filter, limit, offset])

  React.useEffect(() => {
    refetchFolderOperations()
  }, [refetchFolderOperations])

  const handleFolderOperationsOffsetChange = React.useCallback(
    (delta: number) => {
      setLimitOffset((limitOffset) => ({
        limit: limitOffset.limit,
        offset: Math.min(
          Math.max(0, limitOffset.offset + delta),
          Math.floor(
            (folderOperations?.meta.totalCount ?? 0) / limitOffset.limit,
          ) * limitOffset.limit,
        ),
      }))
    },
    [folderOperations?.meta.totalCount],
  )

  const handleFolderOperationsFilterChange = React.useCallback(
    (f: FolderOperationFilter) => {
      setLimitOffset((limitOffset) => ({ ...limitOffset, offset: 0 }))
      setFilter(f)
    },
    [],
  )

  return (
    <div className="h-full px-1 flex flex-col bg-gray-50 dark:bg-gray-600/5 h-full">
      <div className={clsx('text-xs', MAIN_TEXT_COLOR)}>
        <ul className="space-y-3 mt-4 px-2 h-full">
          {((folderOperations?.result.length ?? 0) > 0 || filter !== 'all') && (
            <div className="flex justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  selected={filter === 'all'}
                  onClick={() => handleFolderOperationsFilterChange('all')}
                >
                  All
                </Button>
                <Button
                  selected={filter === 'pending'}
                  onClick={() => handleFolderOperationsFilterChange('pending')}
                >
                  Pending
                </Button>
                <Button
                  selected={filter === 'failed'}
                  onClick={() => handleFolderOperationsFilterChange('failed')}
                >
                  Failed
                </Button>
                <Button
                  selected={filter === 'complete'}
                  onClick={() => handleFolderOperationsFilterChange('complete')}
                >
                  Complete
                </Button>
              </div>
              <div className="flex gap-2 items-center">
                <Button
                  size="lg"
                  icon={ArrowLeftIcon}
                  onClick={() => handleFolderOperationsOffsetChange(-limit)}
                />
                <div>
                  {Math.max(offset + 1, 0)}-
                  {Math.min(
                    offset + limit,
                    folderOperations?.meta.totalCount ?? 0,
                  )}{' '}
                  of {folderOperations?.meta.totalCount}
                </div>
                <Button
                  icon={ArrowRightIcon}
                  onClick={() => handleFolderOperationsOffsetChange(limit)}
                />
              </div>
            </div>
          )}
          {folderOperations?.result.length === 0 && (
            <div className="min-h-[6rem] flex flex-col items-center justify-around">
              No worker operations
            </div>
          )}
          {folderOperations?.result.map((folderOperation) => {
            const icon = iconForOperationType(folderOperation.operationName)
            const objectKey = folderOperation.operationData.objectKey
            return (
              <li
                key={folderOperation.id}
                className="overflow-hidden rounded-md bg-white dark:bg-white/5 p-4 shadow relative"
              >
                <div className="flex items-start gap-2">
                  <div className="flex flex-col text-gray-700 dark:text-gray-300 flex-1 gap-2">
                    <div className="flex items-center gap-2">
                      <Icon
                        icon={icon}
                        size="sm"
                        className="text-gray-700 dark:text-gray-400"
                      />
                      <div className="font-bold">
                        {folderOperation.operationName}
                      </div>
                    </div>
                    <div className="font-bold text-lg">{objectKey}</div>
                    <div className="absolute right-2 bottom-2 p-2 text-sm text-gray-700 dark:text-gray-400">
                      {folderOperation.error ? (
                        <Badge style="error">error</Badge>
                      ) : !folderOperation.started ? (
                        <Badge style="normal">enqueued</Badge>
                      ) : folderOperation.completed ? (
                        <Badge style="success">complete</Badge>
                      ) : (
                        <Badge>in progress</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div>
                        Created:{' '}
                        {timeSinceOrUntil(new Date(folderOperation.createdAt))}
                      </div>
                      -
                      <div>
                        Updated:{' '}
                        {timeSinceOrUntil(new Date(folderOperation.updatedAt))}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
