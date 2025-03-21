'use client'

import type { FolderObjectDTO } from '@stellariscloud/api-client'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { FolderObjectPreview } from '../folder-object-preview/folder-object-preview.view'
import { toMetadataObjectIdentifier } from '@stellariscloud/utils'

function previewObjectKeyForFolderObject(folderObject: FolderObjectDTO) {
  if (
    folderObject.hash &&
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
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'thumbnail',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Thumbnail"
      />
    ),
    cell: ({ row }) => (
      <div className="flex w-[100px] flex-col text-xs">
        <FolderObjectPreview
          folderId={row.original.folderId}
          previewObjectKey={previewObjectKeyForFolderObject(row.original)}
          objectMetadata={row.original}
          objectKey={row.original.objectKey}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'objectKey',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Object Key (Path + Filename)"
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <span className="truncate text-xs text-muted-foreground">
            <Link to={row.original.objectKey}>{row.original.objectKey}</Link>
          </span>
        </div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'mimeType',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Mime Type"
      />
    ),
    cell: ({ row }) => (
      <div className="flex w-[100px] flex-col text-xs">
        <div>{row.original.mimeType}</div>
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'mediaType',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Media Type"
      />
    ),
    cell: ({ row }) => (
      <div className="flex w-[100px] flex-col text-xs">
        <div>{row.original.mediaType}</div>
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
]
