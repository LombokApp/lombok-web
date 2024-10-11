import type { FolderGetResponse } from '@stellariscloud/api-client'
import clsx from 'clsx'
import React from 'react'

import { Avatar } from '../../design-system/avatar'
import { Badge, Card, TypographyH3, cn } from '@stellariscloud/ui-toolkit'

export const FolderCard = ({
  className,
  folderAndPermission: { folder },
  onForget,
}: {
  folderAndPermission: FolderGetResponse
  className?: string
  onForget?: () => void
}) => {
  const _handleDelete = React.useCallback(
    (_e: React.MouseEvent) => {
      onForget?.()
    },
    [onForget],
  )

  return (
    <Card className={className}>
      <div className="flex p-6 gap-4">
        <div className="h-16 w-16 flex items-center justify-center flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-700">
          <Avatar uniqueKey={folder.id} />
        </div>
        <div className="flex flex-col gap-2 items-start w-full overflow-hidden">
          <div className="flex flex-col">
            <TypographyH3>{folder.name}</TypographyH3>
            <div className="overflow-hidden w-full">
              <Badge variant={'outline'} className="text-foreground/50">
                Access Key: {folder.contentLocation.accessKeyId}
              </Badge>
            </div>
          </div>
          <div className="overflow-hidden w-full text-foreground/75">
            <div className="truncate text-sm">
              {folder.contentLocation.endpoint}/
              <span className="font-semibold">
                {folder.contentLocation.bucket}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
