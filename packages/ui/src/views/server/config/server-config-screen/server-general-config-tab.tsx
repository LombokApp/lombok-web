import type { ServerSettingsGetResponse } from '@lombokapp/types'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@lombokapp/ui-toolkit/components/card/card'
import { Checkbox } from '@lombokapp/ui-toolkit/components/checkbox'
import { Input } from '@lombokapp/ui-toolkit/components/input/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit/components/select/select'
import React from 'react'

import { $api } from '@/src/services/api'

interface GoogleOAuthConfig {
  enabled: boolean
  clientId: string
  clientSecret: string
}

interface SearchConfig {
  app: {
    identifier: string
    workerIdentifier: string
  } | null
}

interface ServerGeneralConfigTabProps {
  settings?: ServerSettingsGetResponse['settings'] & {
    GOOGLE_OAUTH_CONFIG?: GoogleOAuthConfig
  }
  onSaveServerHostname?: (hostname: string) => Promise<void>
  onSaveEnableNewSignups?: (enabled: boolean) => Promise<void>
  onSaveGoogleOAuthConfig?: (config: GoogleOAuthConfig) => Promise<void>
  onSaveSearchConfig?: (config: SearchConfig) => Promise<void>
}

export function ServerGeneralConfigTab({
  settings,
  onSaveServerHostname,
  onSaveEnableNewSignups,
  onSaveGoogleOAuthConfig,
  onSaveSearchConfig,
}: ServerGeneralConfigTabProps) {
  const [serverHostname, setServerHostname] = React.useState(
    settings?.SERVER_HOSTNAME ?? '',
  )
  const [isSignupEnabled, setIsSignupEnabled] = React.useState(
    settings?.SIGNUP_ENABLED ?? false,
  )

  // Google OAuth configuration state
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = React.useState(
    settings?.GOOGLE_OAUTH_CONFIG?.enabled ?? false,
  )
  const [googleClientId, setGoogleClientId] = React.useState(
    settings?.GOOGLE_OAUTH_CONFIG?.clientId ?? '',
  )
  const [googleClientSecret, setGoogleClientSecret] = React.useState(
    settings?.GOOGLE_OAUTH_CONFIG?.clientSecret ?? '',
  )

  // Search configuration state
  const [selectedSearchConfig, setSearchConfig] = React.useState<SearchConfig>(
    settings?.SEARCH_CONFIG ?? { app: null },
  )

  const appsQuery = $api.useQuery('get', '/api/v1/server/apps', {}, {})

  // Filter apps to only show those with systemRequestRuntimeWorkers.performSearch
  const searchAppWorkerOptions = React.useMemo(() => {
    if (!appsQuery.data?.result) {
      return []
    }

    return appsQuery.data.result.flatMap((app) =>
      app.enabled
        ? (app.config.systemRequestRuntimeWorkers?.performSearch ?? []).map(
            (workerIdentifier) => ({
              appIdentifier: app.identifier,
              workerIdentifier,
              label: `${app.label} -> ${app.runtimeWorkers.definitions[workerIdentifier]?.label ?? workerIdentifier}`,
            }),
          )
        : [],
    )
  }, [appsQuery.data?.result])

  React.useEffect(() => {
    setServerHostname(settings?.SERVER_HOSTNAME ?? '')
    setIsSignupEnabled(settings?.SIGNUP_ENABLED ?? false)
    setGoogleOAuthEnabled(settings?.GOOGLE_OAUTH_CONFIG?.enabled ?? false)
    setGoogleClientId(settings?.GOOGLE_OAUTH_CONFIG?.clientId ?? '')
    setGoogleClientSecret(settings?.GOOGLE_OAUTH_CONFIG?.clientSecret ?? '')
    setSearchConfig(settings?.SEARCH_CONFIG ?? { app: null })
  }, [settings])

  const handleServerHostnameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setServerHostname(e.target.value)
  }

  const handleSignupEnabledChange = (checked: boolean) => {
    setIsSignupEnabled(checked)
  }

  const handleGoogleOAuthEnabledChange = (checked: boolean) => {
    setGoogleOAuthEnabled(checked)
  }

  const handleGoogleClientIdChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setGoogleClientId(e.target.value)
  }

  const handleGoogleClientSecretChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setGoogleClientSecret(e.target.value)
  }

  const handleSaveGoogleOAuth = async () => {
    await onSaveGoogleOAuthConfig?.({
      enabled: googleOAuthEnabled,
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  }

  const handleSearchAppWorkerChange = (optionKey: string) => {
    if (optionKey === '' || optionKey === 'core') {
      setSearchConfig({ app: null })
    } else {
      const [appIdentifier, workerIdentifier] = optionKey.split('|')
      if (appIdentifier && workerIdentifier) {
        setSearchConfig({
          app: { identifier: appIdentifier, workerIdentifier },
        })
      }
    }
  }

  const handleSaveSearchConfig = async () => {
    return onSaveSearchConfig?.({
      app:
        selectedSearchConfig.app?.identifier.length &&
        selectedSearchConfig.app.workerIdentifier.length
          ? selectedSearchConfig.app
          : null,
    })
  }

  const hasSearchConfigChanged = React.useMemo(() => {
    // If both are undefined/null, no change
    if (!selectedSearchConfig.app && !settings?.SEARCH_CONFIG?.app) {
      return false
    }

    return (
      selectedSearchConfig.app?.identifier !==
        settings?.SEARCH_CONFIG?.app?.identifier ||
      selectedSearchConfig.app?.workerIdentifier !==
        settings?.SEARCH_CONFIG?.app?.workerIdentifier
    )
  }, [selectedSearchConfig.app, settings?.SEARCH_CONFIG?.app])

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Server Hostname</CardTitle>
          <CardDescription>
            Used to identify your server to users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void onSaveServerHostname?.(serverHostname)
            }}
          >
            <Input
              placeholder="Server Hostname"
              value={serverHostname}
              onChange={handleServerHostnameChange}
            />
          </form>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button
            onClick={() => void onSaveServerHostname?.(serverHostname)}
            disabled={
              !onSaveServerHostname ||
              serverHostname === (settings?.SERVER_HOSTNAME ?? '')
            }
          >
            Save
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Enable New Signups</CardTitle>
          <CardDescription>
            Allow new users to sign up to your server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include"
                checked={isSignupEnabled}
                onCheckedChange={handleSignupEnabledChange}
              />
              <label
                htmlFor="include"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Enable new signups
              </label>
            </div>
          </form>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button
            onClick={() => void onSaveEnableNewSignups?.(isSignupEnabled)}
            disabled={
              !onSaveEnableNewSignups ||
              isSignupEnabled === settings?.SIGNUP_ENABLED
            }
          >
            Save
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Google OAuth Configuration</CardTitle>
          <CardDescription>
            Configure Google OAuth for single sign-on authentication.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="google-oauth-enabled"
                checked={googleOAuthEnabled}
                onCheckedChange={handleGoogleOAuthEnabledChange}
              />
              <label
                htmlFor="google-oauth-enabled"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Enable Google OAuth
              </label>
            </div>
            {googleOAuthEnabled && (
              <>
                <div>
                  <label
                    htmlFor="google-client-id"
                    className="text-sm font-medium"
                  >
                    Client ID
                  </label>
                  <Input
                    id="google-client-id"
                    placeholder="Google OAuth Client ID"
                    value={googleClientId}
                    onChange={handleGoogleClientIdChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label
                    htmlFor="google-client-secret"
                    className="text-sm font-medium"
                  >
                    Client Secret
                  </label>
                  <Input
                    id="google-client-secret"
                    type="password"
                    placeholder="Google OAuth Client Secret"
                    value={googleClientSecret}
                    onChange={handleGoogleClientSecretChange}
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </form>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button
            onClick={() => void handleSaveGoogleOAuth()}
            disabled={
              !onSaveGoogleOAuthConfig ||
              (googleOAuthEnabled &&
                (!googleClientId || !googleClientSecret)) ||
              // Check if values have changed from current settings
              (googleOAuthEnabled ===
                (settings?.GOOGLE_OAUTH_CONFIG?.enabled ?? false) &&
                googleClientId ===
                  (settings?.GOOGLE_OAUTH_CONFIG?.clientId ?? '') &&
                googleClientSecret ===
                  (settings?.GOOGLE_OAUTH_CONFIG?.clientSecret ?? ''))
            }
          >
            Save Google OAuth Settings
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Search Configuration</CardTitle>
          <CardDescription>
            Nominate an app to handle search functionality on your server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="search-app-select"
                className="text-sm font-medium"
              >
                App
              </label>
              <Select
                value={
                  selectedSearchConfig.app?.identifier &&
                  selectedSearchConfig.app.workerIdentifier
                    ? `${selectedSearchConfig.app.identifier}|${selectedSearchConfig.app.workerIdentifier}`
                    : 'core'
                }
                onValueChange={handleSearchAppWorkerChange}
              >
                <SelectTrigger id="search-app-select" className="mt-1">
                  <SelectValue placeholder="Select an app..." />
                </SelectTrigger>
                <SelectContent>
                  {searchAppWorkerOptions.map(
                    ({ appIdentifier, workerIdentifier, label }) => (
                      <SelectItem
                        key={`${appIdentifier}|${workerIdentifier}`}
                        value={`${appIdentifier}|${workerIdentifier}`}
                      >
                        {label}
                      </SelectItem>
                    ),
                  )}
                  <SelectItem value="core">None (use core search)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button
            onClick={() => void handleSaveSearchConfig()}
            disabled={
              !onSaveSearchConfig ||
              !hasSearchConfigChanged ||
              (!!selectedSearchConfig.app &&
                (selectedSearchConfig.app.identifier.length === 0 ||
                  selectedSearchConfig.app.workerIdentifier.length === 0))
            }
          >
            Save Search Configuration
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
