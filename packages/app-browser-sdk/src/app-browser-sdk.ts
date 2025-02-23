import {
  AccessKeysApi,
  AppsApi,
  AuthApi,
  ServerEventsApi,
  FoldersApi,
  ServerApi,
  ServerAccessKeysApi,
  StorageProvisionsApi,
  UsersApi,
  ViewerApi,
  TasksApi,
} from '@stellariscloud/api-client'
import { Authenticator, bindApiConfig } from '@stellariscloud/auth-utils'

export type StellarisCloudAPI = {
  foldersApi: FoldersApi
  authApi: AuthApi
  viewerApi: ViewerApi
  serverEventsApi: ServerEventsApi
  serverApi: ServerApi
  storageProvisionsApi: StorageProvisionsApi
  serverAccessKeysApi: ServerAccessKeysApi
  tasksApi: TasksApi
  accessKeysApi: AccessKeysApi
  usersApi: UsersApi
  appsApi: AppsApi
}

export class AppBrowserSdk {
  public apiClient: StellarisCloudAPI
  public authenticator: Authenticator
  constructor({
    basePath,
  }: {
    basePath: string
    // sessionToken: string,
    // private _document: Document,
  }) {
    this.authenticator = new Authenticator({
      basePath,
    })

    const defaultConfig = {
      basePath,
      accessToken: async () =>
        (await this.authenticator.getAccessToken()) ?? '',
    }

    // validate session token
    // console.log({ sessionToken })
    this.apiClient = {
      authApi: bindApiConfig(defaultConfig, AuthApi)(),
      foldersApi: bindApiConfig(defaultConfig, FoldersApi)(),
      viewerApi: bindApiConfig(defaultConfig, ViewerApi)(),
      serverApi: bindApiConfig(defaultConfig, ServerApi)(),
      serverEventsApi: bindApiConfig(defaultConfig, ServerEventsApi)(),
      accessKeysApi: bindApiConfig(defaultConfig, AccessKeysApi)(),
      tasksApi: bindApiConfig(defaultConfig, TasksApi)(),
      serverAccessKeysApi: bindApiConfig(defaultConfig, ServerAccessKeysApi)(),
      storageProvisionsApi: bindApiConfig(
        defaultConfig,
        StorageProvisionsApi,
      )(),
      usersApi: bindApiConfig(defaultConfig, UsersApi)(),
      appsApi: bindApiConfig(defaultConfig, AppsApi)(),
    }
  }
}
