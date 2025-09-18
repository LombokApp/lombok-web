import type { AppTask, IAppPlatformService } from '@lombokapp/app-worker-sdk'
import type { ContentMetadataType } from '@lombokapp/types'
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
    let metadataUpdateParams: {
      requests: {
        folderId: string
        objectKey: string
        hash: string
        metadata: ContentMetadataType
      }[]
    } | null = null
    let contentUrlsRequested = false
    let contentUrlsParams: { requests: unknown[] } | null = null
    let metadataUrlsRequested = false
    let metadataUrlsParams: { requests: unknown[] } | null = null

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
      getMetadataSignedUrls: (requests: unknown[]) => {
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
      getContentSignedUrls: (requests: unknown[]) => {
        contentUrlsRequested = true
        contentUrlsParams = { requests }
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
      updateContentMetadata: (
        requests: {
          folderId: string
          objectKey: string
          hash: string
          metadata: ContentMetadataType
        }[],
      ) => {
        // console.log('updateContentMetadata', JSON.stringify(requests, null, 2))
        metadataUpdatedCalled = true
        metadataUpdateParams = { requests }
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
    metadataUrlsParams = metadataUrlsParams as unknown as {
      requests: unknown[]
    }
    metadataUpdateParams = metadataUpdateParams as unknown as {
      requests: {
        folderId: string
        objectKey: string
        hash: string
        metadata: ContentMetadataType
      }[]
    }
    contentUrlsParams = contentUrlsParams as unknown as {
      requests: {
        folderId: string
        objectKey: string
        hash: string
        metadata: ContentMetadataType
      }[]
    }
    expect(Array.isArray(contentUrlsParams.requests)).toBe(true)
    expect(contentUrlsParams.requests.length).toBe(1)
    expect(contentUrlsParams.requests[0]).toEqual({
      folderId: testFolderId,
      objectKey: testObjectKey,
      method: 'GET',
    })

    // Verify getMetadataSignedUrls was called with correct parameters (if previews were generated)
    expect(metadataUrlsParams).toEqual({
      requests: [
        {
          contentHash: '379f5137831350c900e757b39e525b9db1426d53',
          folderId: testFolderId,
          metadataHash: 'd669d272cffc8e706437a54265d8128ca9a8c4e3',
          method: 'PUT',
          objectKey: 'test-image.png',
        },
        {
          contentHash: '379f5137831350c900e757b39e525b9db1426d53',
          folderId: testFolderId,
          metadataHash: 'd669d272cffc8e706437a54265d8128ca9a8c4e3',
          method: 'PUT',
          objectKey: 'test-image.png',
        },
        {
          contentHash: '379f5137831350c900e757b39e525b9db1426d53',
          folderId: testFolderId,
          metadataHash: 'd669d272cffc8e706437a54265d8128ca9a8c4e3',
          method: 'PUT',
          objectKey: 'test-image.png',
        },
        {
          contentHash: '379f5137831350c900e757b39e525b9db1426d53',
          folderId: testFolderId,
          metadataHash: 'd669d272cffc8e706437a54265d8128ca9a8c4e3',
          method: 'PUT',
          objectKey: 'test-image.png',
        },
      ],
    })

    // Verify updateContentMetadata was called with correct parameters
    expect(metadataUpdateParams.requests[0]).toEqual({
      folderId: testFolderId,
      objectKey: testObjectKey,
      hash: '379f5137831350c900e757b39e525b9db1426d53',
      metadata: {
        height: {
          type: 'inline',
          sizeBytes: 3,
          content: '100',
          mimeType: 'application/json',
        },
        width: {
          type: 'inline',
          sizeBytes: 3,
          content: '100',
          mimeType: 'application/json',
        },
        mimeType: {
          type: 'inline',
          sizeBytes: 11,
          content: '"image/png"',
          mimeType: 'application/json',
        },
        mediaType: {
          type: 'inline',
          sizeBytes: 7,
          content: '"IMAGE"',
          mimeType: 'application/json',
        },
        embeddedMetadata: {
          type: 'external',
          sizeBytes: 2,
          storageKey: 'bf21a9e8fbc5a3846fb05b4fa0859e0917b2202f',
          hash: 'bf21a9e8fbc5a3846fb05b4fa0859e0917b2202f',
          mimeType: 'application/json',
        },
        previews: {
          type: 'inline',
          mimeType: 'application/json',
          sizeBytes: 907,
          content:
            '{"thumbnailSm":{"mimeType":"image/webp","hash":"d669d272cffc8e706437a54265d8128ca9a8c4e3","profile":"thumbnailSm","purpose":"list","label":"Small Thumbnail","sizeBytes":2900,"dimensions":{"width":100,"height":100,"durationMs":0}},"thumbnailLg":{"mimeType":"image/webp","hash":"d669d272cffc8e706437a54265d8128ca9a8c4e3","profile":"thumbnailLg","purpose":"list","label":"Large Thumbnail","sizeBytes":2900,"dimensions":{"width":100,"height":100,"durationMs":0}},"previewSm":{"mimeType":"image/webp","hash":"d669d272cffc8e706437a54265d8128ca9a8c4e3","profile":"previewSm","purpose":"card","label":"Small Preview","sizeBytes":2900,"dimensions":{"width":100,"height":100,"durationMs":0}},"previewLg":{"mimeType":"image/webp","hash":"d669d272cffc8e706437a54265d8128ca9a8c4e3","profile":"previewLg","purpose":"detail","label":"Large Preview","sizeBytes":2900,"dimensions":{"width":100,"height":100,"durationMs":0}}}',
        },
      },
    })
    expect(metadataUpdateParams.requests[0]).toMatchObject({
      folderId: testFolderId,
      objectKey: testObjectKey,
    })
  })
})
