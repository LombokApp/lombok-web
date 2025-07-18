'use client'

import type { AccessKeyPublicDTO } from '@stellariscloud/types'
import { useToast } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'
import React from 'react'
import { Link } from 'react-router-dom'

import { AccessKeyModal } from '@/src/components/access-key-modal/access-key-modal'
import { $api } from '@/src/services/api'

export const configureServerAccessKeysTableColumns: (
  onKeyRotate: (accessKey: AccessKeyPublicDTO) => void,
) => ColumnDef<AccessKeyPublicDTO>[] = (onKeyRotate) => [
  {
    id: '__HIDDEN__',
    cell: ({ row }) => {
      const [rotateAccessKeyModalData, setRotateAccessKeyModalData] =
        React.useState<{
          isOpen: boolean
          accessKey?: AccessKeyPublicDTO
        }>({
          isOpen: false,
        })

      const accessKey = row.original
      const { toast } = useToast()

      const bucketsQuery = $api.useQuery(
        'get',
        '/api/v1/server/access-keys/{accessKeyHashId}/buckets',
        {
          params: { path: { accessKeyHashId: accessKey.accessKeyHashId } },
        },
      )
      const buckets = bucketsQuery.data?.result ?? []

      const rotateAccessKeyMutation = $api.useMutation(
        'post',
        '/api/v1/server/access-keys/{accessKeyHashId}/rotate',
        {
          onSuccess: () => {
            setRotateAccessKeyModalData({ isOpen: false })
            onKeyRotate(accessKey)
            toast({
              title: 'Access key rotated successfully',
              description: 'The access key has been rotated successfully',
            })
          },
        },
      )

      return (
        <div className="size-0 max-w-0 overflow-hidden">
          <AccessKeyModal
            modalData={rotateAccessKeyModalData}
            setModalData={setRotateAccessKeyModalData}
            buckets={buckets}
            onSubmit={async (input) => {
              await rotateAccessKeyMutation.mutateAsync({
                params: {
                  path: { accessKeyHashId: accessKey.accessKeyHashId },
                },
                body: input,
              })
            }}
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
        <div className="w-[80px] truncate">{row.original.accessKeyHashId}</div>
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
          {accessKey.accessKeyId}
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
]
