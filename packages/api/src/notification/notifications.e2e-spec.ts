import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { v4 as uuidV4 } from 'uuid'

import { notificationsTable } from './entities/notification.entity'
import { notificationDeliveriesTable } from './entities/notification-delivery.entity'

const TEST_MODULE_KEY = 'notifications'

async function getUserId(apiClient: TestApiClient, accessToken: string) {
  const viewer = await apiClient(accessToken).GET('/api/v1/viewer')
  if (!viewer.data) {
    throw new Error('Failed to get viewer')
  }
  return viewer.data.user.id
}

async function seedNotification(
  testModule: TestModule,
  userId: string,
  overrides: Partial<typeof notificationsTable.$inferInsert> = {},
) {
  const notificationId = uuidV4()
  const eventId = uuidV4()
  const now = new Date()

  await testModule.services.ormService.db.insert(notificationsTable).values({
    id: notificationId,
    eventIdentifier: 'object_added',
    emitterIdentifier: 'core',
    aggregationKey: `test:${notificationId}`,
    targetUserId: userId,
    eventIds: [eventId],
    title: 'Test notification',
    body: 'Something happened',
    createdAt: now,
    ...overrides,
  })

  await testModule.services.ormService.db
    .insert(notificationDeliveriesTable)
    .values({
      notificationId,
      userId,
      createdAt: now,
    })

  return { notificationId, eventId }
}

describe('Notifications', () => {
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

  it('should require authentication for listing notifications', async () => {
    const response = await apiClient().GET('/api/v1/notifications')
    expect(response.response.status).toEqual(401)
  })

  it('should list notifications for authenticated user', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'notifuser',
      password: '123',
    })
    const userId = await getUserId(apiClient, accessToken)

    await seedNotification(testModule!, userId, { title: 'Notif 1' })
    await seedNotification(testModule!, userId, { title: 'Notif 2' })

    const response = await apiClient(accessToken).GET('/api/v1/notifications')
    expect(response.response.status).toEqual(200)
    expect(response.data?.notifications).toBeArray()
    expect(response.data?.notifications.length).toEqual(2)
  })

  it('should not list other users notifications', async () => {
    const {
      session: { accessToken: token1 },
    } = await createTestUser(testModule!, {
      username: 'user1',
      password: '123',
    })
    const userId1 = await getUserId(apiClient, token1)

    const {
      session: { accessToken: token2 },
    } = await createTestUser(testModule!, {
      username: 'user2',
      password: '123',
    })
    const userId2 = await getUserId(apiClient, token2)

    await seedNotification(testModule!, userId1, { title: 'User1 only' })
    await seedNotification(testModule!, userId2, { title: 'User2 only' })

    const response1 = await apiClient(token1).GET('/api/v1/notifications')
    expect(response1.data?.notifications.length).toEqual(1)
    expect(response1.data?.notifications[0]?.title).toEqual('User1 only')

    const response2 = await apiClient(token2).GET('/api/v1/notifications')
    expect(response2.data?.notifications.length).toEqual(1)
    expect(response2.data?.notifications[0]?.title).toEqual('User2 only')
  })

  it('should get unread count', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'countuser',
      password: '123',
    })
    const userId = await getUserId(apiClient, accessToken)

    await seedNotification(testModule!, userId)
    await seedNotification(testModule!, userId)
    await seedNotification(testModule!, userId)

    const response = await apiClient(accessToken).GET(
      '/api/v1/notifications/unread-count',
    )
    expect(response.response.status).toEqual(200)
    expect(response.data?.count).toEqual(3)
  })

  it('should get a single notification by ID', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'getuser',
      password: '123',
    })
    const userId = await getUserId(apiClient, accessToken)

    const { notificationId } = await seedNotification(testModule!, userId, {
      title: 'Specific notification',
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/notifications/{notificationId}',
      { params: { path: { notificationId } } },
    )
    expect(response.response.status).toEqual(200)
    expect(response.data?.title).toEqual('Specific notification')
    expect(response.data?.id).toEqual(notificationId)
  })

  it('should return 404 for non-existent notification', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'missing',
      password: '123',
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/notifications/{notificationId}',
      { params: { path: { notificationId: uuidV4() } } },
    )
    expect(response.response.status).toEqual(404)
  })

  it('should mark notification as read and update unread count', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'readuser',
      password: '123',
    })
    const userId = await getUserId(apiClient, accessToken)

    const { notificationId } = await seedNotification(testModule!, userId)
    await seedNotification(testModule!, userId)

    // Verify 2 unread
    const countBefore = await apiClient(accessToken).GET(
      '/api/v1/notifications/unread-count',
    )
    expect(countBefore.data?.count).toEqual(2)

    // Mark one as read
    const markResponse = await apiClient(accessToken).PATCH(
      '/api/v1/notifications/{id}/read',
      { params: { path: { id: notificationId } } },
    )
    expect(markResponse.response.status).toEqual(200)

    // Verify 1 unread
    const countAfter = await apiClient(accessToken).GET(
      '/api/v1/notifications/unread-count',
    )
    expect(countAfter.data?.count).toEqual(1)
  })

  it('should return 404 when marking non-existent notification as read', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'readmissing',
      password: '123',
    })

    const response = await apiClient(accessToken).PATCH(
      '/api/v1/notifications/{id}/read',
      { params: { path: { id: uuidV4() } } },
    )
    expect(response.response.status).toEqual(404)
  })
})
