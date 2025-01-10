import type { UserDTO } from '@stellariscloud/api-client'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  DataTable,
  DataTableColumnHeader,
} from '@stellariscloud/ui-toolkit'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import { Edit, Folders, HandshakeIcon, HardDrive, KeyIcon } from 'lucide-react'
import React from 'react'
import { v4 as uuidV4 } from 'uuid'

import { StatCardGroup } from '../../../../components/stat-card-group/stat-card-group'
import { UserAttributeList } from '../../../../components/user-attribute-list/user-attribute-list'
import { apiClient } from '../../../../services/api'

const DUMMY_UUID = uuidV4()

export function ServerUserDetailScreen({ userId }: { userId: string }) {
  const [user, setUser] = React.useState<UserDTO>()
  React.useEffect(() => {
    if (userId && !user) {
      void apiClient.usersApi
        .getUser({ userId })
        .then((u) => setUser(u.data.user))
    }
  }, [user, userId])

  // const handleSubmitClick = React.useCallback(() => {
  //   void apiClient.usersApi
  //     .updateUser({
  //       userId: userObject.id ?? '',
  //       userUpdateInputDTO: userObject as UserUpdateInputDTO,
  //     })
  //     .then(({ data }) => {
  //       void router.push(`/server/users/${data.user.id}`)
  //     })
  // }, [router, userObject])

  return (
    <>
      <div
        className={cn(
          'flex h-full flex-1 flex-col items-center gap-6 overflow-y-auto',
        )}
      >
        <div className="container flex flex-1 flex-col gap-8">
          <Card className="border-0 bg-transparent">
            <CardHeader className="p-0 pb-4">
              <CardTitle>{user?.username}</CardTitle>
              <CardDescription>ID: {user?.id}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <StatCardGroup
                stats={[
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
                    title: 'Storage Used',
                    label: '5.29TB',
                    subtitle: '+108GB in the last week',
                    icon: HardDrive,
                  },
                  {
                    title: 'Joined',
                    label: timeSinceOrUntil(new Date(1707979480000)),
                    subtitle: new Date(1707979480000).toLocaleString(),
                    icon: HandshakeIcon,
                  },
                ]}
              />
            </CardContent>
          </Card>
          <div className="flex min-w-full items-start gap-4">
            <div className="flex-1">
              <Card className="border-0 bg-transparent">
                <CardHeader className="px-0 pt-2">
                  <CardTitle>
                    <div className="relative flex items-center gap-4">
                      Details
                      <div className="text-muted-foreground absolute left-24 top-0">
                        <Button
                          variant={'outline'}
                          size="xs"
                          className="flex items-center gap-2"
                        >
                          Edit <Edit className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <UserAttributeList user={user} />
                </CardContent>
              </Card>
            </div>
            <Card className="border-0 bg-transparent">
              <CardHeader className="px-0 pt-2">
                <CardTitle>Sessions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  data={[
                    {
                      id: DUMMY_UUID,
                      createdAt: new Date(1727979480000),
                    },
                  ]}
                  columns={[
                    {
                      cell: ({ row }) => <>{row.original.id}</>,
                      accessorKey: 'id',
                      enableSorting: false,
                      header: ({ column }) => (
                        <DataTableColumnHeader
                          canHide={column.getCanHide()}
                          column={column}
                          title="Session ID"
                        />
                      ),
                    },
                    {
                      cell: ({ row }) => (
                        <div className="flex flex-col">
                          {new Date(row.original.createdAt).toLocaleString()}
                          <span className="text-muted-foreground">
                            {timeSinceOrUntil(new Date(row.original.createdAt))}
                          </span>
                        </div>
                      ),
                      accessorKey: 'createdAt',
                      header: ({ column }) => (
                        <DataTableColumnHeader
                          canHide={column.getCanHide()}
                          column={column}
                          title="Created At"
                        />
                      ),
                    },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
