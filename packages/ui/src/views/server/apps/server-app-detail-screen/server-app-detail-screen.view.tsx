import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@lombokapp/ui-toolkit'
import { HardDrive, KeyIcon, OctagonX } from 'lucide-react'
import React from 'react'

import { AppAttributeList } from '@/src/components/app-attribute-list/app-attribute-list'
import { StatCardGroup } from '@/src/components/stat-card-group/stat-card-group'
import { useServerContext } from '@/src/hooks/use-server-context'
import { $api } from '@/src/services/api'

import { serverAppExternalWorkerTableColumns } from './server-app-external-worker-table-columns'
import { serverAppManifestTableColumns } from './server-app-manifest-table-columns'
import { configureServerAppWorkerScriptTableColumns } from './server-app-worker-script-table-columns'

export function ServerAppDetailScreen({
  appIdentifier,
}: {
  appIdentifier: string
}) {
  const serverContext = useServerContext()
  // Remove useState and useEffect for app
  const appQuery = $api.useQuery('get', '/api/v1/server/apps/{appIdentifier}', {
    params: {
      path: {
        appIdentifier,
      },
    },
  })

  const app = appQuery.data?.app
  const [showRawConfig, setShowRawConfig] = React.useState(false)

  // React Query mutation for saving env vars
  const setEnvironmentVariablesMutation = $api.useMutation(
    'put',
    '/api/v1/server/apps/{appIdentifier}/workers/{workerIdentifier}/environment-variables',
    {
      onSuccess: () => appQuery.refetch(),
    },
  )

  const setEnabledMutation = $api.useMutation(
    'put',
    '/api/v1/server/apps/{appIdentifier}/enabled',
    {
      onSuccess: () => {
        void appQuery.refetch()
        void serverContext.refreshApps()
      },
    },
  )

  const handleSetEnabled = React.useCallback(
    async (enabled: boolean) => {
      await setEnabledMutation.mutateAsync({
        params: { path: { appIdentifier } },
        body: { enabled },
      })
    },
    [appIdentifier, setEnabledMutation],
  )

  return (
    <div className={'flex size-full flex-col gap-8'}>
      {!!app && app.enabled === false && (
        <Alert variant="destructive" className="mb-6 border-foreground/20">
          <OctagonX className="size-4" />
          <AlertTitle>App is disabled</AlertTitle>
          <AlertDescription>
            This app is currently disabled. Functionality provided by this app
            may be unavailable until it is enabled.
          </AlertDescription>
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
                {app.enabled ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Disable app</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disable this app?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Users will no longer be able to use features provided
                          by this app until it is enabled again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            void handleSetEnabled(false)
                          }}
                        >
                          Disable
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="default">Enable app</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Enable this app?</AlertDialogTitle>
                        <AlertDialogDescription>
                          The app will be enabled and available for use.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            void handleSetEnabled(true)
                          }}
                        >
                          Enable
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <StatCardGroup
            stats={[
              {
                title: 'Tasks executed in the last 24 hours',
                label: `1204 Completed`,
                subtitle: '181 Failed',
                icon: KeyIcon,
              },
              {
                title: 'Errors in the last 24 hours',
                label: '239',
                subtitle: '5 in the last 10 minutes',
                icon: OctagonX,
              },
              {
                title: 'Storage Used',
                label: '0.9TB',
                subtitle: '+80GB in the last week',
                icon: HardDrive,
              },
            ]}
          />
        </CardContent>
      </Card>
      <Card className="flex-1 border-0 bg-transparent shadow-none">
        <CardHeader className="p-0 pb-4">
          <CardTitle>Worker scripts</CardTitle>
          <CardDescription>
            The worker scripts defined in the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={
              app?.workers
                ? Object.entries(app.workers).map(([workerKey, worker]) => ({
                    identifier: workerKey,
                    ...worker,
                  }))
                : []
            }
            columns={configureServerAppWorkerScriptTableColumns(
              appIdentifier,
              setEnvironmentVariablesMutation,
            )}
          />
        </CardContent>
      </Card>
      <Card className="flex-1 border-0 bg-transparent shadow-none">
        <CardHeader className="p-0 pb-4">
          <CardTitle>External workers</CardTitle>
          <CardDescription>
            The external app workers currently connected to the server.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={app?.externalWorkers ?? []}
            columns={serverAppExternalWorkerTableColumns}
          />
        </CardContent>
      </Card>
      <Card className="flex-1 border-0 bg-transparent shadow-none">
        <CardHeader className="p-0 pb-4">
          <CardTitle>Manifest</CardTitle>
          <CardDescription>All files included in the app.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={Object.entries(app?.manifest ?? {}).map(([path, file]) => ({
              path,
              ...file,
            }))}
            columns={serverAppManifestTableColumns}
          />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              The configuration denotes what the app is allowed to do and access
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <Tabs
              defaultValue={'pretty'}
              value={showRawConfig ? 'json' : 'pretty'}
            >
              <TabsList className="mb-2">
                <TabsTrigger
                  onClick={() => setShowRawConfig((_s) => !_s)}
                  value="pretty"
                >
                  <div className="flex items-center gap-2">Pretty</div>
                </TabsTrigger>
                <TabsTrigger
                  onClick={() => setShowRawConfig((_s) => !_s)}
                  value="json"
                >
                  <div className="flex items-center gap-2">JSON</div>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pretty">
                <AppAttributeList app={app} />
              </TabsContent>
              <TabsContent value="json" className="overflow-x-auto">
                <pre className="overflow-y-auto rounded-lg bg-muted-foreground/5 p-4 text-foreground/75">
                  {JSON.stringify(app?.config, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
