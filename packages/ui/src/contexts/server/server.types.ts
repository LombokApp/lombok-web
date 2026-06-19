import type {
  AppContributionsResponse,
  AppUILink,
  Icon,
  ServerError,
  ServerSettingsListResponse,
} from '@lombokapp/types'
import type { QueryObserverResult } from '@tanstack/react-query'

import type { LogLevel } from '../logging'

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
  // App install time (ISO) — used to order entrypoints by recency.
  appCreatedAt?: string
} & AppUILink

export interface IServerContext {
  refreshApps: () => Promise<
    QueryObserverResult<AppContributionsResponse, ServerError>
  >
  appsLoaded: boolean
  refreshSettings: () => Promise<
    ServerSettingsListResponse['settings'] | undefined
  >
  getAppIcon: (appIdentifier: string) => Icon | undefined
  appContributions: {
    uiEntrypointContributions: {
      all: AppPathContribution[]
      byApp: Record<string, AppPathContribution[]>
    }
    objectDetailViewContributions: {
      all: AppPathContribution[]
      byApp: Record<string, AppPathContribution[]>
    }
    folderDetailViewContributions: {
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
}
