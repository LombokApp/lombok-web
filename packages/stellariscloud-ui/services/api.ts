import type * as apiClient from '@stellariscloud/api-client'
import {
  AppsApi,
  AuthApi,
  FoldersApi,
  ServerApi,
  UsersApi,
  ViewerApi,
} from '@stellariscloud/api-client'
import type { ApiQueryHooks } from '@stellariscloud/auth-utils'
import { bindApiConfig } from '@stellariscloud/auth-utils'
import { Authenticator } from '@stellariscloud/auth-utils'
import { capitalize } from '@stellariscloud/utils'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import type { QueryFunctionContext } from 'react-query'
import { useQuery } from 'react-query'

export const authenticator = new Authenticator({
  basePath: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
})

export const createQueryHooks = <
  T extends InstanceType<
    (typeof apiClient)[keyof typeof apiClient & `${string}Api`]
  >,
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

const defaultConfig = {
  basePath: process.env.NEXT_PUBLIC_API_BASE_URL,
  accessToken: async () => (await authenticator.getAccessToken()) ?? '',
}

export const authApi = bindApiConfig(defaultConfig, AuthApi)()
export const viewerApi = bindApiConfig(defaultConfig, ViewerApi)()
export const foldersApi = bindApiConfig(defaultConfig, FoldersApi)()
export const serverApi = bindApiConfig(defaultConfig, ServerApi)()
export const usersApi = bindApiConfig(defaultConfig, UsersApi)()
export const appsApi = bindApiConfig(defaultConfig, AppsApi)()

export const authApiHooks = createQueryHooks(authApi)
export const foldersApiHooks = createQueryHooks(foldersApi)
