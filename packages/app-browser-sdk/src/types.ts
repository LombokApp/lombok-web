import type { StellarisCloudSdk } from '@stellariscloud/sdk'

export interface TokenData {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

export interface IframeMessage {
  type: string
  payload?: any
  id?: string
}

export interface AppBrowserSdkConfig {
  basePath: string
  appId: string
  onTokenReceived?: (token: TokenData) => void
  onTokenRefreshed?: (token: TokenData) => void
  onLogout?: () => void
  onError?: (error: Error) => void
}

export interface AppBrowserSdkInstance {
  sdk: StellarisCloudSdk
  communicator: import('./iframe-communicator').IframeCommunicator
  tokenManager: import('./token-manager').TokenManager
  isInitialized: boolean
  initialize: () => Promise<void>
  destroy: () => void
}
