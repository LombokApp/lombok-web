import type {
  AccessKeyPublicDTO,
  RotateAccessKeyInputDTO,
} from '@lombokapp/types'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit'
import { Button, DataTableColumnHeader, useToast } from '@lombokapp/ui-toolkit'
import { KeyRoundIcon } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router'

import { AccessKeyModal } from '@/src/components/access-key-modal/access-key-modal'
import { AccessKeyRotateModal } from '@/src/components/access-key-rotate-modal/access-key-rotate-modal'
import { $api } from '@/src/services/api'

export const configureUserAccessKeysTableColumns: (
  onKeyRotate: (accessKey: AccessKeyPublicDTO) => void,
) => HideableColumnDef<AccessKeyPublicDTO>[] = (onKeyRotate) => {
  return [
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
          '/api/v1/access-keys/{accessKeyHashId}/buckets',
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
      accessorKey: 'accessKeyHashId',
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
      cell: ({ row }) => {
        const accessKey = row.original
        const [rotateAccessKeyModalData, setRotateAccessKeyModalData] =
          React.useState<{
            isOpen: boolean
            accessKey?: AccessKeyPublicDTO
          }>({
            isOpen: false,
          })

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
            {rotateAccessKeyModalData.isOpen && (
              <AccessKeyRotateModal
                isOpen={rotateAccessKeyModalData.isOpen}
                setIsOpen={(isOpen) =>
                  setRotateAccessKeyModalData({
                    isOpen,
                    accessKey: rotateAccessKeyModalData.accessKey,
                  })
                }
                accessKey={{
                  accessKeyHashId: accessKey.accessKeyHashId,
                  accessKeyId: accessKey.accessKeyId,
                  endpoint: accessKey.endpointDomain,
                  region: accessKey.region,
                }}
                scope="user"
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
            )}
            <div className="flex items-center gap-2 font-normal">
              <span>{accessKey.accessKeyId}</span>
              <Button
                className="relative"
                size="xs"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  onKeyRotate(row.original)
                  setRotateAccessKeyModalData({
                    isOpen: true,
                    accessKey: row.original,
                  })
                }}
              >
                Rotate key
              </Button>
            </div>
          </>
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
    {
      accessorKey: 'folderCount',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Folders"
        />
      ),
      cell: ({ row: { original: accessKey } }) => {
        return (
          <div className="flex items-center gap-2 font-normal">
            {accessKey.folderCount}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
  ]
}
