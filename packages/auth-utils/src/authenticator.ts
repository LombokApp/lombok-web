import type { ConfigurationParameters } from '@stellariscloud/api-client'
import { AuthApi, Configuration, ViewerApi } from '@stellariscloud/api-client'
import Cookies from 'js-cookie'

import { verifyToken } from './jwt.util'

// TODO: Modify this with a better name.
const COOKIES_NAME = 'stellariscloud:auth'
const COOKIES_ACCESS_TOKEN = `${COOKIES_NAME}:accessToken`
const COOKIES_REFRESH_TOKEN = `${COOKIES_NAME}:refreshToken`

export interface AuthenticatorStateType {
  isAuthenticated: boolean
  isLoaded: boolean
}

interface TokensType {
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

  constructor(readonly options: { basePath: string }) {
    setTimeout(() => {
      const loadedTokens = this.loadTokens()
      if (verifyToken(loadedTokens.accessToken)) {
        this.tokens.accessToken = loadedTokens.accessToken
        this.tokens.refreshToken = loadedTokens.refreshToken
        this.state = { isAuthenticated: true, isLoaded: true }
        return
      }
      this.state = { isAuthenticated: false, isLoaded: true }
    })
  }

  // getAccessToken returns valid accessToken if it exists
  // or refreshes the token if not valid.
  public async getAccessToken() {
    if (this.tokens.accessToken && verifyToken(this.tokens.accessToken)) {
      return this.tokens.accessToken
    }
    if (this.tokens.refreshToken) {
      await this.refresh()
    }
    return this.tokens.accessToken
  }

  public async login(loginParams: { login: string; password: string }) {
    try {
      const authApi = this.newAuthApi()
      const loginResult = (
        await authApi.login({
          loginCredentialsDTO: {
            login: loginParams.login,
            password: loginParams.password,
          },
        })
      ).data
      this.tokens.accessToken = loginResult.session.accessToken
      this.tokens.refreshToken = loginResult.session.refreshToken
      this.saveTokens({
        accessToken: loginResult.session.accessToken,
        refreshToken: loginResult.session.refreshToken,
      })
      this.state = { isAuthenticated: true, isLoaded: true }
    } catch (error: unknown) {
      this.reset()
      throw error
    }
  }

  public async getViewer() {
    const viewerApi = this.newViewerApi({})
    const viewerResponse = await viewerApi.getViewer({
      headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
    })
    return viewerResponse.data
  }

  public async signup(signupParams: {
    username: string
    email?: string
    password: string
  }) {
    try {
      const authApi = this.newAuthApi()
      await authApi.signup({
        signupCredentialsDTO: {
          username: signupParams.username,
          email: signupParams.email,
          password: signupParams.password,
        },
      })
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
        const authApi = this.newAuthApi({ accessToken })
        await authApi.logout()
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
  }

  private clearTokens() {
    Cookies.remove(COOKIES_ACCESS_TOKEN)
    Cookies.remove(COOKIES_REFRESH_TOKEN)
    delete this.tokens.accessToken
    delete this.tokens.refreshToken
  }

  private newAuthApi(config?: ConfigurationParameters): AuthApi {
    return new AuthApi(
      new Configuration({
        ...(config ?? {}),
        basePath: this.options.basePath,
      }),
    )
  }

  private newViewerApi(config?: ConfigurationParameters): ViewerApi {
    return new ViewerApi(
      new Configuration({
        ...(config ?? {}),
        basePath: this.options.basePath,
      }),
    )
  }

  private async refresh() {
    if (!this.tokens.refreshToken) {
      throw new Error('no refresh token set')
    }

    const authApi = this.newAuthApi({
      basePath: this.options.basePath,
      apiKey: this.tokens.refreshToken,
    })

    try {
      const {
        session: { accessToken, refreshToken },
      } = (
        await authApi.refreshToken({ refreshToken: this.tokens.refreshToken })
      ).data

      this.tokens.accessToken = accessToken
      this.tokens.refreshToken = refreshToken
      this.saveTokens({ accessToken, refreshToken })
      this.state = { isAuthenticated: true, isLoaded: true }
    } catch (err: unknown) {
      this.reset()
      throw err
    }
  }

  private reset() {
    this.clearTokens()
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
