import type { StellarisApiClient, StellarisCloudSdk } from '@stellariscloud/sdk'
import { IframeCommunicator } from './iframe-communicator'
import { Authenticator } from '@stellariscloud/auth-utils'

export interface TokenData {
  accessToken: string
  refreshToken?: string
}

export interface IframeMessage {
  type: string
  payload?: any
  id?: string
}

export interface AppBrowserSdkConfig {
  onLogout?: () => void
  onError?: (error: Error) => void
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
