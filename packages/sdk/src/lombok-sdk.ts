import type { TokenStore } from '@lombokapp/auth-utils'
import { Authenticator } from '@lombokapp/auth-utils'
import type { paths } from '@lombokapp/types'
import createFetchClient from 'openapi-fetch'

export class LombokSdk {
  public apiClient: ReturnType<typeof createFetchClient<paths>>
  public authenticator: Authenticator
  constructor({
    basePath,
    onTokensCreated,
    onTokensRefreshed,
    onLogout,
    tokenStore,
  }: {
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
    tokenStore?: TokenStore
  }) {
    this.authenticator = new Authenticator({
      basePath,
      onTokensCreated,
      onTokensRefreshed,
      onLogout,
      tokenStore,
    })

    this.apiClient = createFetchClient<paths>({
      baseUrl: basePath,
      fetch: async (request) => {
        // Always route through the authenticator so the apiClient (1) skips
        // sending an expired access token, (2) shares the in-flight refresh
        // dedup with every other caller, and (3) waits for an in-progress
        // refresh to publish the new token before constructing headers.
        // Bypassing this and reading the raw lambda means concurrent requests
        // race the refresh and fan out 401s with the stale token.
        const token = await this.authenticator.getAccessToken()
        const headers = new Headers(request.headers)
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
        return fetch(new Request(request, { headers }))
      },
    })
  }
}
