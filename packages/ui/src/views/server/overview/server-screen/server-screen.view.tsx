import {
  cn,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@stellariscloud/ui-toolkit'
import {
  AppWindow,
  ChartLine,
  Database,
  Folders,
  HardDrive,
  LayoutGrid,
  ListChecks,
  Settings,
  Users,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { StatCardGroup } from '../../../../components/stat-card-group/stat-card-group'
import { ServerAppDetailScreen } from '../../apps/server-app-detail-screen/server-app-detail-screen.view'
import { ServerAppsScreen } from '../../apps/server-apps-screen/server-apps-screen.view'
import { ServerConfigScreen } from '../../config/server-config-screen/server-config-screen'
import { ServerEventDetailScreen } from '../../events/server-event-detail-screen/server-event-detail-screen.view'
import { ServerEventsScreen } from '../../events/server-events-screen/server-events-screen.view'
import { ServerTaskDetailScreen } from '../../tasks/server-task-detail-screen/server-task-detail-screen.view'
import { ServerTasksScreen } from '../../tasks/server-tasks-screen/server-tasks-screen.view'
import { ServerUserDetailScreen } from '../../users/server-user-detail-screen/server-user-detail-screen.view'
import { ServerUsersScreen } from '../../users/server-users-screen/server-users-screen.view'

export function ServerScreen({ serverPage }: { serverPage: string[] }) {
  const navigate = useNavigate()
  const params = useParams()
  const paramParts = params['*']?.split('/') ?? []

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <div className="container flex flex-1 flex-col">
        <div className="md:hidden">
          <img
            src="/examples/dashboard-light.png"
            width={1280}
            height={866}
            alt="Dashboard"
            className="dark:hidden block"
          />
          <img
            src="/examples/dashboard-dark.png"
            width={1280}
            height={866}
            alt="Dashboard"
            className="dark:block hidden"
          />
        </div>
        <div className="hidden flex-col md:flex">
          <div className="flex-1">
            <Tabs defaultValue={serverPage[0]} value={serverPage[0]}>
              <div className="flex flex-col items-start gap-3 pb-6">
                <TabsList>
                  <TabsTrigger
                    onClick={() => void navigate('/server')}
                    value="overview"
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="size-4" />
                      Overview
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    onClick={() => void navigate('/server/users')}
                    value="users"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="size-4" />
                      Users
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    onClick={() => void navigate('/server/apps')}
                    value="apps"
                  >
                    <div className="flex items-center gap-2">
                      <AppWindow className="size-4" />
                      Apps
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    onClick={() => void navigate('/server/events')}
                    value="events"
                  >
                    <div className="flex items-center gap-2">
                      <ChartLine className="size-4" />
                      Events
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    onClick={() => void navigate('/server/tasks')}
                    value="tasks"
                  >
                    <div className="flex items-center gap-2">
                      <ListChecks className="size-4" />
                      Tasks
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    onClick={() => void navigate('/server/config')}
                    value="config"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="size-4" />
                      Config
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>
              {(serverPage.length === 1 || serverPage[0] === 'config') && (
                <div className="pb-6">
                  <TabsContent value="users">
                    <ServerUsersScreen />
                  </TabsContent>
                  <TabsContent value="events">
                    <ServerEventsScreen />
                  </TabsContent>
                  <TabsContent value="apps">
                    <ServerAppsScreen />
                  </TabsContent>
                  <TabsContent value="tasks">
                    <ServerTasksScreen />
                  </TabsContent>
                  <TabsContent value="config">
                    {paramParts[0] === 'config' && (
                      <ServerConfigScreen tab={paramParts[1] ?? 'general'} />
                    )}
                  </TabsContent>
                  <TabsContent value="overview">
                    <div className="flex flex-col gap-4">
                      <StatCardGroup
                        stats={[
                          {
                            title: 'Total Users',
                            label: '47',
                            subtitle: '+ 3 in the last week',
                            icon: Users,
                          },
                          {
                            title: 'Total Folders',
                            label: '389',
                            subtitle: '+27 in the last week',
                            icon: Folders,
                          },
                          {
                            title: 'Total Indexed',
                            label: '45.53TB',
                            subtitle: '+354GB in the last week',
                            icon: HardDrive,
                          },
                        ]}
                      />
                      <StatCardGroup
                        stats={[
                          {
                            title: 'Storage Provisions',
                            label: '4',
                            subtitle:
                              'MinIO NL, Minio FR, AWS USEast1 and one more',
                            icon: Database,
                          },
                          {
                            title: 'Storage Used',
                            label: '10.19TB',
                            subtitle: '+42GB in the last week',
                            icon: HardDrive,
                          },
                          {
                            title: 'Total Folders',
                            label: '389',
                            subtitle: '+27 in the last week',
                            icon: Folders,
                          },
                        ]}
                      />
                    </div>
                    <StatCardGroup stats={[]} />
                  </TabsContent>
                </div>
              )}
            </Tabs>
          </div>
        </div>
        {serverPage[0] === 'events' && typeof serverPage[1] === 'string' && (
          <ServerEventDetailScreen eventId={serverPage[1]} />
        )}
        {serverPage[0] === 'apps' && typeof serverPage[1] === 'string' && (
          <ServerAppDetailScreen appIdentifier={serverPage[1]} />
        )}
        {serverPage[0] === 'users' && typeof serverPage[1] === 'string' && (
          <ServerUserDetailScreen userId={serverPage[1]} />
        )}
        {serverPage[0] === 'tasks' && typeof serverPage[1] === 'string' && (
          <ServerTaskDetailScreen taskId={serverPage[1]} />
        )}
      </div>
    </div>
  )
}
