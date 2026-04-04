import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
  reindexTestFolder,
} from 'src/test/test.util'
import { CoreTaskName } from 'src/task/task.constants'

const TEST_MODULE_KEY = 'srv_tasks'

describe('Server Tasks List & Get', () => {
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

  it('should require authentication for list tasks', async () => {
    const res = await apiClient().GET('/api/v1/server/tasks')
    expect(res.response.status).toBe(401)
  })

  it('should require admin for list tasks', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'tasknonadm',
      password: '123',
    })

    const res = await apiClient(accessToken).GET('/api/v1/server/tasks')
    expect(res.response.status).toBe(401)
  })

  it('should list tasks as admin', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'taskadmin',
      password: '123',
      admin: true,
    })

    const res = await apiClient(accessToken).GET('/api/v1/server/tasks')
    expect(res.response.status).toBe(200)
    expect(res.data?.result).toBeArray()
    expect(res.data?.meta).toBeDefined()
  })

  it('should get a task by id after reindex creates one', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'taskgetadm',
      password: '123',
      admin: true,
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'TaskTestFolder',
      mockFiles: [{ objectKey: 'task-test.txt', content: 'data' }],
    })

    await reindexTestFolder({ accessToken, apiClient, folderId: folder.id })
    await testModule!.waitForTasks('completed', {
      taskIdentifiers: [CoreTaskName.ReindexFolder],
    })

    // List tasks to find a task id
    const listRes = await apiClient(accessToken).GET('/api/v1/server/tasks')
    expect(listRes.response.status).toBe(200)
    expect(listRes.data!.result.length).toBeGreaterThanOrEqual(1)

    const taskId = listRes.data!.result[0]!.id

    const getRes = await apiClient(accessToken).GET(
      '/api/v1/server/tasks/{taskId}',
      { params: { path: { taskId } } },
    )
    expect(getRes.response.status).toBe(200)
    expect(getRes.data?.task).toBeDefined()
    expect(getRes.data!.task.id).toBe(taskId)
  })

  it('should require admin for get task', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'taskgetna',
      password: '123',
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/server/tasks/{taskId}',
      { params: { path: { taskId: 'fake-task-id' } } },
    )
    expect(res.response.status).toBe(401)
  })
})
