import type { paths } from '@lombokapp/types'
import createFetchClient from 'openapi-fetch'

import { verifyToken } from './jwt.util'

export interface AuthenticatorStateType {
  isAuthenticated: boolean
  isLoaded: boolean
}

export interface TokensType {
  accessToken: string
  refreshToken: string
}

export type AuthenticatorEventNames = 'onStateChanged'

export class Authenticator {
  private _state: AuthenticatorStateType = {
    isAuthenticated: false,
    isLoaded: false,
  }
  private readonly eventTarget =
    typeof window !== 'undefined' ? new EventTarget() : undefined
  private readonly tokens: Partial<TokensType> = {}
  private readonly $apiClient: ReturnType<typeof createFetchClient<paths>>
  private readonly onTokensCreated?: (tokens: {
    accessToken: string
    refreshToken: string
  }) => void | Promise<void>
  private readonly onTokensRefreshed?: (tokens: {
    accessToken: string
    refreshToken: string
  }) => void | Promise<void>
  private readonly onLogout?: () => void | Promise<void>
  private readonly getAccessTokenFn: () =>
    | string
    | undefined
    | Promise<string | undefined>
  private readonly getRefreshTokenFn?: () =>
    | string
    | undefined
    | Promise<string | undefined>

  constructor(
    readonly options: {
      basePath: string
      onTokensCreated?: (tokens: {
        accessToken: string
        refreshToken: string
      }) => void | Promise<void>
      onTokensRefreshed?: (tokens: {
        accessToken: string
        refreshToken: string
      }) => void | Promise<void>
      onLogout?: () => void | Promise<void>
      accessToken: () => string | undefined | Promise<string | undefined>
      refreshToken?: () => string | undefined | Promise<string | undefined>
    },
  ) {
    this.onTokensCreated = options.onTokensCreated
    this.onTokensRefreshed = options.onTokensRefreshed
    this.onLogout = options.onLogout
    this.getAccessTokenFn = options.accessToken
    this.getRefreshTokenFn = options.refreshToken
    this.$apiClient = createFetchClient<paths>({
      baseUrl: options.basePath,
      fetch: async (request) => {
        const headers = new Headers(request.headers)
        return fetch(new Request(request, { headers }))
      },
    })

    setTimeout(() => {
      void (async () => {
        // Use provided token functions if available
        const accessToken = await this.getAccessTokenFn()
        if (accessToken && verifyToken(accessToken)) {
          this.tokens.accessToken = accessToken
          let refreshToken: string | undefined
          if (this.getRefreshTokenFn) {
            refreshToken = await this.getRefreshTokenFn()
          }
          this.tokens.refreshToken = refreshToken
          this.state = { isAuthenticated: true, isLoaded: true }
          return
        }
        await this.reset()
        this.state = { isAuthenticated: false, isLoaded: true }
      })()
    })
  }

  // getAccessToken returns valid accessToken if it exists or refreshes the token if not valid.
  public async getAccessToken() {
    const token = await this.getAccessTokenFn()
    if (token && verifyToken(token)) {
      return token
    }
    if (this.getRefreshTokenFn) {
      const refreshToken = await this.getRefreshTokenFn()
      this.tokens.refreshToken = refreshToken
    }
    if (this.tokens.refreshToken) {
      await this.refresh()
    }
    if (this.state.isAuthenticated) {
      await this.logout()
    }
    throw new Error('Access token is invalid')
  }

  public async setTokens(tokens: TokensType) {
    if (!verifyToken(tokens.accessToken)) {
      throw new Error('Access token is invalid')
    }
    this.tokens.accessToken = tokens.accessToken
    this.tokens.refreshToken = tokens.refreshToken
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
      this.tokens.accessToken = loginResponse.data.session.accessToken
      this.tokens.refreshToken = loginResponse.data.session.refreshToken
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
      headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
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
          'Signup failed',
          signupResponse.data ? { cause: signupResponse.data } : undefined,
        )
      }
      return signupResponse
    } catch (error: unknown) {
      await this.reset()
      throw error
    }
  }

  public async logout() {
    let error: unknown
    let backendLogoutFailed = false

    const { accessToken } = this.tokens

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

  private async refresh() {
    if (!this.tokens.refreshToken) {
      throw new Error('no refresh token set')
    }

    try {
      const refreshTokenResponse = await this.$apiClient.POST(
        '/api/v1/auth/{refreshToken}',
        {
          params: {
            path: {
              refreshToken: this.tokens.refreshToken,
            },
          },
        },
      )

      if (
        refreshTokenResponse.response.status !== 200 ||
        !refreshTokenResponse.data
      ) {
        throw new Error(
          'Failed to refresh token',
          refreshTokenResponse.data
            ? {
                cause: refreshTokenResponse.data,
              }
            : undefined,
        )
      }

      const { accessToken, refreshToken } = refreshTokenResponse.data.session

      this.tokens.accessToken = accessToken
      this.tokens.refreshToken = refreshToken
      this.state = { isAuthenticated: true, isLoaded: true }
      if (this.onTokensCreated) {
        await this.onTokensCreated({ accessToken, refreshToken })
      }
      if (this.onTokensRefreshed) {
        await this.onTokensRefreshed({ accessToken, refreshToken })
      }
    } catch (err: unknown) {
      await this.reset()
      throw err
    }
  }

  private async reset() {
    this.tokens.accessToken = undefined
    this.tokens.refreshToken = undefined
    if (this.state.isAuthenticated) {
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
