import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@lombokapp/ui-toolkit/components/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@lombokapp/ui-toolkit/components/alert-dialog'
import { Button } from '@lombokapp/ui-toolkit/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@lombokapp/ui-toolkit/components/card'
import { DataTable } from '@lombokapp/ui-toolkit/components/data-table'
import { Input } from '@lombokapp/ui-toolkit/components/input'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { formatBytes } from '@lombokapp/utils'
import {
  ArrowRight,
  HardDrive,
  KeyIcon,
  Menu,
  OctagonX,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react'
import React from 'react'
import { Link, useNavigate } from 'react-router'

import { AppIcon, iconRendersAsGlyph } from '@/src/components/app-icon'
import { EmptyState } from '@/src/components/empty-state/empty-state'
import { DockerIcon } from '@/src/components/icons/docker-icon'
import { JavaScriptIcon } from '@/src/components/icons/javascript-icon'
import { TypeScriptIcon } from '@/src/components/icons/typescript-icon'
import { StatCardGroup } from '@/src/components/stat-card-group/stat-card-group'
import { $api, $apiClient } from '@/src/services/api'
import { formatTriggerLabel } from '@/src/utils/trigger-utils'

import { appContributedRouteLinksTableColumns } from './app-contributed-links-table-columns'
import { serverAppManifestTableColumns } from './server-app-manifest-table-columns'
import { configureServerAppWorkerScriptTableColumns } from './server-app-worker-script-table-columns'
import { serverConnectedAppWorkersTableColumns } from './server-connected-app-workers-table-columns'

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
    'folderDetailViews',
  ] as const
  const appPathContributionTypeLabels = {
    sidebarMenuLinks: 'Sidebar menu links',
    folderSidebarViews: 'Folder sidebar views',
    objectSidebarViews: 'Object sidebar views',
    objectDetailViews: 'Object detail views',
    folderDetailViews: 'Folder detail views',
  } as const

  const appPathContributionTypeDescriptions = {
    sidebarMenuLinks:
      'App views that are rendered as links in the sidebar menu',
    folderSidebarViews: 'App views that are rendered in the folder sidebar',
    objectSidebarViews: 'App views that are rendered in the object sidebar',
    objectDetailViews:
      'App views that are rendered in the main content view of a folder object',
    folderDetailViews:
      'App views that are rendered in the main content view of a folder',
  } as const

  const appRouteLinkContributionTypeEmptyMessages = {
    sidebarMenuLinks: 'No sidebar menu links configured',
    folderSidebarViews: 'No folder sidebar views available',
    objectSidebarViews: 'No object sidebar views available',
    objectDetailViews: 'No object detail views configured',
    folderDetailViews: 'No folder detail views configured',
  } as const

  const appQuery = $api.useQuery('get', '/api/v1/server/apps/{appIdentifier}', {
    params: {
      path: {
        appIdentifier,
      },
    },
  })

  const app = appQuery.data?.app
  const navigate = useNavigate()
  const { toast } = useToast()
  const upgradeFileInputRef = React.useRef<HTMLInputElement>(null)
  const [upgradeFile, setUpgradeFile] = React.useState<File | null>(null)
  const [isUpgrading, setIsUpgrading] = React.useState(false)
  const [isUninstalling, setIsUninstalling] = React.useState(false)

  // React Query mutation for saving env vars
  const setEnvironmentVariablesMutation = $api.useMutation(
    'put',
    '/api/v1/server/apps/{appIdentifier}/workers/{workerIdentifier}/environment-variables',
    {
      onSuccess: () => appQuery.refetch(),
    },
  )

  const handleUpgrade = React.useCallback(async () => {
    if (!upgradeFile) {
      return
    }
    setIsUpgrading(true)
    try {
      const formData = new FormData()
      formData.append('file', upgradeFile)
      const res = await $apiClient.POST(
        '/api/v1/server/apps/{appIdentifier}/upgrade',
        {
          params: { path: { appIdentifier } },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body: formData as any,
        },
      )
      if (res.error) {
        throw new Error(res.error.message || 'Upgrade failed')
      }
      toast({
        title: 'App upgraded',
        description: 'The new bundle has been installed.',
      })
      setUpgradeFile(null)
      if (upgradeFileInputRef.current) {
        upgradeFileInputRef.current.value = ''
      }
      await appQuery.refetch()
    } catch (error) {
      toast({
        title: 'Failed to upgrade app',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsUpgrading(false)
    }
  }, [upgradeFile, appIdentifier, toast, appQuery])

  const handleUninstall = React.useCallback(async () => {
    setIsUninstalling(true)
    try {
      const res = await $apiClient.DELETE(
        '/api/v1/server/apps/{appIdentifier}',
        { params: { path: { appIdentifier } } },
      )
      if (res.error) {
        throw new Error(res.error.message || 'Uninstall failed')
      }
      toast({
        title: 'App uninstalled',
        description: `${appIdentifier} has been removed.`,
      })
      void navigate('/server/settings/apps')
    } catch (error) {
      toast({
        title: 'Failed to uninstall app',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
      setIsUninstalling(false)
    }
  }, [appIdentifier, navigate, toast])

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
            <div className="flex items-start gap-4">
              {app &&
                (iconRendersAsGlyph(app.config.icon) ? (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-foreground/[0.02]">
                    <AppIcon
                      icon={app.config.icon}
                      appIdentifier={app.identifier}
                      fallbackLabel={app.label}
                      size={32}
                    />
                  </div>
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center">
                    <AppIcon
                      icon={app.config.icon}
                      appIdentifier={app.identifier}
                      fallbackLabel={app.label}
                      size={48}
                    />
                  </div>
                ))}
              <div>
                <CardTitle>App: {app?.identifier.toUpperCase()}</CardTitle>
                <CardDescription>{app?.config.description}</CardDescription>
              </div>
            </div>
            {!!app && (
              <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                  <Link to={`/server/settings/apps/${appIdentifier}`}>
                    <Settings className="size-4" />
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Upload className="mr-2 size-4" />
                      Upgrade
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Upgrade {app.label}</AlertDialogTitle>
                      <AlertDialogDescription>
                        Upload a new zip bundle for this app. The bundle's slug
                        must match{' '}
                        <span className="font-medium">{app.slug}</span>.
                        Existing user data, settings, and per-app database
                        contents are preserved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-2">
                      <Input
                        ref={upgradeFileInputRef}
                        type="file"
                        accept=".zip,application/zip,application/x-zip-compressed"
                        onChange={(e) =>
                          setUpgradeFile(e.target.files?.[0] ?? null)
                        }
                        disabled={isUpgrading}
                      />
                      {upgradeFile && (
                        <p className="text-sm text-muted-foreground">
                          Selected: {upgradeFile.name} (
                          {(upgradeFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        onClick={() => {
                          setUpgradeFile(null)
                          if (upgradeFileInputRef.current) {
                            upgradeFileInputRef.current.value = ''
                          }
                        }}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={!upgradeFile || isUpgrading}
                        onClick={() => void handleUpgrade()}
                      >
                        {isUpgrading ? 'Upgrading...' : 'Upgrade'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="mr-2 size-4" />
                      Uninstall
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Uninstall {app.label}</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes{' '}
                        <span className="font-medium">{app.identifier}</span>:
                        worker sockets are disconnected, containers and tunnel
                        sessions are destroyed, per-user/folder settings and the
                        per-app database schema are dropped, and the bundle is
                        deleted from storage. Historical tasks, events, and logs
                        are retained for audit. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isUninstalling}
                        onClick={() => void handleUninstall()}
                      >
                        {isUninstalling ? 'Uninstalling...' : 'Uninstall'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
                    entrypoint:
                      task.handler.type === 'runtime'
                        ? app.runtimeWorkers.definitions[
                            task.handler.identifier
                          ]?.entrypoint
                        : undefined,
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
                          row.original.entrypoint?.endsWith('.ts') ? (
                            <TypeScriptIcon className="size-8" />
                          ) : (
                            <JavaScriptIcon className="size-8" />
                          )
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
              const data = (app?.contributions[linkContributionType] ?? []).map(
                (link) => ({
                  ...link,
                  appIdentifier: app?.identifier ?? '',
                }),
              )

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
