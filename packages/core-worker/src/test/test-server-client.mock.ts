import type { IAppPlatformService } from '@lombokapp/app-worker-sdk'

export function buildTestServerClient(
  overrides: Partial<IAppPlatformService> = {},
): IAppPlatformService {
  const base: IAppPlatformService = {
    getServerBaseUrl: () => 'http://localhost:3000',
    // eslint-disable-next-line @typescript-eslint/require-await
    emitEvent: async () => ({ result: { success: true } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    saveLogEntry: async () => ({ result: null }),
    // eslint-disable-next-line @typescript-eslint/require-await
    completeHandleTask: async () => ({ result: null }),
    // eslint-disable-next-line @typescript-eslint/require-await
    authenticateUser: async () => ({
      result: { userId: 'user', success: true },
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getMetadataSignedUrls: async () => ({ result: [] }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getContentSignedUrls: async () => ({ result: [] }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getAppStorageSignedUrls: async () => ({ result: [] }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getAppUserAccessToken: async () => ({
      result: { accessToken: '', refreshToken: '' },
    }),
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
        success: true,
        jobSuccess: true,
        jobResult: {
          result: {
            success: true,
          },
        },
      },
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    triggerAppTask: async () => ({ result: null }),
  }

  return { ...base, ...overrides }
}
