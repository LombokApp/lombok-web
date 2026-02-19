import { FolderAppSettingsForm } from '../folder-detail-screen/folder-app-settings-form/folder-app-settings-form'

interface FolderAppConfigTabProps {
  folderId: string
}

export function FolderAppConfigTab({ folderId }: FolderAppConfigTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Configure which apps have access to this folder and adjust folder-level
        app settings.
      </p>
      <FolderAppSettingsForm folderId={folderId} />
    </div>
  )
}
