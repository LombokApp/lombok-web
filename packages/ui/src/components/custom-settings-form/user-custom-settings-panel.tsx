import type {
  CustomSettingsData,
  CustomSettingsPatchInput,
} from '@lombokapp/types'
import { useToast } from '@lombokapp/ui-toolkit/hooks'

import { CustomSettingsForm } from './custom-settings-form'
import {
  useDeleteUserCustomSettings,
  useUpdateUserCustomSettings,
  useUserCustomSettings,
} from './use-custom-settings'

interface UserCustomSettingsPanelProps {
  appIdentifier: string
}

export function UserCustomSettingsPanel({
  appIdentifier,
}: UserCustomSettingsPanelProps) {
  const { toast } = useToast()
  const query = useUserCustomSettings(appIdentifier)
  const updateMutation = useUpdateUserCustomSettings(appIdentifier)
  const deleteMutation = useDeleteUserCustomSettings(appIdentifier)

  if (query.isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading custom settings...
      </div>
    )
  }

  if (query.error) {
    return (
      <div className="text-sm text-muted-foreground">
        Failed to load custom settings.
      </div>
    )
  }

  // openapi-fetch@0.17's Readable widens the schema's nullable `type` tuples to
  // arrays; the runtime payload matches CustomSettingsData, so narrow back to it.
  const settings = query.data?.settings as CustomSettingsData | undefined
  if (!settings?.schema) {
    return null
  }

  return (
    <CustomSettingsForm
      schema={settings.schema}
      values={settings.values}
      sources={settings.sources}
      secretKeyPattern={settings.secretKeyPattern}
      level="user"
      isSaving={updateMutation.isPending || deleteMutation.isPending}
      onSave={(values) => {
        updateMutation.mutate(
          {
            params: { path: { appIdentifier } },
            // Writable narrows the arbitrary-JSON body; form values are valid JSON.
            body: {
              values: values as CustomSettingsPatchInput['values'],
            },
          },
          {
            onSuccess: () => {
              toast({
                title: 'Custom settings saved',
                description: 'Your app settings have been updated.',
              })
            },
            onError: () => {
              toast({
                title: 'Failed to save custom settings',
                description: 'An error occurred while saving your settings.',
                variant: 'destructive',
              })
            },
          },
        )
      }}
      onReset={() => {
        deleteMutation.mutate(
          { params: { path: { appIdentifier } } },
          {
            onSuccess: () => {
              toast({
                title: 'Custom settings reset',
                description: 'Settings have been reverted to defaults.',
              })
            },
            onError: () => {
              toast({
                title: 'Failed to reset custom settings',
                description: 'An error occurred while resetting settings.',
                variant: 'destructive',
              })
            },
          },
        )
      }}
    />
  )
}
