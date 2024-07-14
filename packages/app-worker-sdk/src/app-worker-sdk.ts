import { FoldersApi } from '@stellariscloud/api-client'
import { bindApiConfig } from '@stellariscloud/utils'

export type StellarisCloudAPI = {
  folders: FoldersApi
}

export class AppWorkerSdk {
  public apiClient: StellarisCloudAPI
  constructor(
    private sessionToken: string,
    private _document: Document,
  ) {
    const basePath = '' // TODO: decode this from token
    const defaultConfig = {
      basePath,
      accessToken: async () => sessionToken ?? '', // TODO: this should load a long lived jwt token
    }

    // validate session token
    // hook up iframe parent message listeners (if iframed)
    console.log({ sessionToken })
    this.apiClient = {
      folders: bindApiConfig(defaultConfig, FoldersApi)(),
    }
  }
}
