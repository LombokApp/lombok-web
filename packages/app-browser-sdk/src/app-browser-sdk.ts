import {
  AccessKeysApi,
  AppsApi,
  AuthApi,
  ServerEventsApi,
  FoldersApi,
  ServerApi,
  ServerAccessKeysApi,
  UserStorageProvisionsApi,
  UsersApi,
  ViewerApi,
  TasksApi,
  ServerTasksApi,
  ServerStorageLocationApi,
  FolderEventsApi,
} from '@stellariscloud/api-client'
import { Authenticator, bindApiConfig } from '@stellariscloud/auth-utils'

export type StellarisCloudAPI = {
  foldersApi: FoldersApi
  authApi: AuthApi
  viewerApi: ViewerApi
  serverEventsApi: ServerEventsApi
  serverApi: ServerApi
  userStorageProvisionsApi: UserStorageProvisionsApi
  serverStorageLocationApi: ServerStorageLocationApi
  serverAccessKeysApi: ServerAccessKeysApi
  serverTasksApi: ServerTasksApi
  tasksApi: TasksApi
  folderEventsApi: FolderEventsApi
  accessKeysApi: AccessKeysApi
  usersApi: UsersApi
  appsApi: AppsApi
}

export class AppBrowserSdk {
  public apiClient: StellarisCloudAPI
  public authenticator: Authenticator
  constructor({ basePath }: { basePath: string }) {
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
      folderEventsApi: bindApiConfig(defaultConfig, FolderEventsApi)(),
      serverEventsApi: bindApiConfig(defaultConfig, ServerEventsApi)(),
      accessKeysApi: bindApiConfig(defaultConfig, AccessKeysApi)(),
      tasksApi: bindApiConfig(defaultConfig, TasksApi)(),
      serverAccessKeysApi: bindApiConfig(defaultConfig, ServerAccessKeysApi)(),
      serverTasksApi: bindApiConfig(defaultConfig, ServerTasksApi)(),
      serverStorageLocationApi: bindApiConfig(
        defaultConfig,
        ServerStorageLocationApi,
      )(),
      userStorageProvisionsApi: bindApiConfig(
        defaultConfig,
        UserStorageProvisionsApi,
      )(),
      usersApi: bindApiConfig(defaultConfig, UsersApi)(),
      appsApi: bindApiConfig(defaultConfig, AppsApi)(),
    }
  }
}
