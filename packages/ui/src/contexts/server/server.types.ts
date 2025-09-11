import type {
  AppContributionsResponse,
  AppUILink,
  ServerError,
  ServerSettingsListResponse,
} from '@lombokapp/types'
import type { QueryObserverResult } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'

import type { LogLevel } from '../logging'

export type SocketMessageHandler = (
  name: string,
  msg: Record<string, unknown>,
) => void

export interface Notification {
  level: LogLevel
  message: string
  thumbnailSrc?: string
  id?: string
}

export type AppPathContribution = {
  href: string
  path: string
  appIdentifier: string
  appLabel: string
} & AppUILink

export interface IServerContext {
  refreshApps: () => Promise<
    QueryObserverResult<AppContributionsResponse, ServerError>
  >
  appsLoaded: boolean
  refreshSettings: () => Promise<
    ServerSettingsListResponse['settings'] | undefined
  >
  appContributions: {
    sidebarMenuContributions: {
      all: AppPathContribution[]
      byApp: Record<string, AppPathContribution[]>
    }
    objectDetailViewContributions: {
      all: AppPathContribution[]
      byApp: Record<string, AppPathContribution[]>
    }
    folderSidebarViewContributions: {
      all: AppPathContribution[]
      byApp: Record<string, AppPathContribution[]>
    }
    objectSidebarViewContributions: {
      all: AppPathContribution[]
      byApp: Record<string, AppPathContribution[]>
    }
  }
  settings?: ServerSettingsListResponse['settings']
  subscribeToMessages: (handler: SocketMessageHandler) => void
  unsubscribeFromMessages: (handler: SocketMessageHandler) => void
  socketConnected: boolean
  socket: Socket | undefined
}
