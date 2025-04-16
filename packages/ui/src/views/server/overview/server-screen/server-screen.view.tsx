import {
  Card,
  CardContent,
  CardHeader,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  cn,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TypographyH3,
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'

import { StatCardGroup } from '../../../../components/stat-card-group/stat-card-group'
import { ServerAppDetailScreen } from '../../apps/server-app-detail-screen/server-app-detail-screen.view'
import { ServerAppsScreen } from '../../apps/server-apps-screen/server-apps-screen.view'
import { ServerConfigScreen } from '../../config/server-config-screen/server-config-screen'
import { ServerAccessKeyDetailScreen } from '../../config/storage/server-access-keys/server-access-key-detail-screen/server-access-key-detail-screen.view'
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

                      {/* User Growth Chart */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Card>
                          <CardHeader className="p-4 pb-1 pt-3">
                            <TypographyH3>User Growth</TypographyH3>
                          </CardHeader>
                          <CardContent className="p-4">
                            {/* User growth bar chart */}
                            <ChartContainer
                              config={{
                                users: {
                                  label: 'Users',
                                  color: '#2563eb',
                                },
                                newUsers: {
                                  label: 'New Users',
                                  color: '#60a5fa',
                                },
                              }}
                              className="h-[250px] w-full"
                            >
                              <BarChart
                                accessibilityLayer
                                data={[
                                  { month: 'Jan', users: 35, newUsers: 12 },
                                  { month: 'Feb', users: 38, newUsers: 8 },
                                  { month: 'Mar', users: 40, newUsers: 5 },
                                  { month: 'Apr', users: 42, newUsers: 7 },
                                  { month: 'May', users: 45, newUsers: 9 },
                                  { month: 'Jun', users: 47, newUsers: 3 },
                                ]}
                              >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                  dataKey="month"
                                  tickLine={false}
                                  tickMargin={10}
                                  axisLine={false}
                                />
                                <YAxis tickLine={false} axisLine={false} />
                                <ChartTooltip
                                  content={<ChartTooltipContent />}
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar
                                  dataKey="users"
                                  fill="var(--color-users)"
                                  radius={4}
                                />
                                <Bar
                                  dataKey="newUsers"
                                  fill="var(--color-newUsers)"
                                  radius={4}
                                />
                              </BarChart>
                            </ChartContainer>
                          </CardContent>
                        </Card>

                        {/* Storage Usage Chart */}
                        <Card>
                          <CardHeader className="p-4 pb-1 pt-3">
                            <TypographyH3>Storage Usage (TB)</TypographyH3>
                          </CardHeader>
                          <CardContent className="p-4">
                            {/* Storage usage line chart */}
                            <ChartContainer
                              config={{
                                minio: {
                                  label: 'MinIO',
                                  color: '#2563eb',
                                },
                                aws: {
                                  label: 'AWS',
                                  color: '#60a5fa',
                                },
                                local: {
                                  label: 'Local',
                                  color: '#93c5fd',
                                },
                              }}
                              className="h-[250px] w-full"
                            >
                              <LineChart
                                accessibilityLayer
                                data={[
                                  {
                                    month: 'Jan',
                                    minio: 2.8,
                                    aws: 1.5,
                                    local: 4.1,
                                  },
                                  {
                                    month: 'Feb',
                                    minio: 3.2,
                                    aws: 1.8,
                                    local: 4.3,
                                  },
                                  {
                                    month: 'Mar',
                                    minio: 3.5,
                                    aws: 2.1,
                                    local: 4.2,
                                  },
                                  {
                                    month: 'Apr',
                                    minio: 3.8,
                                    aws: 2.3,
                                    local: 4.4,
                                  },
                                  {
                                    month: 'May',
                                    minio: 4.1,
                                    aws: 2.5,
                                    local: 4.5,
                                  },
                                  {
                                    month: 'Jun',
                                    minio: 4.5,
                                    aws: 2.7,
                                    local: 4.6,
                                  },
                                ]}
                              >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                  dataKey="month"
                                  tickLine={false}
                                  tickMargin={10}
                                  axisLine={false}
                                />
                                <YAxis tickLine={false} axisLine={false} />
                                <ChartTooltip
                                  content={<ChartTooltipContent />}
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Line
                                  type="monotone"
                                  dataKey="minio"
                                  stroke="var(--color-minio)"
                                  strokeWidth={2}
                                  dot={{ r: 4 }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="aws"
                                  stroke="var(--color-aws)"
                                  strokeWidth={2}
                                  dot={{ r: 4 }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="local"
                                  stroke="var(--color-local)"
                                  strokeWidth={2}
                                  dot={{ r: 4 }}
                                />
                              </LineChart>
                            </ChartContainer>
                          </CardContent>
                        </Card>
                      </div>
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
        {serverPage[0] === 'access-keys' &&
          typeof serverPage[1] === 'string' && (
            <ServerAccessKeyDetailScreen accessKeyHashId={serverPage[1]} />
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
