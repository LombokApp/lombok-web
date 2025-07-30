import { StellarisCloudSdk } from '@stellariscloud/sdk'
import { IframeCommunicator } from './iframe-communicator'
import { TokenManager } from './token-manager'
import type {
  AppBrowserSdkConfig,
  AppBrowserSdkInstance,
  TokenData,
} from './types'

export class AppBrowserSdk implements AppBrowserSdkInstance {
  public sdk: StellarisCloudSdk
  public communicator: IframeCommunicator
  public tokenManager: TokenManager
  public isInitialized: boolean = false

  private config: AppBrowserSdkConfig

  constructor(config: AppBrowserSdkConfig) {
    this.config = config
    this.communicator = new IframeCommunicator()
    this.tokenManager = new TokenManager({
      onTokenReceived: config.onTokenReceived,
      onTokenRefreshed: config.onTokenRefreshed,
      onLogout: config.onLogout,
    })

    // Initialize SDK with token getters
    this.sdk = new StellarisCloudSdk({
      basePath: config.basePath,
      accessToken: () => this.tokenManager.getAccessToken(),
      refreshToken: () => this.tokenManager.getRefreshToken(),
      onTokensCreated: (tokens) => {
        this.tokenManager.setToken({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        })
      },
      onTokensRefreshed: (tokens) => {
        this.tokenManager.refreshToken({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        })
      },
      onLogout: () => {
        this.tokenManager.logout()
      },
    })

    this.setupMessageHandlers()
  }

  private setupMessageHandlers(): void {
    // Handle token messages from parent
    this.communicator.onMessage('TOKEN_RECEIVED', (message) => {
      const tokenData = message.payload as TokenData
      this.tokenManager.setToken(tokenData)
    })

    this.communicator.onMessage('TOKEN_REFRESHED', (message) => {
      const tokenData = message.payload as TokenData
      this.tokenManager.refreshToken(tokenData)
    })

    this.communicator.onMessage('LOGOUT', () => {
      this.tokenManager.logout()
    })

    // Handle error messages
    this.communicator.onMessage('ERROR', (message) => {
      const error = new Error(message.payload?.message || 'Unknown error')
      this.config.onError?.(error)
    })
  }

  public async initialize(): Promise<void> {
    try {
      // Notify parent that we're ready
      this.communicator.notifyReady()

      // Request initial token
      const tokenData = await this.communicator.requestToken()
      this.tokenManager.setToken(tokenData)

      this.isInitialized = true
    } catch (error) {
      this.config.onError?.(error as Error)
      throw error
    }
  }

  public destroy(): void {
    this.communicator.destroy()
    this.tokenManager.clearToken()
    this.isInitialized = false
  }

  // Convenience methods for common operations
  public async requestToken(): Promise<TokenData> {
    const tokenData = await this.communicator.requestToken()
    this.tokenManager.setToken(tokenData)
    return tokenData
  }

  public getApiClient() {
    return this.sdk.apiClient
  }

  public getAuthenticator() {
    return this.sdk.authenticator
  }
}
