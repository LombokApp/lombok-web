import type { AppTask, IAppPlatformService } from '@lombokapp/app-worker-sdk'
import { beforeAll, describe, expect, it, mock } from 'bun:test'
import fs from 'fs'
import path from 'path'
import { v4 as uuidV4 } from 'uuid'

import { analyzeObjectTaskHandler } from './analyze-object-task-handler'

// Mock global fetch
const mockFetch = mock()

describe('Analyze Object Task Handler', () => {
  let testFolderId: string
  let testObjectKey: string
  let testImagePath: string

  beforeAll(() => {
    // Create test image file
    testFolderId = uuidV4()
    testObjectKey = 'test-image.png'
    testImagePath = path.join(__dirname, '../__tests__/fixtures/test-image.png')

    // Ensure fixtures directory exists
    const fixturesDir = path.dirname(testImagePath)
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true })
    }

    // Verify the real PNG file exists
    if (!fs.existsSync(testImagePath)) {
      throw new Error(
        `Test PNG file not found at ${testImagePath}. Please ensure it exists.`,
      )
    }

    // Mock global fetch
    global.fetch = mockFetch as unknown as typeof fetch
  })

  it('should complete analyze object task successfully', async () => {
    // Create mock AppTask for analyze_object
    const analyzeTask: AppTask = {
      id: uuidV4(),
      taskIdentifier: 'analyze_object',
      inputData: {},
      event: {
        id: uuidV4(),
        emitterIdentifier: 'test-emitter',
        eventIdentifier: 'OBJECT_ADDED',
        data: {},
        createdAt: new Date().toISOString(),
      },
      subjectFolderId: testFolderId,
      subjectObjectKey: testObjectKey,
    }

    // Mock fetch to return the test image
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([
        ['content-type', 'image/png'],
        ['content-length', fs.statSync(testImagePath).size.toString()],
      ]),
      body: {
        getReader: () => {
          let hasRead = false
          return {
            read: () => {
              if (hasRead) {
                return Promise.resolve({ done: true, value: undefined })
              }
              hasRead = true
              return Promise.resolve({
                done: false,
                value: fs.readFileSync(testImagePath),
              })
            },
          }
        },
      },
    })

    // Track calls to completion methods with exact parameters
    let metadataUpdatedCalled = false
    let metadataUpdateParams: { requests: unknown; taskId: string } | null =
      null
    let contentUrlsRequested = false
    let contentUrlsParams: { requests: unknown; taskId: string } | null = null
    let metadataUrlsRequested = false
    let metadataUrlsParams: { requests: unknown } | null = null

    // Create mock server client with all required methods
    const mockServerClient: IAppPlatformService = {
      getServerBaseUrl: () => 'http://localhost:3000',
      emitEvent: () => Promise.resolve({ result: undefined }),
      getWorkerExecutionDetails: () =>
        Promise.resolve({
          result: {
            entrypoint: 'test-entrypoint',
            workerToken: 'test-token',
            environmentVariables: {},
            hash: 'test-hash',
            payloadUrl: 'https://example.com/bundle',
          },
        }),
      getAppUIbundle: () =>
        Promise.resolve({
          result: {
            manifest: {},
            bundleUrl: 'https://example.com/bundle',
          },
        }),
      saveLogEntry: () => Promise.resolve({ result: true }),
      attemptStartHandleTaskById: () =>
        Promise.resolve({ result: analyzeTask }),
      attemptStartHandleAnyAvailableTask: () =>
        Promise.resolve({ result: analyzeTask }),
      failHandleTask: () => Promise.resolve({ result: undefined }),
      completeHandleTask: () => Promise.resolve({ result: undefined }),
      authenticateUser: () =>
        Promise.resolve({
          result: { userId: 'test-user', success: true },
        }),
      getMetadataSignedUrls: (requests: unknown) => {
        metadataUrlsRequested = true
        metadataUrlsParams = { requests }
        return Promise.resolve({
          result: {
            urls: [
              {
                url: 'https://example.com/metadata-upload',
                folderId: testFolderId,
                objectKey: 'metadata.json',
              },
            ],
          },
        })
      },
      getContentSignedUrls: (requests: unknown, eventId?: string) => {
        contentUrlsRequested = true
        contentUrlsParams = { requests, taskId: eventId || '' }
        return Promise.resolve({
          result: {
            urls: [
              {
                url: 'https://example.com/test-image.png',
                folderId: testFolderId,
                objectKey: testObjectKey,
              },
            ],
          },
        })
      },
      getAppStorageSignedUrls: () =>
        Promise.resolve({
          result: { urls: ['https://example.com/storage'] },
        }),
      getAppUserAccessToken: () =>
        Promise.resolve({
          result: { accessToken: 'test-token', refreshToken: 'test-refresh' },
        }),
      updateContentMetadata: (requests: unknown, eventId?: string) => {
        metadataUpdatedCalled = true
        metadataUpdateParams = { requests, taskId: eventId || '' }
        return Promise.resolve({ result: undefined })
      },
      query: () =>
        Promise.resolve({
          result: { rows: [], fields: [] },
        }),
      exec: () =>
        Promise.resolve({
          result: { rowCount: 0 },
        }),
      batch: () =>
        Promise.resolve({
          result: { results: [] },
        }),
    }

    // Test the analyze object task handler - this should complete successfully
    await analyzeObjectTaskHandler(analyzeTask, mockServerClient)

    // Verify the task was completed successfully with exact parameters
    expect(metadataUpdatedCalled).toBe(true)
    expect(contentUrlsRequested).toBe(true)
    expect(metadataUrlsRequested).toBe(true)

    // Verify getContentSignedUrls was called with correct parameters
    expect(contentUrlsParams).not.toBeNull()
    expect(
      (contentUrlsParams as unknown as { requests: unknown; taskId: string })
        .taskId,
    ).toBe(analyzeTask.id)
    expect(
      Array.isArray(
        (contentUrlsParams as unknown as { requests: unknown; taskId: string })
          .requests,
      ),
    ).toBe(true)
    expect(
      (
        (contentUrlsParams as unknown as { requests: unknown; taskId: string })
          .requests as unknown[]
      ).length,
    ).toBe(1)
    expect(
      (
        (contentUrlsParams as unknown as { requests: unknown; taskId: string })
          .requests as unknown[]
      )[0],
    ).toEqual({
      folderId: testFolderId,
      objectKey: testObjectKey,
      method: 'GET',
    })

    // Verify getMetadataSignedUrls was called with correct parameters (if previews were generated)
    expect(metadataUrlsParams).not.toBeNull()
    expect(
      Array.isArray(
        (metadataUrlsParams as unknown as { requests: unknown }).requests,
      ),
    ).toBe(true)
    expect(
      (
        (metadataUrlsParams as unknown as { requests: unknown })
          .requests as unknown[]
      ).length,
    ).toBeGreaterThan(0)
    expect(
      (
        (metadataUrlsParams as unknown as { requests: unknown })
          .requests as unknown[]
      )[0],
    ).toMatchObject({
      folderId: testFolderId,
      objectKey: testObjectKey,
      method: 'PUT',
    })
    expect(
      (
        (metadataUrlsParams as unknown as { requests: unknown })
          .requests as unknown[]
      )[0],
    ).toHaveProperty('contentHash')
    expect(
      (
        (metadataUrlsParams as unknown as { requests: unknown })
          .requests as unknown[]
      )[0],
    ).toHaveProperty('metadataHash')

    // Verify updateContentMetadata was called with correct parameters
    expect(metadataUpdateParams).not.toBeNull()
    expect(
      (metadataUpdateParams as unknown as { requests: unknown; taskId: string })
        .taskId,
    ).toBe(analyzeTask.id)
    expect(
      Array.isArray(
        (
          metadataUpdateParams as unknown as {
            requests: unknown
            taskId: string
          }
        ).requests,
      ),
    ).toBe(true)
    expect(
      (
        (
          metadataUpdateParams as unknown as {
            requests: unknown
            taskId: string
          }
        ).requests as unknown[]
      ).length,
    ).toBe(1)
    expect(
      (
        (
          metadataUpdateParams as unknown as {
            requests: unknown
            taskId: string
          }
        ).requests as unknown[]
      )[0],
    ).toMatchObject({
      folderId: testFolderId,
      objectKey: testObjectKey,
    })
    expect(
      (
        (
          metadataUpdateParams as unknown as {
            requests: unknown
            taskId: string
          }
        ).requests as unknown[]
      )[0],
    ).toHaveProperty('hash')
    expect(
      (
        (
          metadataUpdateParams as unknown as {
            requests: unknown
            taskId: string
          }
        ).requests as unknown[]
      )[0],
    ).toHaveProperty('metadata')
    expect(
      (
        (
          metadataUpdateParams as unknown as {
            requests: unknown
            taskId: string
          }
        ).requests as unknown[]
      )[0],
    ).toHaveProperty('metadata.mimeType')
    expect(
      (
        (
          metadataUpdateParams as unknown as {
            requests: unknown
            taskId: string
          }
        ).requests as unknown[]
      )[0],
    ).toHaveProperty('metadata.mediaType')
    expect(
      (
        (
          metadataUpdateParams as unknown as {
            requests: unknown
            taskId: string
          }
        ).requests as unknown[]
      )[0],
    ).toHaveProperty('metadata.embeddedMetadata')
    expect(
      (
        (
          metadataUpdateParams as unknown as {
            requests: unknown
            taskId: string
          }
        ).requests as unknown[]
      )[0],
    ).toHaveProperty('metadata.previews')
  })
})
