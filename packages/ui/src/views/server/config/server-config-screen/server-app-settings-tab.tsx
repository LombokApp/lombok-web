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
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import { Checkbox } from '@lombokapp/ui-toolkit/components/checkbox'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import { OctagonX } from 'lucide-react'
import React from 'react'

import { useServerContext } from '@/src/contexts/server'
import { $api } from '@/src/services/api'

export function ServerAppSettingsTab({
  appIdentifier,
}: {
  appIdentifier: string
}) {
  const appQuery = $api.useQuery('get', '/api/v1/server/apps/{appIdentifier}', {
    params: {
      path: {
        appIdentifier,
      },
    },
  })

  const app = appQuery.data?.app
  const serverContext = useServerContext()
  const { toast } = useToast()

  const [userScopeEnabledDefault, setUserScopeEnabledDefault] = React.useState(
    app?.userScopeEnabledDefault ?? false,
  )
  const [folderScopeEnabledDefault, setFolderScopeEnabledDefault] =
    React.useState(app?.folderScopeEnabledDefault ?? false)

  React.useEffect(() => {
    if (app) {
      setUserScopeEnabledDefault(app.userScopeEnabledDefault)
      setFolderScopeEnabledDefault(app.folderScopeEnabledDefault)
    }
  }, [app])

  const updateAccessSettingsMutation = $api.useMutation(
    'put',
    '/api/v1/server/apps/{appIdentifier}/access-settings',
    {
      onSuccess: () => {
        void appQuery.refetch()
        toast({
          title: 'Access settings saved successfully',
          description: 'The access settings have been updated.',
        })
      },
      onError: () => {
        toast({
          title: 'Failed to save access settings',
          description: 'An error occurred while saving the access settings.',
          variant: 'destructive',
        })
      },
    },
  )

  const setEnabledMutation = $api.useMutation(
    'put',
    '/api/v1/server/apps/{appIdentifier}/enabled',
    {
      onSuccess: (_, variables) => {
        void appQuery.refetch()
        void serverContext.refreshApps()
        toast({
          title: `App ${variables.body.enabled ? 'enabled' : 'disabled'} successfully`,
          description: variables.body.enabled
            ? 'The app is now enabled and available for use.'
            : 'The app has been disabled.',
        })
      },
      onError: (_, variables) => {
        toast({
          title: `Failed to ${variables.body.enabled ? 'enable' : 'disable'} app`,
          description: `An error occurred while ${variables.body.enabled ? 'enabling' : 'disabling'} the app.`,
          variant: 'destructive',
        })
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

  const handleUserAccessChange = React.useCallback(
    (checked: boolean | 'indeterminate') => {
      if (typeof checked === 'boolean') {
        setUserScopeEnabledDefault(checked)
      }
    },
    [],
  )

  const handleFolderAccessChange = React.useCallback(
    (checked: boolean | 'indeterminate') => {
      if (typeof checked === 'boolean') {
        setFolderScopeEnabledDefault(checked)
      }
    },
    [],
  )

  const handleSaveAccessSettings = React.useCallback(async () => {
    if (!app) {
      return
    }
    await updateAccessSettingsMutation.mutateAsync({
      params: {
        path: {
          appIdentifier,
        },
      },
      body: {
        userScopeEnabledDefault,
        folderScopeEnabledDefault,
      },
    })
  }, [
    app,
    appIdentifier,
    userScopeEnabledDefault,
    folderScopeEnabledDefault,
    updateAccessSettingsMutation,
  ])

  if (appQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>
  }

  if (!app) {
    return <div className="text-sm text-muted-foreground">App not found</div>
  }

  const hasChanges =
    userScopeEnabledDefault !== app.userScopeEnabledDefault ||
    folderScopeEnabledDefault !== app.folderScopeEnabledDefault

  return (
    <div className="grid gap-6">
      <Card className="border-0 bg-transparent p-0 shadow-none">
        <CardHeader className="px-0 pb-0">
          <CardTitle>{app.label || app.identifier}</CardTitle>
          <CardDescription>{app.config.description}</CardDescription>
        </CardHeader>
      </Card>
      {!app.enabled && (
        <Alert variant="destructive" className="border-foreground/20">
          <OctagonX className="size-4" />
          <AlertTitle>App is disabled</AlertTitle>
          <AlertDescription>
            This app is currently disabled. Functionality provided by this app
            may be unavailable until it is enabled again.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardHeader>
              <CardTitle>
                {!app.enabled ? 'Enable app' : 'Disable app'}
              </CardTitle>
              <CardDescription>
                {!app.enabled
                  ? 'The app will be enabled and available for use.'
                  : 'Users will no longer be able to use features provided by this app until it is enabled again.'}
              </CardDescription>
            </CardHeader>
          </div>
          <div className="flex items-center gap-2 px-6">
            {app.enabled ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Disable app</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disable this app?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Users will no longer be able to use features provided by
                      this app until it is enabled again.
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
                  <Button variant="destructive">Enable app</Button>
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
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Access Settings</CardTitle>
          <CardDescription>
            Configure default access modes for this app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                className="mt-1"
                id="user-access-allowed"
                checked={userScopeEnabledDefault}
                onCheckedChange={handleUserAccessChange}
              />
              <div>
                <label
                  htmlFor="user-access-allowed"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Allow user access by default
                </label>
                <p className="text-sm text-muted-foreground">
                  App is enabled for user by default. User must opt-out to
                  disable.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="folder-access-allowed"
                checked={folderScopeEnabledDefault}
                onCheckedChange={handleFolderAccessChange}
              />
              <div>
                <label
                  htmlFor="folder-access-allowed"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Allow folder access by default
                </label>
                <p className="text-sm text-muted-foreground">
                  App has access to folders by default. User must opt-out per
                  folder.
                </p>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button
            onClick={() => void handleSaveAccessSettings()}
            disabled={!hasChanges || updateAccessSettingsMutation.isPending}
          >
            {updateAccessSettingsMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
