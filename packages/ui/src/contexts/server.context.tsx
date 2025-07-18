import { useAuthContext } from '@stellariscloud/auth-utils'
import type {
  AppMenuItem,
  AppPushMessage,
  AppsListResponse,
  AppTaskTrigger,
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

export type AppMenuItemAndHref = {
  href: string
  appIdentifier: string
} & AppMenuItem

export interface IServerContext {
  refreshApps: () => Promise<QueryObserverResult<AppsListResponse>>
  refreshSettings: () => Promise<
    QueryObserverResult<ServerSettingsListResponse>
  >
  menuItems: AppMenuItemAndHref[]
  appFolderTaskTriggers: {
    taskTrigger: AppTaskTrigger
    appIdentifier: string
  }[]
  appFolderObjectTaskTriggers: {
    taskTrigger: AppTaskTrigger
    appIdentifier: string
  }[]
  settings?: ServerSettingsListResponse['settings']
  apps?: AppsListResponse
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

  // Only fetch settings if admin
  const settingsQuery = $api.useQuery('get', '/api/v1/server/settings', {
    enabled: !!authContext.viewer?.isAdmin,
  })
  const appsQuery = $api.useQuery('get', '/api/v1/server/apps')

  // Derived state from API data
  const serverSettings = settingsQuery.data?.settings
  const serverApps = appsQuery.data
  const menuItems = React.useMemo(
    () =>
      serverApps?.result.reduce<AppMenuItemAndHref[]>((acc, next) => {
        return acc.concat(
          next.config.menuItems.map((item) => ({
            iconPath: item.iconPath,
            href: `/apps/${next.identifier}/${item.uiName}`,
            label: item.label,
            uiName: item.uiName,
            appIdentifier: next.identifier,
          })),
        )
      }, []) ?? [],
    [serverApps],
  )
  const appFolderActions = React.useMemo(
    () =>
      serverApps?.result.reduce<
        { taskTrigger: AppTaskTrigger; appIdentifier: string }[]
      >((acc, next) => {
        return acc.concat(
          next.config.tasks
            .filter((item) => item.folderAction)
            .map((item) => ({
              taskTrigger: {
                description: item.description,
                label: item.label,
                taskKey: item.key,
              },
              appIdentifier: next.identifier,
            })),
        )
      }, []) ?? [],
    [serverApps],
  )
  const appFolderObjectActions = React.useMemo(
    () =>
      serverApps?.result.reduce<
        { taskTrigger: AppTaskTrigger; appIdentifier: string }[]
      >((acc, next) => {
        return acc.concat(
          next.config.tasks
            .filter((item) => item.objectAction)
            .map((item) => ({
              taskTrigger: {
                description: item.description,
                label: item.label,
                taskKey: item.key,
              },
              appIdentifier: next.identifier,
            })),
        )
      }, []) ?? [],
    [serverApps],
  )

  const messageHandler = React.useCallback(
    (name: AppPushMessage) => {
      if (ServerPushMessage.APPS_UPDATED === name) {
        void appsQuery.refetch()
      } else if (ServerPushMessage.SETTINGS_UPDATED === name) {
        void settingsQuery.refetch()
      }
    },
    [appsQuery, settingsQuery],
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
        refreshApps: appsQuery.refetch,
        refreshSettings: settingsQuery.refetch,
        socketConnected: socket?.connected ?? false,
        menuItems,
        appFolderTaskTriggers: appFolderActions,
        appFolderObjectTaskTriggers: appFolderObjectActions,
        settings: serverSettings,
        apps: serverApps,
        subscribeToMessages,
        unsubscribeFromMessages,
        socket,
      }}
    >
      {children}
    </ServerContext.Provider>
  )
}
