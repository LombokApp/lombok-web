import type { ConfigurationParameters } from '@stellariscloud/api-client'
import { AuthApi, Configuration } from '@stellariscloud/api-client'
import Cookies from 'js-cookie'

import { verifyToken } from './jwt.util'

// TODO: Modify this with a better name.
const COOKIES_NAME = 'stellariscloud:auth'
const COOKIES_ACCESS_TOKEN = `${COOKIES_NAME}:accessToken`
const COOKIES_REFRESH_TOKEN = `${COOKIES_NAME}:refreshToken`

export interface AuthenticatorStateType {
  isAuthenticated: boolean
}

interface TokensType {
  accessToken?: string
  refreshToken?: string
}

export type AuthenticatorEventNames = 'onStateChanged'

export class Authenticator {
  private _state: AuthenticatorStateType = { isAuthenticated: false }
  private readonly eventTarget =
    typeof window !== 'undefined' ? new EventTarget() : undefined
  private tokens: TokensType

  constructor(readonly options: { basePath: string }) {
    this.tokens = this.loadTokens()

    const { accessToken } = this.tokens
    if (verifyToken(accessToken)) {
      this.state = { isAuthenticated: true }
      return
    }
    this.state = { isAuthenticated: false }
  }

  // getAccessToken returns valid accessToken if it exists
  // or refreshes the token if not valid.
  public async getAccessToken() {
    const { accessToken, refreshToken } = this.tokens

    if (accessToken && verifyToken(accessToken)) {
      return accessToken
    }

    if (refreshToken) {
      await this.refresh()
    }
    return this.tokens.accessToken
  }

  public async login(loginParams: { login: string; password: string }) {
    let accessToken
    let refreshToken

    try {
      const authApi = this.newAuthApi()
      // TODO: Update this was the login body.
      ;({ accessToken, refreshToken } = (
        await authApi.login({
          loginParams: {
            login: loginParams.login,
            password: loginParams.password,
          },
        })
      ).data.data)
    } catch (error: unknown) {
      this.reset()
      throw error
    }
    this.saveTokens({
      accessToken,
      refreshToken,
    })
    this.state = { isAuthenticated: true }
  }

  public async logout() {
    // The logout API endpoint works by invalidating the current session
    // refresh token record in our DB, preventing new access tokens from being
    // generated. The current access token remains valid for the remainder of
    // its (short) lifespan after logout and it is simply discarded when the
    // current auth cache cookie is cleared after the logout call succeeds.

    // The logout endpoint supports authentication using either an access
    // token or session refresh token. We first attempt using the access
    // token to authenticate - but this may fail. We then failover to using
    // the session refresh token if the access token request fails for any
    // reason (e.g. the access token has expired). The effect is the same
    // in both cases and only one successful call with either authentication
    // method is necessary.

    let error: unknown
    let failed = false

    const { accessToken, refreshToken } = this.tokens

    if (accessToken !== undefined) {
      try {
        const authApi = this.newAuthApi({ accessToken })
        await authApi.logout()
      } catch (err) {
        error = err
        failed = true
      }
    }

    if (failed && refreshToken !== undefined) {
      try {
        const authApi = this.newAuthApi({ apiKey: refreshToken })
        await authApi.logout()
      } catch (err) {
        error = err
        failed = true
      }
    }

    this.reset()
    if (failed) {
      throw error
    }
  }

  public toggleState() {
    this.state = { isAuthenticated: !this.state.isAuthenticated }
  }

  public addEventListener(
    type: AuthenticatorEventNames,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined,
  ) {
    this.eventTarget?.addEventListener(type, callback, options)
  }

  public removeEventListener(
    type: AuthenticatorEventNames,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined,
  ) {
    this.eventTarget?.removeEventListener(type, callback, options)
  }

  // Private methods.
  // Access and refresh token operations.
  private loadTokens(): TokensType {
    const accessToken = Cookies.get(COOKIES_ACCESS_TOKEN)
    const refreshToken = Cookies.get(COOKIES_REFRESH_TOKEN)

    return {
      accessToken,
      refreshToken,
    }
  }

  private saveTokens({ accessToken, refreshToken }: TokensType) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    Cookies.set(COOKIES_ACCESS_TOKEN, accessToken!, {
      sameSite: 'strict',
    })
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    Cookies.set(COOKIES_REFRESH_TOKEN, refreshToken!, {
      sameSite: 'strict',
    })
    this.tokens = { accessToken, refreshToken }
  }

  private clearTokens() {
    Cookies.remove(COOKIES_ACCESS_TOKEN)
    Cookies.remove(COOKIES_REFRESH_TOKEN)
    this.tokens = {}
  }

  private newAuthApi(config?: ConfigurationParameters): AuthApi {
    return new AuthApi(
      new Configuration({
        ...(config ?? {}),
        basePath: this.options.basePath,
      }),
    )
  }

  private async refresh() {
    const { refreshToken } = this.tokens
    if (!refreshToken) {
      throw new Error('no refresh token set')
    }

    const authApi = this.newAuthApi({
      basePath: this.options.basePath,
      apiKey: refreshToken,
    })

    let accessToken: string
    try {
      accessToken = (await authApi.refreshToken()).data.data.accessToken
    } catch (err: unknown) {
      this.reset()
      throw err
    }
    this.saveTokens({ accessToken, refreshToken })
    this.state = { isAuthenticated: true }
  }

  private reset() {
    this.state = { isAuthenticated: false }
    this.clearTokens()
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
