import type { paths } from '@stellariscloud/api-client'
import type { StellarisCloudAPI } from '@stellariscloud/app-browser-sdk'
import { StellarisCloudAppBrowserSdk } from '@stellariscloud/app-browser-sdk'
import type { ApiQueryHooks } from '@stellariscloud/auth-utils'
import { capitalize } from '@stellariscloud/utils'
import type {
  QueryFunctionContext,
  UseQueryOptions,
} from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import createFetchClient from 'openapi-fetch'
import createClient from 'openapi-react-query'
const basePath = (import.meta.env.VITE_BACKEND_HOST as string | undefined) ?? ''
export const sdkInstance = new StellarisCloudAppBrowserSdk({
  basePath,
})

export const $apiClient = createFetchClient<paths>({
  baseUrl: basePath,
})

export const $api = createClient($apiClient)
export const createApiHooks = <
  T extends StellarisCloudAPI[keyof StellarisCloudAPI],
>(
  api: T,
) => {
  const queryHooks: Partial<ApiQueryHooks<T>> = {}
  Object.getOwnPropertyNames(api.constructor.prototype).forEach((key) => {
    const method = key as string & keyof T

    if (typeof api[method] === 'function') {
      const hook = `use${capitalize(method)}` as keyof ApiQueryHooks<T>
      const queryFunction = (
        requestParameters: unknown,
        options: UseQueryOptions<unknown, Error, unknown, unknown[]>,
      ) => {
        return useQuery({
          ...options,
          queryKey: [String(method), requestParameters],
          queryFn: ({ signal }: QueryFunctionContext) => {
            const fn = api[method] as unknown as (
              params: typeof requestParameters,
              config: AxiosRequestConfig,
            ) => Promise<AxiosResponse>
            return (
              fn
                .call(api, requestParameters, { signal })
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                .then((response: AxiosResponse) => response.data)
            )
          },
        })
      }
      queryHooks[hook] =
        queryFunction as unknown as ApiQueryHooks<T>[keyof ApiQueryHooks<T>]
    }
  })

  return queryHooks as unknown as ApiQueryHooks<T>
}

export const authApiHooks = createApiHooks(sdkInstance.apiClient.authApi)

export const foldersApiHooks = createApiHooks(sdkInstance.apiClient.foldersApi)

export const tasksApiHooks = createApiHooks(sdkInstance.apiClient.tasksApi)

export const serverEventsApiHooks = createApiHooks(
  sdkInstance.apiClient.serverEventsApi,
)

export const folderEventsApiHooks = createApiHooks(
  sdkInstance.apiClient.folderEventsApi,
)

export const serverAccessKeysApiHooks = createApiHooks(
  sdkInstance.apiClient.serverAccessKeysApi,
)

export const usersApiHooks = createApiHooks(sdkInstance.apiClient.usersApi)

export const userStorageProvisionsApiHooks = createApiHooks(
  sdkInstance.apiClient.userStorageProvisionsApi,
)

export const accessKeysApiHooks = createApiHooks(
  sdkInstance.apiClient.accessKeysApi,
)

export const apiClient = sdkInstance.apiClient
