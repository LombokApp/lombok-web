import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import React from 'react'
import { Link } from 'react-router'

import { $api } from '@/src/services/api'

export function UserAppsSettingsTab() {
  const appsQuery = $api.useQuery('get', '/api/v1/user/apps')

  if (appsQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading apps...</div>
  }

  if (appsQuery.error || !appsQuery.data) {
    return (
      <div className="text-sm text-muted-foreground">
        Unable to load apps. Please try again later.
      </div>
    )
  }

  const apps = appsQuery.data.result

  if (apps.length === 0) {
    return (
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>App Settings</CardTitle>
            <CardDescription>
              Configure settings for installed apps.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No enabled apps available for configuration.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container m-auto flex h-full max-h-full flex-1 flex-col gap-4 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">App Settings</h1>
        <p className="text-muted-foreground">
          Configure settings for installed apps. Select an app to manage its
          user-scoped settings.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {apps.map((app) => (
          <Link
            key={app.identifier}
            to={`/settings/apps/${app.identifier}`}
            className="rounded-lg border p-4 transition-colors hover:bg-accent bg-background"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{app.label || app.identifier}</h3>
                {app.config.description && (
                  <p className="text-sm text-muted-foreground">
                    {app.config.description}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
