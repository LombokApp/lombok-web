import type { FolderObjectDTO, MediaType } from '@lombokapp/types'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit'
import { encodeS3ObjectKey, mediaTypeFromMimeType } from '@lombokapp/utils'
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
      const [displayConfig, setDisplayConfig] = React.useState<{
        contentKey: string
        mediaType: MediaType
        mimeType: string
      }>()

      React.useEffect(() => {
        const thumbnailLg =
          row.original.hash &&
          row.original.hash in row.original.contentMetadata &&
          'thumbnailLg' in
            (row.original.contentMetadata[row.original.hash] ?? {})
            ? row.original.contentMetadata[row.original.hash]?.['thumbnailLg']
            : undefined
        setDisplayConfig(
          thumbnailLg?.type === 'external'
            ? {
                contentKey: `metadata:${row.original.objectKey}:${thumbnailLg.hash}`,
                mediaType: mediaTypeFromMimeType(thumbnailLg.mimeType),
                mimeType: thumbnailLg.mimeType,
              }
            : undefined,
        )
      }, [
        row.original.contentMetadata,
        row.original.hash,
        row.original.objectKey,
      ])

      return (
        <div className="flex w-full gap-4 rounded-md">
          <div className="flex size-32 shrink-0">
            <FolderObjectPreview
              key={row.original.objectKey}
              folderId={row.original.folderId}
              displayMode="object-cover"
              previewConfig={displayConfig}
              objectMetadata={row.original}
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
