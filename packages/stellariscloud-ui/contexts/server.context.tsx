import type {
  ListModules200Response,
  ServerSettings,
} from '@stellariscloud/api-client'
import type { AppMenuItem, AppPushMessage } from '@stellariscloud/types'
import { ServerPushMessage } from '@stellariscloud/types'
import React from 'react'
import type { Socket } from 'socket.io-client'

import { useServerWebsocket } from '../hooks/use-server-websocket'
import { serverApi } from '../services/api'
import { useLocalFileCacheContext } from './local-file-cache.context'
import type { LogLevel } from './logging.context'

export interface IServerContext {
  refreshModules: () => Promise<void>
  refreshSettings: () => Promise<void>
  menuItems: AppMenuItemAndHref[]
  settings?: ServerSettings
  apps?: ListModules200Response
  subscribeToMessages: (handler: SocketMessageHandler) => void
  unsubscribeFromMessages: (handler: SocketMessageHandler) => void
  socketConnected: boolean
  socket: Socket | undefined
}

export type SocketMessageHandler = (
  name: ServerPushMessage,
  msg: { [key: string]: any },
) => void

export const ServerContext = React.createContext<IServerContext>(
  {} as IServerContext,
)

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

export const ServerContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const _localFileCacheContext = useLocalFileCacheContext()
  //   const loggingContext = useLoggingContext()
  const [serverSettings, setServerSettings] = React.useState<ServerSettings>()
  const [menuItems, setMenuItems] = React.useState<AppMenuItemAndHref[]>()
  const [appModules, setServerApps] = React.useState<ListModules200Response>()

  const fetchServerSettings = React.useCallback(
    () =>
      serverApi
        .getSettings()
        .then((response) => setServerSettings(response.data.settings)),
    [],
  )

  const fetchServerModules = React.useCallback(
    async () =>
      serverApi.listApps().then((response) => {
        setServerApps(response.data)
        setMenuItems(
          response.data.installed.reduce<AppMenuItemAndHref[]>((acc, next) => {
            return acc.concat(
              next.config.menuItems.map((item) => ({
                iconPath: item.iconPath,
                href: `/apps/${next.identifier}/${item.uiName}`,
                label: item.label,
                uiName: item.uiName,
                appIdentifier: next.identifier,
              })),
            )
          }, []),
        )
      }),
    [],
  )

  const messageHandler = React.useCallback(
    (message: { name: AppPushMessage; payload: { [key: string]: any } }) => {
      if (ServerPushMessage.MODULES_UPDATED === message.name) {
        void fetchServerModules()
      } else if (ServerPushMessage.SETTINGS_UPDATED === message.name) {
        void fetchServerSettings()
      }
    },
    [fetchServerModules, fetchServerSettings],
  )

  const { socket, connected: socketConnected } =
    useServerWebsocket(messageHandler)

  React.useEffect(() => {
    void fetchServerModules()
    void fetchServerSettings()
  }, [fetchServerModules, fetchServerSettings])

  const subscribeToMessages = (handler: SocketMessageHandler) => {
    socket?.onAny(handler)
  }

  const unsubscribeFromMessages = (handler: SocketMessageHandler) => {
    socket?.offAny(handler)
  }

  return (
    <ServerContext.Provider
      value={{
        refreshModules: fetchServerModules,
        refreshSettings: fetchServerSettings,
        socketConnected,
        menuItems: menuItems ?? [],
        settings: serverSettings,
        apps: appModules,
        subscribeToMessages,
        unsubscribeFromMessages,
        socket,
      }}
    >
      {children}
    </ServerContext.Provider>
  )
}

export const useServerContext = (messageHandler?: SocketMessageHandler) => {
  const context = React.useContext(ServerContext)
  const { subscribeToMessages, unsubscribeFromMessages } = context
  React.useEffect(() => {
    if (messageHandler) {
      subscribeToMessages(messageHandler)
    }

    return () => {
      if (messageHandler) {
        unsubscribeFromMessages(messageHandler)
      }
    }
  }, [messageHandler, subscribeToMessages, unsubscribeFromMessages])

  return context
}
