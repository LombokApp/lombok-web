import type {
  AppContributionsResponse,
  AppUILink,
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
