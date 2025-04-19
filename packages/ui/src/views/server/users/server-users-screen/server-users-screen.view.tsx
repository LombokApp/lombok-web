import type {
  UserDTO,
  UsersApiListUsersRequest,
} from '@stellariscloud/api-client'
import { Button, cn, DataTable } from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import React from 'react'

import { apiClient } from '../../../../services/api'
import type { UserFormValues } from '../server-user-modal/server-user-form/server-user-form'
import type { ServerUserModalData } from '../server-user-modal/server-user-modal'
import { ServerUserModal } from '../server-user-modal/server-user-modal'
import { serverUsersTableColumns } from './server-users-table-columns'

type UserWithPermissions = UserDTO & { permissions: { label: string }[] }

export function ServerUsersScreen() {
  const [modalData, setModalData] = React.useState<ServerUserModalData>({
    user: undefined,
    mutationType: 'CREATE',
    isOpen: false,
  })

  const [users, setUsers] = React.useState<{
    result: UserWithPermissions[]
    meta: { totalCount: number }
  }>()

  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const searchFilter = filters.find((f) => f.id === '__HIDDEN__')

  React.useEffect(() => {
    void apiClient.usersApi
      .listUsers({
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
        ...(sorting[0]
          ? {
              sort: `${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as UsersApiListUsersRequest['sort'],
            }
          : {}),
        ...(typeof searchFilter?.value === 'string'
          ? {
              search: searchFilter.value,
            }
          : {}),
      })
      .then((response) => {
        const usersWithPermissions: UserWithPermissions[] =
          response.data.result.map((r) => ({
            ...r,
            name: r.name ?? '',
            permissions: [],
          }))
        setUsers({
          result: usersWithPermissions,
          meta: response.data.meta,
        })
      })
  }, [filters, sorting, pagination, searchFilter?.value])

  const handleSubmit = async (
    mutationType: 'CREATE' | 'UPDATE',
    values: {
      username: string
      name?: string
      email?: string
      isAdmin: boolean
      permissions: string[]
      password: typeof mutationType extends 'UPDATE'
        ? string | undefined
        : string
    },
  ) => {
    if (mutationType === 'CREATE') {
      if (!values.password) {
        throw new Error('Password is required when creating a new user')
      }
      await apiClient.usersApi.createUser({
        userCreateInputDTO: {
          ...values,
          name: values.name?.length ? values.name : undefined,
          email: values.email?.length ? values.email : undefined,
          password: values.password,
        },
      })
    } else if (modalData.user?.id) {
      await apiClient.usersApi.updateUser({
        userId: modalData.user.id,
        userUpdateInputDTO: values,
      })
    }
    // Refresh the users list
    void apiClient.usersApi
      .listUsers({
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
      })
      .then((response) => {
        const usersWithPermissions: UserWithPermissions[] =
          response.data.result.map((r) => ({
            ...r,
            name: r.name ?? '',
            permissions: [],
          }))
        setUsers({
          result: usersWithPermissions,
          meta: response.data.meta,
        })
      })
  }

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <div className="flex w-full items-center justify-between">
        <h1 className="pl-2 text-2xl font-bold">Users</h1>
        <Button
          variant="outline"
          onClick={() =>
            setModalData({
              user: undefined,
              mutationType: 'CREATE',
              isOpen: true,
            })
          }
        >
          <Plus className="mr-2 size-4" />
          Create User
        </Button>
      </div>
      <DataTable
        enableSearch={true}
        searchColumn="__HIDDEN__"
        onColumnFiltersChange={setFilters}
        rowCount={users?.meta.totalCount}
        data={users?.result ?? []}
        columns={serverUsersTableColumns}
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
      />
      <ServerUserModal
        modalData={modalData}
        setModalData={setModalData}
        onSubmit={
          handleSubmit as (
            mutationType: 'CREATE' | 'UPDATE',
            values: UserFormValues,
          ) => Promise<void>
        }
      />
    </div>
  )
}
