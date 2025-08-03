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

  executeWorkerScriptUrl = async (
    {
      workerIdentifier,
      url,
    }: {
      workerIdentifier: string
      url: string
    },
    options?: {
      method?: string
      headers?: HeadersInit
      body?: BodyInit | null
      signal?: AbortSignal
      // Allow any other fetch options
    } & Omit<RequestInit, 'method' | 'headers' | 'body' | 'signal'>,
  ): Promise<Response> => {
    // Get the access token
    const accessToken = await this.authenticator.getAccessToken()

    // Build the worker API URL
    const workerApiUrl = `/worker-api/${workerIdentifier}/${url.startsWith('/') ? url.slice(1) : url}`

    // Create headers object, starting with user-provided headers
    const headers = new Headers(options?.headers)

    // Add authorization header if we have a token
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    } else {
      throw new Error('App user access token not found')
    }

    // Build the full request configuration
    const requestConfig: RequestInit = {
      method: options?.method || 'POST',
      headers,
      body: options?.body,
      signal: options?.signal,
      // Spread any other options (like cache, credentials, etc.)
      ...Object.fromEntries(
        Object.entries(options || {}).filter(
          ([key]) => !['method', 'headers', 'body', 'signal'].includes(key),
        ),
      ),
    }

    // Make the request using the browser's fetch API
    return fetch(workerApiUrl, requestConfig)
  }

  public destroy(): void {
    AppBrowserSdk.tokens = undefined
    AppBrowserSdk.isInitialized = false
    AppBrowserSdk.initRequested = false
  }
}
