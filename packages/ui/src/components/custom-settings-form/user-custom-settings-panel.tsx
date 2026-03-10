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

  const settings = query.data?.settings
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
            body: {
              values: values as Record<
                string,
                string | number | boolean | unknown[] | null
              >,
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
