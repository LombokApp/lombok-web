import { useAuthContext } from '@stellariscloud/auth-utils'
import type {
  AppContributionsResponse,
  AppPushMessage,
  AppUILink,
  ServerSettingsListResponse,
} from '@stellariscloud/types'
import { ServerPushMessage } from '@stellariscloud/types'
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

export type AppMenuLink = {
  href: string
  appIdentifier: string
  appLabel: string
  uiIdentifier: string
} & AppUILink

export interface AppSidebarEmbed {
  href: string
  appIdentifier: string
  appLabel: string
  uiIdentifier: string
  title: string
  iconPath?: string
  path: string
}

export interface IServerContext {
  refreshApps: () => Promise<QueryObserverResult<AppContributionsResponse>>
  refreshSettings: () => Promise<
    ServerSettingsListResponse['settings'] | undefined
  >
  sidebarMenuLinkContributions: AppMenuLink[]
  folderActionMenuLinkContributions: AppMenuLink[]
  objectActionMenuLinkContributions: AppMenuLink[]
  folderSidebarEmbedContributions: AppSidebarEmbed[]
  objectSidebarEmbedContributions: AppSidebarEmbed[]
  settings?: ServerSettingsListResponse['settings']
  appContributions?: AppContributionsResponse
  subscribeToMessages: (handler: SocketMessageHandler) => void
  unsubscribeFromMessages: (handler: SocketMessageHandler) => void
  socketConnected: boolean
  socket: Socket | undefined
}

export const ServerContext = React.createContext<IServerContext>(
  {} as IServerContext,
)

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
  const {
    sidebarMenuLinkContributions,
    folderActionMenuLinkContributions,
    objectActionMenuLinkContributions,
    folderSidebarEmbedContributions,
    objectSidebarEmbedContributions,
  } = React.useMemo(
    () => ({
      sidebarMenuLinkContributions: Object.keys(
        appContributionsResult ?? {},
      ).reduce<AppMenuLink[]>((acc, nextAppIdentifier) => {
        const appIdentifier =
          appContributionsResult?.[nextAppIdentifier]?.appIdentifier ?? ''
        const appLabel =
          appContributionsResult?.[nextAppIdentifier]?.appLabel ?? ''
        const contributions =
          appContributionsResult?.[nextAppIdentifier]?.contributions
        return acc.concat(
          (contributions?.sidebarMenuLinks ?? []).map(
            (nextSidebarMenuLink) => ({
              ...nextSidebarMenuLink,
              href: `/apps/${appIdentifier}/${nextSidebarMenuLink.uiIdentifier}${nextSidebarMenuLink.path}`,
              appIdentifier,
              appLabel,
            }),
          ),
        )
      }, []),
      folderSidebarEmbedContributions: Object.keys(
        appContributionsResult ?? {},
      ).reduce<AppSidebarEmbed[]>((acc, nextAppIdentifier) => {
        const appIdentifier =
          appContributionsResult?.[nextAppIdentifier]?.appIdentifier ?? ''
        const appLabel =
          appContributionsResult?.[nextAppIdentifier]?.appLabel ?? ''
        const contributions =
          appContributionsResult?.[nextAppIdentifier]?.contributions
        return acc.concat(
          (contributions?.folderSidebarEmbeds ?? []).map((nextEmbed) => ({
            ...nextEmbed,
            href: `/apps/${appIdentifier}/${nextEmbed.uiIdentifier}${nextEmbed.path}`,
            appIdentifier,
            appLabel,
          })),
        )
      }, []),
      objectSidebarEmbedContributions: Object.keys(
        appContributionsResult ?? {},
      ).reduce<AppSidebarEmbed[]>((acc, nextAppIdentifier) => {
        const appIdentifier =
          appContributionsResult?.[nextAppIdentifier]?.appIdentifier ?? ''
        const appLabel =
          appContributionsResult?.[nextAppIdentifier]?.appLabel ?? ''
        const contributions =
          appContributionsResult?.[nextAppIdentifier]?.contributions
        return acc.concat(
          (contributions?.objectSidebarEmbeds ?? []).map((nextEmbed) => ({
            ...nextEmbed,
            href: `/apps/${appIdentifier}/${nextEmbed.uiIdentifier}${nextEmbed.path}`,
            appIdentifier,
            appLabel,
          })),
        )
      }, []),
      folderActionMenuLinkContributions: Object.keys(
        appContributionsResult ?? {},
      ).reduce<AppMenuLink[]>((acc, nextAppIdentifier) => {
        const appIdentifier =
          appContributionsResult?.[nextAppIdentifier]?.appIdentifier ?? ''
        const appLabel =
          appContributionsResult?.[nextAppIdentifier]?.appLabel ?? ''
        const contributions =
          appContributionsResult?.[nextAppIdentifier]?.contributions
        return acc.concat(
          (contributions?.folderActionMenuLinks ?? []).map(
            (nextFolderActionMenuLink) => ({
              ...nextFolderActionMenuLink,
              href: `/apps/${appIdentifier}/${nextFolderActionMenuLink.uiIdentifier}${nextFolderActionMenuLink.path}`,
              appIdentifier,
              appLabel,
            }),
          ),
        )
      }, []),
      objectActionMenuLinkContributions: Object.keys(
        appContributionsResult ?? {},
      ).reduce<AppMenuLink[]>((acc, nextAppIdentifier) => {
        const appIdentifier =
          appContributionsResult?.[nextAppIdentifier]?.appIdentifier ?? ''
        const appLabel =
          appContributionsResult?.[nextAppIdentifier]?.appLabel ?? ''
        const contributions =
          appContributionsResult?.[nextAppIdentifier]?.contributions
        return acc.concat(
          (contributions?.objectActionMenuLinks ?? []).map(
            (nextObjectActionMenuLink) => ({
              ...nextObjectActionMenuLink,
              href: `/apps/${appIdentifier}/${nextObjectActionMenuLink.uiIdentifier}${nextObjectActionMenuLink.path}`,
              appIdentifier,
              appLabel,
            }),
          ),
        )
      }, []),
    }),
    [appContributionsResult],
  )

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
        sidebarMenuLinkContributions,
        folderActionMenuLinkContributions,
        objectActionMenuLinkContributions,
        folderSidebarEmbedContributions,
        objectSidebarEmbedContributions,
        settings: serverSettings,
        appContributions: appsContributionsQuery.data,
        subscribeToMessages,
        unsubscribeFromMessages,
        socket,
      }}
    >
      {children}
    </ServerContext.Provider>
  )
}
