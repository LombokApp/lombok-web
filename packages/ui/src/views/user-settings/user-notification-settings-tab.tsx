import { CoreEvent } from '@lombokapp/types'
import { CardContent, CardHeader } from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import { Skeleton } from '@lombokapp/ui-toolkit/components/skeleton'
import { Switch } from '@lombokapp/ui-toolkit/components/switch/switch'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import React from 'react'

import { formatNotificationTitle } from '@/src/components/notifications/format-notification'
import { $api } from '@/src/services/api'

type Channel = 'web' | 'email' | 'mobile'

interface EventSettingsRow {
  eventIdentifier: string
  emitterIdentifier: string
  web: boolean
  email: boolean
  mobile: boolean
}

const CORE_EVENTS: string[] = Object.values(
  // CoreEvent is an enum; values() returns the event identifier strings
  CoreEvent as unknown as Record<string, string>,
)

export function UserNotificationSettingsTab() {
  const { data, isLoading, error } = $api.useQuery(
    'get',
    '/api/v1/notifications/settings',
  )

  const updateMutation = $api.useMutation(
    'put',
    '/api/v1/notifications/settings',
  )

  const [rows, setRows] = React.useState<EventSettingsRow[]>([])
  const [isDirty, setIsDirty] = React.useState(false)

  React.useEffect(() => {
    if (!data) {
      return
    }

    const initialMap = new Map<string, EventSettingsRow>()

    // Seed with known core events and their default resolution (web=true, email/mobile=false)
    for (const eventType of CORE_EVENTS) {
      const key = `core:${eventType}`
      initialMap.set(key, {
        eventIdentifier: eventType,
        emitterIdentifier: 'core',
        web: true,
        email: false,
        mobile: false,
      })
    }

    // Overlay with any explicit settings returned from the API
    for (const setting of data.settings) {
      const key = `${setting.emitterIdentifier}:${setting.eventIdentifier}`
      const existing =
        initialMap.get(key) ??
        ({
          eventIdentifier: setting.eventIdentifier,
          emitterIdentifier: setting.emitterIdentifier,
          web: true,
          email: false,
          mobile: false,
        } as EventSettingsRow)

      if (setting.channel === 'web') {
        existing.web = setting.enabled
      } else if (setting.channel === 'email') {
        existing.email = setting.enabled
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (setting.channel === 'mobile') {
        existing.mobile = setting.enabled
      }

      initialMap.set(key, existing)
    }

    const orderedRows = Array.from(initialMap.values()).sort((a, b) =>
      `${a.emitterIdentifier}:${a.eventIdentifier}`.localeCompare(
        `${b.emitterIdentifier}:${b.eventIdentifier}`,
      ),
    )

    setRows(orderedRows)
    setIsDirty(false)
  }, [data])

  const toggleChannel = React.useCallback(
    (
      eventIdentifier: string,
      emitterIdentifier: string,
      channel: Channel,
      value: boolean,
    ) => {
      setRows((prev) =>
        prev.map((row) =>
          row.eventIdentifier === eventIdentifier &&
          row.emitterIdentifier === emitterIdentifier
            ? { ...row, [channel]: value }
            : row,
        ),
      )
      setIsDirty(true)
    },
    [],
  )

  const handleSave = React.useCallback(async () => {
    if (!rows.length) {
      return
    }

    const payload = {
      settings: rows.flatMap((row) => [
        {
          eventIdentifier: row.eventIdentifier,
          emitterIdentifier: row.emitterIdentifier,
          channel: 'web' as Channel,
          enabled: row.web,
        },
        {
          eventIdentifier: row.eventIdentifier,
          emitterIdentifier: row.emitterIdentifier,
          channel: 'email' as Channel,
          enabled: row.email,
        },
        {
          eventIdentifier: row.eventIdentifier,
          emitterIdentifier: row.emitterIdentifier,
          channel: 'mobile' as Channel,
          enabled: row.mobile,
        },
      ]),
    }

    await updateMutation.mutateAsync({ body: payload })
    setIsDirty(false)
  }, [rows, updateMutation])

  return (
    <div className="flex size-full max-h-full flex-1 flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Choose how you want to be notified for different system events.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Global notification channels
              </h2>
              <p className="text-sm text-muted-foreground">
                Settings here apply to all folders. Folder-specific overrides
                will be supported later.
              </p>
            </div>
            <button
              type="button"
              className={cn(
                'inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                isDirty
                  ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border-muted bg-background text-muted-foreground cursor-default',
              )}
              disabled={!isDirty || updateMutation.isPending}
              onClick={() => {
                if (!isDirty || updateMutation.isPending) {
                  return
                }
                void handleSave()
              }}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">
              Unable to load notification settings. Please try again later.
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No notification events available yet.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Event</th>
                    <th className="px-3 py-2 text-center font-medium">Web</th>
                    <th className="px-3 py-2 text-center font-medium">Email</th>
                    <th className="px-3 py-2 text-center font-medium">
                      Mobile
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${row.emitterIdentifier}:${row.eventIdentifier}`}
                      className="border-b last:border-0"
                    >
                      <td className="px-3 py-2 text-left align-middle">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatNotificationTitle(
                              row.eventIdentifier,
                              row.emitterIdentifier,
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                              {row.emitterIdentifier}:{row.eventIdentifier}
                            </code>
                          </span>
                        </div>
                      </td>
                      {(['web', 'email', 'mobile'] as Channel[]).map(
                        (channel) => (
                          <td
                            key={channel}
                            className="px-3 py-2 text-center align-middle"
                          >
                            <Switch
                              checked={row[channel]}
                              onCheckedChange={(value) =>
                                toggleChannel(
                                  row.eventIdentifier,
                                  row.emitterIdentifier,
                                  channel,
                                  Boolean(value),
                                )
                              }
                            />
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
