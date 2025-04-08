'use client'

import type { FolderObjectDTO } from '@stellariscloud/api-client'
import { toMetadataObjectIdentifier } from '@stellariscloud/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'

import { FolderObjectPreview } from '../folder-object-preview/folder-object-preview.view'

function previewObjectKeyForFolderObject(folderObject: FolderObjectDTO) {
  if (
    folderObject.hash &&
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    folderObject.contentMetadata[folderObject.hash]?.['compressedVersion']
  ) {
    return toMetadataObjectIdentifier(
      folderObject.objectKey,
      folderObject.contentMetadata[folderObject.hash]['thumbnailLg'].hash,
    )
  }
}

export const folderObjectsTableColumns: ColumnDef<FolderObjectDTO>[] = [
  {
    id: '__HIDDEN__',
    cell: ({ row }) => {
      return (
        <div className="size-0 max-w-0 overflow-hidden">
          <Link
            to={`/folders/${row.original.folderId}/objects/${row.original.objectKey}`}
            className="absolute inset-0"
          />
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'main',
    cell: ({ row }) => (
      <div className="flex gap-4 overflow-hidden rounded-md">
        <div className="flex size-32">
          <FolderObjectPreview
            key={row.original.objectKey}
            folderId={row.original.folderId}
            displayMode="object-cover"
            previewObjectKey={previewObjectKeyForFolderObject(row.original)}
            objectMetadata={row.original}
            objectKey={row.original.objectKey}
          />
        </div>
        <div className="flex pt-2">
          <span className="truncate text-muted-foreground">
            <div className="text-base">{row.original.objectKey}</div>
            <div className="flex items-center gap-1 font-mono">
              <div>{row.original.mimeType}</div>
              <div className="flex items-center gap-1 text-xs opacity-30">
                <div> - </div>
                {row.original.mediaType}
              </div>
            </div>
          </span>
        </div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
