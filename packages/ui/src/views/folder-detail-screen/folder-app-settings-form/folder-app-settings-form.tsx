import type { AppDTO } from '@lombokapp/types'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit/components/select'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import React from 'react'

import { $api } from '@/src/services/api'

type AppSettingState = 'enabled' | 'disabled' | 'default'

interface FolderAppSettingsFormProps {
  folderId: string
  onCancel?: () => void
  onSuccess?: () => void
  className?: string
}

export const FolderAppSettingsForm = ({
  folderId,
  onCancel,
  onSuccess,
  className,
}: FolderAppSettingsFormProps) => {
  const folderSettingsQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/app-settings',
    {
      params: {
        path: {
          folderId,
        },
      },
    },
    {
      enabled: folderId.length > 0,
    },
  )
  const enabledAppsQuery = $api.useQuery('get', '/api/v1/user/apps', {
    params: {
      query: {
        enabled: true,
      },
    },
  })

  const { toast } = useToast()

  // Local state to track app settings: 'enabled', 'disabled', or 'default'
  const [appSettings, setAppSettings] = React.useState<
    Record<string, AppSettingState>
  >({})

  const originalEnabledValues = React.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(folderSettingsQuery.data?.settings ?? {}).map(
          ([appIdentifier, s]) => [appIdentifier, s.enabled],
        ),
      ),
    [folderSettingsQuery.data?.settings],
  )

  const allEnabledApps = React.useMemo(() => {
    return (
      enabledAppsQuery.data?.result.reduce<Record<string, AppDTO>>(
        (acc, app) => ({
          ...acc,
          [app.identifier]: app,
        }),
        {},
      ) ?? {}
    )
  }, [enabledAppsQuery.data])

  // Track last initialized folderId and data to prevent re-initialization on user changes
  const lastInitializedRef = React.useRef<{
    folderId: string
    settingsKey: string
  } | null>(null)

  // Create a stable key from existing settings to detect actual data changes
  const settingsKey = React.useMemo(
    () =>
      JSON.stringify(
        Object.entries(originalEnabledValues)
          .map(([appIdentifier, s]) => `${appIdentifier}:${s}`)
          .sort(),
      ),
    [originalEnabledValues],
  )

  // Initialize appSettings from existing settings (only when data actually changes)
  React.useEffect(() => {
    if (
      !folderSettingsQuery.isLoading &&
      Object.keys(folderSettingsQuery.data?.settings ?? {}).length > 0
    ) {
      if (Object.keys(folderSettingsQuery.data?.settings ?? {}).length === 0) {
        return
      }

      const currentKey = `${folderId}:${settingsKey}`
      const lastKey = lastInitializedRef.current
        ? `${lastInitializedRef.current.folderId}:${lastInitializedRef.current.settingsKey}`
        : null

      // Only initialize if folderId changed or settings data actually changed
      if (currentKey !== lastKey) {
        const settingsMap: Record<string, AppSettingState> = {}

        for (const appIdentifier of Object.keys(
          folderSettingsQuery.data?.settings ?? {},
        )) {
          const existing = originalEnabledValues[appIdentifier]
          if (existing !== null) {
            settingsMap[appIdentifier] = existing ? 'enabled' : 'disabled'
          } else {
            settingsMap[appIdentifier] = 'default'
          }
        }

        setAppSettings(settingsMap)
        lastInitializedRef.current = {
          folderId,
          settingsKey,
        }
      }
    }
  }, [
    folderId,
    folderSettingsQuery.isLoading,
    settingsKey,
    folderSettingsQuery.data,
    originalEnabledValues,
  ])

  const updateFolderSettingsMutation = $api.useMutation(
    'patch',
    '/api/v1/folders/{folderId}/app-settings',
    {
      onSuccess: () => {
        void folderSettingsQuery.refetch()
        toast({
          title: 'Settings saved successfully',
          description: 'Folder app settings have been updated.',
        })
        if (onSuccess) {
          onSuccess()
        }
      },
      onError: () => {
        toast({
          title: 'Failed to save settings',
          description: 'An error occurred while saving folder app settings.',
          variant: 'destructive',
        })
      },
    },
  )

  const handleAppSettingChange = React.useCallback(
    (appIdentifier: string, value: AppSettingState) => {
      setAppSettings((prev) => ({
        ...prev,
        [appIdentifier]: value,
      }))
    },
    [],
  )

  const handleSave = React.useCallback(async () => {
    // Build updates object based on current state
    const updates: Record<string, { enabled: boolean } | null> = {}

    for (const appIdentifier of Object.keys(appSettings)) {
      const state = appSettings[appIdentifier]
      if (state === 'enabled') {
        updates[appIdentifier] = { enabled: true }
      } else if (state === 'disabled') {
        updates[appIdentifier] = { enabled: false }
      } else if (state === 'default') {
        // For "default", always send null (not undefined) to delete the setting
        updates[appIdentifier] = null
      }
    }

    await updateFolderSettingsMutation.mutateAsync({
      params: {
        path: {
          folderId,
        },
      },
      body: updates,
    })
  }, [folderId, updateFolderSettingsMutation, appSettings])

  if (folderSettingsQuery.isLoading) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">Loading apps...</p>
        </div>
      </div>
    )
  }

  if (folderSettingsQuery.error) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">
            Unable to load apps. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  if (Object.keys(appSettings).length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">
            No enabled apps available for configuration.
          </p>
        </div>
        {onCancel && (
          <div className="mt-6 flex justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Close
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
        {Object.keys(folderSettingsQuery.data?.settings ?? {}).map(
          (appIdentifier) => {
            const currentState = appSettings[appIdentifier] ?? 'default'
            const appSettingsItem =
              folderSettingsQuery.data?.settings[appIdentifier]
            return (
              <div
                key={appIdentifier}
                className="flex items-start gap-4 rounded-md border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`app-${appIdentifier}`}
                    className="mb-2 block text-sm font-medium leading-none"
                  >
                    {allEnabledApps[appIdentifier]?.label || appIdentifier}
                  </label>
                  {allEnabledApps[appIdentifier]?.config.description && (
                    <p className="mb-3 text-sm text-muted-foreground">
                      {allEnabledApps[appIdentifier].config.description}
                    </p>
                  )}
                  <Select
                    value={String(currentState)}
                    onValueChange={(value) => {
                      handleAppSettingChange(
                        appIdentifier,
                        value as AppSettingState,
                      )
                    }}
                  >
                    <SelectTrigger
                      id={`app-${appIdentifier}`}
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        <div className="flex w-full justify-between">
                          <div>Default&nbsp;</div>
                          {appSettingsItem ? (
                            <span className="italic text-muted-foreground/70">
                              (
                              {appSettingsItem.enabledFallback.value
                                ? 'enabled'
                                : 'disabled'}{' '}
                              in {appSettingsItem.enabledFallback.source}{' '}
                              settings)
                            </span>
                          ) : null}
                        </div>
                      </SelectItem>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )
          },
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={updateFolderSettingsMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={updateFolderSettingsMutation.isPending}
        >
          {updateFolderSettingsMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
