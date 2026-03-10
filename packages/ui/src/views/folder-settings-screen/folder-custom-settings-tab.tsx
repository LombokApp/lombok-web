import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import React from 'react'

import { FolderCustomSettingsPanel } from '@/src/components/custom-settings-form/folder-custom-settings-panel'
import { $api } from '@/src/services/api'

interface FolderCustomSettingsTabProps {
  folderId: string
}

export function FolderCustomSettingsTab({
  folderId,
}: FolderCustomSettingsTabProps) {
  const appsQuery = $api.useQuery('get', '/api/v1/user/apps')
  const [selectedApp, setSelectedApp] = React.useState<string | null>(null)

  const apps = appsQuery.data?.result ?? []

  if (appsQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading apps...</div>
  }

  if (apps.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No apps are currently enabled.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Configure app-specific settings for this folder. Values set here
        override your user-level settings.
      </p>
      <div className="flex gap-6">
        <nav className="flex w-48 shrink-0 flex-col gap-1">
          {apps.map((app) => (
            <button
              key={app.identifier}
              type="button"
              onClick={() => setSelectedApp(app.identifier)}
              className={cn(
                'rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                selectedApp === app.identifier
                  ? 'bg-accent font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {app.label || app.identifier}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          {selectedApp ? (
            <FolderCustomSettingsPanel
              key={`${folderId}-${selectedApp}`}
              folderId={folderId}
              appIdentifier={selectedApp}
            />
          ) : (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Select an app to configure its folder-level settings.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
