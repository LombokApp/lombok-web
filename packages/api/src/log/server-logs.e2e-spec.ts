import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { LogEntryLevel } from '@lombokapp/types'
import { v4 as uuidV4 } from 'uuid'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { logEntriesTable } from './entities/log-entry.entity'

const TEST_MODULE_KEY = 'server_logs'

async function seedLogEntry(
  testModule: TestModule,
  overrides: Partial<typeof logEntriesTable.$inferInsert> = {},
) {
  const id = uuidV4()
  const now = new Date()

  await testModule.services.ormService.db.insert(logEntriesTable).values({
    id,
    message: 'Test log message',
    emitterIdentifier: 'core',
    level: LogEntryLevel.INFO,
    createdAt: now,
    ...overrides,
  })

  return { id }
}

describe('Server Logs', () => {
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

  it('should require authentication', async () => {
    const response = await apiClient().GET('/api/v1/server/logs')
    expect(response.response.status).toEqual(401)
  })

  it('should require admin role', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'regularuser',
      password: '123',
    })

    const response = await apiClient(accessToken).GET('/api/v1/server/logs')
    expect(response.response.status).toEqual(401)
  })

  it('should list logs for admin', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin1',
      password: '123',
      admin: true,
    })

    await seedLogEntry(testModule!, { message: 'Log entry 1' })
    await seedLogEntry(testModule!, { message: 'Log entry 2' })
    await seedLogEntry(testModule!, { message: 'Log entry 3' })

    const response = await apiClient(accessToken).GET('/api/v1/server/logs')
    expect(response.response.status).toEqual(200)
    expect(response.data?.result).toBeArray()
    expect(response.data?.result.length).toEqual(3)
    expect(response.data?.meta.totalCount).toEqual(3)
  })

  it('should get a single log entry by ID', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin2',
      password: '123',
      admin: true,
    })

    const { id: logId } = await seedLogEntry(testModule!, {
      message: 'Specific log entry',
      level: LogEntryLevel.WARN,
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/server/logs/{logId}',
      { params: { path: { logId } } },
    )
    expect(response.response.status).toEqual(200)
    expect(response.data?.log.message).toEqual('Specific log entry')
    expect(response.data?.log.level).toEqual(LogEntryLevel.WARN)
  })

  it('should return 404 for non-existent log entry', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin3',
      password: '123',
      admin: true,
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/server/logs/{logId}',
      { params: { path: { logId: uuidV4() } } },
    )
    expect(response.response.status).toEqual(404)
  })

  it('should support pagination with offset and limit', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin4',
      password: '123',
      admin: true,
    })

    // Seed 5 log entries with sequential timestamps
    for (let i = 0; i < 5; i++) {
      const ts = new Date(Date.now() + i * 1000)
      await seedLogEntry(testModule!, {
        message: `Log ${i}`,
        createdAt: ts,
      })
    }

    const page1 = await apiClient(accessToken).GET('/api/v1/server/logs', {
      params: { query: { limit: 2, offset: 0 } },
    })
    expect(page1.response.status).toEqual(200)
    expect(page1.data?.result.length).toEqual(2)
    expect(page1.data?.meta.totalCount).toEqual(5)

    const page2 = await apiClient(accessToken).GET('/api/v1/server/logs', {
      params: { query: { limit: 2, offset: 2 } },
    })
    expect(page2.response.status).toEqual(200)
    expect(page2.data?.result.length).toEqual(2)

    // Ensure no overlap
    const page1Ids = page1.data?.result.map((l) => l.id) ?? []
    const page2Ids = page2.data?.result.map((l) => l.id) ?? []
    const overlap = page1Ids.filter((id) => page2Ids.includes(id))
    expect(overlap.length).toEqual(0)
  })

  it('should filter logs by search term', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'admin5',
      password: '123',
      admin: true,
    })

    await seedLogEntry(testModule!, { message: 'User login successful' })
    await seedLogEntry(testModule!, { message: 'File upload completed' })
    await seedLogEntry(testModule!, { message: 'User logout' })

    const response = await apiClient(accessToken).GET('/api/v1/server/logs', {
      params: { query: { search: 'User' } },
    })
    expect(response.response.status).toEqual(200)
    expect(response.data?.result.length).toEqual(2)
    expect(response.data?.meta.totalCount).toEqual(2)
  })
})
