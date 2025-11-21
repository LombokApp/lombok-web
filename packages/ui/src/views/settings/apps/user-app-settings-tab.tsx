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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit/components/select'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import { OctagonX } from 'lucide-react'
import React from 'react'

import { $api } from '@/src/services/api'

export function UserAppSettingsTab({
  appIdentifier,
}: {
  appIdentifier: string
}) {
  const appQuery = $api.useQuery('get', '/api/v1/user/apps/{appIdentifier}', {
    params: {
      path: {
        appIdentifier,
      },
    },
  })

  const userSettingsQuery = $api.useQuery(
    'get',
    '/api/v1/user/apps/{appIdentifier}/settings',
    {
      params: {
        path: {
          appIdentifier,
        },
      },
    },
  )

  const app = appQuery.data?.app
  const userSettings = userSettingsQuery.data?.settings
  const { toast } = useToast()

  type SettingState = 'enabled' | 'disabled' | 'default'

  const getEnabledState = React.useCallback((): SettingState => {
    if (userSettings) {
      if (userSettings.enabled === null) {
        return 'default'
      }
      return userSettings.enabled ? 'enabled' : 'disabled'
    }
    return 'default'
  }, [userSettings])

  const getFolderAccessState = React.useCallback((): SettingState => {
    if (userSettings) {
      if (userSettings.folderScopeEnabledDefault === null) {
        return 'default'
      }
      return userSettings.folderScopeEnabledDefault ? 'enabled' : 'disabled'
    }
    return 'default'
  }, [userSettings])

  const [enabledState, setEnabledState] =
    React.useState<SettingState>(getEnabledState())
  const [folderAccessState, setFolderAccessState] =
    React.useState<SettingState>(getFolderAccessState())

  React.useEffect(() => {
    setEnabledState(getEnabledState())
    setFolderAccessState(getFolderAccessState())
  }, [getEnabledState, getFolderAccessState])

  const upsertUserSettingsMutation = $api.useMutation(
    'post',
    '/api/v1/user/apps/{appIdentifier}/settings',
    {
      onSuccess: () => {
        void userSettingsQuery.refetch()
        toast({
          title: 'Settings saved successfully',
          description: 'Your app settings have been updated.',
        })
      },
      onError: () => {
        toast({
          title: 'Failed to save settings',
          description: 'An error occurred while saving your settings.',
          variant: 'destructive',
        })
      },
    },
  )

  const removeUserSettingsMutation = $api.useMutation(
    'delete',
    '/api/v1/user/apps/{appIdentifier}/settings',
    {
      onSuccess: () => {
        void userSettingsQuery.refetch()
        toast({
          title: 'Settings reset successfully',
          description: 'Your app settings have been reset to defaults.',
        })
      },
      onError: () => {
        toast({
          title: 'Failed to reset settings',
          description: 'An error occurred while resetting your settings.',
          variant: 'destructive',
        })
      },
    },
  )

  const handleEnabledChange = React.useCallback((value: string) => {
    setEnabledState(value as SettingState)
  }, [])

  const handleFolderAccessChange = React.useCallback((value: string) => {
    setFolderAccessState(value as SettingState)
  }, [])

  const handleSaveSettings = React.useCallback(async () => {
    if (!app) {
      return
    }

    // Convert states to boolean values or null (for default)
    // null means "use system default" - backend will store null and resolve on read
    const enabled =
      enabledState === 'default'
        ? null
        : enabledState === 'enabled'
          ? true
          : false
    const folderScopeEnabledDefault =
      folderAccessState === 'default'
        ? null
        : folderAccessState === 'enabled'
          ? true
          : false

    // If both are default (null), we should delete the settings instead
    if (enabled === null && folderScopeEnabledDefault === null) {
      await removeUserSettingsMutation.mutateAsync({
        params: {
          path: {
            appIdentifier,
          },
        },
      })
      return
    }

    // Otherwise, upsert with the values (null means use system default)
    // Preserve existing permissions if they exist, otherwise send null
    await upsertUserSettingsMutation.mutateAsync({
      params: {
        path: {
          appIdentifier,
        },
      },
      body: {
        enabled,
        folderScopeEnabledDefault,
        folderScopePermissionsDefault: null,
        permissions: userSettings?.permissions ?? null,
      },
    })
  }, [
    app,
    appIdentifier,
    enabledState,
    folderAccessState,
    userSettings?.permissions,
    removeUserSettingsMutation,
    upsertUserSettingsMutation,
  ])

  const handleResetSettings = React.useCallback(async () => {
    await removeUserSettingsMutation.mutateAsync({
      params: {
        path: {
          appIdentifier,
        },
      },
    })
  }, [appIdentifier, removeUserSettingsMutation])

  if (appQuery.isLoading || userSettingsQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>
  }

  if (!app) {
    return <div className="text-sm text-muted-foreground">App not found</div>
  }

  if (!app.enabled) {
    return (
      <div className="grid gap-6">
        <Card className="border-0 bg-transparent p-0 shadow-none">
          <CardHeader className="px-0 pb-0">
            <CardTitle>{app.label || app.identifier}</CardTitle>
            <CardDescription>{app.config.description}</CardDescription>
          </CardHeader>
        </Card>
        <Alert variant="destructive" className="border-foreground/20">
          <OctagonX className="size-4" />
          <AlertTitle>App is disabled</AlertTitle>
          <AlertDescription>
            This app is currently disabled by the server administrator.
            Functionality provided by this app is unavailable until it is
            enabled.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Get defaults from settings response (system defaults)
  const defaultEnabled = userSettings?.enabledFallback
  const defaultFolderAccess = userSettings?.folderScopeEnabledDefaultFallback

  // Check if current state differs from saved state
  // null in userSettings means 'default', boolean means custom value
  const savedEnabledState = userSettings
    ? userSettings.enabled === null
      ? 'default'
      : userSettings.enabled
        ? 'enabled'
        : 'disabled'
    : 'default'
  const savedFolderAccessState = userSettings
    ? userSettings.folderScopeEnabledDefault === null
      ? 'default'
      : userSettings.folderScopeEnabledDefault
        ? 'enabled'
        : 'disabled'
    : 'default'

  const hasChanges =
    enabledState !== savedEnabledState ||
    folderAccessState !== savedFolderAccessState

  // Determine if we have any custom settings (any non-null value)
  const hasCustomSettings = userSettings
    ? userSettings.enabled !== null ||
      userSettings.folderScopeEnabledDefault !== null ||
      userSettings.permissions !== null
    : false

  return (
    <div className="container m-auto flex h-full max-h-full flex-1 flex-col gap-4 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {app.label || app.identifier}
        </h1>
        <p className="text-muted-foreground">{app.config.description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>App Access</CardTitle>
          <CardDescription>
            Control whether this app is enabled for your account. When enabled,
            you can use features provided by this app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-6">
            <div className="space-y-2">
              <label
                htmlFor="app-enabled"
                className="text-sm font-medium leading-none"
              >
                Enable this app
              </label>
              <p className="text-sm text-muted-foreground">
                Control whether this app is enabled for your account. When
                enabled, you can use features provided by this app.
              </p>
              <Select value={enabledState} onValueChange={handleEnabledChange}>
                <SelectTrigger id="app-enabled" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <div className="flex w-full justify-between">
                      <div>Default&nbsp;</div>
                      <span className="italic text-muted-foreground/70">
                        ({defaultEnabled ? 'enabled' : 'disabled'} in system
                        settings)
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="folder-access-allowed"
                className="text-sm font-medium leading-none"
              >
                Enable per folder access by default
              </label>
              <p className="text-sm text-muted-foreground">
                Control whether this app has access to folders by default. You
                can override this setting per folder.
              </p>
              <Select
                value={folderAccessState}
                onValueChange={handleFolderAccessChange}
              >
                <SelectTrigger id="folder-access-allowed" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <div className="flex w-full justify-between">
                      <div>Default&nbsp;</div>
                      <span className="italic text-muted-foreground/70">
                        ({defaultFolderAccess ? 'enabled' : 'disabled'} in
                        system settings)
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={() => void handleSaveSettings()}
                disabled={!hasChanges || upsertUserSettingsMutation.isPending}
              >
                {upsertUserSettingsMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              {hasCustomSettings && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={removeUserSettingsMutation.isPending}
                    >
                      Reset to Defaults
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Reset settings to default?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove your custom settings and restore the
                        default app access settings. This action cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          void handleResetSettings()
                        }}
                      >
                        Reset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            {hasCustomSettings && (
              <p className="text-xs text-muted-foreground">
                Using custom settings
              </p>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
