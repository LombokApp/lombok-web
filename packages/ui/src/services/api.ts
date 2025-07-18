import Cookies from 'js-cookie'

// TODO: Modify this with a better name.
const COOKIES_NAME = 'stellariscloud:auth'
const COOKIES_ACCESS_TOKEN = `${COOKIES_NAME}:accessToken`
const COOKIES_REFRESH_TOKEN = `${COOKIES_NAME}:refreshToken`

import { StellarisCloudSdk } from '@stellariscloud/app-browser-sdk'
import type { TokensType } from '@stellariscloud/auth-utils'
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
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  Cookies.set(COOKIES_ACCESS_TOKEN, accessToken!, {
    sameSite: 'strict',
  })
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  Cookies.set(COOKIES_REFRESH_TOKEN, refreshToken!, {
    sameSite: 'strict',
  })
}

export const sdkInstance = new StellarisCloudSdk({
  basePath,
  accessToken: () => loadTokens().accessToken,
  refreshToken: () => loadTokens().refreshToken,
  onTokensRefreshed: (tokens) => saveTokens(tokens),
  onTokensCreated: (tokens) => saveTokens(tokens),
})

export const $apiClient = sdkInstance.apiClient
export const $api = createClient($apiClient)
