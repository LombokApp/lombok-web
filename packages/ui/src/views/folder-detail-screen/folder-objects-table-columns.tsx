import type { FolderObjectDTO } from '@lombokapp/types'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { encodeS3ObjectKey } from '@lombokapp/utils'
import React from 'react'

import { TableLinkColumn } from '@/src/components/table-link-column/table-link-column'

import { FolderObjectPreview } from '../folder-object-preview/folder-object-preview.view'

export const folderObjectsTableColumns: HideableColumnDef<FolderObjectDTO>[] = [
  {
    id: 'link',
    cell: ({ row }) => (
      <TableLinkColumn
        to={`/folders/${row.original.folderId}/objects/${encodeS3ObjectKey(row.original.objectKey)}`}
      />
    ),
    enableSorting: false,
    zeroWidth: true,
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    enableSorting: true,
    forceHiding: true,
  },
  {
    id: 'updatedAt',
    accessorKey: 'updatedAt',
    enableSorting: true,
    forceHiding: true,
  },
  {
    accessorKey: 'main',
    cell: ({ row }) => {
      const displayConfig = React.useMemo(
        () =>
          ({
            type: 'preview_purpose',
            purposeType: 'list',
          }) as const,
        [],
      )

      return (
        <div className="flex w-full gap-4 rounded-md">
          <div className="flex size-32 shrink-0">
            <FolderObjectPreview
              key={row.original.objectKey}
              folderId={row.original.folderId}
              displayMode="object-cover"
              displayConfig={displayConfig}
              folderObject={row.original}
              objectKey={row.original.objectKey}
            />
          </div>
          <div className="flex min-w-0 flex-1 pt-2">
            <div className="flex min-w-0 flex-1 flex-col gap-2 text-muted-foreground">
              <div className="truncate">{row.original.objectKey}</div>
              <div className="flex items-center gap-1 font-mono">
                <div>{row.original.mimeType}</div>
                <div className="flex items-center gap-1 text-xs opacity-30">
                  <div> - </div>
                  {row.original.mediaType}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]
