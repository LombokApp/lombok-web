import { removeDuplicates } from '@stellariscloud/utils'
import clsx from 'clsx'
import React from 'react'

import { ServerSettingsForm } from '../../../components/server-settings-form/server-settings-form'
import { apiClient } from '../../../services/api'
import { SettingsGetResponse } from '@stellariscloud/api-client'
import { PageHeading } from '../../../design-system/page-heading/page-heading'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'

export function ServerSettingsScreen() {
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

  const handleUpdateSettings = React.useCallback(() => {
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
        'p-4 items-center flex flex-1 flex-col h-full overflow-x-hidden overflow-y-auto',
      )}
    >
      <div className="container flex-1 flex flex-col">
        <PageHeading
          titleIcon={Cog6ToothIcon}
          title={'Settings'}
          subtitle="Control how this server behaves."
        />
        <div className="inline-block min-w-full py-2 align-middle">
          <ServerSettingsForm
            onReset={() =>
              setSettings(
                JSON.parse(
                  JSON.stringify(originalSettings),
                ) as SettingsGetResponse['settings'],
              )
            }
            onChange={onFormChange}
            onSubmit={(_updatedSettings) => handleUpdateSettings()}
            formValue={settings ?? {}}
          />
        </div>
      </div>
    </div>
  )
}
