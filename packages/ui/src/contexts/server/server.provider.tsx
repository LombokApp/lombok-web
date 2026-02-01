import { useAuthContext } from '@lombokapp/auth-utils'
import type { AppContributionsResponse } from '@lombokapp/types'
import { ServerPushMessage, UserPushMessage } from '@lombokapp/types'
import { ToastAction } from '@lombokapp/ui-toolkit/components/toast'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router'

import { formatNotificationTitle } from '@/src/components/notifications/format-notification'
import { $api } from '@/src/services/api'

import { useWebsocket } from '../../hooks/use-websocket'
import { ServerContext } from './server.context'
import type { AppPathContribution, IServerContext } from './server.types'

function formatContributionLinks(
  allContributions: AppContributionsResponse,
  key: Exclude<
    keyof AppContributionsResponse[string]['contributions'],
    'routes'
  >,
) {
  return Object.keys(allContributions).reduce<{
    all: AppPathContribution[]
    byApp: Record<string, AppPathContribution[]>
  }>(
    (acc, nextAppIdentifier) => {
      const appLabel = allContributions[nextAppIdentifier]?.appLabel ?? ''
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
    sidebarMenuContributions: formatContributionLinks(
      allContributions,
      'sidebarMenuLinks',
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

  const messageHandler = React.useCallback(
    (name: string, payload?: unknown) => {
      if (
        ServerPushMessage.APPS_UPDATED ===
        ServerPushMessage[name as keyof typeof ServerPushMessage]
      ) {
        void appsContributionsQuery.refetch()
      } else if (
        ServerPushMessage.SETTINGS_UPDATED ===
        ServerPushMessage[name as keyof typeof ServerPushMessage]
      ) {
        void refetchSettings()
      } else if (
        UserPushMessage.NOTIFICATION_DELIVERED ===
        UserPushMessage[name as keyof typeof UserPushMessage]
      ) {
        const data =
          payload != null &&
          typeof payload === 'object' &&
          'notification' in payload
            ? (payload as {
                notification: {
                  title?: string
                  body?: string | null
                  image?: string | null
                  path?: string | null
                  eventType?: string
                }
              })
            : null
        const notification = data?.notification
        if (notification) {
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
        }
      }
    },
    [appsContributionsQuery, refetchSettings, toast, queryClient],
  )

  const { socket } = useWebsocket('user', messageHandler)

  const subscribeToMessages = (
    handler: (name: string, msg: Record<string, unknown>) => void,
  ) => {
    socket?.onAny(handler)
  }

  const unsubscribeFromMessages = (
    handler: (name: string, msg: Record<string, unknown>) => void,
  ) => {
    socket?.offAny(handler)
  }

  const contextValue: IServerContext = {
    refreshApps: appsContributionsQuery.refetch,
    appsLoaded,
    refreshSettings: refetchSettings,
    socketConnected: socket?.connected ?? false,
    appContributions: formattedContributions,
    settings: serverSettings,
    subscribeToMessages,
    unsubscribeFromMessages,
    socket,
  }

  return (
    <ServerContext.Provider value={contextValue}>
      {children}
    </ServerContext.Provider>
  )
}
