import type { paths } from '@stellariscloud/api-client'
import { StellarisCloudAppBrowserSdk } from '@stellariscloud/app-browser-sdk'
import createFetchClient from 'openapi-fetch'
import createClient from 'openapi-react-query'

const basePath = (import.meta.env.VITE_BACKEND_HOST as string | undefined) ?? ''

export const sdkInstance = new StellarisCloudAppBrowserSdk({
  basePath,
})

export const $apiClient = createFetchClient<paths>({
  baseUrl: basePath,
  fetch: async (request) => {
    const token = await sdkInstance.authenticator.getAccessToken()
    const headers = new Headers(request.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(new Request(request, { headers }))
  },
})

export const $api = createClient($apiClient)
