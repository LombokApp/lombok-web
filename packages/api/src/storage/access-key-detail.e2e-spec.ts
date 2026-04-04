import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'

import { buildAccessKeyHashId } from './access-key.utils'

const TEST_MODULE_KEY = 'ak_detail'

describe('Access Key Detail, Rotate & Buckets', () => {
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

  it('should require authentication for get access key', async () => {
    const res = await apiClient().GET(
      '/api/v1/access-keys/{accessKeyHashId}',
      { params: { path: { accessKeyHashId: 'fake' } } },
    )
    expect(res.response.status).toBe(401)
  })

  it('should get an access key by hash id', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'akdetail',
      password: '123',
    })

    await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'AKFolder',
      mockFiles: [],
    })

    const s3Config = testModule!.testS3ClientConfig()
    const hashId = buildAccessKeyHashId({
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      region: s3Config.region,
      endpoint: s3Config.endpoint,
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/access-keys/{accessKeyHashId}',
      { params: { path: { accessKeyHashId: hashId } } },
    )
    expect(res.response.status).toBe(200)
    expect(res.data?.accessKey).toBeDefined()
    expect(res.data!.accessKey.accessKeyHashId).toBe(hashId)
  })

  it('should list buckets for an access key', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'akbuckets',
      password: '123',
    })

    await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'BucketFolder',
      mockFiles: [],
    })

    const s3Config = testModule!.testS3ClientConfig()
    const hashId = buildAccessKeyHashId({
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      region: s3Config.region,
      endpoint: s3Config.endpoint,
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/access-keys/{accessKeyHashId}/buckets',
      { params: { path: { accessKeyHashId: hashId } } },
    )
    expect(res.response.status).toBe(200)
    expect(res.data?.result).toBeArray()
    expect(res.data!.result.length).toBeGreaterThanOrEqual(1)
  })

  it('should rotate an access key', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'akrotate',
      password: '123',
    })

    await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'RotateFolder',
      mockFiles: [],
    })

    const s3Config = testModule!.testS3ClientConfig()
    const hashId = buildAccessKeyHashId({
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      region: s3Config.region,
      endpoint: s3Config.endpoint,
    })

    // Rotate to same credentials (since we only have one MinIO key)
    const res = await apiClient(accessToken).POST(
      '/api/v1/access-keys/{accessKeyHashId}/rotate',
      {
        params: { path: { accessKeyHashId: hashId } },
        body: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
        },
      },
    )
    expect([200, 201]).toContain(res.response.status)
    expect(res.data?.accessKeyHashId).toBeTruthy()
  })

  it('should return error for non-existent access key', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'akmissing',
      password: '123',
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/access-keys/{accessKeyHashId}',
      { params: { path: { accessKeyHashId: 'nonexistenthashid' } } },
    )
    expect([400, 404]).toContain(res.response.status)
  })
})
