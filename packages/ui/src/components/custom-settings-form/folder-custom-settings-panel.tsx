import type {
  CustomSettingsData,
  CustomSettingsPatchInput,
} from '@lombokapp/types'
import { useToast } from '@lombokapp/ui-toolkit/hooks'

import { CustomSettingsForm } from './custom-settings-form'
import {
  useDeleteFolderCustomSettings,
  useFolderCustomSettings,
  useUpdateFolderCustomSettings,
} from './use-custom-settings'

interface FolderCustomSettingsPanelProps {
  folderId: string
  appIdentifier: string
}

export function FolderCustomSettingsPanel({
  folderId,
  appIdentifier,
}: FolderCustomSettingsPanelProps) {
  const { toast } = useToast()
  const query = useFolderCustomSettings(folderId, appIdentifier)
  const updateMutation = useUpdateFolderCustomSettings(folderId, appIdentifier)
  const deleteMutation = useDeleteFolderCustomSettings(folderId, appIdentifier)

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

  const handleResetField = (key: string) => {
    updateMutation.mutate(
      {
        params: { path: { folderId, appIdentifier } },
        body: { values: { [key]: null } },
      },
      {
        onSuccess: () => {
          toast({
            title: 'Setting reset',
            description: `"${key}" will now inherit from user-level settings.`,
          })
        },
        onError: () => {
          toast({
            title: 'Failed to reset setting',
            description: 'An error occurred while resetting the setting.',
            variant: 'destructive',
          })
        },
      },
    )
  }

  return (
    <CustomSettingsForm
      schema={settings.schema}
      values={settings.values}
      sources={settings.sources}
      secretKeyPattern={settings.secretKeyPattern}
      level="folder"
      isSaving={updateMutation.isPending || deleteMutation.isPending}
      onSave={(values) => {
        updateMutation.mutate(
          {
            params: { path: { folderId, appIdentifier } },
            // Writable narrows the arbitrary-JSON body; form values are valid JSON.
            body: {
              values: values as CustomSettingsPatchInput['values'],
            },
          },
          {
            onSuccess: () => {
              toast({
                title: 'Folder settings saved',
                description: 'App settings for this folder have been updated.',
              })
            },
            onError: () => {
              toast({
                title: 'Failed to save folder settings',
                description: 'An error occurred while saving settings.',
                variant: 'destructive',
              })
            },
          },
        )
      }}
      onReset={() => {
        deleteMutation.mutate(
          { params: { path: { folderId, appIdentifier } } },
          {
            onSuccess: () => {
              toast({
                title: 'Folder settings reverted',
                description:
                  'Settings will now inherit from your user-level settings.',
              })
            },
            onError: () => {
              toast({
                title: 'Failed to revert folder settings',
                description: 'An error occurred while reverting settings.',
                variant: 'destructive',
              })
            },
          },
        )
      }}
      onResetField={handleResetField}
    />
  )
}
