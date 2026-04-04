import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'srv_stg_creat'

describe('Server Storage Create (POST)', () => {
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

  it('should require authentication', async () => {
    const res = await apiClient().POST('/api/v1/server/server-storage', {
      body: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
        endpoint: 'http://localhost:9000',
        bucket: 'test',
        region: 'us-east-1',
        prefix: null,
      },
    })
    expect(res.response.status).toBe(401)
  })

  it('should require admin', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'stgnonadm',
      password: '123',
    })

    const res = await apiClient(accessToken).POST(
      '/api/v1/server/server-storage',
      {
        body: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
          endpoint: 'http://localhost:9000',
          bucket: 'test',
          region: 'us-east-1',
          prefix: null,
        },
      },
    )
    expect(res.response.status).toBe(401)
  })

  it('should create server storage location as admin', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'stgadmin',
      password: '123',
      admin: true,
    })

    const s3Config = testModule!.testS3ClientConfig()
    const bucketName = await testModule!.initMinioTestBucket()

    const res = await apiClient(accessToken).POST(
      '/api/v1/server/server-storage',
      {
        body: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
          endpoint: s3Config.endpoint,
          bucket: bucketName,
          region: s3Config.region,
          prefix: null,
        },
      },
    )
    expect([200, 201]).toContain(res.response.status)
    expect(res.data?.serverStorageLocation).toBeDefined()
  })

  it('should persist the created storage location', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'stgpersist',
      password: '123',
      admin: true,
    })

    const s3Config = testModule!.testS3ClientConfig()
    const bucketName = await testModule!.initMinioTestBucket()

    await apiClient(accessToken).POST('/api/v1/server/server-storage', {
      body: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
        endpoint: s3Config.endpoint,
        bucket: bucketName,
        region: s3Config.region,
        prefix: null,
      },
    })

    const getRes = await apiClient(accessToken).GET(
      '/api/v1/server/server-storage',
    )
    expect(getRes.response.status).toBe(200)
    expect(getRes.data?.serverStorageLocation).toBeDefined()
  })

  it('should reject invalid endpoint URL', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'stgbadurl',
      password: '123',
      admin: true,
    })

    const res = await apiClient(accessToken).POST(
      '/api/v1/server/server-storage',
      {
        body: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
          endpoint: 'not-a-url',
          bucket: 'test',
          region: 'us-east-1',
          prefix: null,
        },
      },
    )
    expect([400, 422]).toContain(res.response.status)
  })
})
