import type { SettingsGetResponse } from '@stellariscloud/api-client'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  cn,
  Input,
} from '@stellariscloud/ui-toolkit'
import { removeDuplicates } from '@stellariscloud/utils'
import React from 'react'
import { Link } from 'react-router-dom'

import { apiClient } from '../../../../services/api'
import { ServerStorageConfigTab } from '../storage/server-storage-config-tab/server-storage-config-tab'

export function ServerSettingsScreen({ tab }: { tab: string }) {
  const [originalSettings, setOriginalSettings] =
    React.useState<Partial<SettingsGetResponse['settings']>>()
  const [settings, setSettings] =
    React.useState<Partial<SettingsGetResponse['settings']>>()

  const [dataResetKey, setDataResetKey] = React.useState('___')

  React.useEffect(() => {
    void apiClient.serverApi.getServerSettings().then(({ data }) => {
      setOriginalSettings(data.settings)
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await
  const handleUpdateSettings = React.useCallback(async () => {
    const allSettingsKeys: (keyof SettingsGetResponse['settings'])[] =
      removeDuplicates([
        ...Object.keys(originalSettings ?? {}),
        ...Object.keys(settings ?? {}),
      ]) as (keyof SettingsGetResponse['settings'])[] // TODO: filter to unique?

    const changedSettings = allSettingsKeys.filter((settingKey) => {
      return (
        JSON.stringify(originalSettings?.[settingKey]) !==
        JSON.stringify(settings?.[settingKey])
      )
    })

    for (const changedSetting of changedSettings) {
      if (settings && changedSetting in settings) {
        if (typeof settings[changedSetting] === 'undefined') {
          void apiClient.serverApi
            .resetServerSetting({
              settingKey: changedSetting,
            })
            .then(reloadSettings)
        }
        void apiClient.serverApi
          .setServerSetting({
            settingKey: changedSetting,
            setSettingInputDTO: {
              value: settings[changedSetting],
            },
          })
          .then(reloadSettings)
      }
    }
  }, [reloadSettings, settings, originalSettings])

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
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Server Name</CardTitle>
                <CardDescription>
                  Used to identify your server to users.
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
            <Card x-chunk="dashboard-04-chunk-2">
              <CardHeader>
                <CardTitle>Plugins Directory</CardTitle>
                <CardDescription>
                  The directory within your project, in which your plugins are
                  located.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4">
                  <Input
                    placeholder="Project Name"
                    defaultValue="/content/plugins"
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox id="include" defaultChecked />
                    <label
                      htmlFor="include"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Allow administrators to change the directory.
                    </label>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button>Save</Button>
              </CardFooter>
            </Card>
          </div>
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
