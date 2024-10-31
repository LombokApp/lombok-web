import type {
  FolderGetResponse,
  FoldersApiCreateFolderRequest,
  FoldersApiListFoldersRequest,
  StorageProvisionDTO,
} from '@stellariscloud/api-client'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'

import { ConfirmForgetFolderModal } from '../../components/confirm-forget-folder-modal/confirm-forget-folder-modal'
import { CreateFolderForm } from '../../components/create-folder-form/create-folder-form'
import { CreateFolderStartPanel } from '../../components/create-folder-start-panel/create-folder-start-panel'
import { apiClient, foldersApiHooks } from '../../services/api'
import {
  DataTable,
  Separator,
  TypographyH2,
  cn,
} from '@stellariscloud/ui-toolkit'
import { PaginationState, SortingState } from '@tanstack/react-table'
import { foldersTableColumns } from './folders-table-columns'

export const FoldersScreen = () => {
  const router = useRouter()
  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const searchFilter = filters.find((f) => f.id === 'name')
  const [folders, setFolders] = React.useState<{
    meta: { totalCount: number }
    result: FolderGetResponse[]
  }>()
  const [folderFormKey, setFolderFormKey] = React.useState<string>()
  const [forgetFolderConfirmationOpen, setForgetFolderConfirmationOpen] =
    React.useState<string | false>(false)
  const [storageProvisions, setStorageProvisions] = React.useState<
    StorageProvisionDTO[]
  >([])
  const handleForgetFolder = React.useCallback(
    (folderId: string) => {
      if (!forgetFolderConfirmationOpen) {
        setForgetFolderConfirmationOpen(folderId)
      } else {
        setForgetFolderConfirmationOpen(false)
        void apiClient.foldersApi.deleteFolder({ folderId }).then(() =>
          setFolders((state) => {
            return {
              result:
                folders?.result?.filter((b) => b.folder.id !== folderId) ?? [],
              meta: { totalCount: state?.meta.totalCount ?? 0 },
            }
          }),
        )
      }
    },
    [setForgetFolderConfirmationOpen, forgetFolderConfirmationOpen /*folders*/],
  )

  const handleStartCreate = () => {
    void apiClient.storageProvisionsApi
      .listStorageProvisions()
      .then((resp) => setStorageProvisions(resp.data.result))

    void router.push({
      pathname: router.pathname,
      query: { add: 'true' },
    })
  }

  const listFolders = foldersApiHooks.useListFolders(
    {
      limit: pagination.pageSize,
      offset: pagination.pageSize * pagination.pageIndex,
      ...(sorting[0]
        ? {
            sort: `${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as FoldersApiListFoldersRequest['sort'],
          }
        : {}),
      ...(typeof searchFilter?.value === 'string'
        ? {
            search: searchFilter.value,
          }
        : {}),
    },
    { retry: 0 },
  )

  const refreshFolders = React.useCallback(() => {
    void listFolders
      .refetch()
      .then((response) => setFolders(response.data ?? undefined))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listFolders.refetch, pagination, filters, sorting])

  // reflect add query flag state
  React.useEffect(() => {
    if (router.query.add === 'true' && !folderFormKey) {
      setFolderFormKey(`${Math.random()}`)
    } else if (router.query.add !== 'true' && folderFormKey) {
      setFolderFormKey(undefined)
    }
  }, [router.query.add, folderFormKey])

  React.useEffect(() => {
    refreshFolders()
  }, [refreshFolders])

  const handleCreateFolder = (
    folder: FoldersApiCreateFolderRequest['folderCreateInputDTO'],
  ) => {
    void apiClient.foldersApi
      .createFolder({ folderCreateInputDTO: folder })
      .then(async (response) => {
        await listFolders.refetch()
        void router.push({ pathname: router.pathname })
      })
  }

  return (
    <>
      <div className="flex flex-1 flex-col container gap-3 self-center">
        <TypographyH2 className="pb-0">Folders</TypographyH2>
        <Separator className="bg-foreground/10 mb-3" />

        <DataTable
          enableSearch={true}
          searchColumn="name"
          onColumnFiltersChange={(updater) => {
            setFilters((old) =>
              updater instanceof Function ? updater(old) : updater,
            )
          }}
          searchPlaceholder="Search Folders..."
          rowCount={folders?.meta.totalCount}
          data={folders?.result ?? []}
          columns={foldersTableColumns}
          onPaginationChange={(updater) => {
            setPagination((old) =>
              updater instanceof Function ? updater(old) : updater,
            )
          }}
          onSortingChange={(updater) => {
            setSorting((old) =>
              updater instanceof Function ? updater(old) : updater,
            )
          }}
        />
      </div>
    </>
  )
}
