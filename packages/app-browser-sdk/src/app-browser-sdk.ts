import { LombokApiClient, LombokSdk } from '@lombokapp/sdk'

import { IframeCommunicator } from './iframe-communicator'
import type {
  AppBrowserSdkConfig,
  AppBrowserSdkInstance,
  InitialData,
} from './types'
import { waitForTrue } from './util/wait-for-true'

export class AppBrowserSdk implements AppBrowserSdkInstance {
  private static _communicator: IframeCommunicator | undefined = undefined
  private static isInitialized = false
  private static theme = 'light'
  private static initRequested = false
  private static initialData?: InitialData
  private static sdk: LombokSdk | undefined = undefined
  private readonly config: AppBrowserSdkConfig

  public get communicator(): Promise<IframeCommunicator> {
    if (!AppBrowserSdk._communicator && !AppBrowserSdk.initRequested) {
      AppBrowserSdk.initRequested = true
      AppBrowserSdk._communicator = new IframeCommunicator()
      AppBrowserSdk.setupMessageHandlers(
        AppBrowserSdk._communicator,
        this.config.onNavigateTo,
        this.config.onThemeChange,
      )
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

  public get theme(): string {
    return AppBrowserSdk.theme
  }

  private readonly basePath: string = (() => {
    const potocol = window.location.protocol
    const port = window.location.port
    const hostname = window.location.hostname.split('.').slice(2).join('.')
    return `${potocol}//${hostname}${port ? `:${port}` : ''}`
  })()

  public get sdk(): LombokSdk {
    if (!AppBrowserSdk.sdk) {
      AppBrowserSdk.sdk = new LombokSdk({
        basePath: this.basePath,
        accessToken: () => AppBrowserSdk.initialData?.accessToken,
        refreshToken: () => AppBrowserSdk.initialData?.refreshToken,
      })
    }
    return AppBrowserSdk.sdk
  }

  private static setInitialData(initialData: InitialData): void {
    AppBrowserSdk.initialData = {
      accessToken: initialData.accessToken,
      refreshToken: initialData.refreshToken,
      pathAndQuery: initialData.pathAndQuery,
      theme: initialData.theme,
    }
  }

  private static setupMessageHandlers(
    _communicator: IframeCommunicator,
    onNavigateTo: AppBrowserSdkConfig['onNavigateTo'],
    onThemeChange: AppBrowserSdkConfig['onThemeChange'],
  ) {
    _communicator.onMessage('AUTHENTICATION', (message) => {
      const initialData = message.payload as InitialData
      this.setInitialData(initialData)
      onThemeChange?.(initialData.theme)
      AppBrowserSdk.isInitialized = true
      AppBrowserSdk.theme = initialData.theme
    })

    _communicator.onMessage('PARENT_NAVIGATE_TO', (message) => {
      onNavigateTo?.(message.payload as { pathAndQuery: string })
    })
    _communicator.onMessage('THEME_CHANGE', (message) => {
      AppBrowserSdk.theme = message.payload as string
      onThemeChange?.(message.payload as string)
    })

    _communicator.onMessage('LOGOUT', () => {
      void this.sdk?.authenticator.logout()
    })

    _communicator.onMessage('ERROR', (message) => {
      throw new Error(
        (message.payload as { message: string }).message || 'Unknown error',
      )
    })
  }

  constructor(config?: AppBrowserSdkConfig) {
    this.config = config ?? {}
    void this.communicator.then(() => {
      this.config.onInitialize?.()
      void this.sdk.authenticator.setTokens({
        accessToken: AppBrowserSdk.initialData?.accessToken || '',
        refreshToken: AppBrowserSdk.initialData?.refreshToken || '',
      })
    })
  }

  get apiClient(): LombokApiClient {
    return this.sdk.apiClient
  }

  get authenticator() {
    return this.sdk.authenticator
  }

  get initialData() {
    return AppBrowserSdk.initialData
  }

  handleNavigateTo = async (to: { pathAndQuery: string }) => {
    await this.communicator.then((communicator) => {
      this.config.onNavigateTo?.(to)
      communicator.sendMessage({
        type: 'NAVIGATE_TO',
        payload: to,
      })
    })
  }

  executeWorkerScriptUrl = async (
    {
      workerIdentifier,
      url = '',
    }: {
      workerIdentifier: string
      url?: string
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
      method: options?.method || 'GET',
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
    AppBrowserSdk.initialData = undefined
    AppBrowserSdk.isInitialized = false
    AppBrowserSdk.initRequested = false
  }
}
