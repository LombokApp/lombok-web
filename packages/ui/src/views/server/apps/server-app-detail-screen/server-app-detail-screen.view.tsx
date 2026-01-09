import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@lombokapp/ui-toolkit/components/alert'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import { DataTable } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { formatBytes } from '@lombokapp/utils'
import {
  ArrowRight,
  HardDrive,
  KeyIcon,
  Menu,
  OctagonX,
  Settings,
} from 'lucide-react'
import { Link } from 'react-router'

import { EmptyState } from '@/src/components/empty-state/empty-state'
import { StatCardGroup } from '@/src/components/stat-card-group/stat-card-group'
import { $api } from '@/src/services/api'
import { formatTriggerLabel } from '@/src/utils/trigger-utils'

import { appContributedRouteLinksTableColumns } from './app-contributed-links-table-columns'
import { serverAppManifestTableColumns } from './server-app-manifest-table-columns'
import { configureServerAppWorkerScriptTableColumns } from './server-app-worker-script-table-columns'
import { serverConnectedAppWorkersTableColumns } from './server-connected-app-workers-table-columns'

const DockerIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M13.983 12.21c-.12 0-.24-.05-.33-.15l-1.48-1.48c-.2-.2-.2-.51 0-.71.2-.2.51-.2.71 0l1.15 1.15 2.83-2.83c.2-.2.51-.2.71 0 .2.2.2.51 0 .71l-3.16 3.16c-.1.1-.23.15-.33.15zm-1.98-3.21c-.12 0-.24-.05-.33-.15l-1.48-1.48c-.2-.2-.2-.51 0-.71.2-.2.51-.2.71 0l1.15 1.15 2.83-2.83c.2-.2.51-.2.71 0 .2.2.2.51 0 .71l-3.16 3.16c-.1.1-.23.15-.33.15zm-2.98 0c-.12 0-.24-.05-.33-.15l-1.48-1.48c-.2-.2-.2-.51 0-.71.2-.2.51-.2.71 0l1.15 1.15 2.83-2.83c.2-.2.51-.2.71 0 .2.2.2.51 0 .71l-3.16 3.16c-.1.1-.23.15-.33.15zm-2.98 0c-.12 0-.24-.05-.33-.15l-1.48-1.48c-.2-.2-.2-.51 0-.71.2-.2.51-.2.71 0l1.15 1.15 2.83-2.83c.2-.2.51-.2.71 0 .2.2.2.51 0 .71l-3.16 3.16c-.1.1-.23.15-.33.15z" />
      <path d="M20.5 2h-17C2.67 2 2 2.67 2 3.5v17c0 .83.67 1.5 1.5 1.5h17c.83 0 1.5-.67 1.5-1.5v-17c0-.83-.67-1.5-1.5-1.5zM20 20H4V4h16v16z" />
      <path d="M13.09 8.91c-.39-.39-1.02-.39-1.41 0l-1.18 1.18c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.18-1.18c.39-.39.39-1.02 0-1.41zm-4.18 0c-.39-.39-1.02-.39-1.41 0l-1.18 1.18c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.18-1.18c.39-.39.39-1.02 0-1.41zm4.18 4.18c-.39-.39-1.02-.39-1.41 0l-1.18 1.18c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.18-1.18c.39-.39.39-1.02 0-1.41zm-4.18 0c-.39-.39-1.02-.39-1.41 0l-1.18 1.18c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.18-1.18c.39-.39.39-1.02 0-1.41z" />
      <path d="M8.5 6.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5S6.17 5 7 5s1.5.67 1.5 1.5zm9 0c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm-9 9c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5S6.17 14 7 14s1.5.67 1.5 1.5zm9 0c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5z" />
    </svg>
  )
}

const JSIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 0h24v24H0V0zm22.034 18.276c-.175-.61-.888-2.066-2.966-2.066v1.381h-1.112v-1.381c-1.777 0-2.966 1.381-2.966 2.966 0 1.585 1.189 2.966 2.966 2.966v-1.381h1.112v1.381c2.078 0 2.791-1.456 2.966-2.066h-1.112zm-11.008-9.557h-1.112V7.228h1.112v1.491zm-1.112-1.934h-1.112v-1.491h1.112v1.491zm2.225 0h-1.112v-1.491h1.112v1.491zm-1.112 1.934h-1.112V7.228h1.112v1.491zM9.678 17.61c0 .795-.756 1.38-1.734 1.38V18.276H6.832v.716c-.975 0-1.734-.589-1.734-1.38 0-.795.759-1.38 1.734-1.38V18.276h1.112v-.716c.978 0 1.734.589 1.734 1.38zm-2.225 0c0 .246.222.44.49.44v-.88c-.268 0-.49.194-.49.44zm4.451 0c0 .795-.756 1.38-1.734 1.38V18.276h-1.112v.716c-.975 0-1.734-.589-1.734-1.38 0-.795.759-1.38 1.734-1.38V18.276h1.112v-.716c.978 0 1.734.589 1.734 1.38zm-2.225 0c0 .246.222.44.49.44v-.88c-.268 0-.49.194-.49.44zM14.712 8.294c0 .795-.756 1.38-1.734 1.38V8.294h-1.112v1.38c-.975 0-1.734-.589-1.734-1.38 0-.795.759-1.38 1.734-1.38V8.294h1.112v-1.38c.978 0 1.734.589 1.734 1.38zm-2.225 0c0 .246.222.44.49.44v-.88c-.268 0-.49.194-.49.44zm4.451 0c0 .795-.756 1.38-1.734 1.38V8.294h-1.112v1.38c-.975 0-1.734-.589-1.734-1.38 0-.795.759-1.38 1.734-1.38V8.294h1.112v-1.38c.978 0 1.734.589 1.734 1.38zm-2.225 0c0 .246.222.44.49.44v-.88c-.268 0-.49.194-.49.44z"
        fill="currentColor"
      />
    </svg>
  )
}

