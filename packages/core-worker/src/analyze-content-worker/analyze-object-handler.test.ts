import type { JsonSerializableObject } from '@lombokapp/types'
import {
  CORE_IDENTIFIER,
  CoreEvent,
  MediaType,
  SignedURLsRequestMethod,
} from '@lombokapp/types'
import { beforeAll, describe, expect, it, mock } from 'bun:test'
import fs from 'fs'
import path from 'path'
import { v4 as uuidV4 } from 'uuid'

import { analyzeObject } from './analyze-object-handler'

// Mock global fetch
const mockFetch = mock()

describe('Analyze Object Handler', () => {
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
    // Create mock TaskDTO for analyze_object
    const analyzeTask = {
      id: uuidV4(),
      taskIdentifier: 'analyze_object',
      data: {} as JsonSerializableObject,
      targetLocation: {
        folderId: testFolderId,
        objectKey: testObjectKey,
      },
      ownerIdentifier: 'core-worker',
      trigger: {
        kind: 'event' as const,
        invokeContext: {
          eventId: uuidV4(),
          emitterIdentifier: CORE_IDENTIFIER,
          eventIdentifier: CoreEvent.object_added,
          eventTriggerConfigIndex: 0,
          eventData: {} as JsonSerializableObject,
        },
      },
      idempotencyKey: '__',
      systemLog: [],
      taskLog: [],
      taskDescription: 'analyze_object',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    let contentUrlRequested = false
    let contentUrlParams:
      | {
          folderId: string
          objectKey: string
          method: SignedURLsRequestMethod
        }[]
      | null = null
    let metadataUrlsRequested = false
    let metadataUrlsParams: { requests: unknown[] } | null = null

    // Test the analyze object task handler - this should complete successfully
    const metadataUpdateParams = await analyzeObject(
      analyzeTask.targetLocation.folderId,
      analyzeTask.targetLocation.objectKey,
      async (_request) => {
        return Promise.resolve({
          url: 'https://example.com/content-upload',
          filename: 'test-image.png',
          folderId: analyzeTask.targetLocation.folderId,
          objectKey: analyzeTask.targetLocation.objectKey,
          contentMetadata: {},
          id: uuidV4(),
          lastModified: new Date().getTime(),
          eTag: uuidV4(),
          sizeBytes: 100,
          mimeType: 'image/png',
          mediaType: MediaType.IMAGE,
        })
      },
      (requests) => {
        contentUrlRequested = true
        contentUrlParams = requests.requests
        return Promise.resolve([
          {
            url: 'https://example.com/metadata-upload',
            folderId: analyzeTask.targetLocation.folderId,
            objectKey: 'metadata.json',
          },
        ])
      },
      (requests) => {
        metadataUrlsRequested = true
        metadataUrlsParams = { requests }
        return Promise.resolve([
          {
            url: 'https://example.com/metadata-upload',
            folderId: analyzeTask.targetLocation.folderId,
            objectKey: 'metadata.json',
          },
        ])
      },
    )

    // Verify getContentSignedUrls was called with correct parameters
    expect(contentUrlRequested).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(contentUrlParams!).toEqual([
      {
        folderId: testFolderId,
        method: SignedURLsRequestMethod.GET,
        objectKey: testObjectKey,
      },
    ])

    // Verify getMetadataUrls was completed successfully with exact parameters
    expect(metadataUrlsRequested).toBe(true)

    // Verify getMetadataSignedUrls was called with correct parameters
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(metadataUrlsParams!).toEqual({
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
    expect(metadataUpdateParams).toEqual({
      contentHash: '379f5137831350c900e757b39e525b9db1426d53',
      contentMetadata: {
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
  })
})
