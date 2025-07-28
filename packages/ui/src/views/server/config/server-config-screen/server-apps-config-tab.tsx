import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Icons,
} from '@stellariscloud/ui-toolkit'
import React from 'react'

import { $api } from '@/src/services/api'

export function ServerAppsConfigTab() {
  const [isInstalling, setIsInstalling] = React.useState(false)

  const installAppsMutation = $api.useMutation(
    'post',
    '/api/v1/server/install-local-apps' as never,
  )

  const handleInstallAllApps = React.useCallback(() => {
    setIsInstalling(true)
    void installAppsMutation.mutateAsync(undefined).finally(() => {
      setIsInstalling(false)
    })
  }, [installAppsMutation])

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Install Local Apps</CardTitle>
          <CardDescription>
            Scan and install all apps that are available in your server's local
            apps directory. This will automatically detect apps in the
            configured apps directory and install them if they meet the
            requirements. Apps that are already installed will be skipped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">This process will:</p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>Scan the local apps directory for available applications</li>
              <li>Validate each app's configuration and requirements</li>
              <li>Install apps that are not already installed</li>
              <li>
                Skip apps that are already installed or don't meet requirements
              </li>
              <li>Upload app assets to your configured storage location</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button
            onClick={handleInstallAllApps}
            disabled={isInstalling}
            className="flex items-center gap-2"
          >
            {isInstalling && <Icons.spinner className="size-4 animate-spin" />}
            {isInstalling ? 'Installing Apps...' : 'Install All Local Apps'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
