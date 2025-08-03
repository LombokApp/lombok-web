import type { FolderObjectDTO } from '@stellariscloud/types'
import type { HideableColumnDef } from '@stellariscloud/ui-toolkit'
import { toMetadataObjectIdentifier } from '@stellariscloud/utils'
import { Link } from 'react-router-dom'

import { FolderObjectPreview } from '../folder-object-preview/folder-object-preview.view'

function previewObjectKeyForFolderObject(folderObject: FolderObjectDTO) {
  if (folderObject.hash) {
    const previewMetadata =
      folderObject.hash &&
      'thumbnailLg' in (folderObject.contentMetadata[folderObject.hash] ?? {})
        ? folderObject.contentMetadata[folderObject.hash]?.['thumbnailLg']
        : undefined
    if (previewMetadata?.type === 'external') {
      return toMetadataObjectIdentifier(
        folderObject.objectKey,
        previewMetadata.hash,
      )
    }
  }
}

export const folderObjectsTableColumns: HideableColumnDef<FolderObjectDTO>[] = [
  {
    id: 'link',
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
