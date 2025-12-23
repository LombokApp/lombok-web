import type { IAppPlatformService } from '@lombokapp/app-worker-sdk'
import type { JsonSerializableObject } from '@lombokapp/types'

const dummyTask = {
  id: crypto.randomUUID(),
  taskIdentifier: 'analyze_object',
  data: {} as JsonSerializableObject,
  targetLocation: {
    folderId: '__dummy__',
    objectKey: '__dummy__',
  },
  ownerIdentifier: 'core-worker',
  trigger: {
    kind: 'event' as const,
    eventIdentifier: '__dummy__',
    invokeContext: {
      eventId: crypto.randomUUID(),
      emitterIdentifier: '__dummy__',
      eventData: {} as JsonSerializableObject,
    },
  },
  systemLog: [],
  taskLog: [],
  taskDescription: 'analyze_object',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export function buildTestServerClient(
  overrides: Partial<IAppPlatformService> = {},
): IAppPlatformService {
  const base: IAppPlatformService = {
    getServerBaseUrl: () => 'http://localhost:3000',
    // eslint-disable-next-line @typescript-eslint/require-await
    emitEvent: async () => ({ result: { success: true } }),
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
    saveLogEntry: async () => ({ result: null }),
    // eslint-disable-next-line @typescript-eslint/require-await, no-empty-pattern
    attemptStartHandleTaskById: async ({}: { taskId: string }) => ({
      result: { task: dummyTask },
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    attemptStartHandleAnyAvailableTask: async () => ({
      result: { task: dummyTask },
    }),
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
    query: async () => ({ result: { rows: [], fields: [] } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    exec: async () => ({ result: { rowCount: 0 } }),
    // eslint-disable-next-line @typescript-eslint/require-await
    batch: async () => ({ result: { results: [] } }),
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
