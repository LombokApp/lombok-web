import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { v4 as uuidV4 } from 'uuid'

const TEST_MODULE_KEY = 'sp_detail'

describe('Storage Provisions List & Detail', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
    testModule?.cleanupMinioTestBuckets()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  it('should require authentication for list', async () => {
    const res = await apiClient().GET('/api/v1/server/storage-provisions')
    expect(res.response.status).toBe(401)
  })

  it('should list storage provisions as admin', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'spadmin',
      password: '123',
      admin: true,
    })

    const s3Config = testModule!.testS3ClientConfig()
    const bucketName = await testModule!.initMinioTestBucket()

    // Create a provision first
    await apiClient(accessToken).POST('/api/v1/server/storage-provisions', {
      body: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
        endpoint: s3Config.endpoint,
        bucket: bucketName,
        region: s3Config.region,
        prefix: null,
        label: 'test-provision',
        description: 'Test',
        provisionTypes: ['CONTENT'],
      },
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/server/storage-provisions',
    )
    expect(res.response.status).toBe(200)
    expect(res.data?.result).toBeArray()
    expect(res.data!.result.length).toBeGreaterThanOrEqual(1)
  })

  it('should get a storage provision by id', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'spgetadmin',
      password: '123',
      admin: true,
    })

    const s3Config = testModule!.testS3ClientConfig()
    const bucketName = await testModule!.initMinioTestBucket()

    const createRes = await apiClient(accessToken).POST(
      '/api/v1/server/storage-provisions',
      {
        body: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
          endpoint: s3Config.endpoint,
          bucket: bucketName,
          region: s3Config.region,
          prefix: null,
          label: 'get-provision',
          description: 'Test',
          provisionTypes: ['CONTENT'],
        },
      },
    )
    const provisionId = createRes.data!.result[0]!.id

    const res = await apiClient(accessToken).GET(
      '/api/v1/server/storage-provisions/{storageProvisionId}',
      { params: { path: { storageProvisionId: provisionId } } },
    )
    expect(res.response.status).toBe(200)
    expect(res.data?.storageProvision).toBeDefined()
    expect(res.data!.storageProvision.id).toBe(provisionId)
  })

  it('should return 404 for non-existent provision', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'sp404admin',
      password: '123',
      admin: true,
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/server/storage-provisions/{storageProvisionId}',
      { params: { path: { storageProvisionId: uuidV4() } } },
    )
    expect(res.response.status).toBe(404)
  })
})
