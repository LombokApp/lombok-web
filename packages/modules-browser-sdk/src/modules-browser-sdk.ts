import { FoldersApi } from '@stellariscloud/api-client'
import { bindApiConfig } from '@stellariscloud/api-utils'

export type StellarisCloudAPI = {
  folders: FoldersApi
}

export class ModulesBrowserSdk {
  public apiClient: StellarisCloudAPI
  constructor(private sessionToken: string, private _document: Document) {
    const basePath = '' // TODO: decode this from token
    const defaultConfig = {
      basePath,
      accessToken: async () => sessionToken ?? '', // TODO: this needs to be a reference to the latest (possibly refreshed) token
    }

    // validate session token
    // hook up iframe parent message listeners (if iframed)
    console.log({ sessionToken })
    this.apiClient = {
      folders: bindApiConfig(defaultConfig, FoldersApi)(),
    }
  }
}