export function ServerAppDetailScreen({
  appIdentifier,
}: {
  appIdentifier: string
}) {
  const appPathContributionTypes = [
    'sidebarMenuLinks',
    'folderSidebarViews',
    'objectSidebarViews',
    'objectDetailViews',
  ] as const
  const appPathContributionTypeLabels = {
    sidebarMenuLinks: 'Sidebar menu links',
    folderSidebarViews: 'Folder sidebar views',
    objectSidebarViews: 'Object sidebar views',
    objectDetailViews: 'Object detail views',
  } as const

  const appPathContributionTypeDescriptions = {
    sidebarMenuLinks: 'App views that can replace the main content object view',
    folderSidebarViews: 'App views that can are rendered in the folder sidebar',
    objectSidebarViews: 'App views that can are rendered in the object sidebar',
    objectDetailViews:
      'App views that can replace the main content object view',
  } as const

  const appRouteLinkContributionTypeEmptyMessages = {
    sidebarMenuLinks: 'No sidebar menu links configured',
    folderSidebarViews: 'No folder sidebar views available',
    objectSidebarViews: 'No object sidebar views available',
    objectDetailViews: 'No object detail views configured',
  } as const

  const appQuery = $api.useQuery('get', '/api/v1/server/apps/{appIdentifier}', {
    params: {
      path: {
        appIdentifier,
      },
    },
  })

  const app = appQuery.data?.app
  // Remove useState and useEffect for app

  // React Query mutation for saving env vars
  const setEnvironmentVariablesMutation = $api.useMutation(
    'put',
    '/api/v1/server/apps/{appIdentifier}/workers/{workerIdentifier}/environment-variables',
    {
      onSuccess: () => appQuery.refetch(),
    },
  )

  return (
    <div className={'flex size-full flex-col gap-8'}>
      {!!app && !app.enabled && (
        <Alert variant="destructive" className="mb-6 border-foreground/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <OctagonX className="size-4" />
              <div>
                <AlertTitle>App is disabled</AlertTitle>
                <AlertDescription>
                  This app is currently disabled. Functionality provided by this
                  app may be unavailable until it is enabled.
                </AlertDescription>
              </div>
            </div>
            <div>
              <Link to={`/server/settings/apps/${appIdentifier}`}>
                <Button variant="outline" asChild>
                  <div>
                    <Settings className="mr-2 size-4" />
                    Enable in app settings
                    <ArrowRight className="ml-2 size-4" />
                  </div>
                </Button>
              </Link>
            </div>
          </div>
        </Alert>
      )}
      <Card className="flex-1 border-0 bg-transparent shadow-none">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>App: {app?.identifier.toUpperCase()}</CardTitle>
              <CardDescription>{app?.config.description}</CardDescription>
            </div>
            {!!app && (
              <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                  <Link to={`/server/settings/apps/${appIdentifier}`}>
                    <Settings className="size-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <StatCardGroup
            stats={[
              {
                title: 'Tasks executed in the last 24 hours',
                label: `${app?.metrics?.tasksExecutedLast24Hours.completed ?? 0} Completed`,
                subtitle: `${app?.metrics?.tasksExecutedLast24Hours.failed ?? 0} Failed`,
                icon: KeyIcon,
              },
              {
                title: 'Errors in the last 24 hours',
                label: `${app?.metrics?.errorsLast24Hours.total ?? 0}`,
                subtitle: `${app?.metrics?.errorsLast24Hours.last10Minutes ?? 0} in the last 10 minutes`,
                icon: OctagonX,
              },
              {
                title: 'Events emitted in the last 24 hours',
                label: `${app?.metrics?.eventsEmittedLast24Hours.total ?? 0}`,
                subtitle: `${app?.metrics?.eventsEmittedLast24Hours.last10Minutes ?? 0} in the last 10 minutes`,
                icon: HardDrive,
              },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <div className="flex flex-col gap-8">
            <Card className="flex-1 border-0 bg-transparent shadow-none">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="pt-6">
                  Runtime Workers
                  <div className="flex flex-col">
                    <span
                      id="worker-scripts-description"
                      className="text-sm font-normal text-muted-foreground/70"
                    >
                      Javascript workers that Lombok can execute as serverless
                      functions mode
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {Object.keys(app?.runtimeWorkers ?? {}).length === 0 ? (
                  <EmptyState
                    variant="row-sm"
                    icon={Menu}
                    text={'No worker scripts included'}
                  />
                ) : (
                  <DataTable
                    fixedLayout
                    className="bg-background/50"
                    bodyCellClassName="w-1/3"
                    headerCellClassName={cn(
                      'w-1/3',
                      'bg-foreground/[0.02] text-foreground/50',
                    )}
                    data={Object.entries(
                      app?.runtimeWorkers.definitions ?? {},
                    ).map(([workerKey, worker]) => ({
                      identifier: workerKey,
                      ...worker,
                    }))}
                    columns={configureServerAppWorkerScriptTableColumns(
                      appIdentifier,
                      setEnvironmentVariablesMutation,
                    )}
                  />
                )}
              </CardContent>
            </Card>
            <Card className="flex-1 border-0 bg-transparent shadow-none">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="py-0 text-base">
                  <div className="flex flex-col">
                    <span>
                      Manifest{' '}
                      {app?.ui?.size
                        ? `(${formatBytes(app.runtimeWorkers.size)})`
                        : ''}
                    </span>
                    <span
                      id="folder-object-view-contribution-description"
                      className="text-sm font-normal text-muted-foreground/70"
                    >
                      All runtime worker files
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col gap-8">
                  {Object.keys(app?.runtimeWorkers.manifest ?? {}).length ===
                  0 ? (
                    <EmptyState
                      variant="row-sm"
                      icon={Menu}
                      text={'No files included'}
                    />
                  ) : (
                    <DataTable
                      className="bg-background/50"
                      headerCellClassName={cn(
                        'bg-foreground/[0.02] text-foreground/50',
                      )}
                      data={Object.entries(
                        app?.runtimeWorkers.manifest ?? {},
                      ).map(([path, file]) => ({
                        path,
                        ...file,
                      }))}
                      columns={serverAppManifestTableColumns}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1 border-0 bg-transparent shadow-none">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="py-0 text-base">
                  <div className="flex flex-col">
                    <span className="pr-2">Runtime Worker Connections</span>
                    <span
                      id="connected-workers-description"
                      className="text-sm font-normal text-muted-foreground/70"
                    >
                      The runtime workers currently connected to the server
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  fixedLayout
                  className="bg-background/50"
                  bodyCellClassName="w-1/3"
                  headerCellClassName={cn(
                    'w-1/3',
                    'bg-foreground/[0.02] text-foreground/50',
                  )}
                  data={app?.connectedRuntimeWorkers ?? []}
                  columns={serverConnectedAppWorkersTableColumns}
                />
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>Tasks defined by the app</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-8">
            {Object.keys(app?.config.tasks ?? {}).length === 0 ? (
              <EmptyState
                variant="row-sm"
                icon={Menu}
                text={'No tasks configured'}
              />
            ) : (
              <DataTable
                className="bg-background/50"
                bodyCellClassName="truncate"
                headerCellClassName={cn(
                  'bg-foreground/[0.02] text-foreground/50',
                )}
                data={
                  app?.config.tasks?.map((task) => ({
                    identifier: task.identifier,
                    label: task.label,
                    description: task.description,
                    triggers:
                      app.config.triggers
                        ?.filter(
                          (trigger) =>
                            trigger.taskIdentifier === task.identifier,
                        )
                        .map(formatTriggerLabel)
                        .join(', ') ?? 'None',
                    handlerType: task.handler.type,
                    handler:
                      task.handler.type === 'runtime' ||
                      task.handler.type === 'docker' // eslint-disable-line @typescript-eslint/no-unnecessary-condition
                        ? task.handler.identifier
                        : null,
                  })) ?? []
                }
                columns={[
                  {
                    accessorKey: 'description',
                    header: 'Description',
                    cell: ({ row }) => (
                      <div className="truncate">
                        <div className="flex gap-2">
                          <div className="font-bold">
                            {row.original.label || ''}
                          </div>
                          <div className="truncate font-mono italic opacity-50">
                            {row.original.identifier || ''}
                          </div>
                        </div>
                        <div className="truncate text-sm opacity-65">
                          {row.original.description || ''}
                        </div>
                      </div>
                    ),
                  },
                  {
                    accessorKey: 'triggers',
                    header: 'Triggers',
                  },
                  {
                    accessorKey: 'handler',
                    header: 'Handler',
                    cell: ({ row }) => (
                      <div className="flex items-center gap-2">
                        {row.original.handlerType === 'docker' ? (
                          <DockerIcon className="size-8" />
                        ) : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        row.original.handlerType === 'runtime' ? (
                          <JSIcon className="size-8" />
                        ) : null}
                        <div>{row.original.handler}</div>
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>User Interface</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-8">
            <Card className="flex-1 border-0 bg-transparent shadow-none">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="py-0 text-base">
                  <div className="flex flex-col">
                    <span>
                      Manifest{' '}
                      {app?.ui?.size ? `(${formatBytes(app.ui.size)})` : ''}
                    </span>
                    <span
                      id="folder-object-view-contribution-description"
                      className="text-sm font-normal text-muted-foreground/70"
                    >
                      All UI files
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col gap-8">
                  {Object.keys(app?.ui?.manifest ?? {}).length === 0 ? (
                    <EmptyState
                      variant="row-sm"
                      icon={Menu}
                      text={'No files included'}
                    />
                  ) : (
                    <DataTable
                      className="bg-background/50"
                      headerCellClassName={cn(
                        'bg-foreground/[0.02] text-foreground/50',
                      )}
                      data={Object.entries(app?.ui?.manifest ?? {}).map(
                        ([path, file]) => ({
                          path,
                          ...file,
                        }),
                      )}
                      columns={serverAppManifestTableColumns}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
            {appPathContributionTypes.map((linkContributionType) => {
              const data = app?.contributions[linkContributionType] ?? []

              return (
                <Card
                  key={linkContributionType}
                  className="flex-1 border-0 bg-transparent shadow-none"
                  aria-describedby="folder-object-view-contribution-description"
                >
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="py-0 text-base">
                      <div className="flex flex-col">
                        <span>
                          {appPathContributionTypeLabels[linkContributionType]}
                        </span>
                        <span
                          id="folder-object-view-contribution-description"
                          className="text-sm font-normal text-muted-foreground/70"
                        >
                          {
                            appPathContributionTypeDescriptions[
                              linkContributionType
                            ]
                          }
                        </span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {data.length > 0 ? (
                      <DataTable
                        data={data}
                        columns={appContributedRouteLinksTableColumns}
                        className=""
                        bodyCellClassName="w-1/3"
                        headerCellClassName="w-1/3 bg-foreground/[0.02] text-foreground/50"
                      />
                    ) : (
                      <EmptyState
                        variant="row-sm"
                        icon={Menu}
                        text={
                          appRouteLinkContributionTypeEmptyMessages[
                            linkContributionType
                          ]
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Manifest</CardTitle>
          <CardDescription>
            All files included in the app bundle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-8">
            {Object.keys(app?.manifest ?? {}).length === 0 ? (
              <EmptyState
                variant="row-sm"
                icon={Menu}
                text={'No files included'}
              />
            ) : (
              <DataTable
                fixedLayout
                className="bg-background/50"
                bodyCellClassName="w-1/3"
                headerCellClassName={cn(
                  'w-1/3',
                  'bg-foreground/[0.02] text-foreground/50',
                )}
                data={Object.entries(app?.manifest ?? {}).map(
                  ([path, file]) => ({
                    path,
                    ...file,
                  }),
                )}
                columns={serverAppManifestTableColumns}
              />
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Configuration (JSON)</CardTitle>
            <CardDescription>
              The raw content of the app's configuration file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-foreground/5 p-4">
              <pre className="whitespace-pre-wrap break-words text-foreground/75">
                {JSON.stringify(app?.config, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
