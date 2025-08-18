import type { StorageProvisionDTO } from '@stellariscloud/types'
import type { HideableColumnDef } from '@stellariscloud/ui-toolkit'
import { Badge, DataTableColumnHeader } from '@stellariscloud/ui-toolkit'
import { Link } from 'react-router-dom'

export const storageProvisionsTableColumns = (
  onUpdate: (storageProvisions: StorageProvisionDTO) => void,
): HideableColumnDef<StorageProvisionDTO>[] => [
  {
    id: 'link',
    cell: ({ row }) => {
      return (
        <div className="size-0 max-w-0 overflow-hidden">
          <Link
            onClick={() => onUpdate(row.original)}
            to=""
            className="absolute inset-0"
          />
        </div>
      )
    },
    zeroWidth: true,
  },
  {
    accessorKey: 'label',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Label"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="w-[150px] truncate font-medium">
          {row.original.label || (
            <span className="italic opacity-50">No Label</span>
          )}
        </div>
        <div className="w-[150px] truncate text-xs opacity-60">
          {row.original.description}
        </div>
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'accessKeyId',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Access Key Id"
      />
    ),
    cell: ({ row: { original: accessKey } }) => {
      return (
        <div className="flex items-center gap-2 font-normal">
          {accessKey.accessKeyId}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: 'endpoint',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Endpoint"
      />
    ),
    cell: ({ row: { original: accessKey } }) => {
      return (
        <div className="flex items-center gap-2 font-normal">
          {accessKey.endpoint}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: 'provisionTypes',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Provision Types"
      />
    ),
    cell: ({ row: { original: accessKey } }) => {
      return (
        <div className="flex items-center gap-2 font-normal">
          {accessKey.provisionTypes.map((provisionType) => (
            <Badge key={provisionType} variant={'outline'}>
              {provisionType}
            </Badge>
          ))}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: 'bucket_prefix',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Bucket / Prefix"
      />
    ),
    cell: ({ row: { original: accessKey } }) => {
      return (
        <div className="flex gap-1 font-normal">
          <span>{accessKey.bucket}</span>
          {accessKey.prefix && <span className="opacity-20">/</span>}
          {accessKey.prefix && (
            <span className="italic">{accessKey.prefix}</span>
          )}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: true,
  },
]
