import { useAuthContext } from '@lombokapp/auth-utils'
import { cn, ScrollArea } from '@lombokapp/ui-toolkit'
import React from 'react'
import { Link } from 'react-router'

import { $api } from '@/src/services/api'

import { ServerStorageConfigTab } from '../storage/server-storage-config-tab/server-storage-config-tab'
import { ServerAppsConfigTab } from './server-apps-config-tab'
import { ServerGeneralConfigTab } from './server-general-config-tab'

export function ServerSettingsScreen({ tab }: { tab: string }) {
  const authContext = useAuthContext()
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
        <Link
          to="/server/settings/apps"
          className={cn(tab === 'apps' && 'text-primary font-semibold')}
        >
          Apps
        </Link>
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
            />
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
