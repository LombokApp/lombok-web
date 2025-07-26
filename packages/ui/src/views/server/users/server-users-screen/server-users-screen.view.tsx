import type { ServerUsersListRequest } from '@stellariscloud/types'
import {
  Button,
  cn,
  convertFiltersToSearchParams,
  DataTable,
  type FilterConfig,
  readFiltersFromSearchParams,
} from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import React from 'react'
import { useSearchParams } from 'react-router-dom'

import { $api } from '@/src/services/api'

import type {
  CreateUserValues,
  UpdateUserValues,
} from '../server-user-detail-screen/server-user-detail-screen.view'
import type { ServerUserModalData } from '../server-user-modal/server-user-modal'
import { ServerUserModal } from '../server-user-modal/server-user-modal'
import { serverUsersTableColumns } from './server-users-table-columns'

const FILTER_CONFIGS: Record<string, FilterConfig> = {
  search: { isSearchFilter: true },
}

export function ServerUsersScreen() {
  const [modalData, setModalData] = React.useState<ServerUserModalData>({
    user: undefined,
    mutationType: 'CREATE',
    isOpen: false,
  })

  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = React.useState<Record<string, string[]>>(
    readFiltersFromSearchParams(searchParams, FILTER_CONFIGS),
  )

  const onFiltersChange = React.useCallback(
    (newFilters: Record<string, string[]>) => {
      setFilters(newFilters)
      setSearchParams(
        convertFiltersToSearchParams(newFilters, searchParams, FILTER_CONFIGS),
      )
    },
    [setSearchParams, searchParams],
  )

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const searchFilterValue =
    'search' in filters ? filters['search'][0] : undefined

  const { data: users, refetch: refetchUsers } = $api.useQuery(
    'get',
    '/api/v1/server/users',
    {
      params: {
        query: {
          limit: pagination.pageSize,
          offset: pagination.pageSize * pagination.pageIndex,
          sort: sorting[0]
            ? (`${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as ServerUsersListRequest['sort'])
            : undefined,
          search:
            typeof searchFilterValue === 'string'
              ? searchFilterValue
              : undefined,
        },
      },
    },
  )

  const createUserMutation = $api.useMutation('post', '/api/v1/server/users')
  const updateUserMutation = $api.useMutation(
    'patch',
    '/api/v1/server/users/{userId}',
  )

  type HandleSubmitParams =
    | { mutationType: 'CREATE'; values: CreateUserValues }
    | { mutationType: 'UPDATE'; values: UpdateUserValues }

  const handleSubmit = async (params: HandleSubmitParams) => {
    const { mutationType, values } = params
    if (mutationType === 'CREATE') {
      if (!values.password) {
        throw new Error('Password is required when creating a new user')
      }
      await createUserMutation.mutateAsync({
        body: {
          ...values,
          name: values.name?.length ? values.name : undefined,
          email: values.email?.length ? values.email : undefined,
          password: values.password,
        },
      })
    } else if (modalData.user?.id) {
      await updateUserMutation.mutateAsync({
        params: {
          path: {
            userId: modalData.user.id,
          },
        },
        body: {
          ...values,
          password: values.password?.length ? values.password : undefined,
        },
      })
    }
    void refetchUsers()
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
        filters={filters}
        onColumnFiltersChange={onFiltersChange}
        rowCount={users?.meta.totalCount}
        data={users?.result ?? []}
        columns={serverUsersTableColumns}
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
      />
      <ServerUserModal
        modalData={modalData}
        setModalData={setModalData}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
