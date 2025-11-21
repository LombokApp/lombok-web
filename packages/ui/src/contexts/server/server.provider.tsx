import { useAuthContext } from '@lombokapp/auth-utils'
import type { AppContributionsResponse, AppPushMessage } from '@lombokapp/types'
import { ServerPushMessage } from '@lombokapp/types'
import React from 'react'

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
  }
}

export const ServerContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const authContext = useAuthContext()
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
