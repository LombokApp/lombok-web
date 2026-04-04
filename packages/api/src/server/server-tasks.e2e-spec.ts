import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { v4 as uuidV4 } from 'uuid'

const TEST_MODULE_KEY = 'server_tasks'

describe('Server Tasks', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  it('should require authentication for server tasks list', async () => {
    const response = await apiClient().GET('/api/v1/server/tasks')
    expect(response.response.status).toEqual(401)
  })

  it('should require admin role for server tasks list', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'nonadmin',
      password: '123',
    })

    const response = await apiClient(accessToken).GET('/api/v1/server/tasks')
    expect(response.response.status).toEqual(401)
  })

  it('should list tasks for admin', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'taskadmin',
      password: '123',
      admin: true,
    })

    const response = await apiClient(accessToken).GET('/api/v1/server/tasks')
    expect(response.response.status).toEqual(200)
    expect(response.data?.result).toBeArray()
    expect(response.data?.meta).toBeDefined()
  })

  it('should return empty list when no tasks exist', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'taskadmin2',
      password: '123',
      admin: true,
    })

    const response = await apiClient(accessToken).GET('/api/v1/server/tasks')
    expect(response.response.status).toEqual(200)
    expect(response.data?.meta.totalCount).toEqual(0)
  })

  it('should return 404 for non-existent task', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'taskadmin3',
      password: '123',
      admin: true,
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/server/tasks/{taskId}',
      { params: { path: { taskId: uuidV4() } } },
    )
    expect(response.response.status).toEqual(404)
  })
})
