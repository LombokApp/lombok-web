import type { AppTask, IAppPlatformService } from '@lombokapp/app-worker-sdk'

export function buildTestServerClient(
  overrides: Partial<IAppPlatformService> = {},
): IAppPlatformService {
  const base: IAppPlatformService = {
    getServerBaseUrl: () => 'http://localhost:3000',
    // eslint-disable-next-line @typescript-eslint/require-await
    emitEvent: async () => ({ result: undefined }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getWorkerExecutionDetails: async () => ({
      result: {
        entrypoint: 'index.ts',
        workerToken: 'test-token',
        environmentVariables: {},
        hash: 'test-worker-hash',
        payloadUrl: 'https://example.com/worker-bundle.zip',
      },
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getAppUIbundle: async () => ({ result: { manifest: {}, bundleUrl: '' } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    saveLogEntry: async () => ({ result: true }),
    // eslint-disable-next-line @typescript-eslint/require-await
    attemptStartHandleTaskById: async (taskId: string) => ({
      result: { id: taskId } as unknown as AppTask,
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    attemptStartHandleAnyAvailableTask: async () => ({
      result: { id: 'task' } as unknown as AppTask,
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    failHandleTask: async () => ({ result: undefined }),
    // eslint-disable-next-line @typescript-eslint/require-await
    completeHandleTask: async () => ({ result: undefined }),
    // eslint-disable-next-line @typescript-eslint/require-await
    authenticateUser: async () => ({
      result: { userId: 'user', success: true },
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getMetadataSignedUrls: async () => ({ result: { urls: [] } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getContentSignedUrls: async () => ({ result: { urls: [] } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getAppStorageSignedUrls: async () => ({ result: { urls: [] } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    getAppUserAccessToken: async () => ({
      result: { accessToken: '', refreshToken: '' },
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    updateContentMetadata: async () => ({ result: undefined }),
    // eslint-disable-next-line @typescript-eslint/require-await
    query: async () => ({ result: { rows: [], fields: [] } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    exec: async () => ({ result: { rowCount: 0 } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    batch: async () => ({ result: { results: [] } }),
  }

  return { ...base, ...overrides }
}
