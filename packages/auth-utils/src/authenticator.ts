import type {
  CompleteSSOSignupDTO,
  paths,
  SSOCallbackDTO,
} from '@lombokapp/types'
import createFetchClient from 'openapi-fetch'

import { verifyToken } from './jwt.util'

export interface AuthenticatorStateType {
  isAuthenticated: boolean
  isLoaded: boolean
}

export interface DefinedTokensType {
  accessToken: string
  refreshToken: string
}

export type TokensType =
  | {
      accessToken: string
      refreshToken: string
    }
  | {
      accessToken: undefined
      refreshToken: undefined
    }

export type AuthenticatorEventNames = 'onStateChanged'

export interface TokenStore {
  ready: () => Promise<void>
  setTokens: (tokens: TokensType) => Promise<void>
  getTokens: () => Promise<TokensType>
}

export class Authenticator {
  private _state: AuthenticatorStateType = {
    isAuthenticated: false,
    isLoaded: false,
  }
  private readonly eventTarget =
    typeof window !== 'undefined' ? new EventTarget() : undefined
  private readonly $apiClient: ReturnType<typeof createFetchClient<paths>>
  private readonly onTokensCreated?: (
    tokens: DefinedTokensType,
  ) => void | Promise<void>
  private readonly onTokensRefreshed?: (
    tokens: DefinedTokensType,
  ) => void | Promise<void>
  private readonly onLogout?: () => void | Promise<void>
  private inFlightGetAccessToken: Promise<string | undefined> | undefined
  private readonly tokenStore: TokenStore
  constructor(
    readonly options: {
      basePath: string
      onTokensCreated?: (tokens: DefinedTokensType) => void | Promise<void>
      onTokensRefreshed?: (tokens: DefinedTokensType) => void | Promise<void>
      onLogout?: () => void | Promise<void>
      tokenStore?: TokenStore
      debugLogging?: boolean
    },
  ) {
    this.onTokensCreated = options.onTokensCreated
    this.onTokensRefreshed = options.onTokensRefreshed
    this.onLogout = options.onLogout
    this.$apiClient = createFetchClient<paths>({
      baseUrl: options.basePath,
      fetch: async (request) => {
        const headers = new Headers(request.headers)
        return fetch(new Request(request, { headers }))
      },
    })
    this.tokenStore = (() => {
      let ready = false
      const _holder =
        options.tokenStore ??
        (() => {
          const storedTokens: TokensType = {
            accessToken: undefined,
            refreshToken: undefined,
          }
          return {
            ready: () => Promise.resolve(),
            // eslint-disable-next-line @typescript-eslint/require-await
            setTokens: async (_tokens: TokensType) => {
              if (_tokens.accessToken && _tokens.refreshToken) {
                Object.assign(storedTokens, _tokens)
              } else {
                storedTokens.accessToken = undefined
                storedTokens.refreshToken = undefined
              }
            },
            // eslint-disable-next-line @typescript-eslint/require-await
            getTokens: async () => {
              return storedTokens
            },
          }
        })()

      const waitForReady = async () => {
        if (ready) {
          return
        }
        let timer: ReturnType<typeof setTimeout> | undefined
        const timeout = new Promise<'timeout'>((resolve) => {
          timer = setTimeout(() => resolve('timeout'), 5 * 1000)
        })
        const readied = _holder.ready().then(
          () => 'ready' as const,
          (err: unknown) => ({ err }),
        )
        try {
          const result = await Promise.race([readied, timeout])
          if (result === 'ready') {
            ready = true
            return
          }
          if (result === 'timeout') {
            throw new Error('Token holder did not become ready')
          }
          throw result.err
        } finally {
          if (timer) {
            clearTimeout(timer)
          }
        }
      }

      return {
        ready: _holder.ready,
        setTokens: (_t) => waitForReady().then(() => _holder.setTokens(_t)),
        getTokens: () => waitForReady().then(_holder.getTokens),
      }
    })()

    void this.tokenStore.getTokens().then((tokens) => {
      if (tokens.accessToken && tokens.refreshToken) {
        void this.setTokens({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        })
      } else {
        void this.reset()
      }
    })
  }

  // getAccessToken returns valid accessToken if it exists or refreshes the token if not valid.
  public async getAccessToken(): Promise<string | undefined> {
    if (this.inFlightGetAccessToken) {
      return this.inFlightGetAccessToken
    }
    this.inFlightGetAccessToken = this.doGetAccessToken().finally(() => {
      this.inFlightGetAccessToken = undefined
    })
    return this.inFlightGetAccessToken
  }

