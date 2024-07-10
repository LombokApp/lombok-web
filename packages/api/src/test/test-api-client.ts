import type { INestApplication } from '@nestjs/common'
import {
  AppsApi,
  AuthApi,
  Configuration,
  FoldersApi,
  ServerApi,
  UsersApi,
  ViewerApi,
} from '@stellariscloud/api-client'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import request from 'supertest'

export * from '@stellariscloud/api-client'

export interface SupertestApiClientConfigParams {
  accessToken?: string
}

export function buildSupertestApiClient(app: INestApplication) {
  function buildMockAxios(accessToken?: string) {
    const requestFunc = async <D extends string | object | undefined>(
      config: AxiosRequestConfig<D>,
    ) => {
      const { url, headers, data, method = 'GET' } = config

      const fn: 'get' | 'post' | 'options' | 'patch' | 'put' | 'delete' =
        method.toLowerCase() as any

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
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
    foldersApi: (
      configParams: {
        accessToken?: string
      } = {},
    ) =>
      new FoldersApi(
        new Configuration(configParams),
        '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        buildMockAxios(configParams.accessToken) as any,
      ),
    serverApi: (configParams: SupertestApiClientConfigParams = {}) =>
      new ServerApi(
        new Configuration(configParams),
        '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        buildMockAxios(configParams.accessToken) as any,
      ),
    usersApi: (configParams: SupertestApiClientConfigParams = {}) =>
      new UsersApi(
        new Configuration(configParams),
        '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        buildMockAxios(configParams.accessToken) as any,
      ),
    appsApi: (configParams: SupertestApiClientConfigParams = {}) =>
      new AppsApi(
        new Configuration(configParams),
        '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        buildMockAxios(configParams.accessToken) as any,
      ),
    viewerApi: (configParams: SupertestApiClientConfigParams = {}) =>
      new ViewerApi(
        new Configuration(configParams),
        '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        buildMockAxios(configParams.accessToken) as any,
      ),
    authApi: (configParams: SupertestApiClientConfigParams = {}) =>
      new AuthApi(
        new Configuration(configParams),
        '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        buildMockAxios(configParams.accessToken) as any,
      ),
  }
}
