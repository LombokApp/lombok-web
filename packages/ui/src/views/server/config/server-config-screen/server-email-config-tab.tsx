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
import { Input } from '@lombokapp/ui-toolkit/components/input/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit/components/select/select'
import React from 'react'

type EmailProviderKind = 'disabled' | 'resend' | 'smtp'

type EmailProviderConfig =
  | { provider: 'resend'; config: { apiKey: string } }
  | {
      provider: 'smtp'
      config: { host: string; port: number; username: string; password: string }
    }
  | null

interface ServerEmailConfigTabProps {
  settings?: ServerSettingsGetResponse['settings']
  onSaveEmailProviderConfig?: (value: EmailProviderConfig) => Promise<void>
}

function parsePort(portStr: string): number | null {
  const n = parseInt(portStr, 10)
  if (Number.isNaN(n) || n < 1 || n > 65535) {
    return null
  }
  return n
}

function configToKind(config: EmailProviderConfig): EmailProviderKind {
  if (config == null) {
    return 'disabled'
  }
  return config.provider
}

export function ServerEmailConfigTab({
  settings,
  onSaveEmailProviderConfig,
}: ServerEmailConfigTabProps) {
  const currentConfig = settings?.EMAIL_PROVIDER_CONFIG ?? null

  const [providerKind, setProviderKind] = React.useState<EmailProviderKind>(
    () => configToKind(currentConfig ?? null),
  )
  const [resendApiKey, setResendApiKey] = React.useState(
    currentConfig?.provider === 'resend' ? currentConfig.config.apiKey : '',
  )
  const [smtpHost, setSmtpHost] = React.useState(
    currentConfig?.provider === 'smtp' ? currentConfig.config.host : '',
  )
  const [smtpPortStr, setSmtpPortStr] = React.useState(
    currentConfig?.provider === 'smtp'
      ? String(currentConfig.config.port)
      : '587',
  )
  const [smtpUsername, setSmtpUsername] = React.useState(
    currentConfig?.provider === 'smtp' ? currentConfig.config.username : '',
  )
  const [smtpPassword, setSmtpPassword] = React.useState(
    currentConfig?.provider === 'smtp' ? currentConfig.config.password : '',
  )

  React.useEffect(() => {
    const config = settings?.EMAIL_PROVIDER_CONFIG ?? null
    setProviderKind(configToKind(config))
    if (config?.provider === 'resend') {
      setResendApiKey(config.config.apiKey)
    } else {
      setResendApiKey('')
    }
    if (config?.provider === 'smtp') {
      setSmtpHost(config.config.host)
      setSmtpPortStr(String(config.config.port))
      setSmtpUsername(config.config.username)
      setSmtpPassword(config.config.password)
    } else {
      setSmtpHost('')
      setSmtpPortStr('587')
      setSmtpUsername('')
      setSmtpPassword('')
    }
  }, [settings])

  const smtpPort = parsePort(smtpPortStr)
  const isResendValid = resendApiKey.trim().length > 0
  const isSmtpValid =
    smtpHost.trim().length > 0 &&
    smtpPort !== null &&
    smtpUsername.trim().length > 0 &&
    smtpPassword.length > 0

  const buildNewConfig = (): EmailProviderConfig => {
    if (providerKind === 'disabled') {
      return null
    }
    if (providerKind === 'resend') {
      return { provider: 'resend', config: { apiKey: resendApiKey.trim() } }
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (providerKind === 'smtp' && smtpPort !== null) {
      return {
        provider: 'smtp',
        config: {
          host: smtpHost.trim(),
          port: smtpPort,
          username: smtpUsername.trim(),
          password: smtpPassword,
        },
      }
    }
    return null
  }

  const newConfig = buildNewConfig()
  const hasChanged =
    JSON.stringify(newConfig) !== JSON.stringify(currentConfig ?? null)
  const canSave =
    onSaveEmailProviderConfig &&
    (providerKind === 'disabled' ||
      (providerKind === 'resend' && isResendValid) ||
      (providerKind === 'smtp' && isSmtpValid)) &&
    hasChanged

  const handleSave = React.useCallback(async () => {
    if (!canSave) {
      return
    }
    const valueToSave: EmailProviderConfig =
      providerKind === 'disabled' ? null : (newConfig ?? null)
    await onSaveEmailProviderConfig(valueToSave)
  }, [canSave, newConfig, onSaveEmailProviderConfig, providerKind])

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Email provider</CardTitle>
          <CardDescription>
            Configure how the server sends email (e.g. for verification or
            notifications). Leave disabled if you do not need email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email-provider-select"
              className="text-sm font-medium"
            >
              Provider
            </label>
            <Select
              value={providerKind}
              onValueChange={(v) => setProviderKind(v as EmailProviderKind)}
            >
              <SelectTrigger id="email-provider-select" className="mt-1">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="resend">Resend</SelectItem>
                <SelectItem value="smtp">SMTP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {providerKind === 'resend' && (
            <div>
              <label htmlFor="resend-api-key" className="text-sm font-medium">
                API Key
              </label>
              <Input
                id="resend-api-key"
                type="password"
                placeholder="Resend API key"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {providerKind === 'smtp' && (
            <>
              <div>
                <label htmlFor="smtp-host" className="text-sm font-medium">
                  Host
                </label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.example.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="smtp-port" className="text-sm font-medium">
                  Port
                </label>
                <Input
                  id="smtp-port"
                  type="number"
                  min={1}
                  max={65535}
                  placeholder="587"
                  value={smtpPortStr}
                  onChange={(e) => setSmtpPortStr(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="smtp-username" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="smtp-username"
                  placeholder="SMTP username"
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="smtp-password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="smtp-password"
                  type="password"
                  placeholder="SMTP password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={() => void handleSave()} disabled={!canSave}>
            Save
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
