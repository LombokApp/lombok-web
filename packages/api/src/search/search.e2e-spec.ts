import { MediaType } from '@lombokapp/types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { CoreTaskName } from 'src/task/task.constants'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
  reindexTestFolder,
} from 'src/test/test.util'

import type { SearchQueryParamsDTO } from './dto/search-query-params.dto'

const TEST_MODULE_KEY = 'search'

describe('Search', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      // debug: true,
    })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  it(`should perform a search query`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const searchResponse = await apiClient(accessToken).GET('/api/v1/search', {
      params: {
        query: {
          q: 'test query',
        },
      },
    })

    expect(searchResponse.response.status).toBe(200)
    expect(searchResponse.data).toBeDefined()
    expect(searchResponse.data?.result).toBeArray()
    expect(searchResponse.data?.meta).toBeDefined()
    expect(searchResponse.data?.meta.totalCount).toBeNumber()
  })

  it(`should require authentication`, async () => {
    const searchResponse = await apiClient().GET('/api/v1/search', {
      params: {
        query: {
          q: 'test query',
        },
      },
    })

    expect(searchResponse.response.status).toBe(401)
  })

  it(`should require a query parameter`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const searchResponse = await apiClient(accessToken).GET('/api/v1/search', {
      params: {
        query: {} as SearchQueryParamsDTO,
      },
    })

    // Should return 400 for missing required query parameter
    expect([400, 422]).toContain(searchResponse.response.status)
  })

  describe('Full-text Search', () => {
    it(`should find files by exact filename match`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'searchtestuser',
        password: '123',
      })

      const { folder } = await createTestFolder({
        testModule,
        accessToken,
        apiClient,
        folderName: 'SearchTestFolder',
        mockFiles: [
          { objectKey: 'vacation-photos.jpg', content: 'image content' },
          { objectKey: 'work-documents.pdf', content: 'pdf content' },
          { objectKey: 'random-file.txt', content: 'text content' },
        ],
      })

      await reindexTestFolder({ accessToken, folderId: folder.id, apiClient })

      await testModule!.waitForTasks('completed', {
        taskIdentifiers: [CoreTaskName.ReindexFolder],
      })

      const searchResponse = await apiClient(accessToken).GET(
        '/api/v1/search',
        {
          params: {
            query: {
              q: 'vacation',
            },
          },
        },
      )

      expect(searchResponse.response.status).toBe(200)
      expect(searchResponse.data?.result).toBeArray()
      expect(searchResponse.data?.result.length).toBeGreaterThan(0)
      expect(searchResponse.data?.result[0]?.folderObject.filename).toContain(
        'vacation',
      )
    })

    it(`should find files by partial filename match`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'searchtestuser2',
        password: '123',
      })

      const { folder } = await createTestFolder({
        testModule,
        accessToken,
        apiClient,
        folderName: 'SearchTestFolder2',
        mockFiles: [
          { objectKey: 'meeting-notes-2024.txt', content: 'notes' },
          { objectKey: 'presentation.pptx', content: 'slides' },
        ],
      })

      await reindexTestFolder({ accessToken, folderId: folder.id, apiClient })

      await testModule!.waitForTasks('completed', {
        taskIdentifiers: [CoreTaskName.ReindexFolder],
      })

      const searchResponse = await apiClient(accessToken).GET(
        '/api/v1/search',
        {
          params: {
            query: {
              q: 'meeting',
            },
          },
        },
      )

      expect(searchResponse.response.status).toBe(200)
      expect(searchResponse.data?.result).toBeArray()
      expect(searchResponse.data?.result.length).toBeGreaterThan(0)
    })

    it(`should handle multi-word queries`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'searchtestuser3',
        password: '123',
      })

      const { folder } = await createTestFolder({
        testModule,
        accessToken,
        apiClient,
        folderName: 'SearchTestFolder3',
        mockFiles: [
          { objectKey: 'vacation-photos-2024.jpg', content: 'image' },
          { objectKey: 'vacation-videos.mp4', content: 'video' },
          { objectKey: 'photos-only.jpg', content: 'image2' },
        ],
      })

      await reindexTestFolder({ accessToken, folderId: folder.id, apiClient })

      await testModule!.waitForTasks('completed', {
        taskIdentifiers: [CoreTaskName.ReindexFolder],
      })

      const searchResponse = await apiClient(accessToken).GET(
        '/api/v1/search',
        {
          params: {
            query: {
              q: 'vacation photos',
            },
          },
        },
      )

      expect(searchResponse.response.status).toBe(200)
      expect(searchResponse.data?.result).toBeArray()
      // Should find files matching both "vacation" AND "photos"
      const firstResult = searchResponse.data?.result[0]
      expect(
        firstResult?.folderObject.filename.includes('vacation') &&
          firstResult.folderObject.filename.includes('photos'),
      ).toBe(true)
    })

    it(`should return empty results for non-matching query`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'searchtestuser4',
        password: '123',
      })

      await createTestFolder({
        testModule,
        accessToken,
        apiClient,
        folderName: 'SearchTestFolder4',
        mockFiles: [{ objectKey: 'document.pdf', content: 'content' }],
      })

      const searchResponse = await apiClient(accessToken).GET(
        '/api/v1/search',
        {
          params: {
            query: {
              q: 'nonexistentfilenamexyz',
            },
          },
        },
      )

      expect(searchResponse.response.status).toBe(200)
      expect(searchResponse.data?.result).toBeArray()
      expect(searchResponse.data?.result.length).toBe(0)
      expect(searchResponse.data?.meta.totalCount).toBe(0)
    })
  })

  describe('Pagination', () => {
    it(`should paginate results with offset and limit`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'paginationuser',
        password: '123',
      })

      const { folder } = await createTestFolder({
        testModule,
        accessToken,
        apiClient,
        folderName: 'PaginationFolder',
        mockFiles: Array.from({ length: 15 }, (_, i) => ({
          objectKey: `file-${i + 1}.txt`,
          content: `content ${i + 1}`,
        })),
      })

      await reindexTestFolder({ accessToken, folderId: folder.id, apiClient })

      await testModule!.waitForTasks('completed', {
        taskIdentifiers: [CoreTaskName.ReindexFolder],
      })

      // Get first page
      const page1Response = await apiClient(accessToken).GET('/api/v1/search', {
        params: {
          query: {
            q: 'file',
            offset: 0,
            limit: 5,
          },
        },
      })

      expect(page1Response.response.status).toBe(200)
      expect(page1Response.data?.result.length).toBe(5)
      expect(page1Response.data?.meta.totalCount).toBe(15)

      // Get second page
      const page2Response = await apiClient(accessToken).GET('/api/v1/search', {
        params: {
          query: {
            q: 'file',
            offset: 5,
            limit: 5,
          },
        },
      })

      expect(page2Response.response.status).toBe(200)
      expect(page2Response.data?.result.length).toBe(5)
      expect(page2Response.data?.meta.totalCount).toBe(15)

      // Verify no duplicates between pages
      const page1Ids = page1Response.data?.result.map((r) => r.folderObject.id)
      const page2Ids = page2Response.data?.result.map((r) => r.folderObject.id)
      const intersection = page1Ids?.filter((id) => page2Ids?.includes(id))
      expect(intersection?.length).toBe(0)
    })

    it(`should enforce max limit of 100`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'limittestuser',
        password: '123',
      })

      const searchResponse = await apiClient(accessToken).GET(
        '/api/v1/search',
        {
          params: {
            query: {
              q: 'test',
              limit: 200,
            },
          },
        },
      )

      expect(searchResponse.response.status).toBe(200)
      // Should cap at 100 even though we requested 200
      expect(searchResponse.data?.result.length).toBeLessThanOrEqual(100)
    })

    it(`should return accurate totalCount`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'countuser',
        password: '123',
      })

      const { folder } = await createTestFolder({
        testModule,
        accessToken,
        apiClient,
        folderName: 'CountFolder',
        mockFiles: [
          { objectKey: 'test-1.txt', content: 'content' },
          { objectKey: 'test-2.txt', content: 'content' },
          { objectKey: 'test-3.txt', content: 'content' },
        ],
      })

      await reindexTestFolder({ accessToken, folderId: folder.id, apiClient })

      await testModule!.waitForTasks('completed', {
        taskIdentifiers: [CoreTaskName.ReindexFolder],
      })

      const searchResponse = await apiClient(accessToken).GET(
        '/api/v1/search',
        {
          params: {
            query: {
              q: 'test',
              limit: 2,
            },
          },
        },
      )

      expect(searchResponse.response.status).toBe(200)
      expect(searchResponse.data?.result.length).toBe(2)
      expect(searchResponse.data?.meta.totalCount).toBe(3)
    })
  })

  describe('Sorting', () => {
    it(`should sort by name ascending`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'sortuser',
        password: '123',
      })

      const { folder } = await createTestFolder({
        testModule,
        accessToken,
        apiClient,
        folderName: 'SortFolder',
        mockFiles: [
          { objectKey: 'zebra.txt', content: 'content' },
          { objectKey: 'apple.txt', content: 'content' },
          { objectKey: 'banana.txt', content: 'content' },
        ],
      })

      await reindexTestFolder({ accessToken, folderId: folder.id, apiClient })

      await testModule!.waitForTasks('completed', {
        taskIdentifiers: [CoreTaskName.ReindexFolder],
      })

      const searchResponse = await apiClient(accessToken).GET(
        '/api/v1/search',
        {
          params: {
            query: {
              q: 'txt',
              sort: 'name-asc',
            },
          },
        },
      )

      expect(searchResponse.response.status).toBe(200)
      expect(searchResponse.data?.result.length).toBeGreaterThan(0)

      const filenames = searchResponse.data?.result.map(
        (r) => r.folderObject.filename,
      )
      expect(filenames?.[0]).toBe('apple.txt')
      expect(filenames?.[1]).toBe('banana.txt')
      expect(filenames?.[2]).toBe('zebra.txt')
    })

    it(`should sort by name descending`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'sortuser2',
        password: '123',
      })

      const { folder } = await createTestFolder({
        testModule,
        accessToken,
        apiClient,
        folderName: 'SortFolder2',
        mockFiles: [
          { objectKey: 'alpha.txt', content: 'content' },
          { objectKey: 'beta.txt', content: 'content' },
          { objectKey: 'gamma.txt', content: 'content' },
        ],
      })

      await reindexTestFolder({ accessToken, folderId: folder.id, apiClient })

      await testModule!.waitForTasks('completed', {
        taskIdentifiers: [CoreTaskName.ReindexFolder],
      })

      const searchResponse = await apiClient(accessToken).GET(
        '/api/v1/search',
        {
          params: {
            query: {
              q: 'txt',
              sort: 'name-desc',
            },
          },
        },
      )

      expect(searchResponse.response.status).toBe(200)
      const filenames = searchResponse.data?.result.map(
        (r) => r.folderObject.filename,
      )
      expect(filenames?.[0]).toBe('gamma.txt')
      expect(filenames?.[1]).toBe('beta.txt')
      expect(filenames?.[2]).toBe('alpha.txt')
    })
  })

  describe('Media Type Filtering', () => {
    it(`should filter by single media type`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'filteruser',
        password: '123',
      })

      const { folder } = await createTestFolder({
        testModule,
        accessToken,
        apiClient,
        folderName: 'FilterFolder',
        mockFiles: [
          { objectKey: 'photo.jpg', content: 'image' },
          { objectKey: 'video.mp4', content: 'video' },
          { objectKey: 'document.pdf', content: 'doc' },
        ],
      })

      await reindexTestFolder({ accessToken, folderId: folder.id, apiClient })

      await testModule!.waitForTasks('completed', {
        taskIdentifiers: [CoreTaskName.ReindexFolder],
      })

      const searchResponse = await apiClient(accessToken).GET(
        '/api/v1/search',
        {
          params: {
            query: {
              q: 'photo video document',
              mediaType: MediaType.IMAGE,
            },
          },
        },
      )

      expect(searchResponse.response.status).toBe(200)
      expect(searchResponse.data?.result).toBeArray()

      // Should only return images
      searchResponse.data?.result.forEach((result) => {
        expect(result.folderObject.mediaType).toBe(MediaType.IMAGE)
      })
    })
  })

  describe('Permissions', () => {
    it(`should only return results from accessible folders`, async () => {
      const {
        session: { accessToken: userAToken },
      } = await createTestUser(testModule!, {
        username: 'userA',
        password: '123',
      })

      const {
        session: { accessToken: userBToken },
      } = await createTestUser(testModule!, {
        username: 'userB',
        password: '123',
      })

      // User A creates a folder
      const { folder } = await createTestFolder({
        testModule,
        accessToken: userAToken,
        apiClient,
        folderName: 'UserAFolder',
        mockFiles: [{ objectKey: 'secret-file.txt', content: 'secret' }],
      })

      await reindexTestFolder({
        accessToken: userAToken,
        folderId: folder.id,
        apiClient,
      })

      await testModule!.waitForTasks('completed', {
        taskIdentifiers: [CoreTaskName.ReindexFolder],
      })

      // User A can search and find their file
      const userASearchResponse = await apiClient(userAToken).GET(
        '/api/v1/search',
        {
          params: {
            query: {
              q: 'secret',
            },
          },
        },
      )

      expect(userASearchResponse.response.status).toBe(200)
      expect(userASearchResponse.data?.result.length).toBeGreaterThan(0)

      // User B cannot find User A's file
      const userBSearchResponse = await apiClient(userBToken).GET(
        '/api/v1/search',
        {
          params: {
            query: {
              q: 'secret',
            },
          },
        },
      )

      expect(userBSearchResponse.response.status).toBe(200)
      expect(userBSearchResponse.data?.result.length).toBe(0)
    })
  })
})
