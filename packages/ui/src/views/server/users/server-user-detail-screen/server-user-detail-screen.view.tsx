import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  DataTable,
} from '@lombokapp/ui-toolkit'
import { format } from 'date-fns'
import { Folders, HandshakeIcon, KeyIcon, Pencil } from 'lucide-react'
import React from 'react'

import { DateDisplay } from '@/src/components/date-display'
import { StatCardGroup } from '@/src/components/stat-card-group/stat-card-group'
import { $api } from '@/src/services/api'

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

interface CommonUserValues {
  username: string
  name?: string
  email?: string
  isAdmin: boolean
  permissions: string[]
}

export type CreateUserValues = CommonUserValues & {
  password: string
}

export type UpdateUserValues = CommonUserValues & {
  password?: string
}

type HandleSubmitParams =
  | { mutationType: 'CREATE'; values: CreateUserValues }
  | { mutationType: 'UPDATE'; values: UpdateUserValues }

export function ServerUserDetailScreen({ userId }: { userId: string }) {
  const [modalData, setModalData] = React.useState<ServerUserModalData>({
    user: undefined,
    mutationType: 'CREATE',
    isOpen: false,
  })

  const userQuery = $api.useQuery('get', '/api/v1/server/users/{userId}', {
    params: {
      path: {
        userId,
      },
    },
  })

  const userSessionsQuery = $api.useQuery(
    'get',
    '/api/v1/server/users/{userId}/sessions',
    {
      params: {
        path: {
          userId,
        },
      },
    },
  )
  const createUserMutation = $api.useMutation('post', '/api/v1/server/users')
  const updateUserMutation = $api.useMutation(
    'patch',
    '/api/v1/server/users/{userId}',
  )

  // Refactored handleSubmit
  const handleSubmit = async (params: HandleSubmitParams) => {
    const { mutationType, values } = params
    if (mutationType === 'CREATE') {
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
          name: values.name?.length ? values.name : null,
          email: values.email?.length ? values.email : null,
          password: values.password?.length ? values.password : undefined,
        },
      })
    }
    void userQuery.refetch()
  }

  return (
    <div className="flex size-full flex-1 flex-col gap-8 overflow-hidden overflow-y-auto">
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
          onSubmit={handleSubmit}
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
              <div className="font-medium">
                {userQuery.data?.user.createdAt ? (
                  <DateDisplay
                    date={userQuery.data.user.createdAt}
                    showTimeSince={false}
                  />
                ) : (
                  '-'
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <div className="font-medium">
                {userQuery.data?.user.updatedAt ? (
                  <DateDisplay
                    date={userQuery.data.user.updatedAt}
                    showTimeSince={false}
                  />
                ) : (
                  '-'
                )}
              </div>
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
                label: '2 months ago',
                subtitle: 'January 15, 2024',
                icon: HandshakeIcon,
              },
              {
                title: 'Last Login',
                label: '1 week ago',
                subtitle: 'March 10, 2024',
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
