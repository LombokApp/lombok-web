import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { v4 as uuidV4 } from 'uuid'

import { eventsTable } from './entities/event.entity'

const TEST_MODULE_KEY = 'server_events'

async function seedEvent(
  testModule: TestModule,
  overrides: Partial<typeof eventsTable.$inferInsert> = {},
) {
  const id = uuidV4()
  await testModule.services.ormService.db.insert(eventsTable).values({
    id,
    eventIdentifier: 'object_added',
    emitterIdentifier: 'core',
    createdAt: new Date(),
    ...overrides,
  })
  return { id }
}

describe('Server Events', () => {
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
    const response = await apiClient().GET('/api/v1/server/events')
    expect(response.response.status).toEqual(401)
  })

  it('should require admin role', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'nonadmin',
      password: '123',
    })

    const response = await apiClient(accessToken).GET('/api/v1/server/events')
    expect(response.response.status).toEqual(401)
  })

  it('should list events for admin', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'evtadmin',
      password: '123',
      admin: true,
    })

    await seedEvent(testModule!, { eventIdentifier: 'event_a' })
    await seedEvent(testModule!, { eventIdentifier: 'event_b' })
    await seedEvent(testModule!, { eventIdentifier: 'event_c' })

    const response = await apiClient(accessToken).GET('/api/v1/server/events')
    expect(response.response.status).toEqual(200)
    expect(response.data?.result).toBeArray()
    // System events from user creation may also appear
    expect(response.data!.result.length).toBeGreaterThanOrEqual(3)
    expect(response.data!.meta.totalCount).toBeGreaterThanOrEqual(3)
  })

  it('should get a single event by ID', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'evtgetadmin',
      password: '123',
      admin: true,
    })

    const { id: eventId } = await seedEvent(testModule!, {
      eventIdentifier: 'specific_event',
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/server/events/{eventId}',
      { params: { path: { eventId } } },
    )
    expect(response.response.status).toEqual(200)
    expect(response.data?.event.eventIdentifier).toEqual('specific_event')
  })

  it('should return 404 for non-existent event', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'evtmissadmin',
      password: '123',
      admin: true,
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/server/events/{eventId}',
      { params: { path: { eventId: uuidV4() } } },
    )
    expect(response.response.status).toEqual(404)
  })

  it('should support pagination', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'evtpageadmin',
      password: '123',
      admin: true,
    })

    for (let i = 0; i < 5; i++) {
      await seedEvent(testModule!, {
        createdAt: new Date(Date.now() + i * 1000),
      })
    }

    const page1 = await apiClient(accessToken).GET('/api/v1/server/events', {
      params: { query: { limit: 2, offset: 0 } },
    })
    expect(page1.data?.result.length).toEqual(2)
    // Total may include system events from user creation
    expect(page1.data!.meta.totalCount).toBeGreaterThanOrEqual(5)

    const page2 = await apiClient(accessToken).GET('/api/v1/server/events', {
      params: { query: { limit: 2, offset: 2 } },
    })
    expect(page2.data?.result.length).toEqual(2)

    const ids1 = page1.data?.result.map((e) => e.id) ?? []
    const ids2 = page2.data?.result.map((e) => e.id) ?? []
    expect(ids1.filter((id) => ids2.includes(id)).length).toEqual(0)
  })
})
