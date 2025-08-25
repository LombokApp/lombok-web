import { Authenticator } from '@lombokapp/auth-utils'
import type { paths } from '@lombokapp/types'
import createFetchClient from 'openapi-fetch'

export class LombokSdk {
  public apiClient: ReturnType<typeof createFetchClient<paths>>
  public authenticator: Authenticator
  constructor({
    basePath,
    accessToken,
    refreshToken,
    onTokensCreated,
    onTokensRefreshed,
    onLogout,
  }: {
    basePath: string
    accessToken: () => string | undefined | Promise<string | undefined>
    refreshToken?: () => string | undefined | Promise<string | undefined>
    onTokensCreated?: (tokens: {
      accessToken: string
      refreshToken: string
    }) => void | Promise<void>
    onTokensRefreshed?: (tokens: {
      accessToken: string
      refreshToken: string
    }) => void | Promise<void>
    onLogout?: () => void | Promise<void>
  }) {
    this.authenticator = new Authenticator({
      basePath,
      accessToken,
      refreshToken,
      onTokensCreated,
      onTokensRefreshed,
      onLogout,
    })

    this.apiClient = createFetchClient<paths>({
      baseUrl: basePath,
      fetch: async (request) => {
        let token: string | undefined
        if (typeof accessToken === 'function') {
          token = await accessToken()
        } else if (typeof accessToken === 'string') {
          token = accessToken
        } else {
          token = await this.authenticator.getAccessToken()
        }
        const headers = new Headers(request.headers)
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
        return fetch(new Request(request, { headers }))
      },
    })
  }
}
