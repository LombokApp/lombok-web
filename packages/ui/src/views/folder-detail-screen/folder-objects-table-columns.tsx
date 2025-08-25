import type { FolderObjectDTO } from '@lombokapp/types'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit'
import { toMetadataObjectIdentifier } from '@lombokapp/utils'

import { TableLinkColumn } from '@/src/components/table-link-column/table-link-column'

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
    cell: ({ row }) => (
      <TableLinkColumn
        to={`/folders/${row.original.folderId}/objects/${encodeURIComponent(row.original.objectKey)}`}
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
    cell: ({ row }) => (
      <div className="flex w-full gap-4 rounded-md">
        <div className="flex size-32 shrink-0">
          <FolderObjectPreview
            key={row.original.objectKey}
            folderId={row.original.folderId}
            displayMode="object-cover"
            previewObjectKey={previewObjectKeyForFolderObject(row.original)}
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
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
