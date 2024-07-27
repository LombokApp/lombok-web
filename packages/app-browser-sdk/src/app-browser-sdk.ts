import {
  AppsApi,
  AuthApi,
  EventsApi,
  FoldersApi,
  ServerApi,
  StorageProvisionsApi,
  UsersApi,
  ViewerApi,
} from '@stellariscloud/api-client'
import { Authenticator, bindApiConfig } from '@stellariscloud/auth-utils'

export type StellarisCloudAPI = {
  foldersApi: FoldersApi
  authApi: AuthApi
  viewerApi: ViewerApi
  eventsApi: EventsApi
  serverApi: ServerApi
  storageProvisionsApi: StorageProvisionsApi
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
      eventsApi: bindApiConfig(defaultConfig, EventsApi)(),
      storageProvisionsApi: bindApiConfig(
        defaultConfig,
        StorageProvisionsApi,
      )(),
      usersApi: bindApiConfig(defaultConfig, UsersApi)(),
      appsApi: bindApiConfig(defaultConfig, AppsApi)(),
    }
  }
}
