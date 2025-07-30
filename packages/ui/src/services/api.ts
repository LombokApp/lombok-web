import Cookies from 'js-cookie'

// TODO: Modify this with a better name.
const COOKIES_NAME = 'stellariscloud:auth'
const COOKIES_ACCESS_TOKEN = `${COOKIES_NAME}:accessToken`
const COOKIES_REFRESH_TOKEN = `${COOKIES_NAME}:refreshToken`

import type { TokensType } from '@stellariscloud/auth-utils'
import { StellarisCloudSdk } from '@stellariscloud/sdk'
import createClient from 'openapi-react-query'

export const basePath =
  (import.meta.env.VITE_BACKEND_HOST as string | undefined) ?? ''

const loadTokens = () => {
  const accessToken = Cookies.get(COOKIES_ACCESS_TOKEN)
  const refreshToken = Cookies.get(COOKIES_REFRESH_TOKEN)

  return {
    accessToken,
    refreshToken,
  }
}

const saveTokens = ({ accessToken, refreshToken }: TokensType) => {
  Cookies.set(COOKIES_ACCESS_TOKEN, accessToken, {
    sameSite: 'strict',
  })
  Cookies.set(COOKIES_REFRESH_TOKEN, refreshToken, {
    sameSite: 'strict',
  })
}

export const sdkInstance = new StellarisCloudSdk({
  basePath,
  accessToken: () => loadTokens().accessToken,
  refreshToken: () => loadTokens().refreshToken,
  onTokensRefreshed: (tokens) => saveTokens(tokens),
  onTokensCreated: (tokens) => saveTokens(tokens),
  onLogout: () => {
    Cookies.remove(COOKIES_ACCESS_TOKEN)
    Cookies.remove(COOKIES_REFRESH_TOKEN)
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  },
})

export const $apiClient = sdkInstance.apiClient
export const $api = createClient($apiClient)
