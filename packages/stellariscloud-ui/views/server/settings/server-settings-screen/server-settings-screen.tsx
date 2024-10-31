import { removeDuplicates } from '@stellariscloud/utils'
import clsx from 'clsx'
import React from 'react'

import { apiClient } from '../../../../services/api'
import { SettingsGetResponse } from '@stellariscloud/api-client'
import Link from 'next/link'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  cn,
} from '@stellariscloud/ui-toolkit'
import { ServerStorageProvisions } from './server-storage-provisions/server-storage-provisions.view'
import { useRouter } from 'next/router'
import { ServerAccessKeysScreen } from '../../storage/server-access-keys-screen/server-access-keys-screen.view'
import { ServerMetadataStorageProvisions } from './server-storage-provisions/server-metadata-storage-provisions.view'

export function ServerSettingsScreen({ tab }: { tab: string }) {
  const router = useRouter()
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

  const handleUpdateSettings = React.useCallback(async () => {
    const allSettingsKeys: (keyof SettingsGetResponse['settings'])[] =
      removeDuplicates([
        ...Object.keys(originalSettings ?? {}),
        ...Object.keys(settings ?? {}),
      ]) as (keyof SettingsGetResponse['settings'])[] // TODO: filter to unique?

    const changedSettings = allSettingsKeys.filter((settingKey) => {
      return (
        JSON.stringify(
          originalSettings?.[
            settingKey as keyof SettingsGetResponse['settings']
          ],
        ) !==
        JSON.stringify(
          settings?.[settingKey as keyof SettingsGetResponse['settings']],
        )
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

  const onFormChange = React.useCallback(
    (updatedSettings: {
      valid: boolean
      value: SettingsGetResponse['settings']
    }) => {
      setSettings(updatedSettings.value)
    },
    [],
  )

  return (
    <div
      className={clsx(
        'items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto',
      )}
    >
      <div className="mx-auto grid w-full items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
        <nav
          className="grid gap-4 text-sm text-muted-foreground"
          x-chunk="dashboard-04-chunk-0"
        >
          <Link
            href="/server/config"
            className={cn(tab === 'general' && 'font-semibold text-primary')}
          >
            General
          </Link>
          <Link
            href="/server/config/storage"
            className={cn(tab === 'storage' && 'font-semibold text-primary')}
          >
            Storage
          </Link>
          <Link
            href="/server/config/apps"
            className={cn(tab === 'apps' && 'font-semibold text-primary')}
          >
            Apps
          </Link>
        </nav>
        {tab === 'storage' ? (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Server Storage Provision</CardTitle>
                <CardDescription>
                  This location is used by the server to store arbitrary server
                  level data, like app assets. It is required before you can
                  install apps.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full">
                  <ServerMetadataStorageProvisions />
                </div>
              </CardContent>
            </Card>{' '}
            <Card>
              <CardHeader>
                <CardTitle>User Storage Provisions</CardTitle>
                <CardDescription>
                  Designate S3 locations that a user can nominate as storage for
                  new folders. Without entries here your users can only create
                  folders by providing their own credentials to a working
                  S3-compatible service.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full">
                  <ServerStorageProvisions />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Access Keys In Use</CardTitle>
                <CardDescription>
                  Distinct server provisioned S3 credentials in use by all users
                  across the server.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ServerAccessKeysScreen />
              </CardContent>
            </Card>
          </div>
        ) : tab === 'general' ? (
          <div className="grid gap-6">
            <Card x-chunk="dashboard-04-chunk-1">
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
