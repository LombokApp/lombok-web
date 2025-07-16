'use client'

import { useToast } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'
import React from 'react'
import { Link } from 'react-router-dom'

import type {
  AccessKeyPublicDTO,
  RotateAccessKeyInputDTO,
} from '@/src/services/api'
import { $api } from '@/src/services/api'

import { AccessKeyModal } from '../../components/access-key-modal/access-key-modal'

export const configureUserAccessKeysTableColumns: (
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
      const bucketsQuery = $api.useQuery(
        'get',
        '/api/v1/access-keys/{accessKeyHashId}/buckets',
        {
          params: { path: { accessKeyHashId: accessKey.accessKeyHashId } },
        },
      )
      const buckets = bucketsQuery.data?.result ?? []

      const { toast } = useToast()

      const rotateAccessKeyMutation = $api.useMutation(
        'post',
        '/api/v1/access-keys/{accessKeyHashId}/rotate',
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
        <>
          <AccessKeyModal
            modalData={rotateAccessKeyModalData}
            setModalData={setRotateAccessKeyModalData}
            buckets={buckets}
            onSubmit={async (input: RotateAccessKeyInputDTO) => {
              await rotateAccessKeyMutation.mutateAsync({
                params: {
                  path: {
                    accessKeyHashId: accessKey.accessKeyHashId,
                  },
                },
                body: input,
              })
            }}
          />

          <div className="size-0 max-w-0 overflow-hidden">
            <Link
              onClick={(e) => {
                e.preventDefault()
                setRotateAccessKeyModalData({
                  isOpen: true,
                  accessKey: row.original,
                })
              }}
              to=""
              className="absolute inset-0"
            />
          </div>
        </>
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
