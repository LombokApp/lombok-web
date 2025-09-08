import type { Authenticator } from '@lombokapp/auth-utils'
import type { LombokApiClient, LombokSdk } from '@lombokapp/sdk'

import type { IframeCommunicator } from './iframe-communicator'

export interface InitialData {
  accessToken: string
  refreshToken: string
  pathAndQuery: string
  theme: string
}

export interface IframeMessage {
  type: string
  payload?: unknown
  id?: string
}

export interface AppBrowserSdkConfig {
  onInitialize?: () => void
  onNavigateTo?: (to: { pathAndQuery: string }) => void
  onThemeChange?: (theme: string) => void
}

export interface AppBrowserSdkInstance {
  sdk: LombokSdk
  communicator: Promise<IframeCommunicator>
  apiClient: LombokApiClient
  authenticator: Authenticator
  isInitialized: boolean
  destroy: () => void
}
