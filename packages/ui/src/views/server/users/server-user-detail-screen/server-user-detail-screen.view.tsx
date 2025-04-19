import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  DataTable,
} from '@stellariscloud/ui-toolkit'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import { format } from 'date-fns'
import { Folders, HandshakeIcon, KeyIcon, Pencil } from 'lucide-react'
import React from 'react'

import { StatCardGroup } from '../../../../components/stat-card-group/stat-card-group'
import { apiClient, usersApiHooks } from '../../../../services/api'
import type { UserFormValues } from '../server-user-modal/server-user-form/server-user-form'
import {
  ServerUserModal,
  type ServerUserModalData,
} from '../server-user-modal/server-user-modal'

interface Session {
  id: string
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export function ServerUserDetailScreen({ userId }: { userId: string }) {
  const [modalData, setModalData] = React.useState<ServerUserModalData>({
    user: undefined,
    mutationType: 'CREATE',
    isOpen: false,
  })

  const userQuery = usersApiHooks.useGetUser(
    {
      userId,
    },
    {
      enabled: !!userId,
    },
  )

  const userSessionsQuery = usersApiHooks.useListActiveUserSessions(
    {
      userId,
    },
    {
      enabled: !!userId,
    },
  )

  const handleSubmit = async (
    mutationType: 'CREATE' | 'UPDATE',
    values: {
      username: string
      name?: string
      email?: string
      password: typeof mutationType extends 'UPDATE'
        ? string | undefined
        : string
      isAdmin: boolean
      permissions: string[]
    },
  ) => {
    if (mutationType === 'CREATE') {
      await apiClient.usersApi.createUser({
        userCreateInputDTO: {
          ...values,
          name: values.name?.length ? values.name : undefined,
          email: values.email?.length ? values.email : undefined,
        },
      })
    } else if (modalData.user?.id) {
      await apiClient.usersApi.updateUser({
        userId: modalData.user.id,
        userUpdateInputDTO: {
          ...values,
        },
      })
    }
    void userQuery.refetch()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {userQuery.data?.user.name || userQuery.data?.user.username}
          </h1>
          <p className="text-muted-foreground">
            User ID: {userQuery.data?.user.id}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setModalData({
              isOpen: true,
              user: userQuery.data?.user,
              mutationType: 'UPDATE',
            })
          }
        >
          <Pencil className="mr-2 size-4" />
          Edit User
        </Button>
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

      <Card>
        <div className="p-6">
          <h2 className="mb-4 text-2xl font-bold">User Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Username</p>
              <p className="font-medium">{userQuery.data?.user.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{userQuery.data?.user.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{userQuery.data?.user.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email Verified</p>
              <p className="font-medium">
                {userQuery.data?.user.emailVerified ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admin Status</p>
              <p className="font-medium">
                {userQuery.data?.user.isAdmin ? 'Admin' : 'User'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Permissions</p>
              <p className="font-medium">
                {userQuery.data?.user.permissions.join(', ') || 'None'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="font-medium">
                {userQuery.data?.user.createdAt
                  ? format(new Date(userQuery.data.user.createdAt), 'PPpp')
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">
                {userQuery.data?.user.updatedAt
                  ? format(new Date(userQuery.data.user.updatedAt), 'PPpp')
                  : '-'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <StatCardGroup
            stats={[
              {
                title: 'Joined',
                label: timeSinceOrUntil(new Date(1707979480000)),
                subtitle: new Date(1707979480000).toLocaleString(),
                icon: HandshakeIcon,
              },
              {
                title: 'Last Login',
                label: timeSinceOrUntil(new Date(1727979480000)),
                subtitle: new Date(1727979480000).toLocaleString(),
                icon: KeyIcon,
              },
              {
                title: 'Total Folders',
                label: '5',
                subtitle: 'Work, Camera Roll, Client X, and 2 others',
                icon: Folders,
              },
              {
                title: 'Active Sessions',
                label:
                  userSessionsQuery.data?.result
                    .filter((s: Session) => new Date(s.expiresAt) > new Date())
                    .length.toString() ?? '0',
                subtitle: 'Currently active',
              },
            ]}
          />
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
            </CardHeader>
            <DataTable
              data={userSessionsQuery.data?.result ?? []}
              columns={[
                {
                  header: 'Session ID',
                  accessorKey: 'id',
                  cell: ({ row }: { row: { original: Session } }) =>
                    row.original.id.slice(0, 8),
                },
                {
                  header: 'Created At',
                  accessorKey: 'createdAt',
                  cell: ({ row }: { row: { original: Session } }) =>
                    format(new Date(row.original.createdAt), 'PPpp'),
                },
                {
                  header: 'Expires At',
                  accessorKey: 'expiresAt',
                  cell: ({ row }: { row: { original: Session } }) =>
                    format(new Date(row.original.expiresAt), 'PPpp'),
                },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
