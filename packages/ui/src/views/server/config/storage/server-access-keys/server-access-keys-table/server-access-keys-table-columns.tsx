'use client'

import type { AccessKeyDTO } from '@stellariscloud/api-client'
import { useToast } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'
import React from 'react'
import { Link } from 'react-router-dom'

import { AccessKeyRotateModal } from '../../../../../../components/access-key-rotate-modal/access-key-rotate-modal'
import { apiClient } from '../../../../../../services/api'

export const serverAccessKeysTableColumns: ColumnDef<AccessKeyDTO>[] = [
  {
    id: '__HIDDEN__',
    cell: ({ row }) => {
      const [rotateAccessKeyModalData, setRotateAccessKeyModalData] =
        React.useState<{
          isOpen: boolean
          accessKey?: AccessKeyDTO
        }>({
          isOpen: false,
        })

      const accessKey = row.original
      const { toast } = useToast()

      const handleRotate = async (input: {
        accessKeyId: string
        secretAccessKey: string
      }) => {
        console.log('Rotating key:', accessKey.accessKeyHashId, input)
        await apiClient.serverAccessKeysApi.rotateServerAccessKey({
          accessKeyHashId: accessKey.accessKeyHashId,
          rotateAccessKeyInputDTO: input,
        })
        setRotateAccessKeyModalData({ isOpen: false })
        toast({
          title: 'Access key rotated successfully',
          description: 'The access key has been rotated successfully',
        })
      }

      return (
        <div className="size-0 max-w-0 overflow-hidden">
          <AccessKeyRotateModal
            modalData={rotateAccessKeyModalData}
            setModalData={setRotateAccessKeyModalData}
            onSubmit={handleRotate}
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
