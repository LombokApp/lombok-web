import type { INestApplication } from '@nestjs/common'
import {
  AccessKeysApi,
  AppsApi,
  AuthApi,
  Configuration,
  FoldersApi,
  ServerAccessKeysApi,
  ServerApi,
  ServerStorageLocationApi,
  UsersApi,
  UserStorageProvisionsApi,
  ViewerApi,
} from '@stellariscloud/api-client'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import request from 'supertest'

export * from '@stellariscloud/api-client'

export interface SupertestApiClientConfigParams {
  accessToken?: string
}

type FnType = 'get' | 'post' | 'options' | 'patch' | 'put' | 'delete'

export function buildSupertestApiClient(app: INestApplication) {
  function buildMockAxios(accessToken?: string) {
    const requestFunc = async <D extends string | object | undefined>(
      config: AxiosRequestConfig<D>,
    ) => {
      const { url, headers, data, method = 'GET' } = config

      const fn: FnType = method.toLowerCase() as FnType

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        [fn](url ?? '')
        .set(
          accessToken ? 'Authorization' : '__DUMMY__',
          accessToken ? `Bearer ${accessToken}` : '',
        )
        .set(headers as never)
        .send(data)

      // return response as Promise<any>
      return {
        data: response.body as never,
        status: response.status,
      }
    }
    return {
      defaults: {
        headers: { Authorization: `Bearer: ${accessToken}` } as unknown,
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
        buildMockAxios(configParams.accessToken),
      ),
    serverApi: (configParams: SupertestApiClientConfigParams = {}) =>
      new ServerApi(
        new Configuration(configParams),
        '',
        buildMockAxios(configParams.accessToken),
      ),
    serverStorageLocationApi: (
      configParams: SupertestApiClientConfigParams = {},
    ) =>
      new ServerStorageLocationApi(
        new Configuration(configParams),
        '',
        buildMockAxios(configParams.accessToken),
      ),
    accessKeysApi: (configParams: SupertestApiClientConfigParams = {}) =>
      new AccessKeysApi(
        new Configuration(configParams),
        '',
        buildMockAxios(configParams.accessToken),
      ),
    serverAccessKeysApi: (configParams: SupertestApiClientConfigParams = {}) =>
      new ServerAccessKeysApi(
        new Configuration(configParams),
        '',
        buildMockAxios(configParams.accessToken),
      ),
    userStorageProvisionsApi: (
      configParams: SupertestApiClientConfigParams = {},
    ) =>
      new UserStorageProvisionsApi(
        new Configuration(configParams),
        '',
        buildMockAxios(configParams.accessToken),
      ),
    usersApi: (configParams: SupertestApiClientConfigParams = {}) =>
      new UsersApi(
        new Configuration(configParams),
        '',
        buildMockAxios(configParams.accessToken),
      ),
    appsApi: (configParams: SupertestApiClientConfigParams = {}) =>
      new AppsApi(
        new Configuration(configParams),
        '',
        buildMockAxios(configParams.accessToken),
      ),
    viewerApi: (configParams: SupertestApiClientConfigParams = {}) =>
      new ViewerApi(
        new Configuration(configParams),
        '',
        buildMockAxios(configParams.accessToken),
      ),
    authApi: (configParams: SupertestApiClientConfigParams = {}) =>
      new AuthApi(
        new Configuration(configParams),
        '',
        buildMockAxios(configParams.accessToken),
      ),
  }
}
