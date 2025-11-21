import { useAuthContext } from '@lombokapp/auth-utils'
import { ScrollArea } from '@lombokapp/ui-toolkit/components/scroll-area/scroll-area'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import React from 'react'
import { Link } from 'react-router'

import { $api } from '@/src/services/api'

import { ServerStorageConfigTab } from '../storage/server-storage-config-tab/server-storage-config-tab'
import { ServerAppSettingsTab } from './server-app-settings-tab'
import { ServerAppsConfigTab } from './server-apps-config-tab'
import { ServerGeneralConfigTab } from './server-general-config-tab'

export function ServerSettingsScreen({
  serverSettingsPath,
}: {
  serverSettingsPath: string[]
}) {
  const tab = serverSettingsPath[0] ?? 'general'
  const appIdentifier = serverSettingsPath[1]
  const authContext = useAuthContext()
  const appsQuery = $api.useQuery(
    'get',
    '/api/v1/server/apps',
    {},
    {
      enabled: !!authContext.viewer?.isAdmin,
    },
  )
  const { data, refetch: reloadSettings } = $api.useQuery(
    'get',
    '/api/v1/server/settings',
    {},
    {
      enabled: !!authContext.viewer?.isAdmin,
    },
  )

  const updateSettingMutation = $api.useMutation(
    'put',
    '/api/v1/server/settings/{settingKey}',
    { onSuccess: () => reloadSettings() },
  )

  const handleUpdateServerHostname = React.useCallback(
    async (hostname: string) => {
      if (data?.settings) {
        await updateSettingMutation.mutateAsync({
          params: {
            path: {
              settingKey: 'SERVER_HOSTNAME',
            },
          },
          body: {
            value: hostname,
          },
        })
      }
    },
    [data?.settings, updateSettingMutation],
  )

  const handleUpdateSignupEnabled = React.useCallback(
    async (enabled: boolean) => {
      if (data?.settings) {
        await updateSettingMutation.mutateAsync({
          params: {
            path: {
              settingKey: 'SIGNUP_ENABLED',
            },
          },
          body: {
            value: enabled,
          },
        })
      }
    },
    [data?.settings, updateSettingMutation],
  )

  const handleUpdateGoogleOAuthConfig = React.useCallback(
    async (config: {
      enabled: boolean
      clientId: string
      clientSecret: string
    }) => {
      await updateSettingMutation.mutateAsync({
        params: {
          path: {
            settingKey: 'GOOGLE_OAUTH_CONFIG',
          },
        },
        body: {
          value: config,
        },
      })
    },
    [updateSettingMutation],
  )

  return (
    <div className="flex max-h-max min-h-0 w-full items-start gap-6 pl-4 sm:gap-16">
      <nav
        className="flex flex-col gap-4 text-sm text-muted-foreground"
        x-chunk="dashboard-04-chunk-0"
      >
        <Link
          to="/server/settings"
          className={cn(tab === 'general' && 'text-primary font-semibold')}
        >
          General
        </Link>
        <Link
          to="/server/settings/storage"
          className={cn(tab === 'storage' && 'text-primary font-semibold')}
        >
          Storage
        </Link>
        <div className="flex flex-col gap-1">
          <Link
            to="/server/settings/apps"
            className={cn(
              tab === 'apps' && !appIdentifier && 'text-primary font-semibold',
            )}
          >
            Apps
          </Link>
          {appsQuery.data?.result && appsQuery.data.result.length > 0 && (
            <div className="ml-4 mt-2 flex flex-col gap-1.5 border-l-2 border-muted pl-4">
              {appsQuery.data.result.map((app) => (
                <Link
                  key={app.identifier}
                  to={`/server/settings/apps/${app.identifier}`}
                  className={cn(
                    'text-xs transition-all duration-200 hover:text-foreground hover:translate-x-0.5',
                    appIdentifier === app.identifier
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground',
                  )}
                >
                  {app.label || app.identifier}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
      <div className="flex size-full max-h-max min-h-0 flex-1 flex-col gap-8">
        <ScrollArea>
          {tab === 'storage' ? (
            <ServerStorageConfigTab />
          ) : tab === 'general' ? (
            <ServerGeneralConfigTab
              settings={
                data?.settings
                  ? {
                      ...data.settings,
                      SERVER_HOSTNAME: data.settings.SERVER_HOSTNAME ?? '',
                    }
                  : undefined
              }
              onSaveServerHostname={handleUpdateServerHostname}
              onSaveEnableNewSignups={handleUpdateSignupEnabled}
              onSaveGoogleOAuthConfig={handleUpdateGoogleOAuthConfig}
            />
          ) : tab === 'apps' && appIdentifier ? (
            <ServerAppSettingsTab appIdentifier={appIdentifier} />
          ) : tab === 'apps' ? (
            <ServerAppsConfigTab />
          ) : (
            <></>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
