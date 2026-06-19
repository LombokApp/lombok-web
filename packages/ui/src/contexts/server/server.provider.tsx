import { useAuthContext } from '@lombokapp/auth-utils'
import type { AppContributionsResponse } from '@lombokapp/types'
import { ToastAction } from '@lombokapp/ui-toolkit/components/toast'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router'

import { formatNotificationTitle } from '@/src/components/notifications/format-notification'
import { useLiveQuery, useRealtimeEvent } from '@/src/contexts/realtime'
import { $api } from '@/src/services/api'

import { ServerContext } from './server.context'
import type { AppPathContribution, IServerContext } from './server.types'

function formatContributionLinks(
  allContributions: AppContributionsResponse,
  key: Exclude<
    keyof AppContributionsResponse[string]['contributions'],
    'routes' | 'mobile'
  >,
) {
  return Object.keys(allContributions).reduce<{
    all: AppPathContribution[]
    byApp: Record<string, AppPathContribution[]>
  }>(
    (acc, nextAppIdentifier) => {
      const appLabel = allContributions[nextAppIdentifier]?.appLabel ?? ''
      const appCreatedAt = allContributions[nextAppIdentifier]?.createdAt
      const appContributions =
        allContributions[nextAppIdentifier]?.contributions
      return {
        all: acc.all.concat(
          appContributions?.[key].map((nextEmbedLink) => ({
            ...nextEmbedLink,
            href: `/apps/${nextAppIdentifier}${nextEmbedLink.path === '/' ? '' : nextEmbedLink.path}`,
            path: nextEmbedLink.path,
            appIdentifier: nextAppIdentifier,
            appLabel,
            appCreatedAt,
          })) ?? [],
        ),
        byApp: acc.byApp,
      }
    },
    { all: [], byApp: {} },
  )
}

function formatContributions(allContributions: AppContributionsResponse) {
  return {
    uiEntrypointContributions: formatContributionLinks(
      allContributions,
      'uiEntrypoints',
    ),
    folderSidebarViewContributions: formatContributionLinks(
      allContributions,
      'folderSidebarViews',
    ),
    objectSidebarViewContributions: formatContributionLinks(
      allContributions,
      'objectSidebarViews',
    ),
    objectDetailViewContributions: formatContributionLinks(
      allContributions,
      'objectDetailViews',
    ),
    folderDetailViewContributions: formatContributionLinks(
      allContributions,
      'folderDetailViews',
    ),
  }
}

export const ServerContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const authContext = useAuthContext()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [appsLoaded, setAppsLoaded] = React.useState(false)
  const appsContributionsQuery = $api.useQuery(
    'get',
    '/api/v1/user/app-contributions',
  )

  // Set appsLoaded when data is successfully retrieved
  React.useEffect(() => {
    if (appsContributionsQuery.data && !appsLoaded) {
      setAppsLoaded(true)
    }
  }, [appsContributionsQuery.data, appsLoaded])

  const settingsQuery = $api.useQuery(
    'get',
    '/api/v1/server/settings',
    {},
    {
      enabled: () => !!authContext.viewer?.isAdmin,
    },
  )

  const refetchSettings = React.useCallback(async () => {
    // Only fetch settings if admin
    if (authContext.viewer?.isAdmin) {
      await settingsQuery.refetch()
      return settingsQuery.data?.settings
    }
    return undefined
  }, [authContext.viewer?.isAdmin, settingsQuery])

  // Derived state from API data
  const serverSettings = settingsQuery.data?.settings
  const appContributionsResult = appsContributionsQuery.data
  const formattedContributions = React.useMemo(() => {
    return formatContributions(appContributionsResult ?? {})
  }, [appContributionsResult])

  // App install/enable/disable changes every user's contributions.
  useLiveQuery({
    resources: ['user.apps'],
    queryKey: ['get', '/api/v1/user/app-contributions'],
    mode: 'invalidate',
  })

  // Server settings changes (admin only).
  useLiveQuery({
    resources: ['server.settings'],
    queryKey: ['get', '/api/v1/server/settings'],
    mode: 'invalidate',
    enabled: !!authContext.viewer?.isAdmin,
  })

  // Notification delivery: toast + refresh the list/badge.
  useRealtimeEvent('user.notification', (envelope) => {
    const data = envelope.event.data as {
      notification?: {
        title?: string
        body?: string | null
        image?: string | null
        path?: string | null
        eventType?: string
      }
    }
    const notification = data.notification
    if (!notification) {
      return
    }
    const notificationTitle =
      notification.title ??
      formatNotificationTitle(notification.eventType ?? '')
    const path = notification.path ?? undefined
    toast({
      variant: 'notification',
      title: (
        <span className="flex items-center gap-2.5">
          {notification.image ? (
            <img
              src={notification.image}
              alt=""
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bell className="size-4 text-primary" />
            </span>
          )}
          <span className="font-medium">{notificationTitle}</span>
        </span>
      ),
      description: notification.body ?? undefined,
      action:
        path !== undefined ? (
          <ToastAction altText="View" asChild>
            <Link to={path}>View</Link>
          </ToastAction>
        ) : undefined,
    })
    void queryClient.invalidateQueries({
      queryKey: ['get', '/api/v1/notifications'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['get', '/api/v1/notifications/unread-count'],
    })
  })

  const getAppIcon = React.useCallback(
    (appIdentifier: string) =>
      appContributionsResult?.[appIdentifier]?.icon ?? undefined,
    [appContributionsResult],
  )

  const contextValue: IServerContext = {
    refreshApps: appsContributionsQuery.refetch,
    appsLoaded,
    refreshSettings: refetchSettings,
    getAppIcon,
    appContributions: formattedContributions,
    settings: serverSettings,
  }

  return (
    <ServerContext.Provider value={contextValue}>
      {children}
    </ServerContext.Provider>
  )
}
