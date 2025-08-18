import type { AccessKeyPublicDTO } from '@stellariscloud/types'
import type { HideableColumnDef } from '@stellariscloud/ui-toolkit'
import { Button } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { KeyRoundIcon } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import { AccessKeyModal } from '@/src/components/access-key-modal/access-key-modal'
import { $api } from '@/src/services/api'

export const configureServerAccessKeysTableColumns: (
  openRotateModal: (accessKey: {
    accessKeyHashId: string
    accessKeyId: string
    endpoint: string
    region: string
  }) => void,
) => HideableColumnDef<AccessKeyPublicDTO>[] = (openRotateModal) => [
  {
    id: 'link',
    cell: ({ row }) => {
      const [rotateAccessKeyModalData, setRotateAccessKeyModalData] =
        React.useState<{
          isOpen: boolean
          accessKey?: AccessKeyPublicDTO
        }>({
          isOpen: false,
        })

      const accessKey = row.original

      const bucketsQuery = $api.useQuery(
        'get',
        '/api/v1/server/access-keys/{accessKeyHashId}/buckets',
        {
          params: { path: { accessKeyHashId: accessKey.accessKeyHashId } },
        },
        { enabled: false },
      )

      return (
        <div className="size-0 max-w-0 overflow-hidden">
          <AccessKeyModal
            modalData={rotateAccessKeyModalData}
            setModalData={setRotateAccessKeyModalData}
            buckets={bucketsQuery.data?.result ?? []}
            loadBuckets={bucketsQuery.refetch}
          />

          <Link
            onClick={(e) => {
              e.preventDefault()
              setRotateAccessKeyModalData({
                isOpen: true,
                accessKey: row.original,
              })
            }}
            to={``}
            className="absolute inset-0"
          />
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
    zeroWidth: true,
  },
  {
    accessorKey: 'hashId',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="HashId"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <KeyRoundIcon className="size-4" />
          <div className="w-[80px] truncate">
            {row.original.accessKeyHashId}
          </div>
        </div>
      </div>
    ),
    enableSorting: false,
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
          <span>{accessKey.accessKeyId}</span>
          <Button
            className="relative"
            size="xs"
            variant="outline"
            onClick={(e) => {
              e.preventDefault()
              openRotateModal({
                accessKeyHashId: accessKey.accessKeyHashId,
                accessKeyId: accessKey.accessKeyId,
                endpoint: accessKey.endpoint,
                region: accessKey.region,
              })
            }}
          >
            Rotate key
          </Button>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'endpointDomain',
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
          {accessKey.endpointDomain}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'region',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Region"
      />
    ),
    cell: ({ row: { original: accessKey } }) => {
      return (
        <div className="flex items-center gap-2 font-normal">
          {accessKey.region}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  // removed per-row action; rotation handled by central modal trigger in Access Key Id column
]
