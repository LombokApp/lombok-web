import {
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
} from '@stellariscloud/ui-toolkit'
import { HardDrive, KeyIcon, OctagonX } from 'lucide-react'
import React from 'react'

import { $api } from '@/src/services/api'

import { AppAttributeList } from '../../../../components/app-attribute-list/app-attribute-list'
import { StatCardGroup } from '../../../../components/stat-card-group/stat-card-group'
import { serverAppExternalWorkerTableColumns } from './server-app-external-worker-table-columns'
import { serverAppManifestTableColumns } from './server-app-manifest-table-columns'
import { configureServerAppWorkerScriptTableColumns } from './server-app-worker-script-table-columns'

export function ServerAppDetailScreen({
  appIdentifier,
}: {
  appIdentifier: string
}) {
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
  const setEnvVarsMutation = $api.useMutation(
    'put',
    '/api/v1/server/apps/{appIdentifier}/workers/{workerIdentifier}/env-vars',
    {
      onSuccess: () => appQuery.refetch(),
    },
  )

  return (
    <div className={'flex size-full flex-1 flex-col gap-8'}>
      <Card className="flex-1 border-0 bg-transparent shadow-none">
        <CardHeader className="p-0 pb-4">
          <CardTitle>App: {app?.identifier.toUpperCase()}</CardTitle>
          <CardDescription>{app?.config.description}</CardDescription>
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
            data={app?.workerScripts ?? []}
            columns={configureServerAppWorkerScriptTableColumns(
              appIdentifier,
              setEnvVarsMutation,
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
