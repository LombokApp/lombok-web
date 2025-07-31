import { StellarisCloudSdk } from '@stellariscloud/sdk'
import { IframeCommunicator } from './iframe-communicator'
import type {
  AppBrowserSdkConfig,
  AppBrowserSdkInstance,
  TokenData,
} from './types'
import { waitForTrue } from './util/wait-for-true'

export class AppBrowserSdk implements AppBrowserSdkInstance {
  private static _communicator: IframeCommunicator | undefined = undefined
  private static isInitialized: boolean = false
  private static initRequested: boolean = false
  private static tokens?: TokenData
  private static sdk: StellarisCloudSdk

  public get communicator(): Promise<IframeCommunicator> {
    if (!AppBrowserSdk._communicator && !AppBrowserSdk.initRequested) {
      AppBrowserSdk.initRequested = true
      AppBrowserSdk._communicator = new IframeCommunicator()
      AppBrowserSdk.setupMessageHandlers(AppBrowserSdk._communicator)
      AppBrowserSdk._communicator.notifyReady()
    }

    return waitForTrue(() => AppBrowserSdk.isInitialized, {
      retryPeriod: 100,
      maxRetries: 50,
    }).then(() => {
      if (!AppBrowserSdk._communicator) {
        throw new Error(
          'Communicator not initialized after 5 seconds. Please check your browser console for other errors.',
        )
      }
      return AppBrowserSdk._communicator
    })
  }

  public get isInitialized(): boolean {
    return AppBrowserSdk.isInitialized
  }

  public get initRequested(): boolean {
    return AppBrowserSdk.initRequested
  }

  private basePath: string = (() => {
    const urlParams = new URLSearchParams(window.location.search)
    const basePathParam = urlParams.get('basePath')
    return basePathParam || 'http://localhost:3000'
  })()

  public get sdk(): StellarisCloudSdk {
    if (!AppBrowserSdk.sdk) {
      AppBrowserSdk.sdk = new StellarisCloudSdk({
        basePath: this.basePath,
        accessToken: () => AppBrowserSdk.tokens?.accessToken,
        refreshToken: () => AppBrowserSdk.tokens?.refreshToken,
      })
    }
    return AppBrowserSdk.sdk
  }

  private static setTokens(tokens: TokenData): void {
    AppBrowserSdk.tokens = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }
  }

  private static async setupMessageHandlers(_communicator: IframeCommunicator) {
    _communicator.onMessage('AUTHENTICATION', (message) => {
      const tokenData = message.payload as TokenData
      this.setTokens(tokenData)
      AppBrowserSdk.isInitialized = true
    })

    _communicator.onMessage('LOGOUT', () => {
      this.sdk.authenticator.logout()
    })

    _communicator.onMessage('ERROR', (message) => {
      const _error = new Error(message.payload?.message || 'Unknown error')
      console.error('Stellaris Cloud IFrame Communication Error:', _error)
    })
  }

  private config: AppBrowserSdkConfig

  constructor(config?: AppBrowserSdkConfig) {
    this.config = config ?? {}
    this.communicator.then(() => {
      this.config.onInitialize?.()
      this.sdk.authenticator.setTokens({
        accessToken: AppBrowserSdk.tokens?.accessToken || '',
        refreshToken: AppBrowserSdk.tokens?.refreshToken || '',
      })
    })
  }

  get apiClient() {
    return this.sdk.apiClient
  }

  get authenticator() {
    return this.sdk.authenticator
  }

  public destroy(): void {
    AppBrowserSdk.tokens = undefined
    AppBrowserSdk.isInitialized = false
    AppBrowserSdk.initRequested = false
  }
}
