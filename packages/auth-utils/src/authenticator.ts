import createFetchClient from 'openapi-fetch'

import { verifyToken } from './jwt.util'
import { paths } from '@stellariscloud/types'

export interface AuthenticatorStateType {
  isAuthenticated: boolean
  isLoaded: boolean
}

export interface TokensType {
  accessToken?: string
  refreshToken?: string
}

export type AuthenticatorEventNames = 'onStateChanged'

export class Authenticator {
  private _state: AuthenticatorStateType = {
    isAuthenticated: false,
    isLoaded: false,
  }
  private readonly eventTarget =
    typeof window !== 'undefined' ? new EventTarget() : undefined
  private readonly tokens: TokensType = {}
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

    setTimeout(async () => {
      // Use provided token functions if available
      let accessToken: string | undefined
      if (this.getAccessTokenFn) {
        accessToken = await this.getAccessTokenFn()
      }
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
      this.state = { isAuthenticated: false, isLoaded: true }
    })
  }

  // getAccessToken returns valid accessToken if it exists or refreshes the token if not valid.
  public async getAccessToken() {
    let token = this.tokens.accessToken
    if (this.getAccessTokenFn) {
      token = await this.getAccessTokenFn()
      this.tokens.accessToken = token
    }
    if (token && verifyToken(token)) {
      return token
    }
    let refreshToken = this.tokens.refreshToken
    if (this.getRefreshTokenFn) {
      refreshToken = await this.getRefreshTokenFn()
      this.tokens.refreshToken = refreshToken
    }
    if (refreshToken) {
      await this.refresh()
    }
    return this.tokens.accessToken
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
      this.reset()
      throw error
    }
  }

  public async getViewer() {
    const viewerResponse = await this.$apiClient.GET('/api/v1/viewer', {
      headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
    })
    if (viewerResponse.response.status !== 200 || !viewerResponse.data) {
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
      this.reset()
      throw error
    }
  }

  public async logout() {
    let error: unknown
    let failed = false

    const { accessToken } = this.tokens

    if (accessToken !== undefined) {
      try {
        await this.$apiClient.POST('/api/v1/auth/logout', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      } catch (err) {
        error = err
        failed = true
      }
    }

    // TODO: fix logout with refresh
    // if (failed && refreshToken !== undefined) {
    //   try {
    //     const authApi = this.newAuthApi({ apiKey: refreshToken })
    //     await authApi.logout()
    //   } catch (err) {
    //     error = err
    //     failed = true
    //   }
    // }

    this.reset()
    if (this.onLogout) {
      await this.onLogout()
    }
    if (failed) {
      throw error
    }
  }

  public toggleState() {
    this.state = {
      isAuthenticated: !this.state.isAuthenticated,
      isLoaded: true,
    }
  }

  public addEventListener(
    type: AuthenticatorEventNames,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined,
  ) {
    this.eventTarget?.addEventListener(type, callback, options)
    this.state = this._state
  }

  public removeEventListener(
    type: AuthenticatorEventNames,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined,
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

      const { accessToken, refreshToken } = refreshTokenResponse.data?.session

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
      this.reset()
      throw err
    }
  }

  private reset() {
    this.tokens.accessToken = undefined
    this.tokens.refreshToken = undefined
    this.onLogout?.()
    this.state = { isAuthenticated: false, isLoaded: true }
  }

  public get state(): AuthenticatorStateType {
    return this._state
  }

  private set state(newState: AuthenticatorStateType) {
    const eventName: AuthenticatorEventNames = 'onStateChanged'
    this._state = newState
    if (typeof window !== 'undefined') {
      this.eventTarget?.dispatchEvent(
        new CustomEvent<AuthenticatorStateType>(eventName, {
          detail: newState,
        }),
      )
    }
  }
}
