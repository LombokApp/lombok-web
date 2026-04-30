import type { IAppPlatformService } from '@lombokapp/app-worker-sdk'

export function buildTestServerClient(
  overrides: Partial<IAppPlatformService> = {},
): IAppPlatformService {
  const base: IAppPlatformService = {
    // eslint-disable-next-line @typescript-eslint/require-await
    getAppTask: async () => {
      throw new Error('Not implemented in test mock')
    },
    createBridgeTunnel: () => {
      throw new Error('Not implemented in test mock')
    },
    deleteBridgeTunnel: () => {
      throw new Error('Not implemented in test mock')
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    getAppCustomSettings: async () => ({ result: { values: {} } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    patchAppCustomSettings: async () => ({ result: { success: true } }),
    getServerBaseUrl: () => 'http://localhost:3000',
    // eslint-disable-next-line @typescript-eslint/require-await
    emitEvent: async () => ({ result: { success: true } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    saveLogEntry: async () => ({ result: null }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getMetadataSignedUrls: async () => ({ result: [] }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getContentSignedUrls: async () => ({ result: [] }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getAppStorageSignedUrls: async () => ({ result: [] }),
    // eslint-disable-next-line @typescript-eslint/require-await
    mintAppUserToken: async () => ({
      result: { accessToken: '', refreshToken: '' },
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    mintAppUserWorkerToken: async () => ({
      result: { accessToken: '', refreshToken: '' },
    }),
    reportTaskProgress: () => {
      throw new Error('Not implemented in test mock')
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    updateContentMetadata: async () => ({ result: null }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getLatestDbCredentials: async () => ({
      result: {
        host: 'localhost',
        user: 'test-user',
        password: 'test-password',
        database: 'test-database',
        ssl: false,
        port: 5432,
      },
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    executeAppDockerJob: async () => ({
      result: {
        jobId: 'test-job-id',
        submitSuccess: true as const,
        containerId: 'test-container-id',
        execution: {
          success: true as const,
          result: { success: true },
        },
      },
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    executeAppDockerJobAsync: async () => ({
      result: {
        jobId: 'test-job-id',
        submitSuccess: true as const,
        containerId: 'test-container-id',
      },
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    triggerAppTask: async () => ({ result: { taskId: 'test-task-id' } }),
    destroyAppDockerContainers: () => {
      throw new Error('Not implemented in test mock')
    },
  }

  return { ...base, ...overrides }
}
