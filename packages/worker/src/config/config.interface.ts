export interface ServiceAuthConfig {
  workerToken: string
  apiBaseUrl: string
  socketBaseUrl: string
  workerUniqueName: string
}

export interface ConfigProvider {
  getServiceAuthConfig: () => ServiceAuthConfig
}
