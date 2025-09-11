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
import React from 'react'

interface ServerGeneralConfigTabProps {
  settings?: ServerSettingsGetResponse['settings']
  onSaveServerHostname?: (hostname: string) => Promise<void>
  onSaveEnableNewSignups?: (enabled: boolean) => Promise<void>
}

export function ServerGeneralConfigTab({
  settings,
  onSaveServerHostname,
  onSaveEnableNewSignups,
}: ServerGeneralConfigTabProps) {
  const [serverHostname, setServerHostname] = React.useState(
    settings?.SERVER_HOSTNAME ?? '',
  )
  const [isSignupEnabled, setIsSignupEnabled] = React.useState(
    settings?.SIGNUP_ENABLED ?? false,
  )

  React.useEffect(() => {
    setServerHostname(settings?.SERVER_HOSTNAME ?? '')
    setIsSignupEnabled(settings?.SIGNUP_ENABLED ?? false)
  }, [settings])

  const handleServerHostnameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setServerHostname(e.target.value)
  }

  const handleSignupEnabledChange = (checked: boolean) => {
    setIsSignupEnabled(checked)
  }

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
              serverHostname === settings?.SERVER_HOSTNAME
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
    </div>
  )
}
