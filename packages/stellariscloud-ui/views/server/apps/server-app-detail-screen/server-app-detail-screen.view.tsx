import type { AppDTO } from '@stellariscloud/api-client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  DataTable,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@stellariscloud/ui-toolkit'
import { HardDrive, KeyIcon, OctagonX } from 'lucide-react'
import React from 'react'

import { AppAttributeList } from '../../../../components/app-attribute-list/app-attribute-list'
import { StatCardGroup } from '../../../../components/stat-card-group/stat-card-group'
import { apiClient } from '../../../../services/api'
import { serverAppManifestTableColumns } from './server-app-manifest-table-columns'
import { serverAppWorkerTableColumns } from './server-app-worker-table-columns'

export function ServerAppDetailScreen({
  appIdentifier,
}: {
  appIdentifier: string
}) {
  const [app, setApp] = React.useState<AppDTO>()
  React.useEffect(() => {
    if (appIdentifier && !app) {
      void apiClient.appsApi
        .getApp({ appIdentifier })
        .then((u) => setApp(u.data.app))
    }
  }, [app, appIdentifier])
  const [showRawConfig, setShowRawConfig] = React.useState(false)
  return (
    <div className={cn('flex size-full flex-1 flex-col items-center gap-6')}>
      <div className="container flex flex-col gap-8">
        <Card className="flex-1 border-0 bg-transparent">
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
        <Card className="flex-1 border-0 bg-transparent">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Workers</CardTitle>
            <CardDescription>
              The ephemeral and long-lived app workers currently connected to
              the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={app?.connectedWorkers ?? []}
              columns={serverAppWorkerTableColumns}
            />
          </CardContent>
        </Card>
        <Card className="flex-1 border-0 bg-transparent">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Manifest</CardTitle>
            <CardDescription>All files included in the app.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={app?.manifest ?? []}
              columns={serverAppManifestTableColumns}
            />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="border-0 bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                The configuration denotes what the app is allowed to do and
                access
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <Tabs
                defaultValue={'pretty'}
                value={showRawConfig ? 'json' : 'pretty'}
              >
                <TabsList>
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
                  <pre className="bg-muted-foreground/5 text-foreground/75 overflow-y-auto rounded-lg p-4">
                    {JSON.stringify(app, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
