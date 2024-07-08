import {
  AuthApi,
  Configuration,
  FoldersApi,
  ViewerApi,
} from '@stellariscloud/api-client'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import request from 'supertest'

import type { TestModule } from './test.types'

export * from '@stellariscloud/api-client'

interface CustomConfigParams {
  accessToken?: string
}

export function buildSupertestApiClient(testModule: TestModule) {
  function buildMockAxios(accessToken?: string) {
    const requestFunc = async <D extends string | object | undefined>(
      config: AxiosRequestConfig<D>,
    ) => {
      const { url, headers, data, method = 'GET' } = config

      const fn: 'get' | 'post' | 'options' | 'patch' | 'put' | 'delete' =
        method.toLowerCase() as any

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(testModule.app.getHttpServer())
        [fn](url ?? '')
        .set(
          accessToken ? 'Authorization' : '__DUMMY__',
          accessToken ? `Bearer ${accessToken}` : '',
        )
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .set(headers as any)
        .send(data)

      // return response as Promise<any>
      return {
        data: response.body,
        status: response.status,
      }
    }
    return {
      defaults: {
        headers: { Authorization: `Bearer: ${accessToken}` } as any,
      },
      request: requestFunc,
    } as AxiosInstance
  }

  return {
    foldersApi: (configParams: CustomConfigParams = {}) =>
      new FoldersApi(
        new Configuration(configParams),
        '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        buildMockAxios(configParams.accessToken) as any,
      ),
    viewerApi: (configParams: CustomConfigParams = {}) =>
      new ViewerApi(
        new Configuration(configParams),
        '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        buildMockAxios(configParams.accessToken) as any,
      ),
    authApi: (configParams: CustomConfigParams = {}) =>
      new AuthApi(
        new Configuration(configParams),
        '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        buildMockAxios(configParams.accessToken) as any,
      ),
  }
}
