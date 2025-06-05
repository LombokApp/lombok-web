import type { SettingsGetResponse } from '@stellariscloud/api-client'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
  Input,
} from '@stellariscloud/ui-toolkit'
import React from 'react'
import { Link } from 'react-router-dom'

import { $api, apiClient } from '../../../../services/api'
import { ServerStorageConfigTab } from '../storage/server-storage-config-tab/server-storage-config-tab'
import { ServerGeneralConfigTab } from './server-general-config-tab'

export function ServerSettingsScreen({ tab }: { tab: string }) {
  const [settings, setSettings] =
    React.useState<Partial<SettingsGetResponse['settings']>>()

  const [dataResetKey, setDataResetKey] = React.useState('___')

  React.useEffect(() => {
    void apiClient.serverApi.getServerSettings().then(({ data }) => {
      setSettings(
        JSON.parse(
          JSON.stringify(data.settings),
        ) as SettingsGetResponse['settings'],
      )
    })
  }, [dataResetKey])

  const reloadSettings = React.useCallback(() => {
    setDataResetKey(`___${Math.random()}___`)
  }, [])

  const updateSettingMutation = $api.useMutation(
    'put',
    '/api/v1/server/settings/{settingKey}',
  )

  const handleUpdateServerHostname = React.useCallback(
    async (hostname: string) => {
      if (settings) {
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
        reloadSettings()
      }
    },
    [settings, updateSettingMutation, reloadSettings],
  )

  const handleUpdateSignupEnabled = React.useCallback(
    async (enabled: boolean) => {
      if (settings) {
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
        reloadSettings()
      }
    },
    [settings, updateSettingMutation, reloadSettings],
  )

  return (
    <div className="flex w-full items-start gap-6 pl-4 sm:gap-16">
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
      <div className="flex-1 grow overflow-hidden overflow-y-auto">
        {tab === 'storage' ? (
          <ServerStorageConfigTab />
        ) : tab === 'general' ? (
          <ServerGeneralConfigTab
            settings={settings}
            onSaveServerHostname={handleUpdateServerHostname}
            onSaveEnableNewSignups={handleUpdateSignupEnabled}
          />
        ) : tab === 'apps' ? (
          <div className="grid gap-6">
            <Card x-chunk="dashboard-04-chunk-1">
              <CardHeader>
                <CardTitle>Local Apps</CardTitle>
                <CardDescription>
                  Install apps that already exist local to your server.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form>
                  <Input placeholder="Server Name" />
                </form>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button>Save</Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  )
}
