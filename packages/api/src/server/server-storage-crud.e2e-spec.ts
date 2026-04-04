import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'srv_stg_crud'

describe('Server Storage Get & Delete', () => {
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

  it('should require authentication for get server storage', async () => {
    const res = await apiClient().GET('/api/v1/server/server-storage')
    expect(res.response.status).toBe(401)
  })

  it('should get server storage location after setting it', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'ssget',
      password: '123',
      admin: true,
    })

    await testModule!.setServerStorageLocation()

    const res = await apiClient(accessToken).GET(
      '/api/v1/server/server-storage',
    )
    expect(res.response.status).toBe(200)
    expect(res.data?.serverStorageLocation).toBeDefined()
  })

  it('should get null server storage when not set', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'ssnull',
      password: '123',
      admin: true,
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/server/server-storage',
    )
    expect(res.response.status).toBe(200)
  })

  it('should delete server storage location', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'ssdelete',
      password: '123',
      admin: true,
    })

    await testModule!.setServerStorageLocation()

    const deleteRes = await apiClient(accessToken).DELETE(
      '/api/v1/server/server-storage',
    )
    expect(deleteRes.response.status).toBe(200)

    // Verify it's gone
    const getRes = await apiClient(accessToken).GET(
      '/api/v1/server/server-storage',
    )
    expect(getRes.response.status).toBe(200)
    expect(getRes.data?.serverStorageLocation).toBeFalsy()
  })

  it('should require admin for delete', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'ssnonadmin',
      password: '123',
    })

    const res = await apiClient(accessToken).DELETE(
      '/api/v1/server/server-storage',
    )
    expect(res.response.status).toBe(401)
  })
})