  private async doGetAccessToken(): Promise<string | undefined> {
    const { accessToken, refreshToken } = await this.tokenStore.getTokens()
    if (accessToken && verifyToken(accessToken)) {
      return accessToken
    }
    if (refreshToken) {
      await this.doRefresh()
      const refreshedTokens = await this.tokenStore.getTokens()
      if (
        refreshedTokens.accessToken &&
        verifyToken(refreshedTokens.accessToken)
      ) {
        return refreshedTokens.accessToken
      }
    }
    if (this.state.isAuthenticated) {
      await this.logout()
    }
    await this.reset()
    return undefined
  }

  public async setTokens(tokens: DefinedTokensType) {
    if (!verifyToken(tokens.accessToken)) {
      await this.tokenStore.setTokens({
        accessToken: undefined,
        refreshToken: undefined,
      })
      throw new Error('Access token is invalid')
    }
    await this.tokenStore.setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    })
    this.state = { isAuthenticated: true, isLoaded: true }
    if (this.onTokensCreated) {
      await this.onTokensCreated({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      })
    }
  }

  public async login(loginParams: { login: string; password: string }) {
    try {
      const loginResponse = await this.$apiClient.POST('/api/v1/auth/login', {
        body: {
          login: loginParams.login,
          password: loginParams.password,
        },
      })
      if (loginResponse.response.status !== 201 || !loginResponse.data) {
        throw new Error(
          'Login failed',
          loginResponse.data ? { cause: loginResponse.data } : undefined,
        )
      }
      await this.setTokens({
        accessToken: loginResponse.data.session.accessToken,
        refreshToken: loginResponse.data.session.refreshToken,
      })
      this.state = { isAuthenticated: true, isLoaded: true }
      if (this.onTokensCreated) {
        await this.onTokensCreated({
          accessToken: loginResponse.data.session.accessToken,
          refreshToken: loginResponse.data.session.refreshToken,
        })
      }
      return loginResponse
    } catch (error: unknown) {
      await this.reset()
      throw error
    }
  }

  public async getViewer() {
    const viewerResponse = await this.$apiClient.GET('/api/v1/viewer', {
      headers: { Authorization: `Bearer ${await this.getAccessToken()}` },
    })
    if (viewerResponse.response.status !== 200 || !viewerResponse.data) {
      await this.logout()
      throw new Error(
        'Failed to get viewer',
        viewerResponse.data
          ? {
              cause: viewerResponse.data,
            }
          : undefined,
      )
    }
    return viewerResponse.data.user
  }

  public async signup(signupParams: {
    username: string
    email?: string
    password: string
  }) {
    try {
      const signupResponse = await this.$apiClient.POST('/api/v1/auth/signup', {
        body: {
          username: signupParams.username,
          email: signupParams.email,
          password: signupParams.password,
        },
      })
      if (signupResponse.response.status !== 201 || !signupResponse.data) {
        throw new Error(
          'Signup failed. Try again.',
          signupResponse.data ? { cause: signupResponse.data } : undefined,
        )
      }
      return signupResponse
    } catch (error: unknown) {
      await this.reset()
      throw error
    }
  }

  public async handleSSOCallback(
    provider: string,
    signupParams: SSOCallbackDTO,
  ) {
    try {
      const ssoCallbackResponse = await this.$apiClient.POST(
        '/api/v1/auth/sso/callback/{provider}',
        {
          params: {
            path: {
              provider,
            },
          },
          body: signupParams,
        },
      )

      if (
        ssoCallbackResponse.response.status !== 201 ||
        !ssoCallbackResponse.data
      ) {
        throw new Error(
          'SSO Signup failed. Try again.',
          ssoCallbackResponse.data
            ? { cause: ssoCallbackResponse.data }
            : undefined,
        )
      }

      if (!('needsUsername' in ssoCallbackResponse.data)) {
        await this.setTokens({
          accessToken: ssoCallbackResponse.data.accessToken,
          refreshToken: ssoCallbackResponse.data.refreshToken,
        })
        this.state = { isAuthenticated: true, isLoaded: true }
        if (this.onTokensCreated) {
          await this.onTokensCreated({
            accessToken: ssoCallbackResponse.data.accessToken,
            refreshToken: ssoCallbackResponse.data.refreshToken,
          })
          return { needsUsername: false, success: true }
        }
        return { needsUsername: true, success: false }
      }
      return ssoCallbackResponse.data
    } catch (error: unknown) {
      await this.reset()
      throw error
    }
  }

  public async completeSSOSignup(signupParams: CompleteSSOSignupDTO) {
    try {
      const signupResponse = await this.$apiClient.POST(
        '/api/v1/auth/sso/complete-signup',
        {
          body: signupParams,
        },
      )
      if (signupResponse.response.status !== 201 || !signupResponse.data) {
        throw new Error(
          'SSO Signup failed. Try again.',
          signupResponse.data ? { cause: signupResponse.data } : undefined,
        )
      }
      await this.setTokens({
        accessToken: signupResponse.data.accessToken,
        refreshToken: signupResponse.data.refreshToken,
      })
      this.state = { isAuthenticated: true, isLoaded: true }
      if (this.onTokensCreated) {
        await this.onTokensCreated({
          accessToken: signupResponse.data.accessToken,
          refreshToken: signupResponse.data.refreshToken,
        })
      }
      return signupResponse
    } catch (error: unknown) {
      await this.reset()
      throw error
    }
  }

  public async verifyEmail(token: string): Promise<void> {
    const response = await this.$apiClient.POST('/api/v1/auth/verify-email', {
      body: { token },
    })
    const status = response.response.status
    if (status < 200 || status >= 300) {
      throw new Error('Email verification failed.')
    }
  }

  public async logout() {
    let error: unknown
    let backendLogoutFailed = false

    const { accessToken } = await this.tokenStore.getTokens()

    if (accessToken !== undefined) {
      try {
        await this.$apiClient.POST('/api/v1/auth/logout', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      } catch (err) {
        error = err
        backendLogoutFailed = true
      }
    }

    await this.reset()

    if (backendLogoutFailed) {
      throw error
    }
  }

  public addEventListener(
    type: AuthenticatorEventNames,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    this.eventTarget?.addEventListener(type, callback, options)
    this.state = this._state
  }

  public removeEventListener(
    type: AuthenticatorEventNames,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    this.eventTarget?.removeEventListener(type, callback, options)
  }

  private async doRefresh() {
    const latestTokens = await this.tokenStore.getTokens()
    if (!latestTokens.refreshToken) {
      throw new Error('no refresh token set')
    }

    try {
      const refreshTokenResponse = await this.$apiClient.POST(
        '/api/v1/auth/{refreshToken}',
        {
          params: {
            path: {
              refreshToken: latestTokens.refreshToken,
            },
          },
        },
      )

      if (
        refreshTokenResponse.response.status < 200 ||
        refreshTokenResponse.response.status > 299 ||
        !refreshTokenResponse.data
      ) {
        throw new Error('Failed to refresh token')
      }

      const { accessToken, refreshToken } = refreshTokenResponse.data.session

      await this.setTokens({
        accessToken,
        refreshToken,
      })
      this.state = { isAuthenticated: true, isLoaded: true }
      if (this.onTokensCreated) {
        await this.onTokensCreated({ accessToken, refreshToken })
      }
      if (this.onTokensRefreshed) {
        await this.onTokensRefreshed({ accessToken, refreshToken })
      }
    } catch (err: unknown) {
      await this.reset(err)
      throw err
    }
  }

  private async reset(err?: unknown) {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('Auth reset due to unexpected error:', err)
    }
    await this.tokenStore.setTokens({
      accessToken: undefined,
      refreshToken: undefined,
    })
    if (this.state.isAuthenticated) {
      await this.logout()
      await this.onLogout?.()
    }
    this.state = { isAuthenticated: false, isLoaded: true }
  }

  public get state(): AuthenticatorStateType {
    return this._state
  }

  private set state(newState: AuthenticatorStateType) {
    const shouldFireChange =
      this._state.isAuthenticated !== newState.isAuthenticated ||
      this._state.isLoaded !== newState.isLoaded
    this._state = newState
    const eventName: AuthenticatorEventNames = 'onStateChanged'
    if (typeof window !== 'undefined' && shouldFireChange) {
      this.eventTarget?.dispatchEvent(
        new CustomEvent<AuthenticatorStateType>(eventName, {
          detail: newState,
        }),
      )
    }
  }
}
