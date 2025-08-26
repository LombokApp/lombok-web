import { useAuthContext } from '@lombokapp/auth-utils'
import type {
  AppContributionsResponse,
  AppPushMessage,
  AppUILink,
  ServerSettingsListResponse,
} from '@lombokapp/types'
import { ServerPushMessage } from '@lombokapp/types'
import type { QueryObserverResult } from '@tanstack/react-query'
import React from 'react'
import type { Socket } from 'socket.io-client'

import { $api } from '@/src/services/api'

import { useWebsocket } from '../hooks/use-websocket'
import type { LogLevel } from './logging.context'

export type SocketMessageHandler = (
  name: ServerPushMessage,
  msg: Record<string, unknown>,
) => void

export interface Notification {
  level: LogLevel
  message: string
  thumbnailSrc?: string
  id?: string
}

export interface AppRoute {
  uiIdentifier: string
  path: string
}

export type AppRouteLinkContribution = {
  href: string
  routeIdentifier: string
  appIdentifier: string
  appLabel: string
  uiIdentifier: string
} & AppUILink

export interface IServerContext {
  refreshApps: () => Promise<QueryObserverResult<AppContributionsResponse>>
  refreshSettings: () => Promise<
    ServerSettingsListResponse['settings'] | undefined
  >
  appContributions: {
    routes: Record<string, Record<string, AppRoute>>
    sidebarMenuContributions: {
      all: AppRouteLinkContribution[]
      byApp: Record<string, AppRouteLinkContribution[]>
    }
    folderActionMenuContributions: {
      all: AppRouteLinkContribution[]
      byApp: Record<string, AppRouteLinkContribution[]>
    }
    objectDetailViewContributions: {
      all: AppRouteLinkContribution[]
      byApp: Record<string, AppRouteLinkContribution[]>
    }
    objectActionMenuContributions: {
      all: AppRouteLinkContribution[]
      byApp: Record<string, AppRouteLinkContribution[]>
    }
    folderSidebarViewContributions: {
      all: AppRouteLinkContribution[]
      byApp: Record<string, AppRouteLinkContribution[]>
    }
    objectSidebarViewContributions: {
      all: AppRouteLinkContribution[]
      byApp: Record<string, AppRouteLinkContribution[]>
    }
  }
  settings?: ServerSettingsListResponse['settings']
  subscribeToMessages: (handler: SocketMessageHandler) => void
  unsubscribeFromMessages: (handler: SocketMessageHandler) => void
  socketConnected: boolean
  socket: Socket | undefined
}

export const ServerContext = React.createContext<IServerContext>(
  {} as IServerContext,
)

function formatContributedRoutes(
  contributions: AppContributionsResponse,
): Record<string, Record<string, AppRoute>> {
  return Object.keys(contributions).reduce<
    Record<string, Record<string, AppRoute>>
  >((acc, appIdentifier) => {
    return {
      ...acc,
      ...(contributions[appIdentifier]
        ? {
            [appIdentifier]: contributions[appIdentifier].contributions
              .routes as Record<string, AppRoute>,
          }
        : {}),
    }
  }, {})
}

function formatContributionLinks(
  allContributions: AppContributionsResponse,
  key: Exclude<
    keyof AppContributionsResponse[string]['contributions'],
    'routes'
  >,
) {
  return Object.keys(allContributions).reduce<{
    all: AppRouteLinkContribution[]
    byApp: Record<string, AppRouteLinkContribution[]>
  }>(
    (acc, nextAppIdentifier) => {
      const appLabel = allContributions[nextAppIdentifier]?.appLabel ?? ''
      const appContributions =
        allContributions[nextAppIdentifier]?.contributions
      return {
        all: acc.all.concat(
          appContributions?.[key].map((nextEmbedLink) => ({
            ...nextEmbedLink,
            href: `/apps/${nextAppIdentifier}/${nextEmbedLink.routeIdentifier}`,
            uiIdentifier:
              appContributions.routes[nextEmbedLink.routeIdentifier]
                ?.uiIdentifier ?? '',
            path:
              appContributions.routes[nextEmbedLink.routeIdentifier]?.path ??
              '',
            appIdentifier: nextAppIdentifier,
            appLabel,
          })) ?? [],
        ),
        byApp: acc.byApp,
      }
      // return acc
    },
    { all: [], byApp: {} },
  )
}

function formatContributions(allContributions: AppContributionsResponse) {
  return {
    routes: formatContributedRoutes(allContributions),
    sidebarMenuContributions: formatContributionLinks(
      allContributions,
      'sidebarMenuLinks',
    ),
    folderActionMenuContributions: formatContributionLinks(
      allContributions,
      'folderActionMenuLinks',
    ),
    objectActionMenuContributions: formatContributionLinks(
      allContributions,
      'objectActionMenuLinks',
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
  }
}

export const ServerContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const authContext = useAuthContext()
  const appsContributionsQuery = $api.useQuery(
    'get',
    '/api/v1/server/app-contributions',
  )
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
    (name: AppPushMessage) => {
      if (ServerPushMessage.APPS_UPDATED === name) {
        void appsContributionsQuery.refetch()
      } else if (ServerPushMessage.SETTINGS_UPDATED === name) {
        void refetchSettings()
      }
    },
    [appsContributionsQuery, refetchSettings],
  )

  const { socket } = useWebsocket('user', messageHandler)

  const subscribeToMessages = (handler: SocketMessageHandler) => {
    socket?.onAny(handler)
  }

  const unsubscribeFromMessages = (handler: SocketMessageHandler) => {
    socket?.offAny(handler)
  }

  return (
    <ServerContext.Provider
      value={{
        refreshApps: appsContributionsQuery.refetch,
        refreshSettings: refetchSettings,
        socketConnected: socket?.connected ?? false,
        appContributions: formattedContributions,
        settings: serverSettings,
        subscribeToMessages,
        unsubscribeFromMessages,
        socket,
      }}
    >
      {children}
    </ServerContext.Provider>
  )
}
