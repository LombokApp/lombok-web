import { StellarisCloudAppBrowserSdk } from '@stellariscloud/app-browser-sdk'
import { StellarisCloudAPI } from '@stellariscloud/app-browser-sdk/src/app-browser-sdk'
import type { ApiQueryHooks } from '@stellariscloud/auth-utils'
import { capitalize } from '@stellariscloud/utils'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import type { QueryFunctionContext } from 'react-query'
import { useQuery } from 'react-query'

export const sdkInstance = new StellarisCloudAppBrowserSdk({
  basePath: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
})

export const createQueryHooks = <
  T extends StellarisCloudAPI[keyof StellarisCloudAPI & `${string}Api`],
>(
  api: T,
) => {
  const hooks: Partial<ApiQueryHooks<T>> = {}

  Object.getOwnPropertyNames(api.constructor.prototype).forEach((key) => {
    const method = key as string & keyof T

    if (typeof api[method] === 'function') {
      const hook = `use${capitalize(method)}` as keyof ApiQueryHooks<T>
      const f = (requestParameters: any, options: any) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useQuery(
          [hook, requestParameters],
          ({ signal }: QueryFunctionContext) => {
            const fn = api[method] as unknown as (
              params: typeof requestParameters,
              config: AxiosRequestConfig,
            ) => Promise<AxiosResponse>

            const promise = fn
              .call(api, requestParameters, { signal })
              .then((response: AxiosResponse) => response.data)

            return promise
          },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          options,
        )
      }
      hooks[hook] = f as any
    }
  })

  return hooks as unknown as ApiQueryHooks<T>
}

export const authApiHooks = createQueryHooks(sdkInstance.apiClient.authApi)
export const foldersApiHooks = createQueryHooks(
  sdkInstance.apiClient.foldersApi,
)

export const apiClient = sdkInstance.apiClient
