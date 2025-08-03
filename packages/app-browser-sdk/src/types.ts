import type { Authenticator } from '@stellariscloud/auth-utils'
import type { StellarisApiClient, StellarisCloudSdk } from '@stellariscloud/sdk'

import type { IframeCommunicator } from './iframe-communicator'

export interface TokenData {
  accessToken: string
  refreshToken: string
}

export interface IframeMessage {
  type: string
  payload?: unknown
  id?: string
}

export interface AppBrowserSdkConfig {
  onInitialize?: () => void
}

export interface AppBrowserSdkInstance {
  sdk: StellarisCloudSdk
  communicator: Promise<IframeCommunicator>
  apiClient: StellarisApiClient
  authenticator: Authenticator
  isInitialized: boolean
  destroy: () => void
}
