import type { ServerSettings } from '@stellariscloud/api-client'
import { removeDuplicates } from '@stellariscloud/utils'
import clsx from 'clsx'
import React from 'react'

import { ServerSettingsForm } from '../../../components/server-settings-form/server-settings-form'
import { serverApi } from '../../../services/api'

export function ServerSettingsScreen() {
  const [originalSettings, setOriginalSettings] =
    React.useState<Partial<ServerSettings>>()
  const [settings, setSettings] = React.useState<Partial<ServerSettings>>()

  const [dataResetKey, setDataResetKey] = React.useState('___')

  React.useEffect(() => {
    void serverApi.getSettings().then(({ data }) => {
      setOriginalSettings(data.settings)
      setSettings(JSON.parse(JSON.stringify(data.settings)) as ServerSettings)
    })
  }, [dataResetKey])

  const reloadSettings = React.useCallback(() => {
    setDataResetKey(`___${Math.random()}___`)
  }, [])

  const handleUpdateSettings = React.useCallback(() => {
    const allSettingsKeys: (keyof ServerSettings)[] = removeDuplicates([
      ...Object.keys(originalSettings ?? {}),
      ...Object.keys(settings ?? {}),
    ]) as (keyof ServerSettings)[] // TODO: filter to unique?

    const changedSettings = allSettingsKeys.filter((settingKey) => {
      return (
        JSON.stringify(
          originalSettings?.[settingKey as keyof ServerSettings],
        ) !== JSON.stringify(settings?.[settingKey as keyof ServerSettings])
      )
    })

    for (const changedSetting of changedSettings) {
      if (settings && changedSetting in settings) {
        if (typeof settings[changedSetting] === 'undefined') {
          void serverApi
            .resetSetting({
              settingsKey: changedSetting,
            })
            .then(reloadSettings)
        }
        void serverApi
          .updateSetting({
            settingsKey: changedSetting,
            updateSettingRequest: {
              value: settings[changedSetting],
            },
          })
          .then(reloadSettings)
      }
    }
  }, [reloadSettings, settings, originalSettings])

  const onFormChange = React.useCallback(
    (updatedSettings: { valid: boolean; value: ServerSettings }) => {
      setSettings(updatedSettings.value)
    },
    [],
  )

  return (
    <div
      className={clsx(
        'items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto ',
      )}
    >
      <div className="container flex-1 flex flex-col">
        <div className="pt-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <ServerSettingsForm
              onReset={() =>
                setSettings(
                  JSON.parse(
                    JSON.stringify(originalSettings),
                  ) as ServerSettings,
                )
              }
              onChange={onFormChange}
              onSubmit={(_updatedSettings) => handleUpdateSettings()}
              formValue={settings ?? {}}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
