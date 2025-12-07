import type { IAppPlatformService } from '@lombokapp/app-worker-sdk'
import type { EventDTO, TaskDTO } from '@lombokapp/types/api.types'

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
    attemptStartHandleTaskById: async ({ taskId }: { taskId: string }) => ({
      result: {
        task: { id: taskId } as unknown as TaskDTO,
        event: { id: 'event' } as unknown as EventDTO,
      },
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    attemptStartHandleAnyAvailableTask: async () => ({
      result: { id: 'task' } as unknown as { task: TaskDTO; event: EventDTO },
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
    updateContentMetadata: async () => ({ result: undefined }),
    // eslint-disable-next-line @typescript-eslint/require-await
    query: async () => ({ result: { rows: [], fields: [] } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    exec: async () => ({ result: { rowCount: 0 } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    batch: async () => ({ result: { results: [] } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    executeAppDockerJob: async () => ({
      result: { jobId: 'job-id', success: true, result: {} },
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    queueAppTask: async () => ({ result: undefined }),
  }

  return { ...base, ...overrides }
}
