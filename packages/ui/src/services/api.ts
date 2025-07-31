// TODO: Modify this with a better name.
const STORAGE_KEY_PREFIX = 'stellariscloud:auth'
const STORAGE_ACCESS_TOKEN = `${STORAGE_KEY_PREFIX}:accessToken`
const STORAGE_REFRESH_TOKEN = `${STORAGE_KEY_PREFIX}:refreshToken`

import type { TokensType } from '@stellariscloud/auth-utils'
import { StellarisCloudSdk } from '@stellariscloud/sdk'
import createClient from 'openapi-react-query'

export const basePath =
  (import.meta.env.VITE_BACKEND_HOST as string | undefined) ?? ''

const loadTokens = () => {
  const accessToken = localStorage.getItem(STORAGE_ACCESS_TOKEN) ?? undefined
  const refreshToken = localStorage.getItem(STORAGE_REFRESH_TOKEN) ?? undefined

  return {
    accessToken,
    refreshToken,
  }
}

const saveTokens = ({ accessToken, refreshToken }: TokensType) => {
  localStorage.setItem(STORAGE_ACCESS_TOKEN, accessToken)
  localStorage.setItem(STORAGE_REFRESH_TOKEN, refreshToken)
}

export const sdkInstance = new StellarisCloudSdk({
  basePath,
  accessToken: () => loadTokens().accessToken,
  refreshToken: () => loadTokens().refreshToken,
  onTokensRefreshed: (tokens) => saveTokens(tokens),
  onTokensCreated: (tokens) => saveTokens(tokens),
  onLogout: () => {
    localStorage.removeItem(STORAGE_ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_REFRESH_TOKEN)
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  },
})

export const $apiClient = sdkInstance.apiClient
export const $api = createClient($apiClient)
